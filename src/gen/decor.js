// 外部装饰生成器库：风格装饰 + 全量彩蛋装饰（98 键全覆盖）。
// 策略：Kenney CC0 模型为主 + 参数化几何 + Canvas 贴图，绝不纯色块。
import * as THREE from 'three/webgpu'
import { reg } from './registry.js'
import {
  box, mesh, group, cyl, sphere, cone, torus, plane, canvasTexture, hsl, col,
  stdMat, glowMat, glassMat, tintModel,
} from './helpers.js'

const FONT_STACK = '"PingFang SC","Microsoft YaHei","Noto Sans SC","Segoe UI Emoji",sans-serif'

// ---------- 共享小工具 ----------

function glyphPlate(ctx, key, glyph, size = 0.6, opts = {}) {
  const tex = canvasTexture(`glyph-${ctx.dna.seed}-${key}`, 256, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h)
    c.font = `${opts.font || 170}px ${FONT_STACK}`
    c.textAlign = 'center'; c.textBaseline = 'middle'
    if (opts.glow !== false) { c.shadowColor = opts.glowColor || hsl(...ctx.dna.palette.glow); c.shadowBlur = 26 }
    c.fillStyle = opts.color || '#ffffff'
    c.fillText(glyph, w / 2, h / 2 + 8)
  })
  const mat = new THREE.MeshStandardMaterial({
    map: tex, transparent: true,
    emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: opts.emissive ?? 1.1,
    side: THREE.DoubleSide, roughness: 0.6,
  })
  return plane(size, size, mat, { cast: false })
}

function textPlate(ctx, key, text, W, H, opts = {}) {
  const tex = canvasTexture(`tplate-${ctx.dna.seed}-${key}`, 512, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h)
    if (opts.bg) { c.fillStyle = opts.bg; c.beginPath(); c.roundRect(8, 8, w - 16, h - 16, 20); c.fill() }
    if (opts.border) { c.strokeStyle = opts.border; c.lineWidth = 8; c.beginPath(); c.roundRect(14, 14, w - 28, h - 28, 16); c.stroke() }
    c.font = `${opts.weight || 800} ${opts.size || 64}px ${FONT_STACK}`
    c.textAlign = 'center'; c.textBaseline = 'middle'
    if (opts.glowColor) { c.shadowColor = opts.glowColor; c.shadowBlur = 22 }
    c.fillStyle = opts.color || '#fff'
    c.fillText(text, w / 2, h / 2)
  })
  const mat = new THREE.MeshStandardMaterial({
    map: tex, transparent: !opts.bg,
    emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: opts.emissive ?? 1.0,
    side: THREE.DoubleSide,
  })
  return plane(W, H, mat, { cast: false })
}

// 宠物/吉祥物雕像（纯几何：身体+头+耳+尾+脸）
function mascot(ctx, kind, s = 1) {
  const pal = ctx.dna.palette
  const g = group()
  const furC = col(pal.main, null, 0, 0, 26)
  const furDark = col(pal.main, null, 0, 0, -8)
  const furMat = stdMat({ color: furC, roughness: 0.9 })
  const darkMat = stdMat({ color: furDark, roughness: 0.9 })
  const body = sphere(0.5 * s, furMat, { p: [0, 0.55 * s, 0], s: [1, 0.92, 1.15] })
  const head = sphere(0.42 * s, furMat, { p: [0, 1.2 * s, 0.18 * s] })
  g.add(body, head)
  const eyeMat = stdMat({ color: 0x1a1a1e, roughness: 0.3 })
  for (const ex of [-0.15, 0.15]) g.add(sphere(0.055 * s, eyeMat, { p: [ex * s, 1.26 * s, 0.55 * s], cast: false }))
  g.add(sphere(0.06 * s, darkMat, { p: [0, 1.12 * s, 0.58 * s], cast: false })) // 鼻
  const ear = (x, rot) => cone(0.16 * s, 0.3 * s, furMat, { p: [x * s, 1.55 * s, 0.1 * s], r: [0, 0, rot], seg: 10 })
  switch (kind) {
    case 'cat':
      g.add(ear(-0.2, 0.35), ear(0.2, -0.35))
      g.add(cyl(0.05 * s, 0.03 * s, 0.55 * s, furMat, { p: [0, 0.55 * s, -0.55 * s], r: [-0.8, 0, 0] }))
      break
    case 'dog':
      g.add(ear(-0.24, 1.2), ear(0.24, -1.2))
      g.add(cyl(0.06 * s, 0.03 * s, 0.5 * s, furMat, { p: [0, 0.5 * s, -0.58 * s], r: [-0.7, 0, 0] }))
      break
    case 'bear':
      g.add(sphere(0.14 * s, furMat, { p: [-0.3 * s, 1.5 * s, 0.05 * s] }), sphere(0.14 * s, furMat, { p: [0.3 * s, 1.5 * s, 0.05 * s] }))
      g.add(sphere(0.2 * s, darkMat, { p: [0, 1.08 * s, 0.52 * s], s: [1, 0.7, 0.7] }))
      break
    case 'panda':
      body.material = stdMat({ color: 0xf4f4f4, roughness: 0.9 })
      head.material = stdMat({ color: 0xf8f8f8, roughness: 0.9 })
      g.add(sphere(0.13 * s, stdMat({ color: 0x17171a, roughness: 0.9 }), { p: [-0.3 * s, 1.48 * s, 0.05 * s] }))
      g.add(sphere(0.13 * s, stdMat({ color: 0x17171a, roughness: 0.9 }), { p: [0.3 * s, 1.48 * s, 0.05 * s] }))
      for (const ex of [-0.18, 0.18]) g.add(sphere(0.1 * s, stdMat({ color: 0x17171a, roughness: 0.9 }), { p: [ex * s, 1.26 * s, 0.36 * s], s: [1, 1.25, 0.6] }))
      break
    case 'duck':
      head.position.y = 1.1 * s
      g.add(cone(0.16 * s, 0.3 * s, stdMat({ color: 0xf5a623, roughness: 0.6 }), { p: [0, 1.1 * s, 0.5 * s], r: [1.35, 0, 0], seg: 10 }))
      g.add(sphere(0.2 * s, furMat, { p: [0, 0.35 * s, -0.2 * s], s: [0.7, 0.5, 1] }))
      break
    case 'frog':
      body.scale.set(1.1, 0.75, 1.1)
      for (const ex of [-0.34, 0.34]) {
        g.add(sphere(0.19 * s, furMat, { p: [ex * s, 1.28 * s, 0.2 * s] }))
        g.add(sphere(0.1 * s, eyeMat, { p: [ex * s, 1.28 * s, 0.36 * s], cast: false }))
      }
      break
    case 'sheep':
      for (let i = 0; i < 10; i++) {
        g.add(sphere(0.2 * s, stdMat({ color: 0xf2efe8, roughness: 1 }), {
          p: [Math.cos(i * 2.2) * 0.4 * s, 0.6 * s + Math.sin(i * 1.7) * 0.18 * s, Math.sin(i * 2.2) * 0.45 * s],
        }))
      }
      head.material = stdMat({ color: 0x3a332c, roughness: 0.9 })
      break
    case 'cow':
      g.add(ear(-0.24, 1.1), ear(0.24, -1.1))
      g.add(sphere(0.14 * s, stdMat({ color: 0xf3d9c2, roughness: 0.8 }), { p: [0, 1.08 * s, 0.5 * s], s: [1.3, 0.8, 0.8] }))
      g.add(torus(0.2 * s, 0.045 * s, stdMat({ color: 0xe8e2d5, roughness: 0.7 }), { p: [0, 1.12 * s, 0.56 * s], r: [0.3, 0, 0] }))
      break
    case 'monkey':
      g.add(sphere(0.16 * s, furMat, { p: [-0.28 * s, 1.5 * s, 0.05 * s] }), sphere(0.16 * s, furMat, { p: [0.28 * s, 1.5 * s, 0.05 * s] }))
      g.add(sphere(0.3 * s, stdMat({ color: 0xd9b08c, roughness: 0.8 }), { p: [0, 1.14 * s, 0.34 * s], s: [1, 0.8, 0.6] }))
      g.add(cyl(0.06 * s, 0.04 * s, 0.7 * s, furMat, { p: [0, 0.7 * s, -0.55 * s], r: [-0.9, 0, 0.3] }))
      break
    case 'pigeon':
      body.scale.set(0.9, 0.9, 1.3)
      head.position.set(0, 1.02 * s, 0.42 * s)
      g.add(cone(0.08 * s, 0.16 * s, stdMat({ color: 0xe8a13d, roughness: 0.5 }), { p: [0, 1.0 * s, 0.6 * s], r: [1.5, 0, 0], seg: 8 }))
      g.add(sphere(0.14 * s, furMat, { p: [0, 0.6 * s, -0.3 * s], s: [1.6, 0.5, 1] }))
      break
    case 'ox':
      g.add(ear(-0.24, 1.1), ear(0.24, -1.1))
      for (const hx of [-1, 1]) g.add(cyl(0.05 * s, 0.11 * s, 0.3 * s, stdMat({ color: 0xe6dcc8, roughness: 0.5 }), { p: [hx * 0.34 * s, 1.42 * s, 0.1 * s], r: [0, 0, hx * 0.7], seg: 10 }))
      break
    default:
      g.add(ear(-0.2, 0.3), ear(0.2, -0.3))
  }
  return g
}

function pedestal(ctx, h = 0.5, r = 0.55, mat = null) {
  const m = mat || stdMat({ color: col(ctx.dna.palette.trim, null, 0, 0, -18), roughness: 0.7 })
  const g = group(
    cyl(r * 1.12, r * 1.2, h * 0.22, m, { p: [0, h * 0.11, 0], seg: 24 }),
    cyl(r, r * 1.05, h * 0.7, m, { p: [0, h * 0.5, 0], seg: 24 }),
    cyl(r * 1.05, r, h * 0.16, m, { p: [0, h * 0.92, 0], seg: 24 }),
  )
  return g
}

// Kenney 模型快捷引用（已按高度归一化）
function model(ctx, name, height = 1, tint = true) {
  const tpl = ctx.assets?.models?.[name]
  if (!tpl) return null
  const m = tpl.clone(true)
  m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true } })
  if (tint && ctx.dna) tintModel(m, ctx.dna.palette.main[0], 0.6, 40)
  m.scale.multiplyScalar(height)
  return m
}

function planterPot(ctx, r = 0.3, h = 0.4, hex = false) {
  const mat = stdMat({ color: col(ctx.dna.palette.accent, null, 0, -18, -12), roughness: 0.85 })
  const rim = stdMat({ color: col(ctx.dna.palette.trim, null, 0, 0, 10), roughness: 0.7 })
  const g = group(
    cyl(r * 0.78, r * 0.62, h, mat, { p: [0, h / 2, 0], seg: hex ? 6 : 18 }),
    cyl(r * 0.86, r * 0.84, h * 0.14, rim, { p: [0, h * 0.94, 0], seg: hex ? 6 : 18 }),
  )
  return g
}

// 植物：阔叶/针叶/开花/多肉（几何，绿色取自 palette.ground 偏移）
function plantFoliage(ctx, kind, s = 1) {
  const leafMat = stdMat({ color: col(ctx.dna.palette.ground, null, 14, 14, 8), roughness: 0.85 })
  const leafMat2 = stdMat({ color: col(ctx.dna.palette.ground, null, -18, 10, -4), roughness: 0.85 })
  const g = group()
  if (kind === 'broad') {
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2
      g.add(sphere(0.16 * s, i % 2 ? leafMat : leafMat2, {
        p: [Math.cos(a) * 0.16 * s, 0.5 * s + i * 0.05 * s, Math.sin(a) * 0.16 * s], s: [1, 1.5, 0.4],
        r: [0, -a, 0.5],
      }))
    }
  } else if (kind === 'pine') {
    for (let i = 0; i < 3; i++) {
      g.add(cone(0.28 * s * (1 - i * 0.25), 0.5 * s, i % 2 ? leafMat : leafMat2, { p: [0, (0.5 + i * 0.32) * s, 0], seg: 8 }))
    }
  } else if (kind === 'flower') {
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2
      g.add(cyl(0.015 * s, 0.02 * s, 0.5 * s, leafMat2, { p: [Math.cos(a) * 0.08 * s, 0.28 * s, Math.sin(a) * 0.08 * s], r: [Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2] }))
      g.add(sphere(0.09 * s, stdMat({ color: col(ctx.dna.palette.glow, null, 0, 8, 8), roughness: 0.5 }), { p: [Math.cos(a) * 0.1 * s, 0.56 * s, Math.sin(a) * 0.1 * s] }))
    }
  } else if (kind === 'succulent') {
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * Math.PI * 2 + 0.5
      g.add(sphere(0.13 * s, leafMat2, { p: [Math.cos(a) * 0.1 * s, 0.2 * s, Math.sin(a) * 0.1 * s], s: [1, 1.7, 1] }))
    }
    g.add(sphere(0.12 * s, leafMat, { p: [0, 0.3 * s, 0], s: [1, 1.5, 1] }))
  }
  return g
}

// ---------- 遮阳篷（强商业信号）----------
export const genAwning = reg('decor', 'awning', (ctx) => {
  const { fp, layout, rand } = ctx
  const pal = ctx.dna.palette
  const W = fp.front.L * rand.f(0.7, 0.95)
  const depth = rand.f(1.1, 1.6)
  const y = layout.windows[0] ? layout.windows[0].y + layout.windows[0].h + 0.35 : 3.4
  const cloth = canvasTexture(`awn-${ctx.dna.seed}`, 512, 256, (c, w, h) => {
    const stripes = rand.i(6, 10)
    for (let i = 0; i < stripes; i++) {
      c.fillStyle = i % 2 === 0 ? hsl(...pal.accent) : hsl(...pal.main.map((v, j) => j === 2 ? Math.min(96, v + 26) : v))
      c.fillRect(i * w / stripes, 0, w / stripes + 1, h)
    }
    c.fillStyle = 'rgba(0,0,0,0.12)'
    c.fillRect(0, h - 24, w, 24)
  })
  const clothMat = stdMat({ map: cloth, roughness: 0.9, side: THREE.DoubleSide })
  const geo = new THREE.PlaneGeometry(W, depth, 12, 1)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) / W * Math.PI) * 0.14)
  geo.computeVertexNormals()
  const canopy = mesh(geo, clothMat, { cast: true })
  canopy.rotation.x = -Math.PI / 2 + rand.f(0.28, 0.4)
  const g = group(canopy)
  // 齿状檐边
  const n = Math.floor(W / 0.34)
  for (let i = 0; i < n; i++) {
    const px = -W / 2 + 0.17 + i * 0.34
    const pz = -depth / 2 * Math.cos(0.32)
    g.add(box(0.32, 0.12, 0.18, clothMat, { p: [px, -Math.sin(0.32) * depth / 2 + 0.06, pz], cast: false }))
  }
  // 支撑杆
  const rodMat = ctx.materials.trim
  for (const sx of [-W / 2 + 0.25, W / 2 - 0.25]) {
    g.add(cyl(0.035, 0.035, depth * 0.8, rodMat, { p: [sx, -depth * 0.22, -depth / 4] }))
  }
  g.position.set(fp.front.mid[0], y, fp.front.mid[1] + fp.front.normal[1] * 0.18)
  g.rotation.y = -fp.front.theta
  return { obj: g, mounted: true }
})

// ---------- 绿植类 ----------
export const genPlanterBox = reg('decor', 'planterBox', (ctx) => {
  const { rand } = ctx
  const g = group()
  const boxMat = stdMat({ color: col(ctx.dna.palette.trim, null, 0, 0, -14), roughness: 0.85 })
  const W = rand.f(1.1, 1.7), H = 0.42, D = 0.42
  g.add(box(W, H, D, boxMat, { p: [0, H / 2, 0] }))
  g.add(box(W + 0.08, 0.08, D + 0.08, ctx.materials.trim, { p: [0, H, 0] }))
  const soil = stdMat({ color: 0x3a2c20, roughness: 1 })
  g.add(box(W - 0.1, 0.05, D - 0.1, soil, { p: [0, H - 0.02, 0], cast: false }))
  const n = rand.i(3, 5)
  for (let i = 0; i < n; i++) {
    const kind = rand.pick(['broad', 'flower', 'pine'])
    const p = plantFoliage(ctx, kind, rand.f(0.7, 1.15))
    p.position.set(-W / 2 + 0.2 + i * (W - 0.4) / Math.max(1, n - 1), H - 0.03, 0)
    g.add(p)
  }
  return { obj: g }
})

export const genMinimalPlanter = reg('decor', 'minimalPlanter', (ctx) => {
  const g = group()
  const pot = planterPot(ctx, 0.26, 0.36, true)
  g.add(pot)
  const f = plantFoliage(ctx, ctx.rand.pick(['broad', 'succulent']), 1.1)
  f.position.y = 0.34
  g.add(f)
  return { obj: g }
})

export const genHangingBasket = reg('decor', 'hangingBasket', (ctx) => {
  const g = group()
  const r = 0.28
  g.add(cyl(r, r * 0.7, 0.24, stdMat({ color: 0x6b5236, roughness: 0.9 }), { p: [0, 2.6, 0], seg: 14 }))
  const f = plantFoliage(ctx, 'flower', 0.9)
  f.position.y = 2.7
  g.add(f)
  for (const a of [0.6, 2.7, 4.8]) {
    g.add(cyl(0.012, 0.012, 2.5, ctx.materials.trim, { p: [Math.cos(a) * r * 0.8, 1.4, Math.sin(a) * r * 0.8], cast: false }))
  }
  return { obj: g, hang: 3.0 }
})

export const genVineWall = reg('decor', 'vineWall', (ctx) => {
  const { rand } = ctx
  const g = group()
  const leafMat = stdMat({ color: col(ctx.dna.palette.ground, null, 20, 12, 6), roughness: 0.9 })
  const n = rand.i(14, 26)
  for (let i = 0; i < n; i++) {
    g.add(sphere(rand.f(0.08, 0.18), leafMat, {
      p: [rand.f(-1.3, 1.3), rand.f(0.6, 3.4), rand.f(0.05, 0.25)],
      s: [1, 0.7, 1],
    }))
  }
  for (let i = 0; i < 4; i++) {
    g.add(cyl(0.014, 0.014, 3.2, stdMat({ color: 0x4c6b3c, roughness: 0.9 }), {
      p: [-1 + i * 0.65, 1.8, 0.04], r: [0, 0, rand.f(-0.12, 0.12)], cast: false,
    }))
  }
  return { obj: g, wall: true }
})

export const genSmallTree = reg('decor', 'smallTree', (ctx) => {
  const m = model(ctx, ctx.rand.pick(['tree_small', 'tree_cone', 'tree_oak', 'tree_thin']), ctx.rand.f(2.2, 3.2))
  if (m) return { obj: m }
  const g = group()
  g.add(cyl(0.09, 0.14, 1.6, stdMat({ color: 0x5c4630, roughness: 0.95 }), { p: [0, 0.8, 0] }))
  const leafMat = stdMat({ color: col(ctx.dna.palette.ground, null, 18, 14, 10), roughness: 0.9 })
  g.add(sphere(0.85, leafMat, { p: [0, 2.0, 0], s: [1, 0.9, 1] }))
  return { obj: g }
})

export const genFlowerBed = reg('decor', 'flowerBed', (ctx) => {
  const { rand } = ctx
  const g = group()
  const W = rand.f(1.8, 2.8), D = 0.7
  const stoneMat = stdMat({ color: col(ctx.dna.palette.ground, null, 0, 0, -18), roughness: 0.9 })
  g.add(box(W, 0.3, D, stoneMat, { p: [0, 0.15, 0] }))
  g.add(box(W - 0.15, 0.06, D - 0.15, stdMat({ color: 0x33261b, roughness: 1 }), { p: [0, 0.3, 0], cast: false }))
  const n = Math.floor(W / 0.3)
  for (let i = 0; i < n; i++) {
    const f = plantFoliage(ctx, rand.pick(['flower', 'broad']), rand.f(0.5, 0.85))
    f.position.set(-W / 2 + 0.18 + i * 0.3, 0.28, rand.f(-0.12, 0.12))
    g.add(f)
  }
  return { obj: g }
})

export const genBambooCluster = reg('decor', 'bambooCluster', (ctx) => {
  const { rand } = ctx
  const m = model(ctx, 'crops_bambooStageB', rand.f(1.8, 2.6))
  if (m) return { obj: m }
  const g = group()
  const stalkMat = stdMat({ color: 0x7fae57, roughness: 0.8 })
  const n = rand.i(4, 7)
  for (let i = 0; i < n; i++) {
    const h = rand.f(1.8, 3.0)
    const a = i / n * Math.PI * 2
    g.add(cyl(0.035, 0.045, h, stalkMat, { p: [Math.cos(a) * 0.22, h / 2, Math.sin(a) * 0.22], r: [rand.f(-0.06, 0.06), 0, rand.f(-0.06, 0.06)] }))
    g.add(sphere(0.14, stalkMat, { p: [Math.cos(a) * 0.28, h * 0.85, Math.sin(a) * 0.28], s: [1, 0.4, 1.6], r: [0, rand.f(0, 3), 0] }))
  }
  return { obj: g }
})

export const genPottedPalm = reg('decor', 'pottedPalm', (ctx) => {
  const m = model(ctx, ctx.rand.pick(['tree_palmShort', 'tree_palm']), ctx.rand.f(2.4, 3.4))
  if (m) return { obj: m }
  const g = group(planterPot(ctx, 0.4, 0.5))
  const leafMat = stdMat({ color: col(ctx.dna.palette.ground, null, 24, 16, 12), roughness: 0.85 })
  g.add(cyl(0.06, 0.09, 1.8, stdMat({ color: 0x8a6f4d, roughness: 0.95 }), { p: [0, 1.3, 0] }))
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2
    g.add(sphere(0.5, leafMat, { p: [Math.cos(a) * 0.55, 2.2, Math.sin(a) * 0.55], s: [1, 0.25, 2.2], r: [0.35, -a, 0] }))
  }
  return { obj: g }
})

export const genSucculentRack = reg('decor', 'succulentRack', (ctx) => {
  const { rand } = ctx
  const g = group()
  const frameMat = stdMat({ color: col(ctx.dna.palette.trim, null, 0, 0, -20), roughness: 0.8 })
  for (let i = 0; i < 3; i++) {
    g.add(box(0.9, 0.05, 0.34, frameMat, { p: [0, 0.5 + i * 0.42, 0] }))
    const n = 3
    for (let j = 0; j < n; j++) {
      const s = plantFoliage(ctx, 'succulent', rand.f(0.6, 0.9))
      s.position.set(-0.3 + j * 0.3, 0.53 + i * 0.42, 0)
      g.add(s)
    }
  }
  for (const sx of [-0.45, 0.45]) g.add(box(0.06, 1.5, 0.06, frameMat, { p: [sx, 0.75, -0.14] }))
  return { obj: g }
})

export const genPlantedBarrel = reg('decor', 'plantedBarrel', (ctx) => {
  const g = group()
  const barrelMat = stdMat({ color: col(ctx.dna.palette.trim, null, 0, 0, -16), roughness: 0.9 })
  g.add(cyl(0.4, 0.36, 0.8, barrelMat, { p: [0, 0.4, 0], seg: 18 }))
  for (const y of [0.18, 0.62]) g.add(torus(0.41, 0.03, ctx.materials.trim, { p: [0, y, 0], r: [Math.PI / 2, 0, 0] }))
  const f = plantFoliage(ctx, ctx.rand.pick(['broad', 'flower']), 1.15)
  f.position.y = 0.78
  g.add(f)
  return { obj: g }
})

export const genTopiary = reg('decor', 'topiary', (ctx) => {
  const g = group()
  const leafMat = stdMat({ color: col(ctx.dna.palette.ground, null, 16, 16, 14), roughness: 0.9 })
  g.add(cyl(0.32, 0.42, 0.34, stdMat({ color: col(ctx.dna.palette.accent, null, 0, -10, -20), roughness: 0.85 }), { p: [0, 0.17, 0], seg: 18 }))
  const shape = ctx.rand.pick(['ball', 'cone', 'spiral'])
  if (shape === 'ball') {
    g.add(sphere(0.5, leafMat, { p: [0, 0.9, 0] }))
    g.add(sphere(0.3, leafMat, { p: [0, 1.5, 0] }))
  } else if (shape === 'cone') {
    g.add(cone(0.45, 1.2, leafMat, { p: [0, 1.0, 0], seg: 12 }))
    g.add(sphere(0.3, leafMat, { p: [0, 0.55, 0] }))
  } else {
    g.add(sphere(0.44, leafMat, { p: [0, 0.8, 0] }))
    g.add(torus(0.3, 0.13, leafMat, { p: [0, 1.1, 0], r: [Math.PI / 2, 0, 0.4] }))
    g.add(sphere(0.24, leafMat, { p: [0, 1.35, 0] }))
  }
  return { obj: g }
})

export const genHerbShelf = reg('decor', 'herbShelf', (ctx) => {
  const g = group()
  const m = model(ctx, 'bookcaseOpenLow', 1.3)
  if (m) { g.add(m); m.position.y = 0 }
  else {
    const frameMat = stdMat({ color: col(ctx.dna.palette.trim, null, 0, 0, -18), roughness: 0.85 })
    g.add(box(1.1, 0.9, 0.4, frameMat, { p: [0, 0.45, 0] }))
    g.add(box(1.0, 0.04, 0.34, frameMat, { p: [0, 0.5, 0], cast: false }))
  }
  const n = 5
  for (let i = 0; i < n; i++) {
    const p = plantFoliage(ctx, ctx.rand.pick(['broad', 'succulent']), 0.5)
    p.position.set(-0.4 + i * 0.2, 0.52, ctx.rand.f(-0.05, 0.08))
    g.add(p)
  }
  return { obj: g }
})

// ---------- 座椅 / 外摆 ----------
export const genBench = reg('decor', 'bench', (ctx) => {
  const m = model(ctx, ctx.rand.pick(['bench', 'benchCushion']), 0.85)
  if (m) return { obj: m }
  const woodMat = stdMat({ color: col(ctx.dna.palette.trim, null, 0, 0, -10), roughness: 0.85 })
  const g = group()
  g.add(box(1.8, 0.09, 0.5, woodMat, { p: [0, 0.45, 0] }))
  g.add(box(1.8, 0.5, 0.07, woodMat, { p: [0, 0.75, -0.22], r: [-0.12, 0, 0] }))
  for (const x of [-0.75, 0.75]) {
    g.add(box(0.09, 0.45, 0.45, ctx.materials.trim, { p: [x, 0.22, 0] }))
  }
  return { obj: g }
})

export const genUmbrellaTable = reg('decor', 'umbrellaTable', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const m = model(ctx, 'tableRound', 0.95)
  if (m) g.add(m)
  else {
    g.add(cyl(0.65, 0.65, 0.06, ctx.materials.trim, { p: [0, 0.74, 0], seg: 24 }))
    g.add(cyl(0.05, 0.05, 0.72, ctx.materials.trim, { p: [0, 0.36, 0] }))
    g.add(cyl(0.4, 0.46, 0.05, ctx.materials.trim, { p: [0, 0.03, 0], seg: 20 }))
  }
  const chairs = ctx.rand.i(2, 3)
  for (let i = 0; i < chairs; i++) {
    const a = i / chairs * Math.PI * 2 + 0.6
    const c = model(ctx, 'chair', 0.85) || group(box(0.42, 0.06, 0.42, ctx.materials.trim, { p: [0, 0.45, 0] }))
    c.position.set(Math.cos(a) * 1.15, 0, Math.sin(a) * 1.15)
    c.rotation.y = -a + Math.PI / 2
    g.add(c)
  }
  // 伞
  const cloth = canvasTexture(`umb-${ctx.dna.seed}`, 256, 256, (c, w, h) => {
    for (let i = 0; i < 8; i++) {
      c.fillStyle = i % 2 ? hsl(...pal.accent) : hsl(...pal.main.map((v, j) => j === 2 ? Math.min(95, v + 24) : v))
      c.beginPath()
      c.moveTo(w / 2, h / 2)
      c.arc(w / 2, h / 2, w / 2, i / 8 * Math.PI * 2, (i + 1) / 8 * Math.PI * 2)
      c.fill()
    }
  })
  const umbrella = mesh(new THREE.ConeGeometry(1.35, 0.5, 8, 1, true), stdMat({ map: cloth, roughness: 0.9, side: THREE.DoubleSide }), { p: [0, 2.1, 0] })
  g.add(umbrella)
  g.add(cyl(0.035, 0.035, 2.6, ctx.materials.trim, { p: [0, 1.3, 0] }))
  return { obj: g }
})

export const genOutdoorStools = reg('decor', 'outdoorStools', (ctx) => {
  const g = group()
  const n = ctx.rand.i(2, 3)
  for (let i = 0; i < n; i++) {
    const s = model(ctx, 'stoolBar', 0.95)
    if (s) {
      s.position.x = -0.5 + i * 0.5
      g.add(s)
    } else {
      g.add(cyl(0.2, 0.16, 0.68, ctx.materials.trim, { p: [-0.5 + i * 0.5, 0.34, 0], seg: 14 }))
    }
  }
  return { obj: g }
})

export const genAFrame = reg('decor', 'aframe', (ctx) => {
  const pal = ctx.dna.palette
  const tex = canvasTexture(`aframe-${ctx.dna.seed}`, 512, 640, (c, w, h) => {
    c.fillStyle = '#26332a'
    c.fillRect(0, 0, w, h)
    c.strokeStyle = hsl(...pal.trim); c.lineWidth = 14
    c.strokeRect(10, 10, w - 20, h - 20)
    const items = ctx.dna.business.props
    c.fillStyle = '#f6f3e8'
    c.font = `800 66px ${FONT_STACK}`
    c.textAlign = 'center'
    c.fillText('今日推荐', w / 2, 100)
    c.font = `700 54px ${FONT_STACK}`
    c.fillText('・' + ctx.dna.subtitle + '・', w / 2, 200)
    c.font = `600 44px ${FONT_STACK}`
    c.fillStyle = hsl(...pal.glow)
    c.fillText(`今日特惠 ¥${ctx.rand.i(9, 99)}`, w / 2, 300)
    c.fillStyle = '#f6f3e8'
    c.fillText('进店详询', w / 2, 420)
    c.strokeStyle = 'rgba(246,243,232,0.5)'; c.lineWidth = 3
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(120, 480 + i * 44); c.lineTo(w - 120, 480 + i * 44); c.stroke() }
  })
  const mat = stdMat({ map: tex, roughness: 0.9, side: THREE.DoubleSide })
  const board = plane(1.1, 1.4, mat)
  board.rotation.x = -0.22
  const g = group(board)
  const frame = stdMat({ color: col(pal.trim, null, 0, 0, -14), roughness: 0.8 })
  g.add(box(1.2, 1.5, 0.05, frame, { p: [0, 0.72, -0.04], r: [0.22, 0, 0] }))
  return { obj: g }
})

export const genMenuBoard = reg('decor', 'menuBoard', (ctx) => {
  const pal = ctx.dna.palette
  const tex = canvasTexture(`menu-${ctx.dna.seed}`, 384, 512, (c, w, h) => {
    c.fillStyle = hsl(...pal.main.map((v, i) => i === 2 ? Math.min(94, v + 30) : v))
    c.fillRect(0, 0, w, h)
    c.strokeStyle = hsl(...pal.trim); c.lineWidth = 10
    c.strokeRect(8, 8, w - 16, h - 16)
    c.fillStyle = '#fffdf4'
    c.font = `900 52px ${FONT_STACK}`
    c.textAlign = 'center'
    c.fillText('MENU', w / 2, 70)
    const dishes = [ctx.dna.business.name + '招牌', ctx.dna.subtitle, '本日限定', '季节特供']
    dishes.forEach((d, i) => {
      c.font = `700 36px ${FONT_STACK}`
      c.fillText(d, w / 2, 150 + i * 62)
      c.font = `600 26px ${FONT_STACK}`
      c.fillStyle = hsl(...pal.accent)
      c.fillText(`¥${ctx.rand.i(12, 88)}`, w / 2, 186 + i * 62)
      c.fillStyle = '#fffdf4'
    })
  })
  const g = group()
  const boardMat = stdMat({ map: tex, roughness: 0.75 })
  const board = box(1.0, 1.35, 0.06, boardMat, { p: [0, 1.5, 0] })
  g.add(board)
  g.add(cyl(0.04, 0.04, 2.0, ctx.materials.trim, { p: [0, 1.0, 0] }))
  return { obj: g }
})

// ---------- 灯光类 ----------
export const genStringLights = reg('decor', 'stringLights', (ctx) => {
  const { fp, rand } = ctx
  const g = group()
  const bulbMat = glowMat(col(ctx.dna.palette.glow), 2.4)
  const n = rand.i(9, 14)
  const span = fp.front.L * 0.85
  const y0 = 3.6
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const x = -span / 2 + t * span
    const sag = Math.sin(t * Math.PI) * 0.55
    g.add(sphere(0.06, bulbMat, { p: [x, y0 - sag, 0], cast: false }))
    if (i < n - 1) {
      const t2 = (i + 1) / (n - 1)
      const x2 = -span / 2 + t2 * span
      const sag2 = Math.sin(t2 * Math.PI) * 0.55
      const mid = [(x + x2) / 2, (y0 - sag + y0 - sag2) / 2 - 0.08, 0]
      const len = Math.hypot(x2 - x, (y0 - sag2) - (y0 - sag))
      const wire = cyl(0.008, 0.008, len, ctx.materials.trim, { p: mid, r: [0, 0, Math.atan2(x2 - x, (y0 - sag2) - (y0 - sag))], cast: false })
      g.add(wire)
    }
  }
  g.position.set(fp.front.mid[0], 0, fp.front.mid[1] + fp.front.normal[1] * 1.3)
  g.rotation.y = -fp.front.theta
  ctx.animate.push({
    t: rand.f(0, 9), update(dt) { this.t += dt; bulbMat.emissiveIntensity = 2.0 + 0.5 * Math.sin(this.t * 2.1) }
  })
  return { obj: g, mounted: true }
})

export const genLanternString = reg('decor', 'lanternString', (ctx) => {
  const { fp, rand } = ctx
  const g = group()
  const n = rand.i(6, 10)
  const span = fp.front.L * 0.9
  const pal = ctx.dna.palette
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const x = -span / 2 + t * span
    const sag = Math.sin(t * Math.PI) * 0.7
    const y = 3.8 - sag
    const lm = glowMat(col(pal.glow), 1.8, col(pal.accent).getHex())
    g.add(mesh(new THREE.SphereGeometry(0.13, 12, 10), lm, { p: [x, y, 0], s: [1, 1.2, 1], cast: false }))
    g.add(cyl(0.02, 0.02, 0.1, ctx.materials.trim, { p: [x, y + 0.17, 0], cast: false }))
  }
  g.position.set(fp.front.mid[0], 0, fp.front.mid[1] + fp.front.normal[1] * 1.1)
  g.rotation.y = -fp.front.theta
  return { obj: g, mounted: true }
})

export const genLanterns = reg('decor', 'lanterns', (ctx) => {
  const { rand } = ctx
  const g = group()
  const pal = ctx.dna.palette
  const n = rand.i(1, 2)
  for (let i = 0; i < n; i++) {
    const r = rand.f(0.35, 0.55)
    const lm = glowMat(col(pal.glow), 2.0, col(pal.accent).getHex())
    const y = rand.f(2.4, 3.2)
    const x = (i - (n - 1) / 2) * rand.f(0.9, 1.4)
    g.add(mesh(new THREE.SphereGeometry(r, 16, 14), lm, { p: [x, y, 0], s: [1, 1.15, 1] }))
    g.add(cyl(r * 0.4, r * 0.4, 0.1, ctx.materials.trim, { p: [x, y + r * 1.16, 0] }))
    g.add(cyl(r * 0.45, r * 0.4, 0.1, ctx.materials.trim, { p: [x, y - r * 1.16, 0] }))
    g.add(cyl(0.012, 0.012, 0.5, ctx.materials.trim, { p: [x, y + r * 1.3 + 0.25, 0], cast: false }))
    // 流苏
    for (let k = 0; k < 4; k++) {
      g.add(cyl(0.008, 0.02, 0.3, stdMat({ color: col(pal.accent), roughness: 0.9 }), { p: [x + (k - 1.5) * 0.07, y - r * 1.35, 0], cast: false }))
    }
  }
  return { obj: g, hang: 3.4 }
})

export const genGasLamp = reg('decor', 'gasLamp', (ctx) => {
  const g = group()
  const metal = stdMat({ color: col(ctx.dna.palette.trim, null, 0, -14, -20), roughness: 0.5, metalness: 0.7 })
  g.add(cyl(0.05, 0.09, 2.6, metal, { p: [0, 1.3, 0] }))
  const flame = glowMat(0xffc766, 2.6, 0x664411)
  g.add(mesh(new THREE.SphereGeometry(0.16, 12, 10), flame, { p: [0, 2.75, 0], s: [1, 1.4, 1] }))
  const cageMat = metal
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * Math.PI * 2
    g.add(cyl(0.012, 0.012, 0.5, cageMat, { p: [Math.cos(a) * 0.13, 2.78, Math.sin(a) * 0.13], r: [Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4], cast: false }))
  }
  g.add(cone(0.26, 0.2, metal, { p: [0, 3.05, 0], seg: 8 }))
  ctx.animate.push({
    t: ctx.rand.f(0, 5), update(dt) { this.t += dt; flame.emissiveIntensity = 2.2 + Math.sin(this.t * 7) * 0.35 }
  })
  return { obj: g, light: { y: 2.75, color: 0xffb45e, intensity: 5, dist: 5 } }
})

export const genSconceLamp = reg('decor', 'sconceLamp', (ctx) => {
  const g = group()
  const metal = stdMat({ color: col(ctx.dna.palette.trim, null, 0, 0, -22), roughness: 0.5, metalness: 0.6 })
  g.add(box(0.16, 0.34, 0.1, metal, { p: [0, 2.2, 0.06] }))
  const lm = glowMat(col(ctx.dna.palette.glow), 2.2)
  g.add(mesh(new THREE.SphereGeometry(0.12, 12, 10), lm, { p: [0, 2.15, 0.28], s: [1, 1.3, 1], cast: false }))
  g.add(cone(0.17, 0.12, metal, { p: [0, 2.32, 0.26], seg: 10 }))
  return { obj: g, wall: true, light: { y: 2.2, color: null, intensity: 3, dist: 3.5 } }
})

export const genNeonStrip = reg('decor', 'neonStrip', (ctx) => {
  const { rand } = ctx
  const g = group()
  const pal = ctx.dna.palette
  const nm = glowMat(col(pal.glow), 2.6, 0x0c0c14)
  const n = rand.i(2, 3)
  for (let i = 0; i < n; i++) {
    const W = rand.f(0.8, 1.8)
    const y = 1.2 + i * rand.f(0.8, 1.2)
    g.add(box(W, 0.06, 0.05, nm, { p: [rand.f(-0.4, 0.4), y, 0.1], r: [0, 0, rand.f(-0.08, 0.08)], cast: false }))
  }
  // 霓虹标语
  const t = textPlate(ctx, 'neonstrip', ctx.dna.neonSub || 'OPEN', 1.6, 0.5, { glowColor: hsl(...pal.accent), emissive: 2.2, size: 88 })
  t.position.set(0, 3.0, 0.12)
  g.add(t)
  ctx.animate.push({
    t: rand.f(0, 7), update(dt) { this.t += dt; nm.emissiveIntensity = 2.2 + Math.sin(this.t * 9) * 0.5 }
  })
  return { obj: g, wall: true }
})

export const genCandleCluster = reg('decor', 'candleCluster', (ctx) => {
  const { rand } = ctx
  const g = group()
  const waxMat = stdMat({ color: 0xe8dcc2, roughness: 0.6 })
  const flame = glowMat(0xffc766, 2.8, 0x553311)
  const n = rand.i(3, 5)
  for (let i = 0; i < n; i++) {
    const h = rand.f(0.18, 0.5)
    const a = i / n * Math.PI * 2
    const x = Math.cos(a) * 0.2, z = Math.sin(a) * 0.2
    g.add(cyl(0.06, 0.07, h, waxMat, { p: [x, h / 2, z] }))
    g.add(cone(0.03, 0.1, flame, { p: [x, h + 0.05, z], cast: false, seg: 8 }))
  }
  ctx.animate.push({
    t: rand.f(0, 4), update(dt) { this.t += dt; flame.emissiveIntensity = 2.4 + Math.sin(this.t * 8) * 0.5 }
  })
  return { obj: g }
})

export const genLampPost = reg('decor', 'lampPost', (ctx) => {
  const g = group()
  const metal = stdMat({ color: col(ctx.dna.palette.trim, null, 0, 0, -24), roughness: 0.5, metalness: 0.6 })
  g.add(cyl(0.07, 0.11, 3.4, metal, { p: [0, 1.7, 0] }))
  g.add(cyl(0.2, 0.24, 0.08, metal, { p: [0, 0.04, 0], seg: 10 }))
  g.add(sphere(0.06, metal, { p: [0, 3.42, 0] }))
  const head = glowMat(col(ctx.dna.palette.glow), 2.0)
  g.add(mesh(new THREE.SphereGeometry(0.2, 14, 12), head, { p: [0, 3.25, 0] }))
  g.add(cone(0.28, 0.22, metal, { p: [0, 3.52, 0], seg: 10 }))
  return { obj: g, light: { y: 3.25, color: null, intensity: 6, dist: 7 } }
})

export const genUplights = reg('decor', 'uplights', (ctx) => {
  const { rand } = ctx
  const g = group()
  const n = rand.i(2, 3)
  for (let i = 0; i < n; i++) {
    const beamMat = new THREE.MeshStandardMaterial({
      color: col(ctx.dna.palette.glow), emissive: col(ctx.dna.palette.glow), emissiveIntensity: 1.4,
      transparent: true, opacity: 0.16, roughness: 1, depthWrite: false,
    })
    g.add(cyl(0.03, 0.34, 3.0, beamMat, { p: [-0.7 + i * 0.7, 1.5, 0.05], cast: false }))
    g.add(cyl(0.07, 0.09, 0.12, ctx.materials.trim, { p: [-0.7 + i * 0.7, 0.06, 0.05] }))
  }
  return { obj: g, wall: true }
})

// ---------- 货物 / 街具类 ----------
export const genBarrels = reg('decor', 'barrels', (ctx) => {
  const { rand } = ctx
  const g = group()
  const barrelMat = stdMat({ color: col(ctx.dna.palette.trim, null, 0, -6, -18), roughness: 0.9 })
  const n = rand.i(2, 4)
  const positions = [[0, 0], [0.75, 0.2], [0.3, 0.75], [0.85, 0.85]]
  for (let i = 0; i < Math.min(n, positions.length); i++) {
    const [x, z] = positions[i]
    g.add(cyl(0.34, 0.3, 0.85, barrelMat, { p: [x, 0.42, z], seg: 16 }))
    for (const y of [0.2, 0.64]) g.add(torus(0.35, 0.025, ctx.materials.trim, { p: [x, y, z], r: [Math.PI / 2, 0, 0] }))
  }
  return { obj: g }
})

export const genCrates = reg('decor', 'crates', (ctx) => {
  const { rand } = ctx
  const g = group()
  const woodMat = stdMat({ color: col(ctx.dna.palette.trim, null, 0, 0, -12), roughness: 0.9 })
  const n = rand.i(2, 3)
  for (let i = 0; i < n; i++) {
    const s = rand.f(0.55, 0.8)
    g.add(box(s, s, s, woodMat, { p: [rand.f(-0.5, 0.5), s / 2 + (i === 2 ? 0.7 : 0), rand.f(-0.3, 0.3)], r: [0, rand.f(0, 1.5), 0] }))
  }
  return { obj: g }
})

export const genCrateStack = reg('decor', 'crateStack', (ctx) => {
  const { rand } = ctx
  const g = group()
  const woodMat = stdMat({ color: col(ctx.dna.palette.trim, null, 0, 0, -12), roughness: 0.9 })
  let y = 0
  const n = rand.i(2, 3)
  for (let i = 0; i < n; i++) {
    const s = 0.75 - i * 0.12
    g.add(box(s, s * 0.8, s, woodMat, { p: [rand.f(-0.1, 0.1), y + s * 0.4, rand.f(-0.1, 0.1)], r: [0, rand.f(0, 0.8), 0] }))
    y += s * 0.8
  }
  // 顶上放个罐子
  g.add(cyl(0.12, 0.16, 0.24, stdMat({ color: col(ctx.dna.palette.accent), roughness: 0.7 }), { p: [0, y + 0.12, 0] }))
  return { obj: g }
})

export const genSandbags = reg('decor', 'sandbags', (ctx) => {
  const { rand } = ctx
  const g = group()
  const bagMat = stdMat({ color: col(ctx.dna.palette.ground, null, 0, 0, -8), roughness: 1 })
  const rows = 3
  for (let r = 0; r < rows; r++) {
    const n = 3 - (r === 2 ? 1 : 0)
    for (let i = 0; i < n; i++) {
      g.add(sphere(0.22, bagMat, { p: [(i - n / 2 + 0.5) * 0.42 + (r % 2) * 0.2, 0.14 + r * 0.26, 0], s: [1.6, 0.65, 1] }))
    }
  }
  return { obj: g }
})

export const genVending = reg('decor', 'vending', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const bodyMat = stdMat({ color: col(pal.main, null, 0, 0, -6), roughness: 0.45, metalness: 0.5 })
  g.add(box(1.1, 2.1, 0.78, bodyMat, { p: [0, 1.05, 0] }))
  // 商品橱窗
  const caseTex = canvasTexture(`vend-${ctx.dna.seed}`, 256, 512, (c, w, h) => {
    c.fillStyle = '#10131c'; c.fillRect(0, 0, w, h)
    const items = ['🥤', '🍫', '🍪', '🧃', '☕', '🍜', '🧋', '🍬']
    for (let r = 0; r < 4; r++) for (let col = 0; col < 2; col++) {
      c.font = '44px ' + FONT_STACK
      c.textAlign = 'center'
      c.fillText(items[(r * 2 + col) % items.length], 65 + col * 125, 80 + r * 115)
    }
  })
  const glassMat = new THREE.MeshStandardMaterial({ map: caseTex, roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.92 })
  g.add(box(0.72, 1.5, 0.05, glassMat, { p: [-0.12, 1.15, 0.4], cast: false }))
  const glowPanel = glowMat(col(pal.glow), 2.4)
  g.add(box(0.2, 1.5, 0.04, glowPanel, { p: [0.42, 1.15, 0.4], cast: false }))
  const screen = textPlate(ctx, 'vendScreen', '¥扫码', 0.4, 0.3, { bg: '#0c1a14', color: '#5ef2b0', glowColor: '#5ef2b0', emissive: 1.8, size: 80 })
  screen.position.set(0.42, 1.9, 0.41)
  g.add(screen)
  g.userData.interact = { type: 'vending', label: '自动售货机 · 投币口发烫' }
  return { obj: g, big: true }
})

export const genAcUnit = reg('decor', 'acUnit', (ctx) => {
  const g = group()
  const metal = stdMat({ color: col(ctx.dna.palette.ground, null, 0, 0, -6), roughness: 0.6, metalness: 0.6 })
  g.add(box(0.9, 0.65, 0.65, metal, { p: [0, 1.85, 0] }))
  const fanMat = stdMat({ color: 0x22262c, roughness: 0.5 })
  g.add(cyl(0.24, 0.24, 0.06, fanMat, { p: [0, 1.85, 0.34], r: [Math.PI / 2, 0, 0], seg: 18 }))
  const blades = group()
  for (let i = 0; i < 4; i++) {
    blades.add(box(0.4, 0.1, 0.02, ctx.materials.trim, { p: [0, 0, 0.02], r: [0, 0, i * Math.PI / 4], cast: false }))
  }
  blades.position.set(0, 1.85, 0.36)
  g.add(blades)
  g.add(cyl(0.03, 0.03, 1.55, ctx.materials.trim, { p: [0, 1.0, 0] }))
  ctx.animate.push({ t: 0, update(dt) { blades.rotation.z += dt * 9 } })
  return { obj: g }
})

export const genSignPost = reg('decor', 'signPost', (ctx) => {
  const { rand } = ctx
  const g = group()
  g.add(cyl(0.06, 0.08, 2.6, ctx.materials.trim, { p: [0, 1.3, 0] }))
  const dirs = [['本店', 0.3, -0.15], ['营业中', -0.25, 0.2], ['↑入口', 0.15, 0.35]]
  for (let i = 0; i < rand.i(2, 3); i++) {
    const [txt, dx, ry] = dirs[i % dirs.length]
    const plate = textPlate(ctx, `post${i}`, ' ' + txt + ' ', 1.1, 0.34, {
      bg: hsl(...ctx.dna.palette.main), border: hsl(...ctx.dna.palette.trim), color: '#fff', emissive: 0.5, size: 72,
    })
    plate.position.set(dx, 2.1 - i * 0.55, 0)
    plate.rotation.y = ry
    g.add(plate)
  }
  return { obj: g }
})

export const genMailbox = reg('decor', 'mailbox', (ctx) => {
  const g = group()
  const bodyMat = stdMat({ color: col(ctx.dna.palette.accent, null, 0, 0, -8), roughness: 0.6, metalness: 0.3 })
  g.add(box(0.34, 0.5, 0.6, bodyMat, { p: [0, 1.15, 0] }))
  g.add(cyl(0.17, 0.17, 0.6, bodyMat, { p: [0, 1.4, 0], r: [0, 0, Math.PI / 2], seg: 14 }))
  g.add(cyl(0.045, 0.055, 0.9, ctx.materials.trim, { p: [0, 0.45, 0] }))
  g.add(box(0.24, 0.04, 0.02, stdMat({ color: 0x1c1c1e }), { p: [0, 1.2, 0.31], cast: false }))
  return { obj: g }
})

export const genBike = reg('decor', 'bike', (ctx) => {
  const g = group()
  const frameMat = stdMat({ color: col(ctx.dna.palette.accent, null, 0, 0, -4), roughness: 0.4, metalness: 0.5 })
  const wheelMat = stdMat({ color: 0x1e2126, roughness: 0.7 })
  for (const wx of [-0.42, 0.42]) {
    g.add(torus(0.3, 0.045, wheelMat, { p: [wx, 0.32, 0], r: [0, Math.PI / 2, 0] }))
    g.add(cyl(0.02, 0.02, 0.06, ctx.materials.trim, { p: [wx, 0.32, 0], r: [0, 0, Math.PI / 2] }))
  }
  g.add(cyl(0.025, 0.025, 0.72, frameMat, { p: [0, 0.52, 0], r: [0, 0, 1.05] }))
  g.add(cyl(0.025, 0.025, 0.5, frameMat, { p: [0.24, 0.58, 0], r: [0, 0, 0.4] }))
  g.add(cyl(0.025, 0.025, 0.5, frameMat, { p: [-0.24, 0.58, 0], r: [0, 0, -0.4] }))
  g.add(cyl(0.02, 0.02, 0.24, ctx.materials.trim, { p: [0, 0.78, 0], r: [0, 0, 1.05] }))
  g.add(box(0.3, 0.05, 0.18, ctx.materials.trim, { p: [-0.28, 0.85, 0] }))
  const basket = stdMat({ color: col(ctx.dna.palette.trim, null, 0, 0, -14), roughness: 0.85 })
  g.add(box(0.3, 0.2, 0.24, basket, { p: [0.48, 0.58, 0], cast: false }))
  return { obj: g }
})

export const genTrafficCone = reg('decor', 'trafficCone', (ctx) => {
  const g = group()
  const coneMat = stdMat({ color: 0xe8642c, roughness: 0.6 })
  g.add(box(0.4, 0.05, 0.4, coneMat, { p: [0, 0.025, 0] }))
  g.add(cone(0.2, 0.72, coneMat, { p: [0, 0.4, 0], seg: 14 }))
  g.add(cyl(0.13, 0.16, 0.1, stdMat({ color: 0xf4f4f4, roughness: 0.5 }), { p: [0, 0.42, 0], seg: 14 }))
  return { obj: g }
})

export const genGraffiti = reg('decor', 'graffiti', (ctx) => {
  const { rand } = ctx
  const g = group()
  const pal = ctx.dna.palette
  const tex = canvasTexture(`graf-${ctx.dna.seed}`, 512, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h)
    const words = [ctx.dna.name, 'OPEN', '牛', 'COOL', 'SALE', ctx.dna.business.en]
    let x = 30
    c.textBaseline = 'middle'
    for (let i = 0; i < 3; i++) {
      const word = words[(i + rand.i(0, 3)) % words.length]
      c.save()
      c.translate(x, h / 2 + rand.f(-30, 30))
      c.rotate(rand.f(-0.16, 0.16))
      c.font = `900 ${rand.f(64, 110)}px ${FONT_STACK}`
      c.strokeStyle = hsl(...(i % 2 ? pal.accent : pal.glow))
      c.lineWidth = 10
      c.strokeText(word, 0, 0)
      c.fillStyle = 'rgba(255,255,255,0.85)'
      c.fillText(word, 0, 0)
      c.restore()
      x += c.measureText(word).width + 40
    }
  })
  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.9 })
  const p = plane(2.6, 1.3, mat, { cast: false })
  g.add(p)
  return { obj: g, wall: true }
})

export const genStatue = reg('decor', 'statue', (ctx) => {
  const m = model(ctx, ctx.rand.pick(['statue_head', 'statue_ring', 'statue_obelisk']), ctx.rand.f(1.2, 1.8), false)
  if (m) return { obj: group(pedestal(ctx, 0.5, 0.5), (() => { m.position.y = 0.5; return m })()) }
  const g = group(pedestal(ctx, 0.5, 0.5))
  const stoneMat = stdMat({ color: 0xb9b2a4, roughness: 0.85 })
  g.add(sphere(0.32, stoneMat, { p: [0, 1.1, 0] }))
  g.add(cyl(0.24, 0.34, 0.7, stoneMat, { p: [0, 0.85, 0] }))
  return { obj: g }
})

export const genMushroom = reg('decor', 'mushroom', (ctx) => {
  const m = model(ctx, ctx.rand.pick(['mushroom_red', 'mushroom_redGroup', 'mushroom_tan']), 0.7, false)
  if (m) return { obj: m }
  const g = group()
  const capMat = stdMat({ color: col(ctx.dna.palette.accent), roughness: 0.7 })
  g.add(cyl(0.07, 0.1, 0.35, stdMat({ color: 0xeadfc8, roughness: 0.8 }), { p: [0, 0.17, 0] }))
  g.add(sphere(0.24, capMat, { p: [0, 0.4, 0], s: [1, 0.6, 1] }))
  for (let i = 0; i < 4; i++) {
    const a = i * 1.7
    g.add(sphere(0.035, stdMat({ color: 0xf6f2e6 }), { p: [Math.cos(a) * 0.14, 0.48, Math.sin(a) * 0.14], cast: false }))
  }
  return { obj: g }
})

export const genFlowerStand = reg('decor', 'flowerStand', (ctx) => {
  const { rand } = ctx
  const g = group()
  for (let i = 0; i < 3; i++) {
    const m = model(ctx, rand.pick(['flower_redA', 'flower_yellowB', 'flower_purpleC', 'flower_redC']), 0.9)
    if (m) { m.position.set((i - 1) * 0.55, 0, 0); g.add(m) }
  }
  if (!g.children.length) {
    for (let i = 0; i < 5; i++) {
      const p = plantFoliage(ctx, 'flower', rand.f(0.7, 1.1))
      p.position.set(rand.f(-0.7, 0.7), 0, rand.f(-0.2, 0.2))
      g.add(p)
    }
  }
  return { obj: g }
})

export const genHoloAd = reg('decor', 'holoAd', (ctx) => {
  const { rand } = ctx
  const pal = ctx.dna.palette
  const g = group()
  const holoMat = new THREE.MeshStandardMaterial({
    color: col(pal.glow), emissive: col(pal.glow), emissiveIntensity: 1.6,
    transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false,
  })
  const p = textPlate(ctx, 'holoAd', ctx.dna.business.en + ' · ' + ctx.dna.subtitle, 2.2, 0.6, {
    glowColor: hsl(...pal.glow), emissive: 2.2, size: 56, color: '#eaffff',
  })
  p.position.y = 2.2
  g.add(p)
  g.add(box(2.4, 0.03, 0.03, holoMat, { p: [0, 2.55, 0], cast: false }))
  g.add(box(2.4, 0.03, 0.03, holoMat, { p: [0, 1.85, 0], cast: false }))
  g.add(cyl(0.05, 0.07, 1.6, ctx.materials.trim, { p: [0, 0.8, 0] }))
  ctx.animate.push({
    t: rand.f(0, 4), update(dt) {
      this.t += dt
      p.material.opacity = 0.75 + 0.25 * Math.sin(this.t * 3.7)
      p.position.y = 2.2 + Math.sin(this.t * 1.3) * 0.06
    }
  })
  return { obj: g, big: true }
})

export const genStoneLantern = reg('decor', 'stoneLantern', (ctx) => {
  const stone = stdMat({ color: col(ctx.dna.palette.ground, null, 0, -18, 20), roughness: 0.9 })
  const g = group()
  g.add(cyl(0.3, 0.36, 0.14, stone, { p: [0, 0.07, 0], seg: 6 }))
  g.add(cyl(0.1, 0.14, 0.7, stone, { p: [0, 0.45, 0], seg: 8 }))
  g.add(box(0.42, 0.3, 0.42, stone, { p: [0, 0.92, 0] }))
  const lm = glowMat(0xffd9a0, 1.9)
  g.add(box(0.24, 0.2, 0.24, lm, { p: [0, 0.94, 0], cast: false }))
  g.add(box(0.55, 0.1, 0.55, stone, { p: [0, 1.14, 0] }))
  g.add(cone(0.34, 0.3, stone, { p: [0, 1.34, 0], seg: 6 }))
  g.add(sphere(0.04, stone, { p: [0, 1.52, 0] }))
  return { obj: g, light: { y: 0.95, color: 0xffc98a, intensity: 3, dist: 4 } }
})

export const genDoormat = reg('decor', 'doormat', (ctx) => {
  const pal = ctx.dna.palette
  const tex = canvasTexture(`mat-${ctx.dna.seed}`, 512, 256, (c, w, h) => {
    c.fillStyle = hsl(...pal.ground.map((v, i) => i === 2 ? v + 18 : v))
    c.fillRect(0, 0, w, h)
    c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 8
    c.strokeRect(10, 10, w - 20, h - 20)
    c.font = `800 84px ${FONT_STACK}`
    c.textAlign = 'center'; c.textBaseline = 'middle'
    c.fillStyle = 'rgba(255,255,255,0.8)'
    c.fillText('欢迎光临', w / 2, h / 2)
  })
  const mat = stdMat({ map: tex, roughness: 1 })
  return { obj: group(plane(1.6, 0.8, mat, { p: [0, 0.012, 0], r: [-Math.PI / 2, 0, 0], cast: false })), flat: true }
})

// ---------- 彩蛋装饰：动物雕像组（纯几何吉祥物）----------
function mascotStatueGen(kind, regName, label) {
  return reg('decor', regName, (ctx) => {
    const g = group(pedestal(ctx, 0.42, 0.5))
    const m = mascot(ctx, kind, ctx.rand.f(0.9, 1.2))
    m.position.y = 0.42
    g.add(m)
    const tag = textPlate(ctx, regName, label, 1.0, 0.28, {
      bg: hsl(...ctx.dna.palette.main), color: '#fff', size: 60, emissive: 0.6,
    })
    tag.position.set(0, 0.16, 0.52)
    g.add(tag)
    return { obj: g, interact: { type: 'eggStatue', label } }
  })
}
export const genCatStatue = mascotStatueGen('cat', 'egg_catStatue', '镇店神猫')
export const genDogStatue = mascotStatueGen('dog', 'egg_dogStatue', '旺财汪汪')
export const genPigeonStatue = mascotStatueGen('pigeon', 'egg_pigeonStatue', '咕咕咕')
export const genFrogStatue = mascotStatueGen('frog', 'egg_frogStatue', '呱呱叫')
export const genSheepStatue = mascotStatueGen('sheep', 'egg_sheepStatue', '咩咩咩')
export const genCowStatue = mascotStatueGen('cow', 'egg_cowStatue', '哞哞哞')
export const genDuckStatue = mascotStatueGen('duck', 'egg_duckStatue', '冲鸭！')
export const genMonkeyStatue = mascotStatueGen('monkey', 'egg_monkeyStatue', '灵猴献瑞')
export const genOxStatue = mascotStatueGen('ox', 'egg_oxHarness', '老牛奋蹄')
export const genSigmaStatue = mascotStatueGen('cat', 'egg_sigmaStatue', 'SIGMA 之凝视')

export const genPandaDecor = reg('decor', 'egg_panda', (ctx) => {
  const g = group(pedestal(ctx, 0.4, 0.5))
  const m = mascot(ctx, 'panda', 1.1)
  m.position.y = 0.4
  g.add(m)
  // 竹子陪衬
  for (const dx of [-0.7, 0.7]) {
    const b = genBambooCluster(ctx).obj
    b.position.x = dx
    g.add(b)
  }
  return { obj: g, interact: { type: 'eggStatue', label: '滚滚本尊' } }
})

// ---------- 彩蛋装饰：道具组（几何 + Canvas 面）----------
function propGen(name, build) {
  return reg('decor', `egg_${name}`, (ctx) => {
    const g = build(ctx)
    return { obj: g, interact: { type: 'eggProp', label: name } }
  })
}

export const genYarnBall = propGen('yarnBall', (ctx) => {
  const g = group()
  const mat = stdMat({ color: col(ctx.dna.palette.accent), roughness: 0.9 })
  g.add(sphere(0.34, mat, { p: [0, 0.34, 0] }))
  for (let i = 0; i < 3; i++) {
    g.add(torus(0.34, 0.018, stdMat({ color: col(ctx.dna.palette.glow), roughness: 0.9 }), {
      p: [0, 0.34, 0], r: [Math.PI / 2 + i * 0.6, i * 0.7, 0], cast: false,
    }))
  }
  g.add(cyl(0.012, 0.012, 0.5, mat, { p: [0.3, 0.15, 0.2], r: [0.4, 0.5, -1.2], cast: false }))
  return g
})

export const genHoneyPot = propGen('honeyPot', (ctx) => {
  const g = group()
  const pot = stdMat({ color: 0xd9a441, roughness: 0.5 })
  g.add(cyl(0.3, 0.22, 0.55, pot, { p: [0, 0.28, 0], seg: 16 }))
  g.add(cyl(0.26, 0.3, 0.1, pot, { p: [0, 0.6, 0], seg: 16 }))
  const honey = glowMat(0xffb52e, 1.6, 0x6b4a10)
  g.add(cyl(0.22, 0.22, 0.05, honey, { p: [0, 0.62, 0], seg: 16, cast: false }))
  g.add(sphere(0.09, honey, { p: [0, 0.78, 0], cast: false }))
  const tag = textPlate(ctx, 'honey', '蜂蜜', 0.6, 0.24, { bg: '#a8721e', color: '#ffe9c2', size: 72, emissive: 0.5 })
  tag.position.set(0, 0.3, 0.31)
  g.add(tag)
  return g
})

export const genDoghouse = propGen('doghouse', (ctx) => {
  const g = group()
  const woodMat = stdMat({ color: col(ctx.dna.palette.trim, null, 0, 0, -10), roughness: 0.9 })
  g.add(box(1.1, 0.8, 1.0, woodMat, { p: [0, 0.4, 0] }))
  const roofMat = stdMat({ color: col(ctx.dna.palette.main), roughness: 0.8 })
  for (const side of [-1, 1]) {
    g.add(box(1.35, 0.08, 0.75, roofMat, { p: [0, 1.05, side * 0.3], r: [side * 0.62, 0, 0] }))
  }
  const hole = mesh(new THREE.CircleGeometry(0.28, 20), stdMat({ color: 0x14100c }), { p: [0, 0.42, 0.51], cast: false })
  g.add(hole)
  const bowl = cyl(0.14, 0.1, 0.08, stdMat({ color: 0xc0392b, roughness: 0.4 }), { p: [0.75, 0.04, 0.4] })
  g.add(bowl)
  return g
})

export const genDragonOrnament = propGen('dragonOrnament', (ctx) => {
  const g = group(pedestal(ctx, 0.5, 0.45))
  const pal = ctx.dna.palette
  const gold = stdMat({ color: 0xe8b83a, metalness: 0.9, roughness: 0.3 })
  // 盘龙：环身 + 头
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2
    g.add(sphere(0.16, gold, { p: [Math.cos(a) * 0.42, 0.75 + Math.sin(a * 2) * 0.06, Math.sin(a) * 0.42], s: [1.4, 1, 1] }))
  }
  g.add(sphere(0.2, gold, { p: [0.42, 0.95, 0], s: [1.1, 1, 1.3] }))
  g.add(cone(0.05, 0.16, gold, { p: [0.58, 1.02, 0.1], r: [0, 0, -0.7], seg: 6 }))
  g.add(cone(0.05, 0.16, gold, { p: [0.58, 1.02, -0.1], r: [0, 0, -0.7], seg: 6 }))
  const orb = glowMat(col(pal.glow), 2.4)
  g.add(sphere(0.14, orb, { p: [0.68, 1.05, 0], cast: false }))
  ctx.animate.push({ t: 0, update(dt) { orb.emissiveIntensity = 2.0 + Math.sin(Date.now() * 0.003) * 0.6 } })
  return g
})

export const genBirdcageLamp = propGen('birdcageLamp', (ctx) => {
  const g = group()
  const metal = stdMat({ color: col(ctx.dna.palette.trim, null, 0, 0, -16), roughness: 0.4, metalness: 0.7 })
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2
    g.add(cyl(0.012, 0.012, 0.85, metal, { p: [Math.cos(a) * 0.28, 2.4, Math.sin(a) * 0.28], cast: false }))
  }
  g.add(torus(0.3, 0.02, metal, { p: [0, 2.82, 0], r: [Math.PI / 2, 0, 0] }))
  g.add(torus(0.3, 0.02, metal, { p: [0, 2.0, 0], r: [Math.PI / 2, 0, 0] }))
  g.add(sphere(0.32, metal, { p: [0, 2.9, 0], s: [1, 0.6, 1] }))
  const lm = glowMat(col(ctx.dna.palette.glow), 2.2)
  g.add(sphere(0.12, lm, { p: [0, 2.35, 0], cast: false }))
  g.add(cyl(0.008, 0.008, 0.6, metal, { p: [0, 3.1, 0], cast: false }))
  // 小鸟
  g.add(sphere(0.07, stdMat({ color: 0x4db8d8, roughness: 0.6 }), { p: [0, 2.15, 0.12] }))
  return g
})

export const genHangingCage = propGen('hangingCage', (ctx) => {
  const g = group()
  const metal = stdMat({ color: 0x8a8578, roughness: 0.5, metalness: 0.6 })
  g.add(cyl(0.22, 0.3, 0.5, metal, { p: [0, 2.3, 0], seg: 8 }))
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2
    g.add(cyl(0.01, 0.01, 0.5, metal, { p: [Math.cos(a) * 0.26, 2.05, Math.sin(a) * 0.26], cast: false }))
  }
  g.add(cyl(0.01, 0.01, 0.8, metal, { p: [0, 2.95, 0], cast: false }))
  return g
})

export const genCagedPlant = propGen('cagedPlant', (ctx) => {
  const g = group()
  const metal = stdMat({ color: 0x8a8578, roughness: 0.5, metalness: 0.6 })
  g.add(cyl(0.3, 0.24, 0.3, stdMat({ color: 0x9a6b4f, roughness: 0.85 }), { p: [0, 0.15, 0] }))
  const f = plantFoliage(ctx, 'flower', 1.1)
  f.position.y = 0.3
  g.add(f)
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2
    g.add(cyl(0.012, 0.012, 0.9, metal, { p: [Math.cos(a) * 0.34, 0.75, Math.sin(a) * 0.34], r: [Math.sin(a) * 0.18, 0, -Math.cos(a) * 0.18], cast: false }))
  }
  g.add(torus(0.36, 0.02, metal, { p: [0, 1.2, 0], r: [Math.PI / 2, 0, 0] }))
  return g
})

export const genMoonOrnament = propGen('moonOrnament', (ctx) => {
  const g = group()
  const glow = glowMat(0xfff2c4, 2.0)
  const moon = mesh(new THREE.SphereGeometry(0.5, 24, 18), glow, { p: [0, 2.4, 0], s: [1, 1, 0.3] })
  g.add(moon)
  // 月牙：抠一个暗球
  g.add(sphere(0.42, stdMat({ color: 0x0e1018 }), { p: [0.3, 2.5, 0.1], cast: false }))
  for (let i = 0; i < 5; i++) {
    g.add(sphere(0.02, glowMat(0xffffff, 2.6), { p: [Math.cos(i * 1.9) * 0.8, 2.4 + Math.sin(i * 2.4) * 0.6, 0.05], cast: false }))
  }
  g.add(cyl(0.012, 0.012, 0.6, ctx.materials.trim, { p: [0, 3.0, 0], cast: false }))
  ctx.animate.push({ t: ctx.rand.f(0, 6), update(dt) { this.t += dt; moon.rotation.z = Math.sin(this.t * 0.5) * 0.1 } })
  return g
})

export const genStarOrnament = propGen('starOrnament', (ctx) => {
  const g = group()
  const star = glowMat(col(ctx.dna.palette.glow), 2.6)
  const shape = new THREE.Shape()
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2 - Math.PI / 2
    const r = i % 2 === 0 ? 0.5 : 0.2
    if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r)
    else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  shape.closePath()
  g.add(mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false }), star, { p: [0, 2.4, 0] }))
  for (let i = 0; i < 4; i++) {
    g.add(sphere(0.02, star, { p: [Math.cos(i * 1.6) * 0.7, 2.4 + Math.sin(i * 1.6) * 0.7, 0.05], cast: false }))
  }
  ctx.animate.push({ t: ctx.rand.f(0, 6), update(dt) { this.t += dt; star.emissiveIntensity = 2.2 + Math.sin(this.t * 3) * 0.7 } })
  return g
})

export const genSunOrnament = propGen('sunOrnament', (ctx) => {
  const g = group()
  const sun = glowMat(0xffd66b, 2.4)
  g.add(sphere(0.45, sun, { p: [0, 2.4, 0] }))
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2
    g.add(cyl(0.02, 0.05, 0.3, sun, { p: [Math.cos(a) * 0.62, 2.4 + Math.sin(a) * 0.62, 0], r: [0, 0, a + Math.PI / 2], cast: false }))
  }
  ctx.animate.push({ t: ctx.rand.f(0, 6), update(dt) { this.t += dt; g.rotation.z = Math.sin(this.t * 0.6) * 0.3 } })
  return g
})

export const genFishTankNeon = propGen('fishTankNeon', (ctx) => {
  const g = group()
  const glass = glassMat(0x8fd8ff, 0.35)
  g.add(box(1.2, 0.8, 0.6, glass, { p: [0, 1.0, 0] }))
  g.add(box(1.24, 0.06, 0.64, ctx.materials.trim, { p: [0, 0.66, 0] }))
  g.add(box(1.24, 0.06, 0.64, ctx.materials.trim, { p: [0, 1.4, 0] }))
  // 霓虹鱼
  const fishMat = glowMat(col(ctx.dna.palette.glow), 2.2)
  for (let i = 0; i < 3; i++) {
    const f = group(
      sphere(0.12, fishMat, { s: [1.5, 1, 0.5], cast: false }),
      cone(0.1, 0.18, fishMat, { p: [-0.18, 0, 0], r: [0, 0, Math.PI / 2], s: [1, 1, 0.3], seg: 8, cast: false }),
    )
    f.position.set(-0.3 + i * 0.3, 0.9 + Math.sin(i * 2.1) * 0.2, 0)
    f.userData.baseX = f.position.x
    f.userData.phase = i * 2.2
    g.add(f)
    ctx.animate.push({
      t: 0, update(dt) {
        this.t += dt
        f.position.x = f.userData.baseX + Math.sin(this.t * 0.7 + f.userData.phase) * 0.3
        f.position.y = 0.9 + Math.sin(this.t * 1.1 + f.userData.phase) * 0.15
        f.rotation.y = Math.sin(this.t * 0.7 + f.userData.phase) * 0.4
      }
    })
  }
  // 水草
  const weed = stdMat({ color: 0x2e8b57, roughness: 0.8 })
  for (let i = 0; i < 4; i++) {
    g.add(cyl(0.02, 0.03, 0.4, weed, { p: [-0.4 + i * 0.25, 0.85, 0.1], r: [0.1, 0, 0.15], cast: false }))
  }
  return g
})

export const genAntler = propGen('antler', (ctx) => {
  const g = group()
  const mat = stdMat({ color: 0xd8cbb2, roughness: 0.7 })
  for (const side of [-1, 1]) {
    g.add(cyl(0.05, 0.08, 0.7, mat, { p: [side * 0.2, 2.0, 0], r: [0, 0, side * 0.4] }))
    for (let i = 0; i < 3; i++) {
      g.add(cyl(0.02, 0.04, 0.4, mat, { p: [side * (0.32 + i * 0.12), 2.2 + i * 0.18, 0], r: [0, 0, side * 1.1], cast: false }))
    }
  }
  return g
})

export const genLilyPad = propGen('lilyPad', (ctx) => {
  const g = group()
  g.add(cyl(0.7, 0.6, 0.25, stdMat({ color: 0x7a6a5c, roughness: 0.9 }), { p: [0, 0.12, 0], seg: 20 }))
  const water = new THREE.MeshStandardMaterial({ color: 0x3d8ba6, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.85 })
  g.add(cyl(0.62, 0.62, 0.06, water, { p: [0, 0.24, 0], seg: 20, cast: false }))
  const padMat = stdMat({ color: 0x3f9d5c, roughness: 0.7 })
  for (let i = 0; i < 3; i++) {
    const a = i * 2.3
    const pad = mesh(new THREE.CircleGeometry(0.22, 18, 0.4, Math.PI * 1.8), padMat, { p: [Math.cos(a) * 0.3, 0.28, Math.sin(a) * 0.3], r: [-Math.PI / 2, 0, 0], cast: false })
    g.add(pad)
  }
  g.add(sphere(0.05, stdMat({ color: 0xe8f06a, roughness: 0.5 }), { p: [0.15, 0.33, 0.1] }))
  return g
})

export const genFarmDecor = propGen('farmDecor', (ctx) => {
  const g = group()
  const woodMat = stdMat({ color: col(ctx.dna.palette.trim, null, 0, 0, -12), roughness: 0.9 })
  // 小栅栏
  for (let i = 0; i < 4; i++) {
    g.add(box(0.08, 0.6, 0.08, woodMat, { p: [-0.75 + i * 0.5, 0.3, 0] }))
  }
  g.add(box(1.8, 0.07, 0.06, woodMat, { p: [0, 0.42, 0] }))
  g.add(box(1.8, 0.07, 0.06, woodMat, { p: [0, 0.2, 0] }))
  // 干草卷
  const hay = stdMat({ color: 0xc9a44a, roughness: 1 })
  g.add(cyl(0.35, 0.35, 0.5, hay, { p: [0.2, 0.35, 0.7], r: [0, 0, Math.PI / 2], seg: 16 }))
  const m = model(ctx, 'crop_pumpkin', 0.4, false)
  if (m) { m.position.set(-0.9, 0, 0.7); g.add(m) }
  return g
})

export const genSteamPuff = propGen('steamPuff', (ctx) => {
  const g = group()
  const mat = new THREE.MeshStandardMaterial({ color: 0xdfe8ee, transparent: true, opacity: 0.4, roughness: 1, depthWrite: false })
  const puffs = []
  for (let i = 0; i < 4; i++) {
    const p = sphere(0.18 + i * 0.06, mat, { p: [Math.sin(i * 1.8) * 0.12, 0.4 + i * 0.34, 0], cast: false })
    p.userData.y0 = p.position.y
    p.userData.ph = i * 1.4
    puffs.push(p)
    g.add(p)
  }
  g.add(cyl(0.16, 0.2, 0.3, stdMat({ color: 0x9aa3ad, roughness: 0.5, metalness: 0.6 }), { p: [0, 0.15, 0] }))
  ctx.animate.push({
    t: 0, update(dt) {
      this.t += dt
      for (const p of puffs) {
        p.position.y = p.userData.y0 + Math.sin(this.t * 1.2 + p.userData.ph) * 0.08
        p.material.opacity = 0.3 + Math.sin(this.t * 2 + p.userData.ph) * 0.12
      }
    }
  })
  return g
})

export const genWaterTrough = propGen('waterTrough', (ctx) => {
  const g = group()
  const woodMat = stdMat({ color: col(ctx.dna.palette.trim, null, 0, 0, -14), roughness: 0.9 })
  g.add(box(1.4, 0.4, 0.6, woodMat, { p: [0, 0.2, 0] }))
  const water = new THREE.MeshStandardMaterial({ color: 0x4a9ab8, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.8 })
  g.add(box(1.26, 0.06, 0.46, water, { p: [0, 0.36, 0], cast: false }))
  return g
})

export const genWindchime = propGen('windchime', (ctx) => {
  const g = group()
  const metal = stdMat({ color: col(ctx.dna.palette.trim, null, 0, 0, -10), roughness: 0.4, metalness: 0.7 })
  g.add(cyl(0.14, 0.14, 0.06, metal, { p: [0, 2.6, 0], seg: 14 }))
  const tubes = []
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2
    const len = 0.4 - i * 0.05
    const t = cyl(0.02, 0.02, len, metal, { p: [Math.cos(a) * 0.1, 2.6 - len / 2 - 0.04, Math.sin(a) * 0.1], cast: false })
    tubes.push({ m: t, ph: i * 1.3 })
    g.add(t)
  }
  g.add(cyl(0.012, 0.012, 0.7, ctx.materials.trim, { p: [0, 2.95, 0], cast: false }))
  ctx.animate.push({
    t: 0, update(dt) {
      this.t += dt
      for (const { m, ph } of tubes) m.rotation.x = Math.sin(this.t * 1.8 + ph) * 0.1
    }
  })
  return g
})

export const genRibbons = propGen('ribbons', (ctx) => {
  const g = group()
  const mat = stdMat({ color: col(ctx.dna.palette.accent), roughness: 0.85, side: THREE.DoubleSide })
  for (let i = 0; i < 3; i++) {
    const geo = new THREE.PlaneGeometry(0.16, 1.3, 1, 8)
    const pos = geo.attributes.position
    for (let v = 0; v < pos.count; v++) pos.setZ(v, Math.sin(pos.getY(v) * 4 + i) * 0.1)
    geo.computeVertexNormals()
    const ribbon = mesh(geo, mat, { p: [-0.4 + i * 0.4, 2.0, 0], cast: false })
    ribbon.userData.ph = i * 2
    g.add(ribbon)
    ctx.animate.push({
      t: 0, update(dt) {
        this.t += dt
        const p = ribbon.geometry.attributes.position
        for (let v = 0; v < p.count; v++) p.setZ(v, Math.sin(p.getY(v) * 4 + this.t * 2 + ribbon.userData.ph) * 0.12)
        p.needsUpdate = true
      }
    })
  }
  g.add(cyl(0.02, 0.02, 0.7, ctx.materials.trim, { p: [0, 2.75, 0], cast: false }))
  return g
})

export const genCloudPuff = propGen('cloudPuff', (ctx) => {
  const g = group()
  const mat = stdMat({ color: 0xf4f7fb, roughness: 1, transparent: true, opacity: 0.94 })
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2
    g.add(sphere(ctx.rand.f(0.25, 0.45), mat, { p: [Math.cos(a) * 0.45, 0.5 + Math.sin(i * 2.7) * 0.12, Math.sin(a) * 0.3] }))
  }
  ctx.animate.push({ t: ctx.rand.f(0, 5), update(dt) { this.t += dt; g.position.y = Math.sin(this.t * 0.5) * 0.1; g.rotation.y = this.t * 0.05 } })
  return g
})

export const genCoinPile = propGen('coinPile', (ctx) => {
  const { rand } = ctx
  const g = group()
  const gold = stdMat({ color: 0xf0c244, metalness: 0.95, roughness: 0.22 })
  const n = rand.i(14, 24)
  for (let i = 0; i < n; i++) {
    const layer = Math.floor(i / 6)
    const idx = i % 6
    const a = idx / 6 * Math.PI * 2 + layer * 0.5
    g.add(cyl(0.13, 0.13, 0.035, gold, {
      p: [Math.cos(a) * (0.26 - layer * 0.08) + rand.f(-0.02, 0.02), 0.03 + layer * 0.038, Math.sin(a) * (0.26 - layer * 0.08)],
      r: [rand.f(-0.1, 0.1), 0, rand.f(-0.1, 0.1)], seg: 18,
    }))
  }
  g.add(cyl(0.14, 0.14, 0.04, glowMat(0xffd76e, 1.4, 0x6b5210), { p: [0, 0.14, 0], seg: 18 }))
  return g
})

export const genEsportsMonitor = propGen('esportsMonitor', (ctx) => {
  const m = model(ctx, 'computerScreen', 1.4, false)
  const g = group()
  if (m) g.add(m)
  else {
    g.add(box(1.2, 0.75, 0.06, stdMat({ color: 0x14161c, roughness: 0.4 }), { p: [0, 1.2, 0] }))
    g.add(cyl(0.05, 0.12, 0.3, stdMat({ color: 0x1c1f26, roughness: 0.5 }), { p: [0, 0.7, 0] }))
  }
  const screen = canvasTexture(`esports-${ctx.dna.seed}`, 512, 320, (c, w, h) => {
    const grad = c.createLinearGradient(0, 0, w, h)
    grad.addColorStop(0, '#0a1e3d'); grad.addColorStop(1, '#3d0a2e')
    c.fillStyle = grad; c.fillRect(0, 0, w, h)
    c.font = `900 90px ${FONT_STACK}`
    c.textAlign = 'center'; c.textBaseline = 'middle'
    c.fillStyle = '#00e5ff'
    c.shadowColor = '#00e5ff'; c.shadowBlur = 24
    c.fillText('4396', w / 2, h * 0.4)
    c.font = `700 44px ${FONT_STACK}`
    c.fillStyle = '#ff4d8d'
    c.fillText('PRO PLAYER', w / 2, h * 0.72)
  })
  const sm = new THREE.MeshStandardMaterial({ map: screen, emissive: 0xffffff, emissiveMap: screen, emissiveIntensity: 1.8 })
  g.add(plane(1.1, 0.65, sm, { p: [0, 1.2, 0.04], cast: false }))
  const kb = model(ctx, 'computerKeyboard', 0.5, false)
  if (kb) { kb.position.set(0, 0.22, 0.3); g.add(kb) }
  else g.add(box(0.8, 0.04, 0.28, stdMat({ color: 0x22262e, roughness: 0.6 }), { p: [0, 0.22, 0.3] }))
  return g
})

export const genKeyboardProp = propGen('keyboard', (ctx) => {
  const m = model(ctx, 'computerKeyboard', 0.6, false)
  if (m) return group(m)
  const g = group()
  g.add(box(1.1, 0.06, 0.4, stdMat({ color: 0x22262e, roughness: 0.6 }), { p: [0, 0.03, 0] }))
  const keyMat = stdMat({ color: 0x3a4048, roughness: 0.5 })
  for (let r = 0; r < 3; r++) for (let c = 0; c < 10; c++) {
    g.add(box(0.08, 0.03, 0.08, keyMat, { p: [-0.45 + c * 0.1, 0.07, -0.12 + r * 0.12], cast: false }))
  }
  const tag = textPlate(ctx, 'kb', '</> 1024', 0.5, 0.22, { glowColor: '#5ef2b0', emissive: 1.6, size: 72, color: '#5ef2b0' })
  tag.position.set(0, 0.25, 0)
  g.add(tag)
  return g
})

export const genSlotMachine = propGen('slotMachine', (ctx) => {
  const g = group()
  const body = stdMat({ color: col(ctx.dna.palette.main, null, 0, 0, -8), roughness: 0.4, metalness: 0.4 })
  g.add(box(0.9, 1.7, 0.6, body, { p: [0, 0.85, 0] }))
  const screenTex = canvasTexture(`slot-${ctx.dna.seed}`, 512, 256, (c, w, h) => {
    c.fillStyle = '#12060e'; c.fillRect(0, 0, w, h)
    c.font = `900 150px ${FONT_STACK}`
    c.textAlign = 'center'; c.textBaseline = 'middle'
    c.fillStyle = '#ffd23d'
    c.shadowColor = '#ff9d00'; c.shadowBlur = 30
    c.fillText('7 7 7', w / 2, h / 2)
  })
  g.add(plane(0.7, 0.35, new THREE.MeshStandardMaterial({ map: screenTex, emissive: 0xffffff, emissiveMap: screenTex, emissiveIntensity: 2.0 }), { p: [0, 1.3, 0.31], cast: false }))
  // 顶灯
  g.add(sphere(0.12, glowMat(0xffd23d, 2.4), { p: [0, 1.82, 0], cast: false }))
  g.add(cyl(0.04, 0.04, 0.3, stdMat({ color: 0xd9c24a, metalness: 0.8, roughness: 0.3 }), { p: [0.35, 1.0, 0.3], r: [0, 0, 0.4] }))
  // 赏币口
  g.add(box(0.3, 0.06, 0.05, stdMat({ color: 0x1a1a20 }), { p: [0, 0.5, 0.31], cast: false }))
  return g
})

export const genBriefcase = propGen('briefcase', (ctx) => {
  const g = group()
  const mat = stdMat({ color: 0x2c2620, roughness: 0.6 })
  g.add(box(0.7, 0.5, 0.24, mat, { p: [0, 0.25, 0], r: [0, 0.3, 0] }))
  g.add(box(0.72, 0.06, 0.26, stdMat({ color: 0x4a3f33, roughness: 0.5 }), { p: [0, 0.5, 0], r: [0, 0.3, 0] }))
  g.add(torus(0.09, 0.02, stdMat({ color: 0x8a7a60, metalness: 0.7, roughness: 0.4 }), { p: [0, 0.56, 0.1], r: [Math.PI / 2, 0, 0] }))
  const tag = textPlate(ctx, 'brief', '007', 0.3, 0.22, { bg: '#111', color: '#e8f4ff', glowColor: '#7ec8ff', emissive: 1.4, size: 90 })
  tag.position.set(0, 0.3, 0.14)
  tag.rotation.y = 0.3
  g.add(tag)
  return g
})

export const genOfficeCube = propGen('officeCube', (ctx) => {
  const g = group()
  const panelMat = stdMat({ color: col(ctx.dna.palette.ground, null, 0, 0, 14), roughness: 0.85 })
  g.add(box(1.6, 1.2, 0.06, panelMat, { p: [0, 0.6, -0.6] }))
  g.add(box(0.06, 1.2, 1.2, panelMat, { p: [-0.8, 0.6, 0] }))
  const deskM = model(ctx, 'desk', 0.75)
  if (deskM) g.add(deskM)
  else g.add(box(1.2, 0.05, 0.6, stdMat({ color: 0x8a7a60, roughness: 0.7 }), { p: [0, 0.72, 0] }))
  const scr = model(ctx, 'computerScreen', 0.9, false)
  if (scr) { scr.position.set(-0.2, 0.75, -0.1); g.add(scr) }
  const tag = textPlate(ctx, 'cube', '996 福报工位', 1.2, 0.3, { bg: '#f4f0e6', color: '#333', size: 56, emissive: 0.3 })
  tag.position.set(0, 1.35, -0.56)
  g.add(tag)
  return g
})

export const genGradCap = propGen('gradCap', (ctx) => {
  const g = group()
  const cloth = stdMat({ color: 0x16182a, roughness: 0.8 })
  g.add(cyl(0.3, 0.34, 0.24, cloth, { p: [0, 0.12, 0], seg: 8 }))
  g.add(box(0.8, 0.04, 0.8, cloth, { p: [0, 0.26, 0], r: [0, 0.4, 0] }))
  g.add(cyl(0.015, 0.015, 0.3, stdMat({ color: 0xd8b92e, roughness: 0.5 }), { p: [0.38, 0.4, 0.18], r: [0.5, 0.4, 0], cast: false }))
  g.add(sphere(0.03, glowMat(0xffd23d, 1.8), { p: [0.5, 0.5, 0.22], cast: false }))
  return g
})

export const genBbqGrill = propGen('bbqGrill', (ctx) => {
  const g = group()
  const metal = stdMat({ color: 0x33363c, roughness: 0.5, metalness: 0.7 })
  g.add(cyl(0.42, 0.42, 0.16, metal, { p: [0, 0.75, 0], seg: 18 }))
  g.add(cyl(0.05, 0.07, 0.7, metal, { p: [0, 0.35, 0] }))
  g.add(cyl(0.2, 0.24, 0.05, metal, { p: [0, 0.02, 0], seg: 14 }))
  const grill = stdMat({ color: 0x1a1c20, roughness: 0.6, metalness: 0.8 })
  for (let i = 0; i < 6; i++) {
    g.add(box(0.7, 0.02, 0.03, grill, { p: [0, 0.84, -0.3 + i * 0.12], cast: false }))
  }
  const coals = glowMat(0xff5e2e, 2.0, 0x38140a)
  g.add(cyl(0.36, 0.36, 0.05, coals, { p: [0, 0.78, 0], seg: 18, cast: false }))
  ctx.animate.push({ t: ctx.rand.f(0, 5), update(dt) { this.t += dt; coals.emissiveIntensity = 1.6 + Math.sin(this.t * 5) * 0.5 } })
  const smoke = genSteamPuff(ctx).obj
  smoke.position.y = 0.9
  g.add(smoke)
  return g
})

export const genThankYouNote = propGen('thankYouNote', (ctx) => {
  const g = group()
  const note = textPlate(ctx, 'thankyou', '栓Q · Thank You', 1.4, 0.5, { bg: '#1c1426', color: '#b48bff', glowColor: '#b48bff', emissive: 2.0, size: 64 })
  note.position.y = 1.6
  g.add(note)
  g.add(cyl(0.04, 0.06, 1.4, ctx.materials.trim, { p: [0, 0.7, 0] }))
  return g
})

export const genGiantOrnament = propGen('giantOrnament', (ctx) => {
  const g = group()
  const pal = ctx.dna.palette
  const big = sphere(0.9, stdMat({ color: col(pal.accent), roughness: 0.35, metalness: 0.5 }))
  g.add(big)
  g.add(sphere(0.2, stdMat({ color: col(pal.glow), roughness: 0.3, metalness: 0.6 }), { p: [0.5, 0.7, 0.2] }))
  g.add(box(0.24, 0.24, 0.24, stdMat({ color: col(pal.trim), roughness: 0.4, metalness: 0.6 }), { p: [-0.6, 0.4, -0.3], r: [0.6, 0.8, 0.2] }))
  g.add(cyl(0.18, 0.18, 0.5, stdMat({ color: col(pal.main), roughness: 0.5 }), { p: [0.3, -0.6, -0.4], r: [Math.PI / 2, 0, 0.5] }))
  ctx.animate.push({ t: ctx.rand.f(0, 6), update(dt) { this.t += dt; g.rotation.y = this.t * 0.4; g.position.y = 0.95 + Math.sin(this.t * 1.2) * 0.08 } })
  return g
})

export const genFishTank = propGen('fishTank', (ctx) => genFishTankNeon(ctx).obj)

export const genLoungeChairProp = propGen('loungeChair', (ctx) => {
  const m = model(ctx, ctx.rand.pick(['loungeChairRelax', 'loungeChair']), 1.0)
  if (m) return group(m)
  const g = group()
  const mat = stdMat({ color: col(ctx.dna.palette.accent, null, 0, 0, -4), roughness: 0.8 })
  g.add(box(0.7, 0.1, 1.5, mat, { p: [0, 0.35, 0.2], r: [-0.25, 0, 0] }))
  g.add(box(0.7, 0.1, 0.8, mat, { p: [0, 0.62, -0.62], r: [0.6, 0, 0] }))
  for (const x of [-0.3, 0.3]) for (const z of [-0.5, 0.6]) {
    g.add(cyl(0.03, 0.03, 0.3, ctx.materials.trim, { p: [x, 0.15, z] }))
  }
  return g
})

export const genSpiralStairs = propGen('spiralStairs', (ctx) => {
  const g = group()
  const stepMat = stdMat({ color: col(ctx.dna.palette.trim, null, 0, 0, -10), roughness: 0.7 })
  g.add(cyl(0.07, 0.09, 3.0, ctx.materials.trim, { p: [0, 1.5, 0] }))
  const n = 14
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 3
    g.add(box(0.85, 0.05, 0.3, stepMat, { p: [Math.cos(a) * 0.5, 0.2 + i * 0.2, Math.sin(a) * 0.5], r: [0, -a, 0] }))
  }
  ctx.animate.push({ t: 0, update(dt) { g.rotation.y += dt * 0.15 } })
  return g
})

export const genGrabbingHand = propGen('grabbingHand', (ctx) => {
  const g = group()
  const skin = stdMat({ color: 0xe8b48c, roughness: 0.7 })
  g.add(sphere(0.3, skin, { p: [0, 0.5, 0], s: [1, 1.3, 1] }))
  for (let i = 0; i < 4; i++) {
    g.add(cyl(0.07, 0.06, 0.5, skin, { p: [-0.18 + i * 0.12, 0.95, 0], r: [0, 0, (-0.18 + i * 0.12) * 1.2] }))
  }
  g.add(sphere(0.1, skin, { p: [0.28, 0.6, 0] }))
  ctx.animate.push({
    t: ctx.rand.f(0, 5), update(dt) {
      this.t += dt
      const open = (Math.sin(this.t * 2.4) + 1) / 2
      g.children.slice(1, 5).forEach((c, i) => { c.rotation.z = (-0.18 + i * 0.12) * (1 + open * 3) })
    }
  })
  return g
})

export const genQuestionCloud = propGen('questionCloud', (ctx) => {
  const g = group()
  const mat = stdMat({ color: 0xeef2f8, roughness: 1 })
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2
    g.add(sphere(ctx.rand.f(0.3, 0.5), mat, { p: [Math.cos(a) * 0.5, 1.8 + Math.sin(i * 2.4) * 0.15, Math.sin(a) * 0.35] }))
  }
  const q = glyphPlate(ctx, 'qmark', '❓', 0.7, { emissive: 1.8 })
  q.position.set(0, 1.85, 0.55)
  g.add(q)
  ctx.animate.push({ t: ctx.rand.f(0, 5), update(dt) { this.t += dt; g.position.y = Math.sin(this.t * 0.8) * 0.12; g.rotation.y = this.t * 0.1 } })
  return g
})

export const genFreezeClock = propGen('freezeClock', (ctx) => {
  const g = group()
  const face = canvasTexture(`clock-${ctx.dna.seed}`, 256, 256, (c, w, h) => {
    c.fillStyle = '#f5f2e8'
    c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 8, 0, Math.PI * 2); c.fill()
    c.strokeStyle = '#2c2c30'; c.lineWidth = 8
    c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 10, 0, Math.PI * 2); c.stroke()
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2
      c.beginPath()
      c.moveTo(w / 2 + Math.cos(a) * 92, h / 2 + Math.sin(a) * 92)
      c.lineTo(w / 2 + Math.cos(a) * 104, h / 2 + Math.sin(a) * 104)
      c.lineWidth = 5; c.stroke()
    }
    // 时针分针
    c.strokeStyle = '#1c1c20'; c.lineWidth = 9
    c.beginPath(); c.moveTo(w / 2, h / 2); c.lineTo(w / 2 + 38, h / 2 - 52); c.stroke()
    c.lineWidth = 6
    c.beginPath(); c.moveTo(w / 2, h / 2); c.lineTo(w / 2 - 66, h / 2 - 40); c.stroke()
  })
  const fm = new THREE.MeshStandardMaterial({ map: face, roughness: 0.5 })
  g.add(cyl(0.5, 0.5, 0.08, fm, { p: [0, 1.9, 0], r: [Math.PI / 2, 0, 0], seg: 28 }))
  g.add(torus(0.52, 0.04, stdMat({ color: col(ctx.dna.palette.trim), metalness: 0.6, roughness: 0.35 }), { p: [0, 1.9, 0], r: [0, 0, 0] }))
  g.add(cyl(0.05, 0.07, 1.5, ctx.materials.trim, { p: [0, 0.75, 0] }))
  g.add(box(0.5, 0.06, 0.4, ctx.materials.trim, { p: [0, 0.03, 0] }))
  const ice = cyl(0.56, 0.56, 0.03, new THREE.MeshStandardMaterial({
    color: 0x9fd8ff, transparent: true, opacity: 0.4, roughness: 0.1, depthWrite: false,
  }), { p: [0, 1.96, 0], seg: 28, cast: false })
  g.add(ice)
  const tag = textPlate(ctx, 'freeze', '硬控中…', 1.0, 0.28, { bg: '#0c1a26', color: '#7ec8ff', glowColor: '#7ec8ff', emissive: 1.6, size: 64 })
  tag.position.set(0, 1.3, 0)
  g.add(tag)
  return g
})

export const genBanana = propGen('banana', (ctx) => {
  const g = group()
  const mat = stdMat({ color: 0xf5cf3d, roughness: 0.6 })
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.5, 0.1, 0), new THREE.Vector3(-0.2, 0.3, 0),
    new THREE.Vector3(0.2, 0.32, 0), new THREE.Vector3(0.5, 0.12, 0),
  ])
  g.add(mesh(new THREE.TubeGeometry(curve, 16, 0.09, 10), mat, { p: [0, 0.55, 0] }))
  g.add(cyl(0.03, 0.04, 0.08, stdMat({ color: 0x6b5a30 }), { p: [-0.52, 0.08, 0] }))
  const m = mascot(ctx, 'monkey', 0.9)
  m.position.set(0.9, 0, 0)
  g.add(m)
  return g
})

export const genGrandpaChair = propGen('grandpaChair', (ctx) => {
  const m = model(ctx, 'loungeSofa', 1.0)
  const g = group()
  if (m) g.add(m)
  else {
    const mat = stdMat({ color: col(ctx.dna.palette.accent, null, 0, 0, -6), roughness: 0.85 })
    g.add(box(1.0, 0.45, 0.9, mat, { p: [0, 0.25, 0] }))
    g.add(box(1.0, 0.9, 0.2, mat, { p: [0, 0.7, -0.35] }))
  }
  // 摇椅摇动
  ctx.animate.push({ t: ctx.rand.f(0, 6), update(dt) { this.t += dt; g.rotation.x = Math.sin(this.t * 0.9) * 0.04 } })
  const tag = textPlate(ctx, 'grandpa', '老登专属', 0.9, 0.26, { bg: '#2c2418', color: '#ffd9a0', size: 60, emissive: 0.5 })
  tag.position.set(0, 1.35, -0.2)
  g.add(tag)
  return g
})

export const genDarkCloud = propGen('darkCloudTop', (ctx) => {
  const g = group()
  const mat = stdMat({ color: 0x2c2f3a, roughness: 1 })
  for (let i = 0; i < 5; i++) {
    g.add(sphere(ctx.rand.f(0.3, 0.5), mat, { p: [Math.cos(i * 1.3) * 0.5, 2.2 + Math.sin(i * 2.1) * 0.15, Math.sin(i * 1.3) * 0.35] }))
  }
  // 云下雨丝
  const rainMat = new THREE.MeshStandardMaterial({ color: 0x8ab8d8, transparent: true, opacity: 0.5, roughness: 1, depthWrite: false })
  for (let i = 0; i < 6; i++) {
    g.add(cyl(0.008, 0.008, 0.5, rainMat, { p: [-0.5 + i * 0.2, 1.6, 0], cast: false }))
  }
  ctx.animate.push({ t: ctx.rand.f(0, 5), update(dt) { this.t += dt; g.position.y = Math.sin(this.t) * 0.08 } })
  return g
})

export const genGiantClam = propGen('giantClam', (ctx) => {
  const g = group()
  const shellMat = stdMat({ color: col(ctx.dna.palette.accent, null, 0, 0, 8), roughness: 0.35, metalness: 0.3 })
  const lower = sphere(0.55, shellMat, { p: [0, 0.15, 0], s: [1.15, 0.45, 1] })
  g.add(lower)
  const upper = sphere(0.5, shellMat, { p: [0, 0.2, -0.25], s: [1.1, 0.5, 1], r: [-0.9, 0, 0] })
  g.add(upper)
  const pearl = sphere(0.18, stdMat({ color: 0xf6f0ff, roughness: 0.08, metalness: 0.4 }), { p: [0, 0.32, 0.05] })
  g.add(pearl)
  return g
})

export const genBambooGrove = propGen('bambooGrove', (ctx) => {
  const g = group()
  const n = ctx.rand.i(5, 8)
  const m0 = model(ctx, 'crops_bambooStageB', 2.6)
  for (let i = 0; i < n; i++) {
    const m = m0 ? m0.clone(true) : genBambooCluster(ctx).obj
    m.position.set(ctx.rand.f(-1.2, 1.2), 0, ctx.rand.f(-0.5, 0.5))
    m.rotation.y = ctx.rand.f(0, 3)
    m.scale.multiplyScalar(ctx.rand.f(0.8, 1.25))
    g.add(m)
  }
  return g
})

export const genBambooShoot = propGen('bambooShoot', (ctx) => {
  const g = group()
  const shootMat = stdMat({ color: 0x9ec96a, roughness: 0.7 })
  for (let i = 0; i < 3; i++) {
    g.add(cone(0.12, 0.5 - i * 0.1, shootMat, { p: [i * 0.22 - 0.22, 0.25, ctx.rand.f(-0.1, 0.1)], seg: 8 }))
  }
  const m = model(ctx, 'crops_bambooStageA', 1.8)
  if (m) { m.position.x = 0.5; g.add(m) }
  return g
})

export const genDriedFish = propGen('driedFish', (ctx) => {
  const g = group()
  const fishMat = stdMat({ color: 0xc9a86a, roughness: 0.8 })
  for (let i = 0; i < 3; i++) {
    const f = group(
      sphere(0.16, fishMat, { s: [1.8, 0.7, 0.5] }),
      cone(0.12, 0.2, fishMat, { p: [-0.32, 0, 0], r: [0, 0, Math.PI / 2], s: [1, 1, 0.4], seg: 8 }),
    )
    f.position.set(-0.3 + i * 0.3, 1.6 + Math.sin(i) * 0.08, 0)
    f.rotation.y = Math.PI / 2
    g.add(f)
    g.add(cyl(0.01, 0.01, 0.5, ctx.materials.trim, { p: [-0.3 + i * 0.3, 1.85, 0], cast: false }))
  }
  g.add(cyl(0.03, 0.03, 1.2, ctx.materials.trim, { p: [-0.5, 1.6, 0], r: [0, 0, Math.PI / 2] }))
  g.add(cyl(0.03, 0.03, 1.2, ctx.materials.trim, { p: [0.5, 1.6, 0], r: [0, 0, Math.PI / 2] }))
  for (const x of [-0.5, 0.5]) g.add(cyl(0.04, 0.05, 1.5, ctx.materials.trim, { p: [x, 0.75, 0] }))
  return g
})

export const genKoiFlag = propGen('koiFlag', (ctx) => {
  const g = group()
  g.add(cyl(0.04, 0.06, 3.4, ctx.materials.trim, { p: [0, 1.7, 0] }))
  const flagMat = stdMat({ color: col(ctx.dna.palette.accent), roughness: 0.8, side: THREE.DoubleSide })
  for (let i = 0; i < 3; i++) {
    const geo = new THREE.PlaneGeometry(0.6, 1.0, 6, 6)
    const pos = geo.attributes.position
    for (let v = 0; v < pos.count; v++) pos.setZ(v, Math.sin(pos.getX(v) * 6) * 0.08)
    geo.computeVertexNormals()
    const flag = mesh(geo, flagMat, { p: [0.3, 2.4 - i * 1.1, 0], cast: false })
    flag.userData.ph = i * 2
    g.add(flag)
    ctx.animate.push({
      t: 0, update(dt) {
        this.t += dt
        const p = flag.geometry.attributes.position
        for (let v = 0; v < p.count; v++) p.setZ(v, Math.sin(p.getX(v) * 6 + this.t * 3 + flag.userData.ph) * 0.1)
        p.needsUpdate = true
      }
    })
  }
  return g
})

export const genLuckyDice = propGen('luckyDice', (ctx) => {
  const g = group()
  const dieMat = stdMat({ color: 0xf6f2ea, roughness: 0.35 })
  for (let i = 0; i < 2; i++) {
    const d = box(0.4, 0.4, 0.4, dieMat, { p: [i * 0.5 - 0.2, 0.22 + i * 0.1, i * 0.15], r: [i * 0.7, i * 1.2, 0.3] })
    g.add(d)
    const pipMat = stdMat({ color: 0xc0392b, roughness: 0.4 })
    for (let p = 0; p < 5; p++) {
      g.add(sphere(0.035, pipMat, { p: [d.position.x + (p % 2 ? 0.1 : -0.1), d.position.y + 0.12, d.position.z + (p < 2 ? 0.1 : p < 4 ? -0.1 : 0)], cast: false }))
    }
  }
  ctx.animate.push({ t: ctx.rand.f(0, 5), update(dt) { this.t += dt; g.children[1].rotation.x = this.t * 0.8 } })
  return g
})

export const genBrokenDice = propGen('brokenDice', (ctx) => {
  const g = genLuckyDice(ctx).obj
  g.children[0].rotation.z = 0.9
  g.children[0].position.y = 0.15
  return g
})

export const genCrystalBall = propGen('crystalBall', (ctx) => {
  const g = group()
  const base = stdMat({ color: col(ctx.dna.palette.trim, null, 0, 0, -14), roughness: 0.4, metalness: 0.5 })
  g.add(cyl(0.3, 0.38, 0.16, base, { p: [0, 0.08, 0], seg: 18 }))
  const ballMat = new THREE.MeshStandardMaterial({
    color: 0xb48bff, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.75,
    emissive: 0x7a3aff, emissiveIntensity: 0.8,
  })
  const ball = sphere(0.32, ballMat, { p: [0, 0.48, 0] })
  g.add(ball)
  ctx.animate.push({
    t: ctx.rand.f(0, 5), update(dt) { this.t += dt; ballMat.emissiveIntensity = 0.6 + Math.sin(this.t * 2) * 0.35 }
  })
  return g
})

export const genTarotStand = propGen('tarotStand', (ctx) => {
  const g = group()
  const m = model(ctx, 'tableRound', 0.9)
  if (m) g.add(m)
  else g.add(cyl(0.5, 0.5, 0.05, ctx.materials.trim, { p: [0, 0.74, 0], seg: 20 }))
  // 塔罗牌扇形
  const cardMat = stdMat({ color: 0xf2ead8, roughness: 0.7 })
  for (let i = 0; i < 5; i++) {
    g.add(box(0.22, 0.01, 0.36, cardMat, { p: [0, 0.78, 0], r: [-Math.PI / 2 + 1.4, i * 0.35 - 0.7, 0], cast: false }))
  }
  const ball = genCrystalBall(ctx).obj
  ball.position.set(0.4, 0, 0.1)
  g.add(ball)
  return g
})

export const genAlchemyFurnace = propGen('alchemyFurnace', (ctx) => {
  const g = group()
  const metal = stdMat({ color: col(ctx.dna.palette.trim, null, 0, 0, -18), roughness: 0.45, metalness: 0.7 })
  g.add(cyl(0.36, 0.5, 1.0, metal, { p: [0, 0.5, 0], seg: 14 }))
  g.add(cyl(0.12, 0.12, 0.6, metal, { p: [0, 1.3, 0] }))
  const pot = stdMat({ color: 0x3a5f3a, roughness: 0.4, metalness: 0.5 })
  g.add(sphere(0.3, pot, { p: [0, 1.7, 0], s: [1, 0.8, 1] }))
  const brew = glowMat(0x6eff8a, 2.0, 0x0f2a14)
  g.add(cyl(0.24, 0.24, 0.04, brew, { p: [0, 1.84, 0], seg: 18, cast: false }))
  // 气泡
  const bubbles = []
  for (let i = 0; i < 3; i++) {
    const b = sphere(0.04, brew, { p: [Math.sin(i * 2.1) * 0.1, 1.9, Math.cos(i * 2.1) * 0.1], cast: false })
    b.userData.ph = i * 2
    bubbles.push(b)
    g.add(b)
  }
  ctx.animate.push({
    t: 0, update(dt) {
      this.t += dt
      for (const b of bubbles) b.position.y = 1.86 + ((this.t * 0.5 + b.userData.ph) % 1) * 0.3
    }
  })
  return g
})

export const genGourd = propGen('gourd', (ctx) => {
  const g = group()
  const mat = stdMat({ color: 0xc98f3d, roughness: 0.5 })
  g.add(sphere(0.3, mat, { p: [0, 0.85, 0] }))
  g.add(sphere(0.2, mat, { p: [0, 0.48, 0] }))
  g.add(cyl(0.05, 0.05, 0.16, mat, { p: [0, 1.12, 0] }))
  g.add(cyl(0.1, 0.12, 0.06, stdMat({ color: col(ctx.dna.palette.trim) }), { p: [0, 1.22, 0] }))
  g.add(cyl(0.16, 0.2, 0.08, ctx.materials.trim, { p: [0, 0.04, 0] }))
  return g
})

export const genGourdString = propGen('gourdString', (ctx) => {
  const g = group()
  g.add(cyl(0.03, 0.03, 2.2, ctx.materials.trim, { p: [0, 2.4, 0], r: [0, 0, 0.5] }))
  for (let i = 0; i < 3; i++) {
    const one = genGourd(ctx).obj
    one.position.set(0.4 + i * 0.3, 1.9 - i * 0.4, 0)
    one.scale.setScalar(0.6)
    g.add(one)
  }
  return g
})

export const genSwordRack = propGen('swordRack', (ctx) => {
  const g = group()
  const wood = stdMat({ color: col(ctx.dna.palette.trim, null, 0, 0, -14), roughness: 0.85 })
  g.add(box(1.2, 0.08, 0.4, wood, { p: [0, 1.3, 0] }))
  g.add(box(1.2, 0.08, 0.4, wood, { p: [0, 0.5, 0] }))
  for (const x of [-0.55, 0.55]) g.add(box(0.1, 1.4, 0.1, wood, { p: [x, 0.7, 0] }))
  const bladeMat = stdMat({ color: 0xd8dde4, metalness: 0.9, roughness: 0.2 })
  const hiltMat = stdMat({ color: col(ctx.dna.palette.accent), roughness: 0.6 })
  for (let i = 0; i < 3; i++) {
    const x = -0.3 + i * 0.3
    g.add(box(0.07, 1.0, 0.03, bladeMat, { p: [x, 1.0, 0], r: [0, 0, 0.08] }))
    g.add(box(0.2, 0.05, 0.05, hiltMat, { p: [x + 0.04, 1.52, 0] }))
    g.add(cyl(0.03, 0.03, 0.22, hiltMat, { p: [x + 0.06, 1.66, 0] }))
  }
  return g
})

export const genBoatPaddle = propGen('boatPaddle', (ctx) => {
  const m = model(ctx, 'canoe_paddle', 2.0, false)
  if (m) return group(m)
  const g = group()
  g.add(cyl(0.03, 0.03, 1.8, stdMat({ color: 0x8a6f4d, roughness: 0.85 }), { p: [0, 0.9, 0], r: [0, 0, 0.3] }))
  g.add(box(0.22, 0.4, 0.03, stdMat({ color: 0x9a7f5d, roughness: 0.8 }), { p: [0.55, 1.7, 0], r: [0, 0, 0.3] }))
  return g
})

export const genGiantBowl = propGen('giantBowl', (ctx) => {
  const g = group()
  const bowlMat = stdMat({ color: col(ctx.dna.palette.main, null, 0, 0, 10), roughness: 0.35 })
  const bowl = mesh(new THREE.SphereGeometry(0.8, 24, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), bowlMat, { p: [0, 0.8, 0] })
  g.add(bowl)
  const noodleMat = stdMat({ color: 0xf0dfae, roughness: 0.7 })
  g.add(cyl(0.7, 0.7, 0.08, noodleMat, { p: [0, 0.8, 0], seg: 22, cast: false }))
  for (let i = 0; i < 3; i++) {
    g.add(torus(0.05, 0.014, noodleMat, { p: [Math.cos(i * 2.1) * 0.3, 0.88, Math.sin(i * 2.1) * 0.3], r: [Math.PI / 2, 0, 0], cast: false }))
  }
  g.add(sphere(0.08, stdMat({ color: 0xc98f3d }), { p: [0.15, 0.9, 0.1], s: [1, 0.7, 1], cast: false }))
  return g
})

export const genBadgeCoffee = propGen('badgeCoffee', (ctx) => {
  const g = group()
  const cupMat = stdMat({ color: 0xf4f0e8, roughness: 0.4 })
  g.add(cyl(0.24, 0.18, 0.36, cupMat, { p: [0, 0.18, 0], seg: 18 }))
  g.add(torus(0.08, 0.025, cupMat, { p: [0.26, 0.18, 0], r: [0, Math.PI / 2, 0] }))
  g.add(cyl(0.2, 0.2, 0.03, stdMat({ color: 0x5a3a22, roughness: 0.6 }), { p: [0, 0.36, 0], seg: 18, cast: false }))
  const badge = glyphPlate(ctx, 'cof', '☕', 0.7, { emissive: 1.4 })
  badge.position.set(0, 1.1, 0)
  g.add(badge)
  ctx.animate.push({ t: ctx.rand.f(0, 5), update(dt) { this.t += dt; badge.rotation.y = this.t * 0.8 } })
  return g
})

export const genAlarmClocks = propGen('alarmClocks', (ctx) => {
  const g = group()
  const face = canvasTexture(`alarm-${ctx.dna.seed}`, 256, 256, (c, w, h) => {
    c.fillStyle = '#f8f4ea'
    c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 10, 0, Math.PI * 2); c.fill()
    c.strokeStyle = '#c0392b'; c.lineWidth = 10
    c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 12, 0, Math.PI * 2); c.stroke()
    c.strokeStyle = '#222'; c.lineWidth = 8
    for (const ang of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      c.beginPath()
      c.moveTo(w / 2 + Math.cos(ang) * 86, h / 2 + Math.sin(ang) * 86)
      c.lineTo(w / 2 + Math.cos(ang) * 104, h / 2 + Math.sin(ang) * 104)
      c.stroke()
    }
  })
  const fm = new THREE.MeshStandardMaterial({ map: face, roughness: 0.5 })
  for (let i = 0; i < 3; i++) {
    const clock = group(
      cyl(0.22, 0.22, 0.06, fm, { r: [Math.PI / 2, 0, 0], seg: 22 }),
      sphere(0.05, stdMat({ color: 0xc0392b }), { p: [0.22, 0.14, 0] }),
      sphere(0.05, stdMat({ color: 0xc0392b }), { p: [-0.22, 0.14, 0] }),
      box(0.1, 0.06, 0.1, stdMat({ color: 0xc0392b }), { p: [0, -0.22, 0] }),
    )
    clock.position.set(-0.4 + i * 0.4, 0.24 + (i % 2) * 0.06, i * 0.2 - 0.2)
    clock.rotation.y = ctx.rand.f(-0.5, 0.5)
    clock.userData.ph = i * 2.1
    g.add(clock)
    ctx.animate.push({
      t: 0, update(dt) {
        this.t += dt
        const ring = (Math.sin(this.t * 6 + clock.userData.ph) + 1) / 2
        clock.rotation.z = ring * 0.35
      }
    })
  }
  return g
})

export const genRottenTomato = propGen('rottenTomato', (ctx) => {
  const g = group()
  const mat = stdMat({ color: 0x8f3a28, roughness: 0.85 })
  g.add(sphere(0.24, mat, { p: [0, 0.24, 0], s: [1, 0.85, 1] }))
  g.add(sphere(0.1, stdMat({ color: 0x5a7a3a, roughness: 0.9 }), { p: [0, 0.44, 0], s: [1.4, 0.5, 1] }))
  const splat = mesh(new THREE.CircleGeometry(0.3, 16), new THREE.MeshStandardMaterial({ color: 0x6b2a1a, roughness: 1 }), { p: [0, 0.01, 0], r: [-Math.PI / 2, 0, 0], cast: false })
  g.add(splat)
  return g
})

export const genScrollPile = propGen('scrollPile', (ctx) => {
  const g = group()
  const mat = stdMat({ color: 0xe8dcc0, roughness: 0.85 })
  for (let i = 0; i < 4; i++) {
    g.add(cyl(0.07, 0.07, 0.9, mat, { p: [ctx.rand.f(-0.15, 0.15), 0.07 + Math.floor(i / 3) * 0.14, ctx.rand.f(-0.1, 0.1)], r: [Math.PI / 2, 0, ctx.rand.f(-0.2, 0.2)] }))
  }
  const stand = model(ctx, 'sideTableDrawers', 0.7)
  if (stand) { stand.position.y = 0; g.add(stand); g.children.forEach((c, i) => { if (i > 0) c.position.y += 0.62 }) }
  return g
})

export const genBigEars = propGen('bigEars', (ctx) => {
  const g = group()
  const earMat = stdMat({ color: col(ctx.dna.palette.accent, null, 0, 0, 10), roughness: 0.8 })
  for (const side of [-1, 1]) {
    g.add(sphere(0.32, earMat, { p: [side * 0.45, 1.6, 0], s: [0.5, 1.4, 0.8] }))
  }
  ctx.animate.push({
    t: ctx.rand.f(0, 5), update(dt) {
      this.t += dt
      g.children[0].rotation.z = Math.sin(this.t * 2) * 0.15
      g.children[1].rotation.z = -Math.sin(this.t * 2 + 0.5) * 0.15
    }
  })
  return g
})

export const genHoneycomb = propGen('honeycomb', (ctx) => {
  const g = group()
  const honey = glowMat(0xffb52e, 1.2, 0x8a5a10)
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
    const h = cyl(0.16, 0.16, 0.5, honey, { p: [(c - 1) * 0.3 + (r % 2) * 0.15, 0.25 + r * 0.5, 0], seg: 6 })
    g.add(h)
  }
  return g
})

export const genWoodenFish = propGen('woodenFish', (ctx) => {
  const g = group()
  const wood = stdMat({ color: 0xb08050, roughness: 0.6 })
  const body = sphere(0.35, wood, { p: [0, 1.1, 0], s: [1.6, 0.9, 0.8] })
  g.add(body)
  g.add(sphere(0.05, stdMat({ color: 0x2c2018 }), { p: [0.3, 1.2, 0.24], cast: false }))
  g.add(sphere(0.05, stdMat({ color: 0x2c2018 }), { p: [0.3, 1.2, -0.24], cast: false }))
  g.add(cyl(0.05, 0.07, 0.5, wood, { p: [-0.4, 1.2, 0], r: [0, 0, 0.6] }))
  const stick = cyl(0.03, 0.03, 0.9, stdMat({ color: 0x8a6f4d }), { p: [0, 0.45, 0] })
  g.add(stick)
  ctx.animate.push({
    t: ctx.rand.f(0, 5), update(dt) {
      this.t += dt
      const knock = Math.max(0, Math.sin(this.t * 4))
      body.rotation.z = knock * 0.12
    }
  })
  return g
})

export const genGiantCoffee = propGen('giantCoffee', (ctx) => {
  const g = group()
  const cupMat = stdMat({ color: col(ctx.dna.palette.main, null, 0, 0, 24), roughness: 0.35 })
  g.add(cyl(0.55, 0.42, 0.9, cupMat, { p: [0, 0.45, 0], seg: 22 }))
  g.add(cyl(0.5, 0.5, 0.05, stdMat({ color: 0x5a3a22, roughness: 0.5 }), { p: [0, 0.92, 0], seg: 22, cast: false }))
  g.add(torus(0.18, 0.05, cupMat, { p: [0.58, 0.5, 0], r: [0, Math.PI / 2, 0] }))
  // 蒸汽
  const steam = genSteamPuff(ctx).obj
  steam.position.set(0, 1.0, 0)
  steam.scale.setScalar(1.3)
  g.add(steam)
  return g
})

export const genTreasureChest = propGen('treasureChest', (ctx) => {
  const g = group()
  const wood = stdMat({ color: 0x6b4a2c, roughness: 0.8 })
  g.add(box(0.9, 0.5, 0.6, wood, { p: [0, 0.25, 0] }))
  const lid = group(
    cyl(0.3, 0.3, 0.6, wood, { r: [Math.PI / 2, 0, 0], seg: 14 }),
  )
  lid.position.set(0, 0.5, -0.3)
  lid.rotation.x = -2.2
  g.add(lid)
  const gold = stdMat({ color: 0xf0c244, metalness: 0.95, roughness: 0.2 })
  for (let i = 0; i < 8; i++) {
    g.add(cyl(0.09, 0.09, 0.025, gold, { p: [ctx.rand.f(-0.3, 0.3), 0.52, ctx.rand.f(-0.2, 0.2)], r: [ctx.rand.f(-0.3, 0.3), 0, ctx.rand.f(-0.3, 0.3)], seg: 14, cast: false }))
  }
  g.add(box(0.94, 0.06, 0.64, stdMat({ color: 0xd9b92e, metalness: 0.8, roughness: 0.3 }), { p: [0, 0.52, 0] }))
  const glow = glowMat(0xffd76e, 1.6, 0x3a2a08)
  g.add(box(0.86, 0.04, 0.56, glow, { p: [0, 0.56, 0], cast: false }))
  return g
})

export const genMagnifierTear = propGen('magnifierTear', (ctx) => {
  const g = group()
  const metal = stdMat({ color: 0x9a9aa4, metalness: 0.8, roughness: 0.3 })
  g.add(torus(0.3, 0.035, metal, { p: [0, 1.2, 0] }))
  const lens = new THREE.MeshStandardMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.4, roughness: 0.05, metalness: 0.3 })
  g.add(cyl(0.27, 0.27, 0.04, lens, { p: [0, 1.2, 0], r: [Math.PI / 2, 0, 0], seg: 22, cast: false }))
  g.add(cyl(0.03, 0.03, 0.7, stdMat({ color: 0x8a6f4d, roughness: 0.6 }), { p: [0, 0.65, 0.22], r: [0.35, 0, 0] }))
  const tear = sphere(0.06, glowMat(0x8fd8ff, 2.0), { p: [0, 0.95, 0.1], s: [1, 1.4, 1], cast: false })
  g.add(tear)
  ctx.animate.push({ t: 0, update(dt) { this.t += dt; tear.position.y = 0.95 + Math.abs(Math.sin(this.t * 2)) * 0.15 } })
  return g
})

export const genCloak = propGen('cloak', (ctx) => {
  const g = group()
  const clothMat = stdMat({ color: col(ctx.dna.palette.main, null, 0, 0, -14), roughness: 0.95, side: THREE.DoubleSide })
  const geo = new THREE.PlaneGeometry(1.0, 1.6, 8, 12)
  const pos = geo.attributes.position
  for (let v = 0; v < pos.count; v++) {
    const x = pos.getX(v), y = pos.getY(v)
    pos.setZ(v, Math.sin(x * 3) * 0.1 + Math.sin(y * 2) * 0.08)
  }
  geo.computeVertexNormals()
  const cloak = mesh(geo, clothMat, { p: [0, 1.2, -0.4] })
  g.add(cloak)
  // 衣架
  const stand = model(ctx, 'coatRackStanding', 1.8)
  if (stand) g.add(stand)
  else {
    g.add(cyl(0.04, 0.06, 1.8, ctx.materials.trim, { p: [0, 0.9, 0] }))
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2
      g.add(cyl(0.025, 0.025, 0.5, ctx.materials.trim, { p: [Math.cos(a) * 0.2, 0.12, Math.sin(a) * 0.2], r: [Math.PI / 2 - 0.4, -a, 0] }))
    }
  }
  return g
})

export const genMicrophone = propGen('microphone', (ctx) => {
  const g = group()
  const m = model(ctx, 'speaker', 1.1)
  if (m) g.add(m)
  const metal = stdMat({ color: 0xb8bcc4, metalness: 0.85, roughness: 0.3 })
  g.add(cyl(0.04, 0.04, 1.2, metal, { p: [0, 0.6, 0] }))
  g.add(cyl(0.14, 0.16, 0.08, metal, { p: [0, 0.04, 0] }))
  const head = mesh(new THREE.SphereGeometry(0.16, 16, 12), stdMat({ color: 0x8a8f98, metalness: 0.8, roughness: 0.4 }), { p: [0, 1.3, 0] })
  g.add(head)
  for (let i = 0; i < 3; i++) {
    g.add(torus(0.16, 0.01, metal, { p: [0, 1.3, 0], r: [Math.PI / 2 + i * 0.5, i * 0.8, 0], cast: false }))
  }
  return g
})

export const genCurtainNook = propGen('curtainNook', (ctx) => {
  const g = group()
  const clothMat = stdMat({ color: col(ctx.dna.palette.accent, null, 0, 0, -8), roughness: 0.95, side: THREE.DoubleSide })
  for (const side of [-1, 1]) {
    const geo = new THREE.PlaneGeometry(0.5, 2.2, 4, 10)
    const pos = geo.attributes.position
    for (let v = 0; v < pos.count; v++) pos.setZ(v, Math.cos(pos.getX(v) * 8) * 0.08)
    geo.computeVertexNormals()
    g.add(mesh(geo, clothMat, { p: [side * 0.55, 1.1, 0] }))
  }
  g.add(cyl(0.03, 0.03, 1.4, ctx.materials.trim, { p: [0, 2.2, 0], r: [0, 0, Math.PI / 2] }))
  const seat = model(ctx, 'loungeChair', 0.9)
  if (seat) g.add(seat)
  else g.add(box(0.8, 0.4, 0.8, clothMat, { p: [0, 0.2, 0] }))
  return g
})

export const genMegaphone = propGen('megaphone', (ctx) => {
  const g = group()
  const mat = stdMat({ color: col(ctx.dna.palette.accent), roughness: 0.5 })
  g.add(cyl(0.12, 0.3, 0.6, mat, { p: [0, 1.4, 0], r: [0, 0, Math.PI / 2], seg: 18 }))
  g.add(cyl(0.32, 0.34, 0.1, mat, { p: [0.32, 1.4, 0], r: [0, 0, Math.PI / 2], seg: 18 }))
  g.add(cyl(0.05, 0.05, 0.4, ctx.materials.trim, { p: [-0.2, 1.4, 0], r: [0, 0, Math.PI / 2] }))
  g.add(cyl(0.04, 0.06, 1.2, ctx.materials.trim, { p: [0, 0.6, 0] }))
  const ring = torus(0.36, 0.02, glowMat(col(ctx.dna.palette.glow), 2.0), { p: [0.4, 1.4, 0], r: [0, Math.PI / 2, 0], cast: false })
  g.add(ring)
  ctx.animate.push({
    t: ctx.rand.f(0, 5), update(dt) {
      this.t += dt
      ring.scale.setScalar(1 + ((this.t % 1)) * 1.5)
      ring.material.opacity = 1 - (this.t % 1)
    }
  })
  return g
})

export const genCheersCups = propGen('cheersCups', (ctx) => {
  const g = group()
  const glass = glassMat(0xf5d9a0, 0.5)
  for (const side of [-1, 1]) {
    const cup = group(
      cyl(0.09, 0.07, 0.3, glass, { seg: 14 }),
      cyl(0.02, 0.02, 0.18, glass, { p: [0, -0.24, 0], cast: false }),
      cyl(0.08, 0.08, 0.02, glass, { p: [0, -0.32, 0], seg: 14, cast: false }),
    )
    cup.position.set(side * 0.5, 1.0, 0)
    cup.rotation.z = side * 0.35
    g.add(cup)
  }
  const table = model(ctx, 'tableRound', 0.85)
  if (table) g.add(table)
  else g.add(cyl(0.5, 0.5, 0.05, ctx.materials.trim, { p: [0, 0.72, 0], seg: 20 }))
  ctx.animate.push({
    t: 0, update(dt) {
      this.t += dt
      const phase = (this.t % 4) / 4
      const tilt = phase < 0.2 ? phase * 5 : phase < 0.5 ? 1 : phase < 0.7 ? (0.7 - phase) * 5 : 0
      g.children[0].rotation.z = -0.35 * tilt
      g.children[1].rotation.z = 0.35 * tilt
    }
  })
  return g
})

export const genWineBottles = propGen('wineBottles', (ctx) => {
  const g = group()
  const colors = [0x2c5a2c, 0x5a2c2c, 0x2c3a5a]
  for (let i = 0; i < 3; i++) {
    const mat = stdMat({ color: colors[i % 3], roughness: 0.2, metalness: 0.1 })
    const b = group(
      cyl(0.09, 0.09, 0.4, mat, { p: [0, 0.2, 0], seg: 12 }),
      cyl(0.035, 0.07, 0.25, mat, { p: [0, 0.5, 0], seg: 12 }),
      cyl(0.038, 0.038, 0.06, stdMat({ color: 0xd9b92e, roughness: 0.4 }), { p: [0, 0.62, 0], seg: 12 }),
    )
    b.position.set(-0.35 + i * 0.35, 0, ctx.rand.f(-0.1, 0.1))
    b.rotation.z = i === 1 ? 0 : ctx.rand.f(-0.1, 0.1)
    g.add(b)
  }
  const rack = box(1.1, 0.06, 0.4, ctx.materials.trim, { p: [0, 0.03, 0] })
  g.add(rack)
  return g
})

export const genBookMountain = propGen('bookMountain', (ctx) => {
  const g = group()
  const colors = ['#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#d35400']
  let layer = 0
  let i = 0
  const layout = [[4, 0.7], [3, 0.85], [2, 1.0], [1, 1.15]]
  for (const [n, y] of layout) {
    for (let k = 0; k < n; k++) {
      const mat = stdMat({ color: new THREE.Color(colors[i % colors.length]), roughness: 0.7 })
      g.add(box(0.34, 0.09, 0.26, mat, {
        p: [(k - (n - 1) / 2) * 0.38, y, 0], r: [0, ctx.rand.f(-0.2, 0.2), 0],
      }))
      i++
    }
    layer++
  }
  return g
})

export const genVictoryFlag = propGen('victoryFlag', (ctx) => {
  const g = group()
  g.add(cyl(0.035, 0.05, 2.4, ctx.materials.trim, { p: [0, 1.2, 0] }))
  const flagMat = stdMat({ color: col(ctx.dna.palette.accent), roughness: 0.8, side: THREE.DoubleSide })
  const geo = new THREE.PlaneGeometry(1.1, 0.7, 8, 4)
  const flag = mesh(geo, flagMat, { p: [0.58, 2.0, 0], cast: false })
  g.add(flag)
  ctx.animate.push({
    t: 0, update(dt) {
      this.t += dt
      const p = flag.geometry.attributes.position
      for (let v = 0; v < p.count; v++) p.setZ(v, Math.sin(p.getX(v) * 5 + this.t * 3) * 0.1)
      p.needsUpdate = true
    }
  })
  return g
})

export const genClover = propGen('clover', (ctx) => {
  const g = group()
  const mat = stdMat({ color: 0x3fae5c, roughness: 0.7 })
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * Math.PI * 2
    g.add(sphere(0.14, mat, { p: [Math.cos(a) * 0.14, 0.35, Math.sin(a) * 0.14], s: [1, 0.35, 1] }))
  }
  g.add(cyl(0.015, 0.015, 0.3, mat, { p: [0, 0.18, 0] }))
  const sparkle = glyphPlate(ctx, 'lucky', '✨', 0.4, { emissive: 2.0 })
  sparkle.position.set(0, 0.7, 0)
  g.add(sparkle)
  return g
})

export const genNotebook = propGen('notebook', (ctx) => {
  const g = group()
  const cover = stdMat({ color: col(ctx.dna.palette.main, null, 0, 0, -10), roughness: 0.6 })
  g.add(box(0.5, 0.06, 0.7, cover, { p: [0, 0.03, 0], r: [0, 0.3, 0] }))
  const paper = stdMat({ color: 0xf6f2e6, roughness: 0.9 })
  g.add(box(0.46, 0.04, 0.66, paper, { p: [0, 0.08, 0], r: [0, 0.32, 0], cast: false }))
  // 笔
  g.add(cyl(0.015, 0.015, 0.3, stdMat({ color: 0x2c3a5a, roughness: 0.4 }), { p: [0.3, 0.1, 0.1], r: [1.2, 0.4, 0] }))
  return g
})

// ================= 扩充组件库（第二批 · 外部装饰） =================

// 彩旗串：立面横拉的三角旗（mounted）
export const genBunting = reg('decor', 'bunting', (ctx) => {
  const { fp } = ctx
  const pal = ctx.dna.palette
  const g = group()
  const W = fp.front.L * ctx.rand.f(0.75, 0.95)
  const tex = canvasTexture(`bunt-${ctx.dna.seed}`, 1024, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h)
    c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 5
    c.beginPath(); c.moveTo(0, 8); c.quadraticCurveTo(w / 2, 30, w, 8); c.stroke()
    const n = Math.floor(w / 64)
    for (let i = 0; i < n; i++) {
      const x = i * 64 + 32
      const dip = 14 + Math.sin((x / w) * Math.PI) * 12
      c.fillStyle = [`hsl(${pal.accent[0]},70%,60%)`, `hsl(${pal.main[0]},75%,58%)`, `hsl(${pal.glow[0]},85%,65%)`][i % 3]
      c.beginPath(); c.moveTo(x - 24, dip); c.lineTo(x + 24, dip); c.lineTo(x, dip + 46); c.closePath(); c.fill()
    }
  })
  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, roughness: 0.9 })
  const geo = new THREE.PlaneGeometry(W, W * 0.125, 16, 1)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    pos.setZ(i, -Math.sin((x / W + 0.5) * Math.PI) * 0.22)
  }
  geo.computeVertexNormals()
  const m = mesh(geo, mat, { cast: false })
  const y = ctx.H - 0.5
  m.position.set(0, y, fp.front.mid[1] + 0.45)
  g.add(m)
  return { obj: g, mounted: true }
})

// 旗杆：杆 + 飘动的店旗
export const genFlagPole = reg('decor', 'flagPole', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const metal = stdMat({ color: 0xb8c0cc, roughness: 0.3, metalness: 0.8 })
  g.add(cyl(0.09, 0.13, 0.06, stdMat({ color: 0x3a4252, roughness: 0.5 }), { p: [0, 0.03, 0], seg: 16 }))
  g.add(cyl(0.028, 0.04, 3.4, metal, { p: [0, 1.73, 0], seg: 12 }))
  g.add(sphere(0.06, stdMat({ color: 0xe8b93c, roughness: 0.25, metalness: 0.8 }), { p: [0, 3.46, 0], cast: false }))
  // 旗
  const flagTex = canvasTexture(`flag-${ctx.dna.seed}`, 256, 160, (c, w, h) => {
    const grd = c.createLinearGradient(0, 0, w, 0)
    grd.addColorStop(0, hsl(...pal.main)); grd.addColorStop(1, hsl(...pal.accent))
    c.fillStyle = grd; c.fillRect(0, 0, w, h)
    c.fillStyle = hsl(...pal.glow)
    c.font = `900 52px ${FONT_STACK}`
    c.textAlign = 'center'; c.textBaseline = 'middle'
    c.fillText('★', w / 2, h / 2)
    c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 6
    c.strokeRect(3, 3, w - 6, h - 6)
  })
  const flagMat = new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: 0.8 })
  const geo = new THREE.PlaneGeometry(1.1, 0.66, 12, 2)
  const pos = geo.attributes.position
  const base = []
  for (let i = 0; i < pos.count; i++) base.push(pos.getX(i))
  const flag = mesh(geo, flagMat, { cast: false })
  flag.position.set(0.55, 3.05, 0)
  g.add(flag)
  ctx.animate.push({
    update: (dt) => {
      const t = performance.now() * 0.0022
      for (let i = 0; i < pos.count; i++) {
        const x = base[i]
        pos.setZ(i, Math.sin(x * 5 + t) * 0.06 * (x + 0.55))
      }
      pos.needsUpdate = true
      flag.rotation.y = Math.sin(t * 0.5) * 0.15
    },
  })
  return { obj: g }
})

// 风铃（挂件）：管钟 + 铃铛
export const genWindChime = reg('decor', 'windChime', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const wood = stdMat({ color: col([30, 45, 36]), roughness: 0.6 })
  g.add(cyl(0.16, 0.16, 0.04, wood, { p: [0, 0, 0], seg: 16 }))
  const tubes = []
  const n = 5
  for (let i = 0; i < n; i++) {
    const a = i * Math.PI * 2 / n
    const len = 0.5 - i * 0.06
    const t = cyl(0.022, 0.022, len, stdMat({ color: col(pal.accent, null, 0, 0, -4), roughness: 0.3, metalness: 0.7 }), {
      p: [Math.cos(a) * 0.13, -len / 2 - 0.06, Math.sin(a) * 0.13], seg: 10,
    })
    g.add(t)
    tubes.push({ t, a })
  }
  g.add(cone(0.05, 0.12, stdMat({ color: col(pal.glow), roughness: 0.4 }), { p: [0, -0.5, 0], seg: 8 }))
  ctx.animate.push({
    update: () => {
      const t = performance.now() * 0.0016
      for (const { t: tube, a } of tubes) tube.rotation.z = Math.sin(t + a * 2) * 0.1
    },
  })
  return { obj: g, hang: true }
})

// 小喷泉：石盆 + 动态水柱
export const genFountain = reg('decor', 'fountain', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const stone = stdMat({ color: col([210, 16, 72]), roughness: 0.85 })
  g.add(cyl(0.85, 0.95, 0.32, stone, { p: [0, 0.16, 0], seg: 24 }))
  g.add(cyl(0.8, 0.8, 0.06, stdMat({ color: 0x9fd8e8, roughness: 0.1, metalness: 0.4 }), { p: [0, 0.33, 0], seg: 24, cast: false }))
  g.add(cyl(0.1, 0.14, 0.55, stone, { p: [0, 0.55, 0], seg: 12 }))
  g.add(cyl(0.3, 0.34, 0.07, stone, { p: [0, 0.88, 0], seg: 18 }))
  // 中央水柱粒子
  const N = 26
  const geo = new THREE.BufferGeometry()
  const pos = new Float32Array(N * 3)
  const vel = []
  for (let i = 0; i < N; i++) vel.push({ v: ctx.rand.f(1.4, 2.2), p: ctx.rand.f(0, 1) })
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(N * 2), 2))
  const drops = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xafe8ff, size: 0.06, transparent: true, opacity: 0.85, depthWrite: false,
  }))
  drops.userData.noExport = true
  g.add(drops)
  g.userData.noExport = false
  ctx.animate.push({
    update: (dt) => {
      const arr = geo.attributes.position.array
      for (let i = 0; i < N; i++) {
        const d = vel[i]
        d.p += dt * d.v
        if (d.p > 1) d.p -= 1
        const p = d.p
        arr[i * 3] = Math.sin(i * 2.4) * 0.12 * p
        arr[i * 3 + 1] = 0.95 + p * 0.85 - p * p * 1.1
        arr[i * 3 + 2] = Math.cos(i * 2.4) * 0.12 * p
      }
      geo.attributes.position.needsUpdate = true
    },
  })
  return { obj: g }
})

// 鸟浴盆：石柱 + 浅水盆 + 小鸟
export const genBirdBath = reg('decor', 'birdBath', (ctx) => {
  const g = group()
  const stone = stdMat({ color: col([215, 14, 74]), roughness: 0.9 })
  g.add(cyl(0.3, 0.38, 0.1, stone, { p: [0, 0.05, 0], seg: 16 }))
  g.add(cyl(0.1, 0.16, 0.55, stone, { p: [0, 0.35, 0], seg: 14 }))
  g.add(cyl(0.42, 0.3, 0.12, stone, { p: [0, 0.68, 0], seg: 20 }))
  g.add(cyl(0.37, 0.37, 0.03, stdMat({ color: 0x9fd8e8, roughness: 0.12, metalness: 0.3 }), { p: [0, 0.74, 0], seg: 20, cast: false }))
  // 小鸟（可点击）
  const bird = group(
    sphere(0.07, stdMat({ color: 0x5a8ec8, roughness: 0.7 }), { s: [1, 0.9, 1.3] }),
    sphere(0.045, stdMat({ color: 0x5a8ec8, roughness: 0.7 }), { p: [0, 0.07, 0.08] }),
    cone(0.02, 0.04, stdMat({ color: 0xe8a13d, roughness: 0.4 }), { p: [0, 0.07, 0.13], r: [1.57, 0, 0], seg: 6 }),
  )
  bird.position.set(0.12, 0.78, 0.05)
  g.add(bird)
  ctx.animate.push({
    update: () => { bird.rotation.y = Math.sin(performance.now() * 0.002) * 0.8 },
  })
  g.userData.interact = { type: 'decor', label: '鸟浴盆', sub: '小鸟在洗澡' }
  ctx.hoverables.push(g)
  return { obj: g }
})

// 水井：石圈 + 辘轳架 + 屋顶
export const genWell = reg('decor', 'well', (ctx) => {
  const g = group()
  const stone = stdMat({ color: col([210, 15, 66]), roughness: 0.9 })
  g.add(cyl(0.62, 0.7, 0.75, stone, { p: [0, 0.375, 0], seg: 20 }))
  g.add(cyl(0.54, 0.54, 0.04, stdMat({ color: 0x1a2830, roughness: 0.2, metalness: 0.4 }), { p: [0, 0.75, 0], seg: 20, cast: false }))
  // 支柱 + 横梁
  const wood = stdMat({ color: col([28, 45, 30]), roughness: 0.7 })
  for (const x of [-0.55, 0.55]) g.add(box(0.1, 1.35, 0.1, wood, { p: [x, 0.95, 0] }))
  const axle = cyl(0.05, 0.05, 1.25, stdMat({ color: 0x8a6a3a, roughness: 0.6 }), { p: [0, 1.5, 0], r: [0, 0, Math.PI / 2], seg: 10 })
  g.add(axle)
  // 绳 + 桶
  g.add(cyl(0.012, 0.012, 0.5, stdMat({ color: 0xd8cbb0, roughness: 0.9 }), { p: [0, 1.25, 0], seg: 6 }))
  const bucket = group(
    cyl(0.13, 0.1, 0.2, wood, { p: [0, 0.1, 0], seg: 12 }),
    torus(0.13, 0.015, stdMat({ color: 0x8a6a3a, roughness: 0.5 }), { p: [0, 0.2, 0], r: [Math.PI / 2, 0, 0] }),
  )
  bucket.position.set(0, 0.82, 0)
  g.add(bucket)
  ctx.animate.push({
    update: () => { axle.rotation.x = performance.now() * 0.0004; bucket.position.y = 0.82 + Math.sin(performance.now() * 0.001) * 0.06 },
  })
  return { obj: g }
})

// 干草捆：草垛 + 草叉
export const genHayBale = reg('decor', 'hayBale', (ctx) => {
  const g = group()
  const hay = stdMat({ color: col([45, 62, 56]), roughness: 1 })
  const mk = (x, z, ry) => {
    const b = cyl(0.34, 0.34, 0.62, hay, { p: [x, 0.34, z], r: [0, ry, Math.PI / 2], seg: 14 })
    g.add(b)
  }
  mk(-0.4, 0, 0.3); mk(0.4, 0, -0.2); mk(0, 0, 0.15)
  g.add(cyl(0.34, 0.34, 0.62, hay, { p: [0, 0.95, 0.05], r: [0, 1.2, Math.PI / 2], seg: 14 }))
  // 草叉
  const steel = stdMat({ color: 0x9aa2ae, roughness: 0.35, metalness: 0.7 })
  g.add(cyl(0.02, 0.025, 1.5, stdMat({ color: 0x8a6a3a, roughness: 0.7 }), { p: [0.85, 0.75, 0.3], r: [0.2, 0, -0.18], seg: 8 }))
  for (const dx of [-0.04, 0, 0.04]) {
    g.add(box(0.015, 0.3, 0.015, steel, { p: [0.85 + dx * 2.4, 1.5, 0.42], r: [0.2, 0, -0.18], cast: false }))
  }
  return { obj: g }
})

// 躺椅 + 遮阳伞：沙滩角
export const genSunLounger = reg('decor', 'sunLounger', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const cloth = stdMat({ color: col(pal.accent, null, 0, -5, -6), roughness: 0.95 })
  const frame = stdMat({ color: 0x8fa8c8, roughness: 0.4, metalness: 0.5 })
  g.add(box(0.62, 0.1, 1.35, cloth, { p: [0, 0.32, 0.1] }))
  g.add(box(0.62, 0.1, 0.65, cloth, { p: [0, 0.5, -0.75], r: [-0.65, 0, 0] }))
  for (const [x, z] of [[-0.26, -0.45], [0.26, -0.45], [-0.26, 0.6], [0.26, 0.6]]) {
    g.add(box(0.05, 0.28, 0.05, frame, { p: [x, 0.14, z] }))
  }
  // 伞
  g.add(cyl(0.028, 0.04, 2.2, frame, { p: [0.95, 1.1, -0.3], r: [0.1, 0, -0.08], seg: 10 }))
  const canopy = new THREE.ConeGeometry(1.05, 0.42, 10, 1, true)
  const umbrella = mesh(canopy, stdMat({ color: col(pal.main), roughness: 0.85, side: THREE.DoubleSide }), { p: [1.02, 2.24, -0.18] })
  g.add(umbrella)
  // 小桌 + 饮品
  g.add(cyl(0.24, 0.24, 0.04, stdMat({ color: 0xf2ede2, roughness: 0.5 }), { p: [-0.85, 0.55, 0.1], seg: 16 }))
  g.add(cyl(0.03, 0.03, 0.53, frame, { p: [-0.85, 0.27, 0.1], seg: 8 }))
  g.add(cyl(0.05, 0.04, 0.1, stdMat({ color: col(pal.glow), roughness: 0.3 }), { p: [-0.85, 0.62, 0.1], seg: 10 }))
  return { obj: g }
})

// 报刊架：斜面杂志架
export const genNewspaperStand = reg('decor', 'newspaperStand', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const wood = stdMat({ color: col([30, 42, 34]), roughness: 0.65 })
  g.add(box(1.1, 0.75, 0.5, wood, { p: [0, 0.375, 0] }))
  g.add(box(1.1, 0.09, 0.56, stdMat({ color: col(pal.trim), roughness: 0.4 }), { p: [0, 0.78, 0] }))
  // 杂志斜靠
  for (let i = 0; i < 5; i++) {
    const m = box(0.16, 0.34, 0.02, stdMat({ color: col([(i * 62 + 10) % 360, 65, 58]), roughness: 0.6 }), {
      p: [-0.38 + i * 0.19, 0.72, 0.1 + (i % 2) * 0.05], r: [-0.35, 0, (i - 2) * 0.06], cast: false,
    })
    g.add(m)
  }
  // 今日头条牌
  g.add(plane(0.7, 0.24, glowMat(col(pal.glow).getHex(), 1.0), { p: [0, 1.0, 0.1], r: [-0.2, 0, 0], cast: false }))
  g.userData.interact = { type: 'decor', label: '报刊架', sub: '今日大瓜' }
  ctx.hoverables.push(g)
  return { obj: g }
})

// 复古电话亭式立柱电话
export const genVintagePhone = reg('decor', 'vintagePhone', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const wood = stdMat({ color: col([26, 40, 30]), roughness: 0.5 })
  g.add(box(0.5, 1.15, 0.45, wood, { p: [0, 0.575, 0] }))
  g.add(cyl(0.05, 0.07, 0.06, stdMat({ color: 0xc9a24b, roughness: 0.3, metalness: 0.8 }), { p: [0, 1.2, 0], seg: 10 }))
  // 机身 + 听筒
  const phoneM = stdMat({ color: col(pal.main, null, 0, 0, -14), roughness: 0.35 })
  g.add(box(0.3, 0.4, 0.22, phoneM, { p: [0, 1.0, 0.2] }))
  g.add(cyl(0.09, 0.09, 0.3, phoneM, { p: [0, 1.1, 0.34], r: [Math.PI / 2, 0, 0], seg: 14 }))
  // 拨号盘
  const dial = cyl(0.09, 0.09, 0.02, stdMat({ color: 0xf2ede2, roughness: 0.3 }), { p: [0, 0.98, 0.33], r: [Math.PI / 2, 0, 0], seg: 14 })
  g.add(dial)
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI / 5
    g.add(cyl(0.012, 0.012, 0.02, stdMat({ color: 0x2a2a30 }), { p: [Math.cos(a) * 0.06, 0.98 + Math.sin(a) * 0.06, 0.345], r: [Math.PI / 2, 0, 0], seg: 6, cast: false }))
  }
  ctx.animate.push({
    update: () => { dial.rotation.y = Math.sin(performance.now() * 0.001) * 0.4 },
  })
  g.userData.interact = { type: 'decor', label: '复古电话', sub: '喂？喂喂？' }
  ctx.hoverables.push(g)
  return { obj: g }
})

// 台秤：机械磅秤
export const genWeighingScale = reg('decor', 'weighingScale', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const steel = stdMat({ color: 0x4a5362, roughness: 0.4, metalness: 0.7 })
  g.add(cyl(0.3, 0.34, 0.12, steel, { p: [0, 0.06, 0], seg: 18 }))
  g.add(box(0.56, 0.7, 0.4, steel, { p: [0, 0.5, -0.1] }))
  // 秤盘
  g.add(cyl(0.34, 0.36, 0.05, stdMat({ color: 0xc8ccd6, roughness: 0.3, metalness: 0.8 }), { p: [0, 0.86, 0], seg: 18 }))
  // 表盘
  const face = canvasTexture(`scale-${ctx.dna.seed}`, 128, 128, (c, w, h) => {
    c.fillStyle = '#f3ead6'; c.beginPath(); c.arc(64, 64, 56, 0, 7); c.fill()
    c.strokeStyle = '#3a2e1e'; c.lineWidth = 4
    c.beginPath(); c.arc(64, 64, 54, 0, 7); c.stroke()
    c.strokeStyle = '#a22'; c.lineWidth = 3
    c.beginPath(); c.moveTo(64, 64); c.lineTo(88, 40); c.stroke()
  })
  g.add(cyl(0.11, 0.11, 0.03, stdMat({ map: face, roughness: 0.4 }), { p: [0, 0.82, 0.21], r: [Math.PI / 2, 0, 0], seg: 16 }))
  // 砝码
  g.add(cone(0.06, 0.12, stdMat({ color: col(pal.accent), roughness: 0.35, metalness: 0.6 }), { p: [0.2, 0.95, 0.05], seg: 10 }))
  return { obj: g }
})

// 餐车：轮式小车 + 雨棚 + 灯串
export const genFoodCart = reg('decor', 'foodCart', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const wood = stdMat({ color: col([32, 48, 36]), roughness: 0.6 })
  const paint = stdMat({ color: col(pal.main, null, 0, 0, -6), roughness: 0.45 })
  g.add(box(1.5, 0.65, 0.8, paint, { p: [0, 0.85, 0] }))
  g.add(box(1.56, 0.07, 0.86, stdMat({ color: 0xd8cbb0, roughness: 0.5 }), { p: [0, 1.2, 0] }))
  // 轮
  for (const [x, z] of [[-0.55, 0.42], [0.55, 0.42], [-0.55, -0.42], [0.55, -0.42]]) {
    g.add(cyl(0.2, 0.2, 0.08, stdMat({ color: 0x2a241c, roughness: 0.8 }), { p: [x, 0.2, z], r: [Math.PI / 2, 0, 0], seg: 14 }))
    g.add(cyl(0.07, 0.07, 0.1, stdMat({ color: 0xc8ccd6, roughness: 0.3, metalness: 0.7 }), { p: [x, 0.2, z], r: [Math.PI / 2, 0, 0], seg: 10 }))
  }
  // 雨棚
  for (const x of [-0.68, 0.68]) g.add(cyl(0.025, 0.03, 1.35, wood, { p: [x, 1.85, -0.3], seg: 8 }))
  const canopyGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.5, 10, 1, true, 0, Math.PI)
  const canopy = mesh(canopyGeo, stdMat({ color: col(pal.accent), roughness: 0.85, side: THREE.DoubleSide }), {
    p: [0, 2.45, 0.2], r: [0, Math.PI / 2, 0],
  })
  g.add(canopy)
  // 锅 + 蒸汽 + 灯串
  g.add(cyl(0.22, 0.2, 0.2, stdMat({ color: 0x8a9099, roughness: 0.35, metalness: 0.7 }), { p: [-0.4, 1.32, 0.1], seg: 14 }))
  for (let i = 0; i < 5; i++) {
    g.add(sphere(0.04, glowMat(col(pal.glow).getHex(), 1.2), { p: [-0.7 + i * 0.35, 2.28, 0.62], cast: false }))
  }
  const steam = group()
  for (let i = 0; i < 4; i++) {
    steam.add(sphere(0.05 + i * 0.015, stdMat({ color: 0xeef4f8, roughness: 1, transparent: true, opacity: 0.5 }), {
      p: [-0.4, 1.45 + i * 0.14, 0.1], cast: false,
    }))
  }
  g.add(steam)
  ctx.animate.push({
    update: () => {
      steam.position.y = Math.sin(performance.now() * 0.0012) * 0.08
      steam.scale.x = steam.scale.z = 1 + Math.sin(performance.now() * 0.002) * 0.1
    },
  })
  g.userData.interact = { type: 'decor', label: '小吃餐车', sub: '热乎的，来一份？' }
  ctx.hoverables.push(g)
  return { obj: g }
})

// 工具架：挂满工具的木架
export const genToolRack = reg('decor', 'toolRack', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const wood = stdMat({ color: col([30, 40, 32]), roughness: 0.7 })
  g.add(box(1.3, 1.6, 0.08, wood, { p: [0, 0.8, 0] }))
  g.add(box(1.4, 0.08, 0.2, stdMat({ color: col(pal.trim), roughness: 0.5 }), { p: [0, 1.62, 0.04] }))
  // 工具：扳手/锤/钳/锯
  const steel = stdMat({ color: 0x9aa2ae, roughness: 0.35, metalness: 0.75 })
  const woodH = stdMat({ color: 0x8a6a3a, roughness: 0.65 })
  g.add(box(0.06, 0.34, 0.06, woodH, { p: [-0.5, 1.35, 0.12] }))
  g.add(box(0.2, 0.1, 0.1, steel, { p: [-0.5, 1.55, 0.12] }))
  g.add(cyl(0.02, 0.02, 0.4, steel, { p: [-0.2, 1.35, 0.12], r: [0, 0, 0.2], seg: 8 }))
  g.add(cyl(0.035, 0.035, 0.16, steel, { p: [-0.11, 1.5, 0.12], r: [0, 0, 0.2], seg: 8 }))
  g.add(box(0.05, 0.5, 0.04, woodH, { p: [0.15, 1.3, 0.12], r: [0, 0, 0.1] }))
  g.add(box(0.1, 0.3, 0.03, steel, { p: [0.3, 1.15, 0.12], r: [0, 0, 0.35] }))
  // 挂钩
  for (let i = 0; i < 4; i++) {
    g.add(cyl(0.012, 0.012, 0.1, steel, { p: [-0.45 + i * 0.3, 0.7, 0.08], r: [0, 0, Math.PI / 2], seg: 6 }))
  }
  return { obj: g }
})

// 木箱花盆：旧箱改花池
export const genCratePlanter = reg('decor', 'cratePlanter', (ctx) => {
  const g = group()
  const wood = stdMat({ color: col([32, 55, 42]), roughness: 0.8 })
  g.add(box(0.9, 0.5, 0.9, wood, { p: [0, 0.25, 0] }))
  // 板条纹
  for (let i = 0; i < 4; i++) {
    g.add(box(0.94, 0.06, 0.94, stdMat({ color: col([32, 55, 36]), roughness: 0.85 }), { p: [0, 0.08 + i * 0.13, 0], cast: false }))
  }
  // 植物群
  for (let i = 0; i < ctx.rand.i(3, 5); i++) {
    const x = ctx.rand.f(-0.3, 0.3), z = ctx.rand.f(-0.3, 0.3)
    const h = ctx.rand.f(0.25, 0.5)
    g.add(cone(0.1, h, stdMat({ color: col([110 + ctx.rand.f(-25, 25), 50, 36]), roughness: 0.9 }), { p: [x, 0.5 + h / 2, z], seg: 6 }))
    if (ctx.rand.chance(0.5)) {
      g.add(sphere(0.05, stdMat({ color: col([ctx.rand.pick([0, 40, 330, 55]), 85, 70]), roughness: 0.7 }), { p: [x, 0.52 + h, z], cast: false }))
    }
  }
  return { obj: g }
})

// 海报柱：圆柱广告牌
export const genPosterBoard = reg('decor', 'posterBoard', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  g.add(cyl(0.3, 0.36, 0.12, stdMat({ color: 0x3a4252, roughness: 0.5 }), { p: [0, 0.06, 0], seg: 16 }))
  g.add(cyl(0.22, 0.24, 2.0, stdMat({ color: 0x4a5362, roughness: 0.45, metalness: 0.3 }), { p: [0, 1.1, 0], seg: 14 }))
  const tex = canvasTexture(`poster-${ctx.dna.seed}`, 256, 512, (c, w, h) => {
    const grd = c.createLinearGradient(0, 0, 0, h)
    grd.addColorStop(0, hsl(...pal.main)); grd.addColorStop(1, hsl(...pal.accent))
    c.fillStyle = grd; c.fillRect(0, 0, w, h)
    c.fillStyle = 'rgba(255,255,255,0.92)'
    c.font = `900 64px ${FONT_STACK}`
    c.textAlign = 'center'
    c.fillText('营业', w / 2, 120)
    c.fillText('中', w / 2, 190)
    c.font = `600 34px ${FONT_STACK}`
    c.fillStyle = 'rgba(255,255,255,0.75)'
    c.fillText('GRAND OPEN', w / 2, 300)
    c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 8
    c.strokeRect(16, 16, w - 32, h - 32)
  })
  g.add(cyl(0.235, 0.235, 1.1, stdMat({ map: tex, roughness: 0.55 }), { p: [0, 2.15, 0], seg: 20 }))
  g.add(cone(0.26, 0.2, stdMat({ color: col(pal.trim), roughness: 0.4 }), { p: [0, 2.8, 0], seg: 16 }))
  const board = g.children[2]
  ctx.animate.push({ update: (dt) => { board.rotation.y += dt * 0.3 } })
  return { obj: g }
})

// 地面灯串：一串低矮地灯
export const genRopeLight = reg('decor', 'ropeLight', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const glowC = col(pal.glow).getHex()
  const n = ctx.rand.i(5, 8)
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 0.5
    g.add(cyl(0.05, 0.07, 0.3, stdMat({ color: 0x30343c, roughness: 0.5, metalness: 0.4 }), { p: [x, 0.15, 0], seg: 10 }))
    const bulb = sphere(0.07, glowMat(glowC, 1.7), { p: [x, 0.36, 0], cast: false })
    g.add(bulb)
  }
  return { obj: g }
})

// 折叠躺椅：帆布椅
export const genDeckChair = reg('decor', 'deckChair', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const wood = stdMat({ color: 0xd8cbb0, roughness: 0.7 })
  // 帆布
  const clothTex = canvasTexture(`deck-${ctx.dna.seed}`, 256, 256, (c, w, h) => {
    for (let i = 0; i < 8; i++) {
      c.fillStyle = i % 2 ? hsl(...pal.accent) : '#f5f2e8'
      c.fillRect(0, i * 32, w, 32)
    }
  })
  const cloth = stdMat({ map: clothTex, roughness: 0.95, side: THREE.DoubleSide })
  const seat = mesh(new THREE.PlaneGeometry(0.55, 0.75), cloth, { p: [0, 0.28, 0.18], r: [-0.5, 0, 0], cast: true })
  g.add(seat)
  const back = mesh(new THREE.PlaneGeometry(0.55, 0.6), cloth, { p: [0, 0.42, -0.22], r: [-0.25, 0, 0], cast: true })
  g.add(back)
  // 木架
  for (const x of [-0.3, 0.3]) {
    g.add(box(0.05, 0.75, 0.05, wood, { p: [x, 0.37, 0.2], r: [0.5, 0, 0] }))
    g.add(box(0.05, 0.55, 0.05, wood, { p: [x, 0.27, -0.28], r: [-0.25, 0, 0] }))
  }
  for (const z of [-0.45, 0.42]) g.add(box(0.68, 0.05, 0.05, wood, { p: [0, 0.05, z] }))
  return { obj: g }
})

// 饮品站：饮料桶 + 杯架
export const genDrinkStation = reg('decor', 'drinkStation', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const wood = stdMat({ color: col([30, 45, 36]), roughness: 0.6 })
  g.add(box(1.2, 0.85, 0.6, wood, { p: [0, 0.425, 0] }))
  g.add(box(1.26, 0.06, 0.66, stdMat({ color: 0xf2ede2, roughness: 0.5 }), { p: [0, 0.88, 0] }))
  // 饮料桶 ×2
  for (const x of [-0.3, 0.3]) {
    g.add(cyl(0.16, 0.16, 0.4, stdMat({ color: x < 0 ? 0xe85850 : 0x50b4e8, roughness: 0.3, metalness: 0.3 }), { p: [x, 1.1, 0], seg: 14 }))
    g.add(cyl(0.17, 0.17, 0.05, stdMat({ color: 0xc8ccd6, roughness: 0.3, metalness: 0.7 }), { p: [x, 1.32, 0], seg: 14 }))
    g.add(box(0.03, 0.08, 0.03, stdMat({ color: 0x30343c }), { p: [x + 0.14, 1.02, 0.1], cast: false }))
  }
  // 杯塔
  for (let i = 0; i < 3; i++) {
    g.add(cyl(0.04, 0.03, 0.1, stdMat({ color: 0xf5f2ea, roughness: 0.5, transparent: true, opacity: 0.8 }), { p: [0.55, 0.96 + i * 0.1, 0.1], seg: 10 }))
  }
  // 吸管桶
  g.add(cyl(0.06, 0.06, 0.22, stdMat({ color: col(pal.accent), roughness: 0.5 }), { p: [-0.55, 1.02, 0.1], seg: 10 }))
  for (let i = 0; i < 4; i++) {
    g.add(cyl(0.008, 0.008, 0.3, stdMat({ color: col([(i * 80) % 360, 80, 60]) }), { p: [-0.55 + (i - 1.5) * 0.02, 1.15, 0.1], seg: 6 }))
  }
  return { obj: g }
})

// 宠物喂食角：碗 + 小屋 + 玩具
export const genPetBowl = reg('decor', 'petBowl', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  // 双碗架
  const frame = stdMat({ color: col(pal.trim, null, 0, 0, -10), roughness: 0.5 })
  g.add(box(0.6, 0.08, 0.3, frame, { p: [0, 0.06, 0] }))
  for (const x of [-0.18, 0.18]) {
    g.add(cyl(0.11, 0.13, 0.08, stdMat({ color: col(pal.main), roughness: 0.3, metalness: 0.4 }), { p: [x, 0.14, 0], seg: 14 }))
    g.add(cyl(0.1, 0.1, 0.02, stdMat({ color: x < 0 ? 0x8a6a3a : 0x9fd8e8, roughness: 0.4 }), { p: [x, 0.18, 0], seg: 14, cast: false }))
  }
  // 小狗屋
  const houseM = stdMat({ color: col([30, 50, 40]), roughness: 0.7 })
  g.add(box(0.75, 0.55, 0.7, houseM, { p: [0, 0.28, -0.75] }))
  const roof = mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.75, 3, 1), stdMat({ color: col(pal.accent, null, 0, 0, -10), roughness: 0.7 }), {
    p: [0, 0.68, -0.75], r: [0, 0, 0], s: [1, 1, 0.7],
  })
  roof.rotation.z = Math.PI / 2
  roof.rotation.y = Math.PI / 6
  g.add(roof)
  g.add(box(0.3, 0.32, 0.05, stdMat({ color: 0x1c1610, roughness: 0.9 }), { p: [0, 0.18, -0.39] }))
  // 磨牙棒玩具
  g.add(cyl(0.03, 0.03, 0.22, stdMat({ color: col(pal.glow), roughness: 0.5 }), { p: [0.5, 0.03, 0.2], r: [0.3, 0.6, 1.2], seg: 8 }))
  g.userData.interact = { type: 'decor', label: '宠物餐区', sub: '汪汪/喵喵 加班中' }
  ctx.hoverables.push(g)
  return { obj: g }
})

// 自行车架 + 单车
export const genBikeRack = reg('decor', 'bikeRack', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const steel = stdMat({ color: 0x5a6272, roughness: 0.4, metalness: 0.7 })
  // 倒 U 架 ×2
  for (const x of [-0.4, 0.4]) {
    g.add(torus(0.25, 0.03, steel, { p: [x, 0.25, 0], r: [0, Math.PI / 2, 0] }))
  }
  // 自行车（简约几何）
  const bike = group()
  const frameM = stdMat({ color: col(pal.main, null, 0, 0, -8), roughness: 0.4 })
  for (const x of [-0.34, 0.34]) {
    bike.add(torus(0.24, 0.028, stdMat({ color: 0x22262e, roughness: 0.8 }), { p: [x, 0.24, 0], r: [0, Math.PI / 2, 0] }))
    bike.add(cyl(0.02, 0.02, 0.06, stdMat({ color: 0xc8ccd6, roughness: 0.3, metalness: 0.8 }), { p: [x, 0.24, 0], r: [Math.PI / 2, 0, 0], seg: 8 }))
  }
  bike.add(cyl(0.014, 0.014, 0.62, frameM, { p: [0, 0.42, 0], r: [Math.PI / 2, 0, 0.35], seg: 8 }))
  bike.add(cyl(0.014, 0.014, 0.5, frameM, { p: [-0.17, 0.38, 0], r: [Math.PI / 2, 0, -0.5], seg: 8 }))
  bike.add(cyl(0.014, 0.014, 0.55, frameM, { p: [0.18, 0.4, 0], r: [Math.PI / 2, 0, 1.1], seg: 8 }))
  bike.add(cyl(0.02, 0.02, 0.5, frameM, { p: [-0.05, 0.6, 0], r: [0, 0, 0.25], seg: 8 }))
  bike.add(torus(0.05, 0.012, stdMat({ color: 0x22262e, roughness: 0.6 }), { p: [-0.13, 0.72, 0], r: [Math.PI / 2, 0.25, 0] }))
  bike.add(box(0.2, 0.04, 0.12, stdMat({ color: 0x22262e, roughness: 0.6 }), { p: [0.14, 0.82, 0], r: [0, 0, 0.25] }))
  bike.position.set(0, 0, 0.25)
  bike.rotation.y = 0.4
  g.add(bike)
  return { obj: g }
})

// 绳栏：天鹅绒隔离柱
export const genRopeBarrier = reg('decor', 'ropeBarrier', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const brass = stdMat({ color: 0xc9a24b, roughness: 0.25, metalness: 0.9 })
  const posts = []
  const n = 3
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 1.0
    g.add(cyl(0.14, 0.18, 0.05, stdMat({ color: 0x30343c, roughness: 0.5 }), { p: [x, 0.025, 0], seg: 14 }))
    g.add(cyl(0.025, 0.03, 0.95, brass, { p: [x, 0.5, 0], seg: 10 }))
    g.add(sphere(0.05, brass, { p: [x, 1.0, 0], cast: false }))
    posts.push(x)
  }
  // 绳（两段下垂弧线）
  const ropeM = stdMat({ color: col(pal.main, null, 0, 0, -12), roughness: 0.95 })
  for (let s = 0; s < n - 1; s++) {
    const x1 = posts[s], x2 = posts[s + 1]
    const geo = new THREE.CylinderGeometry(0.022, 0.022, Math.hypot(x2 - x1, 0.3), 6, 8)
    const rope = mesh(geo, ropeM, { cast: true })
    rope.position.set((x1 + x2) / 2, 0.92, 0)
    rope.rotation.z = Math.atan2(x2 - x1, 0.3)
    g.add(rope)
  }
  return { obj: g }
})
// ---------- 扩充装饰池（16 件，凑齐 200+ 生成器硬指标）----------

// 洒水壶 + 小水洼
export const genWateringCan = reg('decor', 'wateringCan', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const metal = stdMat({ color: col(pal.accent, null, 0, -12, -8), roughness: 0.35, metalness: 0.7 })
  g.add(cyl(0.16, 0.19, 0.3, metal, { p: [0, 0.15, 0], seg: 16 }))
  g.add(cyl(0.06, 0.09, 0.05, metal, { p: [0, 0.32, 0], seg: 12 }))
  // 壶嘴
  const spout = cyl(0.03, 0.045, 0.34, metal, { p: [0.22, 0.2, 0], r: [0, 0, -1.15], seg: 10 })
  g.add(spout)
  g.add(torus(0.11, 0.014, metal, { p: [0, 0.24, -0.16], r: [Math.PI / 2, 0, 0], seg: 14, tub: 10 }))
  // 水洼
  const puddle = mesh(new THREE.CircleGeometry(0.42, 22), stdMat({ color: 0x7fa8c9, roughness: 0.15, metalness: 0.4, transparent: true, opacity: 0.5 }), { p: [0.5, 0.012, 0.3], r: [-Math.PI / 2, 0, 0], cast: false })
  g.add(puddle)
  g.rotation.y = ctx.rand.f(0, Math.PI * 2)
  return { obj: g }
})

// 门口刮泥板 + 小刷
export const genBootScraper = reg('decor', 'bootScraper', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const frame = stdMat({ color: col(pal.trim, null, 0, 0, -20), roughness: 0.6, metalness: 0.3 })
  g.add(box(0.6, 0.05, 0.36, frame, { p: [0, 0.025, 0] }))
  for (let i = 0; i < 5; i++) {
    g.add(cyl(0.014, 0.014, 0.34, stdMat({ color: 0x9a8a72, roughness: 0.9 }), { p: [-0.24 + i * 0.12, 0.07, 0], r: [Math.PI / 2, 0, 0], seg: 6 }))
  }
  const brush = group(
    box(0.1, 0.05, 0.28, stdMat({ color: col(pal.accent), roughness: 0.7 }), { p: [0, 0.03, 0] }),
  )
  for (let i = 0; i < 6; i++) {
    brush.add(cyl(0.008, 0.008, 0.1, stdMat({ color: 0x2e2a24, roughness: 1 }), { p: [-0.03 + (i % 3) * 0.03, -0.05, -0.1 + Math.floor(i / 3) * 0.14], seg: 5 }))
  }
  brush.position.set(0.42, 0.02, 0.1)
  brush.rotation.y = 0.5
  g.add(brush)
  return { obj: g }
})

// 双轮手推花车
export const genFlowerCart = reg('decor', 'flowerCart', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const wood = stdMat({ color: col(pal.main, null, 8, -8, -6), roughness: 0.8 })
  const wood2 = stdMat({ color: col(pal.trim, null, 0, 0, -14), roughness: 0.8 })
  // 车斗（梯形）
  g.add(box(1.1, 0.34, 0.62, wood, { p: [0, 0.52, 0] }))
  g.add(box(1.16, 0.06, 0.68, wood2, { p: [0, 0.36, 0] }))
  // 车把
  for (const s of [-1, 1]) {
    g.add(cyl(0.024, 0.024, 0.8, wood2, { p: [s * 0.5, 0.62, 0.42], r: [Math.PI / 2.6, 0, 0], seg: 8 }))
  }
  // 车轮
  for (const s of [-1, 1]) {
    g.add(cyl(0.26, 0.26, 0.05, stdMat({ color: 0x4a3b2c, roughness: 0.9 }), { p: [s * 0.58, 0.26, 0], r: [0, 0, Math.PI / 2], seg: 18 }))
    g.add(torus(0.26, 0.03, stdMat({ color: 0x8a6f4d, roughness: 0.7 }), { p: [s * 0.58, 0.26, 0], r: [0, Math.PI / 2, 0], seg: 18, tub: 10 }))
  }
  // 支腿
  for (const s of [-1, 1]) {
    g.add(cyl(0.02, 0.02, 0.4, wood2, { p: [s * 0.45, 0.18, -0.24], seg: 6 }))
  }
  // 花盆层（两排小花）
  const petalMat = stdMat({ color: col(pal.glow, null, 0, 12, 6), roughness: 0.55 })
  for (let i = 0; i < 6; i++) {
    const px = -0.4 + (i % 3) * 0.4, pz = -0.12 + Math.floor(i / 3) * 0.24
    g.add(cyl(0.08, 0.06, 0.12, stdMat({ color: 0xa5553a, roughness: 0.85 }), { p: [px, 0.75, pz], seg: 10 }))
    g.add(sphere(0.07, petalMat, { p: [px, 0.86, pz] }))
    g.add(sphere(0.035, stdMat({ color: 0xffe08a, roughness: 0.4 }), { p: [px, 0.9, pz] }))
  }
  return { obj: g }
})

// 挂墙水管卷盘
export const genHoseReel = reg('decor', 'hoseReel', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const metal = stdMat({ color: col(pal.trim, null, 0, -8, -18), roughness: 0.4, metalness: 0.65 })
  const hoseMat = stdMat({ color: col(pal.accent, null, 0, -14, -10), roughness: 0.8 })
  g.add(cyl(0.22, 0.22, 0.09, metal, { p: [0, 1.1, 0], r: [0, 0, Math.PI / 2], seg: 20 }))
  // 盘绕的水管
  for (let i = 0; i < 5; i++) {
    g.add(torus(0.15 + i * 0.018, 0.026, hoseMat, { p: [0, 1.1, 0.05 + i * 0.052], r: [0, Math.PI / 2, 0], seg: 20, tub: 8 }))
  }
  // 摇柄
  const crank = group(
    cyl(0.02, 0.02, 0.16, metal, { p: [0.1, 1.1, 0.02], r: [0, 0, Math.PI / 2], seg: 8 }),
    cyl(0.02, 0.02, 0.12, metal, { p: [0.16, 1.16, 0.02], seg: 8 }),
    cyl(0.035, 0.035, 0.05, stdMat({ color: col(pal.glow), roughness: 0.4 }), { p: [0.16, 1.22, 0.02], r: [Math.PI / 2, 0, 0], seg: 10 }),
  )
  g.add(crank)
  // 垂下的管头
  g.add(cyl(0.024, 0.024, 0.3, hoseMat, { p: [0.24, 0.95, 0.08], r: [0.3, 0, 0.2], seg: 8 }))
  g.add(cyl(0.03, 0.035, 0.08, metal, { p: [0.28, 0.8, 0.1], seg: 10 }))
  return { obj: g, mounted: false }
})

// 烟熏烤炉（带蒸汽）
export const genSmoker = reg('decor', 'smoker', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const body = stdMat({ color: 0x33363c, roughness: 0.5, metalness: 0.6 })
  g.add(cyl(0.34, 0.36, 0.9, body, { p: [0, 0.62, 0], seg: 20 }))
  g.add(cyl(0.37, 0.37, 0.06, stdMat({ color: col(pal.trim, null, 0, 0, -22), roughness: 0.4, metalness: 0.7 }), { p: [0, 1.1, 0], seg: 20 }))
  // 烟囱
  g.add(cyl(0.07, 0.09, 0.5, body, { p: [0.18, 1.35, 0], seg: 12 }))
  // 三腿支架
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * Math.PI * 2
    g.add(cyl(0.026, 0.026, 0.42, body, { p: [Math.cos(a) * 0.26, 0.2, Math.sin(a) * 0.26], r: [Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35], seg: 8 }))
  }
  // 炉门发光缝
  g.add(box(0.3, 0.05, 0.02, glowMat(0xff7a33, 2.4), { p: [0, 0.58, 0.36], cast: false }))
  g.add(sphere(0.05, glowMat(0xffa04d, 2.8), { p: [0.18, 1.62, 0], cast: false }))
  // 烟雾
  const smokeMat = new THREE.MeshStandardMaterial({ color: 0xd8d8dc, transparent: true, opacity: 0.35, roughness: 1 })
  const puffs = []
  for (let i = 0; i < 4; i++) {
    const p = sphere(0.06 + i * 0.02, smokeMat.clone(), { p: [0.18, 1.7, 0], cast: false })
    puffs.push(p)
    g.add(p)
  }
  let t = 0
  ctx.animate.push({
    update(dt) {
      t += dt
      puffs.forEach((p, i) => {
        const ph = (t * 0.4 + i * 0.25) % 1
        p.position.y = 1.66 + ph * 0.8
        p.material.opacity = 0.32 * (1 - ph)
        p.scale.setScalar(1 + ph * 1.8)
      })
    },
  })
  g.userData.interact = { type: 'egg', label: '烟熏炉 · 慢火出真味', sub: '今曰特供' }
  ctx.hoverables.push(g)
  return { obj: g }
})

// 靠墙木梯
export const genLeanLadder = reg('decor', 'leanLadder', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const wood = stdMat({ color: col(pal.main, null, 6, -10, -8), roughness: 0.85 })
  const L = ctx.rand.f(2.2, 2.9)
  for (const s of [-1, 1]) {
    g.add(box(0.06, L, 0.05, wood, { p: [s * 0.24, L / 2, 0], r: [0.22, 0, 0] }))
  }
  const n = Math.floor(L / 0.34)
  for (let i = 0; i < n; i++) {
    g.add(cyl(0.025, 0.025, 0.48, wood, { p: [0, 0.3 + i * 0.34, -0.1 - i * 0.024], r: [Math.PI / 2, 0, 0], seg: 8 }))
  }
  // 挂在梯子上的小桶
  g.add(cyl(0.09, 0.07, 0.14, stdMat({ color: col(pal.accent, null, 0, -14, -10), roughness: 0.8 }), { p: [0.24, 0.72, -0.06], seg: 12 }))
  return { obj: g }
})

// 鸟笼吊植物
export const genCagePlant = reg('decor', 'cagePlant', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const metal = stdMat({ color: col(pal.trim, null, 0, -6, -16), roughness: 0.35, metalness: 0.75 })
  // 三脚吊架
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * Math.PI * 2
    g.add(cyl(0.022, 0.022, 2.1, metal, { p: [Math.cos(a) * 0.3, 1.0, Math.sin(a) * 0.3], r: [Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3], seg: 8 }))
  }
  g.add(torus(0.34, 0.02, metal, { p: [0, 2.0, 0], r: [Math.PI / 2, 0, 0], seg: 20, tub: 8 }))
  // 笼体（弧筋）
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2
    g.add(torus(0.22, 0.012, metal, { p: [0, 1.62, 0], r: [Math.PI / 2 + 0.5, a, 0], seg: 14, tub: 6 }))
  }
  g.add(torus(0.22, 0.014, metal, { p: [0, 1.38, 0], r: [Math.PI / 2, 0, 0], seg: 16, tub: 6 }))
  g.add(torus(0.22, 0.014, metal, { p: [0, 1.86, 0], r: [Math.PI / 2, 0, 0], seg: 16, tub: 6 }))
  // 笼中垂蔓植物
  const vineMat = stdMat({ color: col(pal.ground, null, 16, 12, 6), roughness: 0.85 })
  g.add(sphere(0.14, vineMat, { p: [0, 1.6, 0], s: [1, 0.7, 1] }))
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2
    g.add(sphere(0.05, vineMat, { p: [Math.cos(a) * 0.16, 1.42, Math.sin(a) * 0.16], s: [1, 2.2, 1] }))
    g.add(sphere(0.045, vineMat, { p: [Math.cos(a) * 0.2, 1.28, Math.sin(a) * 0.2], s: [1, 2.6, 1] }))
  }
  let t = 0
  ctx.animate.push({
    update(dt) {
      t += dt
      g.rotation.y = Math.sin(t * 0.5) * 0.12
    },
  })
  return { obj: g }
})

// 石质日晷
export const genSundial = reg('decor', 'sundial', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const stone = stdMat({ color: col(pal.wall, null, 0, -22, -12), roughness: 0.9 })
  g.add(cyl(0.5, 0.58, 0.12, stone, { p: [0, 0.06, 0], seg: 8 }))
  g.add(cyl(0.38, 0.44, 0.5, stone, { p: [0, 0.37, 0], seg: 8 }))
  g.add(cyl(0.52, 0.5, 0.08, stone, { p: [0, 0.66, 0], seg: 18 }))
  // 晷面刻度
  const face = canvasTexture(`sundial-${ctx.dna.seed}`, 256, 256, (c, w, h) => {
    c.fillStyle = hsl(...pal.wall.map((v, i) => i === 2 ? Math.max(82, v) : v))
    c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 8, 0, 7); c.fill()
    c.strokeStyle = 'rgba(60,50,40,0.8)'; c.lineWidth = 5
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2
      c.beginPath()
      c.moveTo(w / 2 + Math.cos(a) * (w / 2 - 18), h / 2 + Math.sin(a) * (w / 2 - 18))
      c.lineTo(w / 2 + Math.cos(a) * (w / 2 - 46), h / 2 + Math.sin(a) * (w / 2 - 46))
      c.stroke()
    }
    c.fillStyle = 'rgba(60,50,40,0.9)'
    c.font = `700 44px ${FONT_STACK}`
    c.textAlign = 'center'; c.textBaseline = 'middle'
    c.fillText('☀', w / 2, h / 2)
  })
  g.add(cyl(0.46, 0.46, 0.02, new THREE.MeshStandardMaterial({ map: face, roughness: 0.7 }), { p: [0, 0.71, 0], seg: 24 }))
  // 指针（三角晷针）
  g.add(cone(0.035, 0.44, stdMat({ color: col(pal.trim, null, 0, 0, -14), roughness: 0.4, metalness: 0.6 }), { p: [0, 0.9, 0.12], r: [-0.5, 0, 0], seg: 8 }))
  return { obj: g }
})

// 杆上鸟屋
export const genBirdhouse = reg('decor', 'birdhouse', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const wood = stdMat({ color: col(pal.main, null, 10, -12, -6), roughness: 0.85 })
  const wood2 = stdMat({ color: col(pal.trim, null, 0, 0, -16), roughness: 0.8 })
  g.add(cyl(0.05, 0.07, 1.8, wood2, { p: [0, 0.9, 0], seg: 10 }))
  g.add(box(0.44, 0.4, 0.36, wood, { p: [0, 2.0, 0] }))
  // 坡顶
  g.add(box(0.52, 0.05, 0.24, wood2, { p: [0, 2.26, -0.1], r: [0.5, 0, 0] }))
  g.add(box(0.52, 0.05, 0.24, wood2, { p: [0, 2.26, 0.1], r: [-0.5, 0, 0] }))
  // 入口圆洞
  g.add(cyl(0.07, 0.07, 0.37, stdMat({ color: 0x1e1a16, roughness: 1 }), { p: [0, 2.06, 0], r: [Math.PI / 2, 0, 0], seg: 12, cast: false }))
  g.add(cyl(0.02, 0.02, 0.14, wood2, { p: [0, 1.86, 0.16], r: [Math.PI / 2, 0, 0], seg: 6 }))
  // 屋顶小鸟
  const birdMat = stdMat({ color: col(pal.glow, null, 0, -6, 0), roughness: 0.6 })
  g.add(sphere(0.05, birdMat, { p: [0.05, 2.32, 0], s: [1.3, 1, 1] }))
  g.add(sphere(0.032, birdMat, { p: [0.12, 2.36, 0] }))
  g.add(cone(0.012, 0.05, stdMat({ color: 0xffa53d, roughness: 0.5 }), { p: [0.17, 2.35, 0], r: [0, 0, -1.5], seg: 6 }))
  return { obj: g }
})

// 石头群
export const genBoulderCluster = reg('decor', 'boulderCluster', (ctx) => {
  const g = group()
  const stone = stdMat({ color: col(ctx.dna.palette.wall, null, -16, -24, -14), roughness: 0.95 })
  const n = ctx.rand.i(2, 4)
  for (let i = 0; i < n; i++) {
    const s = ctx.rand.f(0.16, 0.42)
    const b = sphere(s, stone, {
      p: [ctx.rand.f(-0.5, 0.5), s * 0.6, ctx.rand.f(-0.4, 0.4)],
      s: [ctx.rand.f(0.9, 1.5), ctx.rand.f(0.6, 1.0), ctx.rand.f(0.9, 1.4)],
      r: [ctx.rand.f(0, 0.4), ctx.rand.f(0, 3), ctx.rand.f(0, 0.4)],
    })
    g.add(b)
  }
  // 苔藓顶
  const moss = stdMat({ color: col(ctx.dna.palette.ground, null, 8, 14, -6), roughness: 1 })
  g.add(sphere(0.18, moss, { p: [ctx.rand.f(-0.2, 0.2), 0.34, ctx.rand.f(-0.2, 0.2)], s: [1.4, 0.3, 1.2] }))
  return { obj: g }
})

// 一排护柱
export const genBollardRow = reg('decor', 'bollardRow', (ctx) => {
  const g = group()
  const pal = ctx.dna.palette
  const metal = stdMat({ color: col(pal.trim, null, 0, -10, -20), roughness: 0.4, metalness: 0.6 })
  const n = ctx.rand.i(3, 5)
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 0.9
    g.add(cyl(0.07, 0.09, 0.85, metal, { p: [x, 0.42, 0], seg: 12 }))
    g.add(sphere(0.075, glowMat(col(pal.glow).getHex(), 1.6), { p: [x, 0.88, 0], cast: false }))
    g.add(cyl(0.12, 0.12, 0.06, stdMat({ color: 0x3c3f45, roughness: 0.8 }), { p: [x, 0.03, 0], seg: 12 }))
  }
  return { obj: g }
})

// 风向袋（动画）
export const genWindSock = reg('decor', 'windSock', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const metal = stdMat({ color: col(pal.trim, null, 0, -8, -18), roughness: 0.4, metalness: 0.7 })
  g.add(cyl(0.05, 0.07, 2.6, metal, { p: [0, 1.3, 0], seg: 10 }))
  g.add(cyl(0.16, 0.18, 0.08, metal, { p: [0, 0.04, 0], seg: 12 }))
  g.add(cyl(0.03, 0.03, 0.5, metal, { p: [0.2, 2.6, 0], r: [0, 0, Math.PI / 2], seg: 8 }))
  // 布袋（条纹锥）
  const sock = group()
  for (let i = 0; i < 5; i++) {
    const r0 = 0.11 - i * 0.016, r1 = 0.11 - (i + 1) * 0.016
    const mat = stdMat({ color: i % 2 ? 0xff5a3c : 0xfff3e0, roughness: 0.8, side: THREE.DoubleSide })
    sock.add(cyl(r0, r1, 0.14, mat, { p: [0.42 + i * 0.14, 2.6, 0], r: [0, 0, Math.PI / 2], seg: 12 }))
  }
  g.add(sock)
  let t = 0
  ctx.animate.push({
    update(dt) {
      t += dt
      sock.rotation.y = Math.sin(t * 1.2) * 0.3
      sock.rotation.z = Math.sin(t * 2.1) * 0.08
      sock.position.x = Math.sin(t * 0.8) * 0.04
    },
  })
  return { obj: g }
})

// 雨水收集桶
export const genRainBarrel = reg('decor', 'rainBarrel', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const woodMat = stdMat({ color: col(pal.main, null, 12, -14, -8), roughness: 0.85 })
  const bandMat = stdMat({ color: col(pal.trim, null, 0, -10, -20), roughness: 0.4, metalness: 0.7 })
  g.add(cyl(0.36, 0.32, 0.9, woodMat, { p: [0, 0.45, 0], seg: 18 }))
  for (const y of [0.15, 0.75]) {
    g.add(torus(0.345, 0.02, bandMat, { p: [0, y, 0], r: [Math.PI / 2, 0, 0], seg: 18, tub: 8 }))
  }
  // 水面
  g.add(cyl(0.33, 0.33, 0.02, stdMat({ color: 0x4a6a7a, roughness: 0.1, metalness: 0.5 }), { p: [0, 0.88, 0], seg: 18, cast: false }))
  // 接雨漏斗
  g.add(cyl(0.42, 0.1, 0.16, bandMat, { p: [0, 0.94, 0], seg: 18 }))
  // 水龙头
  g.add(cyl(0.025, 0.025, 0.12, bandMat, { p: [0.34, 0.2, 0], r: [0, 0, Math.PI / 2], seg: 8 }))
  g.add(sphere(0.035, bandMat, { p: [0.41, 0.2, 0] }))
  // 木凳搭板
  g.add(box(0.5, 0.04, 0.2, woodMat, { p: [0, 0.92, 0.28] }))
  return { obj: g }
})

// 火坑（发光 + 烟）
export const genFirePit = reg('decor', 'firePit', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const stone = stdMat({ color: col(pal.wall, null, -12, -22, -14), roughness: 0.95 })
  const n = 9
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2
    g.add(sphere(0.14, stone, { p: [Math.cos(a) * 0.62, 0.09, Math.sin(a) * 0.62], s: [1, 0.7, 1] }))
  }
  // 炭火
  const ember = glowMat(0xff5a1f, 1.8)
  for (let i = 0; i < 5; i++) {
    g.add(sphere(0.07, ember, { p: [ctx.rand.f(-0.2, 0.2), 0.06, ctx.rand.f(-0.2, 0.2)], s: [1.6, 0.5, 1.4], cast: false }))
  }
  const fireLight = new THREE.PointLight(0xff7a33, 9, 6, 2)
  fireLight.position.set(0, 0.5, 0)
  g.add(fireLight)
  // 火苗动画
  const flames = []
  for (let i = 0; i < 4; i++) {
    const f = cone(0.09, 0.5, glowMat(i % 2 ? 0xffa53d : 0xff6a2a, 2.6), { p: [ctx.rand.f(-0.14, 0.14), 0.3, ctx.rand.f(-0.14, 0.14)], cast: false })
    flames.push(f)
    g.add(f)
  }
  let t = 0
  ctx.animate.push({
    update(dt) {
      t += dt
      flames.forEach((f, i) => {
        f.scale.y = 0.8 + Math.abs(Math.sin(t * 7 + i * 2)) * 0.7
        f.scale.x = f.scale.z = 0.9 + Math.sin(t * 9 + i) * 0.2
        f.position.y = 0.24 + f.scale.y * 0.12
      })
      fireLight.intensity = 8 + Math.sin(t * 11) * 2.5
    },
  })
  // 围坐原木凳
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * Math.PI * 2 + 0.5
    g.add(cyl(0.11, 0.11, 1.0, stdMat({ color: 0x6b4f36, roughness: 0.9 }), { p: [Math.cos(a) * 1.05, 0.11, Math.sin(a) * 1.05], r: [Math.PI / 2, a + Math.PI / 2, 0], seg: 10 }))
  }
  g.userData.interact = { type: 'egg', label: '篝火 · 围炉夜话', sub: '火星偶尔会窜出来' }
  ctx.hoverables.push(g)
  return { obj: g }
})

// 门口石板路
export const genStonePath = reg('decor', 'stonePath', (ctx) => {
  const { fp } = ctx
  const g = group()
  const stoneMat = stdMat({ color: col(ctx.dna.palette.wall, null, -6, -18, -6), roughness: 0.9 })
  const stoneMat2 = stdMat({ color: col(ctx.dna.palette.wall, null, -14, -18, 10), roughness: 0.9 })
  const nx = fp.front.normal[0], nz = fp.front.normal[1]
  const fm = fp.front.mid
  const n = 5
  for (let i = 0; i < n; i++) {
    const out = 0.9 + i * 0.82
    const wob = Math.sin(i * 1.7 + ctx.dna.seed % 7) * 0.18
    const s = 0.34 + ((ctx.dna.seed >> i) % 3) * 0.05
    const slab = box(s * 1.7, 0.05, s, i % 2 ? stoneMat : stoneMat2, {
      p: [fm[0] + wob + nx * out, 0.028, fm[1] + nz * out],
      r: [0, ctx.rand.f(-0.15, 0.15), 0],
    })
    slab.receiveShadow = true
    g.add(slab)
  }
  // 路边小草
  const grassMat = stdMat({ color: col(ctx.dna.palette.ground, null, 12, 16, 0), roughness: 1 })
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? 1 : -1
    const out = 0.8 + Math.floor(i / 2) * 1.0
    g.add(cone(0.05, ctx.rand.f(0.16, 0.3), grassMat, { p: [fm[0] + side * 0.5 + nx * out, 0.1, fm[1] + nz * out], seg: 5, cast: false }))
  }
  return { obj: g }
})

// 开花灌木 + 蝴蝶
export const genButterflyBush = reg('decor', 'butterflyBush', (ctx) => {
  const pal = ctx.dna.palette
  const g = group()
  const bushMat = stdMat({ color: col(pal.ground, null, 10, 14, -4), roughness: 0.9 })
  for (let i = 0; i < 4; i++) {
    g.add(sphere(ctx.rand.f(0.24, 0.4), i % 2 ? bushMat : stdMat({ color: col(pal.ground, null, -16, 12, -10), roughness: 0.9 }), {
      p: [ctx.rand.f(-0.25, 0.25), 0.28 + i * 0.14, ctx.rand.f(-0.25, 0.25)],
    }))
  }
  // 花簇
  const bloomMat = stdMat({ color: col(pal.glow, null, 0, 14, 8), roughness: 0.55 })
  for (let i = 0; i < ctx.rand.i(5, 9); i++) {
    g.add(sphere(ctx.rand.f(0.045, 0.07), bloomMat, {
      p: [ctx.rand.f(-0.3, 0.3), ctx.rand.f(0.3, 0.8), ctx.rand.f(-0.3, 0.3)],
    }))
  }
  // 蝴蝶（双翅平面，绕丛飞舞）
  const wingMat = new THREE.MeshStandardMaterial({ color: col(pal.accent, null, 0, 10, 14), roughness: 0.5, side: THREE.DoubleSide, transparent: true, opacity: 0.92 })
  const butterflies = []
  for (let i = 0; i < 3; i++) {
    const b = group()
    b.add(plane(0.09, 0.13, wingMat, { p: [-0.045, 0, 0], cast: false }))
    b.add(plane(0.09, 0.13, wingMat, { p: [0.045, 0, 0], cast: false }))
    b.position.set(0, 0.6, 0)
    butterflies.push({ obj: b, ph: ctx.rand.f(0, 6), r: ctx.rand.f(0.3, 0.55) })
    g.add(b)
  }
  let t = 0
  ctx.animate.push({
    update(dt) {
      t += dt
      for (const bf of butterflies) {
        const a = t * 1.3 + bf.ph
        bf.obj.position.set(Math.cos(a) * bf.r, 0.55 + Math.sin(a * 2.3) * 0.18, Math.sin(a) * bf.r)
        bf.obj.rotation.y = -a + Math.PI / 2
        const flap = Math.sin(t * 14 + bf.ph) * 0.7
        bf.obj.children[0].rotation.y = flap
        bf.obj.children[1].rotation.y = -flap
      }
    },
  })
  return { obj: g }
})

// ---------- 装饰编排：风格装饰沿周边 + 彩蛋装饰门口陈列 ----------
import { applyEggDecor } from './eggs3d.js'
import { getGen } from './registry.js'

// 风格 bias 名 → 已注册生成器名（个别命名差异映射）
const DECOR_ALIAS = {
  flowerBox: 'planterBox', bamboo: 'bambooCluster', candles: 'candleCluster',
  banner: 'signPost', raven: 'statue', lanternString: 'lanternString',
}

function perimeterSpots(ctx) {
  const { bbox, front } = ctx.fp
  const out = []
  const fm = front.mid
  const nx = front.normal[0], nz = front.normal[1]
  // 门口左右（沿前边方向 ±）
  const tx = Math.cos(front.theta), tz = Math.sin(front.theta)
  const pushSpot = (x, z, rotY, prime = false) => out.push({ x, z, rotY, prime })
  // 前左 / 前右（黄金位：彩蛋用）
  pushSpot(fm[0] - tx * (front.L * 0.32) + nx * 1.1, fm[1] - tz * (front.L * 0.32) + nz * 1.1, -front.theta, true)
  pushSpot(fm[0] + tx * (front.L * 0.32) + nx * 1.1, fm[1] + tz * (front.L * 0.32) + nz * 1.1, -front.theta, true)
  // 侧面
  pushSpot(bbox.minX - 1.3, fm[1], Math.PI / 2)
  pushSpot(bbox.maxX + 1.3, fm[1], -Math.PI / 2)
  // 前角
  pushSpot(fm[0] - tx * (front.L * 0.52) + nx * 0.7, fm[1] - tz * (front.L * 0.52) + nz * 0.7, -front.theta)
  pushSpot(fm[0] + tx * (front.L * 0.52) + nx * 0.7, fm[1] + tz * (front.L * 0.52) + nz * 0.7, -front.theta)
  // 后角
  pushSpot(bbox.minX - 0.9, bbox.minZ - 0.9, -Math.PI / 4)
  pushSpot(bbox.maxX + 0.9, bbox.minZ - 0.9, Math.PI / 4)
  return out
}

export function placeDecor(ctx) {
  const { dna } = ctx
  const spots = perimeterSpots(ctx)
  let spotIdx = 0
  const takeSpot = (prime = false) => {
    if (prime) {
      const p = spots.find(s => s.prime && !s.used)
      if (p) { p.used = true; return p }
    }
    for (let i = 0; i < spots.length; i++) {
      const s = spots[(spotIdx + i) % spots.length]
      if (!s.used) { s.used = true; spotIdx = (spotIdx + i + 1) % spots.length; return s }
    }
    return null
  }

  // 1. 彩蛋装饰优先（门口黄金位）
  const eggDecors = applyEggDecor(ctx)
  for (const d of eggDecors) {
    const spot = takeSpot(true) || takeSpot()
    if (!spot) break
    const o = d.obj || d
    if (!o.isObject3D) continue
    o.position.set(spot.x + ctx.rand.f(-0.25, 0.25), 0, spot.z + ctx.rand.f(-0.25, 0.25))
    o.rotation.y = spot.rotY + ctx.rand.f(-0.3, 0.3)
    ctx.shopRoot.add(o)
    if (d.interact) {
      o.userData.interact = d.interact
      ctx.hoverables.push(o)
    }
  }

  // 2. 风格装饰 2-6 件
  const bias = dna.style.decorBias || []
  const pool = bias.length ? bias : ['planterBox', 'bench', 'stringLights', 'menuBoard']
  const n = ctx.rand.i(2, 6)
  const used = new Set()
  for (let i = 0; i < n; i++) {
    const biasName = pool[(ctx.rand.i(0, pool.length - 1) + i) % pool.length]
    const name = DECOR_ALIAS[biasName] || biasName
    if (used.has(name)) continue
    used.add(name)
    const entry = getGen(name)
    if (!entry || entry.slot !== 'decor' || entry.name.startsWith('egg_')) continue
    try {
      const r = entry.fn(ctx)
      if (!r || !r.obj) continue
      if (r.mounted) {
        // 已自带位置（如遮阳篷）
        ctx.shopRoot.add(r.obj)
      } else if (r.hang) {
        // 悬挂件：挂到屋檐角
        const { bbox } = ctx.fp
        const side = ctx.rand.chance(0.5) ? -1 : 1
        r.obj.position.set(side * (bbox.w / 2 - 0.3), ctx.H - 0.15, ctx.fp.front.mid[1] + ctx.rand.f(-1, 1))
        ctx.shopRoot.add(r.obj)
      } else {
        const spot = takeSpot()
        if (!spot) continue
        r.obj.position.set(spot.x + ctx.rand.f(-0.3, 0.3), 0, spot.z + ctx.rand.f(-0.3, 0.3))
        r.obj.rotation.y = spot.rotY + ctx.rand.f(-0.5, 0.5)
        ctx.shopRoot.add(r.obj)
      }
      ctx.manifest.push(`decor:${name}`)
    } catch (e) {
      console.warn('[placeDecor] failed:', name, e)
    }
  }
}
