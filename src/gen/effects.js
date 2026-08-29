// 粒子特效系统：THREE.Points + Canvas 精灵，全部由种子驱动
import * as THREE from 'three/webgpu'
import { reg } from './registry.js'
import { canvasTexture, col, hsl } from './helpers.js'
import { makeRng } from '../core/rng.js'

const FONT = '"PingFang SC","Microsoft YaHei","Segoe UI Emoji","Apple Color Emoji",sans-serif'

function spriteTex(key, draw) {
  return canvasTexture(`sprite-${key}`, 64, 64, (c, w, h) => {
    c.clearRect(0, 0, w, h)
    draw(c, w, h)
  })
}

const SPRITES = {
  soft: () => spriteTex('soft', (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.4, 'rgba(255,255,255,0.5)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    c.fillStyle = g
    c.fillRect(0, 0, w, h)
  }),
  star: () => spriteTex('star', (c, w, h) => {
    c.fillStyle = '#fff'
    c.translate(w / 2, h / 2)
    c.beginPath()
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? w / 2 - 4 : w / 8
      const a = -Math.PI / 2 + i * Math.PI / 5
      c[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * r, Math.sin(a) * r)
    }
    c.closePath()
    c.fill()
  }),
  heart: () => spriteTex('heart', (c, w, h) => {
    c.fillStyle = '#fff'
    c.translate(w / 2, h / 2 + 4)
    c.beginPath()
    c.moveTo(0, 14)
    c.bezierCurveTo(-26, -4, -14, -22, 0, -10)
    c.bezierCurveTo(14, -22, 26, -4, 0, 14)
    c.fill()
  }),
  coin: () => spriteTex('coin', (c, w, h) => {
    c.fillStyle = '#fff'
    c.beginPath()
    c.arc(w / 2, h / 2, w / 2 - 6, 0, Math.PI * 2)
    c.fill()
    c.strokeStyle = 'rgba(0,0,0,0.4)'
    c.lineWidth = 4
    c.beginPath()
    c.arc(w / 2, h / 2, w / 2 - 14, 0, Math.PI * 2)
    c.stroke()
  }),
  snowflake: () => spriteTex('snow', (c, w, h) => {
    c.strokeStyle = '#fff'
    c.lineWidth = 5
    c.translate(w / 2, h / 2)
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3
      c.beginPath()
      c.moveTo(0, 0)
      c.lineTo(Math.cos(a) * 22, Math.sin(a) * 22)
      c.stroke()
      c.beginPath()
      c.moveTo(Math.cos(a) * 13, Math.sin(a) * 13)
      c.lineTo(Math.cos(a + 0.5) * 21, Math.sin(a + 0.5) * 21)
      c.stroke()
    }
  }),
  paw: () => spriteTex('paw', (c, w, h) => {
    c.fillStyle = '#fff'
    c.beginPath()
    c.ellipse(w / 2, h * 0.62, 13, 10, 0, 0, Math.PI * 2)
    c.fill()
    for (const [dx, dy, s] of [[-13, -8, 5.5], [-5, -15, 5], [5, -15, 5], [13, -8, 5.5]]) {
      c.beginPath()
      c.arc(w / 2 + dx, h / 2 + dy, s, 0, Math.PI * 2)
      c.fill()
    }
  }),
  petal: () => spriteTex('petal', (c, w, h) => {
    c.fillStyle = '#fff'
    c.translate(w / 2, h / 2)
    c.beginPath()
    c.ellipse(0, 0, 8, 20, 0.5, 0, Math.PI * 2)
    c.fill()
  }),
  glyph: (ch) => spriteTex('g-' + ch, (c, w, h) => {
    c.font = `44px ${FONT}`
    c.textAlign = 'center'; c.textBaseline = 'middle'
    c.fillStyle = '#fff'
    c.fillText(ch, w / 2, h / 2)
  }),
}

function makePoints(count, sprite, color, size, opts = {}) {
  const geo = new THREE.BufferGeometry()
  const pos = new Float32Array(count * 3)
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  // 节点材质系统下贴图需要 uv 属性（Points 无内置 uv）
  const uv = new Float32Array(count * 2)
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  const mat = new THREE.PointsMaterial({
    map: sprite, size, color, transparent: true, opacity: opts.opacity ?? 0.9,
    blending: opts.blending || THREE.AdditiveBlending, depthWrite: false,
    sizeAttenuation: true,
  })
  const pts = new THREE.Points(geo, mat)
  pts.frustumCulled = false
  return { pts, pos, geo, mat }
}

// 通用粒子行为：每粒子有 birth/life/velocity，由 seed 决定
function particleSystem(ctx, cfg) {
  const { dna } = ctx
  const rand = makeRng(dna.seed + '#fx-' + cfg.kind)
  const boost = dna.rarityMeta.particleBoost || 0
  const count = Math.min(cfg.max, cfg.base + boost * cfg.perBoost)
  const { pts, pos } = makePoints(count, cfg.sprite(), cfg.color, cfg.size, cfg.opts)

  const P = []
  for (let i = 0; i < count; i++) P.push(cfg.spawn(rand))
  const write = () => {
    for (let i = 0; i < count; i++) {
      pos[i * 3] = P[i].x; pos[i * 3 + 1] = P[i].y; pos[i * 3 + 2] = P[i].z
    }
    pts.geometry.attributes.position.needsUpdate = true
  }
  write()
  let t = 0
  const update = (dt) => {
    t += dt
    for (let i = 0; i < count; i++) {
      const p = P[i]
      p.age += dt * p.rate
      if (p.age >= 1) { Object.assign(p, cfg.spawn(rand)); p.age = 0 }
      cfg.step(p, t, dt, rand)
    }
    write()
    if (cfg.opacityPulse) pts.material.opacity = (cfg.opts?.opacity ?? 0.9) * (0.75 + 0.25 * Math.sin(t * cfg.opacityPulse))
  }
  ctx.animate.push({ update })
  return { obj: pts, kind: cfg.kind, update }
}

// ---------- 12 彩蛋粒子 + 稀有度默认 ----------

export const genFxSparks = reg('effects', 'fxSparks', (ctx) => {
  const c = col(ctx.dna.palette.glow)
  return particleSystem(ctx, {
    kind: 'sparks', sprite: SPRITES.soft, color: c, size: 0.34, base: 46, perBoost: 20, max: 140,
    spawn: (r) => ({ x: r.f(-5, 5), y: r.f(-1, 0), z: r.f(-4, 4), vx: r.f(-0.4, 0.4), vy: r.f(1.4, 3.2), vz: r.f(-0.4, 0.4), age: r.f(0, 1), rate: r.f(0.4, 0.9) }),
    step: (p, t) => {
      p.x += p.vx * 0.016 + Math.sin(t * 3 + p.y) * 0.01
      p.y += p.vy * 0.016
      p.z += p.vz * 0.016
    },
    opacityPulse: 2,
  })
})

export const genFxSteam = reg('effects', 'fxSteam', (ctx) => particleSystem(ctx, {
  kind: 'steam', sprite: SPRITES.soft, color: 0xdde6ee, size: 0.9, base: 20, perBoost: 8, max: 60,
  opts: { opacity: 0.35, blending: THREE.NormalBlending },
  spawn: (r) => ({ x: r.f(-1.5, 1.5), y: r.f(-0.5, 0), z: r.f(-1, 1), vy: r.f(0.5, 1.1), age: r.f(0, 1), rate: r.f(0.1, 0.22) }),
  step: (p, t) => { p.y += p.vy * 0.016; p.x += Math.sin(t + p.y) * 0.008 },
}))

export const genFxBubbles = reg('effects', 'fxBubbles', (ctx) => particleSystem(ctx, {
  kind: 'bubbles', sprite: SPRITES.soft, color: 0x9fd8ff, size: 0.4, base: 24, perBoost: 10, max: 80,
  spawn: (r) => ({ x: r.f(-5, 5), y: r.f(-2, 1), z: r.f(-4, 4), vy: r.f(0.6, 1.4), w: r.f(1, 3), age: r.f(0, 1), rate: r.f(0.1, 0.2) }),
  step: (p, t) => { p.y += p.vy * 0.016; p.x += Math.sin(t * p.w + p.y) * 0.012 },
}))

export const genFxSnow = reg('effects', 'fxSnow', (ctx) => particleSystem(ctx, {
  kind: 'snow', sprite: SPRITES.snowflake, color: 0xffffff, size: 0.26, base: 60, perBoost: 30, max: 200,
  opts: { opacity: 0.85 },
  spawn: (r) => ({ x: r.f(-8, 8), y: r.f(-3, 5), z: r.f(-6, 6), vy: r.f(0.8, 1.6), sway: r.f(0.5, 2), age: r.f(0, 1), rate: r.f(0.05, 0.1) }),
  step: (p, t) => { p.y -= p.vy * 0.016; p.x += Math.sin(t * p.sway + p.y) * 0.01 },
}))

export const genFxArc = reg('effects', 'fxArc', (ctx) => {
  const sys = particleSystem(ctx, {
    kind: 'arc', sprite: SPRITES.soft, color: 0x9fd0ff, size: 0.2, base: 30, perBoost: 15, max: 90,
    spawn: (r) => ({ x: r.f(-4, 4), y: r.f(-1, 2), z: r.f(-3, 3), age: r.f(0, 1), rate: r.f(2, 5), tx: r.f(-4, 4), ty: r.f(-1, 2) }),
    step: (p, t) => {
      const k = p.age
      p.x = p.tx * (1 - k) + Math.sin(k * 40 + t * 20) * 0.3
      p.y = p.ty * (1 - k) + Math.cos(k * 37) * 0.3
    },
    opacityPulse: 8,
  })
  return sys
})

export const genFxStars = reg('effects', 'fxStars', (ctx) => {
  const c = col([50, 95, 70])
  return particleSystem(ctx, {
    kind: 'stars', sprite: SPRITES.star, color: c, size: 0.3, base: 34, perBoost: 16, max: 110,
    spawn: (r) => {
      const a = r.f(0, Math.PI * 2), rad = r.f(4, 9)
      return { x: Math.cos(a) * rad, y: r.f(-1, 4), z: Math.sin(a) * rad, a, rad, spd: r.f(0.1, 0.4), age: r.f(0, 1), rate: r.f(0.15, 0.4) }
    },
    step: (p, dt, t) => { p.a += p.spd * 0.016; p.x = Math.cos(p.a) * p.rad; p.z = Math.sin(p.a) * p.rad; p.y += Math.sin(t * 2 + p.a * 3) * 0.004 },
    opacityPulse: 1.5,
  })
})

export const genFxHearts = reg('effects', 'fxHearts', (ctx) => particleSystem(ctx, {
  kind: 'hearts', sprite: SPRITES.heart, color: 0xff6fa5, size: 0.4, base: 22, perBoost: 10, max: 70,
  spawn: (r) => ({ x: r.f(-5, 5), y: r.f(-1, 0), z: r.f(-4, 4), vy: r.f(0.8, 1.6), sway: r.f(1, 2.5), age: r.f(0, 1), rate: r.f(0.12, 0.25) }),
  step: (p, t) => { p.y += p.vy * 0.016; p.x += Math.sin(t * p.sway + p.y) * 0.014 },
}))

export const genFxCoins = reg('effects', 'fxCoins', (ctx) => particleSystem(ctx, {
  kind: 'coins', sprite: SPRITES.coin, color: 0xffd24a, size: 0.32, base: 30, perBoost: 14, max: 100,
  spawn: (r) => ({ x: r.f(-2, 2), y: r.f(-1, 0), z: r.f(-1.5, 1.5), vx: r.f(-1.6, 1.6), vy: r.f(2.2, 3.8), vz: r.f(-1, 1), age: r.f(0, 1), rate: r.f(0.3, 0.5) }),
  step: (p) => { p.y += p.vy * 0.016; p.vy -= 4.5 * 0.016; p.x += p.vx * 0.016; p.z += p.vz * 0.016 },
}))

export const genFxSparkle = reg('effects', 'fxSparkle', (ctx) => {
  const c = col(ctx.dna.palette.accent)
  return particleSystem(ctx, {
    kind: 'sparkle', sprite: SPRITES.star, color: c, size: 0.24, base: 36, perBoost: 18, max: 120,
    spawn: (r) => ({ x: r.f(-6, 6), y: r.f(-2, 3), z: r.f(-5, 5), age: r.f(0, 1), rate: r.f(0.3, 0.8), s: r.f(0.5, 1.5) }),
    step: (p, t) => { p.y += Math.sin(t * 2 + p.s * 9) * 0.002 },
    opacityPulse: 3,
  })
})

export const genFxPaw = reg('effects', 'fxPaw', (ctx) => particleSystem(ctx, {
  kind: 'paw', sprite: SPRITES.paw, color: col(ctx.dna.palette.accent), size: 0.36, base: 18, perBoost: 8, max: 60,
  spawn: (r) => ({ x: r.f(-6, 6), y: r.f(-2, 2), z: r.f(-5, 5), vy: r.f(0.3, 0.8), age: r.f(0, 1), rate: r.f(0.1, 0.2) }),
  step: (p) => { p.y += p.vy * 0.016 },
}))

export const genFxTornado = reg('effects', 'fxTornado', (ctx) => particleSystem(ctx, {
  kind: 'tornado', sprite: SPRITES.soft, color: 0xc9b48a, size: 0.5, base: 40, perBoost: 20, max: 120,
  opts: { opacity: 0.5, blending: THREE.NormalBlending },
  spawn: (r) => ({ a: r.f(0, Math.PI * 2), y: r.f(-2, 3), rad: r.f(2, 6), spd: r.f(1, 2.4), age: r.f(0, 1), rate: r.f(0.06, 0.14) }),
  step: (p) => { p.a += p.spd * 0.016; p.rad *= 1 - 0.02 * 0.016; p.y += 0.2 * 0.016; p.x = Math.cos(p.a) * p.rad; p.z = Math.sin(p.a) * p.rad },
}))

export const genFxShadowPuff = reg('effects', 'fxShadowPuff', (ctx) => particleSystem(ctx, {
  kind: 'shadowPuff', sprite: SPRITES.soft, color: 0x554a66, size: 0.8, base: 22, perBoost: 10, max: 70,
  opts: { opacity: 0.45, blending: THREE.NormalBlending },
  spawn: (r) => ({ x: r.f(-3, 3), y: r.f(-1, 1), z: r.f(-2, 2), vy: r.f(0.3, 0.8), age: r.f(0, 1), rate: r.f(0.1, 0.2) }),
  step: (p, t) => { p.y += p.vy * 0.016; p.x += Math.sin(t * 1.4 + p.y) * 0.01 },
}))

export const genFxPetals = reg('effects', 'fxPetals', (ctx) => particleSystem(ctx, {
  kind: 'petals', sprite: SPRITES.petal, color: 0xffb7d5, size: 0.3, base: 34, perBoost: 16, max: 110,
  opts: { opacity: 0.9, blending: THREE.NormalBlending },
  spawn: (r) => ({ x: r.f(-7, 7), y: r.f(-3, 4), z: r.f(-5, 5), vy: r.f(0.6, 1.2), sway: r.f(1, 3), age: r.f(0, 1), rate: r.f(0.06, 0.12) }),
  step: (p, t) => { p.y -= p.vy * 0.016; p.x += Math.sin(t * p.sway + p.y * 2) * 0.018 },
}))

export const genFxFireflies = reg('effects', 'fxFireflies', (ctx) => particleSystem(ctx, {
  kind: 'fireflies', sprite: SPRITES.soft, color: 0xd7ff6e, size: 0.22, base: 26, perBoost: 12, max: 90,
  spawn: (r) => ({ x: r.f(-6, 6), y: r.f(-1, 3), z: r.f(-5, 5), ax: r.f(0.3, 1), ay: r.f(0.4, 1.2), az: r.f(0.3, 1), ph: r.f(0, 9), age: r.f(0, 1), rate: r.f(0.05, 0.1) }),
  step: (p, t) => {
    p.x += Math.sin(t * p.ax + p.ph) * 0.012
    p.y += Math.sin(t * p.ay + p.ph * 2) * 0.008
    p.z += Math.cos(t * p.az + p.ph) * 0.012
  },
  opacityPulse: 2.5,
}))

export const genFxEmoji = (ch, color, kind) => reg('effects', 'fx' + kind, (ctx) => particleSystem(ctx, {
  kind, sprite: () => SPRITES.glyph(ch), color, size: 0.42, base: 16, perBoost: 8, max: 50,
  spawn: (r) => ({ x: r.f(-5, 5), y: r.f(-1, 0), z: r.f(-4, 4), vy: r.f(0.7, 1.5), sway: r.f(1, 2.5), age: r.f(0, 1), rate: r.f(0.1, 0.22) }),
  step: (p, t) => { p.y += p.vy * 0.016; p.x += Math.sin(t * p.sway + p.y) * 0.014 },
}))

export const genFxAfkZ = genFxEmoji('💤', 0x9db4ff, 'afkZ')
export const genFxFu = genFxEmoji('🧧', 0xff8a5c, 'fuRed')

// ---------- 入口 ----------
const FX_GENS = {
  sparks: genFxSparks, steam: genFxSteam, bubbles: genFxBubbles, snow: genFxSnow,
  arc: genFxArc, stars: genFxStars, hearts: genFxHearts, coins: genFxCoins,
  sparkle: genFxSparkle, paw: genFxPaw, tornado: genFxTornado, shadowPuff: genFxShadowPuff,
  petals: genFxPetals, fireflies: genFxFireflies,
}

// 稀有度默认粒子（无彩蛋指定时）
const RARITY_FX = { N: null, R: 'fireflies', SR: 'sparkle', SSR: 'stars', UR: 'coins' }

export function createParticles(ctx) {
  const { dna } = ctx
  let kind = dna.eggEffects.particle
  if (!kind) kind = RARITY_FX[dna.rarity]
  if (!kind) {
    // 夜景补萤火虫
    if (['night', 'rainNight', 'cyberNight'].includes(dna.lighting.id) && ctx.rand.chance(0.5)) kind = 'fireflies'
    else return null
  }
  const gen = FX_GENS[kind]
  if (!gen) return null
  const out = gen(ctx)
  ctx.manifest.push(`effects:${kind}`)
  return out
}
