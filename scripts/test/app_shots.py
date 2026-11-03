# Instagram のサイト紹介用に、公開中のサイトをスマホの画面で撮る（GitHub Actions で実行）
import os
os.makedirs("shots", exist_ok=True)
from playwright.sync_api import sync_playwright

SITE = "https://tsuredoki-kansai.mametarou0510mame.workers.dev"
PAGES = [("tide-osaka", "/tide/os/"), ("tide-hakodate", "/tide/hk/"), ("aquarium", "/aquarium/")]
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=3, is_mobile=True, has_touch=True)
    pg.add_init_script("""if (!localStorage.getItem('tsuredoki:aquarium:v1')) localStorage.setItem('tsuredoki:aquarium:v1', JSON.stringify({v:1,nickname:'わたし',fish:[
      {id:'s1',date:'2026-10-20',spot:'',species:'ハマチ',sizeCm:80,count:1,method:'',memo:''},{id:'s2',date:'2026-10-16',spot:'',species:'アジ',sizeCm:18,count:1,method:'',memo:''},
      {id:'s3',date:'2026-10-15',spot:'',species:'ガシラ（カサゴ）',sizeCm:20,count:1,method:'',memo:''},{id:'s4',date:'2026-10-14',spot:'',species:'アオリイカ',sizeCm:25,count:1,method:'',memo:''},
      {id:'s5',date:'2026-10-13',spot:'',species:'タチウオ',sizeCm:70,count:1,method:'',memo:''}]}));""")
    for name, path in PAGES:
        try:
            pg.goto(SITE + path, wait_until="networkidle", timeout=60000)
        except Exception as e:
            print(f"::warning::{path}: {e}")
        pg.wait_for_timeout(3500)
        pg.screenshot(path=f"shots/{name}.png")
        # 下へスクロールした画面も
        for j in (1, 2, 3):
            pg.mouse.wheel(0, 600)
            pg.wait_for_timeout(1500)
            pg.screenshot(path=f"shots/{name}-{j + 1}.png")
        print(f"::notice::{path} ok")
    b.close()
