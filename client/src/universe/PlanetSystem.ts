// ============ 星球渲染系统 — 工业级交互手感 ============
import { HOVER_CONFIG, Easing } from './types'
import type { Planet, Camera } from './types'

export class PlanetSystem {
  private time = 0
  private hoveredPlanet: Planet | null = null
  private canvasW = 0
  private canvasH = 0
  // 每个星球的hover过渡状态
  private hoverStates: Map<string, number> = new Map() // 0→1

  setCanvasSize(w: number, h: number) {
    this.canvasW = w
    this.canvasH = h
  }

  setHovered(planet: Planet | null) {
    this.hoveredPlanet = planet
  }

  update(dt: number) {
    this.time += dt

    // 更新所有hover过渡
    for (const [id, t] of this.hoverStates) {
      const isTarget = this.hoveredPlanet?.id === id
      const target = isTarget ? 1 : 0
      const speed = isTarget ? (1 / (HOVER_CONFIG.transitionMs / 1000)) : (1 / (HOVER_CONFIG.transitionMs / 800))
      const next = isTarget ? Math.min(1, t + dt * speed) : Math.max(0, t - dt * speed)
      if (next < 0.001 && !isTarget) {
        this.hoverStates.delete(id)
      } else {
        this.hoverStates.set(id, next)
      }
    }
    // 确保当前hover的有状态
    if (this.hoveredPlanet && !this.hoverStates.has(this.hoveredPlanet.id)) {
      this.hoverStates.set(this.hoveredPlanet.id, 0)
    }
  }

  private getHoverT(planet: Planet): number {
    return this.hoverStates.get(planet.id) || 0
  }

  // 渲染单个星球
  renderPlanet(
    ctx: CanvasRenderingContext2D,
    planet: Planet,
    worldX: number,
    worldY: number,
    camera: Camera,
    now: number,
    quality: number = 1
  ) {
    const screen = this.worldToScreen(worldX, worldY, camera)
    const zoom = camera.zoom
    const baseSize = planet.size * zoom
    const size = Math.max(baseSize, 4)

    // 屏幕外跳过
    if (screen.x < -200 || screen.x > this.canvasW + 200 ||
        screen.y < -200 || screen.y > this.canvasH + 200) return

    // 工业级 Hover 过渡
    const hoverT = this.getHoverT(planet)
    const easedT = Easing.easeOutCubic(hoverT)
    const hoverScale = 1 + (HOVER_CONFIG.scaleTo - HOVER_CONFIG.scaleFrom) * easedT
    const emissiveBoost = HOVER_CONFIG.emissiveBoost * easedT
    const finalSize = size * hoverScale

    ctx.save()
    ctx.translate(screen.x, screen.y)

    // === 1. 外层光晕（多层发光 + hover增强） ===
    const glowIntensity = planet.glowIntensity + emissiveBoost
    const glowSize = finalSize * (2.2 + glowIntensity)
    const glow = ctx.createRadialGradient(0, 0, finalSize * 0.3, 0, 0, glowSize)
    glow.addColorStop(0, this.colorAlpha(planet.colorTheme, 0.2 + emissiveBoost * 0.3))
    glow.addColorStop(0.3, this.colorAlpha(planet.colorTheme, 0.1 + emissiveBoost * 0.15))
    glow.addColorStop(0.7, this.colorAlpha(planet.colorTheme, 0.03))
    glow.addColorStop(1, 'transparent')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(0, 0, glowSize, 0, Math.PI * 2)
    ctx.fill()

    // === 2a. "BORN" 冲击波 (newly published, ~3.5s) ===
    if (planet.isJustBorn && planet.bornAt && quality > 0.4) {
      const elapsed = (Date.now() - planet.bornAt) / 3500 // 0 → 1
      const t = Math.min(1, elapsed)
      // Three concentric expanding rings, staggered
      for (let r = 0; r < 3; r++) {
        const stagger = r * 0.18
        const ringT = Math.max(0, t - stagger)
        if (ringT >= 1) continue
        const eased = Easing.easeOutCubic(ringT)
        const ringRadius = finalSize * (1 + eased * 4.5)
        const alpha = (1 - eased) * 0.55
        ctx.strokeStyle = this.colorAlpha('#ffe600', alpha) // golden birth ring
        ctx.lineWidth = Math.max(1, 2 * (1 - eased))
        ctx.beginPath()
        ctx.arc(0, 0, ringRadius, 0, Math.PI * 2)
        ctx.stroke()
      }
      // Central golden flash, fades fast
      const flashAlpha = Math.max(0, 1 - t * 1.4) * 0.35
      if (flashAlpha > 0.01) {
        const flash = ctx.createRadialGradient(0, 0, 0, 0, 0, finalSize * 2)
        flash.addColorStop(0, `rgba(255,230,0,${flashAlpha})`)
        flash.addColorStop(1, 'transparent')
        ctx.fillStyle = flash
        ctx.beginPath()
        ctx.arc(0, 0, finalSize * 2, 0, Math.PI * 2)
        ctx.fill()
      }
      // "NEW" pixel label hovering above for the first 2s
      if (t < 0.6) {
        const labelAlpha = Math.min(1, (0.6 - t) * 3)
        ctx.font = 'bold 9px monospace'
        ctx.fillStyle = `rgba(255,230,0,${labelAlpha})`
        ctx.textAlign = 'center'
        ctx.shadowColor = '#ffe600'
        ctx.shadowBlur = 8
        ctx.fillText('★ NEW ★', 0, -finalSize - 14)
        ctx.shadowBlur = 0
      }
    }

    // === 2. 脉冲光（新游戏） ===
    if (planet.isPulsing && quality > 0.5) {
      const pulse = Math.sin(this.time * 3) * 0.5 + 0.5
      const pulseSize = finalSize * (1.5 + pulse * 0.8)
      const pulseGlow = ctx.createRadialGradient(0, 0, finalSize * 0.8, 0, 0, pulseSize)
      pulseGlow.addColorStop(0, this.colorAlpha(planet.colorTheme, 0.15))
      pulseGlow.addColorStop(1, 'transparent')
      ctx.fillStyle = pulseGlow
      ctx.beginPath()
      ctx.arc(0, 0, pulseSize, 0, Math.PI * 2)
      ctx.fill()

      // 脉冲环 - 像素化虚线环
      ctx.save()
      ctx.setLineDash([3, 5])
      ctx.lineDashOffset = -this.time * 30
      ctx.strokeStyle = this.colorAlpha(planet.colorTheme, 0.3)
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(0, 0, pulseSize * 0.9, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
    }

    // === 3. 呼吸效果 ===
    const breathe = Math.sin(this.time * 1.2 + planet.size) * 0.02 + 1
    const breathSize = finalSize * breathe

    // === 4. 星球本体（多层渐变） ===
    const bodyGrad = ctx.createRadialGradient(
      -breathSize * 0.25, -breathSize * 0.25, breathSize * 0.05,
      breathSize * 0.1, breathSize * 0.1, breathSize
    )
    bodyGrad.addColorStop(0, this.lightenColor(planet.colorTheme, 40 + emissiveBoost * 60))
    bodyGrad.addColorStop(0.4, planet.colorTheme)
    bodyGrad.addColorStop(0.75, planet.colorSecondary)
    bodyGrad.addColorStop(1, '#050510')
    ctx.fillStyle = bodyGrad
    ctx.beginPath()
    ctx.arc(0, 0, breathSize, 0, Math.PI * 2)
    ctx.fill()

    // === 5. 像素表面纹理 ===
    if (zoom > 0.35 && quality > 0.6) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(0, 0, breathSize, 0, Math.PI * 2)
      ctx.clip()

      const pixelSize = Math.max(2, breathSize / 8)
      ctx.fillStyle = this.colorAlpha(planet.colorTheme, 0.08)

      for (let py = -4; py <= 4; py++) {
        for (let px = -4; px <= 4; px++) {
          const hash = ((px * 7 + py * 13 + planet.size * 3) & 7)
          if (hash < 3) {
            ctx.fillRect(px * pixelSize - pixelSize / 2, py * pixelSize - pixelSize / 2, pixelSize - 0.5, pixelSize - 0.5)
          }
        }
      }
      ctx.restore()
    }

    // === 6. 光环（高分游戏） ===
    if (planet.hasRing) {
      ctx.save()
      ctx.scale(1, 0.35)

      ctx.setLineDash([4, 4])
      ctx.lineDashOffset = this.time * 10
      ctx.strokeStyle = this.colorAlpha(planet.colorTheme, 0.55)
      ctx.lineWidth = Math.max(1.5, 2.5 * zoom)
      ctx.beginPath()
      ctx.arc(0, 0, breathSize * 1.65, 0, Math.PI * 2)
      ctx.stroke()

      ctx.setLineDash([2, 6])
      ctx.lineDashOffset = -this.time * 8
      ctx.strokeStyle = this.colorAlpha(planet.colorTheme, 0.3)
      ctx.lineWidth = Math.max(1, 1.5 * zoom)
      ctx.beginPath()
      ctx.arc(0, 0, breathSize * 1.9, 0, Math.PI * 2)
      ctx.stroke()

      ctx.setLineDash([])
      ctx.restore()
    }

    // === 7. 高光 ===
    const hlGrad = ctx.createRadialGradient(
      -breathSize * 0.3, -breathSize * 0.3, 0,
      -breathSize * 0.3, -breathSize * 0.3, breathSize * 0.5
    )
    hlGrad.addColorStop(0, `rgba(255,255,255,${0.3 + emissiveBoost * 0.2})`)
    hlGrad.addColorStop(0.5, 'rgba(255,255,255,0.08)')
    hlGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = hlGrad
    ctx.beginPath()
    ctx.arc(0, 0, breathSize, 0, Math.PI * 2)
    ctx.fill()

    // 像素化高光点
    if (zoom > 0.4 && quality > 0.6) {
      const dotSize = Math.max(1.5, breathSize * 0.08)
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.fillRect(-breathSize * 0.35, -breathSize * 0.35, dotSize, dotSize)
      ctx.fillRect(-breathSize * 0.25, -breathSize * 0.45, dotSize * 0.7, dotSize * 0.7)
    }

    // === 8. Hover 高亮边框（平滑过渡） ===
    if (hoverT > 0.01) {
      const borderAlpha = HOVER_CONFIG.borderGlowAlpha * easedT
      ctx.setLineDash([3, 3])
      ctx.lineDashOffset = -this.time * 20
      ctx.strokeStyle = this.colorAlpha(planet.colorTheme, borderAlpha)
      ctx.lineWidth = 2
      ctx.shadowColor = planet.colorTheme
      ctx.shadowBlur = HOVER_CONFIG.borderGlowRadius * easedT
      ctx.beginPath()
      ctx.arc(0, 0, breathSize + 5 * easedT, 0, Math.PI * 2)
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.setLineDash([])
    }

    // === 9. 游戏名字 (CJK-aware font stack) ===
    if (zoom > 0.35 || hoverT > 0.3) {
      const fontSize = Math.max(11, Math.min(15, breathSize * 0.36))
      // Use the same font stack as DOM body — covers Chinese cleanly,
      // falls back to JetBrains Mono for Latin/digits
      ctx.font = `600 ${fontSize}px "JetBrains Mono","Noto Sans SC",monospace`
      const textAlpha = hoverT > 0.3 ? 1 : 0.85
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      const labelY = breathSize + 10
      // Outline (improves contrast against gradient backgrounds)
      ctx.shadowColor = '#000'
      ctx.shadowBlur = 6
      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(5,5,16,0.85)'
      ctx.strokeText(planet.name, 0, labelY)
      ctx.shadowBlur = 0
      // Fill with theme color
      ctx.fillStyle = this.colorAlpha(planet.colorTheme, textAlpha)
      ctx.fillText(planet.name, 0, labelY)

      // FRESH badge under the name — shown for 7 days post-publish
      if (planet.ageDays !== undefined && planet.ageDays < 7 && hoverT > 0.05) {
        const badgeY = labelY + fontSize + 6
        const badgeText = 'FRESH'
        ctx.font = '700 8px "Press Start 2P",monospace'
        ctx.textBaseline = 'top'
        const w = ctx.measureText(badgeText).width + 8
        const h = 12
        ctx.fillStyle = '#ffe600'
        ctx.shadowColor = '#ffe600'
        ctx.shadowBlur = 8
        ctx.fillRect(-w / 2, badgeY, w, h)
        ctx.shadowBlur = 0
        ctx.fillStyle = '#050510'
        ctx.fillText(badgeText, 0, badgeY + 2)
      }
      ctx.textBaseline = 'alphabetic' // reset
    }

    ctx.restore()
  }

  // 渲染星系标签
  renderGalaxyLabel(
    ctx: CanvasRenderingContext2D,
    name: string,
    color: string,
    worldX: number,
    worldY: number,
    camera: Camera
  ) {
    const screen = this.worldToScreen(worldX, worldY, camera)
    if (screen.x < -200 || screen.x > this.canvasW + 200 ||
        screen.y < -200 || screen.y > this.canvasH + 200) return

    ctx.save()
    const fontSize = Math.max(12, 16 * camera.zoom)
    // Pixel font for galaxy labels — gives them an "epic title" feel
    ctx.font = `${fontSize}px "Press Start 2P","Noto Sans SC",monospace`
    ctx.fillStyle = this.colorAlpha(color, 0.78)
    ctx.textAlign = 'center'
    ctx.shadowColor = color
    ctx.shadowBlur = 14
    ctx.fillText(name, screen.x, screen.y - 130 * camera.zoom)
    ctx.shadowBlur = 0

    // 像素化下划线装饰
    const textWidth = ctx.measureText(name).width
    const lineY = screen.y - 130 * camera.zoom + 5
    ctx.setLineDash([3, 3])
    ctx.strokeStyle = this.colorAlpha(color, 0.25)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(screen.x - textWidth / 2, lineY)
    ctx.lineTo(screen.x + textWidth / 2, lineY)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
  }

  // 渲染能量流
  renderEnergyStream(
    ctx: CanvasRenderingContext2D,
    fromX: number, fromY: number,
    toX: number, toY: number,
    color: string,
    camera: Camera,
    time: number,
    quality: number = 1
  ) {
    const s1 = this.worldToScreen(fromX, fromY, camera)
    const s2 = this.worldToScreen(toX, toY, camera)

    ctx.setLineDash([2, 6])
    ctx.lineDashOffset = time * 15
    const grad = ctx.createLinearGradient(s1.x, s1.y, s2.x, s2.y)
    grad.addColorStop(0, this.colorAlpha(color, 0.03))
    grad.addColorStop(0.5, this.colorAlpha(color, 0.07))
    grad.addColorStop(1, this.colorAlpha(color, 0.03))
    ctx.strokeStyle = grad
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(s1.x, s1.y)
    ctx.lineTo(s2.x, s2.y)
    ctx.stroke()
    ctx.setLineDash([])

    // 像素化流动粒子（降级时减少）
    const count = quality > 0.7 ? 4 : 2
    for (let i = 0; i < count; i++) {
      const t = ((time * 0.12 + i / count) % 1)
      const px = s1.x + (s2.x - s1.x) * t
      const py = s1.y + (s2.y - s1.y) * t
      ctx.fillStyle = this.colorAlpha(color, 0.45)
      ctx.fillRect(px - 1.5, py - 1.5, 3, 3)
    }
  }

  // 世界坐标 → 屏幕坐标
  worldToScreen(wx: number, wy: number, camera: Camera) {
    const cx = (this.canvasW || window.innerWidth) / 2
    const cy = (this.canvasH || window.innerHeight) / 2
    return {
      x: (wx - camera.x) * camera.zoom + cx,
      y: (wy - camera.y) * camera.zoom + cy,
    }
  }

  // 屏幕坐标 → 世界坐标
  screenToWorld(sx: number, sy: number, camera: Camera) {
    const cx = (this.canvasW || window.innerWidth) / 2
    const cy = (this.canvasH || window.innerHeight) / 2
    return {
      x: (sx - cx) / camera.zoom + camera.x,
      y: (sy - cy) / camera.zoom + camera.y,
    }
  }

  // 点击检测
  hitTest(
    screenX: number, screenY: number,
    planets: { planet: Planet; worldX: number; worldY: number }[],
    camera: Camera
  ): Planet | null {
    for (const { planet, worldX, worldY } of planets) {
      const screen = this.worldToScreen(worldX, worldY, camera)
      const hoverT = this.getHoverT(planet)
      const hoverScale = 1 + (HOVER_CONFIG.scaleTo - HOVER_CONFIG.scaleFrom) * hoverT
      const size = planet.size * camera.zoom * hoverScale * 1.3
      const dx = screenX - screen.x
      const dy = screenY - screen.y
      if (dx * dx + dy * dy < size * size) {
        return planet
      }
    }
    return null
  }

  // 辅助：颜色+透明度
  private colorAlpha(hex: string, alpha: number): string {
    if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex
    const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0')
    return hex + a
  }

  // 辅助：变亮颜色
  private lightenColor(hex: string, amount: number): string {
    const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount)
    const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount)
    const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount)
    return `rgb(${r},${g},${b})`
  }
}
