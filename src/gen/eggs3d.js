// 彩蛋 3D 件：屋顶改装（龙脊/兔耳/爱心/冰晶/焦黑/坍塌/皇冠）+ 彩蛋装饰分发
import * as THREE from 'three/webgpu'
import { reg, getGen } from './registry.js'
import {
  box, mesh, group, cyl, sphere, cone, torus, plane, canvasTexture, col, hsl, stdMat, glowMat,
} from './helpers.js'
import { makeRng } from '../core/rng.js'

// ---------- 龙脊屋顶（龙/笼）----------
function dragonRidge(ctx) {
  const g = group()
  const gold = stdMat({ color: 0xe8b83a, metalness: 0.85, roughness: 0.3 })
  const dark = stdMat({ color: 0x8a3b2a, roughness: 0.6 })
  const L = ctx.fp.front.L
  const n = 7
  // 脊柱鳞片
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const x = (t - 0.5) * L * 0.92
    const h = 0.5 + Math.sin(t * Math.PI) * 0.65
    g.add(cone(0.22, h, gold, { p: [x, ctx.H + h / 2, 0], r: [0, 0, (t - 0.5) * 0.4], seg: 8 }))
    // 侧鳍
    for (const side of [-1, 1]) {
      g.add(box(0.3, 0.34, 0.06, dark, {
        p: [x - 0.18, ctx.H + h * 0.62, side * 0.28], r: [0, side * 0.3, 0.5],
      }))
    }
  }
  // 龙头（一端）
  const head = group(
    sphere(0.34, gold, { p: [0, 0.1, 0] }),
    box(0.5, 0.18, 0.3, gold, { p: [0.28, 0.02, 0] }),
    cone(0.07, 0.3, dark, { p: [0.5, 0.16, 0.08], r: [0, 0, -1.2], seg: 6 }),
    cone(0.07, 0.3, dark, { p: [0.5, 0.16, -0.08], r: [0, 0, -1.2], seg: 6 }),
    sphere(0.05, glowMat(0xff5a3d, 3), { p: [0.24, 0.16, 0.16], cast: false }),
    sphere(0.05, glowMat(0xff5a3d, 3), { p: [0.24, 0.16, -0.16], cast: false }),
    cone(0.1, 0.5, gold, { p: [-0.3, 0.42, 0.1], r: [0, 0, 0.5], seg: 6 }),
    cone(0.1, 0.5, gold, { p: [-0.3, 0.42, -0.1], r: [0, 0, 0.5], seg: 6 }),
  )
  head.position.set(-L * 0.48, ctx.H + 1.1, 0)
  head.rotation.y = Math.PI
  g.add(head)
  // 龙尾（另一端）
  const tail = group(
    cone(0.16, 0.8, gold, { p: [0, 0.2, 0], r: [0, 0, -0.7], seg: 8 }),
    cone(0.1, 0.4, dark, { p: [-0.3, 0.5, 0], r: [0, 0, -1.4], seg: 6 }),
  )
  tail.position.set(L * 0.5, ctx.H + 0.7, 0)
  g.add(tail)
  return { obj: g, top: 1.9 }
}

// ---------- 兔耳屋顶 ----------
function rabbitEars(ctx) {
  const g = group()
  const furMat = stdMat({ color: 0xf7f2ec, roughness: 0.95 })
  const pinkMat = stdMat({ color: 0xffb7c9, roughness: 0.85 })
  for (const side of [-1, 1]) {
    const ear = group()
    // 弯曲兔耳：三段椭球
    const segs = [[0, 0.5, 0, 0], [0.1, 1.4, 0, 0.18], [0.28, 2.2, 0, 0.45]]
    for (const [ex, ey, ez, tilt] of segs) {
      ear.add(sphere(0.3, furMat, { p: [ex, ey, ez], s: [0.8, 1.5, 0.45], r: [0, 0, tilt] }))
    }
    // 内耳粉红
    ear.add(plane(0.3, 1.6, pinkMat, { p: [0.14, 1.3, 0.26], r: [0, 0, 0.35], cast: false }))
    ear.position.set(side * ctx.fp.front.L * 0.22, ctx.H, -0.1)
    ear.rotation.x = -0.15
    g.add(ear)
    // 耳朵轻摆
    let t = 0
    ctx.animate.push({
      update(dt) {
        t += dt
        ear.rotation.z = Math.sin(t * 1.2 + side) * 0.06
      },
    })
  }
  return { obj: g, top: 2.8 }
}

// ---------- 爱心屋顶（520/1314）----------
function heartRoof(ctx) {
  const g = group()
  const tex = canvasTexture(`heart-${ctx.dna.seed}`, 256, 256, (c, w, h) => {
    c.fillStyle = '#fff'
    c.translate(w / 2, h / 2 + 20)
    c.beginPath()
    c.moveTo(0, 60)
    c.bezierCurveTo(-110, -20, -60, -95, 0, -45)
    c.bezierCurveTo(60, -95, 110, -20, 0, 60)
    c.fill()
  })
  const heartMat = stdMat({ color: 0xff5a8a, roughness: 0.35, emissive: 0xff2d6f, emissiveIntensity: 0.35 })
  const big = mesh(new THREE.ExtrudeGeometry(
    (() => {
      const s = new THREE.Shape()
      s.moveTo(0, 0.9)
      s.bezierCurveTo(-1.6, 0.3, -0.9, -1.3, 0, -0.55)
      s.bezierCurveTo(0.9, -1.3, 1.6, 0.3, 0, 0.9)
      return s
    })(),
    { depth: 0.5, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 3 },
  ), heartMat, { p: [0, ctx.H + 2.2, 0], r: [0.15, 0, Math.PI] })
  big.scale.setScalar(1.35)
  g.add(big)
  // 环绕小爱心
  const smalls = []
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2
    const sp = plane(0.45, 0.45, new THREE.MeshStandardMaterial({
      map: tex, transparent: true, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.6,
      side: THREE.DoubleSide,
    }), { p: [Math.cos(a) * 2.6, ctx.H + 1.8, Math.sin(a) * 2.2], cast: false })
    sp.userData.billboard = true
    g.add(sp)
    smalls.push({ sp, a, ph: i })
  }
  ctx.animate.push({
    t: 0, update(dt) {
      this.t += dt
      for (const s of smalls) {
        s.sp.position.y = ctx.H + 1.8 + Math.sin(this.t * 1.6 + s.ph) * 0.3
      }
    },
  })
  return { obj: g, top: 3.4 }
}

// ---------- 冰晶屋顶（水/冰/雪）----------
function iceRoof(ctx) {
  const g = group()
  const iceMat = new THREE.MeshStandardMaterial({
    color: 0xbfe6f7, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.85,
    emissive: 0x9fd4ee, emissiveIntensity: 0.25,
  })
  const snowMat = stdMat({ color: 0xf4f9fd, roughness: 0.97 })
  const { bbox } = ctx.fp
  // 雪帽
  const cap = box(bbox.w * 0.7, 0.3, bbox.d * 0.6, snowMat, { p: [0, ctx.H + 0.15, 0] })
  g.add(cap)
  g.add(box(bbox.w * 0.5, 0.24, bbox.d * 0.42, snowMat, { p: [0, ctx.H + 0.36, 0] }))
  // 冰锥（檐口悬挂）
  const rand = makeRng(ctx.dna.seed + '#ice')
  const n = Math.floor(bbox.w / 0.7)
  for (let i = 0; i < n; i++) {
    const x = -bbox.w / 2 + 0.4 + i * (bbox.w - 0.8) / Math.max(1, n - 1)
    const len = rand.f(0.3, 0.9)
    g.add(cone(0.09, len, iceMat, { p: [x, ctx.H - len / 2 - 0.05, bbox.d / 2 - 0.1], r: [Math.PI, 0, 0], seg: 6, cast: false }))
    const len2 = rand.f(0.25, 0.7)
    g.add(cone(0.08, len2, iceMat, { p: [x + 0.15, ctx.H - len2 / 2 - 0.05, -bbox.d / 2 + 0.1], r: [Math.PI, 0, 0], seg: 6, cast: false }))
  }
  // 屋顶冰晶簇
  for (let i = 0; i < 5; i++) {
    const x = rand.f(-bbox.w * 0.3, bbox.w * 0.3), z = rand.f(-bbox.d * 0.25, bbox.d * 0.25)
    const h = rand.f(0.5, 1.2)
    g.add(cone(0.14, h, iceMat, { p: [x, ctx.H + 0.3 + h / 2, z], seg: 6 }))
    g.add(cone(0.08, h * 0.6, iceMat, { p: [x + 0.16, ctx.H + 0.3 + h * 0.3, z + 0.1], r: [0, 0, -0.4], seg: 6 }))
  }
  return { obj: g, top: 1.6 }
}

// ---------- 焦黑屋顶（芭比Q）----------
function charredRoof(ctx) {
  const g = group()
  const charMat = stdMat({ color: 0x1c1714, roughness: 0.98 })
  const ember = glowMat(0xff5a2d, 1.8)
  const { bbox } = ctx.fp
  const rand = makeRng(ctx.dna.seed + '#bbq')
  // 焦黑板块
  for (let i = 0; i < 8; i++) {
    g.add(box(rand.f(0.6, 1.4), 0.12, rand.f(0.5, 1.0), charMat, {
      p: [rand.f(-bbox.w * 0.4, bbox.w * 0.4), ctx.H + 0.1 + rand.f(0, 0.2), rand.f(-bbox.d * 0.35, bbox.d * 0.35)],
      r: [rand.f(-0.2, 0.2), rand.f(0, 3), rand.f(-0.15, 0.15)],
    }))
  }
  // 余烬裂纹
  for (let i = 0; i < 6; i++) {
    g.add(box(rand.f(0.4, 1.0), 0.04, 0.08, ember, {
      p: [rand.f(-bbox.w * 0.35, bbox.w * 0.35), ctx.H + 0.18, rand.f(-bbox.d * 0.3, bbox.d * 0.3)],
      r: [0, rand.f(0, 3), 0], cast: false,
    }))
  }
  // 一缕烟
  const smoke = group()
  for (let i = 0; i < 4; i++) {
    smoke.add(sphere(0.18 + i * 0.06, stdMat({ color: 0x777777, transparent: true, opacity: 0.4 - i * 0.08, roughness: 1 }), {
      p: [0, 0.5 + i * 0.5, 0], cast: false,
    }))
  }
  smoke.position.set(bbox.w * 0.2, ctx.H + 0.3, 0)
  g.add(smoke)
  ctx.animate.push({
    t: 0, update(dt) {
      this.t += dt
      smoke.children.forEach((p, i) => {
        const cyc = (this.t * 0.4 + i * 0.25) % 1
        p.position.y = 0.5 + cyc * 1.6
        p.material.opacity = 0.4 * (1 - cyc)
      })
    },
  })
  return { obj: g, top: 0.7 }
}

// ---------- 坍塌屋顶（破防）----------
function collapsedRoof(ctx) {
  const g = group()
  const { bbox } = ctx.fp
  const rand = makeRng(ctx.dna.seed + '#break')
  // 塌陷大洞（斜板）
  const broken = box(bbox.w * 0.5, 0.14, bbox.d * 0.4, ctx.materials.roofFlat, {
    p: [-bbox.w * 0.1, ctx.H - 0.25, 0], r: [0.15, 0.3, 0.35],
  })
  g.add(broken)
  // 断梁
  for (let i = 0; i < 4; i++) {
    g.add(cyl(0.05, 0.05, rand.f(1.2, 2.2), ctx.materials.trim, {
      p: [rand.f(-bbox.w * 0.35, bbox.w * 0.35), ctx.H - rand.f(0.1, 0.5), rand.f(-bbox.d * 0.3, bbox.d * 0.3)],
      r: [Math.PI / 2 - rand.f(0.2, 0.6), rand.f(0, 3), 0],
    }))
  }
  // 掉落的瓦片堆
  for (let i = 0; i < 7; i++) {
    g.add(box(rand.f(0.25, 0.5), 0.05, rand.f(0.2, 0.4), ctx.materials.roofFlat, {
      p: [rand.f(-bbox.w * 0.4, bbox.w * 0.4), ctx.H + rand.f(0, 0.1), rand.f(-bbox.d * 0.35, bbox.d * 0.35)],
      r: [rand.f(-0.4, 0.4), rand.f(0, 3), rand.f(-0.4, 0.4)],
    }))
  }
  return { obj: g, top: 0.4 }
}

// ---------- 皇冠屋顶（遥遥领先/888）----------
function crownRoof(ctx) {
  const g = group()
  const gold = stdMat({ color: 0xffd24a, metalness: 0.95, roughness: 0.18, emissive: 0xa67c00, emissiveIntensity: 0.3 })
  const R = Math.min(ctx.fp.bbox.w, ctx.fp.bbox.d) * 0.42
  // 冠环
  g.add(torus(R, R * 0.09, gold, { p: [0, ctx.H + 0.7, 0], r: [Math.PI / 2, 0, 0], seg: 36 }))
  g.add(torus(R * 0.8, R * 0.06, gold, { p: [0, ctx.H + 1.15, 0], r: [Math.PI / 2, 0, 0], seg: 36 }))
  // 尖齿
  const spikes = 7
  for (let i = 0; i < spikes; i++) {
    const a = i / spikes * Math.PI * 2
    g.add(cone(R * 0.09, R * 0.5, gold, {
      p: [Math.cos(a) * R, ctx.H + 1.4, Math.sin(a) * R], seg: 8,
    }))
  }
  // 冠顶宝石
  const gem = stdMat({ color: 0xff3d6f, metalness: 0.4, roughness: 0.05, emissive: 0xff2d6f, emissiveIntensity: 0.8 })
  g.add(sphere(R * 0.14, gem, { p: [0, ctx.H + 1.55, 0], cast: false }))
  // 旋转光环
  const halo = torus(R * 1.25, R * 0.025, glowMat(0xffe9a8, 2.6), {
    p: [0, ctx.H + 1.1, 0], r: [Math.PI / 2 - 0.2, 0, 0], seg: 40, cast: false,
  })
  g.add(halo)
  ctx.animate.push({ t: 0, update(dt) { this.t += dt; halo.rotation.z = this.t * 0.8 } })
  return { obj: g, top: 2.1 }
}

export const genEggRoofDragon = reg('eggRoof', 'eggRoofDragon', (ctx) => dragonRidge(ctx))
export const genEggRoofRabbit = reg('eggRoof', 'eggRoofRabbit', (ctx) => rabbitEars(ctx))
export const genEggRoofHeart = reg('eggRoof', 'eggRoofHeart', (ctx) => heartRoof(ctx))
export const genEggRoofIce = reg('eggRoof', 'eggRoofIce', (ctx) => iceRoof(ctx))
export const genEggRoofCharred = reg('eggRoof', 'eggRoofCharred', (ctx) => charredRoof(ctx))
export const genEggRoofCollapsed = reg('eggRoof', 'eggRoofCollapsed', (ctx) => collapsedRoof(ctx))
export const genEggRoofCrown = reg('eggRoof', 'eggRoofCrown', (ctx) => crownRoof(ctx))

const ROOF_MOD_MAP = {
  dragonRidge: dragonRidge, rabbitEars: rabbitEars, heart: heartRoof, ice: iceRoof,
  charred: charredRoof, collapsed: collapsedRoof, crown: crownRoof,
}

export function applyEggRoof(ctx) {
  const key = ctx.dna.eggEffects.roof
  const fn = ROOF_MOD_MAP[key]
  if (!fn) return null
  try {
    const out = fn(ctx)
    ctx.manifest.push(`eggRoof:${key}`)
    return out
  } catch (e) {
    console.warn('[eggs3d] roof mod failed:', key, e)
    return null
  }
}

// ---------- 彩蛋装饰分发（由 placeDecor 调用）----------
// 返回 [{ obj, interact? }]，位置由 placeDecor 决定
export function applyEggDecor(ctx) {
  const out = []
  for (const key of ctx.dna.eggEffects.decor) {
    const entry = getGen(`egg_${key}`)
    if (!entry) {
      console.warn('[eggs3d] missing egg decor gen:', key)
      continue
    }
    try {
      const r = entry.fn(ctx)
      if (!r?.obj?.isObject3D) {
        console.warn('[eggs3d] egg decor bad shape:', key)
        continue
      }
      out.push({ ...r, key })
      ctx.manifest.push(`eggDecor:${key}`)
    } catch (e) {
      console.warn('[eggs3d] egg decor failed:', key, e)
    }
  }
  return out
}
