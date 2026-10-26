# アプリ画面（/app/）をスマホの大きさで開いて、地図・釣り場の選択・下のシートを確かめる
import os
from playwright.sync_api import sync_playwright

BASE = "https://tsuredoki-kansai.mametarou0510mame.workers.dev"
os.makedirs("shots", exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True,
                        geolocation={"latitude": 34.70, "longitude": 135.30}, permissions=["geolocation"], locale="ja-JP")
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(BASE + "/app/", timeout=60000)
    pg.wait_for_timeout(6000)
    pg.screenshot(path="shots/app1-map.png")
    r = pg.request.get(BASE + "/app-data/spot/minami-ashiyahama-minami-gogan.json")
    print(f"::notice::spot json {r.status} {len(r.body())} bytes {r.headers.get('content-type')}")
    pg.click("text=近くの釣り場")
    pg.wait_for_timeout(3000)
    pg.screenshot(path="shots/app2-near.png")
    pg.locator(".fa-near button").first.click()
    pg.wait_for_timeout(5000)
    pg.screenshot(path="shots/app3-peek.png")
    pg.click(".fa-more")
    pg.wait_for_timeout(2500)
    pg.screenshot(path="shots/app4-full.png")
    pg.locator(".fa-sheet").evaluate("e => e.scrollTo(0, e.scrollHeight * 0.55)")
    pg.wait_for_timeout(1500)
    pg.screenshot(path="shots/app5-methods.png")
    pg.locator(".fa-sheet").evaluate("e => e.scrollTo(0, e.scrollHeight)")
    pg.wait_for_timeout(1000)
    pg.screenshot(path="shots/app6-gear.png")
    print(f"::notice::errors={errs[:5]}")
    b.close()
