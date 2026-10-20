# YouTube 長尺動画（約10分）の台本を、釣り方ガイド（content/guides）から組み立てる。
#   python3 scripts/video/make-long.py   → content/long/<slug>.json
import json, os, re, sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "sns"))
import discuss  # noqa: E402

OUT = "content/long"
G = {os.path.basename(p)[:-5]: json.load(open(f"content/guides/{p}", encoding="utf-8")) for p in os.listdir("content/guides") if p.endswith(".json") and not p.startswith("_")}

PLANS = [
    {"slug": "long-sabiki", "title": "【完全版】サビキ釣り入門から応用まで", "thumb": "サビキ釣り完全ガイド", "thumb_sub": "仕掛け選び・ウキサビキ・ジグサビキ",
     "guides": ["sabiki", "sabiki-hook", "uki-sabiki", "jig-sabiki"],
     "intro": ["この動画では、関西の堤防で一番人気のサビキ釣りを、はじめての人向けの基本から、ウキサビキやジグサビキまで、まとめて解説します。", "道具の選び方や、その日に合う仕掛けの見つけ方も紹介するので、最後まで見てください。"],
     "outro": ["サビキ釣りは、群れが回ってくる時間と深さを合わせるのが一番のコツです。", "今日の釣れる時間と、近くの釣り場の釣果は、ツレドキ関西でチェックしてください。"]},
    {"slug": "long-shore-jigging", "title": "【完全版】ショアジギング入門 青物を釣るためのすべて", "thumb": "ショアジギング完全ガイド", "thumb_sub": "ジャーク・パターン・ジグの選び方",
     "guides": ["shore-jigging", "one-pitch", "aomono-pattern", "jig-weight-color"],
     "intro": ["岸から青物を釣るショアジギング。この動画では、道具とアクションの基本から、海の見方、ジグの重さと色の選び方まで、10分でまとめて解説します。"],
     "outro": ["青物は、潮目やナブラなど、海の変化をよく見ることが釣果への近道です。", "釣れる時間と、近くの釣り場の釣果は、ツレドキ関西でチェックしてください。"]},
    {"slug": "long-sawara", "title": "【完全版】サワラ・サゴシ攻略 ブレードジグと高速巻き", "thumb": "サワラ・サゴシ攻略", "thumb_sub": "ブレードジグ・高速巻き・色と重さ",
     "guides": ["sawara-blade", "sawara-tadamaki", "jig-weight-color"],
     "intro": ["秋の関西で大人気のサワラとサゴシ。ブレードジグと高速巻きの2つの釣り方と、その日の状況に合わせたルアーの選び方を解説します。"],
     "outro": ["サワラの群れは、朝まずめの短い時間に回ってくることが多いです。", "釣れる時間と、近くの釣り場の釣果は、ツレドキ関西でチェックしてください。"]},
    {"slug": "long-tachiuo", "title": "【完全版】タチウオ攻略 ウキ・テンヤ・ワインド3つの釣り方", "thumb": "タチウオ攻略", "thumb_sub": "ウキ・テンヤ・ワインドを比べる",
     "guides": ["tachiuo-uki", "tachiuo-tenya", "tachiuo-wind"],
     "intro": ["秋の夕方の定番、タチウオ。この動画では、電気ウキ、テンヤ、ワインドの3つの釣り方を、道具とその日のパターンもあわせて解説します。"],
     "outro": ["タチウオは、夕まずめから暗くなってすぐが一番のチャンスです。歯が鋭いので、取り込みには気をつけましょう。", "釣れる時間と、近くの釣り場の釣果は、ツレドキ関西でチェックしてください。"]},
    {"slug": "long-chinu", "title": "【完全版】チヌ（クロダイ）攻略 ウキ釣りと落とし込み", "thumb": "チヌ攻略", "thumb_sub": "ウキ釣りの基本・フカセ・落とし込み",
     "guides": ["ukizuri", "chinu-uki", "chinu-otoshikomi"],
     "intro": ["関西の波止で人気のチヌ、クロダイ。ウキ釣りの基本から、撒き餌を使ったウキ釣り、壁ぎわを探る落とし込みまで解説します。"],
     "outro": ["チヌは警戒心の強い魚ですが、タナと撒き餌を合わせれば、堤防からでも十分に狙えます。", "釣れる時間と、近くの釣り場の釣果は、ツレドキ関西でチェックしてください。"]},
    {"slug": "long-light-game", "title": "【完全版】ライトゲーム入門 アジング・メバリング", "thumb": "ライトゲーム入門", "thumb_sub": "アジング・メバリング・常夜灯の攻め方",
     "guides": ["ajing", "mebaring", "jig-sabiki"],
     "intro": ["軽いルアーで、夜の常夜灯まわりのアジやメバルを釣るライトゲーム。道具の選び方から、その日の層の探し方まで解説します。"],
     "outro": ["ライトゲームは、沈める秒数とゆっくり巻く速さを変えて、その日の層を探すのがコツです。", "釣れる時間と、近くの釣り場の釣果は、ツレドキ関西でチェックしてください。"]},
    {"slug": "long-ika-tako", "title": "【完全版】堤防のイカ・タコ釣り エギングとタコエギ", "thumb": "イカ・タコ釣り入門", "thumb_sub": "エギング・タコエギ・季節の狙い方",
     "guides": ["eging", "tako", "danger-fish"],
     "intro": ["堤防から狙えるイカとタコ。秋と春のアオリイカのエギングと、夏のタコエギの釣り方を、道具とあわせて解説します。"],
     "outro": ["イカの墨やタコの扱いなど、釣り場のマナーも守って楽しみましょう。", "釣れる時間と、近くの釣り場の釣果は、ツレドキ関西でチェックしてください。"]},
    {"slug": "long-gomoku", "title": "【完全版】堤防の五目釣り ちょい投げ・穴釣り・カワハギ・サヨリ", "thumb": "堤防の五目釣り", "thumb_sub": "ちょい投げ・穴釣り・カワハギ・サヨリ",
     "guides": ["choinage", "anazuri", "kawahagi", "sayori"],
     "intro": ["いろいろな魚が釣れる堤防の五目釣り。ちょい投げ、穴釣り、カワハギの胴突き、サヨリの連玉ウキの4つを、まとめて紹介します。"],
     "outro": ["季節ごとに釣れる魚が変わるのが、堤防釣りの楽しさです。", "釣れる時間と、近くの釣り場の釣果は、ツレドキ関西でチェックしてください。"]},
    {"slug": "long-big-game", "title": "【完全版】堤防から大物を狙う ノマセ釣りとシーバス", "thumb": "堤防から大物を狙う", "thumb_sub": "ノマセ釣り・シーバス・取り込み",
     "guides": ["nomase", "seabass", "fish-care"],
     "intro": ["生きた小アジで大物を狙うノマセ釣りと、夜の常夜灯でシーバスを狙う釣り方。大物の取り込みと、おいしく持ち帰る方法まで解説します。"],
     "outro": ["大物ほど、タモ網での取り込みと、釣った後の締め方が大切です。", "釣れる時間と、近くの釣り場の釣果は、ツレドキ関西でチェックしてください。"]},
    {"slug": "long-basics", "title": "【完全版】釣りを始める前に知っておきたいこと 安全・結び方・魚の扱い", "thumb": "釣りを始める前に", "thumb_sub": "ライフジャケット・結び方・危険な魚",
     "guides": ["lifejacket", "knot", "danger-fish", "fish-care"],
     "intro": ["これから釣りを始める人に、最初に知っておいてほしいことをまとめました。ライフジャケットと安全、基本の結び方、危険な魚、釣った魚の持ち帰り方です。"],
     "outro": ["安全に、マナーを守って、釣りを楽しみましょう。", "釣れる時間と、近くの釣り場の釣果は、ツレドキ関西でチェックしてください。"]},
]


HOOKS = {
    "long-sabiki": ["堤防に行って、何も釣れずに帰ってきたこと、ありませんか？", "サビキ釣りは、群れが来る時間と深ささえ合えば、はじめての人でも数釣りができる釣りです。", "基本から、その日の当たり仕掛けの見つけ方、ウキサビキとジグサビキまで、順番に解説します。"],
    "long-shore-jigging": ["岸から、ブリやサワラなどの青物を釣ってみたい。", "そんな人のために、ショアジギングの道具、アクション、海の見方、ジグの選び方を1本にまとめました。", "最後まで見れば、次の釣行で何をすればいいかがわかります。"],
    "long-sawara": ["秋の関西で、いちばん熱いターゲットのひとつが、サワラとサゴシです。", "速い魚なので、巻き方とルアー選びで釣果が大きく変わります。", "ブレードジグと高速巻きの2つの釣り方と、その日に合うジグの選び方を解説します。"],
    "long-tachiuo": ["秋の夕方、堤防にずらっと並ぶ電気ウキ。お目当てはタチウオです。", "タチウオは、エサ、テンヤ、ワインドと、釣り方がいろいろあるのが面白いところ。", "3つの釣り方の違いと、どれを選べばいいかを解説します。"],
    "long-chinu": ["関西の波止の主役、チヌ。警戒心が強くて、狙って釣るのは難しい魚です。", "でも、タナと撒き餌の使い方がわかれば、堤防からでも十分に狙えます。", "ウキ釣りの基本から、チヌのウキ釣り、壁際を探る落とし込みまで解説します。"],
    "long-light-game": ["夜の常夜灯の下で、アジやメバルが泳いでいるのを見たことはありませんか？", "軽いルアーで狙うライトゲームは、道具が少なく、仕事帰りにも楽しめる釣りです。", "アジングとメバリングの基本と、その日の層の探し方を解説します。"],
    "long-ika-tako": ["堤防から、イカやタコが釣れるのを知っていますか？", "アオリイカのエギングと、タコエギのタコ釣りは、どちらも仕掛けがシンプルで始めやすい釣りです。", "季節ごとの狙い方と、釣った後の扱い方まで解説します。"],
    "long-gomoku": ["いろいろな魚を釣りたい人には、堤防の五目釣りがおすすめです。", "ちょい投げ、穴釣り、カワハギ、サヨリ。季節や場所で、狙える魚がどんどん変わります。", "それぞれの釣り方のコツを、まとめて紹介します。"],
    "long-big-game": ["堤防からでも、大物は釣れます。", "生きた小アジで青物を狙うノマセ釣りと、夜のシーバス。", "大物が掛かった時の取り込みと、おいしく持ち帰る方法まで解説します。"],
    "long-basics": ["釣りを始める前に、これだけは知っておいてほしいことがあります。", "ライフジャケット、結び方、危険な魚、釣った魚の扱い方。", "知っているだけで、安全に、もっと楽しく釣りができるようになります。"],
}

# 困った時の対策としてまとめる「その日のパターン」の行
TROUBLE = re.compile(r"釣れない|反応が(薄|ない)|アタリ|根掛|絡|食わない|乗らない|バレ|切れ|見えない")
STEP_INTRO = ["手順を順番に見ていきます。", "やり方を、順番に説明します。", "流れを確認しましょう。", "手順はこうです。"]
PAT_INTRO = ["その日の状況に合わせて、やり方を変えましょう。", "状況別のコツです。", "こんな時はどうするか、見ていきましょう。", "状況ごとの使い分けです。"]
NUM = "1つ目 2つ目 3つ目 4つ目 5つ目 6つ目".split()


def chunks(xs, n):
    return [xs[i : i + n] for i in range(0, len(xs), n)]


def norm(t):
    return re.sub(r"（.*?）|\(.*?\)|\s", "", t)


def first_sentence(t):
    i = t.find("。")
    return t[: i + 1] if i > 0 else t


def build(p):
    """1本を通して見られる構成にする：つかみ → 目次 → 釣り方ごとの章 → 困った時 → 道具 → 場所と安全 → まとめ"""
    gs = [G[k] for k in p["guides"]]
    chapters = ["はじめに"] + [g["title"] for g in gs]
    trouble, seen_rows, seen_scene, seen_safety = [], set(), set(), set()
    prev = {}
    body = []
    for ci, g in enumerate(gs, 1):
        items = []
        tg = "、".join(g["targets"][:4])
        if tg != prev.get("targets"):
            items.append(f"釣れる魚：{tg}")
        ss = g["season"].split("、")[0][:24]
        if ss != prev.get("season"):
            items.append(f"季節：{ss}")
        items += [f"ポイント：{x['title']}" for x in g["steps"][1:3]]
        prev = {"targets": tg, "season": ss}
        sc = [{"type": "chapter", "no": ci, "title": g["title"], "items": items[:4],
               "lines": [("まずは、" if ci == 1 else "次は、" if ci < len(gs) else "最後は、") + f"{g['title']}です。" + first_sentence(g["summary"])]}]
        # 図解（前の章と同じ図は出さない）
        for s in g["video"]["scenes"]:
            if s["type"] not in ("rig", "action", "place", "knot"):
                continue
            key = (s["type"], s.get("kind"), json.dumps(s.get("parts"), ensure_ascii=False))
            if key in seen_scene:
                continue
            seen_scene.add(key)
            s = dict(s)
            if s.get("heading"):
                s["heading"] = re.sub(r"^[①-⑳]\s*", "", s["heading"])  # ショート用の番号は外す
            sc.append(s)
        sc.append({"type": "steps", "heading": "手順", "steps": [x["title"] for x in g["steps"]], "sync_offset": 1,
                   "lines": [STEP_INTRO[(ci - 1) % len(STEP_INTRO)]] + [f"{NUM[i]}、{x['title']}。{x['body']}" for i, x in enumerate(g["steps"])]})
        rows = []
        for r in g["patterns"]["rows"]:
            k = norm(r["when"])
            if k in seen_rows:
                continue
            seen_rows.add(k)
            (trouble if TROUBLE.search(r["when"]) else rows).append(r)
        for k, part in enumerate(chunks(rows, 4)):
            sc.append({"type": "pattern", "heading": f"{g['title']}：状況別のコツ" if k == 0 else f"{g['title']}：状況別のコツ（続き）", "rows": [[r["when"], r["do"]] for r in part], "sync": True, "sync_offset": 1,
                       "lines": [PAT_INTRO[(ci - 1) % len(PAT_INTRO)] if k == 0 else "まだあります。"] + [f"{r['when']}なら、{r['do']}。{r['why']}" for r in part]})
        for s in sc:
            s["chapter"] = ci
        body += sc

    tail_ci = len(chapters)
    tail = []
    if trouble:
        chapters.append("困った時は")
        for k, part in enumerate(chunks(trouble, 4)):
            tail.append({"type": "pattern", "heading": "困った時の対策", "rows": [[r["when"], r["do"]] for r in part], "sync": True, "sync_offset": 1, "chapter": len(chapters) - 1,
                         "lines": ["ここで、よくある困りごとと、その対策をまとめます。" if k == 0 else "続けて見ていきます。"] + [f"{r['when']}時は、{r['do']}。{r['why']}" for r in part]})
    # 道具は最後にまとめて1回（初級の道具を重複なしで）
    chapters.append("道具のそろえ方")
    items, names = [], set()
    for g in gs:
        for it in g["tackle"][0]["items"]:
            if norm(it["name"]) in names:
                continue
            names.add(norm(it["name"]))
            items.append(it)
    t0 = gs[0]["tackle"][0]
    for k, part in enumerate(chunks(items, 5)[:2]):
        tail.append({"type": "tackle", "heading": "まずそろえる道具" if k == 0 else "まずそろえる道具（続き）", "items": [[it["name"], it["spec"]] for it in part], "sync": True, "sync_offset": 1, "chapter": len(chapters) - 1,
                     "lines": [f"道具をまとめます。はじめての人は、{t0['budget'].replace('目安 ', 'およそ')}から始められます。" if k == 0 else "続けて紹介します。"] + [f"{it['name']}は、{it['spec']}。" for it in part]})
    up = [t for t in gs[0]["tackle"][1:]]
    if up:
        tail.append({"type": "points", "heading": "慣れてきたら", "items": [f"{t['tier']}：" + "／".join(f"{i['name']} {i['spec'].split('（')[0][:16]}" for i in t["items"][:2]) for t in up][:4], "chapter": len(chapters) - 1,
                     "lines": [f"慣れてきたら、ステップアップ。{up[0]['tier']}の道具は、{up[0]['who'].rstrip('。')}の道具です。" + (f"{up[0]['budget'].replace('目安 ', 'およそ')}が目安です。" if up[0].get('budget') else ""), "この動画で紹介した道具は、概要欄のリンクから見られます。"]})
    # 場所と安全も最後に1回（釣りの基本の回は「安全とマナー」だけ）
    basic = all(g["category"] == "基本" for g in gs)
    chapters.append("安全とマナー" if basic else "どこで釣る？・安全")
    places = []
    for g in gs:
        for x in g["places"]["points"]:
            if norm(x) not in {norm(y) for y in places}:
                places.append(x)
    if not basic:
        tail.append({"type": "points", "heading": "どこで釣る？", "items": places[:4], "chapter": len(chapters) - 1, "lines": [gs[0]["places"]["text"]]})
    safety = []
    for g in gs:
        for x in g["safety"]:
            if norm(x)[:10] not in seen_safety:
                seen_safety.add(norm(x)[:10])
                safety.append(x)
    tail.append({"type": "points", "heading": "安全とマナー", "items": [x[:28] for x in safety[:4]], "chapter": len(chapters) - 1, "lines": safety[:3]})
    chapters.append("まとめ")
    ask = discuss.scene(discuss.LONG[p["slug"]]) if p["slug"] in discuss.LONG else None
    if ask:
        ask["chapter"] = len(chapters) - 1
        tail.append(ask)
    tail.append({"type": "end", "lines": p["outro"], "chapter": len(chapters) - 1})

    head = [
        {"type": "title", "lines": HOOKS.get(p["slug"], p["intro"]), "chapter": 0},
        {"type": "points", "heading": "この動画でわかること", "items": [c for c in chapters[1:-1]][:5], "chapter": 0,
         "lines": ["この動画の流れです。気になる所から見たい人は、概要欄の目次から飛べます。"]},
    ]
    return head + body + tail, chapters


def main():
    os.makedirs(OUT, exist_ok=True)
    for p in PLANS:
        scenes, chapters = build(p)
        doc = {"slug": p["slug"], "title": p["title"], "sub": "", "tag": "釣り方ガイド 完全版", "thumb": p["thumb"], "thumb_sub": p["thumb_sub"], "guides": p["guides"], "chapters": chapters, "video": {"scenes": scenes}}
        json.dump(doc, open(f"{OUT}/{p['slug']}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        chars = sum(len(l) for s in scenes for l in s["lines"])
        print(f"{p['slug']}: {len(scenes)} scenes, {chars} chars (~{chars / 7.5 / 60:.1f}min), chapters={chapters}")


if __name__ == "__main__":
    main()
