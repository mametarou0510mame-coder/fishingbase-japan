# 3DCG 動画のショート版（縦）を Instagram リールと YouTube ショートに投稿する。
#   python scripts/sns/cg_short.py id <short-slug>          … 投稿ID（cg-<slug>-<日付>）を出す
#   python scripts/sns/cg_short.py publish <short-slug> <id> … 投稿する（動画は public/sns/<id>.mp4 としてサイトに公開済みであること）
import json, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from video_post import SITE  # noqa: E402
import reels  # noqa: E402


def caption(src):
    full = json.load(open("data/sns/long-posts.json", encoding="utf-8")).get(src["full"], {}).get("youtube")
    cap = [src["caption"], ""]
    if full:
        cap += ["▶ フル版はYouTubeで公開中", f"https://youtu.be/{full}", ""]
    else:
        cap += ["▶ フル版はYouTubeで公開中", "プロフィールのリンク →「YouTube」から見られます", ""]
    cap += ["▼関西の釣果・潮・今日の釣れる時間", "・プロフィールのリンクから", SITE.replace("https://", ""), "", reels.CREDIT, "", reels.TAGS + " " + src["tags"]]
    return "\n".join(cap)


def main():
    cmd, slug = sys.argv[1], sys.argv[2]
    src = json.load(open(f"content/cg/{slug}.json", encoding="utf-8"))
    if cmd == "id":
        stem = f"cg-{slug.replace('short-cg-', '')}-"
        if "--existing" in sys.argv:  # サイトに置いてある一番新しい動画を使う
            have = sorted(f[:-4] for f in os.listdir("public/sns") if f.startswith(stem) and f.endswith(".mp4"))
            if have:
                print(have[-1])
                return
        print(stem + reels.now().strftime("%Y-%m-%d"))
        return
    vid = sys.argv[3]
    plats = sys.argv[sys.argv.index("--platforms") + 1].split(",") if "--platforms" in sys.argv else ["instagram", "youtube"]
    cap = caption(src)
    print(cap)
    url = f"{SITE}/sns/{vid}.mp4"
    if not reels.wait_url(url):
        raise SystemExit(f"動画がサイトに公開されていません: {url}")
    log = reels.load_log()
    rec = {"slot": "cg-short", "key": slug, "id": vid, "at": reels.now().isoformat(timespec="minutes")}
    failed = False
    try:
        ig = reels.ig_reel(url, f"{SITE}/sns/{vid}.jpg", cap) if "instagram" in plats else None
        if ig:
            rec["instagram"] = ig
            print(f"::notice::instagram ok {ig}")
    except Exception as e:
        print(f"::error::instagram: {e}")
        failed = True
    try:
        yt = reels.yt_short(f"public/sns/{vid}.mp4", src["title"], cap) if "youtube" in plats else None
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
