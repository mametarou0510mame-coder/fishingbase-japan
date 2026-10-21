# 長尺動画の台本で、同じ説明が二度出ていないかを調べる。
#   python3 scripts/video/audit_long.py [slug ...]
# 1) ナレーションの文どうしの似ている度合い（文字の2文字ずつの組の重なり）
# 2) 道具の数値（号・g・ft・番・lb・cm）が、別の場面でも読み上げられていないか
import json, re, sys, glob, os


def grams(t):
    t = re.sub(r"[、。・「」（）\s]", "", t)
    return {t[i : i + 2] for i in range(len(t) - 1)}


def sim(a, b):
    ga, gb = grams(a), grams(b)
    if not ga or not gb:
        return 0
    return len(ga & gb) / min(len(ga), len(gb))


SPEC = re.compile(r"\d+(?:\.\d+)?(?:〜\d+(?:\.\d+)?)?\s*(?:号|g|ft|フィート|番|lb|cm|m)")


def audit(path, th=0.6):
    d = json.load(open(path, encoding="utf-8"))
    lines = []
    for i, s in enumerate(d["video"]["scenes"]):
        for ln in s["lines"]:
            text = ln if isinstance(ln, str) else ln.get("text", "")
            lines.append((i, s["type"], s.get("heading", s.get("title", "")), text))
    issues = []
    for a in range(len(lines)):
        for b in range(a + 1, len(lines)):
            ia, ta, ha, xa = lines[a]
            ib, tb, hb, xb = lines[b]
            if ia == ib or len(xa) < 14 or len(xb) < 14:
                continue
            r = sim(xa, xb)
            specs = set(SPEC.findall(xa)) & set(SPEC.findall(xb))
            if r >= th or len(specs) >= 2:
                issues.append((round(r, 2), sorted(specs), f"[{ia}:{ta}:{ha}] {xa[:60]}", f"[{ib}:{tb}:{hb}] {xb[:60]}"))
    return issues


if __name__ == "__main__":
    slugs = sys.argv[1:] or [os.path.basename(p)[:-5] for p in sorted(glob.glob("content/long/*.json"))]
    total = 0
    for s in slugs:
        iss = audit(f"content/long/{s}.json")
        total += len(iss)
        print(f"== {s}: {len(iss)}")
        for r, sp, a, b in iss:
            print(f"  {r} {sp}\n    {a}\n    {b}")
    print("TOTAL", total)
