// 3D 稀有度悬浮卡片 + 通用悬浮标签（Billboard，全 Canvas）
import * as THREE from 'three/webgpu'
import { panelTexture, roundedPanel, FONT, drawIcon, makePanelSprite } from './sprites.js'
import { RARITY_META } from '../core/dna.js'

function rarityColor(dna) {
  const [h, s, l] = dna.rarityMeta.color
  const c = new THREE.Color().setHSL(((h % 360) + 360) % 360 / 360, s / 100, l / 100)
  return `#${c.getHexString()}`
}

export class RarityCard {
  constructor() {
    this.group = new THREE.Group()
    this.group.visible = false
    this.sprite = null
    this.t = 0
    this.showing = false
  }

  show(dna, position) {
    if (this.sprite) {
      this.group.remove(this.sprite)
      this.sprite.material.map.dispose()
      this.sprite.material.dispose()
    }
    const W = 680, H = 380
    const rc = rarityColor(dna)
    const tex = panelTexture(`rar-${dna.seed}-${dna.rarity}`, W, H, (ctx) => {
      ctx.clearRect(0, 0, W, H)
      roundedPanel(ctx, W - 10, H - 10, 34, {
        bg: 'rgba(12,14,26,0.92)', border: rc, borderWidth: 6, glow: rc,
      })
      ctx.translate(5, 5)
      // 稀有度徽标
      drawIcon(ctx, 'star', 74, 78, 56, rc)
      ctx.font = `900 64px ${FONT}`
      ctx.fillStyle = rc
      ctx.textBaseline = 'middle'
      ctx.shadowColor = rc; ctx.shadowBlur = 26
      ctx.fillText(`${dna.rarity} · ${dna.rarityMeta.label}`, 120, 76)
      ctx.shadowBlur = 0
      // 名字
      ctx.font = `800 68px ${FONT}`
      ctx.fillStyle = '#ffffff'
      ctx.fillText(dna.name.slice(0, 10), 44, 178)
      // 业态 × 风格
      ctx.font = `600 38px ${FONT}`
      ctx.fillStyle = 'rgba(220,230,250,0.9)'
      ctx.fillText(`${dna.business.name} × ${dna.style.name}`, 44, 254)
      // 命理行
      ctx.font = `500 30px ${FONT}`
      ctx.fillStyle = 'rgba(190,200,225,0.68)'
      ctx.fillText(`${dna.zodiac.char}年生 · ${dna.constellation.name} · ${dna.paletteSource}`, 44, 310)
      if (dna.eggs.length) {
        ctx.textAlign = 'right'
        ctx.fillStyle = '#ffd166'
        ctx.font = `700 32px ${FONT}`
        ctx.fillText(`彩蛋 ×${dna.eggs.length}`, W - 44, 310)
        ctx.textAlign = 'left'
      }
    })
    this.sprite = makePanelSprite(tex, 2.3, W / H)
    this.group.add(this.sprite)
    this.group.position.copy(position)
    this.group.visible = true
    this.showing = true
    this.t = 0
  }

  update(dt, camera) {
    if (!this.showing) return
    this.t += dt
    const life = 9
    // 弹性入场 / 悬浮 / 淡出
    let scale = 1, opacity = 1
    if (this.t < 0.5) {
      const p = this.t / 0.5
      const c = 1.70158 + 1
      scale = 1 + c * Math.pow(p - 1, 3) + 1.70158 * Math.pow(p - 1, 2)
    }
    if (this.t > life - 1) opacity = Math.max(0, (life - this.t))
    if (this.t >= life) { this.showing = false; this.group.visible = false; return }
    this.sprite.material.opacity = opacity
    this.sprite.scale.set(2.3 * 680 / 380 * scale, 2.3 * scale, 1)
    this.group.position.y += Math.sin(this.t * 1.4) * dt * 0.12
    const dx = camera.position.x - this.group.position.x
    const dz = camera.position.z - this.group.position.z
    this.group.rotation.y = Math.atan2(dx, dz)
  }
}

// 悬浮标签：跟随 hover 物体
export class HoverLabel {
  constructor() {
    this.sprite = null
    this.group = new THREE.Group()
    this.group.visible = false
    this.target = null
    this.offsetY = 0
  }

  show(text, sub = null) {
    if (this.sprite) {
      this.group.remove(this.sprite)
      this.sprite.material.map.dispose()
      this.sprite.material.dispose()
    }
    const W = 520, H = sub ? 150 : 96
    const tex = panelTexture(`hl-${text}-${sub}`, W, H, (ctx) => {
      ctx.clearRect(0, 0, W, H)
      roundedPanel(ctx, W - 8, H - 8, 22, {
        bg: 'rgba(12,16,28,0.86)', border: 'rgba(126,200,255,0.75)', borderWidth: 3,
      })
      ctx.translate(4, 4)
      ctx.font = `700 40px ${FONT}`
      ctx.fillStyle = '#ffffff'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = 'rgba(80,160,255,0.8)'; ctx.shadowBlur = 14
      ctx.fillText(text, 34, sub ? 52 : 44)
      if (sub) {
        ctx.shadowBlur = 0
        ctx.font = `500 30px ${FONT}`
        ctx.fillStyle = 'rgba(190,205,230,0.78)'
        ctx.fillText(sub, 34, 108)
      }
    })
    this.sprite = makePanelSprite(tex, 0.4, W / H)
    this.group.add(this.sprite)
    this.group.visible = true
  }

  follow(object, camera, offsetY = 1.1) {
    if (!object) { this.group.visible = false; return }
    const box = new THREE.Box3().setFromObject(object)
    const c = box.getCenter(new THREE.Vector3())
    this.group.position.set(c.x, box.max.y + 0.5 + offsetY * 0.2, c.z)
    const dx = camera.position.x - c.x
    const dz = camera.position.z - c.z
    this.group.rotation.y = Math.atan2(dx, dz)
  }

  hide() {
    this.group.visible = false
    this.target = null
  }
}
