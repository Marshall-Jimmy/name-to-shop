// 3D 加载场景：旋转的发光小房子（不是转圈进度条）
import * as THREE from 'three/webgpu'
import { panelTexture, roundedPanel, FONT, makePanelSprite } from './sprites.js'

export class Loader3D {
  constructor() {
    this.group = new THREE.Group()

    // 小房子
    const house = new THREE.Group()
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd8c9a8, roughness: 0.7 })
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.25, 1.5), bodyMat)
    body.position.y = 0.75
    body.castShadow = true
    house.add(body)
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xb05548, roughness: 0.65 })
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.0, 4), roofMat)
    roof.position.y = 1.95
    roof.rotation.y = Math.PI / 4
    roof.castShadow = true
    house.add(roof)
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x7a5236, roughness: 0.6 })
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.75, 0.06), doorMat)
    door.position.set(0, 0.38, 0.78)
    house.add(door)
    const winMat = new THREE.MeshStandardMaterial({
      color: 0x2a2418, emissive: 0xffc866, emissiveIntensity: 1.6, roughness: 0.4,
    })
    for (const x of [-0.55, 0.55]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.05), winMat)
      win.position.set(x, 0.85, 0.78)
      house.add(win)
    }
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.55, 0.26), roofMat)
    chimney.position.set(0.5, 2.05, -0.2)
    house.add(chimney)
    house.position.y = 1.15
    this.house = house
    this.group.add(house)

    // 基座
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.55, 1.8, 0.22, 36),
      new THREE.MeshStandardMaterial({ color: 0x3a4258, roughness: 0.5, metalness: 0.4 }),
    )
    this.group.add(pedestal)

    // 环绕星尘
    const dustGeo = new THREE.BufferGeometry()
    const N = 60
    const pos = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      const a = i / N * Math.PI * 2
      const r = 2.1 + (i % 3) * 0.22
      pos[i * 3] = Math.cos(a) * r
      pos[i * 3 + 1] = 0.8 + ((i * 7) % 10) / 10 * 2.4
      pos[i * 3 + 2] = Math.sin(a) * r
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    this.dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
      color: 0x9fc8ff, size: 0.09, transparent: true, opacity: 0.85,
    }))
    this.group.add(this.dust)

    // 百分比铭牌
    this.canvas = document.createElement('canvas')
    this.canvas.width = 460; this.canvas.height = 110
    this.tex = new THREE.CanvasTexture(this.canvas)
    this.tex.colorSpace = THREE.SRGBColorSpace
    this.plaque = makePanelSprite(this.tex, 0.52, 460 / 110)
    this.plaque.position.set(0, -0.9, 0.3)
    this.plaque.userData.billboard = 'y'
    this.group.add(this.plaque)
    this.setProgress(0)

    // 标题
    const titleTex = panelTexture('loader-title', 720, 130, (ctx) => {
      ctx.clearRect(0, 0, 720, 130)
      roundedPanel(ctx, 708, 118, 30, {
        bg: 'rgba(12,16,30,0.85)', border: 'rgba(126,200,255,0.7)', borderWidth: 4, glow: 'rgba(126,200,255,0.5)',
      })
      ctx.translate(6, 6)
      ctx.font = `800 54px ${FONT}`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillStyle = '#ffffff'
      ctx.fillText('名字成店 · NAME → SHOP', 354, 62)
    })
    this.title = makePanelSprite(titleTex, 0.8, 720 / 130)
    this.title.position.set(0, 3.5, 0)
    this.title.userData.billboard = 'y'
    this.group.add(this.title)
  }

  setProgress(p) {
    const ctx = this.canvas.getContext('2d')
    ctx.clearRect(0, 0, 460, 110)
    roundedPanel(ctx, 452, 102, 26, {
      bg: 'rgba(12,16,30,0.88)', border: 'rgba(126,200,255,0.6)', borderWidth: 3,
    })
    ctx.translate(4, 4)
    ctx.font = `600 40px ${FONT}`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = '#cfe4ff'
    ctx.fillText(`正在筹备物料 ${Math.round(p * 100)}%`, 226, 52)
    this.tex.needsUpdate = true
  }

  update(dt, t) {
    this.house.rotation.y = t * 0.7
    this.house.position.y = 1.15 + Math.sin(t * 1.2) * 0.07
    this.dust.rotation.y = -t * 0.35
  }

  dispose() {
    this.group.traverse(o => {
      if (o.geometry) o.geometry.dispose()
      if (o.material) {
        if (o.material.map) o.material.map.dispose()
        o.material.dispose()
      }
    })
  }
}
