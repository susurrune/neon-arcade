// ============ 性能监控 + 动态降级 ============
import { DESIGN_SYSTEM } from './types'

export class PerformanceMonitor {
  private fpsHistory: number[] = []
  private lastFrameTime = 0
  private frameCount = 0
  private sampleInterval = 1 // 每帧采样
  public qualityLevel = 1.0  // 1.0 = full, 0.5 = low

  update(dt: number) {
    this.frameCount++
    if (this.frameCount % this.sampleInterval !== 0) return

    const fps = dt > 0 ? 1 / dt : 60
    this.fpsHistory.push(fps)

    // 保留最近60帧
    if (this.fpsHistory.length > 60) this.fpsHistory.shift()

    // 计算平均FPS
    if (this.fpsHistory.length >= 30) {
      const avg = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
      const threshold = DESIGN_SYSTEM.performance.degradeThreshold

      if (avg < threshold) {
        // 降级
        this.qualityLevel = Math.max(0.4, this.qualityLevel - 0.02)
      } else if (avg > threshold + 15) {
        // 恢复
        this.qualityLevel = Math.min(1.0, this.qualityLevel + 0.01)
      }
    }
  }

  get avgFPS(): number {
    if (this.fpsHistory.length === 0) return 60
    return this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
  }
}
