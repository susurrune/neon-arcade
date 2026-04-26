// ============================================
// JUMP JUMP (跳一跳) — 蓄力精准跳跃挑战
// ============================================
import { playSound } from '../utils/sound'

export class PlatformerGame {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private W = 640
  private H = 400
  private dpr = 1
  private animId = 0
  private running = false
  private state: 'title' | 'charging' | 'jumping' | 'gameover' = 'title'

  // ===== Game constants =====
  private readonly PLAYER_RADIUS = 12
  private readonly PLATFORM_HEIGHT = 18
  private readonly JUMP_DURATION = 320  // ms
  private readonly JUMP_ARC_HEIGHT = 48
  private readonly MIN_JUMP_DIST = 70
  private readonly MAX_JUMP_DIST = 270
  private readonly MAX_CHARGE_MS = 1500
  private readonly NEXT_MIN_DIST = 85
  private readonly NEXT_MAX_DIST = 260
  private readonly Y_VARY_RANGE = 24
  private readonly PLATFORM_MIN_W = 46
  private readonly PLATFORM_MAX_W = 78

  // ===== Game state =====
  private platforms: { x: number; y: number; width: number; height: number }[] = []
  private currentIdx = 0
  private score = 0
  private combo = 0
  private bestScore = 0

  // Charging state
  private chargeStartTime = 0
  private currentChargeRatio = 0

  // Jump animation
  private jumpStartTime = 0
  private jumpStartPos = { x: 0, y: 0 }
  private jumpTargetPos = { x: 0, y: 0 }
  private jumpDistance = 0
  private playerX = 0
  private playerY = 0

  // Floating score display
  private floatingScore = { active: false, x: 0, y: 0, value: 0, life: 0, text: '' }

  // Particles
  private particles: { x: number; y: number; vx: number; vy: number; color: string; size: number; life: number }[] = []

  private onScoreUpdate: (score: number) => void

  constructor(canvas: HTMLCanvasElement, onScoreUpdate: (score: number) => void) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.onScoreUpdate = onScoreUpdate
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.setupCanvas()
    this.loadBestScore()
    this.initPlatforms()
    this.setupInput()
  }

  private setupCanvas() {
    const rect = this.canvas.parentElement?.getBoundingClientRect()
    const w = rect?.width || 640
    const h = w * 0.625
    this.canvas.width = w * this.dpr
    this.canvas.height = h * this.dpr
    this.canvas.style.width = w + 'px'
    this.canvas.style.height = h + 'px'
    this.ctx.scale(this.dpr, this.dpr)
    this.W = w
    this.H = h
  }

  private loadBestScore() {
    try {
      const saved = localStorage.getItem('jump_best_score')
      if (saved && !isNaN(parseInt(saved))) this.bestScore = parseInt(saved)
    } catch { /* silent */ }
  }

  private saveBestScore() {
    if (this.score > this.bestScore) {
      this.bestScore = this.score
      localStorage.setItem('jump_best_score', this.bestScore.toString())
    }
  }

  // ===== Platform generation =====
  private generateNextPlatform(prev: { x: number; y: number; width: number; height: number }) {
    let dist = this.NEXT_MIN_DIST + Math.random() * (this.NEXT_MAX_DIST - this.NEXT_MIN_DIST)
    let yOffset = (Math.random() - 0.5) * this.Y_VARY_RANGE * 2
    let newY = Math.min(this.H - this.PLATFORM_HEIGHT - 20, Math.max(60, prev.y + yOffset))
    let newX = prev.x + dist

    // Keep platform visible
    let maxAllowedX = this.W - 40
    if (newX > maxAllowedX) {
      let maxDist = maxAllowedX - prev.x
      if (maxDist > this.NEXT_MIN_DIST) {
        dist = Math.min(dist, maxDist)
        newX = prev.x + dist
      } else {
        newX = maxAllowedX - 8
      }
    }

    let width = this.PLATFORM_MIN_W + Math.random() * (this.PLATFORM_MAX_W - this.PLATFORM_MIN_W)
    return { x: newX, y: newY, width: Math.floor(width), height: this.PLATFORM_HEIGHT }
  }

  private initPlatforms() {
    const startX = 140
    const startY = this.H - 100
    const baseW = 68
    const p1 = { x: startX, y: startY, width: baseW, height: this.PLATFORM_HEIGHT }
    const p2 = this.generateNextPlatform(p1)
    const p3 = this.generateNextPlatform(p2)
    this.platforms = [p1, p2, p3]
    this.currentIdx = 0
    this.playerX = p1.x
    this.playerY = p1.y - this.PLATFORM_HEIGHT / 2 - this.PLAYER_RADIUS
  }

  private ensurePlatforms() {
    while (this.platforms.length - (this.currentIdx + 1) < 2) {
      const last = this.platforms[this.platforms.length - 1]
      this.platforms.push(this.generateNextPlatform(last))
    }
    // Trim old platforms
    if (this.currentIdx > 4) {
      const removeCount = this.currentIdx - 2
      if (removeCount > 0) {
        this.platforms.splice(0, removeCount)
        this.currentIdx -= removeCount
      }
    }
  }

  private resetGame() {
    this.state = 'title'
    this.score = 0
    this.combo = 0
    this.currentIdx = 0
    this.platforms = []
    this.particles = []
    this.floatingScore.active = false
    this.currentChargeRatio = 0
    this.initPlatforms()
    this.onScoreUpdate(0)
  }

  // ===== Input handling =====
  private setupInput() {
    // Keyboard events
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault()
        this.startCharge()
      }
      if ((e.key === 'r' || e.key === 'R') && this.state === 'gameover') {
        this.resetGame()
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault()
        this.endCharge()
      }
    }

    // Touch events
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      this.startCharge()
    }

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault()
      this.endCharge()
    }

    // Mouse events
    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault()
      this.startCharge()
    }

    const onMouseUp = (e: MouseEvent) => {
      e.preventDefault()
      this.endCharge()
    }

    this.canvas.addEventListener('keydown', onKeyDown)
    this.canvas.addEventListener('keyup', onKeyUp)
    this.canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    this.canvas.addEventListener('touchend', onTouchEnd, { passive: false })
    this.canvas.addEventListener('mousedown', onMouseDown)
    this.canvas.addEventListener('mouseup', onMouseUp)
    this.canvas.setAttribute('tabindex', '0')
    this.canvas.focus()
  }

  private startCharge() {
    if (this.state === 'title') {
      this.state = 'charging'
      this.initPlatforms()
      this.playerX = this.platforms[0].x
      this.playerY = this.platforms[0].y - this.PLATFORM_HEIGHT / 2 - this.PLAYER_RADIUS
      playSound('click')
    } else if (this.state === 'charging' || this.state === 'gameover') {
      return // Already charging or game over
    }
  }

  private endCharge() {
    if (this.state !== 'charging') return

    const chargeDuration = Math.min(this.MAX_CHARGE_MS, Date.now() - this.chargeStartTime)
    if (chargeDuration < 50) {
      // Too short, treat as tap
      this.chargeStartTime = 0
      this.currentChargeRatio = 0
      return
    }

    // Calculate jump distance
    const ratio = Math.min(1, chargeDuration / this.MAX_CHARGE_MS)
    const jumpDist = this.MIN_JUMP_DIST + ratio * (this.MAX_JUMP_DIST - this.MIN_JUMP_DIST)

    this.performJump(jumpDist)
  }

  private performJump(distance: number) {
    if (this.state !== 'charging') return

    const currentPlat = this.platforms[this.currentIdx]
    if (!currentPlat) return

    this.ensurePlatforms()
    const nextPlat = this.platforms[this.currentIdx + 1]
    if (!nextPlat) {
      this.state = 'gameover'
      return
    }

    // Setup jump animation
    this.jumpDistance = distance
    this.jumpStartPos = {
      x: currentPlat.x,
      y: currentPlat.y - this.PLATFORM_HEIGHT / 2 - this.PLAYER_RADIUS
    }
    // Target landing position (predict based on distance)
    this.jumpTargetPos = {
      x: this.jumpStartPos.x + distance,
      y: nextPlat.y - this.PLATFORM_HEIGHT / 2 - this.PLAYER_RADIUS
    }
    this.jumpStartTime = performance.now()
    this.state = 'jumping'
    this.currentChargeRatio = 0
    playSound('jump')
    this.spawnParticles(this.playerX, this.playerY, '#ffe600', 4)
  }

  // ===== Scoring =====
  private calculateScore(landX: number, platform: { x: number; width: number }): { points: number; rating: string } {
    const centerX = platform.x
    const offset = Math.abs(landX - centerX)
    const halfWidth = platform.width / 2

    if (offset > halfWidth) {
      return { points: -1, rating: 'miss' }
    }

    const ratio = offset / halfWidth
    let basePoints = 10
    let extra = 0
    let rating = 'normal'

    if (ratio <= 0.08) {
      extra = 40
      rating = 'perfect'
      this.combo++
      playSound('combo')
    } else if (ratio <= 0.25) {
      extra = 20
      rating = 'good'
      this.combo++
    } else if (ratio <= 0.55) {
      extra = 8
      rating = 'ok'
      this.combo = Math.max(0, this.combo - 1)
    } else {
      extra = 2
      rating = 'edge'
      this.combo = 0
    }

    const comboBonus = Math.min(this.combo * 2, 24)
    const total = basePoints + extra + comboBonus

    return { points: total, rating }
  }

  private onJumpLand(landX: number) {
    if (this.state !== 'jumping') return

    const nextPlat = this.platforms[this.currentIdx + 1]
    if (!nextPlat) {
      this.state = 'gameover'
      playSound('death')
      return
    }

    const leftBound = nextPlat.x - nextPlat.width / 2
    const rightBound = nextPlat.x + nextPlat.width / 2

    if (landX >= leftBound && landX <= rightBound) {
      // Successful landing
      const result = this.calculateScore(landX, nextPlat)
      this.score += result.points
      this.currentIdx++

      // Update player position
      this.playerX = landX
      this.playerY = nextPlat.y - this.PLATFORM_HEIGHT / 2 - this.PLAYER_RADIUS

      // Floating score text
      const ratingText = result.rating === 'perfect' ? 'PERFECT!' :
                        result.rating === 'good' ? 'GOOD!' :
                        result.rating === 'ok' ? 'OK' : ''
      this.floatingScore = {
        active: true,
        x: landX,
        y: nextPlat.y - 28,
        value: result.points,
        life: 1.0,
        text: ratingText
      }

      // Spawn celebration particles
      if (result.rating === 'perfect') {
        this.spawnParticles(landX, this.playerY, '#39ff14', 12)
        this.spawnParticles(landX, this.playerY, '#ffe600', 8)
      } else if (result.rating === 'good') {
        this.spawnParticles(landX, this.playerY, '#00f0ff', 6)
      }

      this.ensurePlatforms()
      this.saveBestScore()
      this.onScoreUpdate(this.score)

      // Return to charging state
      this.state = 'charging'
      this.chargeStartTime = Date.now()
      playSound('score')
    } else {
      // Miss - game over
      this.state = 'gameover'
      this.playerX = landX
      this.playerY = this.H + 50 // Fall position
      playSound('death')
      this.spawnParticles(landX, nextPlat.y, '#ff2d95', 15)
      this.saveBestScore()
    }
  }

  // ===== Particles =====
  private spawnParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 2 + Math.random() * 3
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        color,
        size: 2 + Math.random() * 3,
        life: 20 + Math.random() * 20
      })
    }
  }

  // ===== Game loop =====
  start() {
    this.running = true
    this.loop()
    if (this.state === 'title') {
      this.state = 'charging'
    }
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.animId)
  }

  private loop = () => {
    if (!this.running) return
    this.update()
    this.render()
    this.animId = requestAnimationFrame(this.loop)
  }

  private update() {
    // Update charging
    if (this.state === 'charging') {
      if (this.chargeStartTime > 0) {
        const elapsed = Date.now() - this.chargeStartTime
        this.currentChargeRatio = Math.min(1, elapsed / this.MAX_CHARGE_MS)
      } else {
        this.chargeStartTime = Date.now()
        this.currentChargeRatio = 0
      }
    }

    // Update jump animation
    if (this.state === 'jumping') {
      const elapsed = performance.now() - this.jumpStartTime
      let t = Math.min(1, elapsed / this.JUMP_DURATION)

      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - t, 3)

      // X position (linear interpolation)
      this.playerX = this.jumpStartPos.x + (this.jumpTargetPos.x - this.jumpStartPos.x) * easeOut

      // Y position (parabolic arc)
      const dyTotal = this.jumpTargetPos.y - this.jumpStartPos.y
      const arc = this.JUMP_ARC_HEIGHT * Math.sin(Math.PI * t)
      this.playerY = this.jumpStartPos.y + dyTotal * easeOut - arc

      // End of jump
      if (t >= 1) {
        this.onJumpLand(this.jumpTargetPos.x)
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.15
      p.life--
      if (p.life <= 0) this.particles.splice(i, 1)
    }

    // Update floating score
    if (this.floatingScore.active) {
      this.floatingScore.life -= 0.03
      if (this.floatingScore.life <= 0) {
        this.floatingScore.active = false
      }
    }
  }

  // ===== Rendering =====
  private render() {
    const ctx = this.ctx
    ctx.clearRect(0, 0, this.W, this.H)

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.H)
    bgGrad.addColorStop(0, '#c9e9ff')
    bgGrad.addColorStop(1, '#b2d8e6')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, this.W, this.H)

    // Grid decoration
    ctx.strokeStyle = '#ffffff40'
    ctx.lineWidth = 1
    for (let i = 0; i < this.H; i += 40) {
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(this.W, i)
      ctx.stroke()
    }
    for (let i = 0; i < this.W; i += 40) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, this.H)
      ctx.stroke()
    }

    // Draw platforms
    for (let i = 0; i < this.platforms.length; i++) {
      const p = this.platforms[i]
      const leftX = p.x - p.width / 2
      const topY = p.y - this.PLATFORM_HEIGHT / 2

      // Platform shadow
      ctx.shadowColor = 'rgba(0,0,0,0.3)'
      ctx.shadowBlur = 8

      // Main platform body
      ctx.fillStyle = '#f5bc70'
      ctx.beginPath()
      this.roundRect(ctx, leftX, topY, p.width, this.PLATFORM_HEIGHT, 8)
      ctx.fill()

      // Top highlight
      ctx.shadowBlur = 0
      ctx.fillStyle = '#ffe2a4'
      ctx.beginPath()
      this.roundRect(ctx, leftX + 2, topY - 1, p.width - 4, 4, 3)
      ctx.fill()

      // Bottom edge
      ctx.fillStyle = '#c97e3a'
      ctx.beginPath()
      this.roundRect(ctx, leftX, topY + this.PLATFORM_HEIGHT - 3, p.width, 3, 2)
      ctx.fill()

      // Center dot decoration
      ctx.beginPath()
      ctx.arc(p.x, topY + this.PLATFORM_HEIGHT / 2, 3, 0, Math.PI * 2)
      ctx.fillStyle = '#ffd58c'
      ctx.fill()

      // Highlight current platform
      if (i === this.currentIdx) {
        ctx.strokeStyle = '#39ff14'
        ctx.lineWidth = 2
        ctx.shadowColor = '#39ff14'
        ctx.shadowBlur = 6
        ctx.beginPath()
        this.roundRect(ctx, leftX - 2, topY - 2, p.width + 4, this.PLATFORM_HEIGHT + 4, 10)
        ctx.stroke()
        ctx.shadowBlur = 0
      }

      // Highlight next platform (target)
      if (i === this.currentIdx + 1) {
        ctx.strokeStyle = '#ffe600'
        ctx.lineWidth = 1
        ctx.shadowColor = '#ffe600'
        ctx.shadowBlur = 4
        ctx.beginPath()
        this.roundRect(ctx, leftX - 1, topY - 1, p.width + 2, this.PLATFORM_HEIGHT + 2, 9)
        ctx.stroke()
        ctx.shadowBlur = 0
      }
    }

    // Draw player
    ctx.shadowColor = '#2c2e3e'
    ctx.shadowBlur = 12
    const playerGrad = ctx.createRadialGradient(
      this.playerX - 3, this.playerY - 3, 3,
      this.playerX, this.playerY, this.PLAYER_RADIUS + 2
    )
    playerGrad.addColorStop(0, '#fff9e0')
    playerGrad.addColorStop(1, '#f3b33d')
    ctx.fillStyle = playerGrad
    ctx.beginPath()
    ctx.arc(this.playerX, this.playerY, this.PLAYER_RADIUS, 0, Math.PI * 2)
    ctx.fill()

    // Eyes
    ctx.shadowBlur = 0
    ctx.fillStyle = '#2d1b0c'
    ctx.beginPath()
    ctx.arc(this.playerX - 3, this.playerY - 3, 2.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'white'
    ctx.beginPath()
    ctx.arc(this.playerX - 4, this.playerY - 4, 1, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ff8866'
    ctx.beginPath()
    ctx.arc(this.playerX + 2, this.playerY - 1, 1.8, 0, Math.PI * 2)
    ctx.fill()

    // Charging indicator (during charging)
    if (this.state === 'charging' && this.currentChargeRatio > 0) {
      // Charge bar above player
      const barWidth = 60
      const barHeight = 6
      const barX = this.playerX - barWidth / 2
      const barY = this.playerY - this.PLAYER_RADIUS - 20

      ctx.fillStyle = '#2c2f36cc'
      ctx.beginPath()
      this.roundRect(ctx, barX, barY, barWidth, barHeight, 3)
      ctx.fill()

      const fillWidth = barWidth * this.currentChargeRatio
      const fillGrad = ctx.createLinearGradient(barX, barY, barX + fillWidth, barY)
      fillGrad.addColorStop(0, '#3ce0b0')
      fillGrad.addColorStop(1, '#8effc2')
      ctx.fillStyle = fillGrad
      ctx.beginPath()
      this.roundRect(ctx, barX, barY, fillWidth, barHeight, 3)
      ctx.fill()

      // Glow effect
      ctx.shadowColor = '#88ffcc'
      ctx.shadowBlur = 4
      ctx.fillRect(barX + fillWidth - 2, barY, 2, barHeight)
      ctx.shadowBlur = 0

      // Power percentage text
      ctx.fillStyle = '#39ff14'
      ctx.font = '8px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(`${Math.round(this.currentChargeRatio * 100)}%`, this.playerX, barY - 4)
    }

    // Floating score text
    if (this.floatingScore.active) {
      const alpha = Math.min(1, this.floatingScore.life)
      ctx.font = 'bold 16px sans-serif'
      ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`
      ctx.textAlign = 'center'
      ctx.shadowColor = '#00000080'
      ctx.shadowBlur = 2

      if (this.floatingScore.text) {
        ctx.fillText(this.floatingScore.text, this.floatingScore.x, this.floatingScore.y - 20 - 15 * (1 - this.floatingScore.life))
      }
      ctx.fillText(`+${this.floatingScore.value}`, this.floatingScore.x, this.floatingScore.y - 15 * (1 - this.floatingScore.life))
      ctx.shadowBlur = 0
    }

    // Particles
    for (const p of this.particles) {
      ctx.globalAlpha = Math.min(1, p.life / 15)
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // HUD
    ctx.textAlign = 'left'
    ctx.fillStyle = '#39ff14'
    ctx.font = '10px "Press Start 2P", monospace'
    ctx.fillText(`SCORE: ${this.score}`, 8, 16)
    ctx.fillStyle = '#ffe600'
    ctx.font = '9px "Press Start 2P", monospace'
    ctx.fillText(`BEST: ${this.bestScore}`, 8, 28)
    ctx.fillStyle = '#fcb43a'
    ctx.font = '8px "Press Start 2P", monospace'
    ctx.fillText(`COMBO: ${this.combo}`, 8, 40)

    // Title screen
    if (this.state === 'title') {
      ctx.fillStyle = 'rgba(200, 230, 255, 0.9)'
      ctx.fillRect(0, 0, this.W, this.H)

      ctx.textAlign = 'center'
      ctx.fillStyle = '#f5bc70'
      ctx.font = '20px "Press Start 2P", monospace'
      ctx.fillText('JUMP JUMP', this.W / 2, this.H / 2 - 50)

      ctx.fillStyle = '#39ff14'
      ctx.font = '8px "Press Start 2P", monospace'
      ctx.fillText('蓄力跳跃 · 精准落地', this.W / 2, this.H / 2 - 20)

      ctx.fillStyle = '#ffe600'
      ctx.font = '6px "Press Start 2P", monospace'
      ctx.fillText('按住空格蓄力 · 释放跳跃', this.W / 2, this.H / 2 + 10)

      ctx.fillStyle = '#4a4a6a'
      ctx.font = '6px "Press Start 2P", monospace'
      if (Math.sin(Date.now() / 300) > 0) {
        ctx.fillText('TAP OR PRESS SPACE', this.W / 2, this.H / 2 + 40)
      }
    }

    // Game over
    if (this.state === 'gameover') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
      ctx.fillRect(0, 0, this.W, this.H)

      ctx.textAlign = 'center'
      ctx.fillStyle = '#ffcf9a'
      ctx.font = '16px "Press Start 2P", monospace'
      ctx.fillText('GAME OVER', this.W / 2, this.H / 2 - 40)

      ctx.fillStyle = '#39ff14'
      ctx.font = '10px "Press Start 2P", monospace'
      ctx.fillText(`SCORE: ${this.score}`, this.W / 2, this.H / 2 - 10)

      ctx.fillStyle = '#ffe600'
      ctx.font = '9px "Press Start 2P", monospace'
      ctx.fillText(`BEST: ${this.bestScore}`, this.W / 2, this.H / 2 + 15)

      ctx.fillStyle = '#4a4a6a'
      ctx.font = '8px "Press Start 2P", monospace'
      if (Math.sin(Date.now() / 300) > 0) {
        ctx.fillText('R TO RETRY', this.W / 2, this.H / 2 + 50)
      }
    }
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    if (w < 2 * r) r = w / 2
    if (h < 2 * r) r = h / 2
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
  }
}