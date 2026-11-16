# オーナーが確認したカルーセル（複数枚）を Instagram に投稿する。
#   python scripts/sns/ig_carousel.py <名前>   … content/sns/ig/<名前>/1.jpg, 2.jpg … と caption.txt
import os, sys, time

sys.path.insert(0, os.path.dirname(__file__))
from video_post import clean, http  # noqa: E402


def main():
    name = sys.argv[1]
    d = f"content/sns/ig/{name}"
    repo = os.environ.get("GITHUB_REPOSITORY", "mametarou0510mame-coder/fishingbase-japan")
    sha = os.environ.get("GITHUB_SHA", "main")
    files = sorted([f for f in os.listdir(d) if f[:-4].isdigit() and f.endswith(".jpg")], key=lambda f: int(f[:-4]))
    cap = open(f"{d}/caption.txt", encoding="utf-8").read().strip()
    uid, tok = clean(os.environ.get("IG_USER_ID")), clean(os.environ.get("IG_TOKEN"))
    api = "https://graph.facebook.com/v21.0"
    kids = []
    for f in files:
        url = f"https://raw.githubusercontent.com/{repo}/{sha}/{d}/{f}"
        kids.append(http("POST", f"{api}/{uid}/media", {"image_url": url, "is_carousel_item": "true", "access_token": tok})["id"])
    parent = http("POST", f"{api}/{uid}/media", {"media_type": "CAROUSEL", "children": ",".join(kids), "caption": cap, "access_token": tok})
    for _ in range(30):
        st = http("GET", f"{api}/{parent['id']}?fields=status_code&access_token={tok}")
        if st.get("status_code") == "FINISHED":
            break
        if st.get("status_code") in ("ERROR", "EXPIRED"):
            raise RuntimeError(f"Instagram の処理に失敗: {st}")
        time.sleep(5)
    r = http("POST", f"{api}/{uid}/media_publish", {"creation_id": parent["id"], "access_token": tok})
    print(f"::notice::Instagram カルーセル投稿 ok {r.get('id')}（{name}・{len(files)}枚）")


if __name__ == "__main__":
    main()
