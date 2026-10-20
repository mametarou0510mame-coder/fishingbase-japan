# Instagram のコメント対応（30分ごと）。
#  1) 質問つきの投稿に、運営から「最初のコメント」で質問を書き込む（アプリで長押し→ピン留めすると固定表示になる）
#  2) 付いたコメントに、内容に合わせて1回だけ自動で返信する（同じコメントには二度返信しない）
# API でできるのは返信・非表示・削除までで、コメントの「固定（ピン留め）」はできない。
import json, os, re, sys, time, urllib.parse
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(__file__))
from video_post import clean, http  # noqa: E402

API = "https://graph.facebook.com/v21.0"
LOG = "data/sns/ig-comments.json"
MAX_REPLIES = 30
NG = re.compile(r"https?://|www\.|LINE|ライン|副業|稼げ|儲か|フォロー返|相互|DM|ＤＭ|死|殺|バカ|アホ|クソ|ブス|キモ", re.I)
NUMS = {"1": 0, "2": 1, "3": 2, "4": 3, "5": 4, "①": 0, "②": 1, "③": 2, "④": 3, "⑤": 4, "１": 0, "２": 1, "３": 2, "４": 3, "５": 4}


def load():
    try:
        return json.load(open(LOG, encoding="utf-8"))
    except FileNotFoundError:
        return {"first": {}, "replied": []}


def q(params):
    return "&".join(f"{k}={urllib.parse.quote(str(v))}" for k, v in params.items())


def question_of(caption):
    """キャプションの「💬 コメントで教えてください！」の質問と選択肢を取り出す"""
    lines = (caption or "").split("\n")
    if not any("コメントで教えてください" in ln for ln in lines):
        return None
    i = next(k for k, ln in enumerate(lines) if "コメントで教えてください" in ln)
    question = lines[i + 1].strip() if i + 1 < len(lines) else ""
    opts = []
    for ln in lines[i + 2:]:
        m = re.match(r"^([①②③④⑤])\s*(.+)$", ln.strip())
        if not m:
            break
        opts.append(m.group(2).strip())
    return question, opts


def reply_for(text, qa):
    t = text.strip()
    opts = qa[1] if qa else []
    pick = None
    report = re.search(r"釣れ|釣った|ゲット|釣果|\d+\s*(cm|センチ|匹|本|kg)", t)
    m = re.search(r"(?<![0-9０-９])([1-5１-５①-⑤])(?![0-9０-９]|\s*(cm|センチ|匹|本|号|g|kg|時|月|日))", t)
    if m and opts and NUMS.get(m.group(1), 9) < len(opts) and not (report and len(t) > 15):
        pick = opts[NUMS[m.group(1)]]
    else:
        for o in opts:
            key = re.split(r"[をでの（・\s]", o)[0]
            if len(key) >= 2 and key in t:
                pick = o
                break
    if pick:
        return f"「{pick}」派なんですね！コメントありがとうございます🎣 よく行く釣り場や、釣れた時期も教えてもらえるとうれしいです。"
    if re.search(r"[？?]|教えて|どこ|いつ|どう|ですか", t):
        return "ご質問ありがとうございます！釣り場ごとの潮・天気・最近の釣果は、プロフィールのリンクの「ツレドキ関西」でまとめて見られます。わからない所があれば、また気軽に聞いてください🙌"
    if re.search(r"釣れ|釣った|ゲット|釣果|cm|センチ|匹", t):
        return "釣果報告ありがとうございます！🐟 ナイスです！また釣れたら教えてください。"
    return "コメントありがとうございます！🎣 これからも関西の釣り情報を発信していきます。"


def main():
    uid, tok = clean(os.environ.get("IG_USER_ID")), clean(os.environ.get("IG_TOKEN"))
    if not uid or not tok:
        print("::warning::IG_USER_ID / IG_TOKEN が未設定です")
        return
    log = load()
    me = http("GET", f"{API}/{uid}?{q({'fields': 'username', 'access_token': tok})}")["username"]
    media = http("GET", f"{API}/{uid}/media?{q({'fields': 'id,caption,timestamp,comments_count', 'limit': 25, 'access_token': tok})}").get("data", [])
    since = datetime.now(timezone.utc) - timedelta(days=14)
    replied = set(log["replied"])
    n_first = n_reply = 0
    for m in media:
        ts = datetime.strptime(m["timestamp"], "%Y-%m-%dT%H:%M:%S%z")
        if ts < since:
            continue
        qa = question_of(m.get("caption"))
        # 1) 最初のコメント（質問）
        if qa and m["id"] not in log["first"]:
            msg = "💬 みなさんはどれ？\n" + qa[0] + "\n" + "\n".join(f"{'①②③④⑤'[i]} {o}" for i, o in enumerate(qa[1])) + "\n番号でコメントしてね！"
            try:
                r = http("POST", f"{API}/{m['id']}/comments", {"message": msg, "access_token": tok})
                log["first"][m["id"]] = r.get("id")
                n_first += 1
            except Exception as e:
                print(f"::warning::最初のコメントを書けませんでした（{m['id']}）: {e}")
        if not m.get("comments_count"):
            continue
        # 2) コメントへの返信
        cs = http("GET", f"{API}/{m['id']}/comments?{q({'fields': 'id,text,username,timestamp,replies{username}', 'limit': 50, 'access_token': tok})}").get("data", [])
        for c in cs:
            if n_reply >= MAX_REPLIES:
                break
            if c["id"] in replied or c.get("username") == me or c["id"] == log["first"].get(m["id"]):
                continue
            if any(r.get("username") == me for r in (c.get("replies") or {}).get("data", [])):
                replied.add(c["id"])
                continue
            text = c.get("text") or ""
            if NG.search(text) or len(text) > 300:
                replied.add(c["id"])  # 宣伝・暴言らしいものには返信しない（運営が手で確認）
                print(f"::notice::返信しないコメント（要確認）: {m['id']} / {text[:40]}")
                continue
            try:
                http("POST", f"{API}/{c['id']}/replies", {"message": reply_for(text, qa), "access_token": tok})
                n_reply += 1
                time.sleep(3)
            except Exception as e:
                print(f"::warning::返信できませんでした（{c['id']}）: {e}")
                continue
            replied.add(c["id"])
    log["replied"] = sorted(replied)[-3000:]
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    json.dump(log, open(LOG, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"::notice::最初のコメント {n_first} 件・返信 {n_reply} 件")


if __name__ == "__main__":
    main()
