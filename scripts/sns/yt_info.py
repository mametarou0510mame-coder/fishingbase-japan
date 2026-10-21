# YouTube チャンネルの URL（ハンドル）と、投稿した動画の公開状態を確認する
import json, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from video_post import clean, http  # noqa: E402

tok = http("POST", "https://oauth2.googleapis.com/token", {k: clean(os.environ[v]) for k, v in (("client_id", "YT_CLIENT_ID"), ("client_secret", "YT_CLIENT_SECRET"), ("refresh_token", "YT_REFRESH_TOKEN"))} | {"grant_type": "refresh_token"})["access_token"]
H = {"Authorization": f"Bearer {tok}"}
ch = http("GET", "https://www.googleapis.com/youtube/v3/channels?part=snippet,status&mine=true", None, H)
for c in ch.get("items", []):
    print(f"::notice::channel id={c['id']} title={c['snippet']['title']} customUrl={c['snippet'].get('customUrl')} privacy={c['status'].get('privacyStatus')}")
ids = ",".join(v["youtube"] for v in json.load(open("data/sns/long-posts.json")).values() if v.get("youtube"))
vs = http("GET", f"https://www.googleapis.com/youtube/v3/videos?part=status,snippet&id={ids}", None, H)
for v in vs.get("items", []):
    print(f"::notice::video {v['id']} {v['status'].get('privacyStatus')} {v['status'].get('uploadStatus')} {v['snippet']['title'][:40]}")
print(f"::notice::found {len(vs.get('items', []))} of {len(ids.split(','))}")
