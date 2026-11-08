"""YouTube チャンネルの説明文に1行足す（すでにあれば何もしない）。
  python scripts/sns/yt_channel.py "<足す行>" [--dry]"""
import json, os, sys, urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from video_post import clean, http  # noqa: E402

line = sys.argv[1]
dry = "--dry" in sys.argv
tok = http("POST", "https://oauth2.googleapis.com/token", {k: clean(os.environ[v]) for k, v in (("client_id", "YT_CLIENT_ID"), ("client_secret", "YT_CLIENT_SECRET"), ("refresh_token", "YT_REFRESH_TOKEN"))} | {"grant_type": "refresh_token"})["access_token"]
H = {"Authorization": f"Bearer {tok}"}
ch = http("GET", "https://www.googleapis.com/youtube/v3/channels?part=brandingSettings&mine=true", None, H)["items"][0]
bs = ch["brandingSettings"]
desc = bs.get("channel", {}).get("description", "")
print("::group::before\n" + desc + "\n::endgroup::")
key = line.split("：")[-1].strip()
if key and key in desc:
    print("::notice::すでに入っています")
    raise SystemExit(0)
new = (desc.rstrip() + "\n\n" + line).strip()
print("::group::after\n" + new + "\n::endgroup::")
if dry:
    raise SystemExit(0)
bs.setdefault("channel", {})["description"] = new
body = json.dumps({"id": ch["id"], "brandingSettings": bs}).encode()
req = urllib.request.Request("https://www.googleapis.com/youtube/v3/channels?part=brandingSettings", data=body, method="PUT",
                             headers=H | {"Content-Type": "application/json"})
try:
    with urllib.request.urlopen(req, timeout=60) as r:
        print("::notice::チャンネル説明を更新しました", r.status)
except urllib.error.HTTPError as e:
    print("::error::", e.code, e.read().decode()[:500])
    raise SystemExit(1)
