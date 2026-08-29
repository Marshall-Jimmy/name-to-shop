import sys, io, json, urllib.parse
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright

name = sys.argv[1] if len(sys.argv) > 1 else '张三'
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--enable-unsafe-webgpu'])
    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    counts = {'before': 0, 'hide_env': 0, 'hide_sky': 0, 'hide_pts': 0}
    page.on('console', lambda m: counts.__setitem__('before', counts['before'] + 1) if m.type == 'warning' and 'INVALID' in m.text else None)
    page.goto(f'http://localhost:5174/?name={urllib.parse.quote(name)}', timeout=60000)
    page.wait_for_timeout(6000)

    # 统计各类对象
    info = page.evaluate("""() => {
      const S = window.__nts; if (!S) return 'no hook'
      const e = S.engine
      let sprites = 0, points = 0, meshes = 0
      e.scene.traverse(o => {
        if (o.isSprite) sprites++
        if (o.isPoints) points++
        if (o.isMesh) meshes++
      })
      return { sprites, points, meshes, state: S.state() }
    }""")
    print('SCENE:', info)

    # 隐藏天空套件（太阳/云 sprite）
    r1 = page.evaluate("""() => {
      const e = window.__nts.engine
      e.envGroup.visible = false
      return 'env hidden'
    }""")
    page.wait_for_timeout(1500)
    # 重新显示 env，隐藏店铺粒子
    page.evaluate("""() => {
      const e = window.__nts.engine
      e.envGroup.visible = true
      const shop = window.__nts.shop
      if (shop) shop.ctx.animate.length = 0
      shop.shopRoot.traverse(o => { if (o.isPoints) o.visible = false })
      return 'points hidden'
    }""")
    page.wait_for_timeout(1500)
    browser.close()

# 重新跑一遍分开统计
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--enable-unsafe-webgpu'])
    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    n = {'c': 0}
    page.on('console', lambda m: n.__setitem__('c', n['c'] + 1) if m.type == 'warning' and 'INVALID' in m.text else None)
    page.goto(f'http://localhost:5174/?name={urllib.parse.quote(name)}', timeout=60000)
    page.wait_for_timeout(5000)
    base = n['c']
    page.evaluate("window.__nts.engine.envGroup.visible = false")
    page.wait_for_timeout(2000)
    after_env = n['c'] - base
    page.evaluate("window.__nts.engine.envGroup.visible = true")
    page.wait_for_timeout(1000)
    base2 = n['c']
    page.evaluate("""() => { const s = window.__nts.shop; if (s) { s.shopRoot.traverse(o => { if (o.isPoints) o.visible = false }) } }""")
    page.wait_for_timeout(2000)
    after_pts = n['c'] - base2
    browser.close()
    print(f'INVALID warnings: baseline 5s = {base}, hide-env 2s = {after_env}, hide-shop-points 2s = {after_pts}')
