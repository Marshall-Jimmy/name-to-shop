// 飞行件生成器：只加在屋顶，不改建筑体。提供推进视觉 + 动画
import * as THREE from 'three/webgpu'
import { reg } from './registry.js'
import { box, mesh, group, cyl, sphere, cone, torus, col, stdMat, glowMat } from './helpers.js'
import { makeRng } from '../core/rng.js'

const FLIGHT_Y = 0 // 各 rig 以自身底面为 y=0，由 building 摆到屋顶顶

function balloonShape(mat, r = 0.55) {
  return sphere(r, mat, { s: [1, 1.18, 1], p: [0, r * 1.2, 0], seg: 20, segY: 16 })
}

function flameCone(ctx, r, len, color) {
  const inner = cone(r, len, glowMat(color, 3.2, 0x331a05), { p: [0, -len / 2 - 0.1, 0], r: [Math.PI, 0, 0], cast: false })
  const outer = cone(r * 1.45, len * 1.35, glowMat(color, 1.4, 0x28130a), { p: [0, -len * 0.72 - 0.1, 0], r: [Math.PI, 0, 0], cast: false })
  const g = group(inner, outer)
  let t = 0
  ctx.animate.push({
    update(dt) {
      t += dt
      const s = 0.85 + Math.sin(t * 18) * 0.12 + Math.sin(t * 7.3) * 0.06
      inner.scale.set(s, 1 + (1 - s) * 0.5, s)
      outer.scale.set(2 - s, s * 0.96, 2 - s)
    },
  })
  return g
}

export const genFlightBalloons = reg('flight', 'flightBalloons', (ctx) => {
  const rand = makeRng(ctx.dna.seed + '#fl')
  const g = group()
  const n = rand.i(4, 7)
  const R = Math.min(ctx.fp.bbox.w, ctx.fp.bbox.d) * rand.f(0.42, 0.62)
  const lifts = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand.f(-0.3, 0.3)
    const x = Math.cos(a) * R * rand.f(0.5, 1), z = Math.sin(a) * R * rand.f(0.5, 1)
    const h = rand.f(2.2, 4.2)
    const hue = (ctx.dna.palette.accent[0] + rand.f(-50, 50) + 360) % 360
    const mat = stdMat({ color: col([hue, 78, rand.f(55, 68)]), roughness: 0.35 })
    const b = group(
      balloonShape(mat, rand.f(0.45, 0.68)),
      cone(0.07, 0.14, mat, { p: [0, 0.02, 0], r: [Math.PI, 0, 0], cast: false }),
      cyl(0.008, 0.008, h, stdMat({ color: 0xeee6d8, roughness: 0.9 }), { p: [0, h / 2, 0], cast: false }),
    )
    b.position.set(x, 0.4, z)
    g.add(b)
    lifts.push({ b, ph: rand.f(0, 9), amp: rand.f(0.08, 0.2), spd: rand.f(0.7, 1.6) })
  }
  ctx.animate.push({
    t: 0, update(dt) {
      this.t += dt
      for (const l of lifts) l.b.position.y = 0.4 + Math.sin(this.t * l.spd + l.ph) * l.amp + l.amp
    },
  })
  return { obj: g, kind: 'balloons' }
})

export const genFlightPropeller = reg('flight', 'flightPropeller', (ctx) => {
  const rand = makeRng(ctx.dna.seed + '#fl')
  const g = group()
  const mastH = rand.f(1.6, 2.4)
  g.add(cyl(0.09, 0.13, mastH, ctx.materials.trim, { p: [0, mastH / 2, 0] }))
  g.add(box(0.4, 0.22, 0.4, ctx.materials.main, { p: [0, mastH + 0.08, 0] }))
  const rotor = group()
  const blades = rand.i(2, 4)
  const bladeMat = ctx.materials.trim
  const len = rand.f(1.6, 2.4)
  for (let i = 0; i < blades; i++) {
    const b = box(len, 0.05, 0.22, bladeMat, {
      p: [Math.cos(i / blades * Math.PI * 2) * len / 2, 0, Math.sin(i / blades * Math.PI * 2) * len / 2],
      r: [0, -i / blades * Math.PI * 2, 0],
    })
    rotor.add(b)
  }
  rotor.add(cyl(0.07, 0.07, 0.16, ctx.materials.glowMetal, { p: [0, 0.04, 0] }))
  rotor.position.set(0, mastH + 0.26, 0)
  g.add(rotor)
  const spd = rand.f(9, 14) * (rand.chance(0.5) ? 1 : -1)
  ctx.animate.push({ update(dt) { rotor.rotation.y += spd * dt } })
  return { obj: g, kind: 'propeller' }
})

export const genFlightRocket = reg('flight', 'flightRocket', (ctx) => {
  const rand = makeRng(ctx.dna.seed + '#fl')
  const g = group()
  const n = rand.i(1, 3)
  const metal = stdMat({ color: 0xd8dde2, metalness: 0.85, roughness: 0.3 })
  for (let i = 0; i < n; i++) {
    const x = n === 1 ? 0 : (i - (n - 1) / 2) * 1.3
    const h = rand.f(1.8, 2.6)
    const b = group(
      cyl(0.38, 0.46, h, metal, { p: [0, h / 2 + 0.2, 0], seg: 18 }),
      cone(0.38, 0.7, stdMat({ color: col(ctx.dna.palette.accent), roughness: 0.4 }), { p: [0, h + 0.55, 0], seg: 18 }),
    )
    for (let f = 0; f < 3; f++) {
      const a = f / 3 * Math.PI * 2
      b.add(box(0.06, 0.6, 0.34, stdMat({ color: col(ctx.dna.palette.main), roughness: 0.5 }), {
        p: [Math.cos(a) * 0.48, 0.42, Math.sin(a) * 0.48], r: [0, -a, 0],
      }))
    }
    b.add(flameCone(ctx, 0.3, rand.f(1.2, 2.0), 0xff9a3d))
    b.position.set(x, 0, rand.f(-0.3, 0.3))
    g.add(b)
  }
  return { obj: g, kind: 'rocket' }
})

export const genFlightWings = reg('flight', 'flightWings', (ctx) => {
  const rand = makeRng(ctx.dna.seed + '#fl')
  const g = group()
  const wingSpan = rand.f(1.6, 2.4)
  const feathers = 5
  const makeWing = (side) => {
    const w = group()
    const mat = stdMat({ color: col(ctx.dna.palette.trim), metalness: 0.6, roughness: 0.35 })
    for (let i = 0; i < feathers; i++) {
      const t = i / (feathers - 1)
      const feather = box((1 - t) * 0.9 + 0.25, 0.05, 0.32, mat, {
        p: [side * (0.4 + i * wingSpan / feathers), -t * 0.8, 0], r: [0, 0, side * t * 0.35],
      })
      w.add(feather)
    }
    // 机械关节
    w.add(sphere(0.18, ctx.materials.glowMetal, { p: [0, 0.5, 0] }))
    w.add(cyl(0.05, 0.05, 1.0, ctx.materials.trim, { p: [0, 0, 0], r: [0, 0, Math.PI / 2] }))
    return w
  }
  const wl = makeWing(-1), wr = makeWing(1)
  g.add(wl, wr)
  let t = 0
  ctx.animate.push({
    update(dt) {
      t += dt
      const f = Math.sin(t * rand.f(2.2, 3)) * 0.3
      wl.rotation.z = f; wr.rotation.z = -f
    },
  })
  return { obj: g, kind: 'wings' }
})

export const genFlightHoverRings = reg('flight', 'flightHoverRings', (ctx) => {
  const rand = makeRng(ctx.dna.seed + '#fl')
  const g = group()
  const n = rand.i(2, 3)
  const rings = []
  for (let i = 0; i < n; i++) {
    const r = rand.f(0.8, 1.4) * (1 - i * 0.18)
    const ring = torus(r, 0.09, glowMat(col(ctx.dna.palette.glow).getHex(), 2.4), {
      p: [0, 0.6 + i * 0.85, 0], r: [Math.PI / 2, 0, 0], seg: 40, cast: false,
    })
    g.add(ring)
    rings.push({ ring, ph: rand.f(0, 9), spd: rand.f(0.8, 1.8) })
  }
  ctx.animate.push({
    t: 0, update(dt) {
      this.t += dt
      for (const r of rings) {
        r.ring.rotation.z = this.t * r.spd
        const s = 1 + Math.sin(this.t * 2 + r.ph) * 0.08
        r.ring.scale.set(s, s, 1)
      }
    },
  })
  return { obj: g, kind: 'hoverRings' }
})

function cloudPuff(ctx, s, seedRand) {
  const g = group()
  const mat = stdMat({ color: 0xf2f4f8, roughness: 1, transparent: true, opacity: 0.96 })
  const n = seedRand.i(4, 6)
  for (let i = 0; i < n; i++) {
    g.add(sphere(seedRand.f(0.3, 0.62) * s, mat, {
      p: [seedRand.f(-0.7, 0.7) * s, seedRand.f(-0.15, 0.2) * s, seedRand.f(-0.5, 0.5) * s],
      cast: false,
    }))
  }
  return g
}

export const genFlightClouds = reg('flight', 'flightClouds', (ctx) => {
  const rand = makeRng(ctx.dna.seed + '#fl')
  const g = group()
  const puffs = []
  const n = rand.i(5, 8)
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand.f(-0.4, 0.4)
    const r = Math.min(ctx.fp.bbox.w, ctx.fp.bbox.d) * rand.f(0.4, 0.72)
    const p = cloudPuff(ctx, rand.f(0.9, 1.5), rand)
    p.position.set(Math.cos(a) * r, rand.f(0.2, 1.2), Math.sin(a) * r)
    g.add(p)
    puffs.push({ p, ph: rand.f(0, 9), amp: rand.f(0.06, 0.16), spd: rand.f(0.5, 1.1) })
  }
  ctx.animate.push({
    t: 0, update(dt) {
      this.t += dt
      for (const u of puffs) u.p.position.y = 0.6 + Math.sin(this.t * u.spd + u.ph) * u.amp
    },
  })
  return { obj: g, kind: 'clouds' }
})

export const genFlightJet = reg('flight', 'flightJet', (ctx) => {
  const rand = makeRng(ctx.dna.seed + '#fl')
  const g = group()
  const metal = stdMat({ color: 0x9aa4ad, metalness: 0.9, roughness: 0.28 })
  for (const side of [-1, 1]) {
    const t = group(
      cyl(0.3, 0.24, 1.5, metal, { p: [0, 0.95, 0], seg: 14 }),
      torus(0.3, 0.05, ctx.materials.trim, { p: [0, 1.65, 0], r: [Math.PI / 2, 0, 0], cast: false }),
      cyl(0.1, 0.14, 0.5, metal, { p: [0, 0.1, 0], seg: 10 }),
    )
    t.add(flameCone(ctx, 0.2, rand.f(0.9, 1.5), 0x7ad0ff))
    t.position.set(side * rand.f(1.2, 1.9), 0, rand.f(-0.2, 0.2))
    g.add(t)
  }
  return { obj: g, kind: 'jet' }
})

// 彩蛋：skibidi 马桶飞行器
export const genFlightToilet = reg('flight', 'flightToilet', (ctx) => {
  const rand = makeRng(ctx.dna.seed + '#fl')
  const g = group()
  const porcelain = stdMat({ color: 0xf4f6f8, roughness: 0.25 })
  const seat = group(
    cyl(0.62, 0.5, 0.75, porcelain, { p: [0, 0.95, 0], seg: 20 }),
    torus(0.55, 0.12, porcelain, { p: [0, 1.35, 0], r: [Math.PI / 2, 0, 0], seg: 24, cast: false }),
    box(0.9, 0.5, 0.32, porcelain, { p: [0, 1.65, -0.42] }),
  )
  const rotor = group()
  for (let i = 0; i < 2; i++) {
    rotor.add(box(2.6, 0.05, 0.24, ctx.materials.trim, { r: [0, i * Math.PI / 2, 0] }))
  }
  rotor.position.set(0, 2.25, -0.42)
  seat.add(rotor)
  seat.add(cyl(0.05, 0.05, 0.6, ctx.materials.trim, { p: [0, 1.95, -0.42] }))
  const flush = glowMat(0x66d9ff, 2.6)
  seat.add(box(0.2, 0.12, 0.08, flush, { p: [0.32, 1.78, -0.26], cast: false }))
  g.add(seat)
  // 下方水花涡流
  const vortex = torus(0.7, 0.06, glowMat(0x9fe8ff, 1.6), { p: [0, 0.15, 0], r: [Math.PI / 2, 0, 0], seg: 36, cast: false })
  g.add(vortex)
  ctx.animate.push({
    t: 0, update(dt) {
      this.t += dt
      rotor.rotation.y += 13 * dt
      vortex.rotation.z = this.t * 4
      const s = 1 + Math.sin(this.t * 6) * 0.15
      vortex.scale.set(s, s, 1)
    },
  })
  return { obj: g, kind: 'toilet' }
})

// 彩蛋：御剑飞行
export const genFlightSword = reg('flight', 'flightSword', (ctx) => {
  const rand = makeRng(ctx.dna.seed + '#fl')
  const g = group()
  const n = rand.i(3, 6)
  const swords = []
  const bladeMat = stdMat({ color: 0xcfd6dd, metalness: 0.95, roughness: 0.15 })
  const guardMat = stdMat({ color: 0xd9a441, metalness: 0.9, roughness: 0.3 })
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const r = rand.f(1.6, 2.6)
    const s = group(
      box(0.09, 2.0, 0.03, bladeMat, { p: [0, 1.0, 0] }),
      cone(0.09, 0.3, bladeMat, { p: [0, 2.15, 0], cast: false }),
      box(0.4, 0.08, 0.08, guardMat, { p: [0, 0.02, 0] }),
      cyl(0.03, 0.03, 0.4, stdMat({ color: 0x6b4a2a, roughness: 0.8 }), { p: [0, -0.25, 0] }),
      sphere(0.06, guardMat, { p: [0, -0.48, 0], cast: false }),
      sphere(0.1, glowMat(0xaee8ff, 1.8), { p: [0, 1.0, 0], s: [0.5, 1.6, 0.5], cast: false }),
    )
    s.position.set(Math.cos(a) * r, 1.4, Math.sin(a) * r)
    s.rotation.z = 0.12
    g.add(s)
    swords.push({ s, a, r, spd: rand.f(0.3, 0.7), bob: rand.f(0, 9) })
  }
  ctx.animate.push({
    t: 0, update(dt) {
      this.t += dt
      for (const sw of swords) {
        sw.a += sw.spd * dt
        sw.s.position.x = Math.cos(sw.a) * sw.r
        sw.s.position.z = Math.sin(sw.a) * sw.r
        sw.s.position.y = 1.4 + Math.sin(this.t * 1.6 + sw.bob) * 0.25
        sw.s.rotation.y = -sw.a + Math.PI / 2
      }
    },
  })
  return { obj: g, kind: 'sword' }
})

// 彩蛋：风火轮
export const genFlightFireWheels = reg('flight', 'flightFireWheels', (ctx) => {
  const rand = makeRng(ctx.dna.seed + '#fl')
  const g = group()
  const wheels = []
  const R = Math.min(ctx.fp.bbox.w, ctx.fp.bbox.d) * 0.5 + 0.7
  for (const side of [-1, 1]) {
    const w = group(
      torus(0.75, 0.14, glowMat(0xff7b2d, 2.6), { r: [0, Math.PI / 2, 0], seg: 32, cast: false }),
      torus(0.75, 0.05, glowMat(0xffe08a, 3.4), { r: [0, Math.PI / 2, 0], seg: 32, cast: false }),
    )
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * Math.PI * 2
      w.add(box(0.1, 0.24, 0.06, stdMat({ color: 0xd9a441, metalness: 0.9, roughness: 0.3 }), {
        p: [0, Math.cos(a) * 0.75, Math.sin(a) * 0.75], r: [-a, 0, 0], cast: false,
      }))
    }
    w.position.set(side * R, 1.2, 0)
    w.rotation.z = Math.PI / 2
    g.add(w)
    wheels.push({ w, dir: side })
  }
  ctx.animate.push({
    t: 0, update(dt) {
      this.t += dt
      for (const u of wheels) {
        u.w.rotation.x += 9 * dt * u.dir
        const s = 1 + Math.sin(this.t * 5) * 0.05
        u.w.scale.setScalar(s)
      }
    },
  })
  return { obj: g, kind: 'fireWheels' }
})

// 雨伞飞行（欢乐满人间）
export const genFlightUmbrella = reg('flight', 'flightUmbrella', (ctx) => {
  const rand = makeRng(ctx.dna.seed + '#fl')
  const g = group()
  const shaftH = rand.f(2.2, 3)
  const canopy = group()
  const seg = 8
  const clothMat = stdMat({ color: col(ctx.dna.palette.accent), roughness: 0.7, side: THREE.DoubleSide })
  for (let i = 0; i < seg; i++) {
    const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2
    const shape = new THREE.Shape()
    shape.moveTo(0, 0)
    shape.quadraticCurveTo(Math.cos((a0 + a1) / 2) * 1.1, -0.45, Math.cos(a1) * 1.15, -0.55)
    shape.lineTo(0, 0)
    const m = mesh(new THREE.ShapeGeometry(shape, 6), clothMat, { cast: true })
    m.rotation.x = -Math.PI / 2
    canopy.add(m)
  }
  canopy.rotation.z = Math.PI
  canopy.position.y = shaftH
  g.add(canopy, cyl(0.05, 0.05, shaftH, ctx.materials.trim, { p: [0, shaftH / 2, 0] }))
  g.add(cyl(0.06, 0.06, 0.3, stdMat({ color: 0x333333, roughness: 0.8 }), { p: [0, 0.1, 0], r: [0, 0, 0.5] }))
  ctx.animate.push({
    t: 0, update(dt) {
      this.t += dt
      canopy.rotation.y += 0.8 * dt
      canopy.position.y = shaftH + Math.sin(this.t * 2) * 0.1
    },
  })
  return { obj: g, kind: 'umbrella' }
})

// ---------- 入口 ----------
const FLIGHT_GENS = {
  balloons: genFlightBalloons, propeller: genFlightPropeller, rocket: genFlightRocket,
  wings: genFlightWings, hoverRings: genFlightHoverRings, clouds: genFlightClouds,
  jet: genFlightJet, toilet: genFlightToilet, sword: genFlightSword,
  fireWheels: genFlightFireWheels, umbrella: genFlightUmbrella,
}

const EGG_FLIGHT_MAP = {
  cloud: 'clouds', toilet: 'toilet', sword: 'sword', fireWheels: 'fireWheels', propeller: 'propeller',
}

export function createFlightRig(ctx) {
  const rand = makeRng(ctx.dna.seed + '#flight')
  let kind = null
  const eggF = ctx.dna.eggEffects.flight
  if (eggF && EGG_FLIGHT_MAP[eggF]) kind = EGG_FLIGHT_MAP[eggF]
  else {
    // 风格偏好
    const styleFlight = {
      cyberpunk: ['hoverRings', 'jet', 'propeller'],
      steampunk: ['propeller', 'balloons', 'rocket'],
      showa: ['balloons', 'umbrella'],
      futuristic: ['hoverRings', 'jet', 'rocket'],
      fairytale: ['balloons', 'clouds', 'umbrella'],
      wuxia: ['sword', 'clouds', 'fireWheels'],
    }
    const pool = styleFlight[ctx.dna.style.id] || ['balloons', 'propeller', 'hoverRings', 'clouds', 'wings', 'rocket']
    kind = rand.pick(pool)
  }
  const gen = FLIGHT_GENS[kind]
  if (!gen) return null
  const out = gen(ctx)
  ctx.manifest.push(`flight:${kind}`)
  out.propulsion = kind
  return out
}
