# Instagram の連携を確かめる：トークンが使えるか、何日後に切れるか。
# 切れる14日前から、GitHub の Issue でオーナーに知らせる（同じ Issue は1つだけ）。
import json, os, sys, time, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from video_post import clean, http  # noqa: E402

API = "https://graph.facebook.com/v21.0"
uid, tok = clean(os.environ.get("IG_USER_ID")), clean(os.environ.get("IG_TOKEN"))
if not uid or not tok:
    print("::warning::IG_USER_ID / IG_TOKEN が未設定です")
    sys.exit(0)

try:
    me = http("GET", f"{API}/{uid}?fields=username,media_count&access_token={urllib.parse.quote(tok)}")
    print(f"::notice::Instagram 連携 OK：@{me.get('username')}（投稿 {me.get('media_count')} 件）")
except Exception as e:
    print(f"::error::Instagram のトークンが使えません: {e}")
    me = None

days = None
try:
    d = http("GET", f"{API}/debug_token?input_token={urllib.parse.quote(tok)}&access_token={urllib.parse.quote(tok)}")["data"]
    exp = d.get("expires_at") or 0
    if exp:
        days = (exp - time.time()) / 86400
        print(f"::notice::トークンの有効期限：{time.strftime('%Y-%m-%d', time.gmtime(exp + 9 * 3600))}（あと {days:.0f} 日）")
    else:
        print("::notice::トークンの有効期限：なし")
except Exception as e:
    print(f"::warning::有効期限を確認できませんでした: {e}")

need = me is None or (days is not None and days < 14)
if need and os.environ.get("GITHUB_TOKEN") and os.environ.get("GITHUB_REPOSITORY"):
    repo, gh = os.environ["GITHUB_REPOSITORY"], os.environ["GITHUB_TOKEN"]
    title = "【要対応】Instagram のトークンを更新してください"
    hdr = {"Authorization": f"Bearer {gh}", "Accept": "application/vnd.github+json"}
    q = urllib.parse.quote(f'repo:{repo} is:issue is:open in:title "{title}"')
    found = http("GET", f"https://api.github.com/search/issues?q={q}", headers=hdr).get("total_count", 0)
    if not found:
        body = ("Instagram への自動投稿に使うトークンが" + ("使えなくなりました。" if me is None else f"あと{days:.0f}日で切れます。")
                + "\n\nチャットの Claude に「Instagramのトークンを更新したい」と伝えると、手順を案内します。更新が終わったらこの Issue を閉じてください。")
        http("POST", f"https://api.github.com/repos/{repo}/issues", json.dumps({"title": title, "body": body}).encode(), {**hdr, "Content-Type": "application/json"})
        print("::warning::オーナーに知らせる Issue を作りました")
