# 公開中のサイトで「写真から魚を自動で切り抜く」が動くか確かめる（GitHub Actions で実行）
import os, sys
os.makedirs("shots", exist_ok=True)
from playwright.sync_api import sync_playwright

SITE = "https://tsuredoki-kansai.mametarou0510mame.workers.dev"
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 800, "height": 1000})
    logs = []
    pg.on("console", lambda m: logs.append(f"{m.type}: {m.text}"))
    pg.on("pageerror", lambda e: logs.append(f"pageerror: {e}"))
    pg.goto(f"{SITE}/aquarium/")
    pg.wait_for_timeout(1500)
    pg.get_by_role("tab", name="釣果を登録").click()
    pg.wait_for_timeout(800)
    pg.locator("select").nth(1).select_option("マダイ")
    pg.locator("input[type=file]").set_input_files("scripts/test/fishphoto.jpg")
    pg.locator("form button[type=submit]").click()
    pg.wait_for_timeout(1500)
    c = pg.locator(".cutout-canvas")
    bb = c.bounding_box()
    pg.mouse.click(bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2)
    msg = ""
    for _ in range(90):
        pg.wait_for_timeout(1000)
        msg = pg.locator(".cutout p.small").first.inner_text()
        if "探しています" not in msg:
            break
    cov = pg.evaluate("""() => { const c = document.querySelector('.cutout-canvas'); const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
      let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i+2] > 200 && d[i] < 160 && d[i+1] > 120) n++; return n / (c.width*c.height); }""")
    print(f"::notice::message: {msg}")
    print(f"::notice::cyan coverage: {cov:.3f}")
    for l in logs[-8:]:
        print(f"::notice::log {l[:300]}")
    pg.locator(".cutout-canvas").screenshot(path="shots/1-select.png")
    if cov > 0.05:
        pg.get_by_role("button", name="次へ").click()
        pg.wait_for_timeout(1000)
        pg.get_by_role("button", name="これで決定").click()
        pg.wait_for_timeout(4000)
        g = pg.locator(".gyotaku-svg")
        g.screenshot(path="shots/2-photo.png")
        pg.get_by_text("墨の魚拓").click()
        pg.wait_for_timeout(1500)
        g.screenshot(path="shots/3-ink.png")
        pg.wait_for_timeout(1000)
        pg.locator(".tank").screenshot(path="shots/4-tank.png")
    b.close()
    sys.exit(0 if cov > 0.05 else 1)
