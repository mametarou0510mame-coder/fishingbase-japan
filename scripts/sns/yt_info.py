# YouTube チャンネルの URL（ハンドル）と、投稿した動画の公開状態を確認する
import json, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from video_post import clean, http  # noqa: E402

try:
    tok = http("POST", "https://oauth2.googleapis.com/token", {k: clean(os.environ[v]) for k, v in (("client_id", "YT_CLIENT_ID"), ("client_secret", "YT_CLIENT_SECRET"), ("refresh_token", "YT_REFRESH_TOKEN"))} | {"grant_type": "refresh_token"})["access_token"]
except Exception as e:
    print(f"::error::token: {str(e)[:400]}")
    raise SystemExit(0)
H = {"Authorization": f"Bearer {tok}"}
def get(url):
    try:
        return http("GET", url, None, H)
    except Exception as e:
        print(f"::warning::{url.split('?')[0]}: {str(e)[:300]}")
        return {}


ch = get("https://www.googleapis.com/youtube/v3/channels?part=snippet,status&mine=true")
for c in ch.get("items", []):
    print(f"::notice::channel id={c['id']} title={c['snippet']['title']} customUrl={c['snippet'].get('customUrl')} privacy={c['status'].get('privacyStatus')}")
ids = ",".join(v["youtube"] for v in json.load(open("data/sns/long-posts.json")).values() if v.get("youtube"))
vs = get(f"https://www.googleapis.com/youtube/v3/videos?part=status,snippet&id={ids}")
for v in vs.get("items", []):
    print(f"::notice::video {v['id']} {v['status'].get('privacyStatus')} {v['status'].get('uploadStatus')} {v['snippet']['title'][:40]}")
print(f"::notice::found {len(vs.get('items', []))} of {len(ids.split(','))}")
