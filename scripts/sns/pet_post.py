# まめすけアナの日常（オーナーの犬の動画）を Instagram リールと YouTube ショートに投稿する。
#   python scripts/sns/pet_post.py <id>   例: mame-01
#   動画は public/sns/<id>.mp4・<id>.jpg（サイトに公開済み）、文は content/pet/<id>.json
import json, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from video_post import SITE  # noqa: E402
import reels  # noqa: E402


def delete(ig, yt):
    from video_post import clean, http
    if ig:
        tok = clean(os.environ.get("IG_TOKEN"))
        try:
            print("instagram delete", http("DELETE", f"https://graph.facebook.com/v21.0/{ig}?access_token={tok}"))
            print(f"::notice::instagram deleted {ig}")
        except Exception as e:
            print(f"::error::instagram delete: {e}")
    if yt:
        cid, csec, rtok = (clean(os.environ.get(k)) for k in ("YT_CLIENT_ID", "YT_CLIENT_SECRET", "YT_REFRESH_TOKEN"))
        try:
            t = http("POST", "https://oauth2.googleapis.com/token", {"client_id": cid, "client_secret": csec, "refresh_token": rtok, "grant_type": "refresh_token"})["access_token"]
            http("DELETE", f"https://www.googleapis.com/youtube/v3/videos?id={yt}", headers={"Authorization": f"Bearer {t}"}, raw=True)
            print(f"::notice::youtube deleted {yt}")
        except Exception as e:
            print(f"::error::youtube delete: {e}")


def main():
    if sys.argv[1] == "delete":  # 2026-11-14 まめすけはツレドキでは出さない（オーナー）。間違えて出した分を消す
        return delete(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "")
    vid = sys.argv[1]
    src = json.load(open(f"content/pet/{vid}.json", encoding="utf-8"))
    cap = "\n".join([src["caption"], "", src.get("ask", ""), "", src["tags"]]).replace("\n\n\n", "\n\n")
    print(cap)
    url = f"{SITE}/sns/{vid}.mp4"
    if not reels.wait_url(url):
        raise SystemExit(f"動画がサイトに公開されていません: {url}")
    log = reels.load_log()
    rec = {"slot": "pet", "key": vid, "id": vid, "at": reels.now().isoformat(timespec="minutes")}
    failed = False
    try:
        ig = reels.ig_reel(url, f"{SITE}/sns/{vid}.jpg", cap)
        if ig:
            rec["instagram"] = ig
            print(f"::notice::instagram ok {ig}")
    except Exception as e:
        print(f"::error::instagram: {e}")
        failed = True
    try:
        yt = reels.yt_short(f"public/sns/{vid}.mp4", src["title"], cap)
        if yt:
            rec["youtube"] = yt
            print(f"::notice::youtube ok {yt}")
    except Exception as e:
        print(f"::error::youtube: {e}")
        failed = True
    log["posts"].append(rec)
    reels.save_log(log)
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
