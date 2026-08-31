// 生成器基础工具：材质工厂 / Canvas 纹理 / 几何快捷函数 / 调色
import * as THREE from 'three/webgpu'

const texCache = new Map()
export function clearTextureCache() {
  for (const t of texCache.values()) t.dispose()
  texCache.clear()
}

export function canvasTexture(key, w, h, draw, opts = {}) {
  if (texCache.has(key)) return texCache.get(key)
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d')
  draw(ctx, w, h)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = opts.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 4
  tex.needsUpdate = true
  tex.userData.cacheOwned = true
  texCache.set(key, tex)
  return tex
}

export function cloneRepeat(tex, rx, ry) {
  const t = tex.clone()
  delete t.userData.cacheOwned
  delete t.userData.keep
  t.needsUpdate = true
  t.repeat.set(rx, ry)
  return t
}

export function stdMat(p) {
  const m = new THREE.MeshStandardMaterial(p)
  return m
}

export function glassMat(tint = 0xbfe8ff, opacity = 0.28) {
  return new THREE.MeshStandardMaterial({
    color: tint, roughness: 0.06, metalness: 0.4,
    transparent: true, opacity, side: THREE.DoubleSide,
    envMapIntensity: 1.6,
  })
}

export function glowMat(color, intensity = 1.6, base = 0x1a1a22) {
  return new THREE.MeshStandardMaterial({
    color: base, emissive: color, emissiveIntensity: intensity, roughness: 0.5,
  })
}

// ---------- 几何快捷函数 ----------
export function mesh(geo, mat, o = {}) {
  const m = new THREE.Mesh(geo, mat)
  if (o.p) m.position.set(o.p[0], o.p[1], o.p[2])
  if (o.r) m.rotation.set(o.r[0], o.r[1], o.r[2])
  if (o.s) m.scale.set(o.s[0], o.s[1], o.s[2])
  m.castShadow = o.cast !== false
  m.receiveShadow = o.recv !== false
  if (o.name) m.name = o.name
  return m
}

export function box(w, h, d, mat, o = {}) {
  return mesh(new THREE.BoxGeometry(w, h, d), mat, o)
}

export function cyl(rt, rb, h, mat, o = {}) {
  return mesh(new THREE.CylinderGeometry(rt, rb, h, o.seg || 16), mat, o)
}

export function sphere(r, mat, o = {}) {
  return mesh(new THREE.SphereGeometry(r, o.seg || 18, o.segY || 14), mat, o)
}

export function cone(r, h, mat, o = {}) {
  return mesh(new THREE.ConeGeometry(r, h, o.seg || 16), mat, o)
}

export function torus(r, tube, mat, o = {}) {
  return mesh(new THREE.TorusGeometry(r, tube, o.seg || 20, o.seg2 || 12), mat, o)
}

export function plane(w, h, mat, o = {}) {
  return mesh(new THREE.PlaneGeometry(w, h), mat, o)
}

export function group(...children) {
  const g = new THREE.Group()
  for (const c of children) if (c) g.add(c)
  return g
}

// XZ 平面多边形 → 挤出（沿 +Y）。shapePts: [[x,z],...]
export function extrudeUp(shapePts, depth, mat, opts = {}) {
  const shape = new THREE.Shape(shapePts.map(p => new THREE.Vector2(p[0], -p[1])))
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, ...opts.extrude })
  const m = new THREE.Mesh(geo, mat)
  m.rotation.x = -Math.PI / 2
  m.position.y = opts.y || 0
  m.castShadow = true; m.receiveShadow = true
  return m
}

// 带内孔的挤出（墙体环、女儿墙等）
export function extrudeRing(outer, inner, depth, mat, opts = {}) {
  const shape = new THREE.Shape(outer.map(p => new THREE.Vector2(p[0], -p[1])))
  shape.holes.push(new THREE.Path(inner.map(p => new THREE.Vector2(p[0], -p[1]))))
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false })
  const m = new THREE.Mesh(geo, mat)
  m.rotation.x = -Math.PI / 2
  m.position.y = opts.y || 0
  m.castShadow = true; m.receiveShadow = true
  return m
}

// XZ 多边形（点序 CCW，从上看）的质心
export function centroid(pts) {
  let a = 0, cx = 0, cz = 0
  for (let i = 0; i < pts.length; i++) {
    const [x1, z1] = pts[i], [x2, z2] = pts[(i + 1) % pts.length]
    const f = x1 * z2 - x2 * z1
    a += f; cx += (x1 + x2) * f; cz += (z1 + z2) * f
  }
  a *= 0.5
  if (Math.abs(a) < 1e-8) return { x: pts[0][0], z: pts[0][1] }
  return { x: cx / (6 * a), z: cz / (6 * a) }
}

// 沿各条边的内法线缩进多边形。不能简单把顶点推向质心：凹多边形的
// 质心方向可能穿过轮廓，L 形店铺的内墙和移动边界因此会跑到室外。
export function insetPolygon(pts, d) {
  if (pts.length < 3 || d === 0) return pts.map(p => [...p])

  let twiceArea = 0
  for (let i = 0; i < pts.length; i++) {
    const [x1, z1] = pts[i], [x2, z2] = pts[(i + 1) % pts.length]
    twiceArea += x1 * z2 - x2 * z1
  }
  const inwardSide = twiceArea >= 0 ? 1 : -1

  return pts.map((p, i) => {
    const prev = pts[(i - 1 + pts.length) % pts.length]
    const next = pts[(i + 1) % pts.length]
    const prevLength = Math.hypot(p[0] - prev[0], p[1] - prev[1]) || 1
    const nextLength = Math.hypot(next[0] - p[0], next[1] - p[1]) || 1
    const prevDir = [(p[0] - prev[0]) / prevLength, (p[1] - prev[1]) / prevLength]
    const nextDir = [(next[0] - p[0]) / nextLength, (next[1] - p[1]) / nextLength]
    const prevNormal = [-prevDir[1] * inwardSide, prevDir[0] * inwardSide]
    const nextNormal = [-nextDir[1] * inwardSide, nextDir[0] * inwardSide]
    const prevOffset = [p[0] + prevNormal[0] * d, p[1] + prevNormal[1] * d]
    const nextOffset = [p[0] + nextNormal[0] * d, p[1] + nextNormal[1] * d]
    const cross = prevDir[0] * nextDir[1] - prevDir[1] * nextDir[0]

    if (Math.abs(cross) > 1e-8) {
      const dx = nextOffset[0] - prevOffset[0]
      const dz = nextOffset[1] - prevOffset[1]
      const t = (dx * nextDir[1] - dz * nextDir[0]) / cross
      return [prevOffset[0] + prevDir[0] * t, prevOffset[1] + prevDir[1] * t]
    }

    // 相邻边近似共线时，两条偏移线没有稳定交点；平均法线保持连续。
    const nx = prevNormal[0] + nextNormal[0]
    const nz = prevNormal[1] + nextNormal[1]
    const normalLength = Math.hypot(nx, nz)
    if (normalLength < 1e-8) return prevOffset
    return [p[0] + nx / normalLength * d, p[1] + nz / normalLength * d]
  })
}

export function pointInPolygon(x, z, pts) {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j]
    if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) inside = !inside
  }
  return inside
}

function orient2d(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
}

function pointOnSegment(p, a, b, epsilon = 1e-8) {
  return Math.abs(orient2d(a, b, p)) <= epsilon
    && p[0] >= Math.min(a[0], b[0]) - epsilon && p[0] <= Math.max(a[0], b[0]) + epsilon
    && p[1] >= Math.min(a[1], b[1]) - epsilon && p[1] <= Math.max(a[1], b[1]) + epsilon
}

function segmentsIntersect(a, b, c, d) {
  const o1 = orient2d(a, b, c), o2 = orient2d(a, b, d)
  const o3 = orient2d(c, d, a), o4 = orient2d(c, d, b)
  if ((o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0)) return true
  return pointOnSegment(c, a, b) || pointOnSegment(d, a, b)
    || pointOnSegment(a, c, d) || pointOnSegment(b, c, d)
}

// 检查一个绕 Y 轴旋转的家具占地是否完整位于多边形内，而不只是中心点在内。
// padding 会同时扩张宽度和深度，用作与墙面的安全间距。
export function orientedBoxInPolygon(x, z, width, depth, rotation, pts, padding = 0) {
  const hw = width / 2 + padding, hd = depth / 2 + padding
  const cos = Math.cos(rotation), sin = Math.sin(rotation)
  const corners = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([lx, lz]) => [
    x + lx * cos + lz * sin,
    z - lx * sin + lz * cos,
  ])

  if (corners.some(p => !pointInPolygon(p[0], p[1], pts))) return false
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i], b = corners[(i + 1) % corners.length]
    for (let j = 0; j < pts.length; j++) {
      if (segmentsIntersect(a, b, pts[j], pts[(j + 1) % pts.length])) return false
    }
  }
  return true
}

// ---------- Canvas 绘制工具 ----------
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export function neonStroke(ctx, color, blur = 18) {
  ctx.shadowColor = color
  ctx.shadowBlur = blur
  ctx.strokeStyle = color
}

export function grain(ctx, w, h, alpha, rand, dark = true) {
  const n = Math.floor(w * h * alpha)
  for (let i = 0; i < n; i++) {
    const x = rand.f(0, w), y = rand.f(0, h), a = rand.f(0.02, 0.09)
    ctx.fillStyle = dark ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`
    ctx.fillRect(x, y, rand.f(1, 2.5), rand.f(1, 2.5))
  }
}

export function hsl(h, s, l, a = 1) {
  h = ((h % 360) + 360) % 360
  if (a < 1) return `hsla(${h},${s}%,${l}%,${a})`
  return `hsl(${h},${s}%,${l}%)`
}

// HSL 数组 [h,s,l] → THREE.Color
export function col(hslArr, jitterRand = null, jh = 0, js = 0, jl = 0) {
  let [h, s, l] = hslArr
  if (jitterRand) {
    h += jitterRand.f(-jh, jh); s += jitterRand.f(-js, js); l += jitterRand.f(-jl, jl)
    s = Math.max(0, Math.min(100, s)); l = Math.max(2, Math.min(98, l))
  }
  return new THREE.Color().setHSL(((h % 360) + 360) % 360 / 360, s / 100, l / 100)
}

// Kenney 模型染色（保持明度关系，色相/饱和度向调色板靠拢）
export function tintModel(object, targetHue, satScale = 0.85, hueSpread = 26) {
  const tint = (m) => {
    if (!m.color || m.userData._tinted) return m
    const hsl = {}
    m.color.getHSL(hsl)
    const nm = m.clone()
    nm.color = new THREE.Color().setHSL(
      (targetHue / 360 + (hsl.h - 0.5) * (hueSpread / 360) + 1) % 1,
      Math.min(0.95, hsl.s * satScale + 0.08),
      hsl.l
    )
    delete nm.userData.keep
    nm.userData._tinted = true
    return nm
  }
  object.traverse(o => {
    if (o.isMesh && o.material) {
      if (Array.isArray(o.material)) o.material = o.material.map(tint)
      else o.material = tint(o.material)
    }
  })
}

export function disposeObject(root) {
  const geometries = new Set()
  const materials = new Set()
  const textures = new Set()
  root.traverse(o => {
    if (o.geometry && !o.geometry.userData?.keep && !geometries.has(o.geometry)) {
      geometries.add(o.geometry)
      o.geometry.dispose()
    }
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material]
      for (const m of mats) {
        if (!m || materials.has(m)) continue
        materials.add(m)
        if (m.userData?.keep) continue
        for (const k of ['map', 'normalMap', 'roughnessMap', 'emissiveMap', 'metalnessMap', 'aoMap', 'alphaMap', 'bumpMap', 'displacementMap', 'lightMap']) {
          const texture = m[k]
          if (texture?.dispose && !texture.userData?.keep && !texture.userData?.cacheOwned && !textures.has(texture)) {
            textures.add(texture)
            texture.dispose()
          }
        }
        m.dispose()
      }
    }
  })
}
