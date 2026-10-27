# タイドグラフ（/tide/）と釣り場ページの潮の表示を、スマホの大きさで開いて確かめる
import os
from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE", "https://tsuredoki-kansai.mametarou0510mame.workers.dev")
os.makedirs("shots", exist_ok=True)
bad = 0
with sync_playwright() as p:
    b = p.chromium.launch()
    for scheme in ["light", "dark"]:
        ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True,
                            locale="ja-JP", timezone_id="Asia/Tokyo", color_scheme=scheme,
                            geolocation={"latitude": 34.65, "longitude": 135.43}, permissions=["geolocation"])
        pg = ctx.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        for name, path, wait in [
            ("tide-index", "/tide/", ".tv-pick"),
            ("tide-os", "/tide/os/", ".tv-svg"),
            ("tide-hk", "/tide/hk/", ".tv-svg"),
            ("shio", "/shio/nanko-uotsuri-en/", ".shio-now"),
            ("spot", "/kansai/osaka/nanko-uotsuri-en/", ".tide-chart"),
        ]:
            if scheme == "dark" and name not in ("tide-os",):
                continue
            pg.goto(BASE + path, timeout=60000)
            try:
                pg.wait_for_selector(wait, timeout=20000)
            except Exception as e:
                print(f"::error::{path} {wait} が出ない: {e}")
                bad += 1
            pg.wait_for_timeout(5000)
            pg.screenshot(path=f"shots/{name}-{scheme}.png", full_page=True)
            print(f"::notice::{path} now={pg.locator('.tv-now strong').all_inner_texts()[:1]} obs={pg.locator('.tv-obs').count()} legend={pg.locator('.tv-legend').all_inner_texts()[:1]}")
        if name == "tide-os" or True:
            pg.goto(BASE + "/tide/os/", timeout=60000)
            pg.wait_for_selector(".tv-svg", timeout=20000)
            pg.click("button[aria-label='前の日']")
            pg.wait_for_timeout(4000)
            pg.screenshot(path=f"shots/tide-os-yesterday-{scheme}.png", full_page=True)
            # 3か月前（毎時の実測）
            pg.evaluate("""() => { const i = document.querySelector('.tv-date input'); const d = new Date(Date.now() + 9*3600e3 - 90*86400e3).toISOString().slice(0,10);
              const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, d); i.dispatchEvent(new Event('input', {bubbles: true})); i.dispatchEvent(new Event('change', {bubbles: true})); }""")
            pg.wait_for_timeout(6000)
            print(f"::notice::90日前 obs={pg.locator('.tv-obs').count()} {pg.locator('.tv-legend').all_inner_texts()[:1]}")
            pg.screenshot(path=f"shots/tide-os-90d-{scheme}.png", full_page=True)
        if errs:
            print("::warning::console errors: " + " | ".join(errs[:8]))
        ctx.close()
    b.close()
if bad:
    raise SystemExit(1)
