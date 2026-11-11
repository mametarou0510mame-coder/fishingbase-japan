# 投稿済み動画の概要欄に、もしもの Amazon リンクが入っているか数える（読むだけ。何も変更しない）
import os, re, sys

sys.path.insert(0, os.path.dirname(__file__))
from video_post import clean, http  # noqa: E402

tok = http("POST", "https://oauth2.googleapis.com/token", {k: clean(os.environ[v]) for k, v in (("client_id", "YT_CLIENT_ID"), ("client_secret", "YT_CLIENT_SECRET"), ("refresh_token", "YT_REFRESH_TOKEN"))} | {"grant_type": "refresh_token"})["access_token"]
H = {"Authorization": f"Bearer {tok}"}
get = lambda u: http("GET", u, None, H)
up = get("https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true")["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]
ids, page = [], ""
while True:
    r = get(f"https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId={up}{page}")
    ids += [i["contentDetails"]["videoId"] for i in r.get("items", [])]
    if not r.get("nextPageToken"):
        break
    page = f"&pageToken={r['nextPageToken']}"
mo = tag = 0
for k in range(0, len(ids), 50):
    for v in get(f"https://www.googleapis.com/youtube/v3/videos?part=snippet&id={','.join(ids[k:k+50])}").get("items", []):
        d = v["snippet"].get("description", "")
        n, t = len(re.findall(r"af\.moshimo\.com", d)), len(re.findall(r"amazon\.co\.jp/[^\s]*tag=", d))
        mo += bool(n); tag += bool(t)
        if n or t:
            print(f"::notice::{v['id']} もしも{n}本 tag付き{t}本 {v['snippet']['title'][:36]}")
print(f"::notice::動画 {len(ids)} 本中、概要欄にもしものAmazonリンクあり {mo} 本、アソシエイト直接あり {tag} 本")
