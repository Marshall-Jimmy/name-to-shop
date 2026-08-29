import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright
import urllib.parse

BASE = 'http://localhost:5174'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--enable-unsafe-webgpu'])
    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    page.on('pageerror', lambda e: print('PAGEERROR:', str(e)[:400]))
    page.on('console', lambda m: print('CONSOLE:', m.type, m.text[:250]) if m.type in ('error', 'warning') and 'ReadPixels' not in m.text and 'WebGPU' not in m.text and 'adapters' not in m.text else None)

    page.goto(f'{BASE}/?name={urllib.parse.quote("张三")}', timeout=60000)
    page.wait_for_function('() => window.__nts && window.__nts.state() === "shop"', timeout=30000)
    page.wait_for_timeout(5000)

    print('meta:', page.evaluate('''() => {
      const m = window.__nts.shop.meta
      return { enter: m.enterPoint.toArray().map(v=>+v.toFixed(2)), exit: m.exitPoint.toArray().map(v=>+v.toFixed(2)), hero: m.cameraHero.toArray().map(v=>+v.toFixed(2)) }
    }'''))
    print('cam before:', page.evaluate('() => window.__nts.camPos.map(v=>+v.toFixed(2))'))
    page.evaluate('() => window.__nts.enterShop()')
    for i in range(10):
        page.wait_for_timeout(1000)
        st = page.evaluate('() => ({ mode: window.__nts.mode(), cam: window.__nts.camPos.map(v=>+v.toFixed(2)) })')
        print(f't+{i+1}s {st}')
    page.screenshot(path='test/d5_inside.png')
    browser.close()
