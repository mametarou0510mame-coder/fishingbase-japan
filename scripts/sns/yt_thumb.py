# YouTube の動画にサムネイル画像を設定する（ショートでも試す）。
#   python scripts/sns/yt_thumb.py <videoId> <jpg>
import os, sys

sys.path.insert(0, os.path.dirname(__file__))
from video_post import clean, http  # noqa: E402


def set_thumb(vid, jpg):
    cid, csec, rtok = (clean(os.environ.get(k)) for k in ("YT_CLIENT_ID", "YT_CLIENT_SECRET", "YT_REFRESH_TOKEN"))
    tok = http("POST", "https://oauth2.googleapis.com/token", {"client_id": cid, "client_secret": csec, "refresh_token": rtok, "grant_type": "refresh_token"})["access_token"]
    with open(jpg, "rb") as f:
        r = http("POST", f"https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId={vid}", f.read(), {"Authorization": f"Bearer {tok}", "Content-Type": "image/jpeg"})
    return r


if __name__ == "__main__":
    try:
        r = set_thumb(sys.argv[1], sys.argv[2])
        print(f"::notice::thumbnail set {sys.argv[1]}: {str(r)[:300]}")
    except Exception as e:
        print(f"::warning::thumbnail failed {sys.argv[1]}: {str(e)[:400]}")
