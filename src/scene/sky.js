// 程序化天空：渐变穹顶 + 太阳光晕 + 星空 + 云层（全部 Canvas 纹理，WebGPU 安全）
import * as THREE from 'three/webgpu'
import { hsl } from '../gen/helpers.js'
import { makeRng } from '../core/rng.js'

const skyTexCache = new Map()

export function skyGradientTexture(l) {
  const key = l.id
  if (skyTexCache.has(key)) return skyTexCache.get(key)
  const c = document.createElement('canvas')
  c.width = 16; c.height = 512
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, 512)
  g.addColorStop(0, hsl(...l.skyTop))
  g.addColorStop(0.42, hsl(...l.skyMid))
  g.addColorStop(0.72, hsl(...l.skyHorizon))
  g.addColorStop(0.86, hsl(l.skyHorizon[0], l.skyHorizon[1] * 0.5, Math.min(96, l.skyHorizon[2] + 8)))
  g.addColorStop(1, hsl(...l.fogColor))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 16, 512)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.ClampToEdgeWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.userData.keep = true
  skyTexCache.set(key, tex)
  return tex
}

function hslToRgba(h, s, l, a) {
  const c = new THREE.Color().setHSL(((h % 360) + 360) % 360 / 360, s / 100, l / 100)
  return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${a})`
}

function glowSpriteTexture(hslArr, size = 128) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, hslToRgba(...hslArr, 1))
  g.addColorStop(0.18, hslToRgba(...hslArr, 1))
  g.addColorStop(0.5, hslToRgba(...hslArr, 0.25))
  g.addColorStop(1, hslToRgba(...hslArr, 0))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function sunDirection(l) {
  const phi = THREE.MathUtils.degToRad(90 - l.sunElev)
  const theta = THREE.MathUtils.degToRad(l.sunAzim)
  return new THREE.Vector3().setFromSphericalCoords(1, phi, theta)
}

export function createSkyDome(l) {
  const geo = new THREE.SphereGeometry(420, 32, 24)
  const mat = new THREE.MeshBasicMaterial({
    map: skyGradientTexture(l),
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
    toneMapped: false,
  })
  const dome = new THREE.Mesh(geo, mat)
  dome.renderOrder = -100
  dome.userData.noExport = true
  return dome
}

export function createSun(l) {
  const g = new THREE.Group()
  const dir = sunDirection(l)
  const mkPlane = (tex, size, opacity) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshBasicMaterial({
        map: tex, transparent: true, depthWrite: false, fog: false, toneMapped: false, opacity,
        blending: THREE.AdditiveBlending,
      }),
    )
    m.userData.noExport = true
    m.userData.billboard = 'full'
    return m
  }
  const core = mkPlane(glowSpriteTexture(l.sunColor, 128), 46, 1)
  core.position.copy(dir).multiplyScalar(380)
  const halo = mkPlane(glowSpriteTexture(l.sunGlow, 128), 150, 0.55)
  halo.position.copy(dir).multiplyScalar(370)
  g.add(core, halo)
  g.userData.noExport = true
  return g
}

function starTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 32
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.8)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 32, 32)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function createStars(l) {
  if (!l.stars) return null
  const rng = makeRng('starscape')
  const N = 900
  const pos = new Float32Array(N * 3)
  const siz = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    const phi = Math.acos(rng.f(0.03, 0.95))
    const theta = rng.f(0, Math.PI * 2)
    pos[i * 3] = Math.sin(phi) * Math.cos(theta) * 400
    pos[i * 3 + 1] = Math.cos(phi) * 400
    pos[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * 400
    siz[i] = rng.f(0.8, 2.6)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('size', new THREE.BufferAttribute(siz, 1))
  const uv = new Float32Array(N * 2)
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  const mat = new THREE.PointsMaterial({
    map: starTexture(), size: 2.4, sizeAttenuation: false,
    transparent: true, depthWrite: false, fog: false, toneMapped: false,
    blending: THREE.AdditiveBlending, opacity: 0.9,
  })
  const stars = new THREE.Points(geo, mat)
  stars.userData.noExport = true
  stars.userData.twinkle = true
  return stars
}

function cloudSpriteTexture(tint) {
  const c = document.createElement('canvas')
  c.width = 256; c.height = 128
  const ctx = c.getContext('2d')
  const rng = makeRng('cloud')
  for (let i = 0; i < 26; i++) {
    const x = rng.f(30, 226), y = rng.f(40, 92), r = rng.f(16, 46)
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, hsl(...tint, 0.85))
    g.addColorStop(1, hsl(...tint, 0))
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function createClouds(l) {
  if (!l.clouds) return null
  const rng = makeRng('clouds-' + l.id)
  const tex = cloudSpriteTexture(l.cloudTint)
  const g = new THREE.Group()
  const N = 14
  for (let i = 0; i < N; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, transparent: true, depthWrite: false, fog: false, toneMapped: false,
      opacity: rng.f(0.5, 0.9),
    }))
    const phi = Math.acos(rng.f(0.25, 0.72))
    const theta = rng.f(0, Math.PI * 2)
    const R = 330
    s.position.set(Math.sin(phi) * Math.cos(theta) * R, Math.cos(phi) * R, Math.sin(phi) * Math.sin(theta) * R)
    const sc = rng.f(90, 220)
    s.scale.set(sc, sc * rng.f(0.35, 0.5), 1)
    g.add(s)
  }
  g.userData.noExport = true
  g.userData.drift = true
  return g
}
