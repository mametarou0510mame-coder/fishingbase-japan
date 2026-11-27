# 長尺動画 第9弾の構成を作る（2026-11-20）。方針：1日1本・高クオリティ。
#   python3 scripts/video/make-long9.py            → content/long/<slug>.json（既にあるファイルは上書きしない）
#   python3 scripts/video/make-long9.py --force    → 上書きする（作り直すとき）
# 企画は docs/strategy/long-video-ideas.md の「オーナー OK（2026-11-09）」。
# 数字はサイトのデータ（data/history・public/data）で確かめたものだけを使う。
#
# 出典メモ（12月の関西 long-month-12）
#   data/history：岸和田渡船の公開釣果（2020年〜）・神戸市立 平磯海づり公園の公開釣果（2021年9月〜）。long_data.season と同じ数え方（その月に釣果が出た日のうち、その魚の報告がある日の割合）。
#   岸和田の「カレイ」と「キス」は同じ印。毎年12月の中ごろから印が付きはじめる（2020〜2025年）。記録のしかたの影響かもしれないので、動画の中でそう断る。
#   12月13〜16日ごろは、岸和田の記録がない年が多い（前半・後半の比べ方に影響するので、15日で分けた）。
#   日の出・日の入り：神戸の計算値（make-long3.sun_hours）。潮：気象庁 潮位表（神戸）の public/data/tides/KB-2026.json。
#   最近30日の公開釣果：public/data/catches.json（10月21日〜11月19日）。
import importlib.util
import json
import os
import sys
from collections import Counter, defaultdict
from datetime import date

HERE = os.path.dirname(__file__)
sys.path.insert(0, HERE)


def _load(name, file):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, file))
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


ml3 = _load("ml3", "make-long3.py")
ml2 = _load("ml2", "make-long2.py")
long_data = ml3.long_data
discuss = ml3.discuss
chap, ask, end, toc, quiz, pct, split_line = ml3.chap, ml3.ask, ml3.end, ml3.toc, ml3.quiz, ml3.pct, ml3.split_line
hm, hm_say = ml3.hm, ml3.hm_say

OUT = "content/long"


def P(x):
    return f"{x * 100:.0f}パーセント"


def real(v):
    return v.get("s") and any(not k.startswith(("本日", "悪天候")) for k in v["s"])


def md(s):
    return f"{int(s[5:7])}月{int(s[8:10])}日"


# ---------------- 12月の関西 ベスト5 ----------------
CAL = ml3.CAL
SPRITE = ml3.SPRITE
SHORT = {"アジ・サバ・イワシ": "アジ・サバ"}
G = dict(CAL)
TIP12 = {
    "青物": ("日の出の前後（7時ごろ）", "ショアジギング・のませ釣り"),
    "メバル": ("日の入りの前後から", "ウキ釣り・メバリング"),
    "アジ・サバ・イワシ": ("夕まずめから、暗くなってから", "サビキ釣り"),
    "カレイ": ("潮が動きはじめる時間", "投げ釣りの置き竿"),
    "スズキ": ("夕まずめから夜、朝まずめ", "ルアー・電気ウキ"),
    "ヒラメ": ("朝まずめ・小魚が寄った時", "のませ釣り・ルアー"),
    "タコ": ("日中（潮が動く時間）", "テンヤ・エギで底をさぐる"),
}


def spot_month(days, names, m):
    ds = [v for k, v in days.items() if int(k[5:7]) == m and real(v)]
    return sum(1 for v in ds if any(n in v["s"] for n in names)) / len(ds), len(ds)


def month12():
    slug = "long-month-12"
    se = long_data.season([g for _, g in CAL])
    rates = dict(zip([n for n, _ in CAL], se["rates"]))
    rank = sorted(((n, rates[n][11]) for n, _ in CAL), key=lambda kv: -kv[1])
    top5 = rank[:5]
    assert [n for n, _ in top5] == ["青物", "メバル", "アジ・サバ・イワシ", "カレイ", "スズキ"], rank[:7]
    assert [n for n, _ in rank[5:7]] == ["ヒラメ", "タコ"], rank[5:7]
    K = ml3.hist_days("kishiwada-ichimonji")
    H = ml3.hist_days("hiraiso-umizuri-koen")
    dec_days = sum(1 for D in (K, H) for d, v in D.items() if d[5:7] == "12" and real(v))
    ks = {n: {m: spot_month(K, G[n], m)[0] for m in (11, 12, 1)} for n, _ in CAL}
    hs = {n: {m: spot_month(H, G[n], m)[0] for m in (11, 12, 1)} for n, _ in CAL}
    kd, hd = spot_month(K, ["x"], 12)[1], spot_month(H, ["x"], 12)[1]
    # 12月の前半（1〜15日）と後半（16〜31日）：岸和田
    half = defaultdict(lambda: {"前": [], "後": []})
    for d, v in K.items():
        if d[5:7] != "12" or not real(v):
            continue
        for n, _ in CAL:
            half[n]["前" if int(d[8:10]) <= 15 else "後"].append(any(x in v["s"] for x in G[n]))
    hr = {n: {k: sum(x) / len(x) for k, x in v.items()} for n, v in half.items()}
    a_f, a_b, k_f, k_b = hr["青物"]["前"], hr["青物"]["後"], hr["カレイ"]["前"], hr["カレイ"]["後"]
    assert a_f > 0.9 and a_b < 0.55 and k_f < 0.02 and k_b > 0.9, (a_f, a_b, k_f, k_b)
    # 毎年、カレイの印が付きはじめた日（12月以降）
    first = {}
    for y in range(2020, 2026):
        ds = sorted(d for d, v in K.items() if (d.startswith(f"{y}-12") or d.startswith(f"{y + 1}-01")) and real(v) and "カレイ" in v["s"])
        first[y] = ds[0]
    assert all("12-16" <= d[5:] <= "12-23" for d in first.values()), first
    # 年ごとのアジ（岸和田・12月）
    ay = defaultdict(list)
    for d, v in K.items():
        if d[5:7] == "12" and real(v):
            ay[d[:4]].append(any(x in v["s"] for x in G["アジ・サバ・イワシ"]))
    ay = {y: sum(x) / len(x) for y, x in sorted(ay.items())}
    assert min(ay.values()) < 0.25 and max(ay.values()) > 0.95, ay
    # 時間の印（12月）
    kt, ht = Counter(), Counter()
    for d, v in K.items():
        if d[5:7] == "12" and real(v):
            kt.update(v.get("t", {}))
    for d, v in H.items():
        if d[5:7] == "12" and real(v):
            ht.update(v.get("t", {}))
    k_early = kt["早朝"] / sum(kt.values())
    h_am = ht["午前"] / sum(ht.values())
    assert k_early > 0.5 and h_am > 0.9, (k_early, h_am)
    # 日の出・日の入り（神戸の計算値）
    sun = {dd: ml3.sun_hours(date(2026, 12, dd)) for dd in range(1, 32)}
    early_ss = min(sun, key=lambda dd: sun[dd][1])
    assert early_ss <= 10, early_ss
    late_sr = ml3.sun_hours(date(2027, 1, 5))[0]
    assert late_sr > sun[22][0], (late_sr, sun[22])
    # 潮（神戸）
    t = json.load(open("public/data/tides/KB-2026.json", encoding="utf-8"))
    dec = [x for x in t["days"] if x["date"].startswith("2026-12")]
    rng = lambda x: max(v for v in x["hourly"] if v is not None) - min(v for v in x["hourly"] if v is not None)  # noqa: E731
    big = sorted(dec, key=lambda x: -rng(x))
    top_d = sorted(x["date"] for x in big[:5])
    nxt = sorted([x["date"] for x in big[5:] if abs(int(x["date"][8:10]) - int(top_d[0][8:10])) > 6][:3])
    assert top_d[0] >= "2026-12-20" and nxt and nxt[0] < "2026-12-15", (top_d, nxt)
    best_day = big[0]["date"]
    # 最近30日の公開釣果
    rep = json.load(open("public/data/catches.json", encoding="utf-8"))
    since, until = "2026-10-21", "2026-11-19"
    MERGE = {"青物（種類不明）": "ハマチ・ブリ", "サバ": "アジ", "イワシ": "アジ", "ウマヅラハギ": "カワハギ"}
    # 2026-11-27 事実確認：関西の外の釣り場（苫小牧・横須賀など）を除く
    KANSAI = {x["slug"] for x in json.load(open("data/site-export.json", encoding="utf-8"))["spots"] if x.get("pref") in ("osaka", "hyogo", "kyoto", "wakayama", "shiga", "nara")}
    rs = [r for r in rep["reports"] if since <= r["date"] <= until and r["spot"] in KANSAI]
    rc = Counter(MERGE.get(r["species"], r["species"]) for r in rs)
    nspots = len({r["spot"] for r in rs})
    LBL = {"アジ": "アジ・サバ", "ハマチ・ブリ": "青物", "チヌ（クロダイ）": "チヌ", "グレ（メジナ）": "グレ"}
    recent = [(k, c) for k, c in rc.most_common(12) if k not in ("サッパ", "ベラ", "コノシロ")][:6]
    assert recent[0][0] == "アジ", recent

    NOTE = f"{long_data.HIST_NAMES}の公開釣果（{se['years']}）。12月に釣果が出た日のうち、その魚の報告がある日の割合"
    chapters = ["はじめに", "データについて", "12月のランキング"] + [f"{5 - i}位 {SHORT.get(top5[4 - i][0], top5[4 - i][0])}" for i in range(5)] + ["月の半ばで入れ替わる", "12月の狙う時間", "まとめ"]
    sc = [
        {"type": "hook", "chapter": 0, "lines": [
            f"大阪の沖堤防、岸和田一文字。12月の前半は、{P(a_f)}の日に、青物の報告がありました。ところが、後半になると、{P(a_b)}。",
            f"代わりに増えるのが、カレイです。前半はほぼ0なのに、後半は{P(k_b)}の日に、カレイの印が付いていました。",
            "12月は、月の途中で、主役が入れ替わる月。12月に釣れる魚ベスト5と、それぞれを狙う時間を、釣果データで見ていきます。"]},
        toc(chapters, "ランキングは、5位から順に発表します。最後に、月の半ばの入れ替わりと、12月の時間の話をします。"),
        {"type": "stat", "heading": "集計したデータ（12月）", "chapter": 1,
         "stats": [[f"{se['days']:,}", "日分", f"{se['years']}の公開釣果"], [f"{dec_days}", "日", "そのうち12月"], [str(len(CAL)), "種類", "集計した魚"]],
         "lines": [f"使ったのは、岸和田一文字と、神戸の平磯海づり公園の公開釣果です。{se['years'].replace('〜', '年から')}の、あわせて{se['days']:,}日分。",
                   f"そのうち12月は{dec_days}日分。その日に、ある魚の報告があったかどうかで、割合を出しました。何匹釣れたかではありません。"]},
        {"type": "pair", "heading": "2つの釣り場は、性格がちがう", "chapter": 1,
         "fish": [{"name": "岸和田一文字", "sprite": "ハマチ・ブリ", "points": ["大阪の沖の堤防", f"12月は{kd}日分の記録", "青物・アジ・カレイが多い"]},
                  {"name": "平磯海づり公園", "sprite": "メバル", "flip": True, "points": ["神戸の海釣り施設", f"12月は{hd}日分の記録", f"記録の{pct(h_am)}が午前の釣り"]}],
         "lines": ["2つの釣り場は、性格がまったくちがいます。岸和田一文字は、沖の堤防。青物やアジ、カレイの報告が多い釣り場です。",
                   f"平磯海づり公園は、岩のまわりの魚が多い海釣り施設で、12月の記録の{P(h_am)}が、午前の釣りです。2か所だけのデータなので、関西全体の目安として見てください。"]},
        quiz("12月の2か所の釣果。報告がある日の割合、1位の魚は？", ["メバル", "青物", "カレイ"], 1, 2,
             explain=f"12月の青物は{P(top5[0][1])}。11月の{P(rates['青物'][10])}からは減りましたが、まだ1位です。"),
        {"type": "rank", "heading": "12月に報告が多い魚", "reverse": True, "sprites": True, "chapter": 2,
         "items": [[SHORT.get(n, n), round(v * 100, 1), pct(v), SPRITE.get(n, n)] for n, v in rank[:7]],
         "note": NOTE,
         "lines": ["こちらが、12月に報告が多い魚のランキングです。上位5つは、どれも、およそ20パーセント以上でした。",
                   f"6位はヒラメの{P(rank[5][1])}、7位はタコの{P(rank[6][1])}。わずかな差で、ベスト5を逃しています。"]},
        {"type": "rank", "heading": "最近30日の公開釣果で多い魚", "sprites": True, "chapter": 2,
         "items": [[LBL.get(k, k), c, f"{c}件", k] for k, c in recent],
         "note": f"{md(since)}〜{md(until)}、ツレドキ関西が集めている関西の{nspots}か所の公開釣果の件数（サッパ・ベラ・コノシロは除く。11月27日に数えた件数）",
         "lines": [f"参考に、この動画を作る前の30日、{md(since)}から{md(until)}までの公開釣果も見てみます。ツレドキ関西が集めている、関西の{nspots}か所です。",
                   f"件数がいちばん多いのは、アジ・サバ。続いて{LBL.get(recent[1][0], recent[1][0])}、{LBL.get(recent[2][0], recent[2][0])}でした。釣り場が増えると、顔ぶれも変わります。"]},
    ]
    # ---- 5位 スズキ ----
    n = "スズキ"
    assert ks[n][11] > ks[n][12] < ks[n][1], ks[n]
    sc += [
        chap(5, "5位 スズキ", [f"12月の報告 {pct(rates[n][11])}", TIP12[n][0], TIP12[n][1]], 3, "第5位から発表します。第5位は、スズキです。", sprites=["スズキ"]),
        {"type": "season", "labels": [n], "rates": [rates[n]], "chapter": 3, "note": NOTE.replace("12月に釣果が出た日のうち、", "月ごとの、"),
         "lines": [f"スズキの1年の動きです。夏はほとんど報告がなく、冬から春に多くなります。12月は{P(rates[n][11])}。",
                   f"岸和田一文字だけで見ると、12月は{P(ks[n][12])}、1月には{P(ks[n][1])}まで増えます。11月より12月はいったん下がり、1月にまた増える魚です。"]},
        {"type": "cards", "heading": "12月のスズキを狙うなら", "chapter": 3,
         "items": [f"時間：{TIP12[n][0]}", f"釣り方：{TIP12[n][1]}", "潮が動けば、日中にも報告がある", "防寒をして、暗い時間は足元に注意"],
         "lines": [f"狙う時間は、{TIP12[n][0]}が中心。ルアーか、電気ウキの釣りで狙います。",
                   "ただし、冬の暗い時間は、とても冷えます。防寒をしっかりして、足元の明かりも忘れずに。"]},
    ]
    # ---- 4位 カレイ ----
    n = "カレイ"
    sc += [
        chap(4, "4位 カレイ", [f"12月の報告 {pct(rates[n][11])}", "毎年、月の中ごろから", "沖堤防が中心"], 4, "第4位は、カレイです。", sprites=["カレイ"]),
        {"type": "compare", "heading": "岸和田一文字：カレイの印が付きはじめた日", "cols": ["付きはじめた日", "12月の割合"], "chapter": 4,
         "rows": [[f"{y}年", md(first[y]), pct(sum(1 for d, v in K.items() if d.startswith(f"{y}-12") and real(v) and "カレイ" in v["s"]) / max(1, sum(1 for d, v in K.items() if d.startswith(f"{y}-12") and real(v))))] for y in range(2020, 2026)],
         "note": "岸和田渡船の公開釣果。カレイはキスと同じ印。12月以降で数えた（2023年は11月27日にも1日だけ印あり）。13〜16日ごろは記録がない年が多い",
         "lines": [f"カレイの12月は{P(rates[n][11])}。11月の{P(rates[n][10])}から、一気に増えます。",
                   f"岸和田一文字で、毎年カレイの印が付きはじめた日を並べました。早い年で12月{min(int(d[8:10]) for d in first.values())}日、遅い年でも12月{max(int(d[8:10]) for d in first.values())}日。6年続けて、12月の中ごろからです。",
                   "ただし、記録のしかたの影響かもしれません。カレイとキスは同じ印なので、どちらの魚かも分かりません。目安として見てください。"]},
        {"type": "cards", "heading": "12月のカレイを狙うなら", "chapter": 4,
         "items": [f"時間：{TIP12[n][0]}", f"釣り方：{TIP12[n][1]}", "砂や砂泥の底に投げて、待つ", "平磯海づり公園は、春のほうが多い"],
         "lines": [f"釣り方は、{TIP12[n][1]}。砂や砂泥の底に仕掛けを投げて、じっくり待ちます。",
                   f"一方、平磯海づり公園の12月は{P(hs[n][12])}と少なめ。こちらは春に増える釣り場です。くわしくは、冬の堤防の動画で比べています。"]},
    ]
    # ---- 3位 アジ・サバ ----
    n = "アジ・サバ・イワシ"
    sc += [
        chap(3, "3位 アジ・サバ", [f"12月の報告 {pct(rates[n][11])}", "年によって大ちがい", "1月にぐっと減る"], 5, "第3位は、アジ・サバです。", sprites=["アジ", "サバ"]),
        {"type": "rank", "heading": "岸和田一文字：12月のアジ・サバ（年ごと）", "plain": True, "chapter": 5,
         "items": [[f"{y}年12月", round(r * 100, 1), pct(r)] for y, r in ay.items()],
         "note": "岸和田渡船の公開釣果。「アジ・サバ・イワシ」の印がある日の割合。平磯海づり公園の12月は、ほぼ報告なし",
         "lines": [f"12月のアジ・サバは{P(rates[n][11])}。報告のほとんどは、岸和田一文字です。年ごとに並べると、差がとても大きいことが分かります。",
                   f"少ない年は{P(min(ay.values()))}。多い年は{P(max(ay.values()))}で、記録のある日は毎日でした。去年がよかったから今年も、とは限りません。"]},
        {"type": "stat", "heading": "岸和田一文字のアジ・サバ", "chapter": 5,
         "stats": [[f"{round(ks[n][11] * 100)}", "%", "11月"], [f"{round(ks[n][12] * 100)}", "%", "12月"], [f"{round(ks[n][1] * 100)}", "%", "1月"]],
         "lines": [f"月で見ると、岸和田一文字は、11月が{P(ks[n][11])}、12月が{P(ks[n][12])}。そして1月には{P(ks[n][1])}まで下がります。",
                   f"狙うなら、12月のうちです。夕方から夜は、夜釣りができる岸壁や施設で、常夜灯のまわりをサビキで狙います。"]},
    ]
    # ---- 2位 メバル ----
    n = "メバル"
    sc += [
        chap(2, "2位 メバル", [f"12月の報告 {pct(rates[n][11])}", "神戸の海釣り施設で", "春まで続く"], 6, "第2位は、メバルです。", sprites=["メバル"]),
        {"type": "compare", "heading": "メバルの報告がある日：2つの釣り場", "cols": ["平磯海づり公園", "岸和田一文字"], "chapter": 6,
         "rows": [["11月", pct(hs[n][11]), pct(ks[n][11])], ["12月", pct(hs[n][12]), pct(ks[n][12])], ["1月", pct(hs[n][1]), pct(ks[n][1])]],
         "note": "どちらも公開釣果。岸和田一文字の記録には、メバルの印がない",
         "lines": [f"メバルの12月は{P(rates[n][11])}。ただし、その報告は、すべて平磯海づり公園です。平磯だけで見ると、12月は{P(hs[n][12])}。およそ2日に1日です。",
                   "岸和田一文字の記録には、メバルの印そのものがありません。釣れないとは限らず、記録に印がない、ということです。ランキングの順位は、こうした釣り場の組み合わせにも左右されます。"]},
        {"type": "cards", "heading": "12月のメバルを狙うなら", "chapter": 6,
         "items": [f"時間：{TIP12[n][0]}", f"釣り方：{TIP12[n][1]}", "岩や海藻のまわり、岸壁の際", f"1月は{pct(hs[n][1])}。春まで長く狙える"],
         "lines": [f"狙う時間は、夜釣りができる場所なら、{TIP12[n][0]}。施設なら、閉まる時間を先に確かめましょう。平磯の記録はほとんど午前の釣りなので、明るい時間でも、岩や海藻のまわりを探せば狙えます。",
                   f"1月も{P(hs[n][1])}と、減りません。12月から春まで、長く楽しめる魚です。"]},
    ]
    # ---- 1位 青物 ----
    n = "青物"
    sc += [
        chap(1, "1位 青物", [f"12月の報告 {pct(rates[n][11])}", "沖堤防の最後の季節", TIP12[n][0]], 7, "そして第1位は、青物です。", sprites=["ハマチ・ブリ"]),
        {"type": "season", "labels": [n], "rates": [rates[n]], "chapter": 7, "note": NOTE.replace("12月に釣果が出た日のうち、", "月ごとの、"),
         "lines": [f"青物の1年の動きです。秋に大きく増えて、いちばん多いのは10月。11月の{P(rates[n][10])}から、12月は{P(rates[n][11])}へ下がります。",
                   f"そして1月は、わずか{P(rates[n][0])}。グラフの右の端、12月が、青物を狙える最後の月です。"]},
        {"type": "stat", "heading": "岸和田一文字の青物", "chapter": 7,
         "stats": [[f"{round(ks[n][12] * 100)}", "%", "12月（報告がある日）"], [f"{round(hr[n]['前'] * 100)}", "%", "12月の前半（1〜15日）"], [f"{round(ks[n][1] * 100)}", "%", "1月"]],
         "lines": [f"岸和田一文字だけで見ると、12月は{P(ks[n][12])}。前半だけなら{P(hr[n]['前'])}と、まだ毎日のように報告があります。",
                   f"ところが、1月になると{P(ks[n][1])}。年が明けると、ほとんど姿を消します。"]},
        {"type": "pattern2", "heading": "12月の青物を狙うなら", "chapter": 7, "sync": True, "sync_offset": 1,
         "rows": [["いつ？", "12月の前半ほどチャンス"], ["何時？", "日の出の前後、7時ごろ"], ["どこで？", "沖の堤防など、潮通しのよい所"], ["釣り方は？", "ショアジギング・のませ釣り"]],
         "lines": ["12月の青物を狙うなら、ポイントは4つ。", "いつ行くか。このデータでは、12月の前半ほどチャンスです。", "何時か。日の出の前後、12月なら朝7時ごろです。",
                   "どこで。沖の堤防のような、潮通しのよい所が中心です。", "釣り方は、ショアジギングか、生きた小魚を使うのませ釣りです。"]},
    ]
    # ---- 月の半ばで入れ替わる ----
    HALF = ["青物", "アジ・サバ・イワシ", "ヒラメ", "タコ", "カレイ"]
    sc += [
        chap(8, "月の半ばで入れ替わる", ["前半は青物", "後半はカレイ", "6位・7位も"], 8, "ここで、冒頭の話に戻ります。12月の前半と後半で、何が変わるのか。", sprites=["ハマチ・ブリ", "カレイ"]),
        quiz("岸和田一文字。12月の前半と後半で、報告がある日が増えるのは？", ["ヒラメ", "タコ", "アジ・サバ"], 1, 8,
             explain=f"タコは、前半の{P(hr['タコ']['前'])}から、後半は{P(hr['タコ']['後'])}へ増えました。ヒラメとアジ・サバは、後半に減っています。"),
        {"type": "compare", "heading": "岸和田一文字：12月の前半と後半", "cols": ["前半（1〜15日）", "後半（16〜31日）"], "chapter": 8,
         "rows": [[SHORT.get(x, x), pct(hr[x]["前"]), pct(hr[x]["後"])] for x in HALF],
         "note": "岸和田渡船の公開釣果（2020〜2025年の12月）。カレイはキスと同じ印。13〜16日ごろは記録がない年が多い",
         "lines": [f"岸和田一文字の12月を、15日で前と後ろに分けました。青物は{P(hr['青物']['前'])}から{P(hr['青物']['後'])}へ。6位のヒラメも、{P(hr['ヒラメ']['前'])}から{P(hr['ヒラメ']['後'])}に減ります。",
                   f"反対に、カレイは0から{P(hr['カレイ']['後'])}へ。7位のタコも、後半に増えました。同じ12月でも、前半と後半では、狙う魚を変えたほうがよさそうです。"]},
        {"type": "cards", "heading": "6位ヒラメ・7位タコも、12月のねらい目", "chapter": 8,
         "items": [f"ヒラメ：{TIP12['ヒラメ'][0]}・{TIP12['ヒラメ'][1]}", "ヒラメは、前半のほうが多い", f"タコ：{TIP12['タコ'][0]}・{TIP12['タコ'][1]}", "タコは、後半のほうが多い"],
         "lines": ["ベスト5を逃した2つも、12月のねらい目です。ヒラメは、朝まずめや、小魚が寄ってきた時がチャンス。のませ釣りやルアーで狙います。",
                   "タコは、潮が動く日中に、テンヤやエギで底をさぐります。ヒラメは前半、タコは後半と、時期を分けて狙うのも手です。"]},
    ]
    # ---- 12月の狙う時間 ----
    ss_say = hm_say(sun[early_ss][1])
    sc += [
        chap(9, "12月の狙う時間", ["日の入りは16時台", "日の出は7時ごろ", "潮が大きいのは下旬"], 9, "最後に、12月の狙う時間です。", sprites=["スズキ", "アジ"]),
        {"type": "compare", "heading": "12月の日の出・日の入り（神戸）", "cols": ["日の出", "日の入り"], "chapter": 9,
         "rows": [[f"12月{dd}日", hm(sun[dd][0]), hm(sun[dd][1])] for dd in (1, early_ss, 15, 22, 31)],
         "note": "当サイトの計算による目安（数分の誤差があります）",
         "lines": [f"神戸の12月の日の入りは、16時台。この計算では、日の入りがいちばん早いのは、昼がいちばん短い冬至ではなく、12月のはじめで、{ss_say}ごろです。",
                   f"日の出のほうは、冬至を過ぎても遅くなり続けて、年末には{hm_say(sun[31][0])}ごろ。朝のチャンスは7時前後、夕方のチャンスは16時半ごろと、覚えておきましょう。"]},
        {"type": "stat", "heading": "12月の記録、何時の釣り？", "chapter": 9,
         "stats": [[f"{round(k_early * 100)}", "%", "岸和田一文字：早朝の印"], [f"{round(h_am * 100)}", "%", "平磯海づり公園：午前の印"], [hm(sun[15][0]), "", "12月15日の日の出（神戸）"]],
         "lines": [f"12月の時間の印を数えると、岸和田一文字では{P(k_early)}が早朝、平磯海づり公園では{P(h_am)}が午前でした。",
                   "ただし、これは、その時間に釣りをする人が多いから、でもあります。夕方の記録が少なくても、夕方が釣れない、という意味ではありません。"]},
        ml2.tide_scene(best_day, f"{md(best_day)}の潮（神戸・気象庁 潮位表）", "", 9,
                       [f"潮も見ておきます。気象庁の潮位表で、12月の神戸を見ると、満潮と干潮の差がいちばん大きいのは、{md(best_day)}ごろです。",
                        "青い帯が、潮がよく動く時間。そのうち、朝夕の明るさが変わる時間と重なる所が、ねらい目です。"]),
        {"type": "cards", "heading": "12月、潮の差が大きい日（神戸）", "chapter": 9,
         "items": [f"{md(top_d[0])}〜{md(top_d[-1])}：1か月でいちばん大きい", f"{md(nxt[0])}〜{md(nxt[-1])}ごろ：次に大きい", "まずめと、潮が動く時間を重ねる", "寒波・強風の日は、無理をしない"],
         "note": "気象庁 潮位表（神戸）より",
         "lines": [f"潮の差が大きいのは、{md(top_d[0])}から{md(top_d[-1])}ごろ。次に大きいのが、{md(nxt[0])}から{md(nxt[-1])}ごろです。",
                   "ただ、12月は、寒波や強い北風の日も増えます。予報を見て、無理をしない日を選びましょう。"]},
    ]
    # ---- まとめ ----
    JAN = ["スズキ", "カレイ", "チヌ", "青物", "アジ・サバ・イワシ", "ヒラメ"]
    up = [x for x in JAN if ks[x][1] > ks[x][12]]
    down = [x for x in JAN if ks[x][1] < ks[x][12]]
    assert up == ["スズキ", "カレイ", "チヌ"] and down == ["青物", "アジ・サバ・イワシ", "ヒラメ"], (up, down)
    sc += [
        {"type": "compare", "heading": "1月に向けて：岸和田一文字", "cols": ["12月", "1月"], "chapter": 10,
         "rows": [[SHORT.get(x, x) + ("　↑" if x in up else "　↓"), pct(ks[x][12]), pct(ks[x][1])] for x in JAN],
         "note": "岸和田渡船の公開釣果。その月の、報告がある日の割合",
         "lines": [f"最後に、1月に向けての動きです。岸和田一文字では、スズキ、カレイ、チヌは、1月に増えます。",
                   "反対に、青物、アジ・サバ、ヒラメは、1月に大きく減ります。秋の魚を狙うなら、12月が最後のチャンスです。"]},
        {"type": "cards", "heading": "まとめ：12月の関西", "numbered": True, "chapter": 10,
         "items": ["1位 青物：前半ほど。年明けはほとんど消える", "2位 メバル・5位 スズキ：春まで長く狙える", "3位 アジ・サバ：年による差が大きい", "4位 カレイ：沖堤防は月の中ごろから"],
         "lines": ["まとめです。1位の青物は、12月の前半ほどチャンス。2位のメバルと5位のスズキは、1月以降も長く狙えます。",
                   "3位のアジ・サバは、年による差が大きいので、最新の釣果を見てから。4位のカレイは、沖堤防では、月の中ごろから始まります。"]},
        ask(slug, 10),
        end(["12月は、秋の魚と冬の魚が、月の途中で入れ替わる季節です。", "今日の釣れる時間と最近の釣果は、ツレドキ関西で確認してください。"], 10),
    ]
    return {"slug": slug, "title": "【12月の関西】今月釣れる魚ベスト5と狙う時間 月の半ばで主役が入れ替わる？ 釣果データで集計",
            "thumb": "12月に釣れる魚ベスト5", "thumb_sub": "月の半ばで、主役が入れ替わる",
            "tag": "今月の釣り", "chapters": chapters, "scenes": sc, "links": ["/kansai/month/12/", "/kansai/month/1/", "/species/"],
            "tags": ["12月 釣り", "関西 釣り 12月", "釣れる魚", "青物", "カレイ", "釣果データ"], "sprites": ["ハマチ・ブリ", "メバル", "アジ", "カレイ", "スズキ"]}


def all_plans():
    return [month12()]


def main():
    force = "--force" in sys.argv
    os.makedirs(OUT, exist_ok=True)
    facts = json.load(open("content/long-facts.json", encoding="utf-8"))
    for p in all_plans():
        path = f"{OUT}/{p['slug']}.json"
        p["scenes"] = [s for s in p["scenes"] if s]
        used = sorted({s.get("chapter", 0) for s in p["scenes"]})
        assert used == list(range(len(p["chapters"]))), (p["slug"], used, p["chapters"])
        assert p["slug"] in discuss.LONG, p["slug"]
        scenes = []
        for s in p["scenes"]:
            if s["type"] not in ("quiz", "ask", "tidecurve"):
                s = dict(s, lines=[x for ln in s["lines"] for x in split_line(ln)])
            if s["type"] == "chapter":
                s = dict(s, no=s["chapter"], sprites=s.get("sprites") or p["sprites"])
            scenes.append(s)
        chars = sum(len(l) for s in scenes for l in s["lines"])
        print(f"{p['slug']}: {len(scenes)} scenes, {chars} chars (~{chars * 0.18 / 60:.1f}min)")
        if os.path.exists(path) and not force:
            print(f"  skip（{path} は既にあります。作り直すときは --force）")
            continue
        doc = {"slug": p["slug"], "title": p["title"], "sub": "", "tag": p["tag"], "thumb": p["thumb"], "thumb_sub": p["thumb_sub"], "badge": p["tag"], "guides": [], "links": p.get("links", []), "tags": p.get("tags", []),
               "chapters": p["chapters"], "video": {"scenes": scenes}}
        json.dump(doc, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        facts.setdefault(p["slug"], {})["sprites"] = p["sprites"]
    json.dump(facts, open("content/long-facts.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
