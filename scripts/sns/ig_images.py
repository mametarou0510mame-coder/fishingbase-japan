# Instagram の画像投稿（カルーセル＝スワイプで見る複数枚）。1日2回。
#   6:00  今アツい釣り場（最近の釣果が多い釣り場と、今日のねらい目）
#   23:00 釣り方（ガイド）・釣りの豆知識・サイトの機能紹介 を順番に
# 使い方:
#   python scripts/sns/ig_images.py make <morning|night> <outdir>   … 画像とキャプションを作る
#   python scripts/sns/ig_images.py publish <outdir> <画像のURLの頭>  … Instagram に投稿する
import json, os, sys, time
from datetime import datetime, timedelta, timezone

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(__file__))
import discuss  # noqa: E402
from draw import FONT_BLACK, FONT_BOLD, FONT_REG, GLOW, MUTED, NAVY, NAVY2, RED, TEAL, WHITE, font, logo, wave_fill  # noqa: E402
from video_post import SITE, clean, http, site_lead  # noqa: E402

JST = timezone(timedelta(hours=9))
LOG = "data/sns/ig-images.json"
W, H = 1080, 1350
INK = (20, 40, 64)
SUB = (88, 107, 123)
PAPER = (246, 249, 252)
TAGS = "#関西釣り #釣り好きな人と繋がりたい #堤防釣り #釣り初心者 #海釣り #ツレドキ関西"
_f = {}


def F(p, s):
    if (p, s) not in _f:
        _f[(p, s)] = font(p, s)
    return _f[(p, s)]


def wrap(d, text, f, maxw):
    out, cur = [], ""
    for ch in text:
        if d.textlength(cur + ch, font=f) > maxw and cur:
            # 句読点は行頭に来ないように
            if ch in "、。）」』！？":
                cur += ch
                continue
            out.append(cur)
            cur = ch
        else:
            cur += ch
    if cur:
        out.append(cur)
    return out


def now():
    return datetime.now(JST)


def md(date):
    d = datetime.strptime(date, "%Y-%m-%d")
    return f"{d.month}/{d.day}（{'月火水木金土日'[d.weekday()]}）"


# ---------- 画像の部品 ----------
def cover(path, tag, title, sub, page_hint=True):
    img = Image.new("RGB", (W, H), NAVY)
    d = ImageDraw.Draw(img)
    wave_fill(d, W, H, H - 260, 22, NAVY2, period=460)
    wave_fill(d, W, H, H - 190, 16, (40, 96, 150), period=380, phase=1.2)
    wave_fill(d, W, H, H - 120, 12, (58, 120, 176), period=320, phase=2.4)
    logo(d, 70, 70, 96)
    ft = F(FONT_BOLD, 40)
    tw = d.textlength(tag, font=ft)
    d.rounded_rectangle([70, 250, 70 + tw + 56, 318], radius=34, fill=RED)
    d.text((98, 258), tag, font=ft, fill=WHITE)
    y = 380
    for size in (110, 96, 84, 72):
        fb = F(FONT_BLACK, size)
        lines = wrap(d, title, fb, W - 140)
        if len(lines) <= 3:
            break
    for ln in lines:
        d.text((70, y), ln, font=fb, fill=WHITE)
        y += int(size * 1.22)
    y += 20
    fs = F(FONT_BOLD, 46)
    for ln in wrap(d, sub, fs, W - 140)[:3]:
        d.text((72, y), ln, font=fs, fill=GLOW)
        y += 62
    if page_hint:
        fh = F(FONT_BOLD, 40)
        t = "スワイプして見る →"
        d.text((W - 70 - d.textlength(t, font=fh), H - 330), t, font=fh, fill=WHITE)
    img.save(path, "JPEG", quality=90)


def card(path, no, heading, draw_body):
    img = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 170], fill=NAVY)
    logo(d, 56, 40, 70)
    if no:
        fn = F(FONT_BLACK, 40)
        d.ellipse([W - 130, 52, W - 60, 122], fill=RED)
        d.text((W - 95, 87), str(no), font=fn, fill=WHITE, anchor="mm")
    fh = F(FONT_BLACK, 66)
    lines = wrap(d, heading, fh, W - 120)
    y = 220
    for ln in lines[:2]:
        d.text((60, y), ln, font=fh, fill=INK)
        y += 84
    d.line([(60, y + 6), (60 + min(W - 120, d.textlength(lines[0], font=fh)), y + 6)], fill=RED, width=8)
    draw_body(d, y + 50)
    d.text((60, H - 70), "ツレドキ関西｜プロフィールのリンクから", font=F(FONT_REG, 30), fill=SUB)
    img.save(path, "JPEG", quality=90)


def rows_body(rows, big=46, small=34):
    """[(太字, 補足)] を縦に並べる"""
    def body(d, y):
        for i, (a, b) in enumerate(rows):
            fa, fb = F(FONT_BOLD, big), F(FONT_REG, small)
            la = wrap(d, a, fa, W - 220)[:2]
            lb = wrap(d, b, fb, W - 220)[:3] if b else []
            h = 40 + len(la) * (big + 12) + len(lb) * (small + 10)
            if y + h > H - 110:
                break
            d.rounded_rectangle([60, y, W - 60, y + h], radius=22, fill=WHITE, outline=(214, 226, 236), width=3)
            d.ellipse([84, y + 24, 140, y + 80], fill=TEAL if i % 2 else NAVY2)
            d.text((112, y + 52), str(i + 1), font=F(FONT_BLACK, 32), fill=WHITE, anchor="mm")
            yy = y + 20
            for ln in la:
                d.text((164, yy), ln, font=fa, fill=INK)
                yy += big + 12
            for ln in lb:
                d.text((166, yy), ln, font=fb, fill=SUB)
                yy += small + 10
            y += h + 22
    return body


def text_body(paras, size=44):
    def body(d, y):
        f = F(FONT_BOLD, size)
        for p in paras:
            for ln in wrap(d, p, f, W - 140):
                if y > H - 160:
                    return y
                d.text((70, y), ln, font=f, fill=INK)
                y += int(size * 1.55)
            y += 30
        return y
    return body


def ask_card(path, q):
    question, options = q
    img = Image.new("RGB", (W, H), NAVY)
    d = ImageDraw.Draw(img)
    wave_fill(d, W, H, H - 140, 14, NAVY2, period=420)
    logo(d, 60, 50, 80)
    d.text((60, 200), "コメントで教えて！", font=F(FONT_BLACK, 80), fill=GLOW)
    fq = F(FONT_BLACK, 60)
    lines = wrap(d, question, fq, W - 200)
    bh = 60 + 80 * len(lines)
    d.rounded_rectangle([60, 330, W - 60, 330 + bh], radius=40, fill=WHITE)
    d.polygon([(140, 330 + bh), (210, 330 + bh), (130, 330 + bh + 56)], fill=WHITE)
    for j, ln in enumerate(lines):
        d.text((W / 2, 362 + j * 80), ln, font=fq, fill=INK, anchor="ma")
    y = 330 + bh + 100
    fo = F(FONT_BOLD, 50)
    for i, o in enumerate(options[:4]):
        d.rounded_rectangle([80, y, W - 80, y + 110], radius=55, fill=NAVY2, outline=TEAL, width=4)
        d.ellipse([100, y + 15, 180, y + 95], fill=RED)
        d.text((140, y + 55), str(i + 1), font=F(FONT_BLACK, 48), fill=WHITE, anchor="mm")
        d.text((210, y + 26), wrap(d, o, fo, W - 330)[0], font=fo, fill=WHITE)
        y += 136
    d.text((W / 2, min(H - 200, y + 30)), "番号＋ひとことでコメントしてね", font=F(FONT_BOLD, 44), fill=WHITE, anchor="ma")
    img.save(path, "JPEG", quality=90)


# ---------- 中身 ----------
def load_log():
    try:
        return json.load(open(LOG, encoding="utf-8"))
    except FileNotFoundError:
        return {"posts": []}


def make_hot(out, day, notes=None):
    data = json.load(open(os.environ["TODAY_JSON"])) if os.environ.get("TODAY_JSON") else json.load(urllib_get(f"{SITE}/sns/today.json"))
    catches = data.get("catches", {})
    score = {}
    for date, items in catches.items():
        for it in items:
            s = score.setdefault(it["spot"], {"name": it["name"], "n": 0, "fish": {}})
            s["n"] += 1
            f = s["fish"].setdefault(it["species"].split("（")[0], {"n": 0, "max": 0, "sum": 0})
            f["n"] += 1
            f["sum"] += it.get("count") or 0
            f["max"] = max(f["max"], it.get("sizeCm") or 0)
    jiai = {s["slug"]: s for s in data.get("spots", [])}
    date = next((x["date"] for x in data.get("dates", []) if x["date"] == day), data["dates"][0]["date"])
    tide = next((x["tideName"] for x in data["dates"] if x["date"] == date), "")

    def win(slug):
        s = jiai.get(slug)
        ws = (s or {}).get("days", {}).get(date, {}).get("windows", [])
        return f"{ws[0]['grade']}{ws[0]['from']}〜{ws[0]['to']}時" if ws else ""

    top = sorted(score.items(), key=lambda kv: (-kv[1]["n"], -len(kv[1]["fish"])))[:4]
    if not top:
        raise SystemExit("釣果データがありません")
    files = []
    cover(f"{out}/1.jpg", f"今アツい釣り場・{md(date)}", "今アツい関西の釣り場", f"最近の釣果が多い{len(top)}か所と、今日のねらい目（{tide}）")
    files.append("1.jpg")
    for i, (slug, s) in enumerate(top, 1):
        fish = sorted(s["fish"].items(), key=lambda kv: -kv[1]["n"])[:5]
        rows = [(f"{k}" + (f"　最大{v['max']:.0f}cm" if v["max"] else ""), (f"合計{v['sum']}匹・" if v["sum"] else "") + f"釣果の発表{v['n']}件") for k, v in fish]
        w = win(slug)
        area = (jiai.get(slug) or {}).get("area", "")

        def body(d, y, rows=rows, w=w, area=area):
            if area or w:
                d.text((64, y), f"{area}　{'今日のねらい目 ' + w if w else ''}".strip(), font=F(FONT_BOLD, 40), fill=RED)
                y += 80
            rows_body(rows)(d, y)

        card(f"{out}/{i + 1}.jpg", i, s["name"], body)
        files.append(f"{i + 1}.jpg")
    if notes:  # 運営の現場情報も1枚入れる
        card(f"{out}/{len(files) + 1}.jpg", len(files), f"運営の現場情報：{'・'.join(notes['species'])}", rows_body(
            [(f"{x['name']}", x["note"]) for x in notes["spots"]] + [(notes["methods"][0]["title"], "")], 38, 28))
        files.append(f"{len(files) + 1}.jpg")
    q = discuss.spots([s["name"] for _, s in top])
    ask_card(f"{out}/{len(files) + 1}.jpg", q)
    files.append(f"{len(files) + 1}.jpg")
    cap = [f"【今アツい関西の釣り場】{md(date)} {tide}", ""]
    for i, (slug, s) in enumerate(top, 1):
        fish = "・".join(k for k, _ in sorted(s["fish"].items(), key=lambda kv: -kv[1]["n"])[:4])
        cap.append(f"{'①②③④'[i - 1]} {s['name']}：{fish}" + (f"（ねらい目 {win(slug)}）" if win(slug) else ""))
    cap += ["", "各施設・渡船・釣具店が公開した最近の釣果から、件数の多い釣り場を選びました。ねらい目は潮・まずめ・営業時間・風の予報から計算した目安です。"]
    if notes:
        cap += ["", f"▼運営の現場情報：{'・'.join(notes['species'])}が{'・'.join(x['name'] for x in notes['spots'])}で好調。{notes['methods'][0]['title']}。"]
    cap += site_lead("/", "釣り場ごとの最近の釣果・タイドグラフ・天気")
    cap += discuss.caption(q) + ["", TAGS + " #釣果情報 #大阪湾"]
    return files, "\n".join(cap), f"hot-{date}"


def load_notes(day):
    try:
        n = json.load(open("content/hot-notes.json", encoding="utf-8"))
    except FileNotFoundError:
        return None
    return n if n.get("until", "") >= day else None


def notes_cards(out, n, start_no):
    """運営の現場情報のカード（釣れている場所・釣り方）"""
    card(f"{out}/n1.jpg", start_no, "釣れている場所（運営の現場情報）", rows_body([(f"{x['name']}（{x['area']}）", x["note"]) for x in n["spots"]], 40, 28))
    card(f"{out}/n2.jpg", start_no + 1, "釣れている釣り方", rows_body([(m["title"], m["body"]) for m in n["methods"]], 40, 30))
    return ["n1.jpg", "n2.jpg"]


def make_notes_feature(out, n, day):
    """運営の現場情報の特集（初回だけ）"""
    cover(f"{out}/1.jpg", f"今アツい・{md(day)}", n["title"], n["sub"])
    files = ["1.jpg"] + notes_cards(out, n, 1)
    card(f"{out}/t.jpg", 3, "道具の目安", rows_body([(a, b) for a, b in n["tackle"]], 42, 30))
    card(f"{out}/s.jpg", 4, "安全とマナー", text_body([
        "ライフジャケットを必ず着る。渡船は桜マーク・CSマーク付き。",
        "投げる前に、後ろと左右の人を確認。混雑時は投げる方向をそろえる。",
        "釣り禁止・立入禁止の場所には入らない。現地の表示と管理者の指示に従う。",
        "ゴミ・釣り糸・針は持ち帰る。",
    ], 40))
    files += ["t.jpg", "s.jpg"]
    q = (n["ask"][0], n["ask"][1])
    ask_card(f"{out}/q.jpg", q)
    files.append("q.jpg")
    cap = [f"【{n['title']}】{'・'.join(n['species'])}", "", n["sub"], "", "▼釣れている場所"]
    cap += [f"・{x['name']}（{x['area']}）" for x in n["spots"]]
    cap += ["", "▼釣り方"] + [f"・{m['title']}：{m['body']}" for m in n["methods"]]
    cap += ["", "▼注意", "ライフジャケットを必ず着用し、投げる前に周りを確認しましょう。釣り禁止・立入禁止の場所には入らず、現地の表示に従ってください。"]
    cap += site_lead(n.get("guide", "/"), "ショアジギングのやり方・道具リスト・釣り場の潮と天気")
    cap += discuss.caption(q) + ["", TAGS + " #ショアジギング #サゴシ #サワラ #青物 #ブリ #ハマチ"]
    return files, "\n".join(cap), n["key"]


def make_guide(out, log):
    import glob
    done = {p["key"] for p in log["posts"]}
    gs = sorted((json.load(open(f, encoding="utf-8")) for f in glob.glob("content/guides/*.json") if not os.path.basename(f).startswith("_")), key=lambda g: g["no"])
    g = next((x for x in gs if f"guide-{x['slug']}" not in done), gs[len(done) % len(gs)])
    files = []
    cover(f"{out}/1.jpg", f"釣り方ガイド No.{g['no']}", g["title"], g["sub"])
    files.append("1.jpg")
    card(f"{out}/2.jpg", 1, "どんな釣り？", text_body([g["summary"], "釣れる魚：" + "、".join(g["targets"]), "季節：" + g["season"]], 42))
    card(f"{out}/3.jpg", 2, "手順", rows_body([(s["title"], s["body"]) for s in g["steps"][:5]], 42, 30))
    card(f"{out}/4.jpg", 3, g["patterns"]["title"], rows_body([(f"{r['when']} → {r['do']}", r["why"]) for r in g["patterns"]["rows"][:5]], 38, 30))
    t = g["tackle"][0]
    card(f"{out}/5.jpg", 4, f"道具（{t['tier']}・{t['budget']}）", rows_body([(i["name"], i["spec"]) for i in t["items"][:6]], 42, 32))
    files += ["2.jpg", "3.jpg", "4.jpg", "5.jpg"]
    q = discuss.GUIDE.get(g["slug"], ("この釣り、やったことある？", ["よくやる", "やってみたい", "はじめて知った"]))
    ask_card(f"{out}/6.jpg", q)
    files.append("6.jpg")
    cap = [f"【釣り方ガイド No.{g['no']}】{g['title']}（{g['sub']}）", "", g["summary"], "", "▼手順"]
    cap += [f"{'①②③④⑤'[i]} {s['title']}" for i, s in enumerate(g["steps"][:5])]
    cap += site_lead(f"/guide/{g['slug']}/", "動画・道具リスト（初級・中級・上級）・向いている関西の釣り場")
    cap += discuss.caption(q) + ["", TAGS + " #釣り方"]
    return files, "\n".join(cap), f"guide-{g['slug']}"


def make_trivia(out, log):
    items = json.load(open("content/trivia.json", encoding="utf-8"))
    done = {p["key"] for p in log["posts"]}
    t = next((x for x in items if f"trivia-{x['id']}" not in done), items[len(done) % len(items)])
    cover(f"{out}/1.jpg", f"釣りの豆知識 No.{t['no']}", "Q. " + t["title"], "答えはスワイプ →", page_hint=False)
    def body(d, y):
        y = text_body(t["lines"], 44)(d, y)
        rows_body([(p, "") for p in t["points"]], 44)(d, y + 10)

    card(f"{out}/2.jpg", 0, "A. " + t["title"].rstrip("？?"), body)
    q = discuss.trivia(t)
    ask_card(f"{out}/3.jpg", q)
    cap = [f"【釣りの豆知識】{t['title']}", ""] + t["lines"] + [""] + [f"・{p}" for p in t["points"]]
    cap += site_lead(t.get("link", "/"), "関連する釣り方ガイド・今日の釣れる時間")
    cap += discuss.caption(q) + ["", TAGS + " #釣りの豆知識"]
    return ["1.jpg", "2.jpg", "3.jpg"], "\n".join(cap), f"trivia-{t['id']}"


def image_card(path, no, heading, img_path, note=""):
    """見本の画像（サイトの画面など）を大きく見せるカード"""
    def body(d, y):
        im = Image.open(img_path).convert("RGB")
        im.thumbnail((W - 120, H - y - (230 if note else 140)))
        d._image.paste(im, ((W - im.width) // 2, y))
        yy = y + im.height + 30
        f = F(FONT_BOLD, 40)
        for ln in wrap(d, note, f, W - 140)[:3]:
            d.text((70, yy), ln, font=f, fill=INK)
            yy += 58
    card(path, no, heading, body)


# サイトの機能紹介（23時の枠で、釣り方・豆知識と順番に）
FEATURES = [
    {
        "key": "feature-overview", "tag": "ツレドキ関西でできること", "title": "釣りがもっと楽しくなる6つの機能",
        "sub": "関西の釣り人のために作った、無料で使える機能をまとめました",
        "cards": [
            ("rows", "6つの機能", [
                ("今日・週末のねらい目ランキング", "潮・まずめ・営業時間・風から、釣れそうな時間を計算"),
                ("最近の釣果を毎日まとめて表示", "施設・渡船・釣具店が公開した釣果を自動で集計"),
                ("デジタル魚拓", "釣った魚の写真から、墨・写真の魚拓を作れる"),
                ("マイ水族館", "釣った魚が、あなたの水族館で泳ぎ出す"),
                ("地図から釣り場を探す", "関西の海釣り施設・沖堤防・海上釣り堀"),
                ("はじめての1回プラン", "場所・道具・時間・持ち物を1ページで"),
            ]),
            ("image", "デジタル魚拓", "content/promo/gyotaku-ink.jpg", "写真を取り込むだけで、和紙に写したような魚拓に。全長の目盛りと日付入り。"),
            ("image", "マイ水族館", "content/promo/aquarium.jpg", "釣った魚がリアルに泳ぐ、自分だけの水族館。"),
        ],
        "ask": ("いちばん使ってみたい機能は？", ["ねらい目ランキング", "デジタル魚拓", "マイ水族館", "地図・はじめてプラン"]),
        "caption": ["【ツレドキ関西でできること】", "", "関西の釣り人のための無料サイトです。",
                    "・今日・週末のねらい目ランキング（潮・まずめ・営業時間・風から計算）", "・最近の釣果を毎日まとめて表示",
                    "・デジタル魚拓（写真から墨・写真の魚拓）", "・マイ水族館（釣った魚が泳ぐ）", "・地図から釣り場を探す", "・はじめての1回プラン"],
        "path": "/",
    },
    {
        "key": "feature-gyotaku", "tag": "新機能", "title": "スマホで作れるデジタル魚拓",
        "sub": "釣った魚の写真をタップするだけ。墨の魚拓と写真の魚拓の2種類",
        "cards": [
            ("image", "① 写真の魚をタップ", "content/promo/cutout.jpg", "魚の体をタップすると、自動で魚だけを選びます（手などは「除く」でタップ）。"),
            ("image", "② 墨の魚拓", "content/promo/gyotaku-ink.jpg", "うろこやひれの凹凸を墨の濃淡に。頭が左の、昔ながらの魚拓です。"),
            ("image", "③ 写真の魚拓", "content/promo/gyotaku-photo.jpg", "全長の目盛り・日付・釣り場・名前入り。画像で保存してSNSに共有できます。"),
        ],
        "ask": ("魚拓、どっちが好き？", ["墨の魚拓", "写真の魚拓", "両方ほしい"]),
        "caption": ["【新機能】スマホで作れるデジタル魚拓", "", "釣った魚の写真を取り込んで、魚をタップするだけ。",
                    "・墨の魚拓：うろこやひれの凹凸を墨の濃淡で", "・写真の魚拓：全長の目盛り・日付・釣り場入り",
                    "写真はスマホの中だけで処理し、どこにも送信しません。"],
        "path": "/aquarium/",
    },
    {
        "key": "feature-aquarium", "tag": "新機能", "title": "釣った魚が泳ぐ「マイ水族館」",
        "sub": "釣果を登録すると、あなたの水族館に魚が増えていく",
        "cards": [
            ("image", "釣った魚が泳ぎ出す", "content/promo/aquarium.jpg", "アジは群れで、カレイは底で、タチウオは立ち泳ぎ。魚ごとに泳ぎ方が違います。"),
            ("rows", "できること", [
                ("写真の魚をそのまま泳がせる", "タップで切り抜いた本物の魚が泳ぎます"),
                ("リリース（海に返す）", "記録は図鑑に残ります"),
                ("図鑑とバッジ", "釣った種類を集めよう"),
                ("アバター", "自分だけの釣り人に着せ替え"),
            ]),
        ],
        "ask": ("水族館で最初に泳がせたい魚は？", ["アジ", "チヌ・マダイ", "青物", "イカ・タコ"]),
        "caption": ["【新機能】釣った魚が泳ぐ「マイ水族館」", "", "釣果を登録すると、あなただけの水族館に魚が増えていきます。",
                    "・写真の魚をタップで切り抜いて、そのまま泳がせる", "・リリースで海に返す（記録は図鑑に残る）", "・図鑑・バッジ・アバター"],
        "path": "/aquarium/",
    },
    {
        "key": "feature-ranking", "tag": "ツレドキ関西の使い方", "title": "今日・週末どこが釣れる？ねらい目ランキング",
        "sub": "関西の釣り場の「釣れそうな時間」を、毎日自動で計算",
        "cards": [
            ("rows", "ねらい目の計算に使っているもの", [
                ("潮の動き", "気象庁の潮位表から、潮がよく動く時間"),
                ("朝夕のまずめ", "日の出・日の入りの前後"),
                ("営業時間", "施設が開いている時間だけ"),
                ("風の予報", "気象庁の予報で、強風の時間は下げる"),
            ]),
            ("rows", "こんな時に", [
                ("今日行くならどこ？", "トップページのランキングで比べる"),
                ("週末の計画", "「この週末」タブで土日を確認"),
                ("お気に入りの釣り場", "★を押すとランキングの上に表示"),
            ]),
        ],
        "ask": ("釣りに行く時、いちばん気にするのは？", ["潮", "天気・風", "最近の釣果", "混み具合"]),
        "caption": ["【使い方】今日・週末のねらい目ランキング", "", "潮の動き・朝夕のまずめ・営業時間・風の予報から、関西の釣り場の釣れそうな時間を毎日計算しています。",
                    "トップページで、今日・明日・あさって・この週末を切り替えて比べられます。"],
        "path": "/",
    },
]


def make_feature(out, log):
    done = {p["key"] for p in log["posts"]}
    ft = next((x for x in FEATURES if x["key"] not in done), None)
    if not ft:
        return None
    cover(f"{out}/1.jpg", ft["tag"], ft["title"], ft["sub"])
    files = ["1.jpg"]
    for i, c in enumerate(ft["cards"], 1):
        path = f"{out}/{i + 1}.jpg"
        if c[0] == "rows":
            card(path, i, c[1], rows_body(c[2], 42, 30) if len(c[2]) <= 5 else rows_body(c[2], 36, 26))
        else:
            image_card(path, i, c[1], c[2], c[3])
        files.append(f"{i + 1}.jpg")
    ask_card(f"{out}/{len(files) + 1}.jpg", ft["ask"])
    files.append(f"{len(files) + 1}.jpg")
    cap = list(ft["caption"])
    cap += site_lead(ft["path"], "ツレドキ関西")
    cap += discuss.caption(ft["ask"]) + ["", TAGS + " #釣りアプリ #魚拓"]
    return files, "\n".join(cap), ft["key"]


def urllib_get(url):
    import urllib.request
    return urllib.request.urlopen(url, timeout=60)


def make(slot, out):
    os.makedirs(out, exist_ok=True)
    log = load_log()
    day = now()
    if day.hour >= 20:
        day = day + timedelta(days=1)
    ds = day.strftime("%Y-%m-%d")
    if slot == "morning":
        notes = load_notes(ds)
        if notes and notes["key"] not in {p["key"] for p in log["posts"]}:
            files, cap, key = make_notes_feature(out, notes, ds)  # 運営の現場情報の特集（初回）
        else:
            files, cap, key = make_hot(out, ds, notes)
    else:
                # 3日ごとに「機能紹介」を入れる（紹介し終わったら、釣り方と豆知識を1日おきに）
        k = day.toordinal() % 3
        res = make_feature(out, log) if k == 2 else None
        if not res:
            res = make_guide(out, log) if k == 0 or (k == 2 and day.toordinal() % 2 == 0) else make_trivia(out, log)
        files, cap, key = res
    stamp = f"{slot}-{ds}"
    json.dump({"key": key, "stamp": stamp, "files": files, "caption": cap}, open(f"{out}/post.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(cap)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8").write(f"## {key}\n```\n{cap}\n```\n")


def publish(out, base):
    p = json.load(open(f"{out}/post.json", encoding="utf-8"))
    uid, tok = clean(os.environ.get("IG_USER_ID")), clean(os.environ.get("IG_TOKEN"))
    if not uid or not tok:
        print("::warning::IG_USER_ID / IG_TOKEN が未設定です")
        return
    api = "https://graph.facebook.com/v21.0"
    kids = []
    for f in p["files"]:
        c = http("POST", f"{api}/{uid}/media", {"image_url": f"{base}/{p['stamp']}-{f}", "is_carousel_item": "true", "access_token": tok})
        kids.append(c["id"])
    parent = http("POST", f"{api}/{uid}/media", {"media_type": "CAROUSEL", "children": ",".join(kids), "caption": discuss.with_yt(p["caption"]), "access_token": tok})
    for _ in range(30):
        st = http("GET", f"{api}/{parent['id']}?fields=status_code&access_token={tok}")
        if st.get("status_code") == "FINISHED":
            break
        if st.get("status_code") in ("ERROR", "EXPIRED"):
            raise RuntimeError(f"Instagram の処理に失敗: {st}")
        time.sleep(5)
    r = http("POST", f"{api}/{uid}/media_publish", {"creation_id": parent["id"], "access_token": tok})
    print(f"::notice::Instagram 画像投稿 ok {r.get('id')}（{p['key']}）")
    log = load_log()
    log["posts"].append({"key": p["key"], "id": r.get("id"), "at": now().isoformat(timespec="minutes")})
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    json.dump(log, open(LOG, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    if sys.argv[1] == "make":
        make(sys.argv[2], sys.argv[3])
    else:
        publish(sys.argv[2], sys.argv[3])
