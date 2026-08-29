// 主入口：loading → typing → shop（进店/飞行）· 3D 场景 + 屏幕嵌入式 HUD
import * as THREE from 'three/webgpu'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { Engine } from './scene/engine.js'
import { rollShop, lightingPresets, businesses, styles } from './core/dna.js'
import { buildShop } from './gen/building.js'
import { loadAssets } from './assets/index.js'
import { clearTextureCache, disposeObject, insetPolygon, pointInPolygon, centroid } from './gen/helpers.js'
import { Typewriter } from './ui/typewriter.js'
import { HUD, randomName, dailyName } from './ui/hud.js'
import { RarityCard, HoverLabel } from './ui/labels.js'
import { Loader3D } from './ui/loader3d.js'
import { panelTexture, roundedPanel, FONT, makePanelSprite } from './ui/sprites.js'
import { tween, updateTweens, killTweens, flyCamera, Ease, debugTweens, hasCameraTween } from './core/tween.js'
import { ensureAudio, sfx, setMuted, isMuted, flyHum } from './core/audio.js'

// ---------- 全局状态 ----------
let engine, hud, typewriter, rarityCard, hoverLabel, loader, statsPlate
let assets = null
let shop = null
let state = 'loading'    // loading | typing | shop
const mode = { inside: false, flying: false, transitioning: false }
let flightT = 0, flyAmp = 0
let hoveredEntry = null
const isTouch = matchMedia('(pointer: coarse)').matches
const raycaster = new THREE.Raycaster()
const pointerNDC = new THREE.Vector2()
const highlightMats = []

// ---------- 图鉴（localStorage）----------
function loadDex() {
  try { return JSON.parse(localStorage.getItem('nts-dex')) || { entries: [] } }
  catch { return { entries: [] } }
}
function saveDex(d) { localStorage.setItem('nts-dex', JSON.stringify(d)) }
function recordDex(dna) {
  const d = loadDex()
  d.entries = d.entries.filter(e => e.name !== dna.name)
  d.entries.push({
    name: dna.name, biz: dna.business.id, style: dna.style.id, rarity: dna.rarity,
    bizName: dna.business.name, styleName: dna.style.name, date: Date.now(),
  })
  if (d.entries.length > 200) d.entries = d.entries.slice(-200)
  saveDex(d)
}
function dexStats() {
  const d = loadDex()
  const biz = new Set(d.entries.map(e => e.biz))
  const st = new Set(d.entries.map(e => e.style))
  return {
    count: d.entries.length, biz: biz.size, styles: st.size,
    bizTotal: businesses.length, styleTotal: styles.length,
    eggs: hud?.unlockedCount() || 0,
  }
}

// ---------- 启动 ----------
const app = document.getElementById('app')

async function boot() {
  engine = new Engine()
  await engine.init(app)
  engine.scene.add(engine.camera)
  rarityCard = new RarityCard()
  hoverLabel = new HoverLabel()
  engine.scene.add(rarityCard.group, hoverLabel.group)

  const nightPreset = lightingPresets.find(l => l.id === 'night')
  engine.setEnvironment(nightPreset, 0)

  loader = new Loader3D()
  engine.scene.add(loader.group)
  engine.camera.position.set(4.5, 3.4, 6.5)
  engine.controls.target.set(0, 1.3, 0)
  engine.onTick(tick)

  hud = new HUD({ onAction: onHudAction })

  engine.renderer.setAnimationLoop(() => {
    engine.clock.update()
    const dt = Math.min(0.25, engine.clock.getDelta())
    updateTweens(dt)
    engine.update(dt)
    engine.render()
  })

  assets = await loadAssets(p => loader.setProgress(p))
  loader.setProgress(1)
  sfx('sparkle')

  const urlName = new URLSearchParams(location.search).get('name')
  await new Promise(r => setTimeout(r, urlName ? 600 : 300))
  loader.dispose()
  engine.scene.remove(loader.group)
  loader = null
  if (urlName && urlName.trim()) {
    startShop(urlName.trim())
  } else {
    enterTyping()
  }
}

// ---------- 造物台（打字机）----------
function enterTyping() {
  state = 'typing'
  mode.inside = false
  mode.flying = false
  mode.transitioning = false
  flyAmp = 0
  flyHum(false)
  killTweens()
  hoverLabel.hide()
  hud.hideDock()
  hud.hideTop()
  hud.hideModal()
  disposeShop()
  if (!typewriter) typewriter = new Typewriter()
  engine.scene.add(typewriter.group)
  typewriter.setName('')

  const dusk = lightingPresets.find(l => l.id === 'dusk')
  engine.setEnvironment(dusk, 0)

  // 图鉴铭牌（3D 装饰保留）
  const s = dexStats()
  const tex = panelTexture('dex-plate', 640, 170, (ctx) => {
    ctx.clearRect(0, 0, 640, 170)
    roundedPanel(ctx, 628, 158, 30, {
      bg: 'rgba(14,18,32,0.88)', border: 'rgba(255,209,102,0.75)', borderWidth: 3.5, glow: 'rgba(255,209,102,0.5)',
    })
    ctx.translate(6, 6)
    ctx.font = `700 40px ${FONT}`
    ctx.fillStyle = '#ffe6a8'
    ctx.textBaseline = 'middle'
    ctx.fillText(`已造 ${s.count} 家店`, 36, 50)
    ctx.font = `500 32px ${FONT}`
    ctx.fillStyle = 'rgba(220,228,245,0.82)'
    ctx.fillText(`图鉴 · 业态 ${s.biz}/${s.bizTotal} · 风格 ${s.styles}/${s.styleTotal} · 彩蛋 ${s.eggs}`, 36, 112)
  })
  if (statsPlate) {
    engine.scene.remove(statsPlate)
    statsPlate.material.map.dispose()
    statsPlate.material.dispose()
  }
  statsPlate = makePanelSprite(tex, 0.72, 640 / 170)
  statsPlate.position.set(0, 3.1, -1.6)
  statsPlate.userData.billboard = 'y'
  engine.scene.add(statsPlate)

  engine.controls.enabled = true
  engine.controls.minDistance = 3
  engine.controls.maxDistance = 14
  engine.controls.maxPolarAngle = Math.PI * 0.495
  flyCamera(engine.camera, engine.controls,
    new THREE.Vector3(0, 2.9, 5.4), new THREE.Vector3(0, 1.1, 0), 1.4, Ease.inOutCubic)

  hud.showInput('')
  hud.setChips([
    { label: '🎲 随机一家', action: 'random' },
    { label: `☀️ 今日挑战：${dailyName()}`, action: 'daily' },
    { label: '张三', action: 'chip' },
    { label: '猫猫咖啡', action: 'chip' },
    { label: '遥遥领先', action: 'chip' },
    { label: 'skibidi', action: 'chip' },
  ])
}

// ---------- 开业 ----------
function startShop(name) {
  state = 'shop'
  mode.inside = false
  mode.flying = false
  mode.transitioning = false
  flyAmp = 0
  flyHum(false)
  killTweens()
  hoverLabel.hide()
  hud.hideInput()
  hud.hideModal()

  if (typewriter) engine.scene.remove(typewriter.group)
  if (statsPlate) engine.scene.remove(statsPlate)
  disposeShop()

  const dna = rollShop(name)
  shop = buildShop(dna, assets)
  engine.scene.add(shop.shopRoot, shop.groundRoot)
  shop.fpInner = insetPolygon(shop.ctx.fp.pts, 0.8)
  shop.fpCentroid = centroid(shop.ctx.fp.pts)

  engine.setEnvironment(dna.lighting, dna.rarityMeta.glow)
  engine.controls.enabled = true
  engine.controls.minDistance = 4
  engine.controls.maxDistance = 60

  // 破土而出
  shop.shopRoot.scale.set(1, 0.001, 1)
  shop.groundRoot.scale.setScalar(0.001)
  tween({ dur: 1.0, ease: Ease.outBack, onUpdate: e => shop.shopRoot.scale.set(1, Math.max(0.001, e), 1) })
  tween({ dur: 1.3, ease: Ease.outQuint, onUpdate: e => shop.groundRoot.scale.setScalar(Math.max(0.001, e)) })

  // 电影运镜：环绕 → 落定英雄机位
  const meta = shop.meta
  const hero = meta.cameraHero.clone()
  const start = hero.clone().multiplyScalar(1.9).setY(hero.y + 7)
  engine.camera.position.copy(start)
  engine.controls.target.set(0, meta.bounds.h * 0.4, 0)
  flyCamera(engine.camera, engine.controls, hero,
    new THREE.Vector3(0, meta.bounds.h * 0.45, 0), 2.4, Ease.inOutCubic)

  // HUD
  hud.showTop(dna)
  hud.showDock()
  hud.setButtonState('door', false)
  hud.setButtonState('fly', false)
  hud.setButtonState('sound', isMuted())

  // 稀有度卡片（3D 悬浮展示保留）
  rarityCard.show(dna, new THREE.Vector3(0, meta.roofTop + 2.6, meta.bounds.d * 0.2))

  hud.toast(`${dna.name}的店 · 开业！`, {
    color: '#ffd166', sub: `${dna.business.name} × ${dna.style.name} · ${dna.lighting.name}`,
  })
  if (dna.eggs.length) {
    sfx('egg')
    hud.recordEggs(dna.eggs)
    for (const e of dna.eggs.slice(0, 3)) {
      hud.toast(`彩蛋命中：${e.n || e.t}`, { color: '#ff9de2', sub: e.sub || '隐藏效果已生效' })
    }
  } else {
    setTimeout(() => sfx('open'), 300)
  }
  if (!shop.ctx.valid) hud.toast('结构校验未通过，已启用安全小屋兜底', { color: '#ff8896' })

  engine.watermark = `${dna.name}的店 · ${dna.rarity} ${dna.rarityMeta.label} · ${dna.business.name}`
  engine.cardMeta = {
    rarity: dna.rarity, label: dna.rarityMeta.label,
    sub: `${dna.business.name} × ${dna.style.name}`,
  }
  recordDex(dna)
  history.replaceState(null, '', `?name=${encodeURIComponent(dna.name)}`)
}

function disposeShop() {
  if (!shop) return
  engine.scene.remove(shop.shopRoot, shop.groundRoot)
  disposeObject(shop.shopRoot)
  disposeObject(shop.groundRoot)
  clearTextureCache()
  shop = null
}

// ---------- 进店 / 出店 ----------
function enterShop() {
  if (!shop || mode.transitioning || mode.flying) {
    if (mode.flying) hud.toast('先降落，再进店', { color: '#ffd166' })
    return
  }
  mode.transitioning = true
  mode.inside = true
  sfx('enter')
  hud.setButtonState('door', true)
  const meta = shop.meta
  const lookAt = meta.interiorCenter.clone()
  flyCamera(engine.camera, engine.controls,
    meta.exitPoint.clone(), meta.doorWorld.clone().setY(1.5), 0.9, Ease.inOutCubic, () => {
      flyCamera(engine.camera, engine.controls,
        meta.enterPoint.clone(), lookAt, 1.1, Ease.inOutCubic, () => {
          mode.transitioning = false
          engine.controls.minDistance = 0.4
          engine.controls.maxDistance = 5.5
          engine.controls.maxPolarAngle = Math.PI * 0.55
          engine.controls.target.copy(lookAt)
          hud.toast('店内自由视角 · 点「出店」或按 ESC 离开', { color: '#7ec8ff', dur: 2.6 })
        })
    })
}

function exitShop() {
  if (!shop || mode.transitioning) return
  mode.transitioning = true
  mode.inside = false
  sfx('whoosh')
  hud.setButtonState('door', false)
  const meta = shop.meta
  const hero = meta.cameraHero.clone()
  flyCamera(engine.camera, engine.controls,
    meta.exitPoint.clone(), meta.doorWorld.clone().setY(1.5), 1.0, Ease.inOutCubic, () => {
      flyCamera(engine.camera, engine.controls, hero,
        new THREE.Vector3(0, meta.bounds.h * 0.45, 0), 1.4, Ease.inOutCubic, () => {
          mode.transitioning = false
          engine.controls.minDistance = 4
          engine.controls.maxDistance = 60
          engine.controls.maxPolarAngle = Math.PI * 0.495
        })
    })
}

// ---------- 飞行 ----------
function toggleFly() {
  if (!shop || mode.transitioning) return
  if (mode.inside) { hud.toast('在店里飞不起来，先出店', { color: '#ffd166' }); return }
  mode.flying = !mode.flying
  hud.setButtonState('fly', mode.flying)
  if (mode.flying) {
    sfx('flyUp'); flyHum(true)
    flightT = 0
    tween({ dur: 2.2, ease: Ease.inOutSine, onUpdate: e => { flyAmp = e } })
    hud.toast('起飞！整栋店盘旋中', { color: '#9d8cff', sub: '相机自动跟随 · 再点一次降落' })
  } else {
    sfx('flyDown'); flyHum(false)
    tween({ dur: 2.0, ease: Ease.inOutSine, onUpdate: e => { flyAmp = 1 - e } })
    hud.toast('平稳降落', { color: '#ffd166' })
  }
}

// ---------- HUD 动作 ----------
function onHudAction(id, value) {
  sfx('click')
  switch (id) {
    case 'door': mode.inside ? exitShop() : enterShop(); break
    case 'fly': toggleFly(); break
    case 'camera': doScreenshot(); break
    case 'cube': exportGLB(); break
    case 'link': shareURL(); break
    case 'star':
      if (shop) {
        rarityCard.show(shop.dna, new THREE.Vector3(0, shop.meta.roofTop + 2.6, shop.meta.bounds.d * 0.2))
        sfx('sparkle')
      }
      break
    case 'dex':
      hud.showDex({ stats: dexStats(), entries: loadDex().entries, onVisit: n => startShop(n) })
      break
    case 'eggs': hud.showEggs(); break
    case 'pencil': enterTyping(); break
    case 'sound': {
      const m = !isMuted()
      setMuted(m)
      hud.setButtonState('sound', m)
      hud.toast(m ? '已静音' : '音效开启', { color: '#9fb4d8', dur: 1.6 })
      break
    }
    case 'confirmName':
      if (state === 'typing' && value) startShop(value)
      break
    case 'typing':
      if (state === 'typing') typewriter.setName(value.slice(0, 16))
      break
    case 'random': {
      const n = randomName()
      hud.inputValue = n
      typewriter.setName(n)
      sfx('type')
      break
    }
    case 'daily': {
      const n = dailyName()
      hud.inputValue = n
      typewriter.setName(n)
      sfx('type')
      break
    }
    case 'chip':
      if (state === 'typing') {
        hud.inputValue = value
        typewriter.setName(value)
        sfx('type')
      }
      break
  }
}

async function doScreenshot() {
  if (!shop) return
  sfx('camera')
  engine.render()
  await new Promise(r => setTimeout(r, 60))
  engine.screenshot(`${shop.dna.name}的店.png`)
  hud.toast('截图已保存', { color: '#7ec8ff', sub: '带稀有度角标与种子水印，可直接转发' })
}

function exportGLB() {
  if (!shop) return
  sfx('click')
  hud.toast('正在打包 .glb 模型…', { color: '#9d8cff', dur: 2 })
  const exporter = new GLTFExporter()
  try {
    exporter.parse(shop.shopRoot, (buf) => {
      const blob = new Blob([buf], { type: 'model/gltf-binary' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${shop.dna.name}的店.glb`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 4000)
      hud.toast('模型已导出', { color: '#9d8cff', sub: '可导入 Blender / Three.js 编辑器' })
      sfx('sparkle')
    }, (err) => {
      console.error('[glb]', err)
      hud.toast('导出失败：部分组件不兼容', { color: '#ff8896' })
    }, { binary: true })
  } catch (e) {
    console.error('[glb]', e)
    hud.toast('导出失败', { color: '#ff8896' })
  }
}

async function shareURL() {
  if (!shop) return
  const url = `${location.origin}${location.pathname}?name=${encodeURIComponent(shop.dna.name)}`
  try {
    await navigator.clipboard.writeText(url)
    hud.toast('分享链接已复制', { color: '#6fe3b0', sub: '同一名字 = 同一栋店，发给朋友试试' })
  } catch {
    hud.toast(url.slice(0, 48), { color: '#6fe3b0', sub: '复制上方链接分享' })
  }
  sfx('click')
}

// ---------- 交互拾取 ----------
function findRoot(obj, pred) {
  let o = obj
  while (o) { if (pred(o)) return o; o = o.parent }
  return null
}

function pickables() {
  const list = []
  if (state === 'typing' && typewriter) list.push(...typewriter.keys)
  if (state === 'shop' && shop) {
    list.push(...(shop.ctx.hoverables || []))
    if (shop.ctx.doorMesh) list.push(shop.ctx.doorMesh)
  }
  return list
}

function raycastHover(clientX, clientY) {
  pointerNDC.set((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1)
  raycaster.setFromCamera(pointerNDC, engine.camera)
  const roots = pickables()
  if (!roots.length) return null
  const hits = raycaster.intersectObjects(roots, true)
  for (const h of hits) {
    if (h.object.userData.noExport) continue
    const twKey = findRoot(h.object, o => o.userData?.key)
    if (twKey && state === 'typing' && typewriter.keys.includes(twKey)) return { kind: 'tw', obj: twKey }
    const inter = findRoot(h.object, o => o.userData?.interact)
    if (inter && shop?.ctx.hoverables.includes(inter)) return { kind: 'interact', obj: inter }
    if (shop?.ctx.doorMesh) {
      const door = findRoot(h.object, o => o === shop.ctx.doorMesh)
      if (door) return { kind: 'interact', obj: door }
    }
  }
  return null
}

function applyHighlight(root) {
  root.traverse(o => {
    if (o.isMesh && o.material && o.material.emissiveIntensity !== undefined && !o.userData.noHighlight) {
      highlightMats.push({ mat: o.material, base: o.material.emissiveIntensity })
      o.material.emissiveIntensity = o.material.emissiveIntensity * 0.6 + 0.85
    }
  })
}
function clearHighlight() {
  for (const { mat, base } of highlightMats) mat.emissiveIntensity = base
  highlightMats.length = 0
}

let downXY = null
function bindPointer() {
  const el = engine.renderer.domElement
  // 触屏设备跳过 hover 射线（省性能，触屏无 hover 概念）
  if (!isTouch) {
    el.addEventListener('pointermove', e => {
      const hit = raycastHover(e.clientX, e.clientY)
      if (hit !== hoveredEntry) {
        hoveredEntry = hit
        clearHighlight()
        document.body.style.cursor = hit ? 'pointer' : 'default'
        if (state === 'typing') typewriter.hover(hit?.kind === 'tw' ? hit.obj : null)
        if (hit?.kind === 'interact') {
          applyHighlight(hit.obj)
          const it = hit.obj.userData.interact
          if (it?.label) {
            hoverLabel.show(it.label, it.sub || (shop ? `${shop.dna.business.name} · ${shop.dna.style.name}` : null))
            hoverLabel.group.visible = true
          }
        } else {
          hoverLabel.hide()
        }
      }
      if (hoveredEntry?.kind === 'interact') {
        hoverLabel.follow(hoveredEntry.obj, engine.camera)
      }
    })
  }

  el.addEventListener('pointerdown', e => {
    ensureAudio()
    downXY = { x: e.clientX, y: e.clientY }
  })

  el.addEventListener('pointerup', e => {
    if (!downXY) return
    const moved = Math.hypot(e.clientX - downXY.x, e.clientY - downXY.y)
    downXY = null
    if (moved > 8) return
    const hit = raycastHover(e.clientX, e.clientY)
    if (!hit) return
    if (hit.kind === 'tw') {
      typewriter.triggerPress(hit.obj)
      typewriter.press(hit.obj)
      sfx(hit.obj.userData.enter ? 'click' : 'type')
      if (hit.obj.userData.enter && typewriter.confirm()) startShop(typewriter.name.trim())
      return
    }
    if (hit.kind === 'interact') {
      const it = hit.obj.userData.interact || { type: 'door' }
      const s0 = hit.obj.scale.clone()
      tween({ dur: 0.4, ease: Ease.outBack, onUpdate: e2 => {
        const k = 1 + Math.sin(e2 * Math.PI) * 0.08
        hit.obj.scale.set(s0.x * k, s0.y * k, s0.z * k)
      } })
      if (it.type === 'door') {
        mode.inside ? exitShop() : enterShop()
      } else {
        sfx(it.type === 'egg' ? 'sparkle' : 'click')
        hud.toast(it.label, { color: '#9fb4d8', dur: 2.2, sub: it.sub || null })
      }
    }
  })
}

// ---------- 物理键盘 ----------
function bindKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (hud.modalOpen) { hud.hideModal(); return }
      if (state === 'shop') {
        if (mode.inside) exitShop()
        else hud.toast('快捷键：F 起飞/降落 · ESC 出店', { color: '#9fb4d8', dur: 2 })
      }
      return
    }
    if (state === 'shop' && (e.key === 'f' || e.key === 'F')) toggleFly()
  })
}

// ---------- 主循环 ----------
function tick(dt, t) {
  engine.cinematic = hasCameraTween()
  if (state === 'loading' && loader) loader.update(dt, t)
  if (state === 'typing' && typewriter) typewriter.update(dt, engine.camera)
  if (state === 'shop' && shop) {
    rarityCard.update(dt, engine.camera)

    // 生成器动画
    try {
      for (const a of shop.ctx.animate) a.update(dt)
    } catch (e) { console.warn('[anim]', e) }

    // 招牌霓虹闪烁
    if (shop.ctx.flickerSigns) {
      for (const f of shop.ctx.flickerSigns) {
        const n = Math.sin(t * 13.7 + f.base * 10) * Math.sin(t * 3.1)
        f.mat.emissiveIntensity = f.base * (f.neon ? (n > -0.55 ? 1 : 0.25) : (1 + Math.sin(t * 2 + f.base) * 0.18))
      }
    }

    // 飞行流场
    if (mode.flying || flyAmp > 0.001) {
      flightT += dt * 0.55
      const x = (Math.sin(flightT * 0.42) * 9 + Math.sin(flightT * 0.17) * 4) * flyAmp
      const z = (Math.cos(flightT * 0.33) * 8 + Math.cos(flightT * 0.21) * 3.5) * flyAmp
      const y = (12 + Math.sin(flightT * 0.5) * 2.2) * flyAmp
      shop.shopRoot.position.set(x, y, z)
      shop.shopRoot.rotation.z = Math.sin(flightT * 0.4) * 0.05 * flyAmp
      shop.shopRoot.rotation.x = Math.cos(flightT * 0.3) * 0.03 * flyAmp
      const center = new THREE.Vector3(x, y + 2, z)
      const delta = center.clone().sub(engine.controls.target)
      engine.controls.target.add(delta)
      engine.camera.position.add(delta)
    } else if (shop.shopRoot.position.lengthSq() > 1e-6) {
      shop.shopRoot.position.set(0, 0, 0)
      shop.shopRoot.rotation.set(0, 0, 0)
    }

    // 室内漫游约束
    if (mode.inside && !mode.transitioning) {
      const p = engine.camera.position
      const b = shop.meta.bounds
      p.y = THREE.MathUtils.clamp(p.y, 0.7, Math.max(1.2, shop.ctx.H - 0.45))
      const inset = 0.75
      if (shop.fpInner) {
        if (!pointInPolygon(p.x, p.z, shop.fpInner)) {
          const c = shop.fpCentroid
          p.x += (c.x - p.x) * 0.12
          p.z += (c.z - p.z) * 0.12
        }
      } else {
        p.x = THREE.MathUtils.clamp(p.x, -b.w / 2 + inset, b.w / 2 - inset)
        p.z = THREE.MathUtils.clamp(p.z, -b.d / 2 + inset, b.d / 2 - inset)
      }
    }
  }
}

// ---------- 入口 ----------
boot().then(() => {
  bindPointer()
  bindKeyboard()
  window.__nts = {
    engine, get shop() { return shop }, hud, state: () => state, mode: () => ({ ...mode }),
    startShop, enterTyping, toggleFly, enterShop, exitShop,
    camNear: (x, y, z, tol = 0.5) => engine.camera.position.distanceTo(new THREE.Vector3(x, y, z)) < tol,
    get camPos() { return engine.camera.position.toArray() },
    get target() { return engine.controls.target.toArray() },
    get ctl() { return { min: engine.controls.minDistance, max: engine.controls.maxDistance } },
    tweens: () => debugTweens(),
  }
}).catch(err => {
  console.error('[boot]', err)
})
