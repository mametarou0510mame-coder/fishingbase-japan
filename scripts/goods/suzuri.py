"""SUZURI API でグッズを作る。

  python scripts/goods/suzuri.py items            作れるアイテム（生地・色・値段）を data/goods/suzuri-items.json に保存
  python scripts/goods/suzuri.py create SPEC.json  SPEC のとおりに素材とグッズを作る（published は SPEC で指定）

トークンは環境変数 SUZURI_TOKEN（GitHub Secrets）。ログやファイルにトークンを出さない。
"""
import base64, json, os, sys, urllib.request, urllib.error

API = "https://suzuri.jp/api/v1"
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def req(method, path, body=None):
    tok = os.environ.get("SUZURI_TOKEN", "").strip()
    if not tok:
        sys.exit("SUZURI_TOKEN が未登録です（GitHub Secrets に登録してください）")
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(API + path, data=data, method=method, headers={
        "Authorization": "Bearer " + tok, "Content-Type": "application/json", "Accept": "application/json"})
    try:
        with urllib.request.urlopen(r, timeout=180) as res:
            return json.loads(res.read() or b"{}")
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code}: {e.read().decode('utf-8', 'replace')[:800]}")


def summary(t):
    print(t)
    p = os.environ.get("GITHUB_STEP_SUMMARY")
    if p:
        open(p, "a", encoding="utf-8").write(t + "\n")


def cmd_items():
    d = req("GET", "/items")
    items = d.get("items", d)
    out = os.path.join(ROOT, "data/goods/suzuri-items.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(items, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    rows = []
    for it in items:
        name = it.get("humanizeName") or it.get("name")
        vs = it.get("variants") or []
        prices = sorted({v.get("price") for v in vs if v.get("price")})
        colors = sorted({(v.get("color") or {}).get("name", "") for v in vs})
        rows.append(f"| {it.get('id')} | {it.get('name')} | {name} | {prices[0] if prices else ''} | {len(colors)} |")
    summary("| id | name | 名前 | 最安 | 色数 |\n|---|---|---|---|---|\n" + "\n".join(rows))


def texture(path):
    raw = open(os.path.join(ROOT, path), "rb").read()
    return "data:image/png;base64," + base64.b64encode(raw).decode()


def cmd_create(spec_path):
    spec = json.load(open(os.path.join(ROOT, spec_path), encoding="utf-8"))
    for m in spec["materials"]:
        prods = []
        for p in m["products"]:
            q = {k: v for k, v in p.items() if k != "sub_materials"}
            if p.get("sub_materials"):
                q["sub_materials"] = [{"texture": texture(s["texture"]), "printSide": s.get("printSide", "back"),
                                       "enabled": True} for s in p["sub_materials"]]
            prods.append(q)
        body = {"texture": texture(m["texture"]), "title": m["title"], "description": m.get("description", ""),
                "products": prods}
        if "price" in m:
            body["price"] = m["price"]
        r = req("POST", "/materials", body)
        mat = r.get("material", {})
        summary(f"### {m['title']}\nmaterial id {mat.get('id')}")
        for pr in r.get("products", []):
            summary(f"- {pr.get('item', {}).get('humanizeName')}：{pr.get('sampleUrl') or pr.get('url') or ''}（published={pr.get('published')}）")


def cmd_publish(spec_path, flag="true"):
    """SPEC の materials に material_id があるものを公開（flag=false で非公開）にする"""
    spec = json.load(open(os.path.join(ROOT, spec_path), encoding="utf-8"))
    pub = flag != "false"
    for m in spec["materials"]:
        if not m.get("material_id"):
            continue
        prods = [{"itemId": p["itemId"], "exemplaryItemVariantId": p["exemplaryItemVariantId"], "published": pub,
                  "resizeMode": p.get("resizeMode", "contain")} for p in m["products"]]
        body = {"products": prods}
        for k in ("title", "description"):
            if m.get(k):
                body[k] = m[k]
        r = req("PUT", f"/materials/{m['material_id']}", body)
        for pr in r.get("products", []):
            summary(f"{m['title']}：{pr.get('sampleUrl') or ''}（published={pr.get('published')}）")
            for u in [pr.get("sampleImageUrl"), pr.get("pngSampleImageUrl")]:
                if u:
                    summary(f"  image {u}")


def cmd_me():
    r = req("GET", "/user")
    u = r.get("user", r)
    summary("```\n" + json.dumps(u, ensure_ascii=False, indent=1)[:3000] + "\n```")


def cmd_profile(spec_path):
    """content/goods/shop-profile.json の内容でショップ情報を更新（PUT /user）"""
    sp = json.load(open(os.path.join(ROOT, spec_path), encoding="utf-8"))
    body = {}
    if sp.get("displayName"):
        body["displayName"] = sp["displayName"]
    raw = "https://raw.githubusercontent.com/mametarou0510mame-coder/fishingbase-japan/main/"
    img = (lambda p: raw + p) if sp.get("imageAsUrl") else texture
    if sp.get("avatar"):
        body["avatar"] = img(sp["avatar"])
    prof = {k: sp[k] for k in ("body", "url") if sp.get(k)}
    if sp.get("headerImage"):
        prof["headerImage"] = img(sp["headerImage"])
    if prof:
        body["profile"] = prof
    r = req("PUT", "/user", body)
    u = r.get("user", r)
    summary("更新しました：" + json.dumps({k: u.get(k) for k in ("name", "displayName", "avatarUrl", "profile")}, ensure_ascii=False))


def cmd_preview(ids):
    out = os.path.join(ROOT, "data/goods/preview")
    os.makedirs(out, exist_ok=True)
    for mid in ids.split(","):
        r = req("GET", f"/products?materialId={mid}&limit=50")
        if not r.get("products"):
            m = req("GET", f"/materials/{mid}")
            r = {"products": m.get("products") or (m.get("material") or {}).get("products") or [], "raw": m}
        for pr in r.get("products", []):
            urls = [pr.get("sampleImageUrl"), pr.get("pngSampleImageUrl")] + [u for u in (pr.get("sampleUrlsBack") or [])]
            name = pr.get("item", {}).get("name", "item")
            summary(f"{mid} {name} published={pr.get('published')} {pr.get('sampleUrl','')}")
            for i, u in enumerate([u for u in urls if u][:3]):
                try:
                    data = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=60).read()
                    open(os.path.join(out, f"{mid}-{name}-{i}.jpg"), "wb").write(data)
                except Exception as e:
                    summary(f"  画像取得エラー {u}: {e}")
        json.dump(r, open(os.path.join(out, f"{mid}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    {"items": lambda: cmd_items(), "create": lambda: cmd_create(a[1]), "preview": lambda: cmd_preview(a[1]), "publish": lambda: cmd_publish(a[1], *(a[2:3])), "unpublish": lambda: cmd_publish(a[1], "false"), "me": lambda: cmd_me(), "profile": lambda: cmd_profile(a[1])}[a[0]]()
