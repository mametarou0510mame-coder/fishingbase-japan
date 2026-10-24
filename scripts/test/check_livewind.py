# 釣り場ページの「いまの風（実測）」と、時間ごとの風の表示を確かめる
import os
from playwright.sync_api import sync_playwright

URL = "https://tsuredoki-kansai.mametarou0510mame.workers.dev/kansai/hyogo/minami-ashiyahama-minami-gogan/"
os.makedirs("shots", exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 420, "height": 1800})
    pg.goto(URL, timeout=60000)
    pg.wait_for_timeout(5000)
    lw = pg.locator(".live-wind")
    print(f"::notice::live-wind count={lw.count()} text={lw.first.inner_text()[:300].replace(chr(10),' / ') if lw.count() else '-'}")
    print(f"::notice::note={pg.locator('.hourly .small').last.inner_text()[:300]}")
    lw.first.scroll_into_view_if_needed()
    pg.screenshot(path="shots/livewind.png", full_page=False)
    b.close()
