// 地面生成器：店铺脚下的广场/道路/草地等（groundRoot 独立于建筑，飞行时留在原地）
import * as THREE from 'three/webgpu'
import { reg } from './registry.js'
import {
  box, mesh, group, cyl, sphere, canvasTexture, cloneRepeat, col, hsl, stdMat,
  extrudeUp, roundRect,
} from './helpers.js'
import { makeRng } from '../core/rng.js'
import { paintGroundPlaza, paintGroundRoad, paintGroundGrass, paintGroundCyber } from './textures.js'

// ---------- 平台形状 ----------
function platformShape(ctx, margin) {
  const { bbox } = ctx.fp
  const w = bbox.w + margin * 2, d = bbox.d + margin * 2
  const cx = (bbox.minX + bbox.maxX) / 2, cz = (bbox.minZ + bbox.maxZ) / 2
  const r = Math.min(2.2, Math.min(w, d) * 0.14)
  const pts = []
  const seg = 6
  // 圆角向外凸：每个角点取朝外的 90° 弧（minx,minz→180..270 等）
  const corners = [
    [-w / 2, -d / 2, Math.PI],
    [w / 2, -d / 2, Math.PI * 1.5],
    [w / 2, d / 2, 0],
    [-w / 2, d / 2, Math.PI / 2],
  ]
  for (const [ccx, ccz, a0] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * (Math.PI / 2)
      pts.push([cx + ccx + Math.cos(a) * r, cz + ccz + Math.sin(a) * r])
    }
  }
  return { pts, w, d, cx, cz }
}

function basePlatform(ctx, painter, painterArgs) {
  const rand = makeRng(ctx.dna.seed + '#ground')
  const margin = rand.f(2.4, 3.6)
  const { pts, w, d } = platformShape(ctx, margin)
  const tex = canvasTexture(`ground-${ctx.dna.seed}-${painter.name}`, 1024, 1024, (c, tw, th) => painter(c, tw, th, ctx.dna.palette, rand, ...painterArgs))
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 })
  const plat = extrudeUp(pts, 0.3, mat, { y: -0.65 })
  const curb = extrudeUp(pts.map(([x, z]) => [x * 1.012, z * 1.012]), 0.09, ctx.materials.trim, { y: -0.68 })
  return { obj: group(plat, curb), w, d, margin, rand, tex }
}

// 散布小物（草丛/石子/花），避开店铺足迹
function scatter(ctx, base, items) {
  const { bbox } = ctx.fp
  const g = group()
  for (const it of items) {
    for (let i = 0; i < it.n; i++) {
      let x, z, ok = false
      for (let t = 0; t < 12 && !ok; t++) {
        x = base.rand.f(bbox.minX - base.margin + 0.4, bbox.maxX + base.margin - 0.4)
        z = base.rand.f(bbox.minZ - base.margin + 0.4, bbox.maxZ + base.margin - 0.4)
        const inX = x > bbox.minX - 0.7 && x < bbox.maxX + 0.7
        const inZ = z > bbox.minZ - 0.7 && z < bbox.maxZ + 0.7
        ok = !(inX && inZ)
      }
      if (!ok) continue
      const o = it.make(base.rand)
      o.position.set(x, -0.35, z)
      o.rotation.y = base.rand.f(0, Math.PI * 2)
      g.add(o)
    }
  }
  return g
}

function pebble(rand, s = 1) {
  return sphere(rand.f(0.08, 0.2) * s, stdMat({ color: col([30, 10, 55 + rand.f(-15, 15)], null, 0, 0, 0), roughness: 0.95 }), {
    s: [1, rand.f(0.5, 0.8), rand.f(0.8, 1.2)], p: [0, 0.05, 0],
  })
}

function grassTuft(rand) {
  const g = group()
  const n = rand.i(4, 7)
  for (let i = 0; i < n; i++) {
    const a = rand.f(0, Math.PI * 2), len = rand.f(0.22, 0.42)
    const blade = mesh(new THREE.ConeGeometry(0.02, len, 4), stdMat({ color: col([rand.f(85, 130), 45, rand.f(30, 45)]), roughness: 0.9 }), {
      p: [Math.cos(a) * rand.f(0, 0.08), len / 2, Math.sin(a) * rand.f(0, 0.08)],
      r: [Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3],
    })
    blade.castShadow = false
    g.add(blade)
  }
  return g
}

function flowerDot(rand) {
  const g = grassTuft(rand)
  const c = col([rand.pick([0, 30, 50, 330, 280, 200]), 80, 70])
  for (let i = 0; i < rand.i(2, 4); i++) {
    g.add(sphere(0.05, stdMat({ color: c, roughness: 0.8 }), {
      p: [rand.f(-0.1, 0.1), rand.f(0.2, 0.36), rand.f(-0.1, 0.1)], cast: false,
    }))
  }
  return g
}

// ---------- 8 种地面 ----------
export const genGroundPlaza = reg('ground', 'groundPlaza', (ctx) => {
  const base = basePlatform(ctx, paintGroundPlaza, [])
  const g = group(base.obj, scatter(ctx, base, [
    { n: ctx.rand.i(2, 4), make: (r) => pebble(r) },
  ]))
  // 路缘排水格栅
  const drain = box(0.5, 0.06, 0.3, ctx.materials.trim, {
    p: [ctx.fp.bbox.minX + 0.5, -0.36, ctx.fp.bbox.maxZ + 1.2],
  })
  g.add(drain)
  return { obj: g, kind: 'plaza' }
})

export const genGroundRoad = reg('ground', 'groundRoad', (ctx) => {
  const base = basePlatform(ctx, paintGroundRoad, [])
  const g = group(base.obj, scatter(ctx, base, [
    { n: ctx.rand.i(2, 3), make: (r) => pebble(r, 0.7) },
  ]))
  return { obj: g, kind: 'road' }
})

function paintCobble(c, w, h, pal, rand) {
  c.fillStyle = hsl(...pal.ground.map((v, j) => j === 2 ? v * 0.5 : v))
  c.fillRect(0, 0, w, h)
  const s = w / 14
  for (let y = 0; y < h; y += s) {
    for (let x = 0; x < w; x += s) {
      const off = (Math.floor(y / s) % 2) * s / 2
      const dl = rand.f(-10, 10)
      c.fillStyle = hsl(pal.ground[0] + rand.f(-12, 12), pal.ground[1] * 0.8, 28 + dl)
      c.beginPath()
      c.roundRect(x + off + 3, y + 3, s - 6, s - 6, s * 0.28)
      c.fill()
    }
  }
}

export const genGroundCobble = reg('ground', 'groundCobble', (ctx) => {
  const base = basePlatform(ctx, paintCobble, [])
  return { obj: group(base.obj, scatter(ctx, base, [
    { n: ctx.rand.i(3, 5), make: (r) => pebble(r) },
    { n: ctx.rand.i(1, 2), make: (r) => flowerDot(r) },
  ])), kind: 'cobble' }
})

function paintStonePath(c, w, h, pal, rand) {
  paintGroundGrass(c, w, h, pal, rand)
  // 中间踏石小径（沿 +Z 方向）
  const n = 7
  for (let i = 0; i < n; i++) {
    const y = h * (i + 0.5) / n
    const x = w / 2 + rand.f(-w * 0.05, w * 0.05)
    const rw = rand.f(w * 0.09, w * 0.13)
    c.fillStyle = hsl(35, 12, 62 + rand.f(-8, 8))
    c.beginPath()
    c.ellipse(x, y, rw, rw * rand.f(0.6, 0.8), rand.f(-0.2, 0.2), 0, Math.PI * 2)
    c.fill()
    c.fillStyle = 'rgba(0,0,0,0.18)'
    c.beginPath()
    c.ellipse(x, y + rw * 0.28, rw, rw * 0.4, 0, 0, Math.PI * 2)
    c.fill()
  }
}

export const genGroundStonePath = reg('ground', 'groundStonePath', (ctx) => {
  const base = basePlatform(ctx, paintStonePath, [])
  return { obj: group(base.obj, scatter(ctx, base, [
    { n: ctx.rand.i(5, 9), make: (r) => grassTuft(r) },
    { n: ctx.rand.i(2, 4), make: (r) => flowerDot(r) },
    { n: ctx.rand.i(2, 3), make: (r) => pebble(r) },
  ])), kind: 'stonePath' }
})

export const genGroundGrass = reg('ground', 'groundGrass', (ctx) => {
  const base = basePlatform(ctx, paintGroundGrass, [])
  const g = group(base.obj, scatter(ctx, base, [
    { n: ctx.rand.i(8, 14), make: (r) => grassTuft(r) },
    { n: ctx.rand.i(4, 7), make: (r) => flowerDot(r) },
    { n: ctx.rand.i(2, 4), make: (r) => pebble(r) },
  ]))
  // 小灌木
  const bush = sphere(ctx.rand.f(0.5, 0.8), stdMat({ color: col([105, 40, 34]), roughness: 0.95 }), {
    p: [ctx.fp.bbox.minX - 1.4, 0, ctx.fp.bbox.minZ - 1.2], s: [1, 0.8, 1],
  })
  g.add(bush)
  return { obj: g, kind: 'grass' }
})

export const genGroundCyberGrid = reg('ground', 'groundCyberGrid', (ctx) => {
  const base = basePlatform(ctx, paintGroundCyber, [])
  const g = group(base.obj)
  // 发光路缘线
  const { bbox } = ctx.fp
  const glowMat = stdMat({ color: 0x0a0a12, emissive: col(ctx.dna.palette.glow), emissiveIntensity: 2.2, roughness: 0.4 })
  for (const [x, z, w2, d2] of [
    [bbox.minX - 1.8, (bbox.minZ + bbox.maxZ) / 2, 0.08, bbox.d + 3.4],
    [bbox.maxX + 1.8, (bbox.minZ + bbox.maxZ) / 2, 0.08, bbox.d + 3.4],
  ]) {
    g.add(box(w2, 0.04, d2, glowMat, { p: [x, -0.33, z], cast: false }))
  }
  // 全息投影桩
  const holo = cyl(0.06, 0.1, 1.1, ctx.materials.trim, { p: [bbox.minX - 2.4, 0.2, bbox.maxZ + 1.6] })
  g.add(holo, sphere(0.16, glowMat, { p: [bbox.minX - 2.4, 0.9, bbox.maxZ + 1.6], cast: false }))
  return { obj: g, kind: 'cyberGrid' }
})

function paintSand(c, w, h, pal, rand) {
  c.fillStyle = hsl(38, 42, 72)
  c.fillRect(0, 0, w, h)
  for (let i = 0; i < 2600; i++) {
    c.fillStyle = `hsla(${rand.f(30, 48)},${rand.f(30, 50)}%,${rand.f(58, 82)}%,0.5)`
    c.fillRect(rand.f(0, w), rand.f(0, h), rand.f(1.5, 3.5), rand.f(1, 2.5))
  }
  // 风纹
  c.strokeStyle = 'rgba(120,90,50,0.25)'
  for (let i = 0; i < 14; i++) {
    c.lineWidth = rand.f(1, 3)
    c.beginPath()
    const y = rand.f(0, h)
    c.moveTo(0, y)
    for (let x = 0; x <= w; x += w / 8) c.quadraticCurveTo(x + w / 16, y + rand.f(-18, 18), x + w / 8, y + rand.f(-10, 10))
    c.stroke()
  }
}

export const genGroundSand = reg('ground', 'groundSand', (ctx) => {
  const base = basePlatform(ctx, paintSand, [])
  const g = group(base.obj, scatter(ctx, base, [
    { n: ctx.rand.i(3, 6), make: (r) => pebble(r, 1.2) },
  ]))
  // 枯木桩 + 仙人掌
  const stump = cyl(0.22, 0.3, 0.5, stdMat({ color: 0x8a6b47, roughness: 1 }), {
    p: [ctx.fp.bbox.maxX + 1.8, -0.1, ctx.fp.bbox.minZ - 1.4],
  })
  g.add(stump)
  const cactus = group(
    cyl(0.28, 0.32, 1.3, stdMat({ color: col([95, 35, 38]), roughness: 0.9 }), { p: [0, 0.65, 0] }),
    cyl(0.14, 0.16, 0.5, stdMat({ color: col([95, 35, 38]), roughness: 0.9 }), { p: [0.4, 0.85, 0], r: [0, 0, -0.5] }),
  )
  cactus.position.set(ctx.fp.bbox.minX - 2, -0.35, ctx.fp.bbox.maxZ + 1.8)
  g.add(cactus)
  return { obj: g, kind: 'sand' }
})

function paintWoodDeck(c, w, h, pal, rand) {
  c.fillStyle = hsl(...pal.ground.map((v, j) => j === 2 ? v * 0.55 : v))
  c.fillRect(0, 0, w, h)
  const pw = w / 12
  for (let i = 0; i < 12; i++) {
    c.fillStyle = hsl(pal.ground[0] + rand.f(-8, 8), pal.ground[1] * 0.6, 34 + rand.f(-8, 8))
    c.fillRect(i * pw + 2, 0, pw - 4, h)
    c.fillStyle = 'rgba(0,0,0,0.35)'
    c.fillRect(i * pw + pw - 5, 0, 4, h)
    for (let k = 0; k < 3; k++) {
      c.fillStyle = 'rgba(0,0,0,0.25)'
      c.fillRect(i * pw + rand.f(6, pw - 10), rand.f(0, h), rand.f(2, 5), rand.f(10, 40))
    }
  }
}

export const genGroundWoodDeck = reg('ground', 'groundWoodDeck', (ctx) => {
  const base = basePlatform(ctx, paintWoodDeck, [])
  const g = group(base.obj, scatter(ctx, base, [
    { n: ctx.rand.i(2, 4), make: (r) => flowerDot(r) },
  ]))
  return { obj: g, kind: 'woodDeck' }
})

export const genGroundSnow = reg('ground', 'groundSnow', (ctx) => {
  const rand = makeRng(ctx.dna.seed + '#g2')
  const base = basePlatform(ctx, (c, w, h, pal) => {
    c.fillStyle = hsl(210, 18, 88)
    c.fillRect(0, 0, w, h)
    for (let i = 0; i < 1800; i++) {
      c.fillStyle = `hsla(210,${rand.f(8, 24)}%,${rand.f(80, 98)}%,0.6)`
      c.beginPath()
      c.ellipse(rand.f(0, w), rand.f(0, h), rand.f(2, 7), rand.f(2, 6), rand.f(0, 3), 0, Math.PI * 2)
      c.fill()
    }
  }, [])
  const g = group(base.obj)
  // 雪堆
  for (let i = 0; i < 4; i++) {
    const a = rand.f(0, Math.PI * 2), r = rand.f(2.8, 4.2)
    g.add(sphere(rand.f(0.4, 0.75), stdMat({ color: 0xf4f8fc, roughness: 0.95 }), {
      p: [Math.cos(a) * r, -0.42, Math.sin(a) * r + (ctx.fp.bbox.minZ + ctx.fp.bbox.maxZ) / 2], s: [1, 0.5, 1],
    }))
  }
  return { obj: g, kind: 'snow' }
})

// ---------- 入口 ----------
const GROUND_GENS = {
  plaza: genGroundPlaza, road: genGroundRoad, cobble: genGroundCobble,
  stonePath: genGroundStonePath, grass: genGroundGrass, cyberGrid: genGroundCyberGrid,
  sand: genGroundSand, woodDeck: genGroundWoodDeck, snow: genGroundSnow,
}

export function createGround(ctx) {
  const bias = ctx.dna.style.groundBias || []
  const kind = ctx.dna.eggEffects.lighting === 'snow'
    ? 'snow'
    : (bias.length ? ctx.rand.pick(bias) : 'plaza')
  const gen = GROUND_GENS[kind] || GROUND_GENS.plaza
  const out = gen(ctx)
  ctx.manifest.push(`ground:${kind}`)
  return out
}
