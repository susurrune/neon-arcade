// ============================================
// JUMP JUMP v3 — 商业级蓄力精准跳跃挑战
// 核心物理系统 + 判定系统 + 镜头系统 + 手感优化
// ============================================
import { playSound } from '../utils/sound'

// ===== 类型定义 =====
type PowerUpType = 'spring' | 'shield' | 'double' | 'magnet' | 'slowmo'
type PlatformType = 'normal' | 'moving' | 'shrinking' | 'vanishing' | 'spring'
type JudgeGrade = 'perfect' | 'good' | 'edge' | 'fail'
type GameState = 'title' | 'charging' | 'jumping' | 'falling' | 'gameover'

interface PowerUp {
  x: number
  y: number
  type: PowerUpType
  active: boolean
  bobOffset: number
}

interface FloatingPlatform {
  baseX: number
  moveRange: number
  moveSpeed: number
  phase: number
}

interface Platform {
  x: number
  y: number
  width: number
  height: number
  type: PlatformType
  movingData?: FloatingPlatform
  vanishTimer?: number
  shrinkTimer?: number
  originalWidth?: number
}

interface Particle {
  x: number; y: number
  vx: number; vy: number
  color: string; size: number
  life: number; maxLife: number
}

interface FloatingText {
  x: number; y: number
  text: string; subtext: string
  color: string; size: number
  life: number; maxLife: number
  vy: number
}

// ===== 判定阈值配置 =====
const JUDGE = {
  perfect: 0.10,   // 中心10%范围
  good: 0.30,      // 30%范围
  edge: 0.60,      // 60%范围（边缘容差）
  // 超出edge范围 = fail
}

const JUDGE_SCORES: Record<JudgeGrade, number> = {
  perfect: 50,
  good: 20,
  edge: 8,
  fail: 0,
}

const JUDGE_COLORS: Record<JudgeGrade, string> = {
  perfect: '#ffe600',
  good: '#39ff14',
  edge: '#00f0ff',
  fail: '#ff2d95',
}

export class PlatformerGame {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private W = 640
  private H = 400
  private dpr = 1
  private animId = 0
  private running = false
  private state: GameState = 'title'

  // ===== 物理常量 =====
  private readonly PLAYER_RADIUS = 12
  private readonly PLATFORM_HEIGHT = 18
  private readonly GRAVITY = 0.0035           // 重力加速度(ms^-2)
  private readonly MAX_CHARGE_MS = 1200       // 最大蓄力时间
  private readonly MIN_CHARGE_MS = 60         // 最小蓄力时间（低于则忽略）
  private readonly MAX_JUMP_SPEED = 0.55      // 最大水平速度(px/ms)
  private readonly MIN_JUMP_SPEED = 0.12      // 最小水平速度(px/ms)
  private readonly JUMP_VY = -0.38            // 起跳垂直速度(px/ms)
  private readonly CHARGE_DECAY = 0.7         // 蓄力非线性衰减系数
  private readonly NEXT_MIN_DIST = 85
  private readonly NEXT_MAX_DIST = 260
  private readonly Y_VARY_RANGE = 24
  private readonly PLATFORM_MIN_W = 46
  private readonly PLATFORM_MAX_W = 78

  // ===== 游戏状态 =====
  private platforms: Platform[] = []
  private currentIdx = 0
  private score = 0
  private displayScore = 0   // 动态显示分数（动画增长）
  private combo = 0
  private maxCombo = 0
  private bestScore = 0
  private totalJumps = 0
  private perfectCount = 0
  private goodCount = 0

  // ===== 道具系统 =====
  private activePowerUp: PowerUpType | null = null
  private powerUpTimer = 0
  private powerUps: PowerUp[] = []
  private doubleScoreActive = false
  private shieldActive = false
  private slowMoActive = false
  private slowMoFactor = 0.5

  // ===== 蓄力状态 =====
  private chargeStartTime = 0
  private currentChargeRatio = 0
  private isCharging = false
  private chargeReleaseBuffered = false  // 提前释放缓冲
  private squashAmount = 0               // 压缩动画量(0-1)

  // ===== 跳跃物理 =====
  private jumpVx = 0          // 水平速度
  private jumpVy = 0          // 垂直速度
  private playerX = 0
  private playerY = 0
  private jumpStartX = 0      // 起跳X位置
  private jumpStartY = 0      // 起跳Y位置
  private lastFrameTime = 0   // 上一帧时间戳

  // ===== 镜头系统 =====
  private cameraX = 0
  private cameraY = 0
  private cameraTargetX = 0
  private cameraTargetY = 0
  private cameraZoom = 1
  private cameraTargetZoom = 1

  // ===== 视觉效果 =====
  private particles: Particle[] = []
  private floatingTexts: FloatingText[] = []
  private screenShake = 0
  private screenShakeDecay = 0.88
  private playerTrail: { x: number; y: number; alpha: number }[] = []

  // ===== 判定反馈 =====
  private lastJudge: JudgeGrade | null = null
  private judgeFlashTimer = 0

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

  // =============================================
  // 【1. 核心物理系统】
  // =============================================

  /**
   * 非线性蓄力曲线
   * 公式: power = 1 - e^(-decay * ratio)
   * 特性:
   *   - 短按快速响应（低蓄力即有明显效果）
   *   - 长按逐渐饱和（避免无限增长）
   *   - 衰减系数控制曲线弯曲度
   */
  private chargeCurve(ratio: number): number {
    return 1 - Math.exp(-this.CHARGE_DECAY * ratio * 3)
  }

  /**
   * 蓄力 → 跳跃速度映射
   * 使用非线性曲线将蓄力比例转换为水平速度
   * jumpSpeed = MIN + power * (MAX - MIN)
   */
  private chargeToSpeed(chargeRatio: number): number {
    const power = this.chargeCurve(chargeRatio)
    return this.MIN_JUMP_SPEED + power * (this.MAX_JUMP_SPEED - this.MIN_JUMP_SPEED)
  }

  /**
   * 起跳初始化
   * - 设置水平速度（基于蓄力）
   * - 设置垂直速度（固定起跳力）
   * - 弹簧平台增加起跳力
   */
  private launchJump() {
    const speed = this.chargeToSpeed(this.currentChargeRatio)
    this.jumpVx = speed
    this.jumpVy = this.JUMP_VY

    // 弹簧平台加成
    const currentPlat = this.platforms[this.currentIdx]
    if (currentPlat?.type === 'spring') {
      this.jumpVy *= 1.3
      this.spawnParticles(this.playerX, this.playerY, '#ff2d95', 8)
    }

    this.jumpStartX = this.playerX
    this.jumpStartY = this.playerY
    this.state = 'jumping'
    this.squashAmount = -0.3  // 起跳拉伸
    this.totalJumps++
    playSound('jump')
    this.spawnParticles(this.playerX, this.playerY + this.PLAYER_RADIUS, '#ffe600', 5)
  }

  /**
   * 跳跃物理更新（每帧调用）
   * - 水平匀速运动
   * - 垂直受重力影响（v += g * dt）
   * - y += vy * dt, x += vx * dt
   * - 真实抛物线轨迹
   */
  private updateJumpPhysics(dt: number) {
    const timeScale = this.slowMoActive ? this.slowMoFactor : 1
    const scaledDt = dt * timeScale

    // 保存上一帧Y用于落地检测
    const prevY = this.playerY

    // 重力加速
    this.jumpVy += this.GRAVITY * scaledDt

    // 位置更新
    this.playerX += this.jumpVx * scaledDt
    this.playerY += this.jumpVy * scaledDt

    // 磁铁效果
    if (this.activePowerUp === 'magnet') {
      const nextPlat = this.platforms[this.currentIdx + 1]
      if (nextPlat) {
        const dx = nextPlat.x - this.playerX
        this.playerX += dx * 0.05
      }
    }

    // 检测落地
    this.checkLanding(prevY)

    // 掉出屏幕下方
    if (this.playerY > this.H + 100) {
      this.onFail()
    }
  }

  /**
   * 落地检测 - 使用实际帧位置对比
   */
  private checkLanding(prevY: number) {
    const nextPlat = this.platforms[this.currentIdx + 1]
    if (!nextPlat) return

    // 只有在下落时才检测
    if (this.jumpVy <= 0) return

    const platTop = nextPlat.y - this.PLATFORM_HEIGHT / 2
    const prevBottom = prevY + this.PLAYER_RADIUS
    const currBottom = this.playerY + this.PLAYER_RADIUS

    // 检测是否穿过平台顶部（含5px容差）
    if (prevBottom <= platTop + 5 && currBottom >= platTop - 5) {
      const landX = this.playerX
      const leftBound = nextPlat.x - nextPlat.width / 2
      const rightBound = nextPlat.x + nextPlat.width / 2

      if (landX >= leftBound && landX <= rightBound) {
        this.onLand(landX, nextPlat)
      }
    }
  }

  // =============================================
  // 【3. 判定系统】
  // =============================================

  /**
   * 判定算法
   * offset = |landX - centerX|
   * ratio = offset / halfWidth
   * - ratio <= 0.10 → Perfect（中心10%）
   * - ratio <= 0.30 → Good
   * - ratio <= 0.60 → Edge（边缘容差）
   * - ratio > 0.60 → 但仍在平台上 → Edge
   * - 不在平台上 → Fail
   */
  private judgeLanding(landX: number, platform: Platform): JudgeGrade {
    const centerX = platform.x
    const offset = Math.abs(landX - centerX)
    const halfWidth = platform.width / 2
    const ratio = offset / halfWidth

    if (ratio <= JUDGE.perfect) return 'perfect'
    if (ratio <= JUDGE.good) return 'good'
    if (ratio <= JUDGE.edge) return 'edge'
    return 'edge'  // 在平台上但超出edge范围，仍给edge（容差）
  }

  private onLand(landX: number, platform: Platform) {
    const grade = this.judgeLanding(landX, platform)
    const basePoints = JUDGE_SCORES[grade]
    this.lastJudge = grade
    this.judgeFlashTimer = 1.0

    // Combo系统
    if (grade === 'perfect' || grade === 'good') {
      this.combo++
      if (this.combo > this.maxCombo) this.maxCombo = this.combo
    } else if (grade === 'edge') {
      this.combo = Math.max(0, this.combo - 1)
    }

    if (grade === 'perfect') this.perfectCount++
    if (grade === 'good') this.goodCount++

    // Combo加成
    const comboBonus = Math.min(this.combo * 3, 30)
    let totalPoints = basePoints + comboBonus

    // 弹簧平台双倍
    if (platform.type === 'spring') {
      totalPoints *= 2
    }

    // 双倍分数道具
    if (this.doubleScoreActive) {
      totalPoints *= 2
    }

    this.score += totalPoints
    this.currentIdx++

    // 修正玩家位置到平台顶部
    this.playerY = platform.y - this.PLATFORM_HEIGHT / 2 - this.PLAYER_RADIUS
    this.playerX = landX

    // 视觉反馈
    this.addJudgeFeedback(grade, landX, platform.y, totalPoints)

    // 蓄力弹簧特效
    if (platform.type === 'spring') {
      this.spawnParticles(landX, this.playerY, '#ff2d95', 15)
      this.screenShake = 6
    }

    // 检查道具拾取
    this.checkPowerUpPickup(landX, platform.y)

    // 判定音效
    if (grade === 'perfect') {
      playSound('combo')
    } else {
      playSound('score')
    }

    this.ensurePlatforms()
    this.saveBestScore()
    this.onScoreUpdate(this.score)

    // 返回蓄力状态（落地后自动开始蓄力，无需再次点击）
    this.state = 'charging'
    this.isCharging = true
    this.chargeStartTime = Date.now()
    this.currentChargeRatio = 0
    this.squashAmount = 0.3  // 落地压缩
  }

  private onFail() {
    if (this.shieldActive) {
      // 护盾免疫一次
      this.shieldActive = false
      this.activePowerUp = null
      this.screenShake = 10
      this.spawnParticles(this.playerX, this.playerY, '#00f0ff', 20)
      playSound('shield')

      // 安全回到下一个平台
      const nextPlat = this.platforms[this.currentIdx + 1]
      if (nextPlat) {
        this.playerX = nextPlat.x
        this.playerY = nextPlat.y - this.PLATFORM_HEIGHT / 2 - this.PLAYER_RADIUS
        this.currentIdx++
        this.addFloatingText(this.playerX, this.playerY - 30, 'SHIELD!', '', '#00f0ff', 18)
      }

      this.ensurePlatforms()
      this.state = 'charging'
      this.isCharging = true
      this.chargeStartTime = Date.now()
      this.currentChargeRatio = 0
    } else {
      this.state = 'gameover'
      this.spawnParticles(this.playerX, this.playerY, '#ff2d95', 20)
      this.screenShake = 15
      playSound('death')
      this.saveBestScore()
    }
  }

  // =============================================
  // 【4. 判定反馈系统】
  // =============================================

  private addJudgeFeedback(grade: JudgeGrade, x: number, y: number, points: number) {
    const color = JUDGE_COLORS[grade]
    const labels: Record<JudgeGrade, string> = {
      perfect: 'PERFECT!',
      good: 'GOOD!',
      edge: 'EDGE',
      fail: 'FAIL',
    }

    // 弹字效果
    this.addFloatingText(x, y - 30, labels[grade], `+${points}`, color, grade === 'perfect' ? 24 : 18)

    // 粒子效果
    if (grade === 'perfect') {
      this.spawnParticles(x, y, '#ffe600', 16)
      this.spawnParticles(x, y, '#39ff14', 10)
      this.screenShake = 4
    } else if (grade === 'good') {
      this.spawnParticles(x, y, '#39ff14', 8)
      this.screenShake = 2
    } else if (grade === 'edge') {
      this.spawnParticles(x, y, '#00f0ff', 5)
    }
  }

  // =============================================
  // 【5. 镜头系统】
  // =============================================

  private updateCamera() {
    // 目标位置：当前平台和下一平台之间
    const currentPlat = this.platforms[this.currentIdx]
    const nextPlat = this.platforms[this.currentIdx + 1]

    let targetX = this.playerX
    let targetY = this.playerY

    if (currentPlat && nextPlat) {
      // 看向当前平台和下一平台中间
      targetX = (currentPlat.x + nextPlat.x) / 2
      targetY = (currentPlat.y + nextPlat.y) / 2
    } else if (currentPlat) {
      targetX = currentPlat.x
      targetY = currentPlat.y
    }

    this.cameraTargetX = targetX
    this.cameraTargetY = targetY

    // 跳跃时轻微拉远
    if (this.state === 'jumping') {
      this.cameraTargetZoom = 0.92
    } else {
      this.cameraTargetZoom = 1.0
    }

    // 插值平滑移动
    const lerpSpeed = 0.08
    this.cameraX += (this.cameraTargetX - this.cameraX) * lerpSpeed
    this.cameraY += (this.cameraTargetY - this.cameraY) * lerpSpeed
    this.cameraZoom += (this.cameraTargetZoom - this.cameraZoom) * 0.05
  }

  // =============================================
  // 平台生成
  // =============================================

  private generateNextPlatform(prev: Platform): Platform {
    let dist = this.NEXT_MIN_DIST + Math.random() * (this.NEXT_MAX_DIST - this.NEXT_MIN_DIST)
    let yOffset = (Math.random() - 0.5) * this.Y_VARY_RANGE * 2
    let newY = Math.min(this.H - this.PLATFORM_HEIGHT - 20, Math.max(60, prev.y + yOffset))
    let newX = prev.x + dist

    // 确保平台在屏幕可见范围内（相对于摄像机）
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

    // 难度递增平台类型
    let type: PlatformType = 'normal'
    const difficultyLevel = Math.floor(this.score / 100)

    if (difficultyLevel >= 1) {
      const rand = Math.random()
      if (rand < 0.15) type = 'moving'
      else if (rand < 0.25) type = 'shrinking'
      else if (rand < 0.35 && difficultyLevel >= 2) type = 'vanishing'
      else if (rand < 0.40) type = 'spring'
    }

    const platform: Platform = {
      x: newX,
      y: newY,
      width: Math.floor(width),
      height: this.PLATFORM_HEIGHT,
      type,
      originalWidth: Math.floor(width),
    }

    if (type === 'moving') {
      platform.movingData = {
        baseX: newX,
        moveRange: 30 + Math.random() * 40,
        moveSpeed: 0.02 + Math.random() * 0.02,
        phase: Math.random() * Math.PI * 2,
      }
    }

    if (type === 'vanishing') {
      platform.vanishTimer = 0
    }

    if (type === 'shrinking') {
      platform.shrinkTimer = 0
    }

    return platform
  }

  private spawnPowerUp(platformX: number, platformY: number) {
    if (Math.random() > 0.25) return

    const types: PowerUpType[] = ['spring', 'shield', 'double', 'magnet', 'slowmo']
    const type = types[Math.floor(Math.random() * types.length)]

    this.powerUps.push({
      x: platformX,
      y: platformY - 40,
      type,
      active: true,
      bobOffset: Math.random() * Math.PI * 2,
    })
  }

  private initPlatforms() {
    const startX = 140
    const startY = this.H - 100
    const baseW = 68
    const p1: Platform = { x: startX, y: startY, width: baseW, height: this.PLATFORM_HEIGHT, type: 'normal', originalWidth: baseW }
    const p2 = this.generateNextPlatform(p1)
    const p3 = this.generateNextPlatform(p2)
    this.platforms = [p1, p2, p3]
    this.currentIdx = 0
    this.playerX = p1.x
    this.playerY = p1.y - this.PLATFORM_HEIGHT / 2 - this.PLAYER_RADIUS
    this.cameraX = p1.x
    this.cameraY = p1.y

    this.spawnPowerUp(p2.x, p2.y)
  }

  private ensurePlatforms() {
    while (this.platforms.length - (this.currentIdx + 1) < 2) {
      const last = this.platforms[this.platforms.length - 1]
      const newPlatform = this.generateNextPlatform(last)
      this.platforms.push(newPlatform)

      if (Math.random() < 0.3) {
        this.spawnPowerUp(newPlatform.x, newPlatform.y)
      }
    }
    // 清理旧平台
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
    this.displayScore = 0
    this.combo = 0
    this.maxCombo = 0
    this.currentIdx = 0
    this.totalJumps = 0
    this.perfectCount = 0
    this.goodCount = 0
    this.platforms = []
    this.particles = []
    this.floatingTexts = []
    this.currentChargeRatio = 0
    this.isCharging = false
    this.chargeReleaseBuffered = false
    this.squashAmount = 0
    this.activePowerUp = null
    this.powerUpTimer = 0
    this.powerUps = []
    this.doubleScoreActive = false
    this.shieldActive = false
    this.slowMoActive = false
    this.screenShake = 0
    this.playerTrail = []
    this.lastJudge = null
    this.judgeFlashTimer = 0
    this.initPlatforms()
    this.onScoreUpdate(0)
  }

  // =============================================
  // 【2. 输入与手感优化】
  // =============================================

  private kdHandler: ((e: KeyboardEvent) => void) | null = null
  private kuHandler: ((e: KeyboardEvent) => void) | null = null
  private tsHandler: ((e: TouchEvent) => void) | null = null
  private teHandler: ((e: TouchEvent) => void) | null = null
  private mdHandler: ((e: MouseEvent) => void) | null = null
  private muHandler: ((e: MouseEvent) => void) | null = null

  private setupInput() {
    // 使用window级别键盘事件，确保空格键始终生效
    this.kdHandler = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault()
        this.handlePress()
      }
      if ((e.key === 'r' || e.key === 'R') && this.state === 'gameover') {
        this.resetGame()
      }
    }

    this.kuHandler = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault()
        this.handleRelease()
      }
    }

    this.tsHandler = (e: TouchEvent) => {
      e.preventDefault()
      this.handlePress()
    }

    this.teHandler = (e: TouchEvent) => {
      e.preventDefault()
      this.handleRelease()
    }

    this.mdHandler = (e: MouseEvent) => {
      e.preventDefault()
      this.handlePress()
    }

    this.muHandler = (e: MouseEvent) => {
      e.preventDefault()
      this.handleRelease()
    }

    window.addEventListener('keydown', this.kdHandler)
    window.addEventListener('keyup', this.kuHandler)
    this.canvas.addEventListener('touchstart', this.tsHandler, { passive: false })
    this.canvas.addEventListener('touchend', this.teHandler, { passive: false })
    this.canvas.addEventListener('mousedown', this.mdHandler)
    this.canvas.addEventListener('mouseup', this.muHandler)
  }

  /**
   * 统一按压处理
   * - 触屏/鼠标/键盘统一入口
   * - Title状态 → 进入蓄力
   * - Charging状态 → 开始蓄力
   */
  private handlePress() {
    if (this.state === 'title') {
      this.state = 'charging'
      this.initPlatforms()
      this.playerX = this.platforms[0].x
      this.playerY = this.platforms[0].y - this.PLATFORM_HEIGHT / 2 - this.PLAYER_RADIUS
      this.cameraX = this.playerX
      this.cameraY = this.playerY
      this.isCharging = true
      this.chargeStartTime = Date.now()
      this.currentChargeRatio = 0
      playSound('click')
    } else if (this.state === 'charging') {
      if (!this.isCharging) {
        this.isCharging = true
        this.chargeStartTime = Date.now()
        this.currentChargeRatio = 0
      }
    }
  }

  /**
   * 统一释放处理
   * - 零延迟触发跳跃
   * - 提前释放缓冲：如果还没开始蓄力但有释放事件，忽略
   * - 最低蓄力时间保护（60ms以下忽略）
   */
  private handleRelease() {
    if (this.state !== 'charging' || !this.isCharging) {
      return
    }

    const chargeDuration = Date.now() - this.chargeStartTime

    // 最低蓄力保护
    if (chargeDuration < this.MIN_CHARGE_MS) {
      this.isCharging = false
      this.currentChargeRatio = 0
      return
    }

    // 计算最终蓄力比例（含非线性曲线）
    const rawRatio = Math.min(1, chargeDuration / this.MAX_CHARGE_MS)
    this.currentChargeRatio = rawRatio

    // 立即起跳（零延迟）
    this.isCharging = false
    this.launchJump()
  }

  // =============================================
  // 道具系统
  // =============================================

  private checkPowerUpPickup(landX: number, platformY: number) {
    for (const pu of this.powerUps) {
      if (!pu.active) continue

      const dx = Math.abs(pu.x - landX)
      const dy = Math.abs(pu.y - platformY + 30)

      if (dx < 30 && dy < 40) {
        pu.active = false
        this.activatePowerUp(pu.type)
        this.spawnParticles(pu.x, pu.y, this.getPowerUpColor(pu.type), 12)
        playSound('powerup')
      }
    }
  }

  private activatePowerUp(type: PowerUpType) {
    this.activePowerUp = type
    this.powerUpTimer = 600

    const labels: Record<PowerUpType, string> = {
      spring: 'SPRING!',
      shield: 'SHIELD!',
      double: '2X SCORE!',
      magnet: 'MAGNET!',
      slowmo: 'SLOW-MO!',
    }

    switch (type) {
      case 'shield':
        this.shieldActive = true
        break
      case 'double':
        this.doubleScoreActive = true
        break
      case 'slowmo':
        this.slowMoActive = true
        break
    }

    this.addFloatingText(this.playerX, this.playerY - 40, labels[type], '', this.getPowerUpColor(type), 18)
  }

  private getPowerUpColor(type: PowerUpType): string {
    const colors: Record<PowerUpType, string> = {
      spring: '#ff6600',
      shield: '#00f0ff',
      double: '#ffe600',
      magnet: '#b026ff',
      slowmo: '#39ff14',
    }
    return colors[type]
  }

  // =============================================
  // 粒子与浮动文字
  // =============================================

  private spawnParticles(x: number, y: number, color: string, count: number = 8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 2 + Math.random() * 3
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        color,
        size: 2 + Math.random() * 3,
        life: 25 + Math.random() * 20,
        maxLife: 45,
      })
    }
  }

  private addFloatingText(x: number, y: number, text: string, subtext: string, color: string, size: number) {
    this.floatingTexts.push({
      x, y, text, subtext, color, size,
      life: 1.0, maxLife: 1.0, vy: -1.5,
    })
  }

  // =============================================
  // 游戏循环
  // =============================================

  start() {
    this.running = true
    if (this.platforms.length === 0) {
      this.initPlatforms()
    }
    // 不在这里预置charging状态，让玩家通过输入触发
    this.lastFrameTime = performance.now()
    this.loop()
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.animId)
  }

  destroy() {
    this.stop()
    if (this.kdHandler) window.removeEventListener('keydown', this.kdHandler)
    if (this.kuHandler) window.removeEventListener('keyup', this.kuHandler)
    if (this.tsHandler) this.canvas.removeEventListener('touchstart', this.tsHandler)
    if (this.teHandler) this.canvas.removeEventListener('touchend', this.teHandler)
    if (this.mdHandler) this.canvas.removeEventListener('mousedown', this.mdHandler)
    if (this.muHandler) this.canvas.removeEventListener('mouseup', this.muHandler)
  }

  private loop = () => {
    if (!this.running) return
    const now = performance.now()
    const dt = Math.min(now - this.lastFrameTime, 50)  // 最大50ms防跳帧
    this.lastFrameTime = now
    this.update(dt)
    this.render()
    this.animId = requestAnimationFrame(this.loop)
  }

  private update(dt: number) {
    // ===== 蓄力更新 =====
    if (this.state === 'charging' && this.isCharging) {
      const elapsed = Date.now() - this.chargeStartTime
      this.currentChargeRatio = Math.min(1, elapsed / this.MAX_CHARGE_MS)

      // 压缩动画：蓄力越多压缩越大
      const power = this.chargeCurve(this.currentChargeRatio)
      this.squashAmount = power * 0.35
    }

    // ===== 跳跃物理更新 =====
    if (this.state === 'jumping') {
      this.updateJumpPhysics(dt)
    }

    // ===== 压缩动画恢复 =====
    if (this.squashAmount !== 0 && this.state !== 'charging') {
      this.squashAmount *= 0.85
      if (Math.abs(this.squashAmount) < 0.01) this.squashAmount = 0
    }

    // ===== 分数动态增长 =====
    if (this.displayScore < this.score) {
      const diff = this.score - this.displayScore
      this.displayScore += Math.max(1, Math.ceil(diff * 0.15))
      if (this.displayScore > this.score) this.displayScore = this.score
    }

    // ===== 特殊平台更新 =====
    const time = performance.now() / 1000
    for (let i = 0; i < this.platforms.length; i++) {
      const p = this.platforms[i]

      if (p.type === 'moving' && p.movingData) {
        p.x = p.movingData.baseX + Math.sin(time * p.movingData.moveSpeed * 10 + p.movingData.phase) * p.movingData.moveRange
      }

      if (p.type === 'vanishing' && i === this.currentIdx) {
        p.vanishTimer = (p.vanishTimer || 0) + 1
        if (p.vanishTimer > 60) {
          p.width = Math.max(0, p.width - 2)
        }
      }

      if (p.type === 'shrinking' && p.originalWidth) {
        if (i <= this.currentIdx) {
          p.shrinkTimer = (p.shrinkTimer || 0) + 1
          if (p.shrinkTimer > 30) {
            p.width = Math.max(p.originalWidth * 0.4, p.width - 0.5)
          }
        }
      }
    }

    // ===== 道具计时器 =====
    if (this.powerUpTimer > 0) {
      this.powerUpTimer--
      if (this.powerUpTimer <= 0) {
        this.activePowerUp = null
        this.doubleScoreActive = false
        this.shieldActive = false
        this.slowMoActive = false
      }
    }

    // ===== 粒子更新 =====
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.12
      p.life--
      if (p.life <= 0) this.particles.splice(i, 1)
    }

    // ===== 拖尾更新 =====
    if (this.state === 'jumping') {
      this.playerTrail.push({ x: this.playerX, y: this.playerY, alpha: 1 })
      if (this.playerTrail.length > 12) this.playerTrail.shift()
    }
    for (let i = this.playerTrail.length - 1; i >= 0; i--) {
      this.playerTrail[i].alpha -= 0.08
      if (this.playerTrail[i].alpha <= 0) this.playerTrail.splice(i, 1)
    }

    // ===== 浮动文字更新 =====
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i]
      ft.y += ft.vy
      ft.life -= 0.025
      if (ft.life <= 0) this.floatingTexts.splice(i, 1)
    }

    // ===== 判定闪烁衰减 =====
    if (this.judgeFlashTimer > 0) {
      this.judgeFlashTimer -= 0.03
      if (this.judgeFlashTimer < 0) this.judgeFlashTimer = 0
    }

    // ===== 屏幕震动衰减 =====
    if (this.screenShake > 0) {
      this.screenShake *= this.screenShakeDecay
      if (this.screenShake < 0.3) this.screenShake = 0
    }

    // ===== 镜头更新 =====
    this.updateCamera()
  }

  // =============================================
  // 渲染系统
  // =============================================

  private render() {
    const ctx = this.ctx
    ctx.save()

    // 屏幕震动
    if (this.screenShake > 0.5) {
      ctx.translate(
        (Math.random() - 0.5) * this.screenShake,
        (Math.random() - 0.5) * this.screenShake
      )
    }

    // 背景渐变
    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.H)
    bgGrad.addColorStop(0, '#1a1a3e')
    bgGrad.addColorStop(0.5, '#0f0f2a')
    bgGrad.addColorStop(1, '#0a0a1e')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, this.W, this.H)

    // 静态网格装饰
    ctx.strokeStyle = '#ffffff10'
    ctx.lineWidth = 0.5
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

    // ===== 镜头变换 =====
    const offsetX = this.W / 2 - this.cameraX * this.cameraZoom
    const offsetY = this.H / 2 - this.cameraY * this.cameraZoom + 40
    ctx.translate(offsetX, offsetY)
    ctx.scale(this.cameraZoom, this.cameraZoom)

    // ===== 绘制平台 =====
    this.renderPlatforms(ctx)

    // ===== 绘制道具 =====
    this.renderPowerUps(ctx)

    // ===== 绘制拖尾 =====
    this.renderTrail(ctx)

    // ===== 绘制玩家 =====
    this.renderPlayer(ctx)

    // ===== 绘制粒子 =====
    this.renderParticles(ctx)

    // ===== 绘制浮动文字 =====
    this.renderFloatingTexts(ctx)

    // 恢复镜头变换
    ctx.restore()

    // ===== HUD (屏幕坐标系) =====
    this.renderHUD(ctx)

    // ===== 判定闪烁 =====
    if (this.judgeFlashTimer > 0 && this.lastJudge) {
      const color = JUDGE_COLORS[this.lastJudge]
      ctx.fillStyle = color
      ctx.globalAlpha = this.judgeFlashTimer * 0.15
      ctx.fillRect(0, 0, this.W, this.H)
      ctx.globalAlpha = 1
    }

    // ===== 标题画面 =====
    if (this.state === 'title') {
      this.renderTitle(ctx)
    }

    // ===== 游戏结束 =====
    if (this.state === 'gameover') {
      this.renderGameOver(ctx)
    }
  }

  private renderPlatforms(ctx: CanvasRenderingContext2D) {
    for (let i = 0; i < this.platforms.length; i++) {
      const p = this.platforms[i]
      const leftX = p.x - p.width / 2
      const topY = p.y - this.PLATFORM_HEIGHT / 2

      // 平台阴影
      ctx.shadowColor = 'rgba(0,0,0,0.4)'
      ctx.shadowBlur = 10

      // 平台颜色
      let platformColor = '#f5bc70'
      let highlightColor = '#ffe2a4'
      let edgeColor = '#c97e3a'

      if (p.type === 'moving') {
        platformColor = '#00f0ff'
        highlightColor = '#88f8ff'
        edgeColor = '#00a0b0'
      } else if (p.type === 'shrinking') {
        platformColor = '#ff6600'
        highlightColor = '#ffaa66'
        edgeColor = '#cc4400'
      } else if (p.type === 'vanishing') {
        const alpha = p.vanishTimer ? Math.max(0.3, 1 - p.vanishTimer / 60) : 1
        ctx.globalAlpha = alpha
        platformColor = '#b026ff'
        highlightColor = '#d088ff'
        edgeColor = '#8020cc'
      } else if (p.type === 'spring') {
        platformColor = '#ff2d95'
        highlightColor = '#ff88bb'
        edgeColor = '#cc0066'
      }

      // 主体
      ctx.fillStyle = platformColor
      ctx.beginPath()
      this.roundRect(ctx, leftX, topY, p.width, this.PLATFORM_HEIGHT, 8)
      ctx.fill()

      // 顶部高光
      ctx.shadowBlur = 0
      ctx.fillStyle = highlightColor
      ctx.beginPath()
      this.roundRect(ctx, leftX + 2, topY - 1, p.width - 4, 4, 3)
      ctx.fill()

      // 底部边缘
      ctx.fillStyle = edgeColor
      ctx.beginPath()
      this.roundRect(ctx, leftX, topY + this.PLATFORM_HEIGHT - 3, p.width, 3, 2)
      ctx.fill()

      // 特殊平台标记
      if (p.type === 'moving') {
        ctx.fillStyle = '#ffffff'
        ctx.font = '10px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('\u2194', p.x, topY + 13)
      } else if (p.type === 'shrinking') {
        ctx.fillStyle = '#ffffff'
        ctx.font = '10px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('\u26A0', p.x, topY + 13)
      } else if (p.type === 'vanishing') {
        if (Math.floor(Date.now() / 200) % 2 === 0) {
          ctx.fillStyle = '#ffffff80'
          ctx.font = '10px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText('\u2726', p.x, topY + 13)
        }
      } else if (p.type === 'spring') {
        ctx.fillStyle = '#ffffff'
        ctx.font = '10px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('\u2191', p.x, topY + 13)
      }

      ctx.globalAlpha = 1

      // 当前平台高亮（绿色）
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

      // 目标平台高亮（黄色）
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
  }

  private renderPowerUps(ctx: CanvasRenderingContext2D) {
    const time = performance.now() / 1000
    for (const pu of this.powerUps) {
      if (!pu.active) continue

      const bobY = pu.y + Math.sin(time * 3 + pu.bobOffset) * 5

      ctx.shadowColor = this.getPowerUpColor(pu.type)
      ctx.shadowBlur = 12

      ctx.fillStyle = this.getPowerUpColor(pu.type)
      ctx.beginPath()
      ctx.arc(pu.x, bobY, 10, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 12px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const icons: Record<PowerUpType, string> = {
        spring: '\u2B06',
        shield: '\u25C7',
        double: '2x',
        magnet: '\u2295',
        slowmo: '\u25F7',
      }
      ctx.fillText(icons[pu.type], pu.x, bobY)

      ctx.shadowBlur = 0
      ctx.textBaseline = 'alphabetic'
    }
  }

  private renderTrail(ctx: CanvasRenderingContext2D) {
    for (const trail of this.playerTrail) {
      ctx.globalAlpha = trail.alpha * 0.3
      ctx.fillStyle = this.activePowerUp ? this.getPowerUpColor(this.activePowerUp) : '#f3b33d'
      ctx.beginPath()
      ctx.arc(trail.x, trail.y, this.PLAYER_RADIUS * 0.8, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  private renderPlayer(ctx: CanvasRenderingContext2D) {
    ctx.save()

    // 压缩/拉伸动画
    const scaleX = 1 - this.squashAmount * 0.3
    const scaleY = 1 + this.squashAmount * 0.3
    ctx.translate(this.playerX, this.playerY)
    ctx.scale(scaleX, scaleY)

    // 玩家颜色
    let playerColor1 = '#fff9e0'
    let playerColor2 = '#f3b33d'
    let glowColor = '#2c2e3e'

    if (this.shieldActive) {
      playerColor1 = '#88f8ff'; playerColor2 = '#00f0ff'; glowColor = '#00f0ff'
    } else if (this.doubleScoreActive) {
      playerColor1 = '#fff888'; playerColor2 = '#ffe600'; glowColor = '#ffe600'
    } else if (this.slowMoActive) {
      playerColor1 = '#88ff88'; playerColor2 = '#39ff14'; glowColor = '#39ff14'
    }

    // 霓虹发光
    ctx.shadowColor = glowColor
    ctx.shadowBlur = this.activePowerUp ? 20 : 12

    const playerGrad = ctx.createRadialGradient(-3, -3, 3, 0, 0, this.PLAYER_RADIUS + 2)
    playerGrad.addColorStop(0, playerColor1)
    playerGrad.addColorStop(1, playerColor2)
    ctx.fillStyle = playerGrad
    ctx.beginPath()
    ctx.arc(0, 0, this.PLAYER_RADIUS, 0, Math.PI * 2)
    ctx.fill()

    // 护盾光环
    if (this.shieldActive) {
      ctx.strokeStyle = `rgba(0, 240, 255, ${0.5 + Math.sin(Date.now() / 200) * 0.3})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, 0, this.PLAYER_RADIUS + 6, 0, Math.PI * 2)
      ctx.stroke()
    }

    // 眼睛
    ctx.shadowBlur = 0
    ctx.fillStyle = '#2d1b0c'
    ctx.beginPath()
    ctx.arc(-3, -3, 2.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'white'
    ctx.beginPath()
    ctx.arc(-4, -4, 1, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ff8866'
    ctx.beginPath()
    ctx.arc(2, -1, 1.8, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()

    // ===== 蓄力指示器 =====
    if (this.state === 'charging' && this.currentChargeRatio > 0) {
      const barWidth = 60
      const barHeight = 6
      const barX = this.playerX - barWidth / 2
      const barY = this.playerY - this.PLAYER_RADIUS - 22

      // 背景
      ctx.fillStyle = '#2c2f36cc'
      ctx.beginPath()
      this.roundRect(ctx, barX, barY, barWidth, barHeight, 3)
      ctx.fill()

      // 填充（颜色随蓄力变化）
      const power = this.chargeCurve(this.currentChargeRatio)
      const fillWidth = barWidth * power
      const fillGrad = ctx.createLinearGradient(barX, barY, barX + fillWidth, barY)
      if (power < 0.5) {
        fillGrad.addColorStop(0, '#3ce0b0')
        fillGrad.addColorStop(1, '#8effc2')
      } else if (power < 0.8) {
        fillGrad.addColorStop(0, '#ffe600')
        fillGrad.addColorStop(1, '#ffaa00')
      } else {
        fillGrad.addColorStop(0, '#ff6600')
        fillGrad.addColorStop(1, '#ff2d95')
      }
      ctx.fillStyle = fillGrad
      ctx.beginPath()
      this.roundRect(ctx, barX, barY, fillWidth, barHeight, 3)
      ctx.fill()

      // 发光
      ctx.shadowColor = power >= 0.8 ? '#ff2d95' : '#88ffcc'
      ctx.shadowBlur = 4
      ctx.fillRect(barX + fillWidth - 2, barY, 2, barHeight)
      ctx.shadowBlur = 0

      // 蓄力百分比
      ctx.fillStyle = power >= 0.8 ? '#ff2d95' : '#39ff14'
      ctx.font = '8px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(`${Math.round(power * 100)}%`, this.playerX, barY - 4)
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.min(1, p.life / (p.maxLife * 0.4))
      ctx.fillStyle = p.color
      ctx.shadowColor = p.color
      ctx.shadowBlur = 4
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    ctx.shadowBlur = 0
  }

  private renderFloatingTexts(ctx: CanvasRenderingContext2D) {
    for (const ft of this.floatingTexts) {
      const alpha = Math.min(1, ft.life / ft.maxLife * 1.5)
      const scale = 1 + (1 - ft.life / ft.maxLife) * 0.3

      ctx.save()
      ctx.globalAlpha = alpha
      ctx.fillStyle = ft.color
      ctx.shadowColor = ft.color
      ctx.shadowBlur = 8
      ctx.font = `bold ${ft.size * scale}px "Press Start 2P", monospace`
      ctx.textAlign = 'center'
      ctx.fillText(ft.text, ft.x, ft.y)

      // 副标题（分数）
      if (ft.subtext) {
        ctx.font = `bold ${ft.size * 0.6 * scale}px "Press Start 2P", monospace`
        ctx.fillText(ft.subtext, ft.x, ft.y + ft.size * 0.8)
      }

      ctx.restore()
    }
  }

  private renderHUD(ctx: CanvasRenderingContext2D) {
    ctx.textAlign = 'left'

    // 分数（动态增长）
    ctx.fillStyle = '#39ff14'
    ctx.shadowColor = '#39ff14'
    ctx.shadowBlur = 6
    ctx.font = '10px "Press Start 2P", monospace'
    ctx.fillText(`SCORE: ${this.displayScore}`, 8, 16)
    ctx.shadowBlur = 0

    // 最高分
    ctx.fillStyle = '#ffe600'
    ctx.font = '9px "Press Start 2P", monospace'
    ctx.fillText(`BEST: ${this.bestScore}`, 8, 28)

    // Combo
    if (this.combo > 0) {
      ctx.fillStyle = this.combo >= 5 ? '#ff2d95' : '#fcb43a'
      ctx.shadowColor = ctx.fillStyle
      ctx.shadowBlur = this.combo >= 5 ? 8 : 0
      ctx.font = `${this.combo >= 5 ? '10' : '8'}px "Press Start 2P", monospace`
      ctx.fillText(`COMBO: x${this.combo}`, 8, 42)
      ctx.shadowBlur = 0
    }

    // 道具状态
    if (this.activePowerUp) {
      ctx.fillStyle = this.getPowerUpColor(this.activePowerUp)
      ctx.font = '7px "Press Start 2P", monospace'
      ctx.textAlign = 'right'
      ctx.fillText(this.activePowerUp.toUpperCase(), this.W - 8, 16)

      // 道具计时条
      const barW = 50
      const barH = 4
      const bx = this.W - 8 - barW
      const by = 22
      ctx.fillStyle = '#333'
      ctx.fillRect(bx, by, barW, barH)
      ctx.fillStyle = this.getPowerUpColor(this.activePowerUp)
      ctx.fillRect(bx, by, barW * (this.powerUpTimer / 600), barH)
    }

    ctx.textAlign = 'left'
  }

  private renderTitle(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(10, 10, 30, 0.9)'
    ctx.fillRect(0, 0, this.W, this.H)

    ctx.textAlign = 'center'

    // 标题
    ctx.fillStyle = '#f5bc70'
    ctx.shadowColor = '#f5bc70'
    ctx.shadowBlur = 20
    ctx.font = '20px "Press Start 2P", monospace'
    ctx.fillText('JUMP JUMP', this.W / 2, this.H / 2 - 60)
    ctx.shadowBlur = 0

    // 副标题
    ctx.fillStyle = '#39ff14'
    ctx.font = '8px "Press Start 2P", monospace'
    ctx.fillText('\u84C4\u529B\u8DF3\u8DC3 \u00B7 \u7CBE\u51C6\u843D\u5730', this.W / 2, this.H / 2 - 30)

    // 操作说明
    ctx.fillStyle = '#ffe600'
    ctx.font = '6px "Press Start 2P", monospace'
    ctx.fillText('\u6309\u4F4F\u7A7A\u683C\u84C4\u529B \u00B7 \u91CA\u653E\u8DF3\u8DC3', this.W / 2, this.H / 2 + 5)

    // 判定说明
    ctx.fillStyle = '#ffe600'
    ctx.fillText('PERFECT = \u4E2D\u5FC3\u843D\u5730', this.W / 2, this.H / 2 + 25)
    ctx.fillStyle = '#39ff14'
    ctx.fillText('GOOD = \u7A33\u5B9A\u843D\u5730', this.W / 2, this.H / 2 + 38)
    ctx.fillStyle = '#00f0ff'
    ctx.fillText('EDGE = \u8FB9\u7F18\u5BB9\u5DEE', this.W / 2, this.H / 2 + 51)

    // 开始提示
    ctx.fillStyle = '#4a4a6a'
    ctx.font = '6px "Press Start 2P", monospace'
    if (Math.sin(Date.now() / 300) > 0) {
      ctx.fillText('TAP OR PRESS SPACE', this.W / 2, this.H / 2 + 78)
    }
  }

  private renderGameOver(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(10, 10, 30, 0.88)'
    ctx.fillRect(0, 0, this.W, this.H)

    ctx.textAlign = 'center'

    // 标题
    ctx.fillStyle = '#ff2d95'
    ctx.shadowColor = '#ff2d95'
    ctx.shadowBlur = 15
    ctx.font = '16px "Press Start 2P", monospace'
    ctx.fillText('GAME OVER', this.W / 2, 60)
    ctx.shadowBlur = 0

    // 评分
    const rank = this.getRank()
    ctx.fillStyle = rank.color
    ctx.shadowColor = rank.color
    ctx.shadowBlur = 25
    ctx.font = `bold 32px "Press Start 2P", monospace`
    ctx.fillText(rank.rank, this.W / 2, 105)
    ctx.shadowBlur = 0

    ctx.fillStyle = '#aaa'
    ctx.font = '7px "Press Start 2P", monospace'
    ctx.fillText(rank.description, this.W / 2, 125)

    // 统计面板
    const statsY = 150
    ctx.fillStyle = '#fff'
    ctx.font = '7px "Press Start 2P", monospace'
    ctx.fillText('STATISTICS', this.W / 2, statsY)

    const statLines = [
      { label: 'SCORE', value: this.score.toString(), color: '#39ff14' },
      { label: 'MAX COMBO', value: `x${this.maxCombo}`, color: '#ffe600' },
      { label: 'PERFECT', value: this.perfectCount.toString(), color: '#ffe600' },
      { label: 'GOOD', value: this.goodCount.toString(), color: '#39ff14' },
      { label: 'JUMPS', value: this.totalJumps.toString(), color: '#00f0ff' },
    ]

    statLines.forEach((line, i) => {
      const y = statsY + 20 + i * 18
      ctx.fillStyle = '#888'
      ctx.font = '6px "Press Start 2P", monospace'
      ctx.fillText(line.label, this.W / 2 - 50, y)

      ctx.fillStyle = line.color
      ctx.font = 'bold 7px "Press Start 2P", monospace'
      ctx.fillText(line.value, this.W / 2 + 50, y)
    })

    // 最高分
    const hsY = statsY + 20 + statLines.length * 18 + 10
    if (this.score >= this.bestScore && this.score > 0) {
      ctx.fillStyle = '#ffe600'
      ctx.shadowColor = '#ffe600'
      ctx.shadowBlur = 10
      ctx.font = 'bold 9px "Press Start 2P", monospace'
      ctx.fillText('NEW RECORD!', this.W / 2, hsY)
      ctx.shadowBlur = 0
    } else {
      ctx.fillStyle = '#ffe600'
      ctx.font = '8px "Press Start 2P", monospace'
      ctx.fillText(`BEST: ${this.bestScore}`, this.W / 2, hsY)
    }

    // 重试
    ctx.fillStyle = '#4a4a6a'
    ctx.font = '7px "Press Start 2P", monospace'
    if (Math.sin(Date.now() / 300) > 0) {
      ctx.fillText('R TO RETRY', this.W / 2, this.H - 30)
    }
  }

  private getRank(): { rank: string; color: string; description: string } {
    const score = this.score
    const combo = this.maxCombo
    const perfects = this.perfectCount

    if (score >= 1000 || combo >= 10 || perfects >= 8) {
      return { rank: 'S', color: '#ffd700', description: '\u4F20\u5947\u8DF3\u8DC3\u8005' }
    }
    if (score >= 500 || combo >= 7 || perfects >= 5) {
      return { rank: 'A', color: '#ff2d95', description: '\u9876\u7EA7\u73A9\u5BB6' }
    }
    if (score >= 200 || combo >= 4 || perfects >= 3) {
      return { rank: 'B', color: '#00f0ff', description: '\u719F\u7EC3\u73A9\u5BB6' }
    }
    if (score >= 80) {
      return { rank: 'C', color: '#39ff14', description: '\u65B0\u624B\u73A9\u5BB6' }
    }
    return { rank: 'D', color: '#888', description: '\u7EE7\u7EED\u52A0\u6CB9' }
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
