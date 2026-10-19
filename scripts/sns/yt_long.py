# YouTube に長尺動画を投稿する（説明欄に章の目次を入れる）。
#   python scripts/sns/yt_long.py <slug> <mp4> <thumb.jpg> <chapters.txt> [--publish]
import json, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from video_post import SITE, clean, http  # noqa: E402

CREDIT = "音声合成：VOICEVOX:ずんだもん"


def main():
    slug, mp4, thumb, chap = sys.argv[1:5]
    publish = "--publish" in sys.argv
    src = json.load(open(f"content/long/{slug}.json", encoding="utf-8"))
    gs = [json.load(open(f"content/guides/{g}.json", encoding="utf-8")) for g in src["guides"]]
    chapters = open(chap, encoding="utf-8").read().strip()
    desc = [src["video"]["scenes"][0]["lines"][0], "", "▼目次", chapters, "", "▼くわしい解説・道具リスト（初級・中級・上級）"]
    desc += [f"・{g['title']}：{SITE}/guide/{g['slug']}/" for g in gs]
    desc += ["", "▼関西の釣果・潮・今日の釣れる時間（ねらい目）", f"{SITE}/", "", CREDIT, "", "#釣り #釣り初心者 #関西釣り #堤防釣り #ツレドキ関西"]
    tags = ["釣り", "釣り初心者", "関西 釣り", "堤防釣り", "釣り方", "ツレドキ関西"] + [t for g in gs for t in g["targets"][:2]]
    meta = {
        "snippet": {"title": src["title"][:100], "description": "\n".join(desc)[:4900], "tags": tags[:25], "categoryId": "26", "defaultLanguage": "ja", "defaultAudioLanguage": "ja"},
        "status": {"privacyStatus": "public", "selfDeclaredMadeForKids": False},
    }
    print(meta["snippet"]["title"])
    print(meta["snippet"]["description"])
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8").write(f"## {meta['snippet']['title']}\n```\n{meta['snippet']['description']}\n```\n")
    if not publish:
        return
    cid, csec, rtok = (clean(os.environ.get(k)) for k in ("YT_CLIENT_ID", "YT_CLIENT_SECRET", "YT_REFRESH_TOKEN"))
    tok = http("POST", "https://oauth2.googleapis.com/token", {"client_id": cid, "client_secret": csec, "refresh_token": rtok, "grant_type": "refresh_token"})["access_token"]
    size = os.path.getsize(mp4)
    r = http("POST", "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", json.dumps(meta).encode(),
             {"Authorization": f"Bearer {tok}", "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": "video/mp4", "X-Upload-Content-Length": str(size)}, raw=True)
    with open(mp4, "rb") as f:
        vid = http("PUT", r.headers["Location"], f.read(), {"Authorization": f"Bearer {tok}", "Content-Type": "video/mp4"})["id"]
    print(f"::notice::youtube ok {vid}")
    try:  # サムネイルは電話番号の確認が済んだチャンネルだけ設定できる
        with open(thumb, "rb") as f:
            http("POST", f"https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId={vid}", f.read(), {"Authorization": f"Bearer {tok}", "Content-Type": "image/jpeg"})
        print("::notice::thumbnail ok")
    except Exception as e:
        print(f"::warning::サムネイルを設定できませんでした（電話番号の確認が必要な場合があります）: {e}")
    rec_path = "data/sns/long-posts.json"
    try:
        rec = json.load(open(rec_path, encoding="utf-8"))
    except FileNotFoundError:
        rec = {}
    rec[slug] = {"youtube": vid}
    json.dump(rec, open(rec_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
