"""
ツレドキ関西の自動投稿（Instagram・Threads・X）。GitHub Actions から1日数回動かす。

  python post.py compose <mode> <outdir>   … 投稿文と画像を作る（mode: morning / evening / weekend）
  python post.py publish <outdir> <image_url>  … キーが設定されているSNSに投稿する（未設定なら何もしない）

- 内容はサイトの /sns/today.json（ねらい目・釣果のまとめ）から作る。釣果は施設・釣具店の発表の事実だけで、出典を書く。
- Xは従量課金のため、リンクなし・1日2件程度に抑える（リンクはプロフィールに置く）。
"""
import base64, hashlib, hmac, json, os, sys, time, urllib.parse, urllib.request, uuid
from datetime import datetime, timedelta, timezone

JST = timezone(timedelta(hours=9))
SITE = "https://tsuredoki-kansai.mametarou0510mame.workers.dev"
WEEK = "月火水木金土日"
IG_TAGS = "#関西釣り #大阪湾 #釣果情報 #海釣り公園 #堤防釣り #サビキ釣り #釣り初心者 #釣り好きな人と繋がりたい #ツレドキ関西"


def get_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "TsuredokiKansai-SNS/0.1"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def md(date):
    d = datetime.strptime(date, "%Y-%m-%d")
    return f"{d.month}/{d.day}({WEEK[d.weekday()]})"


def best(spot, date):
    ws = spot["days"].get(date, {}).get("windows", [])
    return max([w["score"] for w in ws], default=0)


def ranking(data, date, n=3):
    spots = [s for s in data["spots"] if best(s, date) > 0]
    spots.sort(key=lambda s: (-best(s, date), -s.get("recentReports", 0)))
    return spots[:n]


def win_text(w):
    r = "・".join(w["reasons"])
    return f"{w['grade']}{w['from']}〜{w['to']}時" + (f"（{r}）" if r else "")


def windy_count(data, date):
    return sum(1 for s in data["spots"] if (s["days"].get(date, {}).get("maxWind") or 0) >= 10)


def tide_name(data, date):
    return next((d["tideName"] for d in data["dates"] if d["date"] == date), "")


# ---- 投稿文 ----
import re


def x_weight(text):
    """Xの文字数の数え方（日本語などは2、英数字は1、URLは23）"""
    text = re.sub(r"https?://\S+", "x" * 23, text)
    return sum(1 if ord(c) < 0x1100 else 2 for c in text)


def fit_x(lines, tail, limit=270):
    """上限を超えるときは、見出し以外の行を後ろから省く"""
    lines = list(lines)
    while x_weight("\n".join(lines + [tail])) > limit and len(lines) > 1:
        lines.pop()
    return "\n".join(lines + [tail])


def short(text):
    """X用に、釣り場名の「（ヤザワ渡船）」のような渡船名の括弧だけを省く"""
    return re.sub(r"（[^）]*渡船）", "", text)
def compose_morning(data, today):
    tn = tide_name(data, today)
    top = ranking(data, today)
    windy = windy_count(data, today)
    lines = [f"【今日のねらい目】{md(today)} {tn}"]
    for i, s in enumerate(top, 1):
        w = max(s["days"][today]["windows"], key=lambda x: x["score"])
        lines.append(f"{'①②③'[i-1]}{s['name']} {win_text(w)}")
    if not top:
        lines.append("今日は営業時間内に目立つねらい目が少ない日です。")
    if windy:
        lines.append(f"⚠ {windy}か所で風速10m以上の予報。無理な釣行は控えましょう")
    x = fit_x([short(l) if l[:1] in "①②③" else l for l in lines], "#関西釣り")
    threads = "\n".join(lines) + f"\n\n潮の動き・朝夕のまずめ・営業時間・風の予報から計算した目安です。\n{SITE}/"
    ig = "\n".join(lines) + "\n\n潮の動き・朝夕のまずめ・営業時間・風の予報（気象庁）から計算した、ツレドキ関西の目安です。釣り場ごとのタイドグラフや最近の釣果はプロフィールのリンクから。\n\n" + IG_TAGS
    return {"x": x, "threads": threads, "ig": ig, "card": {"title": "今日のねらい目", "date": f"{md(today)}　{tn}", "rows": [(s["name"], win_text(max(s["days"][today]["windows"], key=lambda x: x["score"]))) for s in top], "note": f"⚠ {windy}か所で風速10m以上の予報" if windy else "風の予報は各釣り場のページで"}}


def highlights(items, n=4):
    best_by_spot = {}
    for it in items:
        if "種類不明" in it["species"]:
            continue
        key = it["spot"]
        score = (it["sizeCm"] or 0) * 10 + min(it["count"] or 0, 500)
        if key not in best_by_spot or score > best_by_spot[key][0]:
            best_by_spot[key] = (score, it)
    picks = sorted(best_by_spot.values(), key=lambda x: -x[0])[:n]
    out = []
    for _, it in picks:
        cnt = it["count"] or 0
        if cnt >= 20:
            val = f"{cnt:,}匹" + (f"（〜{it['sizeCm']:g}cm）" if it["sizeCm"] else "")
        else:
            val = f"{it['sizeCm']:g}cm" if it["sizeCm"] else (f"{cnt}匹" if cnt else "")
        out.append((it["name"].split("（")[0], f"{it['species'].split('（')[0]} {val}".strip(), it["source"]))
    return out


def compose_evening(data, today):
    days = sorted(data["catches"].keys(), reverse=True)
    day = today if today in data["catches"] else (days[0] if days else None)
    if not day:
        return None
    hs = highlights(data["catches"][day])
    if not hs:
        return None
    head = f"【{'今日' if day == today else md(day)}の釣果ハイライト】"
    lines = [head] + [f"・{n}：{c}" for n, c, _ in hs]
    x = fit_x([short(l) for l in lines], "（各施設・釣具店の発表より）\n#関西釣り #釣果情報")
    threads = "\n".join(lines) + "\n\n各施設・渡船・釣具店が公開した釣果をまとめています。詳しくは各釣り場のページへ。\n" + f"{SITE}/kansai/area/"
    ig = "\n".join(lines) + "\n\n各施設・渡船・釣具店が公開した釣果をまとめています。\n\n" + IG_TAGS
    return {"x": x, "threads": threads, "ig": ig, "card": {"title": "釣果ハイライト", "date": md(day), "rows": [(n, c) for n, c, _ in hs], "note": "各施設・釣具店の発表より"}}


def compose_weekend(data, today):
    t = datetime.strptime(today, "%Y-%m-%d")
    sat = (t + timedelta(days=(5 - t.weekday()) % 7)).strftime("%Y-%m-%d")
    sun = (datetime.strptime(sat, "%Y-%m-%d") + timedelta(days=1)).strftime("%Y-%m-%d")
    lines = ["【週末の釣り予報】"]
    rows = []
    for d in (sat, sun):
        if not any(s["days"].get(d) for s in data["spots"]):
            continue
        top = ranking(data, d, 2)
        lines.append(f"{md(d)} {tide_name(data, d)}")
        for s in top:
            w = max(s["days"][d]["windows"], key=lambda x: x["score"])
            lines.append(f"・{s['name']} {win_text(w)}")
            rows.append((f"{md(d)} {s['name']}", win_text(w)))
        wc = windy_count(data, d)
        if wc:
            lines.append(f"  ⚠ 風10m以上の予報 {wc}か所")
    if len(lines) == 1:
        return None
    x = fit_x([short(l) for l in lines], "#関西釣り")
    threads = "\n".join(lines) + f"\n\n天気は直前に変わることがあります。出かける前に最新の予報を確認してください。\n{SITE}/"
    ig = "\n".join(lines) + "\n\n天気は直前に変わることがあります。釣り場ごとの詳しい情報はプロフィールのリンクから。\n\n" + IG_TAGS
    return {"x": x, "threads": threads, "ig": ig, "card": {"title": "週末の釣り予報", "date": f"{md(sat)}・{md(sun)}", "rows": rows, "note": "天気は直前に変わることがあります"}}


# ---- 画像（Instagram 1080x1350）----
def render_card(card, path):
    sys.path.insert(0, os.path.dirname(__file__))
    from PIL import Image, ImageDraw
    from draw import NAVY, NAVY2, RED, GLOW, WHITE, MUTED, FONT_BLACK, FONT_BOLD, FONT_REG, font, logo, wave_fill

    W, H = 1080, 1350
    img = Image.new("RGB", (W, H), NAVY)
    d = ImageDraw.Draw(img)
    wave_fill(d, W, H, H - 90, 14, NAVY2, period=420)
    wave_fill(d, W, H, H - 52, 10, (40, 96, 150), period=360, phase=1.3)
    logo(d, 60, 50, 90)
    d.text((64, 210), card["title"], font=font(FONT_BLACK, 92), fill=WHITE)
    d.text((68, 330), card["date"], font=font(FONT_BOLD, 50), fill=GLOW)
    y = 440
    for i, (name, val) in enumerate(card["rows"][:5]):
        d.rounded_rectangle([60, y, W - 60, y + 150], radius=18, fill=(255, 255, 255))
        d.ellipse([84, y + 40, 154, y + 110], fill=RED if i < 3 else NAVY2)
        d.text((119, y + 75), str(i + 1), font=font(FONT_BLACK, 40), fill=WHITE, anchor="mm")
        nf = font(FONT_BLACK, 44)
        nm = name
        while d.textlength(nm, font=nf) > W - 260 and len(nm) > 4:
            nm = nm[:-1]
        d.text((180, y + 22), nm if nm == name else nm + "…", font=nf, fill=NAVY)
        d.text((182, y + 86), val, font=font(FONT_BOLD, 36), fill=(88, 107, 123))
        y += 170
    d.text((64, H - 190), card["note"], font=font(FONT_BOLD, 34), fill=MUTED)
    d.text((64, H - 140), "tsuredoki-kansai（プロフィールのリンクから）", font=font(FONT_REG, 28), fill=MUTED)
    img.save(path, "JPEG", quality=90)


# ---- 投稿 ----
def http(method, url, data=None, headers=None):
    body = urllib.parse.urlencode(data).encode() if isinstance(data, dict) else data
    req = urllib.request.Request(url, data=body, method=method, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code} {e.read()[:300]!r}")


def post_threads(text):
    uid, token = os.environ.get("THREADS_USER_ID"), os.environ.get("THREADS_TOKEN")
    if not uid or not token:
        return "skip（キー未設定）"
    c = http("POST", f"https://graph.threads.net/v1.0/{uid}/threads", {"media_type": "TEXT", "text": text, "access_token": token})
    time.sleep(5)
    r = http("POST", f"https://graph.threads.net/v1.0/{uid}/threads_publish", {"creation_id": c["id"], "access_token": token})
    return f"ok {r.get('id')}"


def post_instagram(caption, image_url):
    uid, token = os.environ.get("IG_USER_ID"), os.environ.get("IG_TOKEN")
    if not uid or not token:
        return "skip（キー未設定）"
    c = http("POST", f"https://graph.facebook.com/v21.0/{uid}/media", {"image_url": image_url, "caption": caption, "access_token": token})
    for _ in range(20):
        st = http("GET", f"https://graph.facebook.com/v21.0/{c['id']}?fields=status_code&access_token={token}")
        if st.get("status_code") == "FINISHED":
            break
        time.sleep(5)
    r = http("POST", f"https://graph.facebook.com/v21.0/{uid}/media_publish", {"creation_id": c["id"], "access_token": token})
    return f"ok {r.get('id')}"


def oauth1_header(method, url, ck, cs, at, ats):
    q = lambda s: urllib.parse.quote(str(s), safe="~")
    p = {
        "oauth_consumer_key": ck,
        "oauth_nonce": uuid.uuid4().hex,
        "oauth_signature_method": "HMAC-SHA1",
        "oauth_timestamp": str(int(time.time())),
        "oauth_token": at,
        "oauth_version": "1.0",
    }
    base = "&".join([method, q(url), q("&".join(f"{q(k)}={q(v)}" for k, v in sorted(p.items())))])
    key = f"{q(cs)}&{q(ats)}".encode()
    p["oauth_signature"] = base64.b64encode(hmac.new(key, base.encode(), hashlib.sha1).digest()).decode()
    return "OAuth " + ", ".join(f'{q(k)}="{q(v)}"' for k, v in sorted(p.items()))


def post_x(text):
    keys = [os.environ.get(k) for k in ("X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_SECRET")]
    if not all(keys):
        return "skip（キー未設定）"
    url = "https://api.x.com/2/tweets"
    h = {"Authorization": oauth1_header("POST", url, *keys), "Content-Type": "application/json"}
    r = http("POST", url, json.dumps({"text": text}).encode(), h)
    return f"ok {r.get('data', {}).get('id')}"


def main():
    cmd = sys.argv[1]
    if cmd == "compose":
        mode, out = sys.argv[2], sys.argv[3]
        os.makedirs(out, exist_ok=True)
        data = get_json(f"{SITE}/sns/today.json")
        today = datetime.now(JST).strftime("%Y-%m-%d")
        post = {"morning": compose_morning, "evening": compose_evening, "weekend": compose_weekend}[mode](data, today)
        if not post:
            print("::notice::[sns] 投稿する内容がありません")
            return
        post["mode"] = mode
        post["image"] = f"{mode}-{today}.jpg"
        render_card(post["card"], os.path.join(out, post["image"]))
        json.dump(post, open(os.path.join(out, "post.json"), "w"), ensure_ascii=False, indent=1)
        with open(os.path.join(out, "draft.md"), "w") as f:
            f.write(f"# {mode} {today}\n\n## X\n{post['x']}\n\n## Threads\n{post['threads']}\n\n## Instagram\n{post['ig']}\n")
        print(open(os.path.join(out, "draft.md")).read())
    elif cmd == "publish":
        out, image_url = sys.argv[2], sys.argv[3]
        p = os.path.join(out, "post.json")
        if not os.path.exists(p):
            return
        post = json.load(open(p))
        targets = [("Threads", lambda: post_threads(post["threads"])), ("X", lambda: post_x(post["x"]))]
        if post["mode"] in ("morning", "weekend"):
            targets.append(("Instagram", lambda: post_instagram(post["ig"], image_url)))
        for name, fn in targets:
            try:
                print(f"::notice::[sns] {name}: {fn()}")
            except Exception as e:
                print(f"::warning::[sns] {name}: 失敗 {e}")


if __name__ == "__main__":
    main()
