import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright
import urllib.parse

BASE = 'http://localhost:5174'

def wait_mode(page, key, val, timeout=40000):
    return page.wait_for_function(
        f'() => window.__nts && window.__nts.mode().{key} === {val}', timeout=timeout)

def run():
    logs, errors = [], []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--enable-unsafe-webgpu'])
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.on('console', lambda m: logs.append(f'[{m.type}] {m.text[:200]}'))
        page.on('pageerror', lambda e: errors.append(str(e)[:500]))

        page.goto(f'{BASE}/?name={urllib.parse.quote("张三")}', timeout=60000)
        page.wait_for_function('() => window.__nts && window.__nts.state() === "shop"', timeout=30000)
        page.wait_for_timeout(5000)
        page.screenshot(path='test/shot_exterior.png')
        hero = page.evaluate('() => window.__nts.shop.meta.cameraHero.toArray().map(v=>+v.toFixed(2))')
        enter = page.evaluate('() => window.__nts.shop.meta.enterPoint.toArray().map(v=>+v.toFixed(2))')
        exitP = page.evaluate('() => window.__nts.shop.meta.exitPoint.toArray().map(v=>+v.toFixed(2))')
        print(f'hero={hero} enter={enter} exit={exitP}')

        # 进店：等相机真正到达 enterPoint
        page.evaluate('() => window.__nts.enterShop()')
        page.wait_for_function(
            f'() => window.__nts.camNear({enter[0]}, {enter[1]}, {enter[2]}, 0.4)', timeout=40000)
        page.wait_for_timeout(800)
        page.screenshot(path='test/shot_inside.png')
        print('inside: OK', page.evaluate('() => window.__nts.camPos.map(v=>+v.toFixed(2))'))

        # 出店：等相机回到 hero
        page.evaluate('() => window.__nts.exitShop()')
        page.wait_for_function(
            f'() => window.__nts.camNear({hero[0]}, {hero[1]}, {hero[2]}, 0.4)', timeout=40000)
        page.wait_for_timeout(800)
        page.screenshot(path='test/shot_back_outside.png')
        print('exit: OK', page.evaluate('() => window.__nts.camPos.map(v=>+v.toFixed(2))'))

        # 飞行
        page.evaluate('() => window.__nts.toggleFly()')
        wait_mode(page, 'flying', 'true')
        page.wait_for_timeout(6000)
        pos = page.evaluate('() => window.__nts.shop.shopRoot.position.toArray().map(v=>+v.toFixed(2))')
        print(f'flying pos={pos}')
        page.screenshot(path='test/shot_flying.png')

        # 降落
        page.evaluate('() => window.__nts.toggleFly()')
        wait_mode(page, 'flying', 'false')
        page.wait_for_function(
            '() => window.__nts.shop.shopRoot.position.length() < 0.02', timeout=30000)
        print('landed: OK')
        page.wait_for_timeout(800)
        page.screenshot(path='test/shot_landed.png')

        browser.close()

    print('--- PAGE ERRORS ---')
    for e in errors[:15]: print(e)
    print('--- WARN/ERROR ---')
    for l in logs:
        if l.startswith('[warning]') or l.startswith('[error]'):
            if 'ReadPixels' in l or 'WebGPU' in l or 'adapters' in l: continue
            print(l)

run()
