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

    def sample(label, code, wait=1800):
        base = n['c']
        page.evaluate(code)
        page.wait_for_timeout(wait)
        print(f'{label}: {n["c"] - base} warnings in {wait/1000:.1f}s')

    sample('baseline-1s', '1', 1000)
    sample('hide groundRoot', 'window.__nts.shop.groundRoot.visible = false')
    sample('hide shopRoot', 'window.__nts.shop.shopRoot.visible = false')
    sample('show groundRoot only', 'window.__nts.shop.groundRoot.visible = true')
    sample('hide ALL scene children', """() => {
      const e = window.__nts.engine
      for (const c of [...e.scene.children]) c.visible = false
    }""")
    sample('show all again', """() => {
      const e = window.__nts.engine
      for (const c of [...e.scene.children]) c.visible = true
      e.envGroup.visible = true
    }""")
    browser.close()
