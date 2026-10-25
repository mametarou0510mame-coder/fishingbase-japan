# 長尺動画 第2弾（10本）の構成を作る。釣り方ガイドを使った第1弾と重ならないよう、
# サイトの釣り場データ・公開釣果・潮汐・天気のデータと、確かめた知識で組み立てる。
#   python scripts/video/make-long2.py            → content/long/<slug>.json
# 釣り場データは data/site-export.json（lib/spots.ts などを書き出したもの）を使う。
import json
import math
import os
import re
import sys
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(__file__))
import long_data  # noqa: E402

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "sns"))
import discuss  # noqa: E402

OUT = "content/long"
D = json.load(open("data/site-export.json", encoding="utf-8"))
SP = {s["slug"]: s for s in D["spots"]}
AREA = {a["slug"]: a for a in D["areas"]}
COORDS = json.load(open("lib/spotCoords.json", encoding="utf-8"))
CATCH = json.load(open("public/data/catches.json", encoding="utf-8"))
TODAY = date(2026, 10, 25)

NG = {"no-chum": "撒き餌", "no-lure": "ルアー", "no-cast": "投げ釣り"}
TYPE_SHORT = {"海釣り施設": "施設", "公園の釣り場": "公園", "沖堤防（渡船）": "渡船", "一般の釣り場": "一般", "海上釣り堀": "釣り堀"}
TYPE_ORDER = ["海釣り施設", "公園の釣り場", "沖堤防（渡船）", "一般の釣り場", "海上釣り堀"]
SPRITE = {"青物": "ハマチ・ブリ", "ハマチ・ブリ": "ハマチ・ブリ", "アジ・サバ・イワシ": "アジ", "チヌ": "チヌ（クロダイ）", "ガシラ": "ガシラ（カサゴ）", "グレ": "グレ（メジナ）",
          "アコウ": "アコウ（キジハタ）", "サゴシ": "サゴシ（サワラ）", "シオ": "シオ（カンパチ）"}


def strip_paren(t):
    return re.sub(r"（[^）]*）", "", t or "").strip()


def first_sentences(t, n=2):
    parts = [p for p in re.split(r"(?<=。)", t or "") if p.strip()]
    return "".join(parts[:n])


def short(t, n=30):
    t = strip_paren(t)
    t = re.split(r"[。]", t)[0]
    return t if len(t) <= n else t[: n - 1] + "…"


def hours_short(s):
    o, c = (s.get("openHourByMonth") or [None] * 12)[10], (s.get("closeHourByMonth") or [None] * 12)[10]
    if o is not None and c is not None:
        return f"{o}:00〜{c}:00（11月）"
    if s.get("hours"):
        return short(s["hours"], 28)
    return "公式・現地で確認"


def fee_short(s):
    if not s.get("fees"):
        return ""
    f = s["fees"][0]
    v = strip_paren(f["value"])
    if not re.search(r"\d|無料", v):
        return "公式サイトで確認"
    lab = strip_paren(f["label"])
    if lab and lab not in ("釣り", "入場料", "料金") and len(lab) <= 8:
        return f"{lab} {v}"
    return v


def rentals_short(s):
    r = s.get("rentals") or ""
    if not r or "記載なし" in r or "確認" in r:
        return ""
    return short(r, 30)


def can_rent(s):
    r = s.get("rentals") or ""
    return bool(re.search(r"レンタル竿|貸竿|貸し竿|竿.*貸し出し|釣りセット.*貸し出し|エサ釣りセット|釣り具（ウキ", r)) and not re.search(r"貸し竿はなし|貸し出しはありません|貸し出しはなし|レンタルはありません", r)


def recent_fish(slug, days=60, n=5):
    since = (TODAY - timedelta(days=days)).isoformat()
    cnt = {}
    for r in CATCH["reports"]:
        if r["spot"] == slug and r["date"] >= since and "不明" not in r["species"]:
            k = strip_paren(r["species"])
            cnt[k] = cnt.get(k, 0) + 1
    return [k for k, _ in sorted(cnt.items(), key=lambda kv: -kv[1])[:n]]


def rule_line(s):
    rs = s.get("restrictions") or []
    ng = [NG[r] for r in rs if r in NG]
    out = []
    if ng:
        out.append("、".join(ng) + "は禁止です。")
    if "sakura-lifejacket" in rs:
        out.append("ライフジャケットは、桜マークかCSマーク付きのものが必要です。")
    elif "lifejacket-required" in rs:
        out.append("ライフジャケットの着用が必要です。")
    return "".join(out)


FEE_T = ["料金の目安は、{f}です。", "{f}で利用できます。", "利用料金は、{f}。"]
FISH_T = ["最近の釣果では、{a}などが報告されています。", "最近は、{a}の釣果が出ています。", "ここ最近の公開釣果には、{a}などが並びます。"]


def spot_lines(s, no=None):
    k = (no or 0) % 3
    lines = [first_sentences(s["intro"], 2)]
    rl = rule_line(s)
    if rl:
        lines.append(rl)
    fee = fee_short(s)
    if s["level"] == "full" and fee and re.search(r"\d|無料", fee) and "確認" not in fee:
        lines.append(FEE_T[k].format(f=fee.replace(" ", "、")))
    fish = recent_fish(s["slug"])
    if fish:
        lines.append(FISH_T[k].format(a="、".join(fish[:3])))
    note = next((n for n in s.get("notes", []) if 8 < len(n) < 70 and "もとづいて" not in n and "確認日" not in n), None)
    if note:
        lines.append(note)
    pk = s.get("parking") or ""
    if pk and "記載なし" not in pk and "確認" not in pk and len(pk) < 50:
        lines.append(f"駐車場は、{strip_paren(pk).rstrip('。')}。")
    if s["level"] == "basic":
        lines.append(["くわしいルールは、現地の掲示と公式の情報で確認してください。", "ルールは変わることがあるので、現地の掲示を優先しましょう。", "行く前に、公式の情報と現地の掲示を確かめておくと安心です。"][k])
    return lines


def spotcard(slug, no=None, total=None, pins=None, chapter=0):
    s = SP[slug]
    c = COORDS[slug]
    rows = [("時間", hours_short(s)), ("料金", fee_short(s)), ("貸出・売店", rentals_short(s)), ("駐車場", short(s.get("parking"), 26))]
    if sum(1 for _, v in rows if v and "確認" not in v) <= 2:
        rows.append(("特徴", short(first_sentences(s["intro"], 1), 64)))
    return {"type": "spotcard", "name": s["name"], "type_label": s["type"], "area": s["area"], "pin": {"lat": c["lat"], "lon": c["lon"]}, "pins": pins,
            "no": no, "total": total, "rows": rows, "ng": [NG[r] for r in (s.get("restrictions") or []) if r in NG], "fish": recent_fish(slug), "chapter": chapter,
            "lines": spot_lines(s, no)}


def fix_type(sc):
    # spotcard の釣り場の種類は "type" と名前がぶつかるので、描画の直前に入れ替える
    if sc["type"] == "spotcard":
        sc["type_label"], sc["typ"] = sc.get("type_label"), None
    return sc


def pins_of(slugs):
    return [{"lat": COORDS[x]["lat"], "lon": COORDS[x]["lon"]} for x in slugs]


def chap(no, title, items, chapter, line, sprites=None):
    return {"type": "chapter", "no": no, "title": title, "items": items, "chapter": chapter, "sprites": sprites, "lines": [line]}


def ask(slug, chapter):
    a = discuss.scene(discuss.LONG[slug])
    a["chapter"] = chapter
    return a


def end(lines, chapter):
    return {"type": "end", "lines": lines, "chapter": chapter}


# ---------------- エリア別の釣り場ガイド ----------------
def area_video(slug, title, thumb, thumb_sub, spots, hook, sprites, wrap_up):
    spots = [x for x in spots if x in SP]
    groups = [(t, [x for x in spots if SP[x]["type"] == t]) for t in TYPE_ORDER]
    groups = [(t, xs) for t, xs in groups if xs]
    chapters = ["はじめに", "エリアの全体像"] + [f"{t}（{len(xs)}か所）" for t, xs in groups] + ["ルールの比較", "まとめ"]
    sc = [
        {"type": "hook", "lines": hook, "chapter": 0},
        {"type": "cards", "heading": "この動画でわかること", "numbered": True, "items": chapters[1:-1], "chapter": 0,
         "lines": ["種類ごとに分けて紹介します。概要欄の目次から、気になる釣り場に飛べます。"]},
    ]
    n_fac = sum(1 for x in spots if SP[x]["type"] in ("海釣り施設", "海上釣り堀"))
    n_rent = sum(1 for x in spots if can_rent(SP[x]))
    sc.append({"type": "stat", "heading": "数字で見るこのエリア", "chapter": 1,
               "stats": [[str(len(spots)), "か所", "この動画で紹介する釣り場"], [str(n_fac), "か所", "料金を払って入る施設・釣り堀"], [str(n_rent), "か所", "竿を借りられる釣り場"]],
               "lines": [f"このエリアで紹介する釣り場は、{len(spots)}か所。そのうち、料金を払って入る海釣り施設や海上釣り堀が{n_fac}か所です。",
                         f"竿を借りられる所は{n_rent}か所。道具がなくても始められます。" if n_rent else "竿を借りられる所は少ないので、道具は自分で用意しましょう。"]})
    pins = [{"slug": x, "name": SP[x]["name"], "n": 1, "ntext": TYPE_SHORT[SP[x]["type"]], "lat": COORDS[x]["lat"], "lon": COORDS[x]["lon"]} for x in spots]
    sc.append({"type": "map", "label": "", "title1": "このエリアの", "title2": "釣り場マップ", "spots": pins, "note": "番号は、この動画で紹介する順番です", "chapter": 1,
               "lines": ["地図で場所を確認しましょう。番号は、このあと紹介する順番です。"] + [AREA[a]["intro"] for a in AREA if set(AREA[a]["spots"]) & set(spots)][:2]
               + ["海釣り施設、公園の釣り場、渡船で渡る沖堤防と、種類ごとに見ていきます。"]})
    allp = pins_of(spots)
    order = [x for _, xs in groups for x in xs]
    pins.sort(key=lambda p: order.index(p["slug"]))
    for ci, (t, xs) in enumerate(groups, 2):
        intro = {"海釣り施設": "まずは、海釣り施設です。柵やトイレがあり、料金を払って安心して釣りができる場所です。",
                 "公園の釣り場": "次は、公園の釣り場です。公園や護岸の一部で、釣りができるように開放されている場所です。",
                 "沖堤防（渡船）": "続いて、渡船で渡る沖堤防です。潮通しが良く大物が狙えますが、トイレや柵がない所が多いので、準備が大切です。",
                 "一般の釣り場": "続いて、港や埠頭などの一般の釣り場です。管理者がいない所が多いので、立入禁止の場所には入らず、ゴミは必ず持ち帰りましょう。",
                 "海上釣り堀": "最後は、海上釣り堀です。いけすの中のマダイや青物を狙う、少し特別な釣りです。"}[t]
        sc.append(chap(ci - 1, t, [SP[x]["name"] for x in xs][:3], ci, intro, sprites))
        for x in xs:
            sc.append(spotcard(x, order.index(x) + 1, len(order), allp, ci))
    # タイプ別のおすすめ
    easy = [SP[x]["name"].split("（")[0] for x in order if can_rent(SP[x])][:4]
    hard = [SP[x]["name"].split("（")[0] for x in order if SP[x]["type"] in ("沖堤防（渡船）",) or (SP[x]["type"] == "一般の釣り場")][:4]
    ci_rule = len(chapters) - 2
    if easy or hard:
        sc.append({"type": "compare", "heading": "どこから行く？ タイプ別のおすすめ", "cols": ["こんな人に"], "chapter": ci_rule,
                   "rows": ([[e, "初めて・家族連れ（竿を借りられる）"] for e in easy[:3]] + [[h, "慣れてきた人（道具は自分で用意）"] for h in hard[:3]])[:6],
                   "note": "竿を借りられるかは公式情報による。沖堤防・港はトイレや柵がない所が多い",
                   "lines": (["初めての人や家族連れには、竿を借りられる、" + "、".join(easy[:3]) + "がおすすめです。"] if easy else [])
                   + (["慣れてきたら、" + "、".join(hard[:3]) + "のような、沖堤防や港にも挑戦してみましょう。トイレや柵がない所が多いので、準備をしっかりと。"] if hard else [])})
    ferry = [x for x in order if SP[x]["type"] == "沖堤防（渡船）"]
    others = [x for x in order if SP[x]["type"] not in ("沖堤防（渡船）",)]
    if ferry and len(others) >= 2:
        opts = [SP[ferry[0]]["name"].split("（")[0], SP[others[0]]["name"].split("（")[0], SP[others[-1]]["name"].split("（")[0]]
        sc.append({"type": "quiz", "q": "このエリアで、渡船で渡る沖堤防はどこ？", "options": opts, "answer": 0, "chapter": ci_rule,
                   "lines": [f"ここでクイズです。このエリアで、渡船で渡る沖堤防はどこ？1、{opts[0]}。2、{opts[1]}。3、{opts[2]}。", "さあ、どれでしょう？", f"正解は、{opts[0]}です。渡船は天候で欠航することがあるので、出かける前に運航のお知らせを確認しましょう。"]})
    lj = [SP[x]["name"].split("（")[0] for x in order if set(SP[x].get("restrictions") or []) & {"sakura-lifejacket", "lifejacket-required"}]
    sc.append({"type": "cards", "heading": "行く前のチェック", "numbered": True, "chapter": ci_rule,
               "items": ["その日の営業時間・休みの日", "撒き餌・ルアー・投げ釣りのルール", "ライフジャケット（指定がある所も）", "風・波の予報と、いまの風", "駐車場・トイレの場所"],
               "lines": ["出かける前に、この5つをチェックしましょう。", "営業時間やルールは変わることがあるので、公式の情報で確認を。"]
               + ([f"{'、'.join(lj[:3])}などは、ライフジャケットの着用が決まっています。"] if lj else ["ライフジャケットは、どの釣り場でも着けるのが安心です。"])})
    # ルールの比較
    cols = ["撒き餌", "ルアー", "投げ釣り", "貸し竿"]
    rows = []
    for x in order:
        s = SP[x]
        rs = s.get("restrictions") or []
        rows.append([s["name"].split("（")[0][:14]] + ["×" if r in rs else "－" for r in ("no-chum", "no-lure", "no-cast")] + ["○" if can_rent(s) else "－"])
    ng_sp = [SP[x]["name"].split("（")[0] for x in order if any(r in (SP[x].get("restrictions") or []) for r in NG)]
    ci = len(chapters) - 2
    for k in range(0, len(rows), 7):
        part = rows[k:k + 7]
        sc.append({"type": "compare", "heading": "ルールの比較" + (f"（{k // 7 + 1}）" if len(rows) > 7 else ""), "cols": cols, "rows": part, "chapter": ci,
                   "note": "×＝公式情報で禁止　○＝貸し竿あり　－＝禁止の記載なし・不明（現地の掲示を優先してください）",
                   "lines": (["最後に、ルールを表で比べます。バツは、公式の情報で禁止されていることです。"] if k == 0 else ["続きです。"])
                   + ([f"撒き餌やルアーなどに制限があるのは、{'、'.join(ng_sp[:4])}{'など' if len(ng_sp) > 4 else ''}です。行く前に、必ず確認してください。"] if k == 0 and ng_sp else [])})
    # 最近の釣果（このエリア）
    since = (TODAY - timedelta(days=45)).isoformat()
    cnt = {}
    for r in CATCH["reports"]:
        if r["spot"] in spots and r["date"] >= since and "不明" not in r["species"]:
            k = strip_paren(r["species"])
            cnt[k] = cnt.get(k, 0) + 1
    if len(cnt) >= 3:
        top = sorted(cnt.items(), key=lambda kv: -kv[1])[:6]
        sc.append({"type": "rank", "heading": "最近このエリアで報告の多い魚", "items": [[k, v, f"{v}件", SPRITE.get(k, k)] for k, v in top], "sprites": True, "chapter": ci,
                   "note": "直近45日の、施設などの公開釣果の件数（釣果を公開している施設のみ）",
                   "lines": [f"このエリアで、最近の公開釣果に多いのは、{top[0][0]}。続いて、{top[1][0]}、{top[2][0]}です。", "釣果を公開している施設の数字なので、目安として見てください。"]})
    sc.append(ask(slug, len(chapters) - 1))
    sc.append(end(wrap_up, len(chapters) - 1))
    return {"slug": slug, "title": title, "thumb": thumb, "thumb_sub": thumb_sub, "tag": "関西の釣り場ガイド", "chapters": chapters, "scenes": sc,
            "links": [f"/kansai/area/{a}/" for a in sorted({a['slug'] for a in D['areas'] if any(x in a['spots'] for x in spots)})]}


# ---------------- 海上釣り堀 ----------------
def tsuribori():
    slug = "long-tsuribori"
    xs = [x for x in SP if SP[x]["type"] == "海上釣り堀"]
    chapters = ["はじめに", "海上釣り堀ってどんな所？", "6施設を比べる", "施設ごとの紹介", "当日の流れと持ち物", "まとめ"]
    fees = []
    for x in xs:
        m = re.search(r"([\d,]+)円", SP[x]["fees"][0]["value"]) if SP[x]["fees"] else None
        if m:
            fees.append(int(m.group(1).replace(",", "")))
    sc = [
        {"type": "hook", "lines": ["いけすの中を泳ぐ、マダイやブリ。", "海上釣り堀は、魚が放流されているので、釣り初心者でも大物に出会えるチャンスがある、関西で人気の釣りです。", "この動画では、関西の海上釣り堀6施設を、料金・時間・ルールで比べます。"], "chapter": 0},
        {"type": "cards", "heading": "この動画でわかること", "numbered": True, "items": chapters[1:-1], "chapter": 0, "lines": ["この動画の流れです。"]},
        {"type": "cards", "heading": "海上釣り堀の特徴", "items": ["海の上のいけすで釣る", "マダイ・青物などが放流されている", "料金は高めだが、魚に出会いやすい", "貸し竿・タモがある所が多い"], "chapter": 1,
         "lines": ["海上釣り堀は、海に浮かべた、いけすの周りで釣りをする施設です。", "マダイや青物などが放流されているので、堤防より魚に出会いやすいのが魅力です。", "そのぶん料金は高めですが、竿やタモを借りられる所が多く、手ぶらに近い形で始められます。"]},
        {"type": "stat", "heading": "数字で見る関西の海上釣り堀", "chapter": 2,
         "stats": [[str(len(xs)), "施設", "この動画で紹介する海上釣り堀"], [f"{min(fees):,}", "円〜", "料金のいちばん安い例（大人1人）"], [f"{max(fees):,}", "円", "料金のいちばん高い例（大人1人）"]],
         "lines": [f"関西の海上釣り堀を{len(xs)}施設、集めました。", f"大人1人の料金は、安い所で{min(fees):,}円、高い所で{max(fees):,}円。コースや時期でも変わります。"]},
    ]
    rows = []
    for x in xs:
        s = SP[x]
        rows.append([s["name"][:14], fee_short(s).replace("（", "")[:12] or "要確認", short(s["hours"], 14) or "要確認", "○" if can_rent(s) else "－", "×" if "no-chum" in (s.get("restrictions") or []) else "－"])
    sc.append({"type": "compare", "heading": "6施設をひと目で比較", "cols": ["料金", "時間", "貸し竿", "撒き餌"], "rows": rows, "chapter": 2,
               "note": "料金・時間は公式情報の一例（コース・時期で変わります）。×＝禁止　○＝貸し竿あり",
               "lines": ["料金と時間、貸し竿の有無を表にしました。", "多くの施設は朝早くから昼過ぎまでの営業です。予約が必要な所もあるので、行く前に公式サイトを確認しましょう。"]})
    allp = pins_of(xs)
    for i, x in enumerate(xs, 1):
        sc.append(spotcard(x, i, len(xs), allp, 3))
    sc.append({"type": "cards", "heading": "当日の流れ（一般的な例）", "numbered": True, "items": ["予約・受付（料金を払う）", "ライフジャケットを着る", "いけすへ移動・ルールの説明", "釣り開始（放流があることも）", "釣れた魚は持ち帰り・クーラーへ"], "chapter": 4,
               "lines": ["当日の流れは、施設によって違いますが、一般的にはこんな流れです。", "受付で料金を払い、ライフジャケットを着て、いけすへ移動します。", "ルールの説明を聞いたら、釣り開始。釣れた魚は、持ち帰って食べられます。"]})
    sc.append({"type": "cards", "heading": "釣果を伸ばすコツ（一般的なもの）", "items": ["エサを何種類か用意する", "タナ（深さ）をこまめに変える", "放流の直後はチャンス", "釣れている人のタナを参考にする", "スタッフにその日の様子を聞く"], "chapter": 4,
               "lines": ["釣果を伸ばすコツも紹介します。施設ごとに決まりがあるので、その範囲で試してください。", "まず、エサを何種類か用意すること。魚は日によって、好むエサが変わります。",
                         "次に、タナ、つまり魚がいる深さを、こまめに変えること。周りで釣れている人の深さも参考になります。", "放流があった直後は、魚の活性が上がるチャンス。迷ったら、スタッフにその日の様子を聞くのが近道です。"]})
    sc.append({"type": "quiz", "q": "釣り堀で「タナ」とは何のこと？", "options": ["魚がいる深さ", "いけすの番号", "エサの種類"], "answer": 0, "chapter": 4,
               "lines": ["ここでクイズです。釣り堀でよく聞く、タナとは何のこと？1、魚がいる深さ。2、いけすの番号。3、エサの種類。", "さあ、どれでしょう？", "正解は、魚がいる深さです。ウキ下の長さを変えて、魚のいるタナを探します。"]})
    sc.append({"type": "cards", "heading": "釣り堀のマナー", "items": ["隣の人との間隔をあける", "仕掛けが絡んだら、声をかけ合う", "大きな魚はタモで、周りと協力", "釣れた魚の数の決まりを守る"], "chapter": 4,
               "lines": ["釣り堀では、いけすを何人かで囲んで釣ります。隣の人との間隔をあけ、仕掛けが絡んだら声をかけ合いましょう。", "大きな魚がかかったら、タモですくうのを周りの人が手伝ってくれることも。持ち帰れる数などの決まりも守りましょう。"]})
    sc.append({"type": "cards", "heading": "持っていくと安心なもの", "items": ["クーラーボックスと氷（大きめ）", "帽子・雨具・防寒着", "飲み物と軽い食べ物", "酔い止め（船で渡る施設）", "ライフジャケット（貸し出しがない所）"], "chapter": 4,
               "lines": ["持っていくと安心なのは、大きめのクーラーボックスと氷。マダイや青物は大きいので、小さなクーラーには入りません。", "海の上は日差しや風が強いので、帽子や雨具、防寒着も用意しましょう。"]})
    sc.append(ask(slug, 5))
    sc.append(end(["海上釣り堀は、大物と出会える特別な釣りです。", "料金やルールは変わることがあるので、行く前に各施設の公式サイトを確認してください。"], 5))
    return {"slug": slug, "title": "【完全版】関西の海上釣り堀ガイド 6施設の料金・時間・ルールを比較", "thumb": "関西の海上釣り堀", "thumb_sub": "6施設を料金・時間・ルールで比較", "tag": "関西の釣り場ガイド",
            "chapters": chapters, "scenes": sc, "links": ["/kansai/"]}


# ---------------- 釣りカレンダー ----------------
CAL = [("青物", ["ハマチ・ブリ", "青物（種類不明）"]), ("アジ・サバ・イワシ", ["アジ・サバ・イワシ", "アジ"]), ("タチウオ", ["タチウオ"]), ("チヌ", ["チヌ（クロダイ）"]), ("スズキ", ["スズキ"]),
       ("メバル", ["メバル"]), ("ガシラ", ["ガシラ（カサゴ）"]), ("アコウ", ["アコウ（キジハタ）"]), ("カレイ", ["カレイ"]), ("タコ", ["タコ"]), ("グレ", ["グレ（メジナ）"]),
       ("マダイ", ["マダイ"]), ("カワハギ", ["カワハギ", "ウマヅラハギ"]), ("ヒラメ", ["ヒラメ"]), ("サヨリ", ["サヨリ"])]
METHOD = {"青物": "ショアジギングや、のませ釣り", "アジ・サバ・イワシ": "サビキ釣りが手軽", "タチウオ": "夕方からのウキ釣りやテンヤ", "チヌ": "ウキ釣りや落とし込み", "スズキ": "夜のルアー釣り",
          "メバル": "夜のウキ釣りやメバリング", "ガシラ": "テトラや岩のすき間の穴釣り", "アコウ": "底を探るルアーや胴突き仕掛け", "カレイ": "投げ釣りで、じっくり待つ", "タコ": "タコエギやテンヤで底をずる",
          "グレ": "撒き餌を使うウキ釣り", "マダイ": "海釣り公園の胴突きや投げ釣り", "カワハギ": "胴突き仕掛けにアサリ", "ヒラメ": "のませ釣りやルアー", "キス": "ちょい投げで砂地を探る", "サヨリ": "小さなウキの仕掛けで表層"}
SEASONS = [("春（3〜5月）", [2, 3, 4]), ("夏（6〜8月）", [5, 6, 7]), ("秋（9〜11月）", [8, 9, 10]), ("冬（12〜2月）", [11, 0, 1])]


def calendar():
    slug = "long-calendar"
    se = long_data.season([g for _, g in CAL])
    rates = dict(zip([n for n, _ in CAL], se["rates"]))
    chapters = ["はじめに", "データについて", "魚ごとのカレンダー"] + [x for x, _ in SEASONS] + ["これからの季節", "まとめ"]
    sc = [
        {"type": "hook", "lines": ["今の季節、関西の海では何が釣れるのか。", f"{se['source']}が公開している、{se['years'].replace('〜', '年から')}の釣果記録、およそ{se['days']}日分を集計して、1年の釣りカレンダーを作りました。"], "chapter": 0},
        {"type": "cards", "heading": "この動画でわかること", "numbered": True, "items": chapters[1:-1][:6], "chapter": 0, "lines": ["春夏秋冬、季節ごとに主役の魚を見ていきます。"]},
        {"type": "cards", "heading": "カレンダーの見方", "items": ["色が濃いほど、報告が多い月", "黄色は、その魚のピークに近い月", "1年を通して報告がある魚もいる", "年によって時期は前後する"], "chapter": 1,
         "lines": ["このあと出てくるカレンダーの見方です。色が濃いほど、その月に報告が多いことを表しています。", "黄色の月は、その魚のピークに近い月。年によって、海の水温などで時期は前後します。"]},
        {"type": "stat", "heading": "集計したデータ", "chapter": 1, "stats": [[f"{se['days']:,}", "日分", "釣果が公開された日"], ["2", "か所", f"{se['source']}"], [str(len(CAL)), "種類", "集計した魚"]],
         "lines": ["集計の方法です。", "その月に釣果が出た日のうち、その魚が報告された日の割合を、釣れやすさの目安にしています。", "2か所のデータなので、関西全体の目安として見てください。"]},
    ]
    groups = [("回遊魚・人気の魚", ["青物", "アジ・サバ・イワシ", "タチウオ", "スズキ", "チヌ"]), ("根魚・冬の魚", ["メバル", "ガシラ", "アコウ", "カレイ", "タコ"]), ("磯・砂地の魚", ["グレ", "マダイ", "カワハギ", "ヒラメ", "サヨリ"])]
    for i, (gname, names) in enumerate(groups):
        lines = [["まずは、回遊魚や人気の魚から見ていきましょう。", "続いて、根魚と、冬に多い魚です。", "最後は、磯や砂地の魚です。"][i]]
        tpl = ["{nm}は、{ph}。いちばん多いのは{best}月です。", "{nm}のピークは{best}月で、{ph}によく報告されています。", "{ph}に多いのが{nm}。特に{best}月です。", "{nm}は{ph}がシーズン。最も多いのは{best}月。", "{nm}が多いのは{ph}で、{best}月が山です。"]
        for j, nm in enumerate(names):
            ph, best = long_data.month_phrase(rates[nm])
            if ph:
                lines.append(tpl[(i + j) % len(tpl)].format(nm=nm, ph=ph, best=best))
        sc.append({"type": "season", "labels": names, "rates": [rates[n] for n in names], "note": f"{se['source']}の公開釣果（{se['years']}）で、その魚が報告された日の割合", "chapter": 2, "lines": lines})
    for k, (sname, months) in enumerate(SEASONS):
        ci = 3 + k
        score = sorted(((n, sum(rates[n][m] for m in months) / 3) for n, _ in CAL), key=lambda kv: -kv[1])[:6]
        mx = score[0][1] or 1
        sc.append(chap(k + 1, sname, [n for n, _ in score[:3]], ci, f"{sname.split('（')[0]}の主役は、{score[0][0]}と{score[1][0]}です。"))
        sc.append({"type": "pattern2", "heading": f"{sname.split('（')[0]}のおすすめの狙い方", "rows": [[n, METHOD.get(n, "")] for n, _ in score[:4] if METHOD.get(n)], "chapter": ci, "sync": True, "sync_offset": 1,
                   "lines": [f"{sname.split('（')[0]}に人気の魚を、どんな釣り方で狙うか、まとめました。"] + [f"{n}なら、{METHOD[n]}。" for n, _ in score[:4] if METHOD.get(n)]})
        sc.append({"type": "rank", "heading": f"{sname}に報告が多い魚", "items": [[n, round(v * 100, 1), f"{v * 100:.0f}%", SPRITE.get(n, n)] for n, v in score], "sprites": True, "chapter": ci,
                   "note": "その季節に釣果が出た日のうち、その魚が報告された日の割合（平均）",
                   "lines": [f"{sname.split('（')[0]}に報告が多いのは、1位{score[0][0]}、2位{score[1][0]}、3位{score[2][0]}。", f"4位以下は、{score[3][0]}、{score[4][0]}、{score[5][0]}と続きます。"]})
    fac = [x for x in SP if SP[x].get("openHourByMonth") and SP[x].get("closeHourByMonth") and SP[x]["openHourByMonth"][0] is not None and SP[x]["openHourByMonth"][6] is not None]
    rows = []
    for x in fac[:7]:
        o, c = SP[x]["openHourByMonth"], SP[x]["closeHourByMonth"]
        rows.append([SP[x]["name"][:13], f"{o[0]}〜{c[0]}時", f"{o[6]}〜{c[6]}時"])
    if rows:
        sc.append({"type": "compare", "heading": "季節で変わる海釣り施設の営業時間", "cols": ["1月", "7月"], "rows": rows, "chapter": 7, "note": "各施設の公式情報（月ごとの時間）より。変わることがあります",
                   "lines": ["季節によって、海釣り施設の営業時間も変わります。", "冬は朝が遅く、夕方も早く閉まる施設が多くなります。冬に出かけるときは、閉まる時間を必ず確認しましょう。"]})
    sh = [(m, sun_hours(date(2026, m, 15))) for m in (1, 4, 7, 10)]
    fmt = lambda h: f"{int(h)}:{int(round(h % 1 * 60)):02d}"
    sc.append({"type": "compare", "heading": "日の出・日の入り（神戸・各月15日）", "cols": ["日の出", "日の入り"], "rows": [[f"{m}月", fmt(a), fmt(b)] for m, (a, b) in sh], "chapter": 7,
               "note": "当サイトの計算による目安（数分の誤差があります）",
               "lines": [f"まずめの時間も、季節で大きく変わります。神戸の日の出は、1月はおよそ{fmt(sh[0][1][0])}、7月はおよそ{fmt(sh[2][1][0])}。", "冬は朝まずめの時間が遅くなるので、早起きしすぎなくても、朝のチャンスに間に合います。"]})
    nov = sorted(((n, rates[n][10]) for n, _ in CAL), key=lambda kv: -kv[1])[:3]
    dec = sorted(((n, rates[n][11]) for n, _ in CAL), key=lambda kv: -kv[1])[:3]
    q_opts = [dec[0][0], nov[2][0] if nov[2][0] != dec[0][0] else nov[1][0], "サヨリ"]
    if "サヨリ" in q_opts[:2]:
        q_opts[2] = "タコ"
    sc.append({"type": "quiz", "q": "データで、12月にいちばん報告が多い魚は？", "options": q_opts, "answer": 0, "chapter": 7,
               "lines": [f"ここでクイズです。データで、12月にいちばん報告が多い魚は？1、{q_opts[0]}。2、{q_opts[1]}。3、{q_opts[2]}。", "さあ、どれでしょう？", f"正解は、{dec[0][0]}です。"]})
    sc.append({"type": "cards", "heading": "これから（11〜12月）のねらい目", "items": [f"{n}" for n, _ in nov] + [f"{n}（12月）" for n, _ in dec if n not in [m for m, _ in nov]][:2], "chapter": 7,
               "lines": [f"これからの11月は、{nov[0][0]}、{nov[1][0]}、{nov[2][0]}の報告が多い時期です。", "寒くなると、昼間に釣れる魚や、夜の根魚が主役になります。防寒をしっかりして出かけましょう。"]})
    sc.append(ask(slug, 8))
    sc.append(end(["季節ごとに主役が入れ替わるのが、関西の海の面白さです。", "今日の釣れる時間と最近の釣果は、ツレドキ関西で確認してください。"], 8))
    return {"slug": slug, "title": "【データで見る】関西の釣りカレンダー12か月 何月に何が釣れる？", "thumb": "関西の釣りカレンダー", "thumb_sub": "約3,000日分の釣果データで集計", "tag": "データで見る釣り",
            "chapters": chapters, "scenes": sc, "links": ["/kansai/month/11/", "/kansai/month/12/"]}


# ---------------- 釣れる時間（潮・まずめ・月） ----------------
def sun_hours(d, lat=34.69, lon=135.19):
    n = d.timetuple().tm_yday
    decl = 23.44 * math.sin(math.radians(360 / 365 * (n - 81)))
    ha = math.degrees(math.acos(-math.tan(math.radians(lat)) * math.tan(math.radians(decl)) - 0.0145 / (math.cos(math.radians(lat)) * math.cos(math.radians(decl)))))
    b = math.radians(360 / 365 * (n - 81))
    eot = 9.87 * math.sin(2 * b) - 7.53 * math.cos(b) - 1.5 * math.sin(b)
    noon = 12 + (135 - lon) / 15 - eot / 60
    return noon - ha / 15, noon + ha / 15


def tide_day(day):
    t = json.load(open(f"public/data/tides/KB-{day[:4]}.json", encoding="utf-8"))
    return next(x for x in t["days"] if x["date"] == day)


def tide_scene(day, heading, label, chapter, lines):
    td = tide_day(day)
    hv = [v if v is not None else 0 for v in td["hourly"][:24]] + [td["hourly"][23]]
    dif = [abs(hv[h + 1] - hv[h]) for h in range(24)]
    th = sorted(dif)[-8]
    moving = [h for h in range(24) if dif[h] >= th and dif[h] >= 8]
    sr, ss = sun_hours(date.fromisoformat(day))
    wins = []
    for h in moving:
        if abs(h + 0.5 - sr) <= 1.5 or abs(h + 0.5 - ss) <= 1.5:
            wins.append((h, h + 1))
    merged = []
    for a, b in wins:
        if merged and a <= merged[-1][1]:
            merged[-1] = (merged[-1][0], b)
        else:
            merged.append((a, b))
    ev = [("満", e["time"], e["cm"]) for e in td["high"]] + [("干", e["time"], e["cm"]) for e in td["low"]]
    return {"type": "tidecurve", "heading": heading, "label": label, "hourly": hv[:25], "moving": moving, "windows": merged, "sun": (round(sr, 2), round(ss, 2)), "events": ev,
            "chapter": chapter, "sync": True, "sync_offset": 0, "move_at": 1, "win_at": 2, "lines": lines}


def jiai():
    slug = "long-jiai"
    chapters = ["はじめに", "潮の動き", "大潮と小潮", "朝夕のまずめ", "データで検証", "ねらい目の見つけ方", "まとめ"]
    # 11月の神戸で、潮の差がいちばん大きい日と小さい日
    t = json.load(open("public/data/tides/KB-2026.json", encoding="utf-8"))
    nov = [x for x in t["days"] if x["date"].startswith("2026-11")]
    rng = lambda x: max(v for v in x["hourly"] if v is not None) - min(v for v in x["hourly"] if v is not None)
    big, small = max(nov, key=rng), min(nov, key=rng)
    md = lambda s: f"{int(s[5:7])}月{int(s[8:10])}日"
    lifts = {}
    for n, g in [("チヌ", ["チヌ（クロダイ）"]), ("メバル", ["メバル"]), ("ガシラ", ["ガシラ（カサゴ）"]), ("青物", ["ハマチ・ブリ", "青物（種類不明）"]), ("アジ・サバ・イワシ", ["アジ・サバ・イワシ"]), ("タチウオ", ["タチウオ"]), ("タコ", ["タコ"])]:
        tl = long_data.tide([g])
        if tl:
            lifts[n] = tl
    sc = [
        {"type": "hook", "lines": ["釣り人の間でよく聞く、「大潮は釣れる」「朝まずめが一番」。", "これは本当なのか。潮の仕組みと、関西の釣果データで確かめます。"], "chapter": 0},
        {"type": "cards", "heading": "この動画でわかること", "numbered": True, "items": chapters[1:-1], "chapter": 0, "lines": ["この動画の流れです。"]},
        chap(1, "潮の動き", ["満潮と干潮", "1日に約2回", "動く時間が大切"], 1, "まずは、潮の動きです。"),
        tide_scene(big["date"], "1日の潮の動き（神戸）", f"{md(big['date'])}・気象庁 潮位表", 1,
                   ["海面は、1日におよそ2回、高くなる満潮と、低くなる干潮をくり返します。", "満潮と干潮の間は、海水が大きく動きます。この、潮がよく動く時間に、魚のエサが流されて、魚の動きも活発になると言われます。",
                    "さらに、日の出と日の入りの前後に重なる時間が、ねらい目です。"]),
        chap(2, "大潮と小潮", ["月の満ち欠け", "大潮は差が大きい", "小潮は差が小さい"], 2, "次は、大潮と小潮です。"),
        {"type": "cards", "heading": "潮の大きさは月で決まる", "items": ["新月・満月のころ ＝ 大潮（差が大きい）", "半月のころ ＝ 小潮（差が小さい）", "その間が中潮・長潮・若潮", "約2週間でくり返す"], "chapter": 2,
         "lines": ["潮の満ち引きの大きさは、月と太陽の位置で決まります。", "新月と満月のころは、満潮と干潮の差が大きい大潮。半月のころは、差が小さい小潮になります。", "およそ2週間で、このくり返しです。"]},
        tide_scene(small["date"], "差が小さい日（神戸）", f"{md(small['date'])}・気象庁 潮位表", 2,
                   [f"こちらは、11月で潮の差がいちばん小さい、{md(small['date'])}の神戸です。", "さっきの日と比べると、曲線がなだらかで、潮が動く時間も短めです。", "ただ、潮が動く時間とまずめが重なれば、小潮の日でもチャンスはあります。"]),
        {"type": "cards", "heading": "上げ潮・下げ潮・潮止まり", "items": ["上げ潮：干潮から満潮へ、海面が上がる", "下げ潮：満潮から干潮へ、海面が下がる", "潮止まり：満潮・干潮の前後、流れがゆるむ", "動き始め・動いている途中がチャンス"], "chapter": 2,
         "lines": ["干潮から満潮に向かって海面が上がるのが上げ潮、満潮から干潮に向かうのが下げ潮です。", "満潮や干潮の前後は、流れがゆるむ潮止まり。魚の食いが落ちやすい時間です。", "潮が動き始めた時間や、よく動いている途中が、チャンスになりやすいと言われます。"]},
        {"type": "quiz", "q": "大潮になるのは、月がどんな時？", "options": ["新月や満月のころ", "半月のころ", "月は関係ない"], "answer": 0, "chapter": 2,
         "lines": ["ここでクイズです。大潮になるのは、月がどんな時？1、新月や満月のころ。2、半月のころ。3、月は関係ない。", "さあ、どれでしょう？", "正解は、新月や満月のころです。太陽と月が一直線に並んで、引っぱる力が強くなります。"]},
        {"type": "cards", "heading": "釣り場によって潮は違う", "items": ["明石海峡・紀淡海峡：流れが速い", "大阪湾の奥：流れがゆるやか", "潮の時刻も場所でずれる", "釣り場に近い地点の潮位表を見る"], "chapter": 2,
         "lines": ["潮の流れ方は、釣り場によっても違います。明石海峡や紀淡海峡のような狭い所は流れが速く、大阪湾の奥はゆるやかです。", "満潮や干潮の時刻も、場所によって少しずれます。釣り場に近い地点の潮位表を見るのが大切です。"]},
        chap(3, "朝夕のまずめ", ["日の出の前後", "日の入りの前後", "暗さの変わり目"], 3, "続いて、まずめです。"),
        {"type": "cards", "heading": "まずめ＝明るさが変わる時間", "items": ["朝まずめ：日の出の前後", "夕まずめ：日の入りの前後", "小魚が動き、それを追う魚も動く", "冬は日の出が遅く、日の入りが早い"], "chapter": 3,
         "lines": ["まずめは、日の出と日の入りの前後の、明るさが変わる時間のことです。", "小魚が動き出し、それを追う大きな魚も活発になると言われ、多くの釣りでねらい目になります。", "冬は日の出が遅く、日の入りが早いので、まずめの時間も変わります。"]},
        chap(4, "データで検証", ["大潮は本当に釣れる？", "魚によって違う", "差は小さめ"], 4, "では、大潮は本当に釣れるのか。データで確かめます。"),
    ]
    if lifts:
        items = sorted(((n, v["大"]) for n, v in lifts.items()), key=lambda kv: -kv[1])
        up = [n for n, v in items if v >= 1.03]
        down = [n for n, v in items if v <= 0.97]
        sml = sorted(((n, v["小"]) for n, v in lifts.items()), key=lambda kv: -kv[1])
        sc.append({"type": "stat", "heading": "検証に使ったデータ", "chapter": 4, "stats": [["約3,200", "日分", "2か所の公開釣果（2020〜2026年）"], ["3", "段階", "潮の大きさ（大・中・小）で分類"], [str(len(lifts)), "種類", "比べた魚"]],
                   "lines": ["使ったのは、岸和田一文字と平磯海づり公園が公開している、およそ3200日分の釣果です。", "日ごとの潮の大きさを、大・中・小の3つに分けて、それぞれの日に、その魚が報告された割合を比べました。"]})
        sc.append({"type": "rank", "heading": "大潮の日の「釣れやすさ」（平均＝1.00）", "items": [[n, round(v, 2), f"{v:.2f}倍", SPRITE.get(n, n)] for n, v in items], "sprites": True, "chapter": 4,
                   "note": "岸和田一文字・平磯海づり公園の公開釣果（2020〜2026年）。その魚が報告された日の割合を、潮の大きさ別に比べたもの",
                   "lines": ["岸和田一文字と平磯海づり公園の釣果で、大潮の日に、その魚が報告された割合を比べました。平均を1倍としています。",
                             (f"大潮の日に少し多いのは、{'、'.join(up[:3])}。" if up else "") + (f"逆に、{'、'.join(down[:3])}は、大潮の日のほうが少なめでした。" if down else ""),
                             "差は、多くても1割から2割ほど。潮の大きさより、潮が動く時間やまずめ、季節のほうが大切だと言えそうです。"]})
        sc.append({"type": "rank", "heading": "小潮の日の「釣れやすさ」（平均＝1.00）", "items": [[n, round(v, 2), f"{v:.2f}倍", SPRITE.get(n, n)] for n, v in sml], "sprites": True, "chapter": 4,
                   "note": "同じデータで、小潮の日を比べたもの",
                   "lines": [f"小潮の日も見てみましょう。小潮の日に多めなのは、{sml[0][0]}や{sml[1][0]}でした。", "小潮だから釣れない、とは言えません。データからは、潮の大きさで釣りに行く日を決めすぎなくていい、と分かります。"]})
    sc.append({"type": "cards", "heading": "潮見表（潮位表）の読み方", "items": ["潮名：大潮・中潮・小潮など", "満潮・干潮の時刻と、潮位（cm）", "満潮と干潮の差＝潮の動きの大きさ", "日の出・日の入りの時刻"], "chapter": 5,
               "lines": ["潮見表、つまり潮位表の読み方です。", "見るのは、潮の名前と、満潮・干潮の時刻と高さ。満潮と干潮の差が大きいほど、潮がよく動く日です。", "そこに日の出と日の入りの時刻を重ねると、その日のねらい目が見えてきます。"]})
    sc.append({"type": "pattern2", "heading": "よくある勘違い", "rows": [["満潮の時刻が一番釣れる", "満潮前後は流れがゆるむ。動く途中を狙う"], ["小潮は釣れない", "差は小さい。動く時間を狙えばOK"], ["朝まずめだけが勝負", "夕まずめ・動き始めもチャンス"]], "chapter": 5, "sync": True, "sync_offset": 1,
               "lines": ["よくある勘違いも、まとめておきます。", "満潮の時刻が一番釣れる、なら、実は満潮の前後は流れがゆるみます。動いている途中を狙いましょう。", "小潮は釣れない、なら、データでは差は小さめ。潮が動く時間を狙えばチャンスです。", "朝まずめだけが勝負、なら、夕まずめや、潮の動き始めもチャンスです。"]})
    sc.append({"type": "cards", "heading": "ねらい目の見つけ方（3ステップ）", "numbered": True, "items": ["その季節に釣れる魚を選ぶ", "潮がよく動く時間を調べる", "まずめと重なる時間を狙う", "風と営業時間も確認する"], "chapter": 5,
               "lines": ["まとめると、ねらい目の見つけ方は、この順番です。", "まず、その季節に釣れている魚を選ぶ。次に、潮がよく動く時間を調べる。", "そして、まずめと重なる時間を狙う。最後に、風の予報と、釣り場の営業時間も確認しましょう。"]})
    sc.append({"type": "cards", "heading": "ツレドキ関西でできること", "items": ["釣り場ごとのタイドグラフ", "潮・まずめ・営業時間から「ねらい目」を自動計算", "今日・明日・週末のランキング", "いまの風（実測）と風の予報"], "chapter": 5,
               "lines": ["ツレドキ関西では、この計算を、関西の釣り場ごとに毎日自動で行っています。", "今日、明日、週末のねらい目ランキングや、いまの風も確認できます。"]})
    sc.append(ask(slug, 6))
    sc.append(end(["大潮かどうかより、潮が動く時間とまずめ。", "ねらい目を知って、短い時間でも効率よく釣りましょう。"], 6))
    return {"slug": slug, "title": "【データで検証】「大潮は釣れる」は本当？ 釣れる時間の見つけ方 潮・まずめ・月", "thumb": "大潮は本当に釣れる？", "thumb_sub": "潮・まずめ・月をデータで検証", "tag": "データで見る釣り",
            "chapters": chapters, "scenes": sc, "links": ["/kansai/", "/shio/kishiwada-ichimonji/"]}


# ---------------- 風・波・天気 ----------------
def weather():
    slug = "long-weather"
    chapters = ["はじめに", "風速の目安", "風の向きで変わる", "予報の見方", "波と雷", "行く前のチェック", "まとめ"]
    sc = [
        {"type": "hook", "lines": ["予報では風が強いと出ていたのに、現地は意外とおだやか。", "そんな経験はありませんか。この動画では、釣りに行くか決めるための、風・波・天気の読み方を解説します。"], "chapter": 0},
        {"type": "cards", "heading": "この動画でわかること", "numbered": True, "items": chapters[1:-1], "chapter": 0, "lines": ["この動画の流れです。"]},
        chap(1, "風速の目安", ["3m・5m・10m", "釣りやすさが変わる", "10mを超えたら中止"], 1, "まずは、風速の目安です。"),
        {"type": "compare", "heading": "風速と釣りやすさ（当サイトの目安）", "cols": ["サビキ・足元", "投げ・ルアー", "沖堤防・渡船"],
         "rows": [["〜3m/s", "○", "○", "○"], ["4〜6m/s", "○", "△", "△"], ["7〜9m/s", "△", "×", "×"], ["10m/s以上", "×", "×", "×"]], "chapter": 1,
         "note": "風速は10分間の平均。突風（最大瞬間風速）は、この1.5〜2倍になることがあります",
         "lines": ["風速3メートルまでなら、ほとんどの釣りが快適です。", "5メートル前後になると、軽い仕掛けやルアーが流され、投げにくくなります。", "7メートルを超えると投げ釣りやルアーは難しく、10メートル以上は、堤防では中止を考える強さです。",
                   "風速は10分間の平均です。突風は、その1.5倍から2倍になることもあります。"]},
        chap(2, "風の向きで変わる", ["背中から＝投げやすい", "正面から＝投げにくい", "横から＝糸が流れる"], 2, "同じ風速でも、風の向きで釣りやすさは大きく変わります。"),
        {"type": "wind", "heading": "風の向きと釣りやすさ", "cases": [
            {"from": "back", "label": "背中から", "tone": "good", "text": "追い風。仕掛けが遠くへ飛ぶ。体感も弱い"},
            {"from": "front", "label": "正面から", "tone": "bad", "text": "向かい風。投げにくく、波も立ちやすい"},
            {"from": "side", "label": "横から", "tone": "mid", "text": "糸が流されてアタリが取りにくい"}], "chapter": 2,
         "lines": ["背中から吹く風は、仕掛けを遠くへ運んでくれる追い風です。体に当たる風も弱く感じます。", "正面から吹く風は向かい風。投げにくく、海から波も寄せてきます。", "横からの風は、糸が流されて、アタリが分かりにくくなります。",
                   "釣り場がどちらを向いているかを知っておくと、同じ予報でも、行ける日が増えます。"]},
        {"type": "compare", "heading": "実例：10月24日 南芦屋浜", "cols": ["風向き", "風速", "どう見えるか"],
         "rows": [["気象庁の予報（兵庫県南部全体）", "北東", "10〜14m", "強い"], ["実測（神戸空港アメダス）", "北東", "6〜8m", "やや強い"], ["釣り場の位置の数値予報", "北東", "3〜4m", "おだやか"]], "chapter": 2,
         "note": "南芦屋浜の南護岸は海が南側。北東の風は背中（陸側）から吹く",
         "lines": ["実際の例です。10月24日、運営が南芦屋浜に行った日の風です。", "気象庁の予報は、兵庫県南部全体で、北東の風、10から14メートル。でも、近くの神戸空港の実測は6から8メートルでした。",
                   "さらに、南芦屋浜は海が南側。北東の風は背中から吹くので、現地ではおだやかに感じました。この日は、サゴシがよく釣れています。"]},
        {"type": "cards", "heading": "関西の季節の風（傾向）", "items": ["冬：北西〜北の季節風が強い日が多い", "春：低気圧が通ると南〜西の強い風", "夏：南寄りの風。夕方に強まることも", "秋：北東の風の日が増える"], "chapter": 2,
         "lines": ["関西の海の風には、季節ごとの傾向があります。", "冬は北西から北の季節風が強い日が多く、春は低気圧が通るたびに、南や西の強い風が吹きます。", "自分の釣り場がどちらを向いているか知っておくと、季節ごとに行きやすい場所が分かります。"]},
        {"type": "cards", "heading": "風と体感温度", "items": ["風速1mで体感が約1℃下がると言われる", "風速5mなら、気温より5℃ほど寒く感じる", "冬の夜釣りは特に防寒を", "手袋・ネックウォーマー・カイロ"], "chapter": 2,
         "lines": ["風は、体感温度にも影響します。風速1メートルで、体感温度はおよそ1度下がると言われます。", "気温10度でも、風速5メートルなら5度ほどに感じるということ。これからの季節は、防寒をしっかりしましょう。"]},
        chap(3, "予報の見方", ["予報区全体の予報", "釣り場の位置の予報", "いまの実測"], 3, "では、予報はどう見ればいいのでしょうか。"),
        {"type": "cards", "heading": "3つの情報を組み合わせる", "numbered": True, "items": ["府県天気予報：広い範囲の傾向（海上は強めに出る）", "釣り場の位置の数値予報：時間ごとの目安", "アメダスの実測：いま、どれくらい吹いているか"], "chapter": 3,
         "lines": ["気象庁の府県天気予報は、広い範囲の予報です。海上では風が強く、という言葉は、沖の様子を表しています。", "釣り場の位置の数値予報は、3時間ごとの細かい目安になります。", "そして、出かける直前は、アメダスの実測で、いまの風を確認しましょう。ツレドキ関西の釣り場ページでは、この3つをまとめて見られます。"]},
        {"type": "compare", "heading": "天気予報の「風の言葉」", "cols": ["風速（平均）", "釣りは"], "rows": [["やや強い風", "10〜15m/s", "中止を考える"], ["強い風", "15〜20m/s", "中止"], ["非常に強い風", "20〜30m/s", "外出も危険"]], "chapter": 3,
         "note": "気象庁の予報用語より（10分間の平均風速）",
         "lines": ["天気予報の、風の言葉の意味も知っておきましょう。", "やや強い風は、風速10メートルから15メートル。強い風は15メートルから20メートルです。", "予報にやや強いと出ていたら、堤防の釣りは中止を考える強さ、と覚えておきましょう。ただし、予報区全体の言葉なので、いまの風もあわせて確認します。"]},
        chap(4, "波と雷", ["波の高さの意味", "高い波が混じる", "雷は即避難"], 4, "続いて、波と雷です。"),
        {"type": "cards", "heading": "波の高さの読み方", "items": ["予報の波の高さ＝「有義波高」", "高い方から3分の1の波の平均", "時々、その1.5〜2倍の波が来る", "堤防の先端・低い所に注意"], "chapter": 4,
         "lines": ["予報の波の高さは、有義波高という値で、高い方から3分の1の波の平均です。", "つまり、予報より高い波も混じっていて、時々、1.5倍から2倍ほどの波が来ることがあります。", "堤防の先端や、海面に近い低い場所では、波をかぶらないよう注意しましょう。"]},
        {"type": "cards", "heading": "「うねり」に注意", "items": ["遠くの台風や低気圧で生まれた波", "周期が長く、ゆっくり大きく寄せる", "風が弱くても高い波が来る", "予報に「うねりを伴う」とあれば注意"], "chapter": 4,
         "lines": ["もう一つ、注意したいのがうねりです。うねりは、遠くの台風や低気圧で生まれた、周期の長い波です。", "その場の風が弱くても、ゆっくり大きな波が寄せてきます。予報に、うねりを伴う、と書いてあったら、低い場所や堤防の先端には近づかないようにしましょう。"]},
        {"type": "quiz", "q": "予報の波が1.5mの日。時々来る高い波はどれくらい？", "options": ["1.5mまで", "2〜3mほど", "5m以上"], "answer": 1, "chapter": 4,
         "lines": ["ここでクイズです。予報の波が1.5メートルの日、時々来る高い波は、どれくらいでしょう？1、1.5メートルまで。2、2から3メートルほど。3、5メートル以上。", "さあ、どれでしょう？",
                   "正解は、2から3メートルほど。予報の1.5倍から2倍の波が混じることがあります。低い堤防では、波をかぶる危険があります。"]},
        {"type": "cards", "heading": "雷が聞こえたら", "items": ["竿をたたんで、すぐ建物や車へ", "釣り竿は電気を通しやすい", "空が暗くなったら早めに撤収", "雷注意報が出ている日は控える"], "chapter": 4,
         "lines": ["雷の音が聞こえたら、すぐに竿をたたんで、建物や車の中に避難してください。", "カーボンの釣り竿は電気を通しやすく、とても危険です。空が急に暗くなったら、早めに引き上げましょう。"]},
        {"type": "cards", "heading": "行く前のチェックリスト", "numbered": True, "items": ["風速と、風の向き", "波の高さ（特に沖堤防・渡船）", "雷・強風の注意報", "渡船の運航のお知らせ", "帰りの時間と天気の変化"], "chapter": 5,
         "lines": ["出かける前に、この5つを確認しましょう。", "風の強さと向き、波の高さ、注意報。渡船で渡る場合は、船の運航のお知らせも必ず確認してください。", "迷ったら、やめる勇気も大切です。"]},
        ask(slug, 6),
        end(["風の向きと強さが分かれば、行ける日も、やめるべき日も分かります。", "ツレドキ関西の、いまの風と予報を、釣行の判断に役立ててください。"], 6),
    ]
    return {"slug": slug, "title": "【保存版】釣りに行くか決める 風・波・天気の読み方 予報と実測のズレも解説", "thumb": "風・波・天気の読み方", "thumb_sub": "釣りに行くか決める基準", "tag": "釣りの安全",
            "chapters": chapters, "scenes": sc, "links": ["/kansai/hyogo/minami-ashiyahama-minami-gogan/", "/shio/minami-ashiyahama-minami-gogan/"]}


# ---------------- 家族・子ども ----------------
def family():
    slug = "long-family"
    fac = [x for x in SP if SP[x]["type"] == "海釣り施設"]
    rent = [x for x in fac if can_rent(SP[x])]
    kids = [x for x in fac if any("6〜15歳" in f["label"] or "子ども" in f["label"] or "小学生" in f["label"] or "中学生" in f["label"] for f in SP[x]["fees"])]
    lj = [x for x in fac if "ライフジャケット" in (SP[x].get("rentals") or "") and "ありません" not in (SP[x].get("rentals") or "")]
    chapters = ["はじめに", "施設の選び方", "手ぶらで行ける施設", "子ども連れの注意", "初めての1日", "まとめ"]
    rows = []
    for x in fac:
        s = SP[x]
        rows.append([s["name"][:13], "○" if x in rent else "－", "○" if x in kids else "－", "○" if x in lj else "－", "○" if "売店" in (s.get("rentals") or "") or "販売" in (s.get("rentals") or "") else "－"])
    sc = [
        {"type": "hook", "lines": ["子どもと一緒に、釣りをしてみたい。", "でも、どこに行けば安全で、道具がなくても楽しめるのか。", "この動画では、関西の海釣り施設を、家族で行きやすいかどうかで比べます。"], "chapter": 0},
        {"type": "cards", "heading": "この動画でわかること", "numbered": True, "items": chapters[1:-1], "chapter": 0, "lines": ["この動画の流れです。"]},
        {"type": "cards", "heading": "家族で選ぶなら海釣り施設", "items": ["柵があって足場が平ら", "トイレや売店がある所が多い", "スタッフがいて安心", "竿を借りられる所がある"], "chapter": 1,
         "lines": ["子ども連れなら、まずは海釣り施設がおすすめです。", "柵があって足場が平らで、トイレや売店がある所が多く、スタッフもいます。竿を借りられる施設なら、道具がなくても始められます。"]},
        {"type": "stat", "heading": "数字で見る関西の海釣り施設", "chapter": 1,
         "stats": [[str(len(fac)), "施設", "この動画で比べる海釣り施設"], [str(len(rent)), "施設", "竿を借りられる"], [str(len(kids)), "施設", "子ども料金がある（公式情報）"]],
         "lines": [f"関西の海釣り施設{len(fac)}か所のうち、竿を借りられるのは{len(rent)}か所。", f"子どもの料金が決まっている施設は、{len(kids)}か所です。"]},
    ]
    for k in range(0, len(rows), 7):
        sc.append({"type": "compare", "heading": "家族で行きやすさ比較" + (f"（{k // 7 + 1}）" if len(rows) > 7 else ""), "cols": ["貸し竿", "子ども料金", "救命具の貸出", "売店"], "rows": rows[k:k + 7], "chapter": 2,
                   "note": "○＝公式情報に記載あり　－＝記載なし・不明（行く前に公式サイトを確認してください）",
                   "lines": ["施設ごとに、貸し竿、子どもの料金、ライフジャケットの貸し出し、売店があるかを比べました。" if k == 0 else "続きです。", "丸が多い施設ほど、手ぶらに近い形で出かけられます。" if k == 0 else "公式サイトに記載がない場合は、ハイフンにしています。"]})
    allp = pins_of(rent)
    for i, x in enumerate(rent, 1):
        sc.append(spotcard(x, i, len(rent), allp, 2))
    sc.append({"type": "cards", "heading": "子ども連れで気をつけること", "items": ["ライフジャケットを必ず着る", "目を離さない（大人1人に子ども1人が目安）", "針・魚のトゲに注意", "帽子・水分・防寒", "短い時間で切り上げる"], "chapter": 3,
               "lines": ["子ども連れで一番大切なのは、ライフジャケットです。施設によっては、小学生以下の着用が決まっている所もあります。", "子どもから目を離さないこと。針や、魚のトゲにも気をつけましょう。", "子どもが飽きる前に、短い時間で切り上げるのも、また行きたいと思ってもらうコツです。"]})
    sc.append({"type": "cards", "heading": "家族の持ち物リスト", "items": ["子ども用ライフジャケット", "帽子・日焼け止め・飲み物", "タオル・ウェットティッシュ", "クーラーボックスと氷", "ゴミ袋・着替え"], "chapter": 3,
               "lines": ["持ち物も確認しましょう。子ども用のライフジャケットは、体に合ったサイズのものを。", "手が汚れるので、タオルやウェットティッシュがあると便利です。ゴミは必ず持ち帰りましょう。"]})
    sc.append({"type": "quiz", "q": "子どもと初めての釣り、いちばん大切なものは？", "options": ["ライフジャケット", "高い釣り竿", "大きなクーラー"], "answer": 0, "chapter": 3,
               "lines": ["ここでクイズです。子どもと初めての釣り、いちばん大切なものは？1、ライフジャケット。2、高い釣り竿。3、大きなクーラー。", "さあ、どれでしょう？", "正解は、ライフジャケット。命を守る道具なので、必ず着けましょう。"]})
    sc.append({"type": "cards", "heading": "子どもと行くなら、この季節", "items": ["夏〜秋：サビキで小アジ・イワシが手軽", "春・秋：気温がちょうどよく過ごしやすい", "冬：寒いので日中に短時間で", "真夏：日中の暑さと熱中症に注意"], "chapter": 4,
               "lines": ["子どもと行くなら、夏の終わりから秋がおすすめです。サビキで小アジやイワシがたくさん釣れる時期で、気温も過ごしやすくなります。", "冬は寒いので、日中の暖かい時間に、短時間で楽しみましょう。"]})
    sc.append({"type": "cards", "heading": "初めての1日（例）", "numbered": True, "items": ["朝、潮が動く時間に合わせて到着", "貸し竿とエサを用意", "サビキ釣りで小アジ・イワシ", "釣れた魚はクーラーへ", "お昼で切り上げて、帰って料理"], "chapter": 4,
               "lines": ["初めての1日は、例えばこんな流れです。", "朝の、潮が動く時間に合わせて到着。竿を借りて、サビキ釣りで小アジやイワシを狙います。", "お昼で切り上げて、家で唐揚げにすれば、子どもにとって忘れられない1日になります。"]})
    sc.append(ask(slug, 5))
    sc.append(end(["家族の釣りは、安全な場所選びから。", "ツレドキ関西では、施設ごとのルールや料金、今日のねらい目を確認できます。"], 5))
    return {"slug": slug, "title": "【家族で釣り】子ども連れで行ける関西の海釣り施設 貸し竿・料金・安全で比較", "thumb": "子どもと行く海釣り施設", "thumb_sub": "貸し竿・料金・安全で比較", "tag": "家族で釣り",
            "chapters": chapters, "scenes": sc, "links": ["/start/", "/kansai/"]}


# ---------------- 見分け方図鑑 ----------------
PAIRS = [
    ("ヒラメとカレイ", [{"sprite": "ヒラメ", "name": "ヒラメ", "flip": True, "points": ["お腹を手前にすると頭が左", "口が大きく、鋭い歯", "小魚を追って食べる"]},
                       {"sprite": "カレイ", "name": "カレイ", "points": ["お腹を手前にすると頭が右", "口が小さい", "ゴカイなど底のエサを食べる"]}],
     ["見分け方の定番、左ヒラメに右カレイ。", "目のある面を上にして、お腹を手前に置いたとき、頭が左にくるのがヒラメ、右にくるのがカレイです。", "ヒラメは口が大きく鋭い歯があり、小魚を追います。カレイは口が小さく、底のゴカイなどを食べます。"],
     ("お腹を手前にして、頭が左にくるのは？", ["ヒラメ", "カレイ"], 0)),
    ("メバルとガシラ", [{"sprite": "メバル", "name": "メバル", "points": ["目が大きく、体が平たい", "群れで中層に浮く", "夜の常夜灯まわりでよく釣れる"]},
                      {"sprite": "ガシラ（カサゴ）", "name": "ガシラ", "points": ["頭が大きく、トゲが多い", "岩のすき間でじっとしている", "底を狙う穴釣りで釣れる"]}],
     ["次は、メバルとガシラ。どちらも堤防の根魚です。", "メバルは目が大きく体が平たく、群れで中層に浮いています。", "ガシラは頭が大きくトゲが多く、岩のすき間でじっとエサを待っています。釣り方も、狙う層も違います。"], None),
    ("カワハギとウマヅラハギ", [{"sprite": "カワハギ", "name": "カワハギ", "points": ["体がひし形で、高さがある", "オスは背びれの一部が糸のように伸びる", "おちょぼ口のエサ取り名人"]},
                              {"sprite": "ウマヅラハギ", "name": "ウマヅラハギ", "points": ["顔が長く、体が細長い", "青みがかった灰色", "群れで泳ぐことが多い"]}],
     ["カワハギとウマヅラハギ。名前の通り、ウマヅラハギは顔が長いのが特徴です。", "カワハギは体がひし形で高さがあり、オスは背びれの一部が糸のように伸びます。", "どちらも、皮をはいで料理する、おいしい魚です。"], None),
    ("サバとサゴシ", [{"sprite": "サバ", "name": "サバ", "points": ["背中に、くねくねした波模様", "体は太め", "群れで回遊、サビキでも釣れる"]},
                    {"sprite": "サゴシ（サワラ）", "name": "サゴシ", "points": ["体が細長く、横に点々の模様", "歯がとても鋭い", "ルアーの早巻きで釣れる"]}],
     ["サバとサゴシ。同じサバの仲間で、形が似ています。", "サバは背中に波のような模様があり、体は太め。サゴシは体が細長く、横に点々の模様があります。", "サゴシは歯がとても鋭いので、釣れたら口に手を近づけないようにしましょう。"],
     ("歯がとても鋭いのはどっち？", ["サバ", "サゴシ"], 1)),
    ("ハマチとシオ", [{"sprite": "ハマチ・ブリ", "name": "ハマチ", "points": ["口から尾まで黄色い線", "体は細長い紡錘形", "関西でよく釣れる青物"]},
                    {"sprite": "シオ（カンパチ）", "name": "シオ（カンパチ）", "points": ["目の上に斜めの帯（八の字）", "体の高さがある", "暖かい海に多い"]}],
     ["ハマチとシオ。シオは、関西でカンパチの若い魚を呼ぶ名前です。", "見分けるポイントは顔。カンパチは、正面から見ると、目の上の斜めの帯が漢字の八の字に見えます。", "ハマチは、口から尾まで黄色い線が通っています。"], None),
    ("チヌとグレ", [{"sprite": "チヌ（クロダイ）", "name": "チヌ", "points": ["銀色がかった灰色", "背びれのトゲが強い", "貝やカニを好む"]},
                  {"sprite": "グレ（メジナ）", "name": "グレ", "points": ["全体に黒っぽい", "口が小さい", "海藻やアミエビを好む"]}],
     ["チヌとグレ。どちらも磯や堤防の人気者です。", "チヌは銀色がかった灰色で、背びれのトゲが強いのが特徴。グレは全体に黒っぽく、口が小さめです。", "エサも違い、チヌは貝やカニ、グレは海藻やアミエビを好みます。"], None),
    ("キスとハゼ", [{"sprite": "キス", "name": "キス", "points": ["細長い銀色〜淡い茶色の体", "砂地の底を泳ぐ", "ちょい投げで狙う"]},
                  {"sprite": "ハゼ", "name": "ハゼ", "points": ["頭が大きく、目が上向き", "底にじっと止まっている", "河口や港の泥まじりの所に多い"]}],
     ["キスとハゼ。どちらも、ちょい投げで釣れる、底の魚です。", "キスは細長くてすらっとした体で、砂地を泳ぎ回ります。ハゼは頭が大きく、目が上を向いていて、底にじっと止まっています。", "キスはきれいな砂浜、ハゼは河口や港の泥が混じった所に多い魚です。"], None),
    ("スズキとボラ", [{"sprite": "スズキ", "name": "スズキ", "points": ["口が大きく、下あごが出ている", "エラぶたのふちが鋭い", "小魚を追うフィッシュイーター"]},
                    {"sprite": "ボラ", "name": "ボラ", "points": ["口が小さく、頭が平たい", "群れで水面近くを泳ぐ", "泥の中の有機物などを食べる"]}],
     ["スズキとボラ。どちらも港でよく見かける、大きめの銀色の魚です。", "スズキは口が大きく、下あごが少し出ていて、エラぶたのふちが鋭いので、素手でつかむと手を切ることがあります。", "ボラは口が小さく頭が平たく、群れで水面近くを泳いでいます。"],
     ("エラぶたのふちが鋭く、手を切りやすいのは？", ["スズキ", "ボラ"], 0)),
    ("アコウとガシラ", [{"sprite": "アコウ（キジハタ）", "name": "アコウ", "points": ["体にオレンジ色の点々", "高級魚として人気", "サイズ制限のある地域も"]},
                      {"sprite": "ガシラ（カサゴ）", "name": "ガシラ", "points": ["赤や茶色のまだら模様", "トゲが多い", "身近な根魚"]}],
     ["最後は、アコウとガシラ。アコウは、キジハタの関西での呼び名です。", "体にオレンジ色の点々があれば、アコウ。高級魚として人気で、地域によっては、小さいものを逃がすルールもあります。", "ガシラは、赤や茶色のまだら模様で、トゲが多いのが特徴です。"], None),
]


EXTRA = {
    "ヒラメとカレイ": {"rows": [["ヒラメ", "のませ釣り・ルアー", "刺身・ムニエル"], ["カレイ", "投げ釣りで待つ", "煮付け・唐揚げ"]],
                     "lines": ["釣り方も違います。ヒラメは生きた小魚やルアーで、カレイは投げ釣りでじっくり待って狙います。", "ヒラメは刺身やムニエル、カレイは煮付けや唐揚げが定番です。"]},
    "メバルとガシラ": {"rows": [["メバル", "夜のウキ釣り・ルアー", "煮付け"], ["ガシラ", "穴釣り・胴突き", "唐揚げ・味噌汁"]],
                     "lines": ["メバルは夜のウキ釣りや小さなルアー、ガシラは岩のすき間を探る穴釣りがおすすめです。", "どちらも白身でおいしく、メバルは煮付け、ガシラは唐揚げや味噌汁が人気です。"]},
    "カワハギとウマヅラハギ": {"rows": [["カワハギ", "胴突き仕掛けにアサリ", "肝あえ・鍋"], ["ウマヅラハギ", "サビキ・胴突き", "刺身・鍋"]],
                              "lines": ["カワハギは胴突き仕掛けにアサリを付けて狙うのが定番。ウマヅラハギはサビキにかかることもあります。", "どちらも肝がおいしく、刺身を肝じょうゆで食べるのが釣り人の楽しみです。"]},
    "サバとサゴシ": {"rows": [["サバ", "サビキ・小さなジグ", "塩焼き・しめさば（よく冷やして）"], ["サゴシ", "ジグの早巻き・ブレード", "塩焼き・西京焼き"]],
                    "lines": ["サバはサビキや小さなジグ、サゴシはジグの早巻きやブレードで釣れます。", "サバは傷みやすいので、釣れたらすぐ氷で冷やしましょう。サゴシは塩焼きや西京焼きがおすすめです。"]},
    "ハマチとシオ": {"rows": [["ハマチ", "ショアジギング・のませ", "刺身・照り焼き"], ["シオ（カンパチ）", "ジグ・のませ", "刺身"]],
                    "lines": ["どちらもショアジギングやのませ釣りで狙う青物です。", "釣れたら血抜きをして冷やすと、刺身がぐっとおいしくなります。"]},
    "チヌとグレ": {"rows": [["チヌ", "ウキ釣り・落とし込み", "塩焼き・刺身"], ["グレ", "撒き餌のウキ釣り", "刺身・塩焼き"]],
                  "lines": ["チヌはウキ釣りや落とし込み、グレは撒き餌を使ったウキ釣りが基本です。", "冬のグレは脂がのって、刺身が特においしいと言われます。"]},
    "キスとハゼ": {"rows": [["キス", "ちょい投げ（砂地）", "天ぷら"], ["ハゼ", "ちょい投げ・ミャク釣り", "天ぷら・唐揚げ"]],
                  "lines": ["どちらも、ちょい投げで手軽に釣れます。ハゼは足元の、ミャク釣りでも狙えます。", "キスもハゼも、天ぷらにすると絶品です。"]},
    "スズキとボラ": {"rows": [["スズキ", "夜のルアー・ウキ釣り", "洗い・ムニエル"], ["ボラ", "狙って釣る人は少ない", "きれいな海のものは刺身にも"]],
                    "lines": ["スズキは夜のルアーやウキ釣りで狙う、人気のターゲットです。", "ボラは狙う人は少ないですが、きれいな海でとれたものは、おいしく食べられます。"]},
    "アコウとガシラ": {"rows": [["アコウ", "底を探るルアー・胴突き", "刺身・鍋"], ["ガシラ", "穴釣り・胴突き", "唐揚げ・味噌汁"]],
                      "lines": ["アコウは底を探るルアーや胴突き仕掛けで、ガシラと同じような場所で釣れます。", "アコウは高級魚。刺身や鍋にすると、上品な白身が楽しめます。"]},
}


def zukan():
    slug = "long-zukan"
    chapters = ["はじめに", "関西の呼び名"] + [p[0] for p in PAIRS] + ["まとめ"]
    sc = [
        {"type": "hook", "lines": ["釣れたこの魚、名前は何？", "似ている魚は、見分けるポイントを知っておくと、すぐに分かります。この動画では、関西の堤防で釣れる、そっくりな魚の見分け方を紹介します。"], "chapter": 0},
        {"type": "cards", "heading": "この動画でわかること", "numbered": True, "items": [p[0] for p in PAIRS][:6], "chapter": 0, "lines": ["今回紹介する、そっくりな魚たちです。"]},
        {"type": "cards", "heading": "見分けるときに見る5つのポイント", "numbered": True, "items": ["口の大きさ・形", "目の位置・大きさ", "体の模様・色", "ひれ・トゲ", "体の形（細長い・平たい）"], "chapter": 1,
         "lines": ["魚を見分けるときは、この5つを見るのが基本です。", "口の大きさや形、目の位置、体の模様や色、ひれやトゲ、そして体の形。", "口が大きい魚は小魚を追うハンター、口が小さい魚は底の小さなエサを食べることが多い、というように、形には暮らし方が表れています。"]},
        {"type": "compare", "heading": "関西の呼び名", "cols": ["関西での呼び名", "どんな魚"],
         "rows": [["カサゴ", "ガシラ", "岩場の根魚"], ["クロダイ", "チヌ", "堤防の人気者"], ["メジナ", "グレ", "磯釣りの代表"], ["キジハタ", "アコウ", "高級な根魚"], ["カンパチの若魚", "シオ", "暖かい海の青物"]], "chapter": 1,
         "note": "左が標準的な名前（標準和名）、真ん中が関西でよく使われる呼び名",
         "lines": ["まずは、関西の呼び名から。関西では、同じ魚を別の名前で呼ぶことがよくあります。", "カサゴはガシラ、クロダイはチヌ、メジナはグレ、キジハタはアコウ。", "釣果情報を見るときにも役立つので、覚えておきましょう。"]},
    ]
    for i, (name, fish, lines, quiz) in enumerate(PAIRS):
        ci = i + 2
        sc.append({"type": "pair", "heading": f"{name}の見分け方", "fish": fish, "chapter": ci, "lines": lines})
        ex = EXTRA.get(name)
        if ex:
            sc.append({"type": "compare", "heading": f"{name}：釣り方と食べ方", "cols": ["釣り方", "おすすめの食べ方"], "rows": ex["rows"], "chapter": ci, "lines": ex["lines"]})
        if quiz:
            q, opts, ans = quiz
            sc.append({"type": "quiz", "q": q, "options": opts, "answer": ans, "chapter": ci,
                       "lines": [f"ここでクイズです。{q}" + "".join(f"{k + 1}、{o}。" for k, o in enumerate(opts)), "さあ、どちらでしょう？", f"正解は、{opts[ans]}です。"]})
    sc.append(ask(slug, len(chapters) - 1))
    sc.append(end(["見分けるポイントが分かると、釣りがもっと楽しくなります。", "釣れた魚は、ツレドキ関西のデジタル魚拓やマイ水族館で記録してみてください。"], len(chapters) - 1))
    return {"slug": slug, "title": "【見分け方図鑑】そっくりな魚どう見分ける？ 関西の堤防で釣れる魚9組", "thumb": "そっくりな魚の見分け方", "thumb_sub": "関西の堤防で釣れる魚9組", "tag": "魚の図鑑",
            "chapters": chapters, "scenes": sc, "links": ["/species/"]}


def all_plans():
    A = AREA
    return [
        area_video("long-area-kobe", "【関西の釣り場ガイド】神戸・明石・淡路・播磨 全10か所 ルール・料金・釣れる魚", "神戸・明石・淡路の釣り場", "全10か所 ルール・料金・釣れる魚",
                   A["kobe-akashi"]["spots"] + A["awaji"]["spots"] + A["harima"]["spots"],
                   ["明石海峡の速い潮が流れる、神戸・明石エリア。", "大物の実績がある淡路島、遠浅の砂浜がある播磨まで。", "このエリアの釣り場10か所を、ルール・料金・最近釣れている魚と一緒に紹介します。"],
                   ["ハマチ・ブリ", "マダイ", "メバル", "ガシラ（カサゴ）"], ["明石海峡の潮が流れるこのエリアは、魚の種類がとても豊富です。", "行く前には、各釣り場のルールと、今日の釣れる時間をチェックしてください。"]),
        area_video("long-area-osakawan", "【関西の釣り場ガイド】大阪湾奥（大阪市・阪神）全11か所 ルール・料金・釣れる魚", "大阪湾奥の釣り場", "大阪市・阪神 全11か所",
                   A["osaka-bay-north"]["spots"],
                   ["大阪の街から電車や車ですぐの、大阪湾奥。", "海釣り施設から、公園の護岸、渡船で渡る沖堤防まで、釣り場がそろっています。", "このエリアの11か所を、ルール・料金・最近の釣果と一緒に紹介します。"],
                   ["アジ", "タチウオ", "チヌ（クロダイ）", "スズキ"], ["仕事帰りや短い時間でも行けるのが、大阪湾奥の魅力です。", "ルールは釣り場ごとに違うので、行く前に確認してください。"]),
        area_video("long-area-senshu", "【関西の釣り場ガイド】泉州 全7か所 埠頭・沖堤防から海上釣り堀まで", "泉州の釣り場", "埠頭・沖堤防・海上釣り堀",
                   A["senshu"]["spots"],
                   ["大阪湾の南側、泉州エリア。", "泉大津の埠頭、渡船で渡る岸和田一文字、貝塚人工島から、岬町の海上釣り堀まで。", "このエリアの7か所を、ルール・料金・最近の釣果と一緒に紹介します。"],
                   ["タチウオ", "ハマチ・ブリ", "マダイ", "チヌ（クロダイ）"], ["泉州は、埠頭から沖堤防、釣り堀まで、いろいろな釣りが楽しめるエリアです。", "渡船や釣り堀は予約や運航状況の確認を忘れずに。"]),
        area_video("long-area-wakayama", "【関西の釣り場ガイド】和歌山・南紀 全11か所 加太・友ヶ島から白浜・勝浦まで", "和歌山・南紀の釣り場", "加太・友ヶ島から白浜・勝浦まで",
                   A["wakayama"]["spots"] + A["nanki-shirahama"]["spots"],
                   ["紀伊水道に面した和歌山と、黒潮が近い南紀。", "加太や友ヶ島の潮通しの良い釣り場から、白浜の釣り堀、那智勝浦の港まで。", "このエリアの11か所を、ルール・料金・最近の釣果と一緒に紹介します。"],
                   ["マダイ", "グレ（メジナ）", "ハマチ・ブリ", "アオリイカ"], ["観光と組み合わせて楽しめるのも、和歌山・南紀の魅力です。", "遠出になるので、天気と運航状況をしっかり確認して出かけましょう。"]),
        tsuribori(),
        calendar(),
        jiai(),
        weather(),
        family(),
        zukan(),
    ]


SPRITES_FOR = {"long-tsuribori": ["マダイ", "ハマチ・ブリ", "シオ（カンパチ）"], "long-calendar": ["アジ", "タチウオ", "メバル", "ハマチ・ブリ"], "long-jiai": ["アジ", "チヌ（クロダイ）", "タチウオ"],
               "long-weather": ["サゴシ（サワラ）", "アジ"], "long-family": ["アジ", "イワシ", "サバ"], "long-zukan": ["ヒラメ", "カレイ", "メバル", "カワハギ"]}


def main():
    os.makedirs(OUT, exist_ok=True)
    facts = json.load(open("content/long-facts.json", encoding="utf-8"))
    for p in all_plans():
        scenes = []
        for s in p["scenes"]:
            if s["type"] == "spotcard":
                s = dict(s)
                s["type"] = "spotcard"
                s["typeLabel"] = s.pop("type_label")
            if s["type"] == "chapter" and not s.get("sprites"):
                s["sprites"] = SPRITES_FOR.get(p["slug"])
            scenes.append(s)
        old = json.load(open(f"{OUT}/{p['slug']}.json", encoding="utf-8")) if os.path.exists(f"{OUT}/{p['slug']}.json") else {}
        doc = {"slug": p["slug"], "title": p["title"], "sub": "", "tag": p["tag"], "thumb": p["thumb"], "thumb_sub": p["thumb_sub"], "guides": [], "links": p.get("links", []), "tags": old.get("tags", []),
               "chapters": p["chapters"], "video": {"scenes": scenes}}
        json.dump(doc, open(f"{OUT}/{p['slug']}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        sp = SPRITES_FOR.get(p["slug"]) or next((s.get("sprites") for s in scenes if s["type"] == "chapter" and s.get("sprites")), None)
        facts.setdefault(p["slug"], {})["sprites"] = sp
        chars = sum(len(l) for s in scenes for l in s["lines"])
        used = sorted({s.get("chapter", 0) for s in scenes})
        assert used == list(range(len(p["chapters"]))), (p["slug"], used, p["chapters"])
        print(f"{p['slug']}: {len(scenes)} scenes, {chars} chars (~{chars / 7.5 / 60:.1f}min)")
    json.dump(facts, open("content/long-facts.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
