# YouTube チャンネルの全動画の再生数などを集めて data/sns/yt-stats.json に保存する（分析用）
# 取れれば YouTube Analytics（視聴維持・流入元・インプレッションのクリック率）も取る（権限がなければ飛ばす）
import json, os, re, sys
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(__file__))
from video_post import clean, http  # noqa: E402

tok = http("POST", "https://oauth2.googleapis.com/token", {k: clean(os.environ[v]) for k, v in (("client_id", "YT_CLIENT_ID"), ("client_secret", "YT_CLIENT_SECRET"), ("refresh_token", "YT_REFRESH_TOKEN"))} | {"grant_type": "refresh_token"})
H = {"Authorization": f"Bearer {tok['access_token']}"}
print(f"::notice::scope={tok.get('scope')}")
def get(url):
    try:
        return http("GET", url, None, H)
    except Exception as e:
        print(f"::warning::{url.split('?')[0]}: {str(e)[:300]}")
        return None


ch = get("https://www.googleapis.com/youtube/v3/channels?part=contentDetails,statistics,snippet&mine=true")["items"][0]
up = ch["contentDetails"]["relatedPlaylists"]["uploads"]
ids, tok_p = [], ""
while True:
    r = get(f"https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId={up}" + (f"&pageToken={tok_p}" if tok_p else ""))
    ids += [i["contentDetails"]["videoId"] for i in r.get("items", [])]
    tok_p = r.get("nextPageToken")
    if not tok_p:
        break
vids = []
for i in range(0, len(ids), 50):
    r = get(f"https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id={','.join(ids[i:i + 50])}")
    for v in r.get("items", []):
        m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", v["contentDetails"]["duration"])
        sec = int(m[1] or 0) * 3600 + int(m[2] or 0) * 60 + int(m[3] or 0)
        st = v["statistics"]
        vids.append({"id": v["id"], "title": v["snippet"]["title"], "at": v["snippet"]["publishedAt"], "sec": sec,
                     "views": int(st.get("viewCount", 0)), "likes": int(st.get("likeCount", 0)), "comments": int(st.get("commentCount", 0))})
out = {"date": date.today().isoformat(), "channel": {"subs": ch["statistics"].get("subscriberCount"), "views": ch["statistics"].get("viewCount"), "videos": ch["statistics"].get("videoCount")}, "videos": vids}
# YouTube Analytics（権限があれば）
A = "https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE"
d0, d1 = (date.today() - timedelta(days=28)).isoformat(), date.today().isoformat()
for name, q in {
    "by_video": f"&startDate={d0}&endDate={d1}&metrics=views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained&dimensions=video&sort=-views&maxResults=200",
    "traffic": f"&startDate={d0}&endDate={d1}&metrics=views&dimensions=insightTrafficSourceType&sort=-views",
    "creator_type": f"&startDate={d0}&endDate={d1}&metrics=views,averageViewDuration&dimensions=creatorContentType",
    "daily": f"&startDate={d0}&endDate={d1}&metrics=views,subscribersGained&dimensions=day",
}.items():
    r = get(A + q)
    if r:
        out[name] = {"cols": [c["name"] for c in r.get("columnHeaders", [])], "rows": r.get("rows", [])}
os.makedirs("data/sns", exist_ok=True)
json.dump(out, open("data/sns/yt-stats.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"::notice::videos={len(vids)} analytics={[k for k in ('by_video', 'traffic', 'creator_type', 'daily') if k in out]}")
