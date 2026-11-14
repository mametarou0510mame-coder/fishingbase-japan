# 魚拓の共有用の3つの形（Instagram 投稿・ストーリー・X）を、写真から作って PNG で保存できるか確かめる。
#   BASE=http://localhost:3000 PHOTO=scripts/test/ishidai.jpg SPECIES=イシダイ SIZE=40 python3 scripts/test/check_gyotaku.py
import os, sys
from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE", "https://tsuredoki-kansai.mametarou0510mame.workers.dev")
PHOTO = os.environ.get("PHOTO", "scripts/test/ishidai.jpg")
SPECIES = os.environ.get("SPECIES", "イシダイ")
SIZE = os.environ.get("SIZE", "")
TAP = [float(v) for v in os.environ.get("TAP", "0.5,0.45").split(",")]
os.makedirs("shots", exist_ok=True)
ok = True
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 940, "height": 1600}, device_scale_factor=1, accept_downloads=True)
    pg.add_init_script("""if (!localStorage.getItem('tsuredoki:aquarium:v1')) localStorage.setItem('tsuredoki:aquarium:v1', JSON.stringify({v:1,nickname:'ツレドキ',fish:[]}));""")
    logs = []
    pg.on("pageerror", lambda e: logs.append(f"pageerror: {e}"))
    pg.goto(f"{BASE}/aquarium/")
    pg.wait_for_timeout(1500)
    pg.get_by_role("tab", name="釣果を登録").click()
    pg.wait_for_timeout(800)
    pg.locator("select").nth(1).select_option(SPECIES)
    if SIZE:
        pg.locator("input[type=number]").first.fill(SIZE)
    pg.locator("input[type=file]").set_input_files(PHOTO)
    pg.locator("form button[type=submit]").click()
    msg = lambda: pg.locator(".cutout p.small").first.inner_text()
    for _ in range(30):
        pg.wait_for_timeout(1000)
        if "タップしてください" in msg():
            break
    c = pg.locator(".cutout-canvas")
    c.scroll_into_view_if_needed()
    bb = c.bounding_box()
    c.click(position={"x": bb["width"] * TAP[0], "y": bb["height"] * TAP[1]})
    for _ in range(120):
        pg.wait_for_timeout(1000)
        if "水色" in msg() or "自動で選べ" in msg():
            break
    print(f"::notice::cutout: {msg()}")
    pg.wait_for_timeout(500)
    c.screenshot(path="shots/gy-0-select.png")
    pg.get_by_role("button", name="次へ").click()
    pg.wait_for_timeout(1000)
    pg.get_by_role("button", name="これで決定").click()
    pg.wait_for_timeout(5000)
    for mode in ("写真の魚拓", "墨の魚拓"):
        pg.get_by_role("button", name=mode).click()
        pg.wait_for_timeout(1500)
        for i, f in enumerate(("Instagram 投稿（縦）", "ストーリー", "X（横）")):
            pg.get_by_role("button", name=f).click()
            pg.wait_for_timeout(1200)
            try:
                with pg.expect_download(timeout=30000) as d:
                    pg.get_by_role("button", name="画像で保存・共有").click()
                d.value.save_as(f"shots/gy-{'photo' if mode == '写真の魚拓' else 'ink'}-{['ig', 'story', 'x'][i]}.png")
            except Exception as e:
                ok = False
                print(f"::error::{mode} {f}: {e}")
    for l in logs[-8:]:
        print(f"::notice::log {l[:300]}")
    b.close()
print("::notice::gyotaku ok" if ok else "::error::gyotaku failed")
sys.exit(0 if ok else 1)
