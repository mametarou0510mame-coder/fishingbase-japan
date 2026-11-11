# 3本の動画の概要欄にある もしもの Amazon リンクを、アソシエイト直接のリンク（YouTube用ID）に入れ替える
# APPLY=1 のときだけ更新。それ以外は差分を表示するだけ。固定コメントの文面ファイルも同じ形に直す
import glob, os, re, sys, urllib.parse

sys.path.insert(0, os.path.dirname(__file__))
from video_post import clean, http  # noqa: E402

TAG = "tsuredoki-yt-22"
VIDEOS = ["LX-HBtEjeNU", "MWOymkNuDho", "K9EVCGgGxTw"]
RX = re.compile(r"https://af\.moshimo\.com/af/c/click\?[^\s]*")


def conv(m):
    q = urllib.parse.parse_qs(urllib.parse.urlsplit(m.group(0)).query)
    t = q.get("url", [""])[0]
    if "amazon.co.jp" not in t:
        return m.group(0)
    return t + ("&" if "?" in t else "?") + "tag=" + TAG


for f in glob.glob("data/sns/yt-comments/cg-gear-*.txt"):
    s = open(f, encoding="utf-8").read()
    n = RX.sub(conv, s)
    if n != s:
        open(f, "w", encoding="utf-8").write(n)
        print(f"::notice::コメント文面 {f} を更新")

tok = http("POST", "https://oauth2.googleapis.com/token", {k: clean(os.environ[v]) for k, v in (("client_id", "YT_CLIENT_ID"), ("client_secret", "YT_CLIENT_SECRET"), ("refresh_token", "YT_REFRESH_TOKEN"))} | {"grant_type": "refresh_token"})["access_token"]
H = {"Authorization": f"Bearer {tok}"}
apply = os.environ.get("APPLY") == "1"
for vid in VIDEOS:
    v = http("GET", f"https://www.googleapis.com/youtube/v3/videos?part=snippet&id={vid}", None, H)["items"][0]
    sn = v["snippet"]
    old = sn["description"]
    new = RX.sub(conv, old)
    left = len(RX.findall(new))
    print(f"::notice::{vid} {sn['title'][:30]} もしも {len(RX.findall(old))}本 → 残り {left}本 / 直接 {len(re.findall(r'tag=' + TAG, new))}本")
    if new == old:
        continue
    os.makedirs("data/sns/yt-fixed", exist_ok=True)
    open(f"data/sns/yt-fixed/{vid}-description.txt", "w", encoding="utf-8").write(new)
    if not apply:
        continue
    body = {"id": vid, "snippet": {k: sn[k] for k in ("title", "categoryId") } | {"description": new} | {k: sn[k] for k in ("tags", "defaultLanguage") if k in sn}}
    http("PUT", "https://www.googleapis.com/youtube/v3/videos?part=snippet", body, H)
    chk = http("GET", f"https://www.googleapis.com/youtube/v3/videos?part=snippet&id={vid}", None, H)["items"][0]["snippet"]["description"]
    print(f"::notice::{vid} 更新済み 確認: もしも {len(RX.findall(chk))}本 / 直接 {len(re.findall(r'tag=' + TAG, chk))}本")
