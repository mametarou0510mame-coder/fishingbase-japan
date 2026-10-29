# YouTube に長尺動画を投稿する（説明欄に章の目次を入れる）。
#   python scripts/sns/yt_long.py <slug> <mp4> <thumb.jpg> <chapters.txt> [--publish]
import json, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from video_post import SITE, clean, http  # noqa: E402
import discuss  # noqa: E402
import affiliate  # noqa: E402
from affiliate import tackle_lines  # noqa: E402

CREDIT = "音声合成：VOICEVOX:ずんだもん"


ORDER = ["long-shore-jigging", "long-sawara", "long-tachiuo", "long-sabiki", "long-light-game", "long-ika-tako", "long-chinu", "long-big-game", "long-gomoku", "long-basics",
         # 第2弾（釣り場・データ・安全・図鑑）
         # （エリア別の釣り場ガイド4本・海上釣り堀ガイドはオーナー判断で投稿しない）
         "long-weather", "long-calendar", "long-zukan", "long-jiai", "long-family",  # 海上釣り堀ガイドも投稿しない
         # 第3弾（2026-10-26。冬の夜釣りは11〜12月の事故シーズン前に出す）
         "long-month-11",
         # 3DCG（2026-10-28 オーナー Go）
         "cg-teibou-3d", "cg-shokumotsu", "cg-nagare", "cg-kiken", "cg-lure",
         "long-asaichi", "long-ng10", "long-winter-night", "long-keep-rules", "long-quiz30", "long-weekday"]
REC = "data/sns/long-posts.json"
PER_DAY = 2  # 1日に出す長尺の本数（07:17 と 18:17。出せなかった分は 21:17）


def posted():
    try:
        return json.load(open(REC, encoding="utf-8"))
    except FileNotFoundError:
        return {}


def main():
    if sys.argv[1] == "next":  # まだ投稿していない次の動画の slug を出す（1日 PER_DAY 本まで。超えていれば空）
        from datetime import datetime, timedelta, timezone
        done = posted()
        today = datetime.now(timezone(timedelta(hours=9))).strftime("%Y-%m-%d")
        if sum(v.get("at", "").startswith(today) for v in done.values()) >= PER_DAY and "--force" not in sys.argv:
            print("")
            return
        print(next((s for s in ORDER if s not in done), ""))
        return
    slug, mp4, thumb, chap = sys.argv[1:5]
    publish = "--publish" in sys.argv
    path = f"content/long/{slug}.json"
    if not os.path.exists(path):
        path = f"content/cg/{slug}.json"  # 3DCG 動画
    src = json.load(open(path, encoding="utf-8"))
    gs = [json.load(open(f"content/guides/{g}.json", encoding="utf-8")) for g in src.get("guides", [])]
    chapters = open(chap, encoding="utf-8").read().strip()
    desc = [" ".join(src["video"]["scenes"][0]["lines"]), "", "▼目次", chapters, ""]
    gear = tackle_lines(gs)
    if gear:
        shops = "楽天市場・Amazon" if affiliate.AMAZON_TAG else "楽天市場"
        note = "※楽天アフィリエイト・Amazonアソシエイトのリンクです。" if affiliate.AMAZON_TAG else "※楽天アフィリエイトのリンクです。"
        desc += [f"▼この動画で紹介した道具（{shops}で探す）【PR】"] + gear + [note + "価格・在庫はリンク先でご確認ください。", ""]
    if gs:
        desc += ["▼くわしい解説・道具リスト（初級・中級・上級）"]
        desc += [f"・{g['title']}：{SITE}/guide/{g['slug']}/" for g in gs]
    if src.get("links"):
        desc += ["▼この動画のくわしい情報（ツレドキ関西）"] + [f"{SITE}{u}" for u in src["links"]]
    desc += ["", "▼関西の釣果・潮・今日の釣れる時間（ねらい目）", f"{SITE}/"]
    if slug in discuss.LONG:
        desc += discuss.caption(discuss.LONG[slug])
    desc += ["", CREDIT, "", "#釣り #釣り初心者 #関西釣り #堤防釣り #ツレドキ関西"]
    tags = ["釣り", "釣り初心者", "関西 釣り", "堤防釣り", "釣り方", "ツレドキ関西"] + [t for g in gs for t in g["targets"][:2]] + src.get("tags", [])
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
    try:
        r = http("POST", "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", json.dumps(meta).encode(),
                 {"Authorization": f"Bearer {tok}", "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": "video/mp4", "X-Upload-Content-Length": str(size)}, raw=True)
        f = open(mp4, "rb")
        vid = http("PUT", r.headers["Location"], f.read(), {"Authorization": f"Bearer {tok}", "Content-Type": "video/mp4"})["id"]
    except RuntimeError as e:
        if "uploadLimitExceeded" in str(e):
            print("::warning::YouTube の1日の投稿上限に達したため、次の回に投稿します")
            return
        raise
    print(f"::notice::youtube ok {vid}")
    try:  # サムネイルは電話番号の確認が済んだチャンネルだけ設定できる
        with open(thumb, "rb") as f:
            http("POST", f"https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId={vid}", f.read(), {"Authorization": f"Bearer {tok}", "Content-Type": "image/jpeg"})
        print("::notice::thumbnail ok")
    except Exception as e:
        print(f"::warning::サムネイルを設定できませんでした（電話番号の確認が必要な場合があります）: {e}")
    rec = posted()
    from datetime import datetime, timedelta, timezone
    rec[slug] = {"youtube": vid, "at": datetime.now(timezone(timedelta(hours=9))).isoformat(timespec="minutes")}
    os.makedirs(os.path.dirname(REC), exist_ok=True)
    json.dump(rec, open(REC, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
