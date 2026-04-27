// ============================================
// NEON RACING GAME v1 — 霓虹赛车，竞速星系专属
// ============================================
import { playSound } from '../utils/sound'

export class RacingGame {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private W = 640; private H = 480
  private animId = 0
  private running = false
  private state: 'title' | 'playing' | 'gameover' = 'title'
  private onScore: (s: number) => void

  // 赛车
  private car = { x: 320, y: 400, lane: 1, width: 40, height: 60 }
  private targetLane = 1
  private lanes = [80, 240, 400, 560] // 4条赛道

  // 障碍物（其他车辆）
  private obstacles: { x: number; y: number; lane: number; type: 'slow' | 'fast' | 'block' }[] = []

  // 道路
  private roadOffset = 0
  private roadSpeed = 5

  // 分数
  private score = 0
  private distance = 0
  private coins: { x: number; y: number }[] = []

  // 难度
  private difficulty = 1
  private maxDifficulty = 10

  // 粒子效果
  private particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = []

  // 障碍物生成控制
  private obstacleSpawnCooldown = 0

  // 时间
  private lastTime = 0

  constructor(canvas: HTMLCanvasElement, onScore: (s: number) => void) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.onScore = onScore
    this.setup()
    this.setupInput()
  }

  private kdHandler: ((e: KeyboardEvent) => void) | null = null
  private clickHandler: (() => void) | null = null

  private setupInput() {
    this.kdHandler = (e: KeyboardEvent) => this.handleKey(e)
    this.clickHandler = () => this.handleClick()
    this.canvas.addEventListener('keydown', this.kdHandler)
    this.canvas.addEventListener('click', this.clickHandler)
    this.canvas.setAttribute('tabindex', '0')
    this.canvas.focus()
  }

  destroy() {
    this.stop()
    if (this.kdHandler) this.canvas.removeEventListener('keydown', this.kdHandler)
    if (this.clickHandler) this.canvas.removeEventListener('click', this.clickHandler)
  }

  private setup() {
    this.canvas.width = this.W
    this.canvas.height = this.H
  }

  start() {
    if (this.running) return
    this.running = true
    this.lastTime = performance.now()
    this.loop()
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.animId)
  }

  
  private reset() {
    this.car = { x: this.lanes[1], y: 400, lane: 1, width: 40, height: 60 }
    this.targetLane = 1
    this.obstacles = []
    this.coins = []
    this.particles = []
    this.score = 0
    this.distance = 0
    this.difficulty = 1
    this.roadSpeed = 5
    this.obstacleSpawnCooldown = 80  // 开始时给玩家足够的缓冲时间
    this.state = 'playing'
  }

  private loop = () => {
    if (!this.running) return
    const now = performance.now()
    const dt = Math.min((now - this.lastTime) / 16.67, 2)
    this.lastTime = now

    this.update(dt)
    this.render()

    this.animId = requestAnimationFrame(this.loop)
  }

  private update(dt: number) {
    if (this.state !== 'playing') return

    // 道路滚动
    this.roadOffset += this.roadSpeed * dt
    if (this.roadOffset > 60) this.roadOffset = 0

    // 距离增加
    this.distance += this.roadSpeed * dt * 0.1
    this.score = Math.floor(this.distance)

    // 难度提升
    if (this.score > this.difficulty * 200 && this.difficulty < this.maxDifficulty) {
      this.difficulty++
      this.roadSpeed = 5 + this.difficulty * 0.5
      playSound('levelup')
    }

    // 车辆移动到目标车道
    const targetX = this.lanes[this.targetLane]
    if (this.car.x !== targetX) {
      const diff = targetX - this.car.x
      this.car.x += diff * 0.15 * dt
      if (Math.abs(diff) < 2) this.car.x = targetX
    }

    // 生成障碍物 - 简洁逻辑：固定间隔，只生成1个，确保有躲避空间
    this.obstacleSpawnCooldown--
    if (this.obstacleSpawnCooldown <= 0) {
      // 检查是否所有障碍物都已经远离屏幕顶部（给玩家足够反应时间）
      const allFarEnough = this.obstacles.every(obs => obs.y > 200)

      if (allFarEnough || this.obstacles.length === 0) {
        // 随机选一条车道生成障碍物
        const lane = Math.floor(Math.random() * 4)
        const type = Math.random() < 0.5 ? 'slow' : Math.random() < 0.7 ? 'fast' : 'block'
        this.obstacles.push({
          x: this.lanes[lane],
          y: -60,
          lane,
          type
        })
      }

      // 冷却时间：根据难度调整，给玩家足够的反应时间
      // 难度1时约100帧间隔，难度10时约40帧
      this.obstacleSpawnCooldown = 80 - this.difficulty * 4
      if (this.obstacleSpawnCooldown < 30) this.obstacleSpawnCooldown = 30
    }

    // 生成金币
    if (Math.random() < 0.03) {
      const lane = Math.floor(Math.random() * 4)
      this.coins.push({ x: this.lanes[lane], y: -30 })
    }

    // 更新障碍物
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i]
      const speed = obs.type === 'fast' ? this.roadSpeed * 0.7 : obs.type === 'slow' ? this.roadSpeed * 1.5 : this.roadSpeed
      obs.y += speed * dt

      if (obs.y > this.H + 60) {
        this.obstacles.splice(i, 1)
      }

      // 碰撞检测
      if (this.checkCollision(obs)) {
        this.crash()
      }
    }

    // 更新金币
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i]
      coin.y += this.roadSpeed * dt

      if (coin.y > this.H + 30) {
        this.coins.splice(i, 1)
      }

      // 收集金币
      if (Math.abs(coin.x - this.car.x) < 30 && Math.abs(coin.y - this.car.y) < 30) {
        this.score += 50
        this.coins.splice(i, 1)
        this.spawnParticles(coin.x, coin.y, '#ffd700')
        playSound('coin')
      }
    }

    // 更新粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.life -= dt * 0.05
      if (p.life <= 0) this.particles.splice(i, 1)
    }

    this.onScore(this.score)
  }

  private checkCollision(obs: { x: number; y: number; lane: number }): boolean {
    const carLeft = this.car.x - this.car.width / 2
    const carRight = this.car.x + this.car.width / 2
    const carTop = this.car.y - this.car.height / 2
    const carBottom = this.car.y + this.car.height / 2

    const obsWidth = 35
    const obsHeight = 50
    const obsLeft = obs.x - obsWidth / 2
    const obsRight = obs.x + obsWidth / 2
    const obsTop = obs.y - obsHeight / 2
    const obsBottom = obs.y + obsHeight / 2

    return carLeft < obsRight && carRight > obsLeft && carTop < obsBottom && carBottom > obsTop
  }

  private crash() {
    this.state = 'gameover'
    this.spawnParticles(this.car.x, this.car.y, '#ff4444')
    playSound('hit')
  }

  private spawnParticles(x: number, y: number, color: string) {
    for (let i = 0; i < 15; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 1,
        color
      })
    }
  }

  private render() {
    // 背景 - 深色道路
    this.ctx.fillStyle = '#1a1a2e'
    this.ctx.fillRect(0, 0, this.W, this.H)

    // 道路分割线
    this.ctx.strokeStyle = '#00f0ff'
    this.ctx.lineWidth = 2
    for (let i = 1; i < 4; i++) {
      const x = i * 160
      this.ctx.beginPath()
      for (let y = -60 + this.roadOffset; y < this.H; y += 60) {
        this.ctx.moveTo(x, y)
        this.ctx.lineTo(x, y + 30)
      }
      this.ctx.stroke()
    }

    // 道路边缘
    this.ctx.strokeStyle = '#ff2d95'
    this.ctx.lineWidth = 4
    this.ctx.beginPath()
    this.ctx.moveTo(0, 0)
    this.ctx.lineTo(0, this.H)
    this.ctx.moveTo(this.W, 0)
    this.ctx.lineTo(this.W, this.H)
    this.ctx.stroke()

    // 障碍物（其他车辆）
    for (const obs of this.obstacles) {
      this.ctx.save()
      this.ctx.translate(obs.x, obs.y)

      const color = obs.type === 'fast' ? '#ff4444' : obs.type === 'slow' ? '#ffaa00' : '#b026ff'
      this.ctx.fillStyle = color
      this.ctx.fillRect(-17, -25, 34, 50)

      // 车灯
      this.ctx.fillStyle = '#ffffff'
      this.ctx.fillRect(-12, -22, 6, 4)
      this.ctx.fillRect(6, -22, 6, 4)

      this.ctx.restore()
    }

    // 金币
    for (const coin of this.coins) {
      this.ctx.beginPath()
      this.ctx.arc(coin.x, coin.y, 12, 0, Math.PI * 2)
      this.ctx.fillStyle = '#ffd700'
      this.ctx.fill()
      this.ctx.strokeStyle = '#ffaa00'
      this.ctx.lineWidth = 2
      this.ctx.stroke()
    }

    // 粒子
    for (const p of this.particles) {
      this.ctx.globalAlpha = p.life
      this.ctx.fillStyle = p.color
      this.ctx.fillRect(p.x - 2, p.y - 2, 4, 4)
    }
    this.ctx.globalAlpha = 1

    // 玩家赛车
    this.ctx.save()
    this.ctx.translate(this.car.x, this.car.y)

    // 车身
    this.ctx.fillStyle = '#00f0ff'
    this.ctx.fillRect(-20, -30, 40, 60)

    // 车身细节
    this.ctx.fillStyle = '#0f0f1a'
    this.ctx.fillRect(-15, -25, 30, 20)

    // 车灯
    this.ctx.fillStyle = '#39ff14'
    this.ctx.fillRect(-12, 25, 6, 4)
    this.ctx.fillRect(6, 25, 6, 4)

    // 尾焰
    if (this.state === 'playing') {
      this.ctx.fillStyle = `rgba(255, 100, 0, ${0.3 + Math.random() * 0.3})`
      this.ctx.fillRect(-8, 30, 16, 10 + Math.random() * 5)
    }

    this.ctx.restore()

    // HUD
    this.ctx.font = '14px "Press Start 2P"'
    this.ctx.fillStyle = '#00f0ff'
    this.ctx.fillText(`SCORE: ${this.score}`, 20, 30)

    this.ctx.fillStyle = '#ffd700'
    this.ctx.fillText(`DIST: ${Math.floor(this.distance)}m`, 20, 60)

    this.ctx.fillStyle = '#ff2d95'
    this.ctx.fillText(`LV: ${this.difficulty}`, 20, 90)

    // 标题/结束画面
    if (this.state === 'title') {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      this.ctx.fillRect(0, 0, this.W, this.H)

      this.ctx.font = '24px "Press Start 2P"'
      this.ctx.fillStyle = '#00f0ff'
      this.ctx.textAlign = 'center'
      this.ctx.fillText('NEON RACING', this.W / 2, this.H / 2 - 40)

      this.ctx.font = '12px "Press Start 2P"'
      this.ctx.fillStyle = '#ffffff'
      this.ctx.fillText('← → 切换车道', this.W / 2, this.H / 2 + 20)
      this.ctx.fillText('点击或按 R 开始', this.W / 2, this.H / 2 + 50)
    }

    if (this.state === 'gameover') {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      this.ctx.fillRect(0, 0, this.W, this.H)

      this.ctx.font = '20px "Press Start 2P"'
      this.ctx.fillStyle = '#ff4444'
      this.ctx.textAlign = 'center'
      this.ctx.fillText('CRASHED!', this.W / 2, this.H / 2 - 30)

      this.ctx.font = '14px "Press Start 2P"'
      this.ctx.fillStyle = '#ffd700'
      this.ctx.fillText(`SCORE: ${this.score}`, this.W / 2, this.H / 2 + 10)

      this.ctx.font = '12px "Press Start 2P"'
      this.ctx.fillStyle = '#ffffff'
      this.ctx.fillText('按 R 或点击重新开始', this.W / 2, this.H / 2 + 50)
    }
  }

  // 输入处理
  handleInput(key: string) {
    if (this.state === 'title') {
      if (key === 'r' || key === 'click') this.reset()
      return
    }

    if (this.state === 'gameover') {
      if (key === 'r' || key === 'click') this.reset()
      return
    }

    if (this.state === 'playing') {
      if (key === 'ArrowLeft' && this.targetLane > 0) {
        this.targetLane--
        playSound('click')
      }
      if (key === 'ArrowRight' && this.targetLane < 3) {
        this.targetLane++
        playSound('click')
      }
    }
  }

  handleClick() {
    this.handleInput('click')
  }

  handleKey(e: KeyboardEvent) {
    if (e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.preventDefault()
    this.handleInput(e.key)
  }
}