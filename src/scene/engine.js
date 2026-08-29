// 场景引擎：WebGPURenderer（自动 WebGL2 回退）+ 光照系统 + Bloom 后期 + 天气
import * as THREE from 'three/webgpu'
import { pass } from 'three/tsl'
import { bloom } from 'three/addons/tsl/display/BloomNode.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { createSkyDome, createSun, createStars, createClouds, sunDirection } from './sky.js'
import { col } from '../gen/helpers.js'
import { makeRng } from '../core/rng.js'

const _v1 = /* @__PURE__ */ new THREE.Vector3()
const _v2 = /* @__PURE__ */ new THREE.Vector3()

function weatherTexture(kind) {
  const c = document.createElement('canvas')
  c.width = 32; c.height = 32
  const ctx = c.getContext('2d')
  if (kind === 'rain') {
    const g = ctx.createLinearGradient(16, 4, 16, 28)
    g.addColorStop(0, 'rgba(170,200,255,0)')
    g.addColorStop(0.5, 'rgba(170,200,255,0.85)')
    g.addColorStop(1, 'rgba(170,200,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(14, 4, 3, 24)
  } else {
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 15)
    g.addColorStop(0, 'rgba(255,255,255,0.95)')
    g.addColorStop(0.7, 'rgba(240,248,255,0.55)')
    g.addColorStop(1, 'rgba(240,248,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 32, 32)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export class Engine {
  constructor() {
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 900)
    this.camera.position.set(14, 7, 20)
    this.clock = new THREE.Timer()
    this.tickFns = []
    this.time = 0
    this.envGroup = new THREE.Group()
    this.scene.add(this.envGroup)
    this._weather = null
  }

  async init(host, size) {
    const w = Math.max(1, Math.round(size?.w || innerWidth))
    const h = Math.max(1, Math.round(size?.h || innerHeight))
    this.sizeMode = size ? { w, h } : null
    this.renderer = new THREE.WebGPURenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    })
    this.isMobile = matchMedia('(pointer: coarse)').matches
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.isMobile ? 1.5 : 2))
    this.renderer.setSize(w, h)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    host.appendChild(this.renderer.domElement)

    await this.renderer.init()
    this.backend = this.renderer.backend.isWebGPUBackend ? 'webgpu' : 'webgl2'

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.06
    this.controls.maxPolarAngle = Math.PI * 0.495
    this.controls.minDistance = 2.2
    this.controls.maxDistance = 90
    this.controls.target.set(0, 2, 0)

    // 灯光
    this.sun = new THREE.DirectionalLight(0xffffff, 3)
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(2048, 2048)
    const sc = this.sun.shadow.camera
    sc.left = -18; sc.right = 18; sc.top = 18; sc.bottom = -18
    sc.near = 1; sc.far = 90
    this.sun.shadow.bias = -0.0008
    this.sun.shadow.normalBias = 0.02
    this.scene.add(this.sun, this.sun.target)
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444455, 0.6)
    this.scene.add(this.hemi)

    // 后期：Bloom
    this.pipeline = new THREE.RenderPipeline(this.renderer)
    this.scenePass = pass(this.scene, this.camera)
    this.scenePassColor = this.scenePass.getTextureNode('output')
    this.bloomPass = bloom(this.scenePassColor, 0.35, 0.35, 0.88)
    this.pipeline.outputNode = this.scenePassColor.add(this.bloomPass)

    addEventListener('resize', () => this.resize())
    return this
  }

  resize(w, h) {
    const nw = Math.max(1, Math.round(w || this.sizeMode?.w || innerWidth))
    const nh = Math.max(1, Math.round(h || this.sizeMode?.h || innerHeight))
    if (this.sizeMode) { this.sizeMode.w = nw; this.sizeMode.h = nh }
    this.camera.aspect = nw / nh
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(nw, nh)
  }

  setEnvironment(l, rarityGlow = 0) {
    // 天空套件
    this.envGroup.clear()
    this.envGroup.add(createSkyDome(l))
    this.envGroup.add(createSun(l))
    const stars = createStars(l)
    if (stars) this.envGroup.add(stars)
    const clouds = createClouds(l)
    if (clouds) this.envGroup.add(clouds)
    this.clouds = clouds
    this.stars = stars

    // 太阳
    const dir = sunDirection(l)
    this.sun.position.copy(dir).multiplyScalar(40)
    this.sun.target.position.set(0, 0, 0)
    this.sun.color = col(l.sunColor)
    this.sun.intensity = l.sunIntensity

    // 环境
    this.hemi.color = col(l.ambientSky)
    this.hemi.groundColor = col(l.ambientGround)
    this.hemi.intensity = l.ambientIntensity

    // 雾 + 曝光
    this.scene.fog = new THREE.FogExp2(col(l.fogColor).getHex(), l.fogDensity)
    this.renderer.toneMappingExposure = l.exposure

    // Bloom 强度（稀有度提升，封顶避免招牌过曝不可读）
    this.bloomPass.strength.value = Math.min(0.68, 0.3 + rarityGlow * 0.22)

    // 天气
    this._clearWeather()
    if (l.rain) this._makeWeather('rain', l)
    if (l.snow) this._makeWeather('snow', l)
  }

  _clearWeather() {
    if (this._weather) {
      this.envGroup.remove(this._weather)
      this._weather.geometry.dispose()
      this._weather.material.dispose()
      this._weather = null
    }
  }

  _makeWeather(kind, l) {
    const rng = makeRng('weather-' + kind)
    const N = kind === 'rain' ? 1200 : 900
    const pos = new Float32Array(N * 3)
    const vel = new Float32Array(N)
    const phase = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      pos[i * 3] = rng.f(-26, 26)
      pos[i * 3 + 1] = rng.f(0, 26)
      pos[i * 3 + 2] = rng.f(-26, 26)
      vel[i] = kind === 'rain' ? rng.f(22, 30) : rng.f(1.4, 2.6)
      phase[i] = rng.f(0, Math.PI * 2)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const uvw = new Float32Array(N * 2)
    geo.setAttribute('uv', new THREE.BufferAttribute(uvw, 2))
    const mat = new THREE.PointsMaterial({
      map: weatherTexture(kind),
      size: kind === 'rain' ? 0.5 : 0.42,
      transparent: true, depthWrite: false, opacity: kind === 'rain' ? 0.5 : 0.85,
      color: col(l.cloudTint, null, 0, 0, 25),
    })
    const pts = new THREE.Points(geo, mat)
    pts.userData.noExport = true
    pts.frustumCulled = false
    this.envGroup.add(pts)
    this._weather = pts
    this._weatherData = { vel, phase, kind }
  }

  onTick(fn) { this.tickFns.push(fn) }

  // Plane 面板/太阳等标记 userData.billboard='full'|'y' 的对象朝向相机
  _updateBillboards(dt) {
    this._bbScan = (this._bbScan || 0) - dt
    if (this._bbScan <= 0) {
      this._bbScan = 0.4
      this._billboards = []
      this.scene.traverse(o => { if (o.userData?.billboard) this._billboards.push(o) })
    }
    const list = this._billboards
    if (!list || !list.length) return
    const cp = _v1.set(0, 0, 0)
    this.camera.getWorldPosition(cp)
    for (const o of list) {
      if (!o.parent) continue
      if (o.userData.billboard === 'full') {
        o.lookAt(cp)
      } else {
        o.getWorldPosition(_v2)
        o.rotation.y = Math.atan2(cp.x - _v2.x, cp.z - _v2.z)
      }
    }
  }

  update(dt) {
    this.time += dt
    for (const fn of this.tickFns) fn(dt, this.time)
    this._updateBillboards(dt)
    if (this.clouds) this.clouds.rotation.y = this.time * 0.004
    if (this.stars) this.stars.material.opacity = 0.75 + Math.sin(this.time * 0.7) * 0.15
    if (this._weather) {
      const { vel, phase, kind } = this._weatherData
      const arr = this._weather.geometry.attributes.position.array
      for (let i = 0; i < vel.length; i++) {
        arr[i * 3 + 1] -= vel[i] * dt
        if (kind === 'snow') {
          arr[i * 3] += Math.sin(this.time * 1.3 + phase[i]) * dt * 0.7
        }
        if (arr[i * 3 + 1] < 0) {
          arr[i * 3 + 1] = 26
          arr[i * 3] = ((arr[i * 3] + 26) % 52) - 26
        }
      }
      this._weather.geometry.attributes.position.needsUpdate = true
    }
    // 电影运镜期间由 tween 全权控制相机，跳过钳制（否则 min/maxDistance 会把相机推回去）
    if (!this.cinematic) this.controls.update()
  }

  render() {
    this.pipeline.render()
  }

  async screenshot(filename) {
    this.pipeline.render()
    await new Promise(r => setTimeout(r, 80))
    const src = this.renderer.domElement
    const c = document.createElement('canvas')
    c.width = src.width; c.height = src.height
    const ctx = c.getContext('2d')
    ctx.drawImage(src, 0, 0)
    const scale = c.width / 1920
    // 左上：稀有度角标
    const cm = this.cardMeta
    if (cm) {
      const pad = Math.round(26 * scale)
      const bh = Math.round(64 * scale)
      ctx.font = `800 ${Math.round(26 * scale)}px "PingFang SC","Microsoft YaHei",sans-serif`
      const tw = ctx.measureText(cm.rarity).width
      const bw = Math.round(tw + 34 * scale)
      const r = 16 * scale
      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 16 * scale
      const grad = ctx.createLinearGradient(pad, pad, pad + bw, pad + bh)
      const colors = { N: ['#4a5568', '#2d3748'], R: ['#4f8cff', '#2b5fd9'], SR: ['#9d8cff', '#6a4fd9'], SSR: ['#ffd166', '#ff9d3d'], UR: ['#ff6b81', '#d9376e'] }
      const [ca, cb] = colors[cm.rarity] || colors.N
      grad.addColorStop(0, ca); grad.addColorStop(1, cb)
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.roundRect(pad, pad, bw, bh, r)
      ctx.fill()
      ctx.restore()
      ctx.fillStyle = '#fff'
      ctx.textBaseline = 'middle'; ctx.textAlign = 'left'
      ctx.fillText(cm.rarity, pad + 17 * scale, pad + bh / 2 + 1)
      if (cm.sub) {
        ctx.font = `600 ${Math.round(20 * scale)}px "PingFang SC","Microsoft YaHei",sans-serif`
        ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 8
        ctx.fillStyle = 'rgba(255,255,255,0.92)'
        ctx.fillText(cm.sub, pad + bw + 14 * scale, pad + bh / 2 + 1)
      }
    }
    // 左下：种子水印
    const pad = Math.round(c.width * 0.018)
    ctx.font = `700 ${Math.max(16, Math.round(c.width * 0.022))}px "PingFang SC","Microsoft YaHei",sans-serif`
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'
    const label = this.watermark || '名字成店'
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 8
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.fillText(label, pad, c.height - pad)
    ctx.font = `500 ${Math.max(12, Math.round(c.width * 0.016))}px "PingFang SC","Microsoft YaHei",sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.65)'
    ctx.fillText('name-to-shop · 种子可复现', pad, c.height - pad + Math.max(20, Math.round(c.width * 0.028)))
    const url = c.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
  }
}
