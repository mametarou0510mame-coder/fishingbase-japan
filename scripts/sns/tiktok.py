"""TikTok 連携（Login Kit + Content Posting API）。

使い方（GitHub Actions の tiktok.yml から）:
  python scripts/sns/tiktok.py auth-url          許可ページの URL を出す
  python scripts/sns/tiktok.py exchange CODE     戻り先ページのコードをトークンに換えて保存
  python scripts/sns/tiktok.py check             つないだアカウントと投稿できる公開範囲を表示
  python scripts/sns/tiktok.py post FILE CAPTION [PRIVACY]
                                                 動画を投稿（審査前は SELF_ONLY のみ）

トークンは data/sns/tiktok-token.enc に、TIKTOK_CLIENT_SECRET を鍵にして暗号化して置く。
ログやチャットにトークンを出さない。
"""
import json
import os
import secrets
import subprocess
import sys
import time
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TOKEN_FILE = os.path.join(ROOT, "data/sns/tiktok-token.enc")
REDIRECT_URI = "https://tsuredoki-kansai.mametarou0510mame.workers.dev/tiktok/callback/"
SCOPES = "user.info.basic,video.upload,video.publish"
API = "https://open.tiktokapis.com/v2"


def env(name):
    v = os.environ.get(name, "").strip()
    if not v:
        sys.exit(f"{name} が未登録です（GitHub の Secrets に登録してください）")
    return v


def summary(text):
    print(text)
    p = os.environ.get("GITHUB_STEP_SUMMARY")
    if p:
        with open(p, "a", encoding="utf-8") as f:
            f.write(text + "\n")


def http(method, url, data=None, headers=None, form=False):
    headers = dict(headers or {})
    body = None
    if data is not None:
        if form:
            body = urllib.parse.urlencode(data).encode()
            headers["Content-Type"] = "application/x-www-form-urlencoded"
        else:
            body = json.dumps(data).encode()
            headers["Content-Type"] = "application/json; charset=UTF-8"
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        txt = e.read().decode("utf-8", "replace")
        try:
            return json.loads(txt)
        except ValueError:
            sys.exit(f"HTTP {e.code}: {txt[:300]}")


# ---- token storage (openssl AES-256-CBC + PBKDF2, key = client secret) ----
def save_token(tok):
    tok = dict(tok)
    tok["saved_at"] = int(time.time())
    os.makedirs(os.path.dirname(TOKEN_FILE), exist_ok=True)
    subprocess.run(
        ["openssl", "enc", "-aes-256-cbc", "-pbkdf2", "-iter", "200000", "-salt", "-a",
         "-out", TOKEN_FILE, "-pass", "env:TIKTOK_CLIENT_SECRET"],
        input=json.dumps(tok).encode(), check=True)


def load_token():
    if not os.path.exists(TOKEN_FILE):
        sys.exit("まだ TikTok とつないでいません（auth-url → exchange を先に）")
    out = subprocess.run(
        ["openssl", "enc", "-d", "-aes-256-cbc", "-pbkdf2", "-iter", "200000", "-a",
         "-in", TOKEN_FILE, "-pass", "env:TIKTOK_CLIENT_SECRET"],
        capture_output=True, check=True).stdout
    return json.loads(out)


def token_request(extra):
    data = {"client_key": env("TIKTOK_CLIENT_KEY"), "client_secret": env("TIKTOK_CLIENT_SECRET")}
    data.update(extra)
    r = http("POST", f"{API}/oauth/token/", data, form=True)
    if "access_token" not in r:
        sys.exit(f"トークンを取得できませんでした：{r.get('error')} {r.get('error_description')}")
    return r


def access_token():
    tok = load_token()
    if time.time() > tok["saved_at"] + int(tok.get("expires_in", 0)) - 600:
        new = token_request({"grant_type": "refresh_token", "refresh_token": tok["refresh_token"]})
        save_token(new)
        tok = new
    return tok["access_token"]


# ---- commands ----
def cmd_auth_url():
    q = urllib.parse.urlencode({
        "client_key": env("TIKTOK_CLIENT_KEY"),
        "scope": SCOPES,
        "response_type": "code",
        "redirect_uri": REDIRECT_URI,
        "state": secrets.token_urlsafe(12),
    })
    summary("### TikTok の許可ページ\n\n下のリンクを開いて、ツレドキ関西の TikTok アカウントで「許可」を押してください。\n")
    summary(f"https://www.tiktok.com/v2/auth/authorize/?{q}")


def cmd_exchange(code):
    code = urllib.parse.unquote(code.strip())
    tok = token_request({"grant_type": "authorization_code", "code": code, "redirect_uri": REDIRECT_URI})
    save_token(tok)
    summary(f"TikTok とつなぎました（許可された範囲：{tok.get('scope')}）")
    cmd_check()


def creator_info(at):
    r = http("POST", f"{API}/post/publish/creator_info/query/", {}, {"Authorization": f"Bearer {at}"})
    if r.get("error", {}).get("code") != "ok":
        sys.exit(f"creator_info エラー：{r.get('error')}")
    return r["data"]


def cmd_check():
    d = creator_info(access_token())
    summary(f"アカウント：{d.get('creator_nickname')}（@{d.get('creator_username')}）")
    summary(f"選べる公開範囲：{', '.join(d.get('privacy_level_options', []))}")
    summary(f"動画の長さの上限：{d.get('max_video_post_duration_sec')} 秒")


def cmd_post(path, caption, privacy="SELF_ONLY"):
    at = access_token()
    info = creator_info(at)
    if privacy not in info.get("privacy_level_options", []):
        sys.exit(f"公開範囲 {privacy} は選べません（選べるのは {info.get('privacy_level_options')}）")
    size = os.path.getsize(path)
    chunk = size if size <= 64 * 1024 * 1024 else 10 * 1024 * 1024
    count = 1 if chunk == size else size // chunk
    r = http("POST", f"{API}/post/publish/video/init/", {
        "post_info": {
            "title": caption[:2200],
            "privacy_level": privacy,
            "disable_comment": False,
            "disable_duet": False,
            "disable_stitch": False,
        },
        "source_info": {"source": "FILE_UPLOAD", "video_size": size,
                        "chunk_size": chunk, "total_chunk_count": count},
    }, {"Authorization": f"Bearer {at}"})
    if r.get("error", {}).get("code") != "ok":
        sys.exit(f"投稿の準備でエラー：{r.get('error')}")
    pid, url = r["data"]["publish_id"], r["data"]["upload_url"]
    with open(path, "rb") as f:
        for i in range(count):
            start = i * chunk
            end = size - 1 if i == count - 1 else start + chunk - 1
            f.seek(start)
            part = f.read(end - start + 1)
            req = urllib.request.Request(url, data=part, method="PUT", headers={
                "Content-Type": "video/mp4",
                "Content-Length": str(len(part)),
                "Content-Range": f"bytes {start}-{end}/{size}",
            })
            urllib.request.urlopen(req, timeout=300).read()
    for _ in range(60):
        time.sleep(10)
        s = http("POST", f"{API}/post/publish/status/fetch/", {"publish_id": pid},
                 {"Authorization": f"Bearer {at}"})
        st = s.get("data", {}).get("status")
        if st in ("PUBLISH_COMPLETE", "FAILED"):
            break
    summary(f"TikTok：{st}（publish_id {pid}、公開範囲 {privacy}）")
    if st != "PUBLISH_COMPLETE":
        sys.exit(f"投稿できませんでした：{s.get('data', {}).get('fail_reason')}")


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    {"auth-url": lambda: cmd_auth_url(),
     "exchange": lambda: cmd_exchange(a[1]),
     "check": lambda: cmd_check(),
     "post": lambda: cmd_post(a[1], a[2], *(a[3:4]))}[a[0]]()
