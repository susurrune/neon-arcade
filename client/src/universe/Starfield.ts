// ============ 星空背景渲染 — 工业级 ============
import { DESIGN_SYSTEM } from './types'
import type { Star } from './types'

const STAR_COLORS = ['#ffffff', '#aaaaff', '#ffaaaa', '#aaffff', '#ffffaa']

export class Starfield {
  private stars: Star[] = []
  private nebulae: { x: number; y: number; radius: number; color: string; alpha: number }[] = []
  private width = 0
  private height = 0
  private time = 0

  init(width: number, height: number, count: number = 400) {
    this.width = width
    this.height = height
    this.stars = []

    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * width * 3 - width,
        y: Math.random() * height * 3 - height,
        size: Math.random() * 2 + 0.3,
        brightness: Math.random() * 0.7 + 0.3,
        speed: Math.random() * 0.15 + 0.02,
        color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 2 + 0.5,
      })
    }

    // 星云 — 使用设计系统色彩
    this.nebulae = []
    const nebulaColors = [DESIGN_SYSTEM.colors.primary, DESIGN_SYSTEM.colors.secondary, DESIGN_SYSTEM.colors.accent, '#39ff14']
    for (let i = 0; i < 5; i++) {
      this.nebulae.push({
        x: Math.random() * width * 2,
        y: Math.random() * height * 2,
        radius: Math.random() * 300 + 150,
        color: nebulaColors[Math.floor(Math.random() * nebulaColors.length)],
        alpha: Math.random() * 0.03 + 0.01,
      })
    }
  }

  resize(width: number, height: number) {
    const scaleX = width / this.width
    const scaleY = height / this.height
    this.stars.forEach(s => {
      s.x *= scaleX
      s.y *= scaleY
    })
    this.nebulae.forEach(n => {
      n.x *= scaleX
      n.y *= scaleY
    })
    this.width = width
    this.height = height
  }

  update(dt: number) {
    this.time += dt
  }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number, quality: number = 1) {
    const w = this.width
    const h = this.height

    // === 星云渲染（降级时跳过） ===
    if (quality > 0.6) {
      for (const nebula of this.nebulae) {
        const parallax = 0.15 / zoom
        const nx = nebula.x - camX * parallax
        const ny = nebula.y - camY * parallax

        const pulse = Math.sin(this.time * 0.3 + nebula.radius) * 0.2 + 1
        const r = nebula.radius * pulse

        const grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, r)
        const a1 = Math.round(nebula.alpha * 255 * quality).toString(16).padStart(2, '0')
        const a2 = Math.round(nebula.alpha * 0.5 * 255 * quality).toString(16).padStart(2, '0')
        grad.addColorStop(0, nebula.color + a1)
        grad.addColorStop(0.5, nebula.color + a2)
        grad.addColorStop(1, 'transparent')
        ctx.fillStyle = grad
        ctx.fillRect(nx - r, ny - r, r * 2, r * 2)
      }
    }

    // === 星星渲染（降级时减少数量） ===
    const maxStars = quality > 0.7 ? this.stars.length : Math.floor(this.stars.length * 0.5)
    for (let i = 0; i < maxStars; i++) {
      const star = this.stars[i]
      const parallax = 0.3 / zoom
      const sx = star.x - camX * parallax
      const sy = star.y - camY * parallax

      const wx = ((sx % w) + w) % w
      const wy = ((sy % h) + h) % h

      const twinkle = Math.sin(this.time * star.twinkleSpeed + star.twinklePhase) * 0.3 + 0.7
      const alpha = star.brightness * twinkle
      const starSize = star.size * Math.min(zoom, 1.5)

      ctx.globalAlpha = alpha

      if (starSize < 1.5) {
        ctx.fillStyle = star.color
        ctx.fillRect(wx - starSize / 2, wy - starSize / 2, starSize, starSize)
      } else {
        ctx.fillStyle = star.color
        ctx.beginPath()
        ctx.arc(wx, wy, starSize, 0, Math.PI * 2)
        ctx.fill()

        // 像素十字闪光（大星星，高质量时）
        if (starSize > 1.8 && alpha > 0.6 && quality > 0.7) {
          const crossSize = starSize * 2
          ctx.fillStyle = star.color
          ctx.globalAlpha = alpha * 0.3
          ctx.fillRect(wx - crossSize / 2, wy - 0.5, crossSize, 1)
          ctx.fillRect(wx - 0.5, wy - crossSize / 2, 1, crossSize)
        }
      }
    }
    ctx.globalAlpha = 1
  }
}
