import sys, io, urllib.parse
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright

name = sys.argv[1] if len(sys.argv) > 1 else '张三'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--enable-unsafe-webgpu'])
    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    n = {'c': 0}
    page.on('console', lambda m: n.__setitem__('c', n['c'] + 1) if m.type == 'warning' and 'INVALID' in m.text else None)
    page.goto(f'http://localhost:5174/?name={urllib.parse.quote(name)}', timeout=60000)
    page.wait_for_timeout(5000)

    # 全部隐藏
    page.evaluate("""() => {
      const e = window.__nts.engine, s = window.__nts.shop
      for (const c of [...e.scene.children]) c.visible = false
      window.__groups = { env: e.envGroup, shop: s.shopRoot, ground: s.groundRoot, cam: e.camera }
      window.__others = [...e.scene.children].filter(c => ![s.shopRoot, s.groundRoot, e.envGroup, e.camera].includes(c))
    }""")
    page.wait_for_timeout(1200)

    def sample(label, show, wait=1500):
        base = n['c']
        page.evaluate(f'window.__groups.{show}.visible = true')
        page.wait_for_timeout(wait)
        print(f'{label}: {n["c"] - base}')
        page.evaluate(f'window.__groups.{show}.visible = false')

    sample('envGroup only(sky/sun/clouds)', 'env')
    sample('shopRoot only', 'shop')
    sample('groundRoot only', 'ground')
    sample('camera only(toasts/sprites)', 'cam')
    # 恢复
    page.evaluate("""() => {
      for (const g of Object.values(window.__groups)) g.visible = true
      for (const o of window.__others) o.visible = true
    }""")
    browser.close()
