// ============================================
// SNAKE GAME v4 — 加速冲刺 + 连击保护 + 扩展道具 + 指数难度
// ============================================
import { playSound, playCombo } from '../utils/sound'

// 食物类型定义
type FoodType = 'normal' | 'golden' | 'poison' | 'random' | 'honey' | 'speed' | 'magnet' | 'invincible'
type PowerType = 'none' | 'magnet' | 'invincible' | 'honey' | 'reverse'

// 食物颜色映射
const FOOD_COLORS: Record<FoodType, string> = {
  normal: '#39ff14',
  golden: '#ffd700',
  poison: '#ff4444',
  random: '#ff88ff',
  honey: '#ffaa00',
  speed: '#00f0ff',
  magnet: '#b026ff',
  invincible: '#ffe600',
}

// 食物分数映射
const FOOD_POINTS: Record<FoodType, number> = {
  normal: 10,
  golden: 20,
  poison: 5,
  random: 15,
  honey: 12,
  speed: 15,
  magnet: 15,
  invincible: 15,
}

export class SnakeGame {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private W = 640; private H = 640
  private dpr = 1
  private animId = 0
  private running = false
  private state: 'title' | 'playing' | 'paused' | 'gameover' = 'title'

  private gridSize = 20
  private cols = 0; private rows = 0
  private snake: { x: number; y: number }[] = []
  private dir = { x: 1, y: 0 }
  private nextDir = { x: 1, y: 0 }
  private food: { x: number; y: number; type: FoodType }[] = []
  private obstacles: { x: number; y: number; type?: 'static' | 'moving' | 'vanishing' }[] = []

  private score = 0
  private combo = 0
  private comboTimer = 0
  private comboWindow = 150
  private bestCombo = 0
  private comboDecayMode = false // 连击保护模式：逐级下降而非直接归零

  // Dash system
  private energy = 100
  private maxEnergy = 100
  private isDashing = false
  private dashSpeed = 2

  // Power-ups - 扩展
  private activePower: PowerType = 'none'
  private powerTimer = 0
  private honeyPassThrough = false // 蜂蜜穿越效果

  // 反向控制
  private reverseControls = false
  private reverseTimer = 0

  private moveTimer = 0
  private baseSpeed = 8
  private currentSpeed = 8

  // 难度系统 - 指数曲线
  private difficultyLevel = 1
  private challengeWave = false
  private challengeTimer = 0

  private particles: any[] = []
  private screenShake = 0

  private keys: Set<string> = new Set()
  private onScoreUpdate: (score: number) => void

  constructor(canvas: HTMLCanvasElement, onScoreUpdate: (score: number) => void) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.onScoreUpdate = onScoreUpdate
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.setupCanvas()
    this.setupInput()
  }

  private setupCanvas() {
    const rect = this.canvas.parentElement?.getBoundingClientRect()
    const s = Math.min(rect?.width || 640, 640)
    this.canvas.width = s * this.dpr
    this.canvas.height = s * this.dpr
    this.canvas.style.width = s + 'px'
    this.canvas.style.height = s + 'px'
    this.ctx.scale(this.dpr, this.dpr)
    this.W = s; this.H = s
    this.cols = Math.floor(this.W / this.gridSize)
    this.rows = Math.floor(this.H / this.gridSize)
  }

  private setupInput() {
    const kd = (e: KeyboardEvent) => {
      this.keys.add(e.key)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault()

      if (this.state === 'title') { this.state = 'playing'; this.resetGame() }
      if (this.state === 'gameover' && (e.key === 'r' || e.key === 'R')) { this.state = 'playing'; this.resetGame() }
      if (e.key === 'p') this.state = this.state === 'paused' ? 'playing' : this.state === 'playing' ? 'paused' : this.state

      // Direction - 支持反向控制
      let dx = 0, dy = 0
      if (e.key === 'ArrowUp') dy = -1
      if (e.key === 'ArrowDown') dy = 1
      if (e.key === 'ArrowLeft') dx = -1
      if (e.key === 'ArrowRight') dx = 1

      // 反向时翻转方向
      if (this.reverseControls) { dx = -dx; dy = -dy }

      if (dy === -1 && this.dir.y !== 1) this.nextDir = { x: 0, y: -1 }
      if (dy === 1 && this.dir.y !== -1) this.nextDir = { x: 0, y: 1 }
      if (dx === -1 && this.dir.x !== 1) this.nextDir = { x: -1, y: 0 }
      if (dx === 1 && this.dir.x !== -1) this.nextDir = { x: 1, y: 0 }

      // Dash
      if (e.key === ' ' && this.energy > 20) { this.isDashing = true; playSound('dash') }
    }
    const ku = (e: KeyboardEvent) => {
      this.keys.delete(e.key)
      if (e.key === ' ') this.isDashing = false
    }

    // Touch - swipe
    let sx = 0, sy = 0
    const ts = (e: TouchEvent) => {
      e.preventDefault()
      sx = e.touches[0].clientX; sy = e.touches[0].clientY
      if (this.state === 'title') { this.state = 'playing'; this.resetGame() }
      if (this.state === 'gameover') { this.state = 'playing'; this.resetGame() }
    }
    const te = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx
      const dy = e.changedTouches[0].clientY - sy
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return

      let finalDx = dx, finalDy = dy
      if (this.reverseControls) { finalDx = -dx; finalDy = -dy }

      if (Math.abs(finalDx) > Math.abs(finalDy)) {
        if (finalDx > 0 && this.dir.x !== -1) this.nextDir = { x: 1, y: 0 }
        else if (finalDx < 0 && this.dir.x !== 1) this.nextDir = { x: -1, y: 0 }
      } else {
        if (finalDy > 0 && this.dir.y !== -1) this.nextDir = { x: 0, y: 1 }
        else if (finalDy < 0 && this.dir.y !== 1) this.nextDir = { x: 0, y: -1 }
      }
    }

    this.canvas.addEventListener('keydown', kd)
    this.canvas.addEventListener('keyup', ku)
    this.canvas.addEventListener('touchstart', ts, { passive: false })
    this.canvas.addEventListener('touchend', te)
    this.canvas.setAttribute('tabindex', '0')
    this.canvas.focus()
  }

  private resetGame() {
    const midX = Math.floor(this.cols / 2)
    const midY = Math.floor(this.rows / 2)
    this.snake = [{ x: midX, y: midY }, { x: midX - 1, y: midY }, { x: midX - 2, y: midY }]
    this.dir = { x: 1, y: 0 }
    this.nextDir = { x: 1, y: 0 }
    this.score = 0
    this.combo = 0
    this.comboTimer = 0
    this.bestCombo = 0
    this.comboDecayMode = false
    this.energy = this.maxEnergy
    this.isDashing = false
    this.activePower = 'none'
    this.powerTimer = 0
    this.honeyPassThrough = false
    this.reverseControls = false
    this.reverseTimer = 0
    this.moveTimer = 0
    this.currentSpeed = this.baseSpeed
    this.difficultyLevel = 1
    this.challengeWave = false
    this.challengeTimer = 0
    this.obstacles = []
    this.particles = []
    this.screenShake = 0
    this.food = []
    this.spawnFood()
  }

  private spawnFood() {
    // 扩展的食物类型池
    const types: FoodType[] = [
      'normal', 'normal', 'normal', 'normal',
      'golden', // 金苹果 - 双倍得分
      'poison', // 毒苹果 - 反向控制
      'random', // 随机盒 - 随机效果
      'honey',  // 蜂蜜 - 穿越障碍
      'speed', 'speed',
      'magnet', 'magnet',
      'invincible',
    ]

    const occupied = new Set([
      ...this.snake.map(s => `${s.x},${s.y}`),
      ...this.obstacles.map(o => `${o.x},${o.y}`),
      ...this.food.map(f => `${f.x},${f.y}`)
    ])

    const spawn = () => {
      let x: number, y: number
      do {
        x = Math.floor(Math.random() * this.cols)
        y = Math.floor(Math.random() * this.rows)
      } while (occupied.has(`${x},${y}`))
      return { x, y }
    }

    // 维持2-3个食物在场
    const targetFood = Math.min(3, 2 + Math.floor(this.difficultyLevel / 3))
    while (this.food.length < targetFood) {
      const pos = spawn()
      const type = types[Math.floor(Math.random() * types.length)]
      this.food.push({ ...pos, type })
      occupied.add(`${pos.x},${pos.y}`)
    }

    // 指数难度障碍物生成
    this.updateDifficulty()
  }

  private updateDifficulty() {
    // 指数难度曲线
    // Level 1: 0-100分，无障碍
    // Level 2: 100-200分，2个障碍
    // Level 3: 200-400分，4个障碍
    // Level 4+: 每200分翻倍
    this.difficultyLevel = this.calculateDifficultyLevel()

    const targetObstacles = this.calculateTargetObstacles()
    const occupied = new Set([
      ...this.snake.map(s => `${s.x},${s.y}`),
      ...this.food.map(f => `${f.x},${f.y}`)
    ])

    const spawn = () => {
      let x: number, y: number
      do {
        x = Math.floor(Math.random() * this.cols)
        y = Math.floor(Math.random() * this.rows)
      } while (occupied.has(`${x},${y}`))
      return { x, y }
    }

    // 添加障碍物直到达到目标
    while (this.obstacles.length < targetObstacles) {
      const pos = spawn()
      // 根据难度添加不同类型障碍物
      const obsType = this.difficultyLevel >= 4
        ? (Math.random() < 0.3 ? 'moving' : Math.random() < 0.5 ? 'vanishing' : 'static')
        : 'static'
      this.obstacles.push({ ...pos, type: obsType })
      occupied.add(`${pos.x},${pos.y}`)
    }

    // 挑战波触发（每200分）
    if (this.score > 0 && this.score % 200 === 0 && !this.challengeWave) {
      this.challengeWave = true
      this.challengeTimer = 300 // 5秒挑战波
      playSound('warning')
    }
  }

  private calculateDifficultyLevel(): number {
    if (this.score < 100) return 1
    if (this.score < 200) return 2
    // 指数增长：每200分升一级
    return Math.floor(this.score / 200) + 1
  }

  private calculateTargetObstacles(): number {
    const level = this.difficultyLevel
    // Level 1: 0, Level 2: 2, Level 3: 4, Level 4: 6, Level 5: 8...
    // 挑战波时额外+4
    const base = level <= 1 ? 0 : Math.min((level - 1) * 2, 20)
    return this.challengeWave ? base + 4 : base
  }

  start() { this.running = true; this.loop() }
  stop() { this.running = false; cancelAnimationFrame(this.animId) }

  private loop = () => {
    if (!this.running) return
    if (this.state === 'playing') this.update()
    this.render()
    this.animId = requestAnimationFrame(this.loop)
  }

  private update() {
    // 连击保护：高连击时逐级下降而非直接归零
    if (this.comboTimer > 0) {
      this.comboTimer--
      if (this.comboTimer <= 0 && this.combo >= 5) {
        // 高连击保护：逐级下降
        this.combo = Math.max(0, this.combo - 1)
        this.comboTimer = this.comboWindow / 2 // 半保护期
        this.comboDecayMode = true
      } else if (this.comboTimer <= 0) {
        this.combo = 0
        this.comboDecayMode = false
      }
    }

    // 连击里程碑奖励：x10时自动触发3秒无敌
    if (this.combo >= 10 && this.activePower === 'none' && !this.honeyPassThrough) {
      this.activePower = 'invincible'
      this.powerTimer = 180 // 3秒
      playSound('powerup')
    }

    // Power timer
    if (this.powerTimer > 0) {
      this.powerTimer--
      if (this.powerTimer <= 0) {
        this.activePower = 'none'
        this.honeyPassThrough = false
      }
    }

    // 反向控制计时器
    if (this.reverseTimer > 0) {
      this.reverseTimer--
      if (this.reverseTimer <= 0) this.reverseControls = false
    }

    // 挑战波计时器
    if (this.challengeTimer > 0) {
      this.challengeTimer--
      if (this.challengeTimer <= 0) this.challengeWave = false
    }

    // 移动障碍物
    for (const obs of this.obstacles) {
      if (obs.type === 'moving') {
        if (Math.random() < 0.02) {
          obs.x += Math.floor(Math.random() * 3) - 1
          obs.y += Math.floor(Math.random() * 3) - 1
          obs.x = Math.max(0, Math.min(this.cols - 1, obs.x))
          obs.y = Math.max(0, Math.min(this.rows - 1, obs.y))
        }
      } else if (obs.type === 'vanishing') {
        // 消失障碍物会闪烁
        // 在render中处理
      }
    }

    // Energy regen
    if (!this.isDashing && this.energy < this.maxEnergy) this.energy += 0.3

    // Dash drain
    if (this.isDashing) {
      this.energy -= 1.5
      if (this.energy <= 0) { this.isDashing = false; this.energy = 0 }
    }

    // Speed calculation with difficulty
    this.currentSpeed = this.isDashing ? Math.max(2, this.baseSpeed - 4) : this.baseSpeed
    if (this.activePower === 'none') {
      // 随难度加速
      const speedBonus = Math.min(this.difficultyLevel, 5)
      this.currentSpeed = Math.max(3, this.currentSpeed - speedBonus)
    }

    // Move
    this.moveTimer++
    const speed = this.isDashing ? this.dashSpeed : 1
    if (this.moveTimer >= this.currentSpeed) {
      this.moveTimer = 0
      for (let s = 0; s < speed; s++) {
        this.dir = { ...this.nextDir }
        const head = this.snake[0]
        let nx = head.x + this.dir.x
        let ny = head.y + this.dir.y

        // Wrap
        if (nx < 0) nx = this.cols - 1
        if (nx >= this.cols) nx = 0
        if (ny < 0) ny = this.rows - 1
        if (ny >= this.rows) ny = 0

        // Check collision
        const hitSelf = this.snake.some((sn, i) => i > 0 && sn.x === nx && sn.y === ny)

        // 检查障碍物碰撞（蜂蜜效果可穿越一次）
        let hitObs = false
        if (!this.honeyPassThrough) {
          hitObs = this.obstacles.some(o => {
            if (o.x === nx && o.y === ny) {
              // 消失障碍物有50%几率不会真正阻挡
              if (o.type === 'vanishing' && Math.random() < 0.5) return false
              return true
            }
            return false
          })
        } else {
          // 蜂蜜效果：第一次穿越后清除效果
          if (this.obstacles.some(o => o.x === nx && o.y === ny)) {
            this.honeyPassThrough = false
            this.activePower = 'none'
          }
        }

        if ((hitSelf || hitObs) && this.activePower !== 'invincible') {
          this.state = 'gameover'
          this.screenShake = 10
          playSound('death')
          const coins = Math.floor(this.score / 50)
          try { require('../store/gameStore').useGameStore.getState().addCoins(coins) } catch {}
          return
        }

        this.snake.unshift({ x: nx, y: ny })

        // Check food
        const fi = this.food.findIndex(f => f.x === nx && f.y === ny)
        if (fi >= 0) {
          const f = this.food[fi]
          this.food.splice(fi, 1)
          this.combo++
          this.comboTimer = this.comboWindow
          this.comboDecayMode = false
          if (this.combo > this.bestCombo) this.bestCombo = this.combo

          const mult = this.getComboMultiplier()
          const basePts = FOOD_POINTS[f.type]
          const pts = basePts * mult * (f.type === 'golden' ? 2 : 1) // 金苹果额外双倍
          this.score += pts
          this.onScoreUpdate(this.score)
          this.spawnParticles(nx * this.gridSize + this.gridSize / 2, ny * this.gridSize + this.gridSize / 2, FOOD_COLORS[f.type])

          // 音效
          if (f.type === 'golden') playSound('gem')
          else if (f.type === 'poison' || f.type === 'random') playSound('powerup')
          else if (f.type === 'honey') playSound('shield')
          else if (f.type !== 'normal') playSound('powerup')
          else if (this.combo >= 3) playCombo(this.combo)
          else playSound('score')

          // 处理食物效果
          this.handleFoodEffect(f.type)

          this.spawnFood()
        } else {
          this.snake.pop()
        }

        // Magnet: attract nearby food
        if (this.activePower === 'magnet' && s === 0) {
          for (const food of this.food) {
            const dx = nx - food.x, dy = ny - food.y
            if (Math.abs(dx) <= 3 && Math.abs(dy) <= 3) {
              food.x += Math.sign(dx)
              food.y += Math.sign(dy)
            }
          }
        }
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx; p.y += p.vy; p.life--
      if (p.life <= 0) this.particles.splice(i, 1)
    }

    if (this.screenShake > 0) this.screenShake--
  }

  private getComboMultiplier(): number {
    if (this.combo >= 20) return 10
    if (this.combo >= 10) return 5
    if (this.combo >= 5) return 3
    if (this.combo >= 3) return 2
    return 1
  }

  private handleFoodEffect(type: FoodType) {
    switch (type) {
      case 'magnet':
        this.activePower = 'magnet'
        this.powerTimer = 300
        break
      case 'invincible':
        this.activePower = 'invincible'
        this.powerTimer = 240
        break
      case 'speed':
        this.energy = Math.min(this.energy + 40, this.maxEnergy)
        break
      case 'honey':
        this.honeyPassThrough = true
        this.activePower = 'honey'
        this.powerTimer = 180 // 可穿越一次障碍物
        break
      case 'poison':
        this.reverseControls = true
        this.reverseTimer = 300 // 5秒反向控制
        break
      case 'random':
        // 随机触发一种效果
        const effects: FoodType[] = ['magnet', 'invincible', 'speed', 'honey', 'poison']
        const randomEffect = effects[Math.floor(Math.random() * effects.length)]
        this.handleFoodEffect(randomEffect)
        break
      case 'golden':
        // 金苹果只有双倍得分，无额外效果
        break
    }
  }

  private spawnParticles(x: number, y: number, color: string) {
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2
      this.particles.push({ x, y, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2, size: 3, color, life: 20 })
    }
  }

  private render() {
    const ctx = this.ctx
    ctx.save()

    if (this.screenShake > 0) ctx.translate((Math.random() - 0.5) * this.screenShake, (Math.random() - 0.5) * this.screenShake)

    ctx.fillStyle = '#0a0a18'
    ctx.fillRect(0, 0, this.W, this.H)

    // Grid
    ctx.strokeStyle = '#151530'
    ctx.lineWidth = 0.5
    for (let x = 0; x <= this.cols; x++) { ctx.beginPath(); ctx.moveTo(x * this.gridSize, 0); ctx.lineTo(x * this.gridSize, this.H); ctx.stroke() }
    for (let y = 0; y <= this.rows; y++) { ctx.beginPath(); ctx.moveTo(0, y * this.gridSize); ctx.lineTo(this.W, y * this.gridSize); ctx.stroke() }

    // 挑战波背景闪烁
    if (this.challengeWave) {
      ctx.fillStyle = `rgba(255, 0, 100, ${0.05 + Math.sin(Date.now() / 100) * 0.03})`
      ctx.fillRect(0, 0, this.W, this.H)
    }

    if (this.state === 'title') {
      this.renderTitle()
    } else if (this.state === 'gameover') {
      this.renderGame()
      this.renderGameOver()
    } else {
      this.renderGame()
    }

    ctx.restore()
  }

  private renderTitle() {
    const ctx = this.ctx
    ctx.fillStyle = '#39ff14'
    ctx.font = '16px "Press Start 2P", monospace'
    ctx.textAlign = 'center'
    ctx.fillText('SNAKE', this.W / 2, this.H / 2 - 30)

    ctx.fillStyle = '#ffe600'
    ctx.font = '7px "Press Start 2P", monospace'
    ctx.fillText('DASH + COMBO + POWER-UPS', this.W / 2, this.H / 2 + 10)

    ctx.fillStyle = '#ff88ff'
    ctx.font = '5px "Press Start 2P", monospace'
    ctx.fillText('NEW: GOLDEN + HONEY + RANDOM', this.W / 2, this.H / 2 + 25)

    ctx.fillStyle = '#4a4a6a'
    ctx.font = '7px "Press Start 2P", monospace'
    if (Math.sin(Date.now() / 300) > 0) ctx.fillText('TAP / PRESS ANY KEY', this.W / 2, this.H / 2 + 50)
  }

  private renderGameOver() {
    const ctx = this.ctx
    ctx.fillStyle = 'rgba(10,10,24,0.85)'
    ctx.fillRect(0, 0, this.W, this.H)
    ctx.textAlign = 'center'

    ctx.fillStyle = '#ff2d95'
    ctx.shadowColor = '#ff2d95'
    ctx.shadowBlur = 15
    ctx.font = '14px "Press Start 2P", monospace'
    ctx.fillText('GAME OVER', this.W / 2, this.H / 2 - 40)
    ctx.shadowBlur = 0

    ctx.fillStyle = '#39ff14'
    ctx.font = '8px "Press Start 2P", monospace'
    ctx.fillText(`SCORE: ${this.score}`, this.W / 2, this.H / 2)

    ctx.fillStyle = '#ffe600'
    ctx.font = '6px "Press Start 2P", monospace'
    ctx.fillText(`BEST COMBO: x${this.bestCombo}`, this.W / 2, this.H / 2 + 20)

    ctx.fillStyle = '#00f0ff'
    ctx.font = '6px "Press Start 2P", monospace'
    ctx.fillText(`LEVEL: ${this.difficultyLevel}`, this.W / 2, this.H / 2 + 35)

    const hs = parseInt(localStorage.getItem('neon_arcade_hs_snake') || '0')
    if (this.score > hs) {
      ctx.fillStyle = '#ffe600'
      ctx.shadowColor = '#ffe600'
      ctx.shadowBlur = 10
      ctx.font = '7px "Press Start 2P", monospace'
      ctx.fillText('NEW RECORD!', this.W / 2, this.H / 2 + 50)
      ctx.shadowBlur = 0
    }

    ctx.fillStyle = '#4a4a6a'
    ctx.font = '6px "Press Start 2P", monospace'
    if (Math.sin(Date.now() / 300) > 0) ctx.fillText('TAP / R TO RETRY', this.W / 2, this.H / 2 + 70)
  }

  private renderGame() {
    const ctx = this.ctx
    const gs = this.gridSize

    // Obstacles - 不同类型不同样式
    for (const o of this.obstacles) {
      if (o.type === 'vanishing' && Math.sin(Date.now() / 200) < 0) continue // 消失障碍闪烁

      ctx.fillStyle = o.type === 'moving' ? '#ff4444' : o.type === 'vanishing' ? '#ff8844' : '#3a3a5c'
      ctx.shadowColor = o.type === 'moving' ? '#ff4444' : ''
      ctx.shadowBlur = o.type === 'moving' ? 4 : 0
      ctx.fillRect(o.x * gs + 2, o.y * gs + 2, gs - 4, gs - 4)
      ctx.shadowBlur = 0
    }

    // Food - 不同类型不同样式
    for (const f of this.food) {
      const color = FOOD_COLORS[f.type]
      ctx.fillStyle = color
      ctx.shadowColor = color
      ctx.shadowBlur = f.type === 'golden' ? 12 : 8

      // 金苹果用星形
      if (f.type === 'golden') {
        ctx.beginPath()
        const cx = f.x * gs + gs / 2
        const cy = f.y * gs + gs / 2
        const r = gs / 3
        for (let i = 0; i < 5; i++) {
          const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2
          const px = cx + r * Math.cos(angle)
          const py = cy + r * Math.sin(angle)
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.fill()
      } else if (f.type === 'random') {
        // 随机盒用方形
        ctx.fillRect(f.x * gs + 4, f.y * gs + 4, gs - 8, gs - 8)
      } else if (f.type === 'poison') {
        // 毒苹果用菱形
        ctx.beginPath()
        ctx.moveTo(f.x * gs + gs / 2, f.y * gs + 4)
        ctx.lineTo(f.x * gs + gs - 4, f.y * gs + gs / 2)
        ctx.lineTo(f.x * gs + gs / 2, f.y * gs + gs - 4)
        ctx.lineTo(f.x * gs + 4, f.y * gs + gs / 2)
        ctx.closePath()
        ctx.fill()
      } else {
        ctx.beginPath()
        ctx.arc(f.x * gs + gs / 2, f.y * gs + gs / 2, gs / 3, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.shadowBlur = 0
    }

    // Snake
    const invFlash = this.activePower === 'invincible' && Math.floor(Date.now() / 100) % 2
    const honeyFlash = this.honeyPassThrough && Math.floor(Date.now() / 150) % 2
    const reverseFlash = this.reverseControls && Math.floor(Date.now() / 200) % 2

    for (let i = this.snake.length - 1; i >= 0; i--) {
      const s = this.snake[i]
      const isHead = i === 0

      // 根据状态选择颜色
      let color = '#00c8d4'
      if (isHead) color = '#00f0ff'
      else if (this.isDashing) color = '#ffe600'
      else if (invFlash) color = '#ffe600'
      else if (honeyFlash) color = '#ffaa00'
      else if (reverseFlash) color = '#ff4444'

      ctx.fillStyle = color
      if (isHead) { ctx.shadowColor = color; ctx.shadowBlur = 10 }
      ctx.fillRect(s.x * gs + 1, s.y * gs + 1, gs - 2, gs - 2)
      ctx.shadowBlur = 0
    }

    // Particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life / 20
      ctx.fillStyle = p.color
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
    }
    ctx.globalAlpha = 1

    // HUD
    ctx.fillStyle = '#39ff14'
    ctx.font = '7px "Press Start 2P", monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`SCORE: ${this.score}`, 8, 16)

    // Combo显示（带保护模式指示）
    if (this.combo >= 3) {
      const mult = this.getComboMultiplier()
      ctx.fillStyle = mult >= 5 ? '#ffd700' : mult >= 3 ? '#ffe600' : '#00f0ff'
      ctx.fillText(`COMBO x${mult}${this.comboDecayMode ? '↓' : ''}`, 8, 28)
    }

    // 难度等级
    ctx.fillStyle = this.challengeWave ? '#ff2d95' : '#4a4a6a'
    ctx.font = '5px "Press Start 2P", monospace'
    ctx.fillText(`LV${this.difficultyLevel}${this.challengeWave ? '!' : ''}`, 8, 40)

    // 挑战波提示
    if (this.challengeWave) {
      ctx.fillStyle = '#ff2d95'
      ctx.shadowColor = '#ff2d95'
      ctx.shadowBlur = 8
      ctx.font = '6px "Press Start 2P", monospace'
      ctx.textAlign = 'center'
      ctx.fillText('CHALLENGE!', this.W / 2, 16)
      ctx.shadowBlur = 0
      ctx.textAlign = 'left'
    }

    // Energy bar
    ctx.fillStyle = '#333'
    ctx.fillRect(8, this.H - 16, 60, 6)
    ctx.fillStyle = this.isDashing ? '#ffe600' : '#00f0ff'
    ctx.fillRect(8, this.H - 16, 60 * (this.energy / this.maxEnergy), 6)

    // Power显示
    if (this.activePower !== 'none') {
      const powerColors: Record<PowerType, string> = {
        none: '#fff',
        magnet: '#b026ff',
        invincible: '#ffe600',
        honey: '#ffaa00',
        reverse: '#ff4444',
      }
      ctx.fillStyle = powerColors[this.activePower]
      ctx.font = '5px "Press Start 2P", monospace'
      ctx.textAlign = 'right'
      ctx.fillText(this.activePower.toUpperCase(), this.W - 8, 16)
    }

    // 反向控制提示
    if (this.reverseControls) {
      ctx.fillStyle = '#ff4444'
      ctx.font = '5px "Press Start 2P", monospace'
      ctx.textAlign = 'right'
      ctx.fillText('REVERSE!', this.W - 8, 28)
    }
  }
}