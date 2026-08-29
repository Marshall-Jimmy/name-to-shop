// 自检台：批量种子验证（组件统计 / 强制构件 / 确定性复现 / 彩蛋命中 / 缩略图墙）
import * as THREE from 'three/webgpu'
import { Engine } from './scene/engine.js'
import { rollShop, lightingPresets } from './core/dna.js'
import { buildShop } from './gen/building.js'
import { loadAssets } from './assets/index.js'
import { registryStats, allGens } from './gen/registry.js'
import { disposeObject, clearTextureCache } from './gen/helpers.js'
import { makeRng } from './core/rng.js'

const CORE_NAMES = [
  '张三', '李四五', '王梦琪', '猫猫咖啡', '龙王拉面', '熊猫书店', '尊嘟假嘟', '泰裤辣',
  '摸鱼大师', '雪糕刺客', 'yyds', 'skibidi', '888', '404', 'john', 'pixel', '🐱🚀', 'star moon',
]
const SURNAMES = '张王李赵刘陈杨黄周吴徐孙马朱胡郭何林罗高'
const GIVEN = '三四五春夏秋冬风云雨雪梦琪瑶娜静敏军强伟杰晨曦雨桐'
const ENG = ['alex', 'mia', 'leo', 'nova', 'turbo', 'ghost', 'luna', 'kai', 'zoe', 'ryan', 'iris', 'echo', 'viper', 'mango']
const NUMS = ['520', '1314', '666', '233', '1024', '42', '777', '4396', '2333', '996', '007', '9527']
const EGGS = ['狗哥', '兔兔', '鱼鱼', '火焰', '冰雪', '躺平', '绝绝子', '遥遥领先', '显眼包', '拿来吧你', '栓Q', '那咋了']
const EMOJI = ['🐱', '🚀', '⭐', '🍀', '🐉', '🎉', '🔥', '🌙', '🍩', '⚡']

function buildNamePool(n) {
  const rng = makeRng('check-pool')
  const pool = [...CORE_NAMES]
  const make = (i) => {
    const cat = i % 5
    if (cat === 0) return SURNAMES[rng.i(0, 19)] + GIVEN[rng.i(0, GIVEN.length - 1)] + (rng.chance(0.5) ? GIVEN[rng.i(0, GIVEN.length - 1)] : '')
    if (cat === 1) return ENG[rng.i(0, ENG.length - 1)] + (rng.chance(0.4) ? ' ' + ENG[rng.i(0, ENG.length - 1)] : '')
    if (cat === 2) return NUMS[rng.i(0, NUMS.length - 1)]
    if (cat === 3) return EGGS[rng.i(0, EGGS.length - 1)]
    return EMOJI[rng.i(0, EMOJI.length - 1)] + (rng.chance(0.6) ? EMOJI[rng.i(0, EMOJI.length - 1)] : '')
  }
  for (let i = 0; pool.length < n; i++) pool.push(make(i))
  return pool.slice(0, n)
}

const errLog = []
const origError = console.error.bind(console)
console.error = (...a) => { errLog.push(a.map(x => (x?.stack || String(x))).join(' ').slice(0, 300)); origError(...a) }
window.addEventListener('error', e => errLog.push(String(e.message).slice(0, 300)))

const $ = id => document.getElementById(id)
const engineHost = $('viewport')
let engine, assets, running = false
let results = []
const regNames = new Set(allGens().map(g => g.name))

const raf = () => Promise.race([
  new Promise(r => requestAnimationFrame(r)),
  new Promise(r => setTimeout(r, 120)),
])

function disposeEnvGroup() {
  engine.envGroup.traverse(o => {
    o.geometry?.dispose?.()
    const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []
    for (const m of ms) { m.map?.dispose?.(); m.dispose?.() }
  })
}

function copyThumb() {
  const src = engine.renderer.domElement
  const c = document.createElement('canvas')
  c.width = 480; c.height = 300
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.85)
}

const RARE_COLORS = { N: '#8d99ae', R: '#4f8cff', SR: '#9d8cff', SSR: '#ffd166', UR: '#ff6b81' }

function status(txt) { $('status').textContent = txt }
function progress(p) { $('prog').firstElementChild.style.width = `${Math.round(p * 100)}%` }

async function runBatch(n) {
  if (running || !assets) return
  running = true
  $('run').disabled = true
  results = []
  errLog.length = 0
  $('grid').innerHTML = ''
  engine.renderer.setAnimationLoop(null)

  const names = new URLSearchParams(location.search).get('names')?.split(',') || buildNamePool(n)
  const usedComps = new Map()
  let fallbacks = 0, eggTotal = 0
  const seen = { biz: new Set(), style: new Set(), mat: new Set(), light: new Set(), foot: new Set(), roof: new Set(), pal: new Set(), rare: new Map() }

  for (let i = 0; i < names.length; i++) {
    const name = names[i].trim()
    if (!name) continue
    status(`生成中 ${i + 1}/${names.length} · ${name}`)
    progress(i / names.length)
    const errBefore = errLog.length
    const dna = rollShop(name)
    const shop = buildShop(dna, assets)
    const isFallback = shop.manifest.some(m => m.startsWith('fallback'))
    if (isFallback) fallbacks++
    eggTotal += dna.eggs.length
    seen.biz.add(dna.business.id); seen.style.add(dna.style.id); seen.mat.add(dna.material.id)
    seen.light.add(dna.lighting.id); seen.foot.add(dna.footprintType); seen.roof.add(dna.roofType)
    seen.pal.add(dna.paletteSource)
    seen.rare.set(dna.rarity, (seen.rare.get(dna.rarity) || 0) + 1)
    const comps = []
    for (const entry of shop.manifest) {
      const [slot, comp] = entry.split(':')
      if (comp && regNames.has(comp)) {
        comps.push(entry)
        usedComps.set(comp, (usedComps.get(comp) || 0) + 1)
      } else {
        comps.push(entry)
      }
    }

    // 渲染缩略图
    disposeEnvGroup()
    engine.setEnvironment(dna.lighting, dna.rarityMeta.glow)
    engine.scene.add(shop.shopRoot, shop.groundRoot)
    const b = shop.meta.bounds
    engine.camera.position.copy(shop.meta.cameraHero)
    engine.controls.target.set(0, b.h * 0.42, 0)
    engine.camera.lookAt(0, b.h * 0.42, 0)
    for (let k = 0; k < 3; k++) { engine.render(); await raf() }
    const thumb = copyThumb()
    const errs = errLog.slice(errBefore)
    engine.scene.remove(shop.shopRoot, shop.groundRoot)
    if (i < names.length - 1) {
      disposeObject(shop.shopRoot); disposeObject(shop.groundRoot); clearTextureCache()
    }

    results.push({
      name, dna, valid: shop.ctx.valid, checks: shop.ctx.checks || {}, fallback: isFallback,
      manifest: shop.manifest, comps, thumb, errs, shop,
    })
    addCard(results[results.length - 1])
    await raf()
  }

  // 确定性复现：同名重建两次，manifest 必须一致
  const probe = results[0]
  const again = buildShop(rollShop(probe.name), assets)
  const determinism = JSON.stringify(again.manifest) === JSON.stringify(probe.manifest)
  disposeObject(again.shopRoot); disposeObject(again.groundRoot); clearTextureCache()

  progress(1)
  status(`完成 · ${results.length} 家 · 兜底 ${fallbacks} · 报错 ${errLog.length}`)

  // 保留最后一家可环绕检视
  const last = results[results.length - 1]
  engine.scene.add(last.shop.shopRoot, last.shop.groundRoot)
  engine.setEnvironment(last.dna.lighting, last.dna.rarityMeta.glow)
  engine.controls.enabled = true
  engine.controls.minDistance = 3
  engine.controls.maxDistance = 70
  let lt = 0
  engine.renderer.setAnimationLoop(() => {
    const dt = Math.min(0.25, engine.clock.getDelta())
    lt += dt
    for (const a of last.shop.ctx.animate) { try { a.update(dt) } catch { /* 记录在卡片 */ } }
    if (last.shop.ctx.flickerSigns) {
      for (const f of last.shop.ctx.flickerSigns) {
        const nz = Math.sin(lt * 13.7 + f.base * 10) * Math.sin(lt * 3.1)
        f.mat.emissiveIntensity = f.base * (f.neon ? (nz > -0.55 ? 1 : 0.25) : (1 + Math.sin(lt * 2 + f.base) * 0.18))
      }
    }
    engine.update(dt)
    engine.render()
  })

  renderStats({ usedComps, fallbacks, eggTotal, seen, determinism })
  running = false
  $('run').disabled = false
}

function addCard(r) {
  const el = document.createElement('div')
  el.className = 'card' + (r.valid && !r.fallback ? '' : ' bad')
  el.innerHTML = `
    <img src="${r.thumb}" loading="lazy" />
    <div class="info">
      <div class="nm">${escapeHtml(r.name)}</div>
      <div class="meta">${r.dna.business.name} × ${r.dna.style.name} · ${r.dna.lighting.name}</div>
      <span class="rare" style="background:${RARE_COLORS[r.dna.rarity]}22;color:${RARE_COLORS[r.dna.rarity]}">${r.dna.rarity} ${r.dna.rarityMeta.label}</span>
      ${r.dna.eggs.length ? `<span class="rare" style="background:#ff9de222;color:#ff9de2">彩蛋×${r.dna.eggs.length}</span>` : ''}
      ${!r.valid || r.fallback ? '<span class="rare" style="background:#ff889622;color:#ff8896">⚠ 结构异常</span>' : ''}
      ${r.errs.length ? `<span class="rare" style="background:#ffd16622;color:#ffd166">err×${r.errs.length}</span>` : ''}
    </div>`
  el.onclick = () => showDetail(r)
  $('grid').appendChild(el)
  el.scrollIntoView({ block: 'nearest' })
}

function showDetail(r) {
  const d = $('detail')
  d.classList.add('open')
  const checks = Object.entries(r.checks).map(([k, v]) =>
    `<span class="tag" style="${v ? '' : 'color:#ff8896'}">${v ? '✓' : '✗'} ${k}</span>`).join('')
  d.innerHTML = `
    <button class="close" onclick="document.getElementById('detail').classList.remove('open')">✕</button>
    <h2>${escapeHtml(r.name)}</h2>
    <div class="sub">${r.dna.rarity} ${r.dna.rarityMeta.label} · ${r.dna.paletteSource}</div>
    <div class="panel"><h3>强制构件</h3><div class="tagrow">${checks}</div></div>
    <div class="panel"><h3>DNA</h3>
      <div class="row"><span>业态</span><b>${r.dna.business.name}</b></div>
      <div class="row"><span>风格</span><b>${r.dna.style.name}</b></div>
      <div class="row"><span>材质</span><b>${r.dna.material.id}</b></div>
      <div class="row"><span>光照</span><b>${r.dna.lighting.name}</b></div>
      <div class="row"><span>骨架</span><b>${r.dna.footprintType} · ${r.dna.roofType}</b></div>
      <div class="row"><span>生肖/星座</span><b>${r.dna.zodiac.name} · ${r.dna.constellation.name}</b></div>
    </div>
    ${r.dna.eggs.length ? `<div class="panel"><h3>彩蛋（${r.dna.eggs.length}）</h3>${r.dna.eggs.map(e => `<div class="mf">✦ ${e.n || e.t} — ${e.desc || ''}</div>`).join('')}</div>` : ''}
    ${r.errs.length ? `<div class="panel"><h3>构建报错</h3>${r.errs.map(e => `<div class="err">${escapeHtml(e)}</div>`).join('')}</div>` : ''}
    <div class="panel"><h3>组件清单（${r.manifest.length}）</h3>${r.manifest.map(m => `<div class="mf">${escapeHtml(m)}</div>`).join('')}</div>`
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

function renderStats({ usedComps, fallbacks, eggTotal, seen, determinism }) {
  const reg = registryStats()
  const invalid = results.filter(r => !r.valid || r.fallback)
  const coverage = usedComps.size / reg.total
  const items = [
    { label: '组件生成器 ≥ 200', ok: reg.total >= 200, detail: `注册 ${reg.total} 个 · 本批用到 ${usedComps.size} 个（${Math.round(coverage * 100)}%）` },
    { label: '强制构件零缺失', ok: invalid.length === 0, detail: invalid.length ? `异常 ${invalid.length} 家：${invalid.map(r => r.name).join('、')}` : `全部 ${results.length} 家含 底座/墙体/屋顶/门/窗/招牌` },
    { label: '安全兜底触发 = 0', ok: fallbacks === 0, detail: `${fallbacks} 次回退` },
    { label: '五层随机化生效', ok: seen.biz.size >= 8 && seen.style.size >= 8 && seen.mat.size >= 3 && seen.light.size >= 4, detail: `业态 ${seen.biz.size} · 风格 ${seen.style.size} · 材质 ${seen.mat.size} · 光照 ${seen.light.size} · 配色 ${seen.pal.size}` },
    { label: '骨架多样性', ok: seen.foot.size >= 4 && seen.roof.size >= 4, detail: `轮廓 ${seen.foot.size} 种 · 屋顶 ${seen.roof.size} 种` },
    { label: '彩蛋系统可触发', ok: eggTotal > 0, detail: `本批命中 ${eggTotal} 个彩蛋` },
    { label: '种子确定性复现', ok: determinism, detail: determinism ? '同名重建 manifest 完全一致' : '同名重建出现差异！' },
    { label: '生成期零报错', ok: errLog.length === 0, detail: `${errLog.length} 条 console.error` },
    { label: '渲染后端', ok: true, detail: engine.backend === 'webgpu' ? 'WebGPU' : 'WebGL2 回退' },
  ]
  $('checkBody').innerHTML = items.map(it => `
    <div class="check ${it.ok ? 'ok' : 'bad'}">
      <div class="ic">${it.ok ? '✓' : '✗'}</div>
      <div class="tx">${it.label}<small>${escapeHtml(it.detail)}</small></div>
    </div>`).join('')

  const slots = Object.entries(reg.bySlot).sort((a, b) => b[1] - a[1])
  $('regBody').innerHTML = `
    <div class="row"><span>注册总数</span><b>${reg.total}</b></div>
    <div class="tagrow">${slots.map(([s, c]) => `<span class="tag">${s} <b>${c}</b></span>`).join('')}</div>`

  const rare = [...seen.rare.entries()].map(([k, v]) => `${k}×${v}`).join(' · ')
  $('covBody').innerHTML = `
    <div class="row"><span>批量数量</span><b>${results.length} 家</b></div>
    <div class="row"><span>用到组件</span><b>${usedComps.size}/${reg.total}（${Math.round(coverage * 100)}%）</b></div>
    <div class="bar"><i style="width:${coverage * 100}%"></i></div>
    <div class="row"><span>稀有度分布</span><b>${rare}</b></div>
    <div class="row"><span>彩蛋命中</span><b>${eggTotal}</b></div>`

  const unused = allGens().filter(g => !usedComps.has(g.name)).slice(0, 60)
  $('unusedBody').innerHTML = unused.length
    ? unused.map(g => `<span class="tag">${g.slot}:${g.name}</span>`).join('')
    : '<span class="tag">本批全部命中</span>'
}

async function boot() {
  const rect = engineHost.getBoundingClientRect()
  engine = new Engine()
  await engine.init(engineHost, { w: Math.max(480, rect.width), h: Math.max(320, rect.height) })
  engine.renderer.domElement.style.width = '100%'
  engine.renderer.domElement.style.height = '100%'
  new ResizeObserver(() => {
    const r = engineHost.getBoundingClientRect()
    if (r.width > 1 && r.height > 1) engine.resize(r.width, r.height)
  }).observe(engineHost)
  const dusk = lightingPresets.find(l => l.id === 'dusk')
  engine.setEnvironment(dusk, 0)
  status('加载 CC0 资产…')
  assets = await loadAssets(p => { progress(p * 0.15); status(`加载资产 ${Math.round(p * 100)}%`) })
  $('run').onclick = () => runBatch(parseInt($('count').value, 10))
  await runBatch(parseInt($('count').value, 10))
}

boot().catch(err => {
  status('启动失败')
  origError('[check]', err)
})
