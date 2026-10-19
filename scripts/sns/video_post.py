# 釣り方ガイドの動画を Instagram（リール）と YouTube（ショート）に1日1本ずつ投稿する。
# 使い方:
#   python scripts/sns/video_post.py [--slug SLUG] [--platforms "instagram youtube"] [--publish] [--scheduled]
#   --publish なし … 投稿文を作って表示するだけ（下書き）
#   --scheduled  … 定期実行。data/sns/video-posts.json の enabled が true の時だけ投稿する
# 必要なキー（GitHub Secrets）:
#   Instagram: IG_USER_ID, IG_TOKEN
#   YouTube  : YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN
import argparse, glob, json, os, sys, time, urllib.error, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone

SITE = os.environ.get("SITE_URL", "https://tsuredoki-kansai.mametarou0510mame.workers.dev")
STATE = "data/sns/video-posts.json"
JST = timezone(timedelta(hours=9))
CREDIT = "音声合成：VOICEVOX:ずんだもん"
CIRCLED = "①②③④⑤⑥⑦⑧⑨"
BASE_TAGS = ["釣り方", "釣り初心者", "関西釣り", "堤防釣り", "海釣り", "ツレドキ関西"]
CAT_TAGS = {"エサ釣り": ["エサ釣り", "海釣り公園"], "ルアー": ["ルアー釣り", "ショアゲーム"], "基本": ["釣りの基本", "釣り安全"]}


def http(method, url, data=None, headers=None, raw=False):
    body = urllib.parse.urlencode(data).encode() if isinstance(data, dict) else data
    req = urllib.request.Request(url, data=body, method=method, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            return r if raw else json.load(r)
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code} {e.read()[:400]!r}")


def load_guides():
    gs = [json.load(open(f, encoding="utf-8")) for f in glob.glob("content/guides/*.json") if not os.path.basename(f).startswith("_")]
    return sorted(gs, key=lambda g: g["no"])


def load_state():
    try:
        return json.load(open(STATE, encoding="utf-8"))
    except FileNotFoundError:
        return {"enabled": False, "posts": {}}


def save_state(st):
    os.makedirs(os.path.dirname(STATE), exist_ok=True)
    with open(STATE, "w", encoding="utf-8") as f:
        json.dump(st, f, ensure_ascii=False, indent=2)
        f.write("\n")


def tag_words(g):
    words = list(BASE_TAGS) + CAT_TAGS.get(g["category"], [])
    for t in g["targets"]:
        for w in t.replace("（", "・").replace("）", "").split("・"):
            w = w.strip()
            if w and w != "すべての釣り":
                words.append(w + "釣り" if len(w) <= 4 and not w.endswith("釣り") else w)
    out = []
    for w in words:
        if w not in out:
            out.append(w)
    return out[:20]


def first_sentence(text):
    i = text.find("。")
    return text[: i + 1] if i > 0 else text


def caption_instagram(g):
    lines = [f"【釣り方ガイド No.{g['no']}】{g['title']}（{g['sub']}）", "", first_sentence(g["summary"]), "", "▼手順"]
    lines += [f"{CIRCLED[i]} {s['title']}" for i, s in enumerate(g["steps"][:5])]
    lines += ["", "▼その日のパターン"]
    lines += [f"・{r['when']} → {r['do']}" for r in g["patterns"]["rows"][:3]]
    lines += ["", "道具リスト（初級・中級・上級）と、向いている関西の釣り場は、プロフィールのリンク「ツレドキ関西」の釣り方ガイドへ。", "", CREDIT, "", " ".join("#" + w for w in tag_words(g))]
    return "\n".join(lines)


def youtube_meta(g):
    title = f"{g['title']}｜{g['sub']}【釣り方ガイド】 #Shorts"
    if len(title) > 100:
        title = f"{g['title']}【釣り方ガイド】 #Shorts"
    desc = [first_sentence(g["summary"]), "", "▼手順"]
    desc += [f"{CIRCLED[i]} {s['title']}" for i, s in enumerate(g["steps"][:5])]
    desc += ["", "▼その日のパターン"]
    desc += [f"・{r['when']} → {r['do']}" for r in g["patterns"]["rows"][:4]]
    desc += ["", "道具リスト（初級・中級・上級）・向いている関西の釣り場はこちら", f"{SITE}/guide/{g['slug']}/", "",
             "関西の釣果・潮・釣れる時間（ねらい目）をまとめてチェック", f"{SITE}/", "", CREDIT, "", " ".join("#" + w for w in tag_words(g)[:10])]
    return {
        "snippet": {"title": title, "description": "\n".join(desc), "tags": tag_words(g), "categoryId": "26", "defaultLanguage": "ja", "defaultAudioLanguage": "ja"},
        "status": {"privacyStatus": "public", "selfDeclaredMadeForKids": False},
    }


def clean(v):
    """コピー時に混じりやすい空白・改行・引用符を取り除く"""
    return (v or "").strip().strip('"').strip("'").strip() or None


def post_instagram(g):
    uid, token = clean(os.environ.get("IG_USER_ID")), clean(os.environ.get("IG_TOKEN"))
    if token and token.lower().startswith("bearer "):
        token = token[7:].strip()
    if not uid or not token:
        return None, "skip（IG_USER_ID / IG_TOKEN 未設定）"
    api = "https://graph.facebook.com/v21.0"
    # キーの形だけを記録する（中身は出さない）
    shape = f"長さ{len(token)}・先頭{token[:3]}・英数字以外{sorted(set(ch for ch in token if not ch.isalnum()))[:5]}"
    print(f"::notice::IG_TOKEN の形: {shape} / IG_USER_ID の桁数: {len(uid)}")
    c = http("POST", f"{api}/{uid}/media", {
        "media_type": "REELS",
        "video_url": f"{SITE}/videos/{g['slug']}.mp4",
        "cover_url": f"{SITE}/videos/{g['slug']}.jpg",
        "caption": caption_instagram(g),
        "share_to_feed": "true",
        "access_token": token,
    })
    for _ in range(40):  # 動画の処理を最大10分待つ
        time.sleep(15)
        st = http("GET", f"{api}/{c['id']}?fields=status_code,status&access_token={token}")
        if st.get("status_code") == "FINISHED":
            break
        if st.get("status_code") in ("ERROR", "EXPIRED"):
            raise RuntimeError(f"Instagram の動画処理に失敗: {st}")
    else:
        raise RuntimeError("Instagram の動画処理が10分以内に終わりませんでした")
    r = http("POST", f"{api}/{uid}/media_publish", {"creation_id": c["id"], "access_token": token})
    return r.get("id"), "ok"


def post_youtube(g):
    cid, csec, rtok = (clean(os.environ.get(k)) for k in ("YT_CLIENT_ID", "YT_CLIENT_SECRET", "YT_REFRESH_TOKEN"))
    if not (cid and csec and rtok):
        return None, "skip（YT_CLIENT_ID / YT_CLIENT_SECRET / YT_REFRESH_TOKEN 未設定）"
    tok = http("POST", "https://oauth2.googleapis.com/token", {"client_id": cid, "client_secret": csec, "refresh_token": rtok, "grant_type": "refresh_token"})["access_token"]
    path = f"public/videos/{g['slug']}.mp4"
    size = os.path.getsize(path)
    meta = json.dumps(youtube_meta(g)).encode()
    url = "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status"
    r = http("POST", url, meta, {
        "Authorization": f"Bearer {tok}",
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": "video/mp4",
        "X-Upload-Content-Length": str(size),
    }, raw=True)
    loc = r.headers["Location"]
    with open(path, "rb") as f:
        res = http("PUT", loc, f.read(), {"Authorization": f"Bearer {tok}", "Content-Type": "video/mp4"})
    return res.get("id"), "ok"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--slug")
    ap.add_argument("--platforms", default="instagram youtube")
    ap.add_argument("--publish", action="store_true")
    ap.add_argument("--scheduled", action="store_true")
    a = ap.parse_args()
    platforms = a.platforms.split()
    if a.publish:
        # キーが登録されているSNSだけを対象にする（未設定のSNSのせいで同じ動画が止まらないように）
        keys = {"instagram": ("IG_USER_ID", "IG_TOKEN"), "youtube": ("YT_CLIENT_ID", "YT_CLIENT_SECRET", "YT_REFRESH_TOKEN")}
        ready = [p for p in platforms if all(clean(os.environ.get(k)) for k in keys.get(p, ()))]
        for p in set(platforms) - set(ready):
            print(f"::notice::{p} はキーが未設定のため今回は投稿しません")
        platforms = ready
        if not platforms:
            return
    st = load_state()
    if a.scheduled and not st.get("enabled"):
        print("::notice::定期投稿は停止中です（data/sns/video-posts.json の enabled が false）。下書きだけ作ります。")
        a.publish = False
    guides = load_guides()
    if a.slug:
        g = next(x for x in guides if x["slug"] == a.slug)
    else:
        # まだどこかに投稿していない最初のガイド（No.順）
        g = next((x for x in guides if any(p not in st["posts"].get(x["slug"], {}) for p in platforms)), None)
        if not g:
            print("::notice::すべてのガイド動画を投稿済みです。")
            return
    if not os.path.exists(f"public/videos/{g['slug']}.mp4"):
        print(f"::warning::{g['slug']} の動画がありません")
        return

    summary = [f"## {g['title']}（{g['slug']}）", "", "### Instagram（リール）", "```", caption_instagram(g), "```", "", "### YouTube（ショート）"]
    ym = youtube_meta(g)
    summary += ["タイトル: " + ym["snippet"]["title"], "```", ym["snippet"]["description"], "```"]
    text = "\n".join(summary)
    print(text)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as f:
            f.write(text + "\n")
    if not a.publish:
        return

    now = datetime.now(JST).isoformat(timespec="minutes")
    done = st["posts"].setdefault(g["slug"], {})
    failed = False
    for p in platforms:
        if p in done and not a.slug:
            continue
        try:
            pid, msg = post_instagram(g) if p == "instagram" else post_youtube(g)
        except Exception as e:  # 片方が失敗しても、もう片方は続ける
            print(f"::error::{p}: {e}")
            failed = True
            continue
        print(f"::notice::{p}: {msg} {pid or ''}")
        if pid:
            done[p] = {"id": pid, "at": now}
    save_state(st)
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
