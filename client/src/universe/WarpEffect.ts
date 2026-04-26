// ============ Warp 跃迁动画 — 工业级 ============
import { WARP_CONFIG, Easing } from './types'
import type { Camera, WarpState, Planet } from './types'

export class WarpEffect {
  private state: WarpState = {
    active: false,
    progress: 0,
    targetPlanetId: null,
    startX: 0,
    startY: 0,
    startZoom: 0,
    startTime: 0,
  }

  private onWarpComplete: ((planetId: string) => void) | null = null
  private starStreaks: { angle: number; length: number; speed: number; offset: number; color: string }[] = []
  private pixelDebris: { x: number; y: number; size: number; speed: number; angle: number; color: string }[] = []

  constructor() {
    // 预生成星线条纹
    for (let i = 0; i < WARP_CONFIG.starStreakCount; i++) {
      this.starStreaks.push({
        angle: Math.random() * Math.PI * 2,
        length: Math.random() * 150 + 50,
        speed: Math.random() * 2.5 + 0.8,
        offset: Math.random() * 500,
        color: ['#00f0ff', '#7C3AED', '#22D3EE', '#ffffff'][Math.floor(Math.random() * 4)],
      })
    }
    // 像素碎片
    for (let i = 0; i < WARP_CONFIG.debrisCount; i++) {
      this.pixelDebris.push({
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
        size: Math.random() * 4 + 2,
        speed: Math.random() * 3 + 1,
        angle: Math.random() * Math.PI * 2,
        color: ['#00f0ff', '#7C3AED', '#FF2E88', '#22D3EE'][Math.floor(Math.random() * 4)],
      })
    }
  }

  get isActive() { return this.state.active }
  get progress() { return this.state.progress }
  get state_data() { return this.state }

  start(
    planet: Planet,
    planetWorldX: number,
    planetWorldY: number,
    currentCamera: Camera,
    onComplete: (planetId: string) => void
  ) {
    this.state = {
      active: true,
      progress: 0,
      targetPlanetId: planet.id,
      startX: currentCamera.x,
      startY: currentCamera.y,
      startZoom: currentCamera.zoom,
      startTime: performance.now(),
    }
    this.onWarpComplete = onComplete
  }

  update(dt: number, camera: Camera): Camera {
    if (!this.state.active) return camera

    // 基于时间的进度（而非帧数）
    const elapsed = performance.now() - this.state.startTime
    const duration = WARP_CONFIG.duration
    this.state.progress = Math.min(1, elapsed / duration)

    if (this.state.progress >= 1) {
      this.state.active = false
      this.state.progress = 1
      if (this.onWarpComplete && this.state.targetPlanetId) {
        this.onWarpComplete(this.state.targetPlanetId)
      }
      return camera
    }

    return camera
  }

  // 渲染跃迁特效
  render(ctx: CanvasRenderingContext2D, width: number, height: number, progress: number, quality: number = 1) {
    if (progress <= 0) return

    const cx = width / 2
    const cy = height / 2
    // 使用缓动曲线让进度更自然
    const t = Easing.easeInOutCubic(progress)
    const distortStrength = WARP_CONFIG.distortionStrength

    // === 1. 空间压缩效果 — 径向暗角 + 中心拉伸 ===
    const warpIntensity = Math.pow(t, 1.5) * distortStrength
    const vignetteGrad = ctx.createRadialGradient(cx, cy, width * 0.1, cx, cy, width * 0.6)
    vignetteGrad.addColorStop(0, 'transparent')
    vignetteGrad.addColorStop(0.5, `rgba(7, 58, 237, ${warpIntensity * 0.08})`) // 微妙蓝色
    vignetteGrad.addColorStop(0.8, `rgba(124, 58, 237, ${warpIntensity * 0.2})`) // 紫色压迫
    vignetteGrad.addColorStop(1, `rgba(0, 0, 0, ${warpIntensity * 0.4})`)
    ctx.fillStyle = vignetteGrad
    ctx.fillRect(0, 0, width, height)

    // === 2. 星线条纹（多色 + 像素化） ===
    if (t > 0.1) {
      const streakAlpha = Math.min((t - 0.1) * 2.5, 1)
      const streakCount = quality > 0.7 ? this.starStreaks.length : Math.floor(this.starStreaks.length * 0.5)

      for (let i = 0; i < streakCount; i++) {
        const streak = this.starStreaks[i]
        const dist = (t * streak.speed * 500 + streak.offset) % 700
        const innerR = dist
        const outerR = dist + streak.length * t
        const sx1 = cx + Math.cos(streak.angle) * innerR
        const sy1 = cy + Math.sin(streak.angle) * innerR
        const sx2 = cx + Math.cos(streak.angle) * outerR
        const sy2 = cy + Math.sin(streak.angle) * outerR

        const grad = ctx.createLinearGradient(sx1, sy1, sx2, sy2)
        grad.addColorStop(0, 'transparent')
        grad.addColorStop(0.3, this.colorAlpha(streak.color, streakAlpha * 0.3))
        grad.addColorStop(1, this.colorAlpha(streak.color, streakAlpha * 0.5))

        ctx.strokeStyle = grad
        ctx.lineWidth = 1.5
        ctx.setLineDash([3, 2])
        ctx.beginPath()
        ctx.moveTo(sx1, sy1)
        ctx.lineTo(sx2, sy2)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    // === 3. 像素碎片飞散 ===
    if (t > 0.15 && t < 0.85 && quality > 0.5) {
      const debrisAlpha = Math.min((t - 0.15) * 3, 1) * (1 - Math.max(0, (t - 0.7) * 3))
      const debrisCount = quality > 0.7 ? this.pixelDebris.length : Math.floor(this.pixelDebris.length * 0.5)
      for (let i = 0; i < debrisCount; i++) {
        const debris = this.pixelDebris[i]
        const dist = t * debris.speed * 350
        const px = cx + Math.cos(debris.angle) * dist + debris.x * 120
        const py = cy + Math.sin(debris.angle) * dist + debris.y * 120
        ctx.fillStyle = this.colorAlpha(debris.color, debrisAlpha * 0.5)
        ctx.fillRect(px, py, debris.size, debris.size)
      }
    }

    // === 4. 色差偏移（Chromatic Aberration） ===
    if (t > 0.3 && t < 0.9 && quality > 0.7) {
      const caStrength = Math.sin((t - 0.3) / 0.6 * Math.PI) * WARP_CONFIG.chromaticShift
      // 红色偏移
      ctx.fillStyle = `rgba(255, 0, 80, ${caStrength * 0.015})`
      ctx.fillRect(caStrength, 0, width, height)
      // 青色偏移
      ctx.fillStyle = `rgba(0, 240, 255, ${caStrength * 0.015})`
      ctx.fillRect(-caStrength, 0, width, height)
    }

    // === 5. 中心坍缩光圈 ===
    if (t > 0.4) {
      const collapseProgress = (t - 0.4) / 0.6
      const radius = width * 0.4 * (1 - Easing.easeInCubic(collapseProgress))
      if (radius > 5) {
        const collapseGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
        collapseGrad.addColorStop(0, `rgba(124, 58, 237, ${collapseProgress * 0.3})`)
        collapseGrad.addColorStop(0.5, `rgba(34, 211, 238, ${collapseProgress * 0.15})`)
        collapseGrad.addColorStop(1, 'transparent')
        ctx.fillStyle = collapseGrad
        ctx.beginPath()
        ctx.arc(cx, cy, radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // === 6. 白色闪光（到达时） ===
    if (t > 0.82) {
      const flash = Math.pow((t - 0.82) / 0.18, 2)
      ctx.fillStyle = `rgba(255, 255, 255, ${flash * 0.85})`
      ctx.fillRect(0, 0, width, height)
    }

    // === 7. CRT 扫描线加速 ===
    if (t > 0.1 && quality > 0.5) {
      const scanIntensity = t * 0.1
      const scanGap = t < 0.5 ? 3 : 2
      for (let y = 0; y < height; y += scanGap) {
        ctx.fillStyle = `rgba(0, 0, 0, ${scanIntensity})`
        ctx.fillRect(0, y, width, 1)
      }
    }

    // === 8. 像素化噪点 ===
    if (t > 0.25 && t < 0.9 && quality > 0.7) {
      const noiseAlpha = Math.min((t - 0.25) * 0.3, 0.12)
      const noiseCount = Math.floor(t * 50)
      for (let i = 0; i < noiseCount; i++) {
        const nx = Math.random() * width
        const ny = Math.random() * height
        const ns = Math.random() * 3 + 1
        ctx.fillStyle = `rgba(255, 255, 255, ${noiseAlpha})`
        ctx.fillRect(nx, ny, ns, ns)
      }
    }
  }

  private colorAlpha(hex: string, alpha: number): string {
    if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex
    const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0')
    return hex + a
  }
}
