import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright
import urllib.parse

BASE = 'http://localhost:5174'

def snap(page, label):
    info = page.evaluate('''() => {
      const n = window.__nts, e = n.engine
      const s = n.shop
      return {
        state: n.state(),
        cam: e.camera.position.toArray().map(v => +v.toFixed(2)),
        target: e.controls.target.toArray().map(v => +v.toFixed(2)),
        shopPos: s ? s.shopRoot.position.toArray().map(v => +v.toFixed(2)) : null,
        time: e.clock.elapsedTime,
        sceneChildren: e.scene.children.length,
      }
    }''')
    print(f'[{label}] {info}')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--enable-unsafe-webgpu'])
    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    page.on('pageerror', lambda e: print('PAGEERROR:', str(e)[:400]))
    page.on('console', lambda m: print('CONSOLE:', m.type, m.text[:200]) if m.type in ('error', 'warning') else None)

    page.goto(f'{BASE}/?name={urllib.parse.quote("张三")}', timeout=60000)
    page.wait_for_timeout(9000)
    snap(page, 'initial')

    page.evaluate('() => window.__nts.enterShop()')
    page.wait_for_timeout(2600)
    snap(page, 'after enterShop')
    page.screenshot(path='test/d4_inside.png')

    page.evaluate('() => window.__nts.exitShop()')
    page.wait_for_timeout(2400)
    snap(page, 'after exitShop')

    page.evaluate('() => window.__nts.toggleFly()')
    page.wait_for_timeout(1200)
    snap(page, 'fly+1.2s')
    page.wait_for_timeout(3000)
    snap(page, 'fly+4.2s')
    page.screenshot(path='test/d4_flying.png')

    browser.close()
