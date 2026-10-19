# YouTube 長尺動画（約10分）の台本を、釣り方ガイド（content/guides）から組み立てる。
#   python3 scripts/video/make-long.py   → content/long/<slug>.json
import json, os

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


def chunks(xs, n):
    return [xs[i : i + n] for i in range(0, len(xs), n)]


def chapter_scenes(g, ci):
    sc = []
    sc.append({"type": "chapter", "no": ci, "title": g["title"], "items": [f"釣れる魚：{'、'.join(g['targets'][:4])}", f"むずかしさ：{g['level']}", "手順とその日のパターン", "初級・中級・上級の道具"],
               "lines": [f"{g['title']}。{g['summary']}"]})
    # 図解（ショート動画の図をそのまま使う）
    for s in g["video"]["scenes"]:
        if s["type"] in ("title", "end", "tackle"):
            continue
        sc.append(dict(s))
    # 手順
    sc.append({"type": "steps", "heading": "手順", "steps": [x["title"] for x in g["steps"]], "sync_offset": 1,
               "lines": ["手順を、順番に見ていきましょう。"] + [f"{i + 1}つ目、{x['title']}。{x['body']}" for i, x in enumerate(g["steps"])]})
    # その日のパターン
    for k, rows in enumerate(chunks(g["patterns"]["rows"], 5)):
        sc.append({"type": "pattern", "heading": g["patterns"]["title"] if k == 0 else f"{g['patterns']['title']}（続き）", "rows": [[r["when"], r["do"]] for r in rows], "sync": True, "sync_offset": 1,
                   "lines": [("次は、" + g["patterns"]["title"] + "です。") if k == 0 else "続けて見ていきます。"] + [f"「{r['when']}」の時は、{r['do']}。{r['why']}" for r in rows]})
    if g.get("hookTable"):
        ht = g["hookTable"]
        sc.append({"type": "pattern", "heading": ht["title"], "rows": [[r["size"], r["fish"]] for r in ht["rows"]], "sync": True, "sync_offset": 1,
                   "lines": [f"{ht['title']}を確認しておきましょう。"] + [f"{r['size']}は、{r['fish']}。" for r in ht["rows"]]})
    # 道具
    for tier in g["tackle"]:
        for k, items in enumerate(chunks(tier["items"], 5)):
            sc.append({"type": "tackle", "heading": f"道具：{tier['tier']}" + ("" if k == 0 else "（続き）"), "items": [[it["name"], it["spec"]] for it in items], "sync": True, "sync_offset": 1,
                       "lines": [(f"{tier['tier']}の道具です。{tier['who']}。{tier['budget']}です。" if k == 0 else "続けて紹介します。")] + [f"{it['name']}は、{it['spec']}。" for it in items]})
    # 場所と安全
    sc.append({"type": "points", "heading": "どこで釣るか", "items": g["places"]["points"][:4], "lines": [g["places"]["text"]]})
    sc.append({"type": "points", "heading": "安全とルール", "items": [x[:28] for x in g["safety"][:4]], "lines": g["safety"][:4]})
    for s in sc:
        s["chapter"] = ci
    return sc


def main():
    os.makedirs(OUT, exist_ok=True)
    for p in PLANS:
        gs = [G[k] for k in p["guides"]]
        scenes = [{"type": "title", "lines": p["intro"], "chapter": 0}]
        chapters = ["はじめに"]
        for g in gs:
            chapters.append(g["title"])
            scenes += chapter_scenes(g, len(chapters) - 1)
        chapters.append("まとめ")
        scenes.append({"type": "end", "lines": p["outro"], "chapter": len(chapters) - 1})
        doc = {"slug": p["slug"], "title": p["title"], "sub": "", "tag": "釣り方ガイド 完全版", "thumb": p["thumb"], "thumb_sub": p["thumb_sub"], "guides": p["guides"], "chapters": chapters, "video": {"scenes": scenes}}
        json.dump(doc, open(f"{OUT}/{p['slug']}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        chars = sum(len(l) for s in scenes for l in s["lines"])
        print(f"{p['slug']}: {len(scenes)} scenes, {chars} chars (~{chars / 7.5 / 60:.1f}min)")


if __name__ == "__main__":
    main()
