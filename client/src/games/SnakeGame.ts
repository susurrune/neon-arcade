// ============================================
// SNAKE GAME v5 — Boss战 + 时间暂停 + 分身诱饵 + 华丽特效
// ============================================
import { playSound, playCombo } from '../utils/sound'

// 食物类型定义
type FoodType = 'normal' | 'golden' | 'poison' | 'random' | 'honey' | 'speed' | 'magnet' | 'invincible' | 'timewarp' | 'decoy'
type PowerType = 'none' | 'magnet' | 'invincible' | 'honey' | 'reverse' | 'timewarp' | 'decoy'

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
  timewarp: '#00ff88',
  decoy: '#ff6600',
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
  timewarp: 20,
  decoy: 15,
}

export class SnakeGame {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private W = 640; private H = 640
  private dpr = 1
  private animId = 0
  private running = false
  private state: 'title' | 'playing' | 'paused' | 'gameover' = 'title'

  // Delta time system - 帧率独立
  private lastTime = 0
  private accumulator = 0
  private readonly TICK_RATE = 1000 / 20  // 基础更新率：20Hz（更慢更易控）

  private gridSize = 20
  private cols = 0; private rows = 0
  private snake: { x: number; y: number }[] = []
  
  // 渲染插值 - 平滑移动
  private renderSnake: { x: number; y: number; prevX: number; prevY: number }[] = []
  
  private dir = { x: 1, y: 0 }
  private nextDir = { x: 1, y: 0 }
  
  // 输入队列 - 支持转向缓冲
  private inputQueue: Array<{x: number, y: number}> = []
  private readonly MAX_QUEUE_SIZE = 3
  
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
  private baseSpeed = 25  // 进一步提高初始速度值（值越大越慢）
  private currentSpeed = 25.0  // 支持小数
  
  // 移动积累器 - 用于deltaTime平滑
  private moveAccumulator = 0

  // 难度系统 - 指数曲线
  private difficultyLevel = 1
  private challengeWave = false
  private challengeTimer = 0

  // Boss战系统
  private bossActive = false
  private boss: { x: number; y: number; hp: number; maxHp: number; size: number; pattern: number; moveTimer: number; attackTimer: number } | null = null
  private bossBullets: { x: number; y: number; vx: number; vy: number; life: number }[] = []

  // 分身诱饵
  private decoys: { x: number; y: number; life: number }[] = []
  private timeWarpActive = false
  private timeWarpFactor = 0.3

  private particles: any[] = []
  private screenShake = 0
  
  // ===== 爆款级体验系统 =====
  
  // 拖尾效果
  private trail: { x: number; y: number; life: number; maxLife: number }[] = []
  private readonly MAX_TRAIL_LENGTH = 20
  
  // 狂暴模式
  private frenzyMode = false
  private frenzyTimer = 0
  private frenzyDuration = 180  // 3秒
  private frenzyCombo = 0      // 连吃计数
  private readonly FRENZY_THRESHOLD = 3  // 连吃3次触发
  
  // Perfect Timing
  private lastEatTime = 0
  private perfectWindow = 800  // 800ms内连续吃算Perfect
  private perfectStreak = 0
  private perfectFlash = 0     // Perfect闪光效果
  
  // 浮动文字
  private floatingTexts: {
    x: number; y: number; text: string; color: string;
    life: number; maxLife: number; size: number; vy: number
  }[] = []
  
  // 动态摄像机偏移
  private cameraOffset = { x: 0, y: 0 }
  private cameraTarget = { x: 0, y: 0 }
  
  // 评分系统
  private totalFoodEaten = 0
  private maxCombo = 0
  private perfectCount = 0
  private deathTime = 0
  private slowMotionFactor = 1  // 慢动作系数
  
  // 成就系统
  private achievements: Set<string> = new Set()
  private unlockedAchievements: string[] = []  // 本局解锁的成就

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

      // Direction - 添加到输入队列（转向缓冲）
      let dx = 0, dy = 0
      if (e.key === 'ArrowUp') dy = -1
      if (e.key === 'ArrowDown') dy = 1
      if (e.key === 'ArrowLeft') dx = -1
      if (e.key === 'ArrowRight') dx = 1

      // 反向时翻转方向
      if (this.reverseControls) { dx = -dx; dy = -dy }

      // 添加到输入队列（避免立即应用）
      if (dx !== 0 || dy !== 0) {
        this.enqueueDirection(dx, dy)
      }

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
        if (finalDx > 0) this.enqueueDirection(1, 0)
        else if (finalDx < 0) this.enqueueDirection(-1, 0)
      } else {
        if (finalDy > 0) this.enqueueDirection(0, 1)
        else if (finalDy < 0) this.enqueueDirection(0, -1)
      }
    }

    this.canvas.addEventListener('keydown', kd)
    this.canvas.addEventListener('keyup', ku)
    this.canvas.addEventListener('touchstart', ts, { passive: false })
    this.canvas.addEventListener('touchend', te)
    this.canvas.setAttribute('tabindex', '0')
    this.canvas.focus()
  }
  
  // 方向入队（转向缓冲）
  private enqueueDirection(dx: number, dy: number) {
    // 检查是否与当前方向相反（避免误操作反向死亡）
    if (dx === -this.dir.x && dy === -this.dir.y) return
    if (dx === -this.nextDir.x && dy === -this.nextDir.y) return
    
    // 队列满时移除最旧的
    if (this.inputQueue.length >= this.MAX_QUEUE_SIZE) {
      this.inputQueue.shift()
    }
    
    // 避免重复添加相同方向
    const last = this.inputQueue[this.inputQueue.length - 1]
    if (!last || last.x !== dx || last.y !== dy) {
      this.inputQueue.push({ x: dx, y: dy })
    }
  }

  private resetGame() {
    const midX = Math.floor(this.cols / 2)
    const midY = Math.floor(this.rows / 2)
    this.snake = [{ x: midX, y: midY }, { x: midX - 1, y: midY }, { x: midX - 2, y: midY }]
    this.renderSnake = []
    this.trail = []
    this.dir = { x: 1, y: 0 }
    this.nextDir = { x: 1, y: 0 }
    this.inputQueue = []
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
    this.moveAccumulator = 0
    this.currentSpeed = this.baseSpeed
    this.difficultyLevel = 1
    this.challengeWave = false
    this.challengeTimer = 0
    this.bossActive = false
    this.boss = null
    this.bossBullets = []
    this.decoys = []
    this.timeWarpActive = false
    this.obstacles = []
    this.particles = []
    this.screenShake = 0
    this.food = []
    
    // 爆款系统重置
    this.trail = []
    this.frenzyMode = false
    this.frenzyTimer = 0
    this.frenzyCombo = 0
    this.lastEatTime = 0
    this.perfectStreak = 0
    this.perfectFlash = 0
    this.floatingTexts = []
    this.cameraOffset = { x: 0, y: 0 }
    this.cameraTarget = { x: 0, y: 0 }
    this.totalFoodEaten = 0
    this.maxCombo = 0
    this.perfectCount = 0
    this.deathTime = 0
    this.slowMotionFactor = 1
    this.achievements = new Set()
    this.unlockedAchievements = []
    
    this.spawnFood()
  }

  private spawnFood() {
    // 扩展的食物类型池 - 根据难度调整概率
    const types: FoodType[] = [
      'normal', 'normal', 'normal', 'normal', 'normal',
      'golden', 'golden', // 金苹果 - 双倍得分
      'poison', // 毒苹果 - 反向控制
      'random', // 随机盒 - 随机效果
      'honey',  // 蜂蜜 - 穿越障碍
      'speed', 'speed',
      'magnet', 'magnet',
      'invincible',
    ]
    
    // 高难度时添加更多特殊食物
    if (this.difficultyLevel >= 3) {
      types.push('timewarp', 'decoy')
    }

    // 计算可用空间
    const occupied = new Set([
      ...this.snake.map(s => `${s.x},${s.y}`),
      ...this.obstacles.map(o => `${o.x},${o.y}`),
      ...this.food.map(f => `${f.x},${f.y}`)
    ])
    
    // 智能食物生成 - 避免聚集
    const spawn = (minDistFromHead: number = 3): {x: number, y: number} | null => {
      let attempts = 0
      const maxAttempts = 100
      
      while (attempts < maxAttempts) {
        attempts++
        const x = Math.floor(Math.random() * this.cols)
        const y = Math.floor(Math.random() * this.rows)
        
        if (occupied.has(`${x},${y}`)) continue
        
        // 确保距离蛇头有一定距离（避免立即吃到）
        const head = this.snake[0]
        if (head) {
          const dist = Math.abs(x - head.x) + Math.abs(y - head.y)
          if (dist < minDistFromHead) continue
        }
        
        return { x, y }
      }
      
      return null
    }

    // 维持2-3个食物在场
    const targetFood = Math.min(4, 2 + Math.floor(this.difficultyLevel / 4))
    while (this.food.length < targetFood) {
      const pos = spawn()
      if (!pos) break  // 无法找到合适位置
      
      const type = types[Math.floor(Math.random() * types.length)]
      this.food.push({ ...pos, type })
      occupied.add(`${pos.x},${pos.y}`)
    }

    // 难度更新
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

    // Boss战触发（每500分）
    if (this.score > 0 && this.score % 500 === 0 && !this.bossActive && this.difficultyLevel >= 3) {
      this.spawnBoss()
    }
  }

  private spawnBoss() {
    this.bossActive = true
    const bossHp = 20 + this.difficultyLevel * 10
    this.boss = {
      x: Math.floor(this.cols / 2),
      y: Math.floor(this.rows / 4),
      hp: bossHp,
      maxHp: bossHp,
      size: 3,
      pattern: Math.floor(Math.random() * 3),
      moveTimer: 0,
      attackTimer: 0,
    }
    this.screenShake = 15
    playSound('warning')
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

  start() {
    this.running = true
    this.lastTime = performance.now()
    // 如果游戏还未初始化（处于title状态），先初始化
    if (this.snake.length === 0) {
      this.resetGame()
    }
    this.loop(this.lastTime)
  }
  stop() { this.running = false; cancelAnimationFrame(this.animId) }

  private loop = (currentTime: number) => {
    if (!this.running) return
    
    const deltaTime = Math.min(currentTime - this.lastTime, 100)  // 限制最大deltaTime防止跳帧
    this.lastTime = currentTime
    
    if (this.state === 'playing') {
      this.update(deltaTime)
    }
    this.render(deltaTime)
    this.animId = requestAnimationFrame(this.loop)
  }

  private update(deltaTime: number) {
    // 连击保护：使用deltaTime
    if (this.comboTimer > 0) {
      this.comboTimer -= deltaTime / 16.67  // 转换为帧单位
      if (this.comboTimer <= 0 && this.combo >= 5) {
        this.combo = Math.max(0, this.combo - 1)
        this.comboTimer = this.comboWindow / 2
        this.comboDecayMode = true
      } else if (this.comboTimer <= 0) {
        this.combo = 0
        this.comboDecayMode = false
      }
    }

    // 连击里程碑奖励
    if (this.combo >= 10 && this.activePower === 'none' && !this.honeyPassThrough) {
      this.activePower = 'invincible'
      this.powerTimer = 180
      playSound('powerup')
    }

    // Power timer - 使用deltaTime
    if (this.powerTimer > 0) {
      this.powerTimer -= deltaTime / 16.67
      if (this.powerTimer <= 0) {
        this.activePower = 'none'
        this.honeyPassThrough = false
      }
    }

    // 反向控制计时器
    if (this.reverseTimer > 0) {
      this.reverseTimer -= deltaTime / 16.67
      if (this.reverseTimer <= 0) this.reverseControls = false
    }

    // 挑战波计时器
    if (this.challengeTimer > 0) {
      this.challengeTimer -= deltaTime / 16.67
      if (this.challengeTimer <= 0) this.challengeWave = false
    }

    // 移动障碍物 - 使用deltaTime
    for (const obs of this.obstacles) {
      if (obs.type === 'moving') {
        if (Math.random() < 0.02 * (deltaTime / 16.67)) {
          obs.x += Math.floor(Math.random() * 3) - 1
          obs.y += Math.floor(Math.random() * 3) - 1
          obs.x = Math.max(0, Math.min(this.cols - 1, obs.x))
          obs.y = Math.max(0, Math.min(this.rows - 1, obs.y))
        }
      }
    }

    // Energy regen - 使用deltaTime
    if (!this.isDashing && this.energy < this.maxEnergy) {
      this.energy += 0.3 * (deltaTime / 16.67)
    }

    // Dash drain
    if (this.isDashing) {
      this.energy -= 1.5 * (deltaTime / 16.67)
      if (this.energy <= 0) { this.isDashing = false; this.energy = 0 }
    }

    // Speed calculation
    this.currentSpeed = this.isDashing ? Math.max(10, this.baseSpeed - 6) : this.baseSpeed
    if (this.activePower === 'none') {
      const speedBonus = Math.min(this.difficultyLevel * 0.2, 6)
      this.currentSpeed = Math.max(12, this.currentSpeed - speedBonus)
    }

    // Move accumulator - deltaTime based
    this.moveAccumulator += deltaTime
    
    // 检查是否需要移动
    while (this.moveAccumulator >= this.currentSpeed * 16.67) {
      this.moveAccumulator -= this.currentSpeed * 16.67
      this.processMove()
    }
    
    // 更新渲染蛇的位置（插值）
    this.updateRenderSnake(deltaTime)
    
    // 更新粒子
    this.updateParticles(deltaTime)
    
    // 更新拖尾
    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].life--
      if (this.trail[i].life <= 0) {
        this.trail.splice(i, 1)
      }
    }
    
    // 更新浮动文字
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i]
      ft.y += ft.vy
      ft.life--
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1)
      }
    }
    
    // 更新Perfect闪光
    if (this.perfectFlash > 0) {
      this.perfectFlash -= 0.05
    }
    
    // 更新摄像机偏移（平滑跟随）
    if (this.snake.length > 0) {
      const head = this.snake[0]
      this.cameraTarget.x = (head.x - this.cols / 2) * 0.05
      this.cameraTarget.y = (head.y - this.rows / 2) * 0.05
      this.cameraOffset.x += (this.cameraTarget.x - this.cameraOffset.x) * 0.1
      this.cameraOffset.y += (this.cameraTarget.y - this.cameraOffset.y) * 0.1
    }
    
    // 检查成就
    if (this.maxCombo > 0 && this.maxCombo % 5 === 0) {
      this.checkAchievements()
    }
  }
  
  // 处理单次移动
  private processMove() {
    // 从输入队列获取方向（转向缓冲）
    if (this.inputQueue.length > 0) {
      const nextInput = this.inputQueue.shift()!
      // 验证方向合法性（不能反向）
      if (nextInput.x !== -this.dir.x || nextInput.y !== -this.dir.y) {
        this.nextDir = nextInput
      }
    }
    
    this.dir = { ...this.nextDir }
    const head = this.snake[0]
    let nx = head.x + this.dir.x
    let ny = head.y + this.dir.y

    // 碰墙检测 - 撞墙即死
    if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) {
      if (this.activePower !== 'invincible') {
        const wallX = Math.max(0, Math.min(this.cols - 1, nx)) * this.gridSize + this.gridSize / 2
        const wallY = Math.max(0, Math.min(this.rows - 1, ny)) * this.gridSize + this.gridSize / 2
        this.spawnParticles(wallX, wallY, '#ff4444', 15)
        
        this.state = 'gameover'
        this.screenShake = 10
        playSound('death')
        const coins = Math.floor(this.score / 50)
        try { require('../store/gameStore').useGameStore.getState().addCoins(coins) } catch {}
        return
      }
    }
    
    // 无敌状态下穿墙
    if (this.activePower === 'invincible') {
      if (nx < 0) nx = this.cols - 1
      if (nx >= this.cols) nx = 0
      if (ny < 0) ny = this.rows - 1
      if (ny >= this.rows) ny = 0
    }

    // 自身碰撞检测
    const hitSelf = this.snake.some((sn, i) => i > 0 && sn.x === nx && sn.y === ny)

    // 障碍物碰撞
    let hitObs = false
    if (!this.honeyPassThrough) {
      hitObs = this.obstacles.some(o => {
        if (o.x === nx && o.y === ny) {
          if (o.type === 'vanishing' && Math.random() < 0.5) return false
          return true
        }
        return false
      })
    } else {
      if (this.obstacles.some(o => o.x === nx && o.y === ny)) {
        this.honeyPassThrough = false
        this.activePower = 'none'
      }
    }

    if ((hitSelf || hitObs) && this.activePower !== 'invincible') {
      // 死亡时触发慢动作
      this.deathTime = 120  // 2秒慢动作
      this.slowMotionFactor = 0.2  // 20%速度
      
      this.state = 'gameover'
      this.screenShake = 15
      playSound('death')
      
      // 死亡爆炸粒子
      const headPos = {
        x: nx * this.gridSize + this.gridSize / 2,
        y: ny * this.gridSize + this.gridSize / 2
      }
      this.spawnParticles(headPos.x, headPos.y, '#ff2d95', 30)
      this.spawnParticles(headPos.x, headPos.y, '#ff4444', 20)
      this.spawnParticles(headPos.x, headPos.y, '#ffe600', 15)
      
      // 显示最终评分
      const rank = this.getRank()
      this.addFloatingText(
        Math.floor(this.snake[0].x),
        Math.floor(this.snake[0].y) - 40,
        `评级: ${rank.rank}`,
        rank.color,
        28
      )
      
      const coins = Math.floor(this.score / 50)
      try { require('../store/gameStore').useGameStore.getState().addCoins(coins) } catch {}
      return
    }

    // 保存旧位置用于插值
    this.snake.unshift({ x: nx, y: ny })

    // 食物检测
    const fi = this.food.findIndex(f => f.x === nx && f.y === ny)
    if (fi >= 0) {
      const f = this.food[fi]
      this.food.splice(fi, 1)
      this.combo++
      this.comboTimer = this.comboWindow
      this.comboDecayMode = false
      if (this.combo > this.bestCombo) this.bestCombo = this.combo
      
      // ===== 爆款体验系统 =====
      this.totalFoodEaten++
      const now = Date.now()
      const timeSinceLastEat = now - this.lastEatTime
      
      // Perfect Timing检测
      if (timeSinceLastEat < this.perfectWindow && timeSinceLastEat > 100) {
        this.perfectStreak++
        this.perfectCount++
        this.perfectFlash = 1  // 触发闪光
        this.addFloatingText(nx, ny, 'PERFECT!', '#ffe600', 20)
        playSound('combo')
      } else {
        this.perfectStreak = 0
      }
      this.lastEatTime = now
      
      // 狂暴模式检测
      this.frenzyCombo++
      if (this.frenzyCombo >= this.FRENZY_THRESHOLD) {
        this.activateFrenzy()
      }
      
      // 添加拖尾
      this.addTrail()

      const mult = this.getComboMultiplier()
      const basePts = FOOD_POINTS[f.type]
      const perfectBonus = this.perfectStreak > 0 ? this.perfectStreak * 5 : 0
      const frenzyBonus = this.frenzyMode ? 10 : 0
      const pts = (basePts * mult * (f.type === 'golden' ? 2 : 1)) + perfectBonus + frenzyBonus
      this.score += pts
      this.onScoreUpdate(this.score)
      
      // 增强粒子爆炸效果
      const particleCount = this.frenzyMode ? 25 : this.perfectStreak > 0 ? 20 : 12
      this.spawnParticles(nx * this.gridSize + this.gridSize / 2, ny * this.gridSize + this.gridSize / 2, FOOD_COLORS[f.type], particleCount)
      
      // 浮动文字
      if (this.combo >= 5) {
        this.addFloatingText(nx, ny, `${this.combo} COMBO!`, '#00f0ff', 16)
      } else if (this.perfectStreak > 0) {
        this.addFloatingText(nx, ny, `x${this.perfectStreak} PERFECT`, '#ffe600', 14)
      } else {
        this.addFloatingText(nx, ny, `+${pts}`, '#39ff14', 12)
      }

      if (f.type === 'golden') playSound('gem')
      else if (f.type === 'poison' || f.type === 'random') playSound('powerup')
      else if (f.type === 'honey') playSound('shield')
      else if (f.type !== 'normal') playSound('powerup')
      else if (this.combo >= 3) playCombo(this.combo)
      else playSound('score')

      this.handleFoodEffect(f.type)
      this.spawnFood()
    } else {
      this.snake.pop()
      // 没吃到食物，重置狂暴连击
      if (!this.frenzyMode) {
        this.frenzyCombo = Math.max(0, this.frenzyCombo - 1)
      }
    }
    
    // 更新狂暴计时器
    if (this.frenzyMode) {
      this.frenzyTimer--
      if (this.frenzyTimer <= 0) {
        this.deactivateFrenzy()
      }
    }

    // 磁铁效果
    if (this.activePower === 'magnet') {
      this.attractFood()
    }
  }
  
  // 更新渲染蛇（用于插值平滑）
  private updateRenderSnake(deltaTime: number) {
    const t = Math.min(this.moveAccumulator / (this.currentSpeed * 16.67), 1)
    
    // 初始化或更新渲染蛇
    while (this.renderSnake.length < this.snake.length) {
      const idx = this.renderSnake.length
      this.renderSnake.push({
        x: this.snake[idx].x,
        y: this.snake[idx].y,
        prevX: this.snake[idx].x,
        prevY: this.snake[idx].y
      })
    }
    
    // 插值更新
    for (let i = 0; i < this.snake.length && i < this.renderSnake.length; i++) {
      this.renderSnake[i].prevX = this.renderSnake[i].x
      this.renderSnake[i].prevY = this.renderSnake[i].y
      this.renderSnake[i].x = this.snake[i].x + (this.snake[i].x - this.renderSnake[i].prevX) * t
      this.renderSnake[i].y = this.snake[i].y + (this.snake[i].y - this.renderSnake[i].prevY) * t
    }
  }
  
  // ===== 爆款体验辅助函数 =====
  
  // 激活狂暴模式
  private activateFrenzy() {
    if (this.frenzyMode) return
    this.frenzyMode = true
    this.frenzyTimer = this.frenzyDuration
    this.screenShake = 8
    this.addFloatingText(
      Math.floor(this.snake[0].x),
      Math.floor(this.snake[0].y),
      'FRENZY MODE!',
      '#ff2d95',
      24
    )
    playSound('powerup')
  }
  
  // 取消狂暴模式
  private deactivateFrenzy() {
    this.frenzyMode = false
    this.frenzyCombo = 0
  }
  
  // 添加拖尾
  private addTrail() {
    const head = this.snake[0]
    if (!head) return
    
    this.trail.push({
      x: head.x,
      y: head.y,
      life: this.MAX_TRAIL_LENGTH,
      maxLife: this.MAX_TRAIL_LENGTH
    })
    
    // 限制长度
    if (this.trail.length > this.MAX_TRAIL_LENGTH) {
      this.trail.shift()
    }
  }
  
  // 添加浮动文字
  private addFloatingText(gridX: number, gridY: number, text: string, color: string, size: number) {
    this.floatingTexts.push({
      x: gridX * this.gridSize + this.gridSize / 2,
      y: gridY * this.gridSize,
      text,
      color,
      life: 60,
      maxLife: 60,
      size,
      vy: -2
    })
  }
  
  // 检查成就
  private checkAchievements() {
    const checks = [
      { id: 'first_blood', cond: this.totalFoodEaten >= 1, name: '初次进食' },
      { id: 'combo_5', cond: this.maxCombo >= 5, name: '连击大师' },
      { id: 'combo_10', cond: this.maxCombo >= 10, name: '无敌连击' },
      { id: 'perfect_3', cond: this.perfectCount >= 3, name: '完美时机' },
      { id: 'perfect_10', cond: this.perfectCount >= 10, name: '时机之王' },
      { id: 'frenzy_5', cond: this.totalFoodEaten >= 5 && !this.achievements.has('frenzy_5'), name: '狂暴觉醒' },
    ]
    
    for (const check of checks) {
      if (check.cond && !this.achievements.has(check.id)) {
        this.achievements.add(check.id)
        this.unlockedAchievements.push(check.name)
        this.addFloatingText(
          Math.floor(this.snake[0].x),
          Math.floor(this.snake[0].y) - 20,
          `成就: ${check.name}`,
          '#ffd700',
          14
        )
      }
    }
  }
  
  // 计算评分
  private getRank(): { rank: string; color: string; description: string } {
    const score = this.score
    const combo = this.maxCombo
    const perfects = this.perfectCount
    const foodEaten = this.totalFoodEaten
    
    // S级: 1000分+ 或 10连击+ 或 10个Perfect
    if (score >= 1000 || combo >= 10 || perfects >= 10) {
      return { rank: 'S', color: '#ffd700', description: '传奇蛇神' }
    }
    // A级: 500分+ 或 7连击+
    if (score >= 500 || combo >= 7 || perfects >= 5) {
      return { rank: 'A', color: '#ff2d95', description: '顶级玩家' }
    }
    // B级: 200分+ 或 5连击+
    if (score >= 200 || combo >= 5 || perfects >= 3) {
      return { rank: 'B', color: '#00f0ff', description: '熟练玩家' }
    }
    // C级: 100分+
    if (score >= 100 || foodEaten >= 10) {
      return { rank: 'C', color: '#39ff14', description: '入门玩家' }
    }
    return { rank: 'D', color: '#888', description: '继续努力' }
  }
  
  private attractFood() {
    if (this.snake.length === 0) return
    const head = this.snake[0]
    
    for (const food of this.food) {
      const dx = head.x - food.x
      const dy = head.y - food.y
      const dist = Math.abs(dx) + Math.abs(dy)
      
      if (dist <= 5 && dist > 0) {
        food.x += Math.sign(dx)
        food.y += Math.sign(dy)
      }
    }
  }

  // Update particles
  private updateParticles(deltaTime: number) {
    const factor = deltaTime / 16.67
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx * factor
      p.y += p.vy * factor
      p.vy += 0.1 * factor
      p.life--
      if (p.life <= 0) this.particles.splice(i, 1)
    }

    if (this.screenShake > 0) this.screenShake *= 0.9
    if (this.screenShake < 0.5) this.screenShake = 0
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
        const effects: FoodType[] = ['magnet', 'invincible', 'speed', 'honey', 'poison', 'timewarp', 'decoy']
        const randomEffect = effects[Math.floor(Math.random() * effects.length)]
        this.handleFoodEffect(randomEffect)
        break
      case 'golden':
        // 金苹果只有双倍得分，无额外效果
        break
      case 'timewarp':
        // 时间暂停：障碍物和Boss减速70%
        this.timeWarpActive = true
        this.powerTimer = 300 // 5秒
        break
      case 'decoy':
        // 生成分身诱饵
        this.spawnDecoy()
        break
    }
  }

  private spawnDecoy() {
    if (this.snake.length < 4) return

    // 从尾部创建一个诱饵
    const decoyCount = Math.min(2, Math.floor(this.snake.length / 5))
    for (let i = 0; i < decoyCount; i++) {
      const tailIndex = this.snake.length - 1 - i * 2
      if (tailIndex >= 0) {
        this.decoys.push({
          x: this.snake[tailIndex].x,
          y: this.snake[tailIndex].y,
          life: 600, // 10秒
        })
      }
    }

    // 蛇缩短
    this.snake.splice(-decoyCount * 2, decoyCount * 2)
    playSound('powerup')
  }

  private spawnParticles(x: number, y: number, color: string, count: number = 8) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const speed = 1 + Math.random() * 3
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 1,
        size: 2 + Math.random() * 3,
        color,
        life: 25 + Math.random() * 15,
        maxLife: 40
      })
    }
  }
  
  // 圆角矩形辅助
  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }

  private render(deltaTime: number = 16.67) {
    const ctx = this.ctx

    // 慢动作效果处理
    if (this.slowMotionFactor < 1 && this.state === 'gameover') {
      // 慢动作期间，时间流逝减缓
      this.deathTime--
      if (this.deathTime <= 0) {
        this.slowMotionFactor = 1 // 恢复正常速度
      }
    }

    ctx.save()

    // Screen shake
    if (this.screenShake > 0.5) {
      ctx.translate(
        (Math.random() - 0.5) * this.screenShake,
        (Math.random() - 0.5) * this.screenShake
      )
    }

    // Dynamic background - gradient flow (慢动作时动画减缓)
    const timeScale = this.state === 'gameover' ? this.slowMotionFactor : 1
    const bgTime = Date.now() / 3000 * timeScale
    const bgGrad = ctx.createRadialGradient(
      this.W / 2 + Math.sin(bgTime) * 100,
      this.H / 2 + Math.cos(bgTime) * 100,
      50,
      this.W / 2,
      this.H / 2,
      this.W * 0.7
    )

    // 死亡时背景变暗红色
    if (this.state === 'gameover') {
      const darkRedAlpha = 0.3 + Math.sin(Date.now() / 500) * 0.1
      bgGrad.addColorStop(0, `rgba(40, 10, 10, ${darkRedAlpha})`)
      bgGrad.addColorStop(0.5, '#1a0a0a')
      bgGrad.addColorStop(1, '#0a0505')
    } else {
      bgGrad.addColorStop(0, '#151530')
      bgGrad.addColorStop(0.5, '#0f0f20')
      bgGrad.addColorStop(1, '#0a0a18')
    }

    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, this.W, this.H)

    // 慢动作时添加暗角效果
    if (this.slowMotionFactor < 1) {
      const vignetteGrad = ctx.createRadialGradient(
        this.W / 2, this.H / 2, this.H * 0.3,
        this.W / 2, this.H / 2, this.W * 0.7
      )
      vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)')
      vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.6)')
      ctx.fillStyle = vignetteGrad
      ctx.fillRect(0, 0, this.W, this.H)
    }

    // Static grid
    ctx.strokeStyle = '#1a1a35'
    ctx.lineWidth = 0.5
    for (let x = 0; x <= this.cols; x++) {
      ctx.beginPath()
      ctx.moveTo(x * this.gridSize, 0)
      ctx.lineTo(x * this.gridSize, this.H)
      ctx.stroke()
    }
    for (let y = 0; y <= this.rows; y++) {
      ctx.beginPath()
      ctx.moveTo(0, y * this.gridSize)
      ctx.lineTo(this.W, y * this.gridSize)
      ctx.stroke()
    }

    // Challenge wave background
    if (this.challengeWave) {
      ctx.fillStyle = `rgba(255, 0, 100, ${0.05 + Math.sin(Date.now() / 100) * 0.03})`
      ctx.fillRect(0, 0, this.W, this.H)
    }

    if (this.state === 'title') {
      this.renderTitle()
    } else if (this.state === 'gameover') {
      this.renderGame()
      this.renderGameOverEnhanced()
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

  private renderGameOverEnhanced() {
    const ctx = this.ctx

    // 半透明背景
    ctx.fillStyle = 'rgba(10,10,24,0.9)'
    ctx.fillRect(0, 0, this.W, this.H)

    ctx.textAlign = 'center'

    // GAME OVER 标题
    const titleY = 50
    ctx.fillStyle = '#ff2d95'
    ctx.shadowColor = '#ff2d95'
    ctx.shadowBlur = 20
    ctx.font = 'bold 18px "Press Start 2P", monospace'
    ctx.fillText('GAME OVER', this.W / 2, titleY)
    ctx.shadowBlur = 0

    // 评级系统
    const rank = this.getRank()
    const rankY = 90
    const rankSize = this.slowMotionFactor < 1 ? 36 : 32 // 慢动作时更大

    // 评级外发光
    ctx.save()
    ctx.shadowColor = rank.color
    ctx.shadowBlur = 30
    ctx.fillStyle = rank.color
    ctx.font = `bold ${rankSize}px "Press Start 2P", monospace`
    ctx.fillText(rank.rank, this.W / 2, rankY)
    ctx.restore()

    // 评级描述
    ctx.fillStyle = '#aaa'
    ctx.font = '7px "Press Start 2P", monospace'
    ctx.fillText(rank.description, this.W / 2, rankY + 25)

    // 详细统计面板
    const statsY = 145
    ctx.fillStyle = '#fff'
    ctx.font = '8px "Press Start 2P", monospace'
    ctx.fillText('STATISTICS', this.W / 2, statsY)

    const statLines = [
      { label: 'SCORE', value: this.score.toString(), color: '#39ff14' },
      { label: 'MAX COMBO', value: `x${this.maxCombo}`, color: '#00f0ff' },
      { label: 'PERFECT', value: this.perfectCount.toString(), color: '#ffe600' },
      { label: 'FOOD EATEN', value: this.totalFoodEaten.toString(), color: '#ff88ff' },
      { label: 'LEVEL', value: this.difficultyLevel.toString(), color: '#00f0ff' },
    ]

    statLines.forEach((line, i) => {
      const y = statsY + 25 + i * 20
      ctx.fillStyle = '#888'
      ctx.font = '6px "Press Start 2P", monospace'
      ctx.fillText(line.label, this.W / 2 - 50, y)

      ctx.fillStyle = line.color
      ctx.shadowColor = line.color
      ctx.shadowBlur = 8
      ctx.font = 'bold 7px "Press Start 2P", monospace'
      ctx.fillText(line.value, this.W / 2 + 50, y)
      ctx.shadowBlur = 0
    })

    // 最高分记录
    const hs = parseInt(localStorage.getItem('neon_arcade_hs_snake') || '0')
    const hsY = statsY + 25 + statLines.length * 20 + 15

    ctx.fillStyle = '#666'
    ctx.font = '6px "Press Start 2P", monospace'
    ctx.fillText('HIGH SCORE', this.W / 2, hsY)

    if (this.score > hs) {
      ctx.fillStyle = '#ffe600'
      ctx.shadowColor = '#ffe600'
      ctx.shadowBlur = 15
      ctx.font = 'bold 10px "Press Start 2P", monospace'
      ctx.fillText(`NEW! ${this.score}`, this.W / 2, hsY + 20)
      ctx.shadowBlur = 0
    } else {
      ctx.fillStyle = '#ffe600'
      ctx.font = '8px "Press Start 2P", monospace'
      ctx.fillText(hs.toString(), this.W / 2, hsY + 20)
    }

    // 成就显示
    if (this.unlockedAchievements.length > 0) {
      const achY = hsY + 50
      ctx.fillStyle = '#ffe600'
      ctx.shadowColor = '#ffe600'
      ctx.shadowBlur = 10
      ctx.font = '7px "Press Start 2P", monospace'
      ctx.fillText('ACHIEVEMENTS UNLOCKED', this.W / 2, achY)
      ctx.shadowBlur = 0

      this.unlockedAchievements.slice(0, 3).forEach((ach, i) => {
        const y = achY + 20 + i * 18
        ctx.fillStyle = '#00f0ff'
        ctx.font = '6px "Press Start 2P", monospace'
        ctx.fillText(`★ ${ach}`, this.W / 2, y)
      })

      if (this.unlockedAchievements.length > 3) {
        ctx.fillStyle = '#888'
        ctx.font = '5px "Press Start 2P", monospace'
        ctx.fillText(`+${this.unlockedAchievements.length - 3} more`, this.W / 2, achY + 20 + 3 * 18)
      }
    }

    // 慢动作提示
    if (this.slowMotionFactor < 1) {
      ctx.fillStyle = `rgba(255, 45, 149, ${0.5 + Math.sin(Date.now() / 100) * 0.3})`
      ctx.font = '6px "Press Start 2P", monospace'
      ctx.fillText('SLOW MOTION...', this.W / 2, this.H - 80)
    }

    // 重试提示（闪烁）
    const retryY = this.H - 40
    ctx.fillStyle = '#4a4a6a'
    ctx.font = '7px "Press Start 2P", monospace'
    if (Math.sin(Date.now() / 300) > 0) {
      ctx.fillText('TAP / R TO RETRY', this.W / 2, retryY)
    }
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

    // ===== 拖尾效果渲染 =====
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i]
      const alpha = (t.life / t.maxLife) * 0.5
      const size = this.gridSize * (t.life / t.maxLife) * 0.8
      
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.fillStyle = this.frenzyMode ? '#ff2d95' : '#00f0ff'
      ctx.shadowColor = ctx.fillStyle
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.arc(
        t.x * this.gridSize + this.gridSize / 2,
        t.y * this.gridSize + this.gridSize / 2,
        size / 2,
        0,
        Math.PI * 2
      )
      ctx.fill()
      ctx.restore()
    }
    
    // Snake - 霓虹风发光蛇身
    const snakeLen = this.renderSnake.length || this.snake.length
    for (let i = snakeLen - 1; i >= 0; i--) {
      const rs = this.renderSnake[i] || this.snake[i]
      const s = this.snake[i] || rs
      const isHead = i === 0
      
      const rx = rs ? rs.x : s.x
      const ry = rs ? rs.y : s.y

      // 狂暴模式颜色
      let color = this.frenzyMode ? '#ff2d95' : '#00c8d4'
      if (isHead) color = this.frenzyMode ? '#ff66b2' : '#00f0ff'
      else if (this.isDashing) color = '#ffe600'
      else if (this.activePower === 'invincible' && Math.floor(Date.now() / 100) % 2) color = '#ffe600'

      // 渐变透明度
      const fadeFactor = 1 - (i / snakeLen) * 0.3
      
      ctx.save()
      ctx.globalAlpha = fadeFactor
      
      // 多层发光效果
      if (isHead || this.frenzyMode || this.activePower !== 'none') {
        // 外层光晕
        ctx.shadowColor = color
        ctx.shadowBlur = this.frenzyMode ? 20 : 12
        
        // 光晕扩展
        ctx.fillStyle = color
        ctx.globalAlpha = 0.3
        this.roundRect(
          ctx,
          rx * this.gridSize - 2,
          ry * this.gridSize - 2,
          this.gridSize + 4,
          this.gridSize + 4,
          8
        )
        ctx.fill()
      }
      
      // 蛇身主体
      ctx.globalAlpha = fadeFactor
      ctx.fillStyle = color
      this.roundRect(
        ctx,
        rx * this.gridSize + 1,
        ry * this.gridSize + 1,
        this.gridSize - 2,
        this.gridSize - 2,
        isHead ? 6 : 4
      )
      ctx.fill()
      
      // 内部高光
      ctx.fillStyle = '#ffffff'
      ctx.globalAlpha = fadeFactor * 0.3
      this.roundRect(
        ctx,
        rx * this.gridSize + 3,
        ry * this.gridSize + 3,
        this.gridSize - 6,
        this.gridSize / 2 - 2,
        3
      )
      ctx.fill()
      
      // 蛇头眼睛
      if (isHead) {
        ctx.globalAlpha = 1
        ctx.fillStyle = '#0a0a18'
        ctx.shadowBlur = 0
        const eyeSize = 3
        const eyeOffset = 5
        // ... (保持原有的眼睛绘制逻辑)
        if (this.dir.x === 1) {
          ctx.beginPath()
          ctx.arc(rx * this.gridSize + this.gridSize - eyeOffset, ry * this.gridSize + 6, eyeSize, 0, Math.PI * 2)
          ctx.arc(rx * this.gridSize + this.gridSize - eyeOffset, ry * this.gridSize + this.gridSize - 6, eyeSize, 0, Math.PI * 2)
          ctx.fill()
        } else if (this.dir.x === -1) {
          ctx.beginPath()
          ctx.arc(rx * this.gridSize + eyeOffset, ry * this.gridSize + 6, eyeSize, 0, Math.PI * 2)
          ctx.arc(rx * this.gridSize + eyeOffset, ry * this.gridSize + this.gridSize - 6, eyeSize, 0, Math.PI * 2)
          ctx.fill()
        } else if (this.dir.y === -1) {
          ctx.beginPath()
          ctx.arc(rx * this.gridSize + 6, ry * this.gridSize + eyeOffset, eyeSize, 0, Math.PI * 2)
          ctx.arc(rx * this.gridSize + this.gridSize - 6, ry * this.gridSize + eyeOffset, eyeSize, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.beginPath()
          ctx.arc(rx * this.gridSize + 6, ry * this.gridSize + this.gridSize - eyeOffset, eyeSize, 0, Math.PI * 2)
          ctx.arc(rx * this.gridSize + this.gridSize - 6, ry * this.gridSize + this.gridSize - eyeOffset, eyeSize, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      
      ctx.restore()
    }

    // Particles - 增强效果
    for (const p of this.particles) {
      const alpha = p.maxLife ? (p.life / p.maxLife) : (p.life / 20)
      ctx.globalAlpha = alpha
      ctx.fillStyle = p.color
      ctx.shadowColor = p.color
      ctx.shadowBlur = 4
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
    
    // ===== 浮动文字渲染 =====
    for (const ft of this.floatingTexts) {
      const alpha = ft.life / ft.maxLife
      const scale = 1 + (1 - alpha) * 0.5  // 逐渐放大
      
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.fillStyle = ft.color
      ctx.shadowColor = ft.color
      ctx.shadowBlur = 10
      ctx.font = `bold ${ft.size * scale}px "Press Start 2P", monospace`
      ctx.textAlign = 'center'
      ctx.fillText(ft.text, ft.x, ft.y)
      ctx.restore()
    }

    // HUD
    ctx.fillStyle = '#39ff14'
    ctx.shadowColor = '#39ff14'
    ctx.shadowBlur = 6
    ctx.font = '8px "Press Start 2P", monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`SCORE: ${this.score}`, 8, 16)
    ctx.shadowBlur = 0

    // Combo显示（带保护模式指示）
    if (this.combo >= 3) {
      const mult = this.getComboMultiplier()
      ctx.fillStyle = mult >= 5 ? '#ffd700' : mult >= 3 ? '#ffe600' : '#00f0ff'
      ctx.shadowColor = ctx.fillStyle
      ctx.shadowBlur = 6
      ctx.fillText(`COMBO x${mult}${this.comboDecayMode ? '↓' : ''}`, 8, 28)
      ctx.shadowBlur = 0
    }
    
    // ===== 狂暴模式指示器 =====
    if (this.frenzyMode) {
      const pulse = Math.sin(Date.now() / 50) * 0.5 + 0.5
      ctx.fillStyle = `rgba(255, 45, 149, ${0.5 + pulse * 0.5})`
      ctx.shadowColor = '#ff2d95'
      ctx.shadowBlur = 12
      ctx.font = 'bold 10px "Press Start 2P", monospace'
      ctx.textAlign = 'center'
      ctx.fillText('⚡ FRENZY MODE ⚡', this.W / 2, 16)
      ctx.shadowBlur = 0
      
      // 狂暴倒计时条
      const barWidth = 100
      const barHeight = 6
      const fill = this.frenzyTimer / this.frenzyDuration
      ctx.fillStyle = '#1a0a15'
      ctx.fillRect(this.W / 2 - barWidth / 2, 24, barWidth, barHeight)
      ctx.fillStyle = '#ff2d95'
      ctx.fillRect(this.W / 2 - barWidth / 2, 24, barWidth * fill, barHeight)
    }
    
    // Perfect连击显示
    if (this.perfectStreak > 0) {
      ctx.fillStyle = '#ffe600'
      ctx.shadowColor = '#ffe600'
      ctx.shadowBlur = 8
      ctx.font = '7px "Press Start 2P", monospace'
      ctx.textAlign = 'left'
      ctx.fillText(`PERFECT x${this.perfectStreak}`, 8, 42)
      ctx.shadowBlur = 0
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
        timewarp: '#00ff88',
        decoy: '#ff6600',
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