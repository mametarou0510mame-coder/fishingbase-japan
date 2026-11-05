# 長尺動画 第6弾の構成を作る（2026-11-05）。
#   python3 scripts/video/make-long6.py            → content/long/<slug>.json（既にあるファイルは上書きしない）
#   python3 scripts/video/make-long6.py --force    → 上書きする（作り直すとき）
# 企画は docs/strategy/long-video-ideas.md。数字はサイトのデータ（data/history）と、
# 公的機関などの資料で確かめたものだけを使う（出典は各場面の note と、この下のコメントに書く）。
#
# 出典メモ（食中毒 long-shokuchudoku）
#   厚生労働省「アニサキスによる食中毒を予防しましょう」 https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000042953.html
#   厚生労働省 Web マガジン（アニサキス） https://www.mhlw.go.jp/stf/web_magazine/closeup/44.html
#   群馬県（令和6年 アニサキス330件で最多） https://www.pref.gunma.jp/site/shokunoanzen/8597.html
#   京都府（令和7年 ノロウイルス462件・アニサキス280件） https://www.pref.kyoto.jp/shoku-kawaraban/yobou01.html
#   厚生労働省「令和7年食中毒発生状況の概要」 https://www.mhlw.go.jp/content/10906000/001679199.pdf
#   消費者庁（ヒスタミン） https://www.caa.go.jp/policies/policy/consumer_safety/food_safety/food_safety_portal/other/contents_001
#   東京都保健医療局（ヒスタミン） https://www.hokeniryo.metro.tokyo.lg.jp/anzen/anzen/food_faq/chudoku/chudoku15
#   大阪府（腸炎ビブリオ） https://www.pref.osaka.lg.jp/shokuhin/shokutyuudoku/tyouenbiburio.html
#   和歌山県（腸炎ビブリオ） https://www.pref.wakayama.lg.jp/prefg/031600/d00156285.html
#   大阪府（ふぐ） https://www.pref.osaka.lg.jp/documents/748/fugukeihatu.pdf
#   農林水産省（ブリ糸状虫・持ち帰り） https://www.maff.go.jp/j/heya/sodan/2205/2206/02.html
#   京都府（ブリ筋肉微胞子虫） https://www.pref.kyoto.jp/nougijyutsu/documents/h28sp1burikinnikup.pdf
#   厚生労働省 自然毒のリスクプロファイル（シガテラ） https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/shokuhin/syokuchu/poison/animal_det_02.html
# 出典メモ（なかま分け long-nakama-quiz）。「目」は分類の体系で名前が違うので、問題は「科」で出す
#   京都大学白浜水族館 展示解説（カサゴ目 kasago-moku.pdf／軟体動物 nantai-doubutsu.pdf／サメとエイ same-ei.pdf）
#     https://www.seto.kyoto-u.ac.jp/shirahama_aqua/wp-content/uploads/2023/03/kasago-moku.pdf ほか
#   鹿児島大学総合研究博物館 Ichthy 論文（サバ亜目＝タチウオ科・クロタチカマス科・サバ科） https://www.museum.kagoshima-u.ac.jp/ichthy/INHFJ_2022_027_011.pdf
#   沖縄美ら海水族館（軟骨魚） https://churaumi.okinawa/userfiles/files/topics/uminofushigi/same_a_01.pdf
#   市場魚貝類図鑑 https://www.zukan-bouz.com/ （各魚の分類欄：アジ科ブリ属、ベラ科コブダイ、イシダイ科、フグ目カワハギ科、ダツ目サヨリ科、ウミタナゴ科（胎生）、ボラの出世名 など）
# 出典メモ（釣り用語 long-yougo30）
#   ダイワ 釣り用語集 https://www.daiwa.com/jp/beginner/glossary/ ・ https://www.daiwa.com/dyfc/manabu/word/
#   気象庁（うねり・風浪） https://www.data.jma.go.jp/kaiyou/db/wave/comment/elmknwl.html
#   コトバンク（デジタル大辞泉：澪筋） https://kotobank.jp/word/%E6%BE%AA%E7%AD%8B-637148
import importlib.util
import json
import math
import os
import sys
from collections import Counter, defaultdict
from datetime import date, timedelta

HERE = os.path.dirname(__file__)
sys.path.insert(0, HERE)
_spec = importlib.util.spec_from_file_location("ml3", os.path.join(HERE, "make-long3.py"))
ml3 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ml3)
discuss = ml3.discuss
chap, ask, end, toc, quiz, pct, split_line = ml3.chap, ml3.ask, ml3.end, ml3.toc, ml3.quiz, ml3.pct, ml3.split_line

OUT = "content/long"
SRC = "岸和田一文字・平磯海づり公園の公開釣果"
KN, HN = "岸和田一文字", "平磯海づり公園"
AO = "青物（種類不明）"
FIX = {"べラ": "ベラ", "ウマズラハギ": "ウマヅラハギ", "サ ヨ リ": "サヨリ"}  # 記録の表記ゆれ


def P(x):
    return pct(x).replace("%", "パーセント")


def real(v):
    return {FIX.get(k, k) for k in v.get("s", {}) if not k.startswith(("本日", "悪天候")) and "現在" not in k and "釣果なし" not in k}


K_RAW = ml3.hist_days("kishiwada-ichimonji")
H_RAW = ml3.hist_days("hiraiso-umizuri-koen")
KD = {d: real(v) for d, v in K_RAW.items() if real(v)}
HD = {d: real(v) for d, v in H_RAW.items() if real(v)}
K_LAST, H_LAST = max(KD), max(HD)


def md(s):
    return f"{int(s[5:7])}月{int(s[8:10])}日"


def mrate(days, sp, months=None):
    sps = [sp] if isinstance(sp, str) else sp
    act, hit = Counter(), Counter()
    for d, s in days.items():
        m = int(d[5:7])
        act[m] += 1
        hit[m] += any(x in s for x in sps)
    if months:
        a = sum(act[m] for m in months)
        return sum(hit[m] for m in months) / a if a else 0
    return [hit[m] / act[m] if act[m] else 0 for m in range(1, 13)]


# ---------------- 魚が「来る日」は毎年同じ？ ----------------
def arrive(days, sp, y, m0, win=7):
    """y年 m0月1日からの1年で、1週間のうちに2日以上その魚が報告された最初の日（＝群れが来た日）"""
    lo, hi = f"{y}-{m0:02d}-01", f"{y + 1}-{m0:02d}-01"
    ds = sorted(d for d, s in days.items() if lo <= d < hi and sp in s)
    for d in ds:
        e = (date.fromisoformat(d) + timedelta(days=win)).isoformat()
        if sum(1 for x in ds if d <= x <= e) >= 2:
            return d
    return None


def off(d, y, m0):
    return (date.fromisoformat(d) - date(y, m0, 1)).days


def hatsumono():
    slug = "long-hatsumono"
    # (データ, 記録の名前, 言い方, 釣り場, 数え始める月, 年, 絵)
    SPEC = [(KD, AO, "春の青物", KN, 2, range(2021, 2027), "ハマチ・ブリ"), (HD, "ベラ", "ベラ", HN, 3, range(2022, 2027), "ベラ"),
            (KD, "タコ", "タコ", KN, 3, range(2021, 2027), "タコ"), (HD, "アオリイカ", "アオリイカ", HN, 4, range(2022, 2027), "アオリイカ"),
            (HD, "アジ", "アジ", HN, 4, range(2022, 2027), "アジ"), (KD, "タチウオ", "タチウオ", KN, 6, range(2020, 2027), "タチウオ"),
            (HD, "メバル", "メバル", HN, 9, range(2021, 2027), "メバル"), (HD, "コブダイ", "コブダイ", HN, 9, range(2021, 2026), "コブダイ")]
    R = {}
    for days, sp, lab, spot, m0, ys, spr in SPEC:
        last = K_LAST if days is KD else H_LAST
        rows = []
        for y in ys:
            a = arrive(days, sp, y, m0)
            done = a is not None or f"{y + 1}-{m0:02d}-01" <= last
            if not done:
                continue  # 今年の季節がまだ終わっていない
            rows.append((y, a))
        got = [(y, a) for y, a in rows if a]
        offs = [off(a, y, m0) for y, a in got]
        e = min(got, key=lambda r: off(r[1], r[0], m0))
        l = max(got, key=lambda r: off(r[1], r[0], m0))
        R[lab] = {"rows": rows, "early": e, "late": l, "spread": max(offs) - min(offs), "miss": [y for y, a in rows if not a], "spot": spot, "spr": spr, "m0": m0}
    ao, be, ta, ai, aj, tc, me, ko = (R[k] for k in ("春の青物", "ベラ", "タコ", "アオリイカ", "アジ", "タチウオ", "メバル", "コブダイ"))
    assert ao["spread"] <= 20 and all(a[5:7] == "04" and int(a[8:10]) <= 18 for y, a in ao["rows"]) and ta["spread"] >= 60 and len(ao["rows"]) == 6, (ao, ta)
    assert tc["miss"] == [2025], tc["miss"]
    rank = sorted(R.items(), key=lambda kv: kv[1]["spread"])
    assert rank[0][0] == "春の青物" and [r[0] for r in rank[-3:]] == ["タチウオ", "メバル", "タコ"], [r[0] for r in rank]

    def rng(r):
        return f"{md(r['early'][1])}〜{md(r['late'][1])}"

    def yrow(r):
        return [[f"{y}年", md(a) if a else "来なかった"] for y, a in r["rows"]][-7:]

    def this_year(r):
        y, a = r["rows"][-1]
        return y, a

    y26, a26 = this_year(ao)
    yt, at = this_year(tc)
    me26 = arrive(HD, "メバル", 2026, 9)
    assert y26 == 2026 and yt == 2026 and at == tc["late"][1], (y26, yt, at)
    chapters = ["はじめに", "調べ方", "春に来る魚", "初夏に来る魚", "秋のタチウオ", "冬に向けて来る魚", "きっちり度ランキング", "まとめ"]
    sc = [
        {"type": "hook", "chapter": 0, "lines": [
            f"岸和田一文字の、春の青物。6年分の記録で、群れが来た日は、毎年{rng(ao)}のあいだでした。早い年と遅い年の差は、わずか{ao['spread']}日です。",
            f"ところがタコは、早い年と遅い年で{ta['spread']}日もずれていました。魚が「来る日」は、毎年同じなのか。公開釣果で調べました。"]},
        toc(chapters, "この動画の流れです。最後に、毎年きっちり来る魚のランキングを発表します。"),
        {"type": "stat", "heading": "使ったデータ", "chapter": 1,
         "stats": [[f"{len(KD):,}", "日分", f"{KN} 2020年から"], [f"{len(HD):,}", "日分", f"{HN} 2021年から"], ["8", "種類", "季節がはっきりした魚"]],
         "note": SRC,
         "lines": [f"使ったのは、{KN}と{HN}が公開している釣果の記録です。合わせて、およそ{len(KD) + len(HD):,}日分あります。",
                   "その中から、季節がはっきりしている8種類の魚を選び、年ごとに「来た日」を調べました。"]},
        {"type": "cards", "heading": "「来た日」の決め方", "numbered": True, "chapter": 1,
         "items": ["その魚が少ない時期から数え始める", "1週間のうちに2日以上、報告があった最初の日", "1回だけの報告は「まぐれ」かもしれないので数えない", "釣れた報告なので、人が少ない日は出にくい"],
         "lines": ["「来た日」は、こう決めました。その魚が少ない時期から数え始めて、1週間のうちに2日以上、報告があった最初の日です。",
                   "1日だけの報告は、たまたま1匹釣れただけかもしれません。続けて報告が出て、はじめて「群れが来た」と考えます。",
                   "ただし、これは釣れた報告の記録です。釣りに行く人が少ない時期は、魚が来ていても報告が遅れることがあります。"]},
        chap(1, "春に来る魚", ["春の青物", "ベラ", "タコ"], 2, "まずは、春に来る魚から見ていきます。", sprites=["ハマチ・ブリ", "ベラ", "タコ"]),
        {"type": "compare", "heading": f"春の青物（{KN}）：来た日", "cols": ["来た日"], "chapter": 2, "rows": yrow(ao), "note": f"{KN}の公開釣果。2月から数えて、1週間に2日以上報告された最初の日",
         "lines": [f"表は、年ごとの青物の「来た日」です。いちばん早かったのは{ao['early'][0]}年、いちばん遅かったのは{ao['late'][0]}年でした。",
                   f"今年、{y26}年は{md(a26)}でした。どの年も4月の前半。春の青物は、毎年かなり正確にやって来ます。",
                   "4月の初めに群れが来て、5月にかけて増えていく。春の青物を狙うなら、4月の第1週から、最近の釣果を気にしておくとよさそうです。"]},
        quiz(f"{HN}のベラ。5年分で、来た日がいちばん早かったのは？", ["3月の終わり", "4月の終わり", "6月の初め"], 1, 2,
             explain=f"{be['early'][0]}年の{md(be['early'][1])}でした。遅い年でも{md(be['late'][1])}。ベラは、春の終わりの合図になる魚です。") if be["early"][1][5:7] == "04" and int(be["early"][1][8:10]) >= 20 else None,
        {"type": "compare", "heading": f"ベラ（{HN}）：来た日", "cols": ["来た日"], "chapter": 2, "rows": yrow(be), "note": f"{HN}の公開釣果。3月から数えて、1週間に2日以上報告された最初の日",
         "lines": [f"ベラは、毎年{rng(be)}のあいだ。差は{be['spread']}日で、こちらもよくそろっています。",
                   "冬のあいだは、ほとんど報告がないベラ。ベラが釣れ始めたら、海の中は春から初夏へ、という合図と言えそうです。"]},
        {"type": "compare", "heading": f"タコ（{KN}）：来た日", "cols": ["来た日"], "chapter": 2, "rows": yrow(ta), "note": f"{KN}の公開釣果。3月から数えて、1週間に2日以上報告された最初の日",
         "lines": [f"一方、タコはばらばらです。早い年は{md(ta['early'][1])}、遅い年は{md(ta['late'][1])}。{ta['spread']}日も違います。",
                   "タコは、6月から8月には、ほぼ毎日報告がある魚です。夏に多いことは毎年同じでも、春の出始めは、年によって大きくずれていました。"]},
        chap(2, "初夏に来る魚", ["アオリイカ", "アジ"], 3, "続いて、初夏に来る魚です。", sprites=["アオリイカ", "アジ"]),
        {"type": "compare", "heading": f"アオリイカ（{HN}）：来た日", "cols": ["来た日"], "chapter": 3, "rows": yrow(ai), "note": f"{HN}の公開釣果。4月から数えて、1週間に2日以上報告された最初の日",
         "lines": [f"{HN}のアオリイカは、毎年{rng(ai)}のあいだでした。多くの年は6月の前半です。",
                   "この釣り場では、アオリイカの報告は6月に集まっていて、ほかの月はごくわずかです。短い季節なので、来た日を逃さないことが大切です。"]},
        {"type": "compare", "heading": f"アジ（{HN}）：来た日", "cols": ["来た日"], "chapter": 3, "rows": yrow(aj), "note": f"{HN}の公開釣果。4月から数えて、1週間に2日以上報告された最初の日",
         "lines": [f"アジは、{rng(aj)}のあいだ。差は{aj['spread']}日で、だいたい梅雨のころに群れが入っていました。",
                   "この釣り場のアジは、8月がいちばん多い、夏の魚です。6月の終わりに報告が続き始めたら、サビキ釣りの季節の始まりです。"]},
        chap(3, "秋のタチウオ", ["来る日が遅い年", "来なかった年", "今年は？"], 4, "次は、秋の人気者、タチウオです。", sprites=["タチウオ"]),
        {"type": "compare", "heading": f"タチウオ（{KN}）：来た日", "cols": ["来た日"], "chapter": 4, "rows": yrow(tc), "note": f"{KN}の公開釣果。6月から数えて、1週間に2日以上報告された最初の日",
         "lines": [f"{KN}のタチウオは、早い年は{md(tc['early'][1])}、遅い年は{md(tc['late'][1])}でした。",
                   f"そして2025年は、報告がぽつぽつとあっただけで、1週間に2日続けて報告されることは、一度もありませんでした。群れが来なかった年もあるのです。"]},
        {"type": "cards", "heading": "タチウオは「年による差」が大きい", "chapter": 4,
         "items": ["来る日が年で1か月以上ずれる", "2025年は、群れとしては来なかった", f"今年（{yt}年）は{md(at)}", "→ その年の最近の釣果で判断する"],
         "lines": [f"今年、{yt}年は{md(at)}で、記録のある年のなかで、いちばん遅い来方でした。",
                   "タチウオは、来る時期も、来るかどうかも、年によって大きく違います。カレンダーより、その年の最近の釣果を見るのが確実です。"]},
        chap(4, "冬に向けて来る魚", ["メバル", "コブダイ"], 5, "最後は、これからの季節に来る魚です。", sprites=["メバル", "コブダイ"]),
        {"type": "compare", "heading": f"メバル（{HN}）：秋に戻ってきた日", "cols": ["来た日"], "chapter": 5, "rows": yrow(me), "note": f"{HN}の公開釣果。9月から数えて、1週間に2日以上報告された最初の日",
         "lines": [f"{HN}のメバルは、夏のあいだ報告が減り、秋に戻ってきます。戻った日は、{rng(me)}のあいだでした。"] +
                  ([f"今年は{md(me26)}に戻っています。これから冬にかけて、報告が多くなる季節です。"] if me26 else
                   [f"今年は、記録がある{md(H_LAST)}までには、まだ続けての報告は出ていませんでした。これから冬にかけて、報告が多くなる季節です。"])},
        {"type": "compare", "heading": f"コブダイ（{HN}）：来た日", "cols": ["来た日"], "chapter": 5, "rows": yrow(ko), "note": f"{HN}の公開釣果。9月から数えて、1週間に2日以上報告された最初の日",
         "lines": [f"コブダイは、{rng(ko)}のあいだに来ていました。毎年、11月の終わりから12月です。",
                   "冬に報告が増える魚です。今年も、もうすぐ来るころかもしれません。"]},
        chap(5, "きっちり度ランキング", ["差がいちばん小さい魚は？", "差が大きい魚は？"], 6, "では、8種類を、毎年の「きっちり度」で並べてみます。"),
        {"type": "rank", "heading": "毎年きっちり来る魚ランキング", "chapter": 6, "sprites": True,
         "items": [[lab, r["spread"], f"差{r['spread']}日", r["spr"]] for lab, r in rank], "note": "早い年と遅い年の「来た日」の差（小さいほど、毎年同じころに来る）",
         "lines": [f"早い年と遅い年の差が小さい順です。1位は春の青物で{ao['spread']}日。2位は{rank[1][0]}で{rank[1][1]['spread']}日でした。",
                   f"差が大きいのは、タチウオ、メバル、タコ。早い年と遅い年で、2か月前後も違います。"]},
        {"type": "cards", "heading": "なぜ、ずれる魚とそろう魚がいる？（考えられること）", "chapter": 6,
         "items": ["海の水温の上がり方・下がり方が年で違う", "エサになる小魚の量が年で違う", "釣りに行く人の数も、報告に入っている", "データだけでは、原因までは決められない"],
         "lines": ["なぜ、ずれる魚と、そろう魚がいるのでしょうか。海の水温の変わり方や、エサになる小魚の量は、年によって違います。",
                   "ただ、この記録には、釣りに行く人の数の変化も入っています。データだけでは、はっきりした原因までは決められません。"]},
        {"type": "cards", "heading": "まとめ", "chapter": 7,
         "items": [f"春の青物：毎年{rng(ao)}（差{ao['spread']}日）", f"ベラ・コブダイも、毎年ほぼ同じころ", "タコ・メバル・タチウオは、年で2か月前後ずれる", "ずれる魚は、その年の最近の釣果で判断"],
         "lines": ["まとめです。春の青物や、ベラ、コブダイは、毎年ほぼ同じころにやって来ます。カレンダーで予定を立てやすい魚です。",
                   "一方、タコやメバル、タチウオは、年によって2か月前後ずれます。こうした魚は、その年の最近の釣果を見て決めましょう。"]},
        ask(slug, 7),
        end(["魚が来た合図を、毎年の釣果で見つけてみてください。", "関西の最近の釣果は、ツレドキ関西で確認できます。"], 7),
    ]
    return {"slug": slug, "title": "【データで検証】魚が「来る日」は毎年同じ？ 6年分の釣果で調べた季節の始まり 青物・タコ・タチウオ", "thumb": "魚が来る日は毎年同じ？", "thumb_sub": "6年分の釣果で「季節の始まり」を検証",
            "tag": "データで見る釣り", "chapters": chapters, "scenes": sc, "links": ["/kansai/", "/species/"],
            "tags": ["釣果データ", "釣り 時期", "タチウオ 時期", "青物 春", "タコ 時期"], "sprites": ["ハマチ・ブリ", "タコ", "タチウオ", "メバル"]}


# ---------------- 海釣り公園で釣れた魚は何種類？ ----------------
def shurui():
    slug = "long-shurui"
    allsp = Counter(k for s in HD.values() for k in s)
    n_sp = len(allsp)
    once = sorted([k for k, v in allsp.items() if v == 1])
    rare = sorted([(v, k) for k, v in allsp.items() if 2 <= v <= 5])
    top = allsp.most_common(10)
    act, tot, mset = Counter(), Counter(), defaultdict(set)
    for d, s in HD.items():
        m = int(d[5:7])
        act[m] += 1
        tot[m] += len(s)
        mset[m] |= s
    avg = {m: tot[m] / act[m] for m in range(1, 13)}
    msp = {m: len(mset[m]) for m in range(1, 13)}
    six = sorted([d for d, s in HD.items() if len(s) == 6])
    dist = Counter(min(len(s), 4) for s in HD.values())
    # 「目立った釣果なし」の日（理由つき）
    nz, why = Counter(), Counter()
    for d, v in H_RAW.items():
        ks = list(v.get("s", {}))
        if ks and not real(v):
            nz[int(d[5:7])] += 1
            k = "".join(ks)
            why["寒波" if "寒波" in k else "台風" if "台風" in k else "悪天候・強風・雨" if any(x in k for x in ("悪天候", "強風", "強雨")) else "水潮" if "水潮" in k else "理由の書きこみなし"] += 1
    nzt = sum(nz.values())
    winter = nz[1] + nz[2] + nz[3]
    first_date = {k: min(d for d, s in HD.items() if k in s) for k, _ in allsp.items()}
    assert n_sp == 37, n_sp
    assert {"ヒラマサ", "カマス", "コウイカ", "クロソイ", "イワシ"} <= set(once), once
    assert max(avg, key=avg.get) == 11 and min(avg, key=avg.get) == 2, avg
    assert max(msp, key=msp.get) == 7 and min(msp, key=msp.get) == 2, msp
    assert why["寒波"] == max(v for k, v in why.items() if k != "理由の書きこみなし") and winter > nzt / 2, (why, nz)
    chapters = ["はじめに", "使ったデータ", "よく釣れる魚トップ10", "5年で1回だけの魚", "ときどき出る魚", "種類が多い月・少ない月", "釣果なしの日", "まとめ"]
    sc = [
        {"type": "hook", "chapter": 0, "lines": [
            f"神戸の{HN}。5年分の釣果の記録に出てきた魚は、名前の数で{n_sp}種類ありました。",
            f"その中には、5年でたった1回しか記録されなかった魚もいます。ヒラマサ、カマス、コウイカ。今日は、海釣り公園の「魚の種類」を数えてみます。"]},
        toc(chapters, "この動画の流れです。あなたが釣ったことのある魚がいくつあるか、数えながら見てください。"),
        {"type": "stat", "heading": "使ったデータ", "chapter": 1,
         "stats": [[f"{len(HD):,}", "日分", "2021年9月から"], [f"{n_sp}", "種類", "記録に出てきた魚の名前"], [f"{len(once)}", "種類", "5年で1回だけ"]],
         "note": f"{HN}の公開釣果（2021年9月〜2026年10月）",
         "lines": [f"使ったのは、{HN}が公開している釣果の記録、およそ{len(HD):,}日分です。", f"記録に出てきた魚の名前は{n_sp}種類。そのうち{len(once)}種類は、5年で1回だけでした。"]},
        {"type": "cards", "heading": "数え方の注意", "chapter": 1,
         "items": ["記録に書かれた「名前」の数を数えた", "「ウマヅラハギ」「ウマズラハギ」のような書き方の違いはまとめた", "同じ魚の別の呼び名が、別々に数えられている場合もある", "記録に書かれない魚もいる（小さな魚・エサ取りなど）"],
         "lines": ["数え方の注意です。数えたのは、記録に書かれた魚の名前の数です。カタカナの書き方の違いは、1つにまとめました。",
                   "ただ、同じ魚の別の呼び名が、別々に数えられている場合もあります。また、施設が記録に書かない小さな魚もいるはずです。数字は、目安として見てください。"]},
        chap(1, "よく釣れる魚トップ10", ["1位は？", "冬の魚と夏の魚"], 2, "まずは、報告が多い魚のランキングです。", sprites=["メバル", "ガシラ（カサゴ）"]),
        {"type": "rank", "heading": f"{HN}：報告が多い魚 1〜8位（日数）", "chapter": 2, "sprites": True,
         "items": [[k.split("（")[0], v, f"{v}日", k] for k, v in top[:8]], "note": f"{HN}の公開釣果。その魚が報告された日数（2021年9月〜2026年10月）",
         "lines": [f"報告があった日数の多い順です。1位は{top[0][0]}で{top[0][1]}日。2位は{top[1][0].split('（')[0]}で{top[1][1]}日でした。",
                   f"3位は{top[2][0]}、4位は{top[3][0]}。岩場にすむ根魚と、回ってくる青物が上位に並びました。"]},
        quiz(f"{HN}で、報告が多い魚の第1位は？", ["メバル", "アジ", "マダイ"], 0, 2, explain=f"{top[0][1]}日で第1位でした。冬から春に、報告が多い魚です。") if top[0][0] == "メバル" else None,
        {"type": "compare", "heading": "9位から14位", "cols": ["報告の日数"], "chapter": 2,
         "rows": [[k.split("（")[0], f"{v}日"] for k, v in allsp.most_common(14)[8:14]], "note": f"{HN}の公開釣果",
         "lines": [f"9位と10位は、{top[8][0].split('（')[0]}と{top[9][0].split('（')[0]}。その下に、カワハギ、アジ、アイナメ、アコウが続きます。",
                   "ここまでの魚は、毎年かならず季節がめぐってくる、この釣り場の「常連」です。",
                   "上位の魚だけで、記録のほとんどをしめています。でも、本当におもしろいのは、ここから先。めったに出てこない魚たちです。"]},
        chap(2, "5年で1回だけの魚", ["ヒラマサ", "カマス", "コウイカ"], 3, "では、いよいよ、5年で1回しか出てこなかった魚です。", sprites=["シオ（カンパチ）", "アオリイカ"]),
        {"type": "compare", "heading": "5年で1回だけ記録された魚", "cols": ["記録された日"], "chapter": 3,
         "rows": [[k, f"{first_date[k][:4]}年{md(first_date[k])}"] for k in sorted(once, key=lambda k: first_date[k])], "note": f"{HN}の公開釣果（2021年9月〜2026年10月）",
         "lines": [f"5年で1回だけ記録された魚は、{len(once)}種類でした。", f"ヒラマサは{first_date['ヒラマサ'][:4]}年の{md(first_date['ヒラマサ'])}。ブリと同じ仲間の青物です。",
                   f"カマスは{md(first_date['カマス'])}、コウイカは{md(first_date['コウイカ'])}。どちらも{first_date['カマス'][:4]}年の夏の、1日だけでした。"]},
        quiz("5年で1回だけ記録された魚。次のうち、入っていないのは？", ["ヒラマサ", "カマス", "ハマチ・ブリ"], 2, 3,
             explain=f"ハマチ・ブリは{allsp['ハマチ・ブリ']}日も記録がある、常連の魚です。同じ青物でも、ヒラマサは1回だけでした。"),
        {"type": "cards", "heading": "珍しい魚が釣れたら", "numbered": True, "chapter": 3,
         "items": ["名前が分からない魚は、受付で聞く", "知らない魚は、素手でさわらない", "写真を撮って、記録に残す", "食べられるか分からない魚は持ち帰らない"],
         "lines": ["もし、見たことのない魚が釣れたら。名前が分からないときは、受付で聞いてみましょう。毒のある魚もいるので、素手でさわらないことが大切です。",
                   "写真を撮っておけば、あとで調べられます。食べられるか分からない魚は、持ち帰らないようにしましょう。"]},
        chap(3, "ときどき出る魚", ["2〜5回の魚", "季節がある"], 4, "続いて、5年で2回から5回だけ記録された、「ときどき出る魚」です。", sprites=["イシダイ", "サゴシ（サワラ）"]),
        {"type": "compare", "heading": "5年で2〜5回だけ記録された魚", "cols": ["回数"], "chapter": 4,
         "rows": [[k, f"{v}回"] for v, k in sorted(rare, reverse=True)][:7], "note": f"{HN}の公開釣果",
         "lines": [f"2回から5回だけの魚は、{len(rare)}種類。ムラソイやイシガキダイは5回、タチウオとキスは2回だけでした。",
                   "タチウオは、大阪の岸和田一文字では秋の主役ですが、この釣り場では5年で2回だけ。同じ大阪湾のまわりでも、釣れる魚はずいぶん違います。"]},
        {"type": "cards", "heading": "ときどき出る魚にも、季節がある", "chapter": 4,
         "items": ["イシガキダイ：5回とも7〜10月", "サヨリ：5回のうち4回が12〜2月", "サゴシ：7〜11月", "ムラソイ：5回とも3〜5月"],
         "lines": ["回数は少なくても、出てくる季節には、まとまりがあります。イシガキダイは5回とも夏から秋。ムラソイは5回とも春でした。",
                   "珍しい魚にも、来やすい季節があるのかもしれません。夏から秋の水温が高い時期は、ふだん見ない魚に出会えるチャンスが、少し増えるようです。"]},
        chap(4, "種類が多い月・少ない月", ["1日に何種類？", "いちばんにぎやかな月"], 5, "次は、月ごとに、魚の種類の多さを比べます。"),
        {"type": "stat", "heading": "1日に報告された魚の種類", "chapter": 5,
         "stats": [[pct((dist[1] + dist[2]) / len(HD)).rstrip("%"), "%", "1〜2種類の日"], [pct((dist[3] + dist[4]) / len(HD)).rstrip("%"), "%", "3種類以上の日"], [f"{len(six)}", "日", "6種類の日（最多）"]],
         "note": f"{HN}の公開釣果。施設が記録した魚の名前の数",
         "lines": [f"1日の記録に出てくる魚は、1種類か2種類の日が{P((dist[1] + dist[2]) / len(HD))}。3種類以上の日は{P((dist[3] + dist[4]) / len(HD))}でした。",
                   f"いちばん多かったのは、1日に6種類。5年で{len(six)}日だけありました。"]},
        {"type": "compare", "heading": "月ごとの魚の種類", "cols": ["1日の平均", "その月に出た種類"], "chapter": 5,
         "rows": [[f"{m}月", f"{avg[m]:.1f}種類", f"{msp[m]}種類"] for m in (2, 4, 7, 8, 10, 11, 12)], "note": f"{HN}の公開釣果（月ごとに、5年分をまとめた）",
         "lines": [f"1日あたりの種類がいちばん多いのは11月で、平均{avg[11]:.1f}種類。いちばん少ないのは2月で、{avg[2]:.1f}種類でした。",
                   f"5年分をまとめて、その月に出てきた種類を数えると、7月が{msp[7]}種類でいちばん多く、8月が{msp[8]}種類、2月は{msp[2]}種類です。いろいろな魚に出会いたいなら夏、1日でたくさんの種類を釣るなら秋がねらい目です。"]},
        chap(5, "釣果なしの日", ["何月に多い？", "理由は？"], 6, "最後に、反対の話です。「目立った釣果なし」と書かれた日を数えました。"),
        {"type": "compare", "heading": "「目立った釣果なし」の日", "cols": ["日数"], "chapter": 6,
         "rows": [[k, f"{v}日"] for k, v in why.most_common()], "note": f"{HN}の公開釣果（記録に書かれた理由で分けた。2021年9月〜2026年10月）",
         "lines": [f"「目立った釣果なし」と書かれた日は、5年で{nzt}日。理由が書かれていた日では、「寒波」がいちばん多く、{why['寒波']}日でした。",
                   f"月で見ると、1月から3月の冬が{winter}日で、半分以上をしめます。寒波や強い風の日は、無理に出かけない日と考えましょう。"]},
        {"type": "cards", "heading": "まとめ", "chapter": 7,
         "items": [f"5年で記録された魚は{n_sp}種類", f"1回だけの魚は{len(once)}種類（ヒラマサ・カマスなど）", f"1日の種類は11月が最多、2月が最少", "釣果なしは、冬の寒波の日が多い"],
         "lines": [f"まとめです。{HN}の5年分の記録には、{n_sp}種類の魚が出てきました。ヒラマサやカマスのように、5年で1回だけの魚もいます。",
                   "1日に出会える魚の種類は、秋の11月がいちばん多く、冬の2月がいちばん少ない。次に行くときは、何種類釣れるか数えてみてください。"]},
        ask(slug, 7),
        end(["いつもの釣り場にも、まだ知らない魚がいるかもしれません。", "関西の最近の釣果は、ツレドキ関西で確認できます。"], 7),
    ]
    rare_q = {k: [d for d, s in HD.items() if k in s] for k in ("イシガキダイ", "サヨリ", "サゴシ（サワラ）", "ムラソイ")}
    assert all(7 <= int(d[5:7]) <= 10 for d in rare_q["イシガキダイ"]) and len(rare_q["イシガキダイ"]) == 5
    assert sum(int(d[5:7]) in (12, 1, 2) for d in rare_q["サヨリ"]) == 4 and len(rare_q["サヨリ"]) == 5
    assert all(7 <= int(d[5:7]) <= 11 for d in rare_q["サゴシ（サワラ）"])
    assert all(3 <= int(d[5:7]) <= 5 for d in rare_q["ムラソイ"]) and len(rare_q["ムラソイ"]) == 5
    assert allsp["タチウオ"] == 2 and allsp["キス"] == 2
    return {"slug": slug, "title": "【データで見る】海釣り公園で釣れた魚は何種類？ 5年分の釣果で数えた「1回だけの魚」と、にぎやかな月", "thumb": "釣れた魚は何種類？", "thumb_sub": "5年で1回だけの魚もいた",
            "tag": "データで見る釣り", "chapters": chapters, "scenes": sc, "links": ["/species/", "/kansai/"],
            "tags": ["平磯海づり公園", "海釣り公園", "釣果データ", "珍しい魚", "釣れる魚"], "sprites": ["メバル", "ガシラ（カサゴ）", "ハマチ・ブリ", "マダイ"]}


# ---------------- 「大阪で釣れたら神戸でも釣れる」は本当？ ----------------
BOTH = sorted(set(KD) & set(HD))


def same_day(ks, hs, months=None, lag=0):
    """岸和田一文字で ks が出た日／出なかった日に、lag日後の平磯で hs が出た割合"""
    a = b = c = e = 0
    for d in KD:
        if months and int(d[5:7]) not in months:
            continue
        hd = (date.fromisoformat(d) + timedelta(days=lag)).isoformat()
        if hd not in HD:
            continue
        if ks in KD[d]:
            a += 1
            b += hs in HD[hd]
        else:
            c += 1
            e += hs in HD[hd]
    return (b / a if a else 0), (e / c if c else 0), a, c


def osaka_kobe():
    slug = "long-osaka-kobe"
    PAIRS = [("青物", AO, "ハマチ・ブリ", "ハマチ・ブリ"), ("アジ", "アジ・サバ・イワシ", "アジ", "アジ"), ("カワハギ", "カワハギ", "カワハギ", "カワハギ"),
             ("グレ", "グレ（メジナ）", "グレ（メジナ）", "グレ（メジナ）"), ("チヌ", "チヌ（クロダイ）", "チヌ（クロダイ）", "チヌ（クロダイ）"), ("スズキ", "スズキ", "スズキ", "スズキ")]
    allr = {lab: same_day(k, h) for lab, k, h, _ in PAIRS}
    ao = allr["青物"]
    ao_s = same_day(AO, "ハマチ・ブリ", [9])
    ao_so = same_day(AO, "ハマチ・ブリ", [9, 10])
    aj8 = same_day("アジ・サバ・イワシ", "アジ", [8])
    kw = same_day("カワハギ", "カワハギ", [9, 10, 11])
    lags = [same_day(AO, "ハマチ・ブリ", [9, 10], lag=k) for k in (0, 1, 2, 3)]
    oct_k = mrate(KD, AO, [10])
    kr, hr = mrate(KD, AO), mrate(HD, "ハマチ・ブリ")
    ka, ha = mrate(KD, "アジ・サバ・イワシ"), mrate(HD, "アジ")
    kt, ht = mrate(KD, "タコ"), mrate(HD, "タコ")
    kc, hc = mrate(KD, "チヌ（クロダイ）"), mrate(HD, "チヌ（クロダイ）")
    assert ao[0] - ao[1] > 0.15 and abs(ao_so[0] - ao_so[1]) < 0.15 and abs(aj8[0] - aj8[1]) < 0.05, (ao, ao_so, aj8)
    assert all(abs(x[0] - lags[0][0]) < 0.05 for x in lags), lags
    assert oct_k > 0.95 and kr[3] > 0.5 and hr[3] < 0.05 and hr[5] < 0.15 and hr[8] > 0.5, (oct_k, kr, hr)
    assert max(range(12), key=lambda m: kc[m]) == 2 and max(range(12), key=lambda m: hc[m]) == 1
    assert kt[6] > 0.95 and max(ht) < 0.15 and max(range(12), key=lambda m: ka[m]) == 4 and max(range(12), key=lambda m: ha[m]) == 7, (kt, ht, ka, ha)
    chapters = ["はじめに", "2つの釣り場", "同じ日の釣果", "季節をそろえると", "次の日なら？", "来る季節がちがう", "釣果情報の見方", "まとめ"]
    sc = [
        {"type": "hook", "chapter": 0, "lines": [
            f"大阪の岸和田一文字で青物が報告された日。神戸の平磯海づり公園でも、ハマチ・ブリが報告されていた割合は{P(ao[0])}。報告がなかった日は、{P(ao[1])}でした。",
            "数字だけ見ると、「大阪で釣れたら神戸でも釣れる」は本当に見えます。でも、季節をそろえて比べると、答えは変わりました。"]},
        toc(chapters),
        chap(1, "2つの釣り場", ["大阪・岸和田一文字", "神戸・平磯海づり公園", "直線でおよそ30キロ"], 1, "まず、比べる2つの釣り場です。", sprites=["ハマチ・ブリ", "アジ"]),
        {"type": "compare", "heading": "比べる2つの釣り場", "cols": ["岸和田一文字", "平磯海づり公園"], "chapter": 1,
         "rows": [["場所", "大阪府岸和田市の沖", "神戸市垂水区"], ["種類", "沖の堤防（渡船で渡る）", "海釣り施設"], ["記録", f"{len(KD):,}日分（2020年から）", f"{len(HD):,}日分（2021年から）"], ["両方に記録がある日", f"{len(BOTH):,}日", ""]],
         "note": SRC,
         "lines": ["1つめは、大阪府岸和田市の沖にある、岸和田一文字。渡船で渡る沖の堤防です。2つめは、神戸市垂水区の平磯海づり公園。海釣り施設です。",
                   f"2つの釣り場は、大阪湾をはさんで、直線でおよそ30キロ。同じ日に、両方に釣果の記録がある日が{len(BOTH):,}日ありました。この日どうしを比べます。"]},
        {"type": "cards", "heading": "数字を見る前に", "chapter": 1,
         "items": ["数えたのは「その魚が報告された日の割合」", "釣れなかった人の数は分からない", "魚の呼び方が釣り場で違う（青物／ハマチ・ブリ）", "2か所だけの比べっこ。関西全体の目安"],
         "lines": ["数えたのは、その魚が報告された日の割合です。釣れなかった人の数は、記録にありません。",
                   "また、釣り場によって魚の呼び方が違います。岸和田一文字の「青物」と、平磯の「ハマチ・ブリ」を、同じ青物として比べました。"]},
        chap(2, "同じ日の釣果", ["青物", "アジ", "カワハギほか"], 2, "では、同じ日の釣果を比べます。"),
        {"type": "compare", "heading": "岸和田一文字で出た日／出なかった日、同じ日の平磯は？", "cols": ["岸和田で出た日", "出なかった日"], "chapter": 2,
         "rows": [[lab, pct(y), pct(n)] for lab, (y, n, a, c) in allr.items()], "note": "両方に記録がある日で集計。数字は平磯でその魚が報告された割合",
         "lines": [f"岸和田一文字で青物が出た日は、平磯でも{P(ao[0])}。出なかった日は{P(ao[1])}。およそ{ao[0] / ao[1]:.0f}倍の差です。",
                   f"カワハギも、{P(allr['カワハギ'][0])}と{P(allr['カワハギ'][1])}。アジ、グレ、チヌ、スズキも、少しずつですが、岸和田で出た日のほうが平磯でも出ています。"]},
        quiz("この差。いちばん大きな理由は、何だと思いますか？", ["魚が大阪から神戸へ泳いでいく", "季節が同じだから", "同じ人が両方で釣っている"], 1, 2,
             explain="同じ日は、同じ季節です。青物の季節には、どちらの釣り場でも青物が出やすい。次の章で、たしかめます。"),
        chap(3, "季節をそろえると", ["9月・10月だけで比べる", "差はほとんど消える"], 3, "そこで、同じ季節の中だけで比べてみます。", sprites=["ハマチ・ブリ"]),
        {"type": "cards", "heading": "季節が混ざると、差が大きく見える", "chapter": 3,
         "items": ["秋はどちらの釣り場も青物が多い", "冬と春は、平磯ではほとんど出ない", "→ 1年まとめると、季節の分だけ差が出る", "同じ月の中で比べれば、季節の影響が消える"],
         "lines": ["秋は、どちらの釣り場でも青物がよく出ます。冬や春は、平磯ではほとんど出ません。", "1年をまとめて比べると、この季節の違いだけで、大きな差が出てしまいます。"]},
        {"type": "compare", "heading": "同じ季節の中で比べると", "cols": ["岸和田で出た日", "出なかった日"], "chapter": 3,
         "rows": [["青物（9月）", pct(ao_s[0]), pct(ao_s[1])], ["青物（9〜10月）", pct(ao_so[0]), pct(ao_so[1])], ["アジ（8月）", pct(aj8[0]), pct(aj8[1])], ["カワハギ（9〜11月）", pct(kw[0]), pct(kw[1])]],
         "note": "両方に記録がある日で集計。数字は平磯でその魚が報告された割合",
         "lines": [f"9月と10月だけで比べると、青物は{P(ao_so[0])}と{P(ao_so[1])}。差はぐっと小さくなりました。",
                   f"8月のアジは{P(aj8[0])}と{P(aj8[1])}で、ほとんど同じ。カワハギは、秋だけで比べると、{P(kw[0])}と{P(kw[1])}でした。",
                   "つまり、同じ季節の中では、岸和田一文字で釣れたかどうかは、平磯の釣果をほとんど教えてくれませんでした。"]},
        {"type": "stat", "heading": "10月の岸和田一文字", "chapter": 3,
         "stats": [[pct(oct_k).rstrip("%"), "%", "青物が報告された日"], [pct(mrate(HD, "ハマチ・ブリ", [10])).rstrip("%"), "%", "同じ10月の平磯"]],
         "note": SRC,
         "lines": [f"たとえば10月。岸和田一文字では、{P(oct_k)}の日で青物が報告されています。ほぼ毎日です。",
                   f"同じ10月、平磯のハマチ・ブリは{P(mrate(HD, 'ハマチ・ブリ', [10]))}。岸和田で毎日釣れていても、平磯では出る日と出ない日がありました。"]},
        chap(4, "次の日なら？", ["1日後・2日後・3日後", "群れは動いてくる？"], 4, "では、大阪で釣れた次の日に、神戸にやって来る、ということはあるのでしょうか。"),
        {"type": "compare", "heading": "岸和田で青物が出た日から、◯日後の平磯（9〜10月）", "cols": ["出た日から", "出なかった日から"], "chapter": 4,
         "rows": [[["同じ日", "1日後", "2日後", "3日後"][k], pct(y), pct(n)] for k, (y, n, a, c) in enumerate(lags)], "note": "9〜10月。数字は平磯でハマチ・ブリが報告された割合",
         "lines": ["同じ日、1日後、2日後、3日後で比べました。どれも、平磯で報告された割合は、ほとんど変わりません。",
                   "大阪で釣れた群れが、次の日に神戸へ移ってくる、という様子は、このデータからは見えませんでした。"]},
        chap(5, "来る季節がちがう", ["春の青物", "アジ", "タコ"], 5, "では、2つの釣り場は、何がちがうのでしょうか。いちばん大きいのは、季節です。", sprites=["ハマチ・ブリ", "アジ", "タコ"]),
        {"type": "season", "labels": ["青物（岸和田）", "ブリ類（平磯）", "アジ類（岸和田）", "アジ（平磯）"], "rates": [kr, hr, ka, ha], "chapter": 5, "note": SRC + "で、その魚が報告された日の割合（ブリ類＝ハマチ・ブリ、アジ類＝アジ・サバ・イワシ）",
         "lines": [f"月ごとのカレンダーで比べます。上の2段が青物です。岸和田一文字は、4月に{P(kr[3])}、5月に{P(kr[4])}と、春にも青物の季節があります。",
                   f"ところが平磯は、4月は{P(hr[3])}、5月は{P(hr[4])}。春の青物は、ほとんど出ていません。平磯で増えるのは、夏の終わりから秋です。",
                   f"下の2段はアジです。岸和田一文字は、5月の{P(ka[4])}がいちばん多く、春から秋まで長く続きます。平磯のアジは、8月の{P(ha[7])}が山で、短い夏の季節です。"]},
        {"type": "season", "labels": ["タコ（岸和田）", "タコ（平磯）", "チヌ（岸和田）", "チヌ（平磯）"], "rates": [kt, ht, kc, hc], "chapter": 5, "note": SRC + "で、その魚が報告された日の割合",
         "lines": [f"いちばん違うのはタコです。岸和田一文字では、7月は{P(kt[6])}。報告がある日は、毎日タコが出ています。",
                   f"平磯では、いちばん多い月でも{P(max(ht))}。同じ大阪湾のまわりでも、釣り場の底のようすや、狙う人によって、釣れる魚はこれだけ違います。",
                   f"チヌは、どちらも春に多い魚ですが、山の月がずれています。岸和田一文字は3月の{P(kc[2])}、平磯は2月の{P(hc[1])}がいちばんでした。",
                   "同じ魚でも、釣り場ごとに、多い季節も、多さも違う。これが、同じ日の釣果がそろわない理由の1つです。"]},
        chap(6, "釣果情報の見方", ["行く釣り場の釣果", "似た釣り場の釣果", "季節のカレンダー"], 6, "では、釣果情報は、どう見ればいいのでしょうか。"),
        {"type": "cards", "heading": "釣果情報の見方", "numbered": True, "chapter": 6,
         "items": ["まず、行く釣り場そのものの最近の釣果", "次に、すぐ近くで、似た形の釣り場", "遠くの釣り場は「季節が来たか」の目安に", "その釣り場の、季節のカレンダーも見る"],
         "lines": ["いちばん頼りになるのは、行く釣り場そのものの、最近の釣果です。その次は、すぐ近くで、形の似た釣り場。",
                   "30キロはなれた釣り場の釣果は、同じ日の答えにはなりません。「そろそろ季節が来たか」を知る目安として使いましょう。そして、その釣り場の季節のカレンダーも確かめます。"]},
        {"type": "cards", "heading": "まとめ", "chapter": 7,
         "items": [f"1年まとめると、青物は{pct(ao[0])}と{pct(ao[1])}で差がある", "でも、同じ季節の中では、差はほとんどない", "次の日に神戸へ来る様子も見えない", "釣り場ごとに、来る季節がちがう"],
         "lines": ["まとめです。「大阪で釣れたら神戸でも釣れる」は、1年まとめて見ると本当に見えます。でもそれは、同じ季節だから、というのが大きな理由でした。",
                   "季節をそろえると、差はほとんど消えます。釣り場ごとに、魚の来る季節も違います。行く釣り場の釣果を、いちばん大事にしましょう。"]},
        ask(slug, 7),
        end(["釣果情報は、どこの、いつの数字かを見るのが大切です。", "関西の釣り場ごとの釣果は、ツレドキ関西で確認できます。"], 7),
    ]
    return {"slug": slug, "title": "【データで検証】「大阪で釣れたら神戸でも釣れる」は本当？ 2つの釣り場の同じ日の釣果を比べた", "thumb": "大阪で釣れたら神戸も？", "thumb_sub": "同じ日の釣果を2か所で比べた",
            "tag": "データで見る釣り", "chapters": chapters, "scenes": sc, "links": ["/kansai/", "/shio/kishiwada-ichimonji/"],
            "tags": ["釣果情報", "釣果データ", "岸和田一文字", "平磯海づり公園", "青物"], "sprites": ["ハマチ・ブリ", "アジ", "タコ"]}


# ---------------- 季節当てクイズ20問 ----------------
def _rates(days):
    act, hit = Counter(), defaultdict(Counter)
    for d, s in days.items():
        m = int(d[5:7])
        act[m] += 1
        for x in s:
            hit[x][m] += 1
    return {x: {m: (hit[x][m] + 0.5) / (act[m] + 1) for m in range(1, 13)} for x in hit}


def _ll(R, s, m):
    return sum(math.log(R[x][m]) for x in s) + sum(math.log(1 - R[x][m]) for x in R if x not in s)


def kisetsu_quiz():
    slug = "long-kisetsu-quiz"
    KQ = {d: s - {"カレイ", "キス"} for d, s in KD.items()}  # 岸和田一文字のカレイ・キスは記録が同じ日に重なっていて区別できないので使わない
    data = {KN: (KQ, _rates(KQ)), HN: (HD, _rates(HD))}
    SLOTS = [(HN, 1), (KN, 8), (HN, 6), (KN, 11), (HN, 4), (KN, 3), (HN, 9), (KN, 6), (HN, 7), (KN, 10),
             (HN, 8), (KN, 5), (HN, 11), (KN, 7), (HN, 3), (KN, 9), (HN, 5), (KN, 12), (HN, 10), (KN, 4)]
    qs, used = [], set()
    for spot, m in SLOTS:
        days, R = data[spot]
        opts = sorted({m, (m + 3) % 12 + 1, (m + 7) % 12 + 1})
        others = [o for o in opts if o != m]
        cnt = Counter(x for v in days.values() for x in v)

        def keyof(s):
            return max(s, key=lambda x: R[x][m] - max(R[x][o] for o in others))

        best = None
        for d, s in days.items():
            if int(d[5:7]) != m or not 3 <= len(s) <= 4 or min(cnt[x] for x in s) < 30 or frozenset(s) in used:
                continue
            k = keyof(s)
            if R[k][m] - max(R[k][o] for o in others) < 0.2:
                continue
            ll = {o: _ll(R, s, o) for o in opts}
            mg = ll[m] - max(v for o, v in ll.items() if o != m)
            if best is None or mg > best[0]:
                best = (mg, d, s)
        assert best and best[0] > 1.0, (spot, m, best)
        mg, d, s = best
        used.add(frozenset(s))
        key = keyof(s)
        rate = mrate(days, key)
        qs.append((spot, m, d, sorted(s, key=lambda x: -R[x][m]), opts, key, rate, others))
    chapters = ["はじめに", "第1〜7問", "第8〜14問", "第15〜20問", "結果発表", "まとめ"]
    sc = [
        {"type": "hook", "chapter": 0, "lines": [
            f"{'、'.join(x.split('（')[0] for x in qs[-1][3])}。{qs[-1][0]}で、本当にあった、ある1日の釣果です。これは、何月だと思いますか？",
            "釣れた魚の顔ぶれだけで、季節を当てるクイズです。問題は、本当の釣果の記録から出しました。全20問。何問当てられるでしょうか。"]},
        {"type": "cards", "heading": "遊び方", "numbered": True, "chapter": 0,
         "items": ["本当にあった、ある1日の釣果を見せる", "何月の釣果か、3つから選ぶ", "選ぶ月は、4か月ずつはなれている", "正解の数を数えておく"],
         "lines": ["遊び方です。岸和田一文字か平磯海づり公園の、本当にあった1日の釣果を見せます。", "その日が何月だったかを、3つの中から選んでください。選ぶ月は、4か月ずつはなれています。"]},
        {"type": "cards", "heading": "ヒント：記録の見方", "chapter": 0,
         "items": ["魚の名前は、施設の記録のまま", "岸和田一文字の「青物」は、ブリの仲間など", "1日に記録される魚は2〜4種類が多い", "決め手は「その季節にしか出ない魚」"],
         "lines": ["ヒントです。魚の名前は、施設の記録のままです。岸和田一文字の「青物」は、ブリの仲間などをまとめた呼び方です。", "決め手になるのは、その季節にしか出てこない魚。季節の主役を思い出しながら、考えてみてください。"]},
    ]
    THINK = ["考えてみてください。", "さあ、何月でしょう？", "どれだと思いますか？"]
    for i, (spot, m, d, s, opts, key, rate, others) in enumerate(qs):
        lv = 1 + (i >= 7) + (i >= 14)
        if i in (0, 7, 14):
            sc.append(chap(lv, chapters[lv], ["岸和田一文字", "平磯海づり公園"], lv, ["まずは、第1問から第7問です。", "続いて、第8問から第14問。", "最後は、第15問から第20問です。"][lv - 1]))
        names = "、".join(x.split("（")[0] for x in s)
        kn, r = key.split("（")[0], P(rate[m - 1])
        qline = [f"第{i + 1}問。{spot}。この日の釣果は、{names}。", f"第{i + 1}問。舞台は{spot}。{names}が釣れた日です。", f"第{i + 1}問。{spot}で、{names}。",
                 f"第{i + 1}問。{names}。{spot}の、ある日の記録です。"][i % 4]
        ol = [f"{opts[0]}月か、{opts[1]}月か、{opts[2]}月か。", "".join(f"{j + 1}、{o}月。" for j, o in enumerate(opts)), f"選ぶのは、{opts[0]}月、{opts[1]}月、{opts[2]}月。"][i % 3]
        tip = {"メバル": "冬から春に、報告が多い魚です。", "タコ": "夏の岸和田一文字では、ほぼ毎日の常連です。", "ベラ": "冬は報告がなく、春の終わりに戻ってきます。",
               "青物": "秋から年末にかけての、沖の堤防の主役です。", "カレイ": "平磯では、冬より春に多い魚でした。", "スズキ": "岸和田一文字では、冬の終わりから春が山です。",
               "カワハギ": "夏の終わりから秋に増える魚です。", "タチウオ": "秋だけ、短い期間に集中して釣れる魚です。", "アジ": "平磯では、真夏の短い季節に集中します。",
               "ヒラメ": "秋の終わりから冬に、報告が増える魚です。", "ハマチ・ブリ": "平磯では、夏の終わりから秋に増えます。", "アジ・サバ・イワシ": "春の5月が、いちばん多い月でした。"}.get(kn, "")
        exp = [f"決め手は、{kn}。{m}月は{r}の日で報告される魚です。", f"{kn}がヒントでした。この釣り場の{m}月は、{r}の日で出ています。",
               f"ポイントは{kn}。{m}月の報告は{r}。", f"{kn}を見て分かった人は、するどい。{m}月の報告は{r}でした。"][(i + i // 4) % 4] + tip
        sc.append({"type": "quiz", "q": f"Q{i + 1}　{spot}「{names}」何月？", "options": [f"{o}月" for o in opts], "answer": opts.index(m), "chapter": lv,
                   "lines": [qline + ol, THINK[i % 3], f"正解は、{m}月。{exp}"]})
    sc += [
        {"type": "rank", "heading": "あなたの「季節の感覚」は？", "chapter": 4,
         "items": [["18〜20問：釣り暦の名人", 20, "名人"], ["14〜17問：上級", 17, "上級"], ["9〜13問：中級", 13, "中級"], ["0〜8問：これから", 8, "これから"]],
         "lines": ["結果発表です。18問以上当てた人は、釣り暦の名人。14問から17問は上級です。", "9問から13問は中級。8問までの人も、大丈夫。釣り場に通ううちに、季節ごとの顔ぶれは自然と覚えていきます。"]},
        {"type": "cards", "heading": "季節を教えてくれる魚", "chapter": 5,
         "items": ["冬：メバル・コブダイ・スズキ", "春：カレイ（平磯）・チヌ（岸和田）", "夏：タコ・アジ", "秋：青物・カワハギ・タチウオ"],
         "lines": ["今日のクイズで、季節を教えてくれた魚をまとめます。冬はメバルやコブダイ、スズキ。春は、平磯のカレイや、岸和田一文字のチヌ。",
                   "夏はタコとアジ。秋は、青物やカワハギ、タチウオです。釣果を見て、その季節の主役がそろってきたら、季節が進んだ合図です。"]},
        {"type": "cards", "heading": "このクイズのデータについて", "chapter": 5,
         "items": ["問題の日は、本当の記録から選んだ", "その月らしい日を選んでいる（例外の日もある）", "2か所だけ。ほかの釣り場では変わる", "年によって、季節は前後する"],
         "lines": ["問題の日は、本当の記録から、その月らしい日を選びました。ほかの月にも、似た顔ぶれの日はあります。", "また、2つの釣り場だけの記録です。ほかの釣り場や、年によっては、季節は前後します。"]},
        ask(slug, 5),
        end(["釣れた魚の顔ぶれで、季節がわかるようになると、釣りはもっと楽しくなります。", "関西の最近の釣果は、ツレドキ関西で確認できます。"], 5),
    ]
    return {"slug": slug, "title": "【季節当てクイズ20問】この日の釣果、何月？ 釣れた魚だけで季節を当てる 本当の釣果記録から出題", "thumb": "この釣果、何月？", "thumb_sub": "釣れた魚だけで季節を当てる20問",
            "tag": "釣りクイズ", "chapters": chapters, "scenes": sc, "links": ["/kansai/", "/species/"],
            "tags": ["釣りクイズ", "釣果データ", "釣れる魚 季節", "メバル", "タコ"], "sprites": ["メバル", "タコ", "ハマチ・ブリ", "カワハギ"]}


# ---------------- 釣った魚の食中毒を防ぐ ----------------
def shokuchudoku():
    slug = "long-shokuchudoku"
    chapters = ["はじめに", "知っておきたい3つ", "アニサキス", "アニサキスを防ぐ", "ヒスタミン", "腸炎ビブリオ", "持ち帰りと下ごしらえ", "よくある疑問", "まとめ"]
    MH = "厚生労働省「アニサキスによる食中毒を予防しましょう」ほか"
    sc = [
        {"type": "hook", "chapter": 0, "lines": [
            "酢でしめても、塩をしても、しょうゆやわさびをつけても、アニサキスは死にません。厚生労働省は、こう呼びかけています。",
            "釣った魚を、安全においしく食べるために。厚生労働省や消費者庁、府県の情報から、食中毒の防ぎ方をまとめました。"]},
        toc(chapters, "この動画の流れです。最後に、ブリの身から出てくる虫など、よくある疑問にも答えます。"),
        {"type": "stat", "heading": "食中毒の原因（全国・事件数）", "chapter": 1,
         "stats": [["330", "件", "2024年 アニサキス（第1位）"], ["280", "件", "2025年 アニサキス（第2位）"], ["1,172", "件", "2025年 食中毒の事件数"]],
         "note": "厚生労働省のまとめ（群馬県・京都府のページより）",
         "lines": ["まず、数字です。厚生労働省のまとめでは、2024年の食中毒の原因で、いちばん多かったのがアニサキスで、330件でした。",
                   "2025年は、ノロウイルスの462件に次いで、アニサキスが280件で第2位。毎年、上位に入る原因です。"]},
        {"type": "cards", "heading": "釣った魚で、知っておきたい3つ", "numbered": True, "chapter": 1,
         "items": ["アニサキス：魚にいる寄生虫", "ヒスタミン：青魚などを常温に置くとできる", "腸炎ビブリオ：海の水にいる細菌（夏に多い）"],
         "lines": ["釣った魚で知っておきたいのは、この3つです。魚にいる寄生虫のアニサキス。魚を常温に置くとできる、ヒスタミン。そして、海の水にいる細菌、腸炎ビブリオ。",
                   "どれも、知っていれば防げます。順番に見ていきましょう。"]},
        chap(1, "アニサキス", ["どんな魚にいる？", "どんな症状？"], 2, "1つめは、アニサキスです。", sprites=["サバ", "アジ", "イワシ"]),
        {"type": "cards", "heading": "アニサキスがいる魚（例）", "chapter": 2,
         "items": ["サバ・アジ・イワシ", "サンマ・カツオ・サケ", "ヒラメ・マグロ・イカ など", "主に、内臓の表面にいる"], "note": "厚生労働省",
         "lines": ["厚生労働省によると、アニサキスは、サバ、アジ、サンマ、カツオ、イワシ、サケ、ヒラメ、マグロ、イカなどにいます。", "主にいるのは、内臓の表面です。堤防でよく釣れる、アジやサバ、イワシも入っています。"]},
        {"type": "cards", "heading": "アニサキスの症状", "chapter": 2,
         "items": ["生の魚を食べてから、1時間〜数日で出る", "胃：12時間以内に、みぞおちの激しい痛み・吐き気", "腸：十数時間以降に、激しい下腹部の痛み", "じんましんなどが出ることも"], "note": "厚生労働省",
         "lines": ["症状は、生の魚を食べてから、1時間から数日で出ます。胃に入った場合は、12時間以内に、みぞおちの激しい痛みや、吐き気が起きます。",
                   "腸に入った場合は、十数時間以降に、激しい下腹部の痛み。じんましんなどのアレルギーの症状が出ることもあります。おかしいと思ったら、早めに医療機関へ。"]},
        chap(2, "アニサキスを防ぐ", ["冷凍", "加熱", "内臓を早く取る"], 3, "では、どう防げばいいのでしょうか。"),
        quiz("厚生労働省が示す、アニサキスを防ぐ冷凍の条件は？", ["-5℃で1日", "-20℃で24時間以上", "-10℃で半日"], 1, 3,
             explain="厚生労働省が示す条件です。家で冷凍するときも、この温度と時間を目安にしましょう。"),
        {"type": "cards", "heading": "アニサキスを防ぐ方法", "numbered": True, "chapter": 3,
         "items": ["冷凍：-20℃で24時間以上", "加熱：70℃以上、または60℃で1分", "内臓を早く取り除く・内臓を生で食べない", "目で見て、虫を取り除く"], "note": MH,
         "lines": ["防ぎ方は4つです。まず冷凍。マイナス20度で24時間以上。加熱なら、70度以上、または60度で1分です。",
                   "そして、内臓を早く取り除くこと、内臓を生で食べないこと。さばくときは、目でよく見て、虫がいたら取り除きます。"]},
        {"type": "cards", "heading": "これでは死なない", "chapter": 3,
         "items": ["酢でしめる", "塩をする", "しょうゆ・わさびをつける", "→ どれも、アニサキスは死なない"], "note": "厚生労働省",
         "lines": ["一方で、ふつうの料理で使う酢、塩漬け、しょうゆやわさびでは、アニサキスは死にません。", "しめサバでも安心とは言えません。生で食べるなら、冷凍するか、よく見て取り除くことが大切です。"]},
        chap(3, "ヒスタミン", ["青物・サバに多い", "加熱しても減らない"], 4, "2つめは、ヒスタミンによる食中毒です。", sprites=["サバ", "ハマチ・ブリ"]),
        {"type": "cards", "heading": "ヒスタミン食中毒とは", "chapter": 4,
         "items": ["原因：サバ・ブリ・イワシ・マグロなど赤身の魚", "魚を常温に置くと、菌がヒスタミンをつくる", "菌は海の水にいて、釣ったときから付いていることも", "症状：食べてすぐ〜1時間以内に、顔が赤くなる・頭痛・じんましん"],
         "note": "消費者庁・東京都保健医療局",
         "lines": ["ヒスタミンの食中毒は、サバやブリ、イワシ、マグロなど、赤身の魚で多く起きます。", "ヒスタミンをつくる菌は、海の水にいて、釣ったときにすでに魚に付いていることがあります。魚を常温に置いておくと、この菌がヒスタミンをつくります。",
                   "症状は、食べた直後から1時間以内。口のまわりや耳たぶが赤くなったり、頭痛、じんましんが出たりします。"]},
        quiz("ヒスタミン。一度できてしまったら、加熱するとどうなる？", ["なくなる", "半分になる", "減らない"], 2, 4,
             explain="消費者庁によると、ヒスタミンは一度できると、加熱しても減りません。焼いても、煮ても、だめなのです。"),
        {"type": "cards", "heading": "ヒスタミンを防ぐ", "numbered": True, "chapter": 4,
         "items": ["釣ったら、すぐクーラーボックスへ", "常温に置きっぱなしにしない", "エラ・内臓は、早めに取る", "口や舌がピリピリしたら、食べない"], "note": "消費者庁",
         "lines": ["消費者庁は、自分で釣った魚でも、すぐクーラーボックスに入れるなど、常温に置きっぱなしにしないように、と呼びかけています。",
                   "エラや内臓は菌が多いので、早めに取りましょう。食べたとき、唇や舌にピリピリした刺激を感じたら、食べずに捨ててください。"]},
        chap(4, "腸炎ビブリオ", ["海の水にいる細菌", "夏に多い", "真水に弱い"], 5, "3つめは、腸炎ビブリオです。"),
        {"type": "cards", "heading": "腸炎ビブリオとは", "chapter": 5,
         "items": ["海の水や、海の泥にいる細菌", "塩分が好きで、真水に弱い", "水温15度以上で活発。7〜9月に多い", "症状：10〜24時間後、激しい腹痛・下痢"], "note": "大阪府・和歌山県",
         "lines": ["腸炎ビブリオは、海の水や、海の泥にいる細菌です。和歌山県によると、水温が15度以上になると活発になり、食中毒は7月から9月の夏に集中します。",
                   "大阪府によると、37度前後なら10分で倍に増えるほど、増えるのが速い菌です。食べてから10時間から24時間で、激しい腹痛や下痢が起きます。"]},
        {"type": "cards", "heading": "腸炎ビブリオを防ぐ", "numbered": True, "chapter": 5,
         "items": ["調理の前に、水道水でよく洗う", "冷蔵庫で、できれば4度以下", "魚を切ったまな板で、野菜を切らない", "調理したら、早めに食べる"], "note": "和歌山県・大阪府",
         "lines": ["この菌は、真水に弱いのが弱点です。調理の前に、魚を水道水でよく洗いましょう。", "少しの時間でも、冷蔵庫で、できれば4度以下に。魚を切ったまな板で、そのまま野菜を切らないことも大切です。"]},
        chap(5, "持ち帰りと下ごしらえ", ["釣り場で", "家に帰ったら"], 6, "ここまでを、釣り場から台所までの流れにまとめます。"),
        {"type": "cards", "heading": "釣り場で", "numbered": True, "chapter": 6,
         "items": ["クーラーボックスと氷を用意しておく", "釣れたら、すぐに冷やす", "日なたや足元に、魚を置きっぱなしにしない"],
         "lines": ["釣り場では、クーラーボックスと氷を、先に用意しておきます。釣れたら、すぐに冷やす。", "日なたや足元に、魚を置きっぱなしにしないことが、ヒスタミンを防ぐ、いちばんの近道です。"]},
        {"type": "cards", "heading": "家に帰ったら", "numbered": True, "chapter": 6,
         "items": ["すぐに内臓とエラを取る", "水道水でよく洗う", "まな板・包丁は、魚と野菜で分ける", "生で食べるなら、冷凍するか、よく見て虫を取る"], "note": "農林水産省・消費者庁・和歌山県",
         "lines": ["家に帰ったら、すぐに内臓とエラを取ります。農林水産省も、丸ごとの魚は、よく冷やして持ち帰り、すぐ内臓を取るよう勧めています。",
                   "水道水でよく洗い、まな板は野菜と分けます。刺身で食べるなら、冷凍するか、目でよく見て虫を取り除きましょう。"]},
        chap(6, "よくある疑問", ["ブリの身に虫？", "釣ったフグは？", "シガテラは？"], 7, "最後に、よくある疑問です。", sprites=["ハマチ・ブリ", "イシダイ"]),
        {"type": "cards", "heading": "ブリの身から、ミミズのような虫が出てきた", "chapter": 7,
         "items": ["「ブリ糸状虫」という寄生虫のことが多い", "人には寄生しない（農林水産省）", "見つけたら取り除けばよい", "ただし、アニサキスの場合もあるので、よく見る"], "note": "農林水産省",
         "lines": ["ブリをさばいたら、身からミミズのような虫が出てきた。これは、ブリ糸状虫という寄生虫のことが多く、春先に多いそうです。", "農林水産省によると、人に寄生することはないので、食べてしまっても体に問題はありません。ただ、アニサキスのこともあるので、よく見て取り除きましょう。"]},
        {"type": "cards", "heading": "釣ったフグ・シガテラ", "chapter": 7,
         "items": ["釣ったフグは、持ち帰って調理しない（大阪府）", "シガテラ：沖縄に多いが、本州でもイシガキダイで例がある", "シガテラの毒は、加熱しても消えない", "分からない魚は、食べない"], "note": "大阪府・厚生労働省",
         "lines": ["釣ったフグは、持ち帰って自分で調理するのは、絶対にやめてください。大阪府が強く呼びかけています。",
                   "シガテラという魚の毒による食中毒は、沖縄で多いのですが、厚生労働省の資料では、本州でもイシガキダイによる例が続いています。この毒は、加熱しても消えません。分からない魚は、食べないのがいちばんです。"]},
        {"type": "cards", "heading": "まとめ", "chapter": 8,
         "items": ["アニサキス：-20℃で24時間以上の冷凍か、加熱", "酢・塩・しょうゆ・わさびでは死なない", "ヒスタミン：釣ったらすぐ冷やす。加熱しても減らない", "腸炎ビブリオ：水道水で洗う・冷やす・まな板を分ける"],
         "lines": ["まとめです。アニサキスは、冷凍か加熱で防ぎます。酢やしょうゆ、わさびでは死にません。", "ヒスタミンは、釣ったらすぐ冷やすこと。腸炎ビブリオは、水道水でよく洗うこと。体の調子がおかしいときは、早めに医療機関に相談してください。"]},
        ask(slug, 8),
        end(["釣った魚を、安全においしく食べましょう。", "関西の釣果と釣り場の情報は、ツレドキ関西で確認できます。"], 8),
    ]
    return {"slug": slug, "title": "【保存版】釣った魚で食中毒にならないために アニサキス・ヒスタミン・腸炎ビブリオ 公的機関の情報で解説", "thumb": "釣った魚の食中毒", "thumb_sub": "アニサキスは酢やわさびでは死なない",
            "tag": "安全の基本", "chapters": chapters, "scenes": sc, "links": ["/safety/", "/safety/fish/"],
            "tags": ["アニサキス", "ヒスタミン", "食中毒", "釣った魚", "刺身"], "sprites": ["サバ", "アジ", "ハマチ・ブリ"]}


# ---------------- 魚のなかま分けクイズ ----------------
NAKAMA = [
    # 初級
    ("ブリ・ハマチは、何の仲間？", ["アジ科", "サバ科", "タイ科"], 0, "ブリは、アジ科ブリ属の魚です。ハマチは、ブリが若いときの呼び名。サバではなく、アジの仲間です。", "ハマチ・ブリ"),
    ("サワラ（サゴシ）は、何の仲間？", ["サバ科", "アジ科", "タチウオ科"], 0, "サゴシは、サワラが小さいときの呼び名。サバと同じ仲間です。", "サゴシ（サワラ）"),
    ("チヌ（クロダイ）とマダイ。タイ科なのは？", ["どちらもタイ科", "チヌだけ", "マダイだけ"], 0, "どちらもタイ科です。チヌは、クロダイ属の魚です。", "チヌ（クロダイ）"),
    ("ガシラ（カサゴ）とメバルは？", ["どちらもメバル科", "ガシラはハタ科", "メバルはタイ科"], 0, "ガシラもメバルも、岩場にすむ根魚の仲間です。", "ガシラ（カサゴ）"),
    ("ヒラメとカレイ。同じ「科」？", ["同じ科", "別の科", "ヒラメはサメの仲間"], 1, "ヒラメはヒラメ科、カレイはカレイ科で、科は別です。でも、目がからだの片側に寄った、近い仲間です。", "ヒラメ"),
    ("タコとイカは、何の仲間？", ["エビ・カニの仲間", "貝の仲間", "魚の仲間"], 1, "タコとイカは軟体動物。京都大学白浜水族館の解説では、軟体動物は、正しくは貝の仲間です。", "タコ"),
    ("グレ（メジナ）は、何の仲間？", ["タイ科", "メジナ科", "ベラ科"], 1, "標準的な名前はメジナで、メジナ科の魚です。関西では、グレの呼び名でおなじみです。", "グレ（メジナ）"),
    # 中級
    ("タチウオは、何に近い仲間？", ["ウナギ", "サバ", "アナゴ"], 1, "タチウオ科は、サバ科と同じグループにまとめられます。細長くても、ウナギではなく、サバに近い仲間です。", "タチウオ"),
    ("カワハギは、何の仲間？", ["フグの仲間", "カレイの仲間", "タイの仲間"], 0, "カワハギは、フグ目カワハギ科。フグの仲間です。ウマヅラハギも、同じカワハギ科です。", "カワハギ"),
    ("アコウ（キジハタ）は、何の仲間？", ["メバル科", "ハタ科", "タイ科"], 1, "アコウはハタ科です。キジハタという名前のとおり、ハタの仲間です。", "アコウ（キジハタ）"),
    ("カンパチとヒラマサは？", ["ブリと同じブリ属", "マグロの仲間", "タイの仲間"], 0, "カンパチもヒラマサも、ブリと同じ、アジ科ブリ属の魚です。", "シオ（カンパチ）"),
    ("キビレ（キチヌ）は？", ["チヌと同じクロダイ属", "ボラの仲間", "スズキの仲間"], 0, "キビレは、標準的な名前ではキチヌ。チヌと同じ、タイ科クロダイ属です。", "チヌ（クロダイ）"),
    ("アナゴ（マアナゴ）は、何の仲間？", ["ウナギの仲間", "ヘビの仲間", "ハゼの仲間"], 0, "マアナゴは、ウナギ目アナゴ科。ウナギの仲間です。", "ハモ"),
    ("サヨリは、何の仲間？", ["イワシの仲間", "サンマ・トビウオの仲間", "キスの仲間"], 1, "サヨリはダツ目サヨリ科。サンマやトビウオと同じダツ目で、メダカもこの仲間です。", "サヨリ"),
    # 上級
    ("コブダイは、何の仲間？", ["タイ科", "ベラ科", "イシダイ科"], 1, "名前にタイとつきますが、ベラ科です。小さいうちはメスで、大きくなるとオスに変わります。", "コブダイ"),
    ("イシダイは、何の仲間？", ["タイ科", "イシダイ科", "メジナ科"], 1, "イシダイ科です。名前はタイでも、タイ科ではありません。イシガキダイも、同じイシダイ科です。", "イシダイ"),
    ("ウミタナゴの赤ちゃんは、どう生まれる？", ["卵で生まれる", "子どもの姿で生まれる", "親の口の中で育つ"], 1, "ウミタナゴは、お腹の中で子どもを育てて、子どもの姿で産みます。春から夏にかけてです。", "ウミタナゴ"),
    ("アオリイカは、何科？", ["コウイカ科", "ヤリイカ科", "タコの仲間"], 1, "アオリイカは、ヤリイカ科アオリイカ属です。コウイカは、別のコウイカ科です。", "アオリイカ"),
    ("サメとエイ。見分けるポイントは？", ["エラ穴の位置", "しっぽの長さ", "歯の数"], 0, "どちらも軟骨魚類。エラ穴が体の横にあればサメ、お腹側にあればエイの仲間です。", "その他"),
    ("ボラは、名前が変わる出世魚。いちばん大きいときの呼び名は？", ["イナ", "オボコ", "トド"], 2, "ハク、スバシリ、オボコ、イナ、ボラ、そして大きくなるとトド、と呼ばれます。", "ボラ"),
]


def nakama_quiz():
    slug = "long-nakama-quiz"
    assert len(NAKAMA) == 20
    chapters = ["はじめに", "初級（1〜7問）", "中級（8〜14問）", "上級（15〜20問）", "結果発表", "まとめ"]
    sc = [
        {"type": "hook", "chapter": 0, "lines": [
            "タチウオは、ウナギではなく、サバに近い仲間。カワハギは、フグの仲間。コブダイは、タイではなく、ベラの仲間です。",
            "堤防で釣れる魚、実は意外な仲間がたくさんいます。全20問の、魚のなかま分けクイズ。何問当てられるでしょうか。"]},
        {"type": "cards", "heading": "遊び方と、調べ方", "numbered": True, "chapter": 0,
         "items": ["3つから、正しい仲間を選ぶ", "初級7問・中級7問・上級6問", "答えは、魚の「科」で出す", "水族館・大学の資料、魚類図鑑で確認"],
         "note": "京都大学白浜水族館・鹿児島大学総合研究博物館・市場魚貝類図鑑 ほか",
         "lines": ["遊び方です。画面の魚が、何の仲間かを、3つの中から選んでください。初級、中級、上級の順に、全部で20問です。",
                   "答えは、京都大学白浜水族館の解説や、大学の論文、魚類図鑑などで確かめた「科」で出します。"]},
        {"type": "cards", "heading": "「目」の名前は、本によって違う", "chapter": 0,
         "items": ["魚の分類は、研究で少しずつ変わっている", "例：カサゴの仲間は「カサゴ目」とも「スズキ目」とも", "「科」は、多くの本で同じ", "このクイズは「科」で答えを出す"],
         "lines": ["ひとつ注意です。魚の分け方は、研究が進むにつれて、少しずつ変わっています。たとえば、カサゴの仲間は、本によって「カサゴ目」とも、「スズキ目」とも書かれます。",
                   "そこで、このクイズでは、多くの資料で同じになっている「科」で、答えを出します。"]},
    ]
    THINK = ["考えてみてください。", "さあ、どれでしょう？", "どれだと思いますか？"]
    for i, (q, opts, ans, exp, spr) in enumerate(NAKAMA):
        lv = 1 + (i >= 7) + (i >= 14)
        if i in (0, 7, 14):
            sc.append(chap(lv, chapters[lv], [["ブリ", "タコとイカ", "グレ"], ["タチウオ", "カワハギ", "サヨリ"], ["コブダイ", "イシダイ", "サメとエイ"]][lv - 1], lv,
                           ["まずは初級。おなじみの魚です。", "続いて中級。見た目にだまされないように。", "最後は上級。名前にだまされる魚も出てきます。"][lv - 1],
                           sprites=[["ハマチ・ブリ", "タコ"], ["タチウオ", "カワハギ"], ["コブダイ", "イシダイ"]][lv - 1]))
        sc.append({"type": "quiz", "q": f"Q{i + 1}　{q}", "options": opts, "answer": ans, "chapter": lv,
                   "lines": [f"第{i + 1}問。{q}" + "".join(f"{j + 1}、{o}。" for j, o in enumerate(opts)), THINK[i % 3], f"正解は、{opts[ans]}。{exp}"]})
        if i == 6:
            sc.append({"type": "cards", "heading": "初級のふりかえり", "chapter": 1,
                       "items": ["ブリ・ハマチ：アジ科", "サワラ：サバ科", "チヌ・マダイ：タイ科", "ガシラ・メバル：メバル科"],
                       "lines": ["初級のふりかえりです。ブリはアジ科、サワラはサバ科。チヌとマダイはタイ科で、ガシラとメバルはメバル科でした。"]})
        if i == 13:
            sc.append({"type": "cards", "heading": "見た目にだまされる仲間", "chapter": 2,
                       "items": ["タチウオ：細長いけれど、サバに近い", "カワハギ：フグの仲間", "サヨリ：サンマ・トビウオの仲間", "アナゴ：ウナギの仲間"],
                       "lines": ["中級では、見た目と仲間が違う魚が出てきました。細長いタチウオはサバに近く、カワハギはフグ。サヨリはダツ目で、アナゴはウナギ目でした。"]})
    sc += [
        {"type": "rank", "heading": "あなたの「魚の仲間」レベルは？", "chapter": 4,
         "items": [["18〜20問：魚類学者", 20, "魚類学者"], ["14〜17問：上級", 17, "上級"], ["9〜13問：中級", 13, "中級"], ["0〜8問：これから", 8, "これから"]],
         "lines": ["結果発表です。18問以上正解した人は、魚類学者。14問から17問は上級です。", "9問から13問は中級。8問までの人も、大丈夫。今日覚えた仲間を思い出しながら釣ると、魚を見る目が変わりますよ。"]},
        {"type": "cards", "heading": "名前にだまされる魚", "chapter": 5,
         "items": ["コブダイ：タイではなく、ベラ科", "イシダイ：タイ科ではなく、イシダイ科", "マダイ・チヌ：こちらは本当のタイ科", "「〇〇ダイ」でも、タイ科とは限らない"],
         "lines": ["まとめです。名前に「タイ」とついても、タイ科とは限りません。コブダイはベラ科、イシダイはイシダイ科でした。",
                   "本当のタイ科は、マダイやチヌ。魚の名前は、見た目や昔の呼び方からついたものも多いのです。"]},
        ask(slug, 5),
        end(["次に魚を釣ったら、何の仲間か思い出してみてください。", "関西で今釣れている魚は、ツレドキ関西で確認できます。"], 5),
    ]
    return {"slug": slug, "title": "【クイズ20問】この魚、何の仲間？ タチウオはサバ、カワハギはフグ 魚のなかま分けクイズ", "thumb": "この魚、何の仲間？", "thumb_sub": "全20問 魚のなかま分けクイズ",
            "tag": "釣りクイズ", "chapters": chapters, "scenes": sc, "links": ["/species/"],
            "tags": ["魚 仲間", "魚クイズ", "タチウオ", "カワハギ", "釣りクイズ"], "sprites": ["タチウオ", "カワハギ", "コブダイ", "ハマチ・ブリ"]}


# ---------------- 釣り用語30 ----------------
YOUGO = [
    ("海と潮の言葉", [("潮目", "ちがう流れの潮がぶつかってできる、海の上の境目", "潮目は、ちがう流れの潮がぶつかってできる、海の上の境目のことです。"),
                   ("上げ潮", "海の水位が、だんだん満ちてくるとき", "上げ潮は、海の水位がだんだん高く、満ちてくるとき。"),
                   ("下げ潮", "海の水位が、だんだん引いていくとき", "下げ潮は、反対に、水位が引いていくときです。"),
                   ("潮止まり", "満ち引きの変わり目で、潮の流れが止まること", "潮止まりは、満ち潮と引き潮の変わり目で、潮の流れが止まることです。"),
                   ("二枚潮", "上と下で、潮の流れる向きがちがうこと", "二枚潮は、海の上のほうと下のほうで、潮の流れる向きがちがうことです。"),
                   ("ウネリ", "遠くの風でできた波が、風がやんでも残って伝わるもの", "ウネリは、遠くで吹いた風でできた波が、風がやんだあとも残って、伝わってくるものです。気象庁の説明です。")],
     ("海の上と下で、潮の流れる向きがちがうことを、何という？", ["二枚潮", "潮止まり", "上げ潮"], 0, "潮が2枚の板のように、上と下で別々に動く、と覚えましょう。")),
    ("天気と地形の言葉", [("凪", "風も波もなく、海がおだやかなこと", "凪は、風も波もなく、海がおだやかなことです。"),
                     ("時化", "風や雨で、海が荒れていること", "時化は、反対に、風や雨で海が荒れていること。時化の日は、釣りに行きません。"),
                     ("かけあがり", "海の底が、深い所から浅い所へ坂になっている場所", "かけあがりは、海の底が、深い所から浅い所へ、坂のように上がっている場所です。"),
                     ("根", "海の底にある岩場", "「根」は、海の底にある岩場のことです。"),
                     ("ミオ筋", "海や川の中で、船が通れる深い道すじ", "ミオ筋は、海や川の中で、船が通れるように深くなっている道すじです。"),
                     ("サラシ", "岩場に波がぶつかって、白いあわが広がる所", "サラシは、磯に波がぶつかって、白いあわが広がっている所です。")],
     ("海の底が、深い所から浅い所へ坂になっている場所は？", ["ミオ筋", "かけあがり", "サラシ"], 1, "カタカナで「カケアガリ」と書くこともあります。")),
    ("魚のようすの言葉", [("ナブラ", "大きな魚に追われた小魚の群れで、水面がさわがしいようす", "ナブラは、大きな魚に追われた小魚の群れで、水面がバシャバシャとさわがしくなっているようすです。"),
                      ("鳥山", "水面に追われた小魚を、海鳥が群れてねらうようす", "鳥山は、水面に追われた小魚を、海鳥がたくさん集まってねらっているようす。下に魚の群れがいる目じるしです。"),
                      ("ライズ", "魚がエサを追って、水面で向きを変えること", "ライズは、魚がエサを追って、水面でくるっと向きを変えることです。"),
                      ("時合", "魚が、エサによく食いつく時間", "時合は、魚がエサによく食いつく時間のこと。この時間を逃さないのが大事です。"),
                      ("食い渋り", "魚がなかなかエサを食べず、釣れないこと", "食い渋りは、魚がなかなかエサを食べず、釣れないことです。"),
                      ("活性", "魚がどれくらい元気にエサを追っているか", "活性は、魚がどれくらい元気に、エサを追っているか。活性が高い、低い、と言います。")],
     ("海鳥が群れて、水面の小魚をねらっているようすは？", ["ナブラ", "ライズ", "鳥山"], 2, "ナブラは水面の小魚のさわぎ、鳥山はそれをねらう鳥。いっしょに出ることもあります。")),
    ("釣れた魚の言葉", [("本命", "その日にねらっている魚", "本命は、その日にねらっている魚のことです。"),
                     ("外道", "ねらいとちがう魚が釣れたときの、その魚", "外道は、ねらいとちがう魚が釣れたとき、その魚のこと。外道でも、おいしい魚はたくさんいます。"),
                     ("一荷", "いくつかの針に、同時に魚がかかること", "一荷は、いくつかの針に、同時に魚がかかって釣れること。サビキ釣りでよくあります。"),
                     ("型", "釣れた魚の大きさ", "「型」は、釣れた魚の大きさのことです。"),
                     ("根魚", "ガシラやメバルのように、岩場にすむ魚", "根魚は、ガシラやメバルのように、岩場にすんでいる魚のことです。"),
                     ("エサ取り", "ねらう魚より先に、エサだけ取っていく魚", "エサ取りは、ねらっている魚より先に、エサだけを取っていく魚のことです。")],
     ("ねらいとちがう魚が釣れたとき、その魚を何という？", ["本命", "外道", "一荷"], 1, "反対に、ねらっている魚は「本命」でしたね。")),
    ("釣りの動きとトラブルの言葉", [("アタリ", "魚が食いついて、糸や竿が動くこと", "アタリは、魚がエサやルアーに食いついて、糸や竿がピクッと動くこと。"),
                            ("アワセ", "アタリのとき竿を立てて、針を魚の口にかけること", "アワセは、アタリを感じたときに竿を立てて、針を魚の口にしっかりかけることです。"),
                            ("バラす", "かかった魚を、取りこむ前に逃がすこと", "バラすは、針にかかった魚を、取りこむ前に逃がしてしまうことです。"),
                            ("スレ掛かり", "針が口ではなく、体のほかの所に刺さること", "スレ掛かりは、針が魚の口ではなく、体のほかの所に刺さってしまうことです。"),
                            ("オマツリ", "自分の仕掛けと、ほかの人の仕掛けがからまること", "オマツリは、自分の仕掛けと、ほかの人の仕掛けがからまること。起きたら、おたがいに声をかけましょう。"),
                            ("底ダチ", "仕掛けが、海の底に着くこと", "底ダチは、仕掛けが海の底に着くことです。")],
     ("かかった魚を、取りこむ前に逃がしてしまうことは？", ["バラす", "アワセ", "オマツリ"], 0, "「バラシ」とも言います。釣り場で一番くやしい言葉かもしれません。")),
]


def yougo30():
    slug = "long-yougo30"
    assert sum(len(t) for _, t, _ in YOUGO) == 30
    chapters = ["はじめに"] + [c for c, _, _ in YOUGO] + ["まとめ"]
    sc = [
        {"type": "hook", "chapter": 0, "lines": [
            "「ナブラが出た！」「二枚潮で釣りにくい」「外道ばっかりや」。釣り場で聞こえてくる、この言葉。意味、分かりますか？",
            "釣り場の会話がわかる、釣りの言葉を30個。メーカーの用語集や、気象庁などで意味を確かめて、やさしく説明します。"]},
        toc(chapters, "この動画の流れです。章の終わりに、1問ずつクイズがあります。"),
        {"type": "cards", "heading": "この動画の言葉について", "chapter": 0,
         "items": ["意味は、釣具メーカーの用語集などで確認", "地域や人によって、使い方が少し違うこともある", "知っている言葉の数を、数えながら見てね"],
         "note": "ダイワ「釣り用語集」・気象庁・デジタル大辞泉 ほか",
         "lines": ["言葉の意味は、釣具メーカーのダイワの用語集や、気象庁、国語辞典で確かめました。", "地域や人によって、使い方が少し違うこともあります。知っている言葉がいくつあるか、数えながら見てください。"]},
    ]
    n = 0
    for ci, (title, terms, (q, opts, ans, qexp)) in enumerate(YOUGO, start=1):
        sc.append(chap(ci, title, [t for t, _, _ in terms[:3]], ci, f"{['1つめ', '2つめ', '3つめ', '4つめ', '5つめ'][ci - 1]}は、{title}です。"))
        for half in (terms[:3], terms[3:]):
            sc.append({"type": "cards", "heading": f"{title}（{n + 1}〜{n + 3}）", "numbered": False, "chapter": ci,
                       "items": [f"{t}：{m}" for t, m, _ in half], "note": "ダイワ「釣り用語集」などで確認" if ci != 1 or n < 3 else "ダイワ「釣り用語集」・気象庁",
                       "lines": [x for _, _, x in half]})
            n += 3
        sc.append(quiz(q, opts, ans, ci, explain=qexp))
    sc += [
        {"type": "rank", "heading": "30の言葉、いくつ知っていた？", "chapter": 6,
         "items": [["25個以上：釣り場の常連", 30, "常連"], ["15〜24個：中級", 24, "中級"], ["0〜14個：これから", 14, "これから"]],
         "lines": ["まとめです。25個以上知っていた人は、もう釣り場の常連です。15個から24個は中級。", "14個までの人も大丈夫。釣り場で聞こえた言葉を、1つずつ覚えていけば、会話がどんどん楽しくなります。"]},
        {"type": "cards", "heading": "まずはこの5つ", "numbered": True, "chapter": 6,
         "items": ["時合：よく釣れる時間", "アタリ：魚が食いついた合図", "アワセ：針をかける動き", "オマツリ：仕掛けがからまる", "潮止まり：潮の流れが止まる"],
         "lines": ["初めての人は、まずこの5つ。時合、アタリ、アワセ、オマツリ、潮止まり。", "これが分かれば、隣の人との会話も、ぐっと分かりやすくなります。"]},
        ask(slug, 6),
        end(["言葉が分かると、釣り場がもっと楽しくなります。", "関西の釣果と、釣れる時間は、ツレドキ関西で確認できます。"], 6),
    ]
    return {"slug": slug, "title": "【釣り用語30】釣り場の会話がわかる言葉 ナブラ・時合・二枚潮・外道 意味をやさしく解説", "thumb": "釣り用語30", "thumb_sub": "釣り場の会話がわかる言葉",
            "tag": "釣りの基本", "chapters": chapters, "scenes": sc, "links": ["/start/", "/guide/"],
            "tags": ["釣り用語", "ナブラ", "時合", "外道", "釣り 初心者"], "sprites": ["アジ", "ハマチ・ブリ", "メバル"]}


def all_plans():
    return [hatsumono(), shurui(), osaka_kobe(), kisetsu_quiz(), shokuchudoku(), nakama_quiz(), yougo30()]


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
            if s["type"] not in ("quiz", "ask"):
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
