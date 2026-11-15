# 1枚の画像を Instagram に投稿する（オーナーが確認した画像と文だけ）。
#   python scripts/sns/ig_single.py <名前>   … content/sns/ig/<名前>.jpg と <名前>.txt（投稿文）
import json, os, sys, time

sys.path.insert(0, os.path.dirname(__file__))
from video_post import clean, http  # noqa: E402


def main():
    name = sys.argv[1]
    repo = os.environ.get("GITHUB_REPOSITORY", "mametarou0510mame-coder/fishingbase-japan")
    sha = os.environ.get("GITHUB_SHA", "main")
    url = f"https://raw.githubusercontent.com/{repo}/{sha}/content/sns/ig/{name}.jpg"
    cap = open(f"content/sns/ig/{name}.txt", encoding="utf-8").read().strip()
    uid, tok = clean(os.environ.get("IG_USER_ID")), clean(os.environ.get("IG_TOKEN"))
    api = "https://graph.facebook.com/v21.0"
    c = http("POST", f"{api}/{uid}/media", {"image_url": url, "caption": cap, "access_token": tok})
    for _ in range(30):
        st = http("GET", f"{api}/{c['id']}?fields=status_code&access_token={tok}")
        if st.get("status_code") == "FINISHED":
            break
        if st.get("status_code") in ("ERROR", "EXPIRED"):
            raise RuntimeError(f"Instagram の処理に失敗: {st}")
        time.sleep(5)
    r = http("POST", f"{api}/{uid}/media_publish", {"creation_id": c["id"], "access_token": tok})
    print(f"::notice::Instagram 投稿 ok {r.get('id')}（{name}）")


if __name__ == "__main__":
    main()
