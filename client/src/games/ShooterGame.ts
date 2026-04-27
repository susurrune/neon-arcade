// ============================================
// SHOOTER GAME v6 — 飞机大战 (Game Feel Edition)
// Delta Time + Screen Shake + ZzFX + Hit Stop + Easing
// ============================================

import { t, getGameFont, getLang } from '../i18n'

// ============================================================
// ZzFX Micro - Tiny sound effect generator (Frank Force, MIT)
// ============================================================
let zzfxV = 0.25
let zzfxX: AudioContext | null = null

function initZzFX() {
  if (!zzfxX) {
    zzfxX = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return zzfxX
}

function zzfx(
  p = 1, k_ = 0.05, b = 220, e = 0, r = 0, t = 0.1, q = 0, D = 1,
  u = 0, y = 0, v = 0, z = 0, l = 0, E = 0, A = 0, F = 0, c = 0,
  w = 1, m = 0, B = 0, N = 0
): OscillatorNode | null {
  const ctx = initZzFX()
  if (ctx.state === 'suspended') ctx.resume()

  // 简化版：生成基础正弦波音效
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.frequency.setValueAtTime(b, ctx.currentTime)
  oscillator.frequency.exponentialRampToValueAtTime(b + u, ctx.currentTime + t)

  gainNode.gain.setValueAtTime(p * zzfxV, ctx.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + r)

  // 波形类型
  oscillator.type = q === 4 ? 'sawtooth' : q === 3 ? 'square' : q === 2 ? 'triangle' : 'sine'

  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + t + r + 0.1)

  return oscillator
}

// ============================================================
// Sound Effects Presets
// ============================================================
const SFX = {
  shoot: () => zzfx(...[0.6, , 350, .01, .03, .05, 3, 1.5, -80]),  // 短促嗖嗖的子弹声
  hit: () => zzfx(...[2, , 300, .02, .1, .3, 4, 1.5, -3, , , , 1.5]),
  explosion: () => zzfx(...[2.5, , 200, .05, .3, .5, 4, 1.5, -3, , , , 1.5]),
  bigExplosion: () => zzfx(...[3, , 80, .1, .5, .8, 4, 2, -3, , , , 3, , .5]),
  pickup: () => zzfx(...[1.5, , 800, .01, .05, .15, , 1.5, , , 400, .05]),
  powerup: () => zzfx(...[1.8, , 261, .05, .3, .5, , 1.5, , , 300, .05, .1, , , .1, , .7, .1]),
  damage: () => zzfx(...[2, , 150, .02, .1, .2, 3, 2, , , , , 3]),
  death: () => zzfx(...[2, , 200, .05, .3, .5, 4, 1.5, -3, , , , 1.5]),
  bossWarn: () => zzfx(...[1.5, , 200, .05, .2, .3, 1, 2, , , , , , , .5]),
  waveClear: () => zzfx(...[1.5, , 500, .05, .3, .5, , 1.3, , , 200, .05, .05, , , .1, , .7]),
  perfect: () => zzfx(...[1.8, , 600, .05, .4, .6, , 1.5, , , 300, .05, .1, , , .1, , .6]),
  combo: () => zzfx(...[1.5, , 1200, .01, .05, .15, , 2, , , 1000, .05, .05]),
  skill: () => zzfx(...[2.5, , 150, .08, .4, .5, 4, 2, -5, , , , 2]),
}

// ============================================================
// Easing Functions
// ============================================================
const ease = {
  outQuad: (t: number) => 1 - (1 - t) ** 2,
  outCubic: (t: number) => 1 - (1 - t) ** 3,
  outBack: (t: number) => {
    const c1 = 1.70158, c3 = c1 + 1
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2
  },
  outElastic: (t: number) => {
    const c4 = (2 * Math.PI) / 3
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
  },
  inQuad: (t: number) => t * t,
}

// 颜色辅助函数
function shadeColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.max(0, Math.min(255, (num >> 16) + amt))
  const G = Math.max(0, Math.min(255, (num >> 8 & 0x00FF) + amt))
  const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt))
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 255, 255'
}

export class ShooterGame {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private W: number = 640
  private H: number = 800
  private dpr: number = 1
  private animId = 0
  private running = false
  private state: 'title' | 'playing' | 'gameover' = 'title'

  // ====== Delta Time System ======
  private lastTime = 0
  private dt = 0

  // ====== Screen Shake ======
  private shake = { x: 0, y: 0, intensity: 0, duration: 0, decay: 0.4 }

  // ====== Hit Stop ======
  private hitStopTimer = 0

  // ====== Wave System ======
  private wave = 0
  private waveEnemiesLeft = 0
  private waveSpawnedCount = 0
  private waveTotalEnemies = 0
  private waveSpawnTimer = 0
  private waveSpawnInterval = 0.5  // seconds
  private waveCooldown = 0
  // ====== 关卡系统 ======
  private level = 1          // 当前关卡 (1-10)
  private maxLevel = 10      // 最高关卡
  private levelWaves = 0     // 当前关卡内的波次计数
  private levelBossDefeated = false  // 当前关卡Boss是否已击败

  // ====== 飞机进化系统 ======
  private evolveLevel = 1    // 进化等级 (1-4)，每次进化子弹上限+5
  private maxBulletLevel = 5 // 子弹等级上限，进化后提升
  private evolveExp = 0      // 进化经验值
  private evolveMaxExp = 500 // 升级所需经验

  // ====== 关卡Boss配置 ======
  private levelBossConfig: { name: string; color: string; hp: number; size: number; pattern: number }[] = [
    { name: 'Scout Drone', color: '#22D3EE', hp: 30, size: 40, pattern: 1 },     // Level 1
    { name: 'Battle Cruiser', color: '#39ff14', hp: 60, size: 45, pattern: 2 },  // Level 2
    { name: 'War Machine', color: '#ffe600', hp: 100, size: 50, pattern: 2 },    // Level 3
    { name: 'Doom Bringer', color: '#FF2E88', hp: 150, size: 55, pattern: 3 },   // Level 4
    { name: 'Void Lord', color: '#7C3AED', hp: 200, size: 60, pattern: 3 },      // Level 5
    { name: 'Nova Star', color: '#ff6600', hp: 280, size: 65, pattern: 4 },      // Level 6
    { name: 'Quantum Core', color: '#00ff88', hp: 380, size: 70, pattern: 4 },   // Level 7
    { name: 'Omega Destroyer', color: '#ff0066', hp: 500, size: 75, pattern: 5 },// Level 8
    { name: 'Infinity Gate', color: '#8800ff', hp: 650, size: 80, pattern: 5 },  // Level 9
    { name: 'FINAL: Genesis', color: '#ffffff', hp: 1000, size: 90, pattern: 6 },// Level 10 最终Boss
  ]

  private waveBoss = false
  private waveEnemiesKilled = 0
  private waveDamageTaken = false

  // Player
  private px = 0; private py = 0
  private pw = 30; private ph = 30
  private speed = 280  // px/秒 (was frame-based 5)
  private lives = 3
  private maxLives = 5
  private invincible = 0
  private autoFire = true
  private fireTimer = 0
  private fireRate = 0.15  // seconds (was frame-based 10)

  // ====== 子弹升级系统 (上限随进化提升) ======
  private bulletLevel = 1  // 当前等级 (1-maxBulletLevel)

  // ====== Permanent Damage Growth ======
  private baseDamage = 1
  private lastDamageMilestone = 0
  private totalBaseDamage = 1

  // Score + Combo
  private score = 0
  private displayScore = 0  // animated score display
  private scorePop = 0  // score scale animation
  private combo = 0
  private comboTimer = 0
  private comboWindow = 3  // seconds (was frame-based 180)
  private bestCombo = 0
  private comboMultiplier = 1

  // Floating Texts
  private floatingTexts: {
    text: string; x: number; y: number; vy: number;
    timer: number; maxTimer: number; color: string; size: number;
    scale: number; scaleTime: number
  }[] = []
  private killCount = 0
  private milestoneShown: Set<number> = new Set()

  // Skill System
  private skillEnergy = 0
  private skillMax = 100
  private skillReady = false

  // Enemies
  private enemies: any[] = []
  private difficulty = 1

  // Boss
  private boss: any = null
  private bossWarningTimer = 0
  private bossWarningActive = false

  // Bullets
  private playerBullets: any[] = []
  private enemyBullets: any[] = []

  // Pickups
  private pickups: any[] = []

  // Particles (improved)
  private particles: {
    x: number; y: number; vx: number; vy: number;
    life: number; maxLife: number; size: number;
    color: string; gravity: number; drag: number;
    shape: 'circle' | 'square'
  }[] = []
  private flashTimer = 0
  private comboDisplay = { text: '', timer: 0, x: 0, y: 0 }

  // Input
  private keys: Set<string> = new Set()
  private touchStart: { x: number; y: number } | null = null
  private touchCurrent: { x: number; y: number } | null = null

  // On score update callback
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
    const w = rect?.width || 640
    const h = Math.min(w * 1.25, window.innerHeight * 0.7)
    this.canvas.width = w * this.dpr
    this.canvas.height = h * this.dpr
    this.canvas.style.width = w + 'px'
    this.canvas.style.height = h + 'px'
    this.ctx.scale(this.dpr, this.dpr)
    this.W = w
    this.H = h
  }

  private kdHandler: ((e: KeyboardEvent) => void) | null = null
  private kuHandler: ((e: KeyboardEvent) => void) | null = null
  private tsHandler: ((e: TouchEvent) => void) | null = null
  private tmHandler: ((e: TouchEvent) => void) | null = null
  private teHandler: (() => void) | null = null
  private tapHandler: ((e: TouchEvent) => void) | null = null

  private setupInput() {
    // Initialize AudioContext on first interaction
    const initAudio = () => {
      initZzFX()
      if (zzfxX && zzfxX.state === 'suspended') zzfxX.resume()
    }

    this.kdHandler = (e: KeyboardEvent) => {
      initAudio()
      this.keys.add(e.key)
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault()
      if (this.state === 'title') {
        this.state = 'playing'
        SFX.waveClear()
        this.startFirstWave()
      }
      if (this.state === 'gameover' && (e.key === 'r' || e.key === 'R')) {
        this.state = 'playing'
        this.resetGame()
      }
      if (e.key === ' ' && this.state === 'playing' && this.skillReady) this.useSkill()
    }
    this.kuHandler = (e: KeyboardEvent) => this.keys.delete(e.key)

    this.tsHandler = (e: TouchEvent) => {
      initAudio()
      e.preventDefault()
      const t = e.touches[0]
      const rect = this.canvas.getBoundingClientRect()
      this.touchStart = { x: t.clientX - rect.left, y: t.clientY - rect.top }
      this.touchCurrent = { ...this.touchStart }
      if (this.state === 'title') {
        this.state = 'playing'
        SFX.waveClear()
        this.startFirstWave()
      }
      if (this.state === 'gameover') {
        this.state = 'playing'
        this.resetGame()
      }
    }
    this.tmHandler = (e: TouchEvent) => {
      e.preventDefault()
      const t = e.touches[0]
      const rect = this.canvas.getBoundingClientRect()
      this.touchCurrent = { x: t.clientX - rect.left, y: t.clientY - rect.top }
    }
    this.teHandler = () => { this.touchStart = null; this.touchCurrent = null }

    let lastTap = 0
    this.tapHandler = (e: TouchEvent) => {
      initAudio()
      const now = Date.now()
      if (now - lastTap < 300 && this.skillReady && this.state === 'playing') {
        this.useSkill()
      }
      lastTap = now
    }

    this.canvas.addEventListener('keydown', this.kdHandler)
    this.canvas.addEventListener('keyup', this.kuHandler)
    this.canvas.addEventListener('touchstart', this.tsHandler, { passive: false })
    this.canvas.addEventListener('touchmove', this.tmHandler, { passive: false })
    this.canvas.addEventListener('touchend', this.teHandler)
    this.canvas.addEventListener('touchstart', this.tapHandler)
    this.canvas.setAttribute('tabindex', '0')
    this.canvas.focus()
  }

  private resetGame() {
    this.px = this.W / 2
    this.py = this.H - 80
    this.lives = 3
    this.score = 0
    this.displayScore = 0
    this.scorePop = 0
    this.combo = 0
    this.comboTimer = 0
    this.bestCombo = 0
    this.bulletLevel = 1
    this.baseDamage = 1
    this.lastDamageMilestone = 0
    this.totalBaseDamage = 1
    this.skillEnergy = 0
    this.skillReady = false
    this.enemies = []
    this.playerBullets = []
    this.enemyBullets = []
    this.pickups = []
    this.particles = []
    this.floatingTexts = []
    this.boss = null
    this.bossWarningTimer = 0
    this.bossWarningActive = false
    this.invincible = 0
    this.fireTimer = 0
    this.comboDisplay = { text: '', timer: 0, x: 0, y: 0 }
    this.killCount = 0
    this.milestoneShown.clear()
    this.wave = 0
    this.waveCooldown = 0
    this.waveEnemiesLeft = 0
    this.waveSpawnedCount = 0
    this.waveBoss = false
    this.waveEnemiesKilled = 0
    this.waveDamageTaken = false
    this.shake = { x: 0, y: 0, intensity: 0, duration: 0, decay: 0.4 }
    this.hitStopTimer = 0
    // 关卡系统重置
    this.level = 1
    this.levelWaves = 0
    this.levelBossDefeated = false
    // 进化系统重置
    this.evolveLevel = 1
    this.maxBulletLevel = 5
    this.evolveExp = 0
    SFX.waveClear()
    this.startFirstWave()
  }

  // ====== Screen Shake ======
  private addShake(intensity: number, duration = 0.2) {
    this.shake.intensity = Math.max(this.shake.intensity, intensity)
    this.shake.duration = Math.max(this.shake.duration, duration)
  }

  // ====== Hit Stop ======
  private hitStop(duration = 0.08) {
    this.hitStopTimer = duration
  }

  // ====== Wave System ======
  private startFirstWave() {
    this.startWave(1)
  }

  private startWave(waveNum: number) {
    this.wave = waveNum
    this.waveSpawnedCount = 0
    this.waveEnemiesKilled = 0
    this.waveDamageTaken = false
    this.levelWaves++

    // Boss波次：每关第5波出现Boss（给玩家4波成长时间）
    // 每关有5波，Boss在第5波
    this.waveBoss = (this.levelWaves >= 5) && !this.levelBossDefeated

    if (this.waveBoss) {
      this.waveTotalEnemies = Math.min(5 + this.level * 2, 25)
      this.waveSpawnInterval = Math.max(0.5, 0.9 - this.level * 0.05)
    } else {
      this.waveTotalEnemies = Math.min(4 + this.wave + this.level, 35)
      this.waveSpawnInterval = Math.max(0.35, 0.75 - this.wave * 0.03 - this.level * 0.02)
    }

    this.waveEnemiesLeft = this.waveTotalEnemies
    this.waveSpawnTimer = 0
    this.difficulty = 1 + (this.level - 1) * 0.15 + (this.wave - 1) * 0.05
    this.state = 'playing'
  }

  // ====== Skill ======
  private useSkill() {
    if (!this.skillReady) return
    this.skillEnergy = 0
    this.skillReady = false
    SFX.skill()

    this.flashTimer = 0.15
    this.addShake(20, 0.5)
    this.hitStop(0.15)

    for (const e of this.enemies) {
      this.score += e.score || 10
      this.spawnExplosion(e.x, e.y, e.size || 10, true)
    }
    this.enemyBullets = []
    if (this.boss) {
      this.boss.hp -= this.boss.maxHp * 0.25
      this.spawnExplosion(this.boss.x, this.boss.y, 30, true)
    }
    this.enemies = []
    this.onScoreUpdate(this.score)
    this.addFloatingText(t('shooter_bomb'), this.W / 2, this.H / 2, '#ffe600', 16)
  }

  start() {
    this.running = true
    this.px = this.W / 2
    this.py = this.H - 80
    this.lastTime = performance.now()
    this.loop(this.lastTime)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.animId)
  }

  destroy() {
    this.stop()
    if (this.kdHandler) this.canvas.removeEventListener('keydown', this.kdHandler)
    if (this.kuHandler) this.canvas.removeEventListener('keyup', this.kuHandler)
    if (this.tsHandler) this.canvas.removeEventListener('touchstart', this.tsHandler)
    if (this.tmHandler) this.canvas.removeEventListener('touchmove', this.tmHandler)
    if (this.teHandler) this.canvas.removeEventListener('touchend', this.teHandler)
    if (this.tapHandler) this.canvas.removeEventListener('touchstart', this.tapHandler)
  }

  private loop = (now: number) => {
    if (!this.running) return

    // ====== Delta Time Calculation ======
    this.dt = Math.min((now - this.lastTime) / 1000, 0.05)
    this.lastTime = now

    // ====== Hit Stop: pause updates, render continues ======
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= this.dt
      this.updateShake(0)  // no dt for shake during hitstop
      this.render(0)
      this.animId = requestAnimationFrame(this.loop)
      return
    }

    this.update(this.dt)
    this.render(this.dt)
    this.animId = requestAnimationFrame(this.loop)
  }

  // ========== UPDATE (Delta Time Based) ==========

  private update(dt: number) {
    if (this.state !== 'playing') return

    this.updateShake(dt)
    this.updateWaveSpawning(dt)
    this.updatePlayerMovement(dt)

    if (this.autoFire) {
      this.fireTimer += dt
      if (this.fireTimer >= this.fireRate) {
        this.fireTimer = 0
        this.firePlayerBullets()
        SFX.shoot()
      }
    }

    if (this.comboTimer > 0) {
      this.comboTimer -= dt
      if (this.comboTimer <= 0) {
        if (this.combo >= 5) {
          this.comboDisplay = { text: t('shooter_combo_break'), timer: 1.0, x: this.W / 2, y: this.H / 2 - 50 }
        }
        this.combo = 0
        this.comboMultiplier = 1
      }
    }

    if (this.invincible > 0) this.invincible -= dt

    this.updateBullets(dt)
    this.updateEnemies(dt)
    this.updatePickups(dt)
    this.updateParticles(dt)
    this.checkCollisions()
    this.updateFloatingTexts(dt)

    this.checkDamageGrowth()

    if (this.skillEnergy >= this.skillMax) {
      this.skillReady = true
    }

    if (this.comboDisplay.timer > 0) this.comboDisplay.timer -= dt
    if (this.flashTimer > 0) this.flashTimer -= dt

    // Animate score display
    this.displayScore += (this.score - this.displayScore) * dt * 8
    this.scorePop *= Math.exp(-dt * 10)
  }

  private updateShake(dt: number) {
    if (this.shake.duration > 0) {
      this.shake.duration -= dt
      const t = Math.max(0, this.shake.duration / this.shake.decay)
      this.shake.x = (Math.random() - 0.5) * this.shake.intensity * t * 2
      this.shake.y = (Math.random() - 0.5) * this.shake.intensity * t * 2
      if (this.shake.duration <= 0) {
        this.shake.x = this.shake.y = this.shake.intensity = 0
      }
    }
  }

  private checkDamageGrowth() {
    const milestone = Math.floor(this.score / 3000) * 3000
    if (milestone > this.lastDamageMilestone && this.lastDamageMilestone >= 0) {
      this.lastDamageMilestone = milestone
      this.baseDamage++
      this.totalBaseDamage = this.baseDamage
      SFX.powerup()
      this.addFloatingText(t('shooter_damage_up'), this.W / 2, this.H / 2 + 30, '#7C3AED', 12)
    }
  }

  private updatePlayerMovement(dt: number) {
    let dx = 0, dy = 0
    if (this.keys.has('ArrowLeft') || this.keys.has('a')) dx -= this.speed
    if (this.keys.has('ArrowRight') || this.keys.has('d')) dx += this.speed
    if (this.keys.has('ArrowUp') || this.keys.has('w')) dy -= this.speed
    if (this.keys.has('ArrowDown') || this.keys.has('s')) dy += this.speed

    if (this.touchStart && this.touchCurrent) {
      const tdx = this.touchCurrent.x - this.touchStart.x
      const tdy = this.touchCurrent.y - this.touchStart.y
      if (Math.abs(tdx) > 8) dx += Math.sign(tdx) * Math.min(Math.abs(tdx) * 0.5, this.speed)
      if (Math.abs(tdy) > 8) dy += Math.sign(tdy) * Math.min(Math.abs(tdy) * 0.5, this.speed)
    }

    this.px = Math.max(this.pw / 2, Math.min(this.W - this.pw / 2, this.px + dx * dt))
    this.py = Math.max(this.ph / 2, Math.min(this.H - this.ph / 2, this.py + dy * dt))
  }

  private updateWaveSpawning(dt: number) {
    if (this.waveCooldown > 0) {
      this.waveCooldown -= dt
      if (this.waveCooldown <= 0) {
        this.startWave(this.wave + 1)
      }
      return
    }

    if (this.waveSpawnedCount < this.waveTotalEnemies) {
      this.waveSpawnTimer += dt
      if (this.waveSpawnTimer >= this.waveSpawnInterval) {
        this.waveSpawnTimer = 0
        this.spawnEnemy()
        this.waveSpawnedCount++
      }
    }

    // Boss warning - 只有当waveBoss=true且Boss还没出现且还没被击败时触发
    if (this.waveBoss && !this.boss && !this.bossWarningActive && !this.levelBossDefeated
        && this.waveSpawnedCount >= this.waveTotalEnemies && this.enemies.length === 0) {
      this.bossWarningActive = true
      this.bossWarningTimer = 1.0
      SFX.bossWarn()
      this.addShake(8, 0.4)
    }

    // Boss生成倒计时
    if (this.bossWarningActive && this.bossWarningTimer > 0 && !this.boss) {
      this.bossWarningTimer -= dt
      if (this.bossWarningTimer <= 0) {
        this.spawnBoss()
      }
    }

    // 波次完成判定：普通波或Boss波(Boss被击败)
    // 确保Boss存在时不会错误地完成波次
    const bossWaveComplete = this.waveBoss ? (this.levelBossDefeated && !this.boss) : true
    if (this.waveSpawnedCount >= this.waveTotalEnemies && this.enemies.length === 0 && bossWaveComplete && !this.bossWarningActive) {
      this.onWaveComplete()
    }
  }

  private onWaveComplete() {
    // Boss波完成后进入下一关
    if (this.waveBoss && this.levelBossDefeated) {
      this.onNextLevel()
      return
    }

    const waveBonus = this.wave * 50 + this.level * 100
    this.score += waveBonus
    this.onScoreUpdate(this.score)
    SFX.waveClear()
    this.addShake(8, 0.25)

    const bonusText = this.levelWaves === 1 ?
      t('shooter_wave_clear', { n: this.wave, bonus: waveBonus }) :
      `${getLang() === 'zh' ? '关卡' : 'Level'} ${this.level} - ${getLang() === 'zh' ? '波次' : 'Wave'} ${this.levelWaves}`
    this.addFloatingText(bonusText, this.W / 2, this.H / 2 - 30, '#22D3EE', 12)

    if (!this.waveDamageTaken) {
      const perfectBonus = (this.wave + this.level) * 80
      this.score += perfectBonus
      this.onScoreUpdate(this.score)
      SFX.perfect()
      this.addShake(10, 0.3)
      this.addFloatingText(t('shooter_perfect', { bonus: perfectBonus }), this.W / 2, this.H / 2, '#39ff14', 14)
    }

    this.waveCooldown = Math.min(3, 1.5 + this.level * 0.2)
  }

  private onNextLevel() {
    if (this.level >= this.maxLevel) {
      // 游戏胜利！
      this.state = 'gameover'
      const victoryBonus = 5000
      this.score += victoryBonus
      this.onScoreUpdate(this.score)
      SFX.perfect()
      this.addFloatingText(getLang() === 'zh' ? '通关！全部关卡完成！' : 'VICTORY! All levels cleared!', this.W / 2, this.H / 2 - 50, '#ffe600', 18)
      try {
        const { useGameStore } = require('../store/gameStore')
        const store = useGameStore.getState()
        store.addCoins(Math.floor(this.score / 80))
      } catch {}
      return
    }

    this.level++
    this.levelWaves = 0
    this.levelBossDefeated = false

    const levelBonus = this.level * 300
    this.score += levelBonus
    this.onScoreUpdate(this.score)
    SFX.powerup()
    this.addShake(12, 0.4)

    const levelName = getLang() === 'zh' ?
      `进入第 ${this.level} 关` : `Entering Level ${this.level}`
    this.addFloatingText(levelName, this.W / 2, this.H / 2 - 40, '#7C3AED', 14)

    // 每进入新关，增加进化经验
    this.evolveExp += this.level * 50
    this.checkEvolve()

    this.waveCooldown = 2.5  // 关卡间休息更长
  }

  private checkEvolve() {
    if (this.evolveLevel >= 4) return  // 最高4次进化
    if (this.evolveExp >= this.evolveMaxExp) {
      this.evolveExp = 0
      this.evolveLevel++
      this.maxBulletLevel += 5  // 每次进化上限+5
      this.evolveMaxExp += 200  // 下次进化需要更多经验

      SFX.powerup()
      this.addShake(15, 0.5)
      this.hitStop(0.15)

      const evolveText = getLang() === 'zh' ?
        `飞机进化 Lv${this.evolveLevel}！子弹上限 ${this.maxBulletLevel}` :
        `Ship Evolved Lv${this.evolveLevel}! Max Bullet ${this.maxBulletLevel}`
      this.addFloatingText(evolveText, this.W / 2, this.H / 2, '#ffe600', 16)

      // 进化后恢复生命
      this.lives = Math.min(this.lives + 1, this.maxLives)
    }
  }

  // ====== Bullet System (动态等级系统) ======
  private firePlayerBullets() {
    const bspeed = -550 - this.bulletLevel * 5  // 速度随等级增加
    const cx = this.px
    const cy = this.py - this.ph / 2
    const baseDmg = this.totalBaseDamage + Math.floor(this.bulletLevel / 5)  // 伤害随等级增加

    // 子弹颜色随等级变化
    const getBulletColor = (lv: number) => {
      if (lv <= 5) return ['#22D3EE', '#39ff14', '#ffe600', '#FF2E88', '#7C3AED'][lv - 1]
      if (lv <= 10) return '#ff6600'
      if (lv <= 15) return '#00ff88'
      return '#ffffff'
    }
    const color = getBulletColor(this.bulletLevel)

    // 子弹大小随等级增加
    const bsize = 3 + Math.min(this.bulletLevel, 10) * 0.3

    // 动态生成子弹模式
    const lv = this.bulletLevel

    // 基础直射（所有等级都有）
    this.playerBullets.push({ x: cx, y: cy, vx: 0, vy: bspeed, size: bsize, dmg: baseDmg, color })

    // 等级2+: 双发
    if (lv >= 2) {
      const offset = 6 + lv * 0.5
      this.playerBullets.push({ x: cx - offset, y: cy, vx: 0, vy: bspeed, size: bsize, dmg: baseDmg, color })
      this.playerBullets.push({ x: cx + offset, y: cy, vx: 0, vy: bspeed, size: bsize, dmg: baseDmg, color })
    }

    // 等级5+: 扩散扇形
    if (lv >= 5) {
      const spreadCount = Math.min(3 + Math.floor(lv / 5), 7)
      for (let i = -Math.floor(spreadCount / 2); i <= Math.floor(spreadCount / 2); i++) {
        if (i === 0) continue  // 中间已有直射
        const angle = -Math.PI / 2 + i * (0.12 + lv * 0.01)
        this.playerBullets.push({
          x: cx + i * 4, y: cy,
          vx: Math.cos(angle) * (-bspeed), vy: Math.sin(angle) * (-bspeed),
          size: bsize * 0.8, dmg: baseDmg, color
        })
      }
    }

    // 等级10+: 侧翼追踪弹
    if (lv >= 10) {
      this.playerBullets.push({
        x: cx - 15, y: cy + 5,
        vx: -bspeed * 0.25, vy: bspeed * 0.85,
        size: 4, dmg: Math.max(1, baseDmg - 1), color: '#39ff14'
      })
      this.playerBullets.push({
        x: cx + 15, y: cy + 5,
        vx: bspeed * 0.25, vy: bspeed * 0.85,
        size: 4, dmg: Math.max(1, baseDmg - 1), color: '#39ff14'
      })
    }

    // 等级15+: 激光核心弹
    if (lv >= 15) {
      const laserColor = lv >= 18 ? '#ffffff' : '#7C3AED'
      this.playerBullets.push({
        x: cx, y: cy - 8,
        vx: 0, vy: bspeed * 1.4,
        size: 10 + lv * 0.3, dmg: baseDmg + 2, color: laserColor, isLaser: true
      })
    }

    // 等级20: 终极模式 - 双激光 + 更多散射
    if (lv >= 20) {
      // 双激光
      this.playerBullets.push({
        x: cx - 5, y: cy - 8,
        vx: 0, vy: bspeed * 1.3,
        size: 8, dmg: baseDmg + 1, color: '#ffffff', isLaser: true
      })
      this.playerBullets.push({
        x: cx + 5, y: cy - 8,
        vx: 0, vy: bspeed * 1.3,
        size: 8, dmg: baseDmg + 1, color: '#ffffff', isLaser: true
      })
      // 后方防护弹
      this.playerBullets.push({
        x: cx - 10, y: cy + 10,
        vx: -bspeed * 0.3, vy: bspeed * 0.5,
        size: 3, dmg: Math.max(1, baseDmg - 2), color: '#39ff14'
      })
      this.playerBullets.push({
        x: cx + 10, y: cy + 10,
        vx: bspeed * 0.3, vy: bspeed * 0.5,
        size: 3, dmg: Math.max(1, baseDmg - 2), color: '#39ff14'
      })
    }
  }

  private spawnEnemy() {
    const types: string[] = ['small', 'small', 'small']

    if (this.wave >= 2) types.push('shooter')
    if (this.wave >= 3) types.push('heavy', 'shooter')
    if (this.wave >= 4) types.push('kamikaze')
    if (this.wave >= 6) types.push('kamikaze', 'heavy')
    if (this.wave >= 8) types.push('shooter', 'kamikaze', 'heavy')

    // 新增敌人类型
    if (this.wave >= 10) types.push('stealth') // 隐身敌人
    if (this.wave >= 12) types.push('summoner') // 召唤型敌人
    if (this.wave >= 15) types.push('tank') // 坦克型敌人

    const type = types[Math.floor(Math.random() * types.length)]
    const x = 30 + Math.random() * (this.W - 60)
    let enemy: any

    const speedMult = 1 + (this.wave - 1) * 0.03

    switch (type) {
      case 'small':
        enemy = {
          x, y: -20,
          vx: (Math.random() - 0.5) * 80, vy: (80 + Math.random() * 40) * speedMult,  // px/秒
          hp: 1, maxHp: 1, size: 12, type, score: 10,
          color: '#22D3EE',
        }
        break
      case 'heavy':
        enemy = {
          x, y: -20,
          vx: (Math.random() - 0.5) * 20, vy: (40 + Math.random() * 20) * speedMult,
          hp: 3 + Math.floor(this.wave / 3), maxHp: 3 + Math.floor(this.wave / 3),
          size: 20, type, score: 30 + this.wave * 2,
          color: '#7C3AED', fireTimer: 0, fireRate: Math.max(0.7, 1.2 - this.wave * 0.04)
        }
        break
      case 'shooter':
        enemy = {
          x, y: -20,
          vx: (Math.random() - 0.5) * 50, vy: (50 + Math.random() * 25) * speedMult,
          hp: 2, maxHp: 2, size: 14, type, score: 20 + this.wave,
          color: '#FF2E88', fireTimer: 0, fireRate: Math.max(0.6, 1.0 - this.wave * 0.02)
        }
        break
      case 'kamikaze':
        enemy = {
          x, y: -20,
          vx: 0, vy: (100 + Math.random() * 50) * speedMult,
          hp: 1, maxHp: 1, size: 10, type, score: 15 + this.wave,
          color: '#ffe600', targetX: this.px, targetY: this.py
        }
        break
      case 'stealth':
        // 隐身敌人：半透明，难以发现
        enemy = {
          x, y: -20,
          vx: (Math.random() - 0.5) * 60, vy: (60 + Math.random() * 30) * speedMult,
          hp: 2, maxHp: 2, size: 13, type, score: 35 + this.wave,
          color: '#888888', alpha: 0.3,
          blinkTimer: 0, blinkRate: 0.02 + Math.random() * 0.02
        }
        break
      case 'summoner':
        // 召唤型敌人：定期生成小敌人
        enemy = {
          x, y: -20,
          vx: (Math.random() - 0.5) * 30, vy: (30 + Math.random() * 20) * speedMult,
          hp: 4 + Math.floor(this.wave / 4), maxHp: 4 + Math.floor(this.wave / 4),
          size: 18, type, score: 50 + this.wave * 2,
          color: '#ff6600', fireTimer: 0, fireRate: 2,
          summonTimer: 0, summonRate: 5 + Math.floor(this.wave / 5) // 秒
        }
        break
      case 'tank':
        // 坦克型敌人：高血量，慢速，强力射击
        enemy = {
          x, y: -20,
          vx: (Math.random() - 0.5) * 15, vy: (20 + Math.random() * 10) * speedMult,
          hp: 8 + Math.floor(this.wave / 2), maxHp: 8 + Math.floor(this.wave / 2),
          size: 25, type, score: 80 + this.wave * 3,
          color: '#ff0066', fireTimer: 0, fireRate: Math.max(0.5, 0.8 - this.wave * 0.02),
          bulletSize: 6
        }
        break
    }
    this.enemies.push(enemy)
  }

  private spawnBoss() {
    const config = this.levelBossConfig[Math.min(this.level - 1, 9)]
    const hpMultiplier = 1 + this.evolveLevel * 0.1  // 进化后Boss更强

    this.boss = {
      x: this.W / 2, y: -60, vy: 50,
      hp: Math.floor(config.hp * hpMultiplier),
      maxHp: Math.floor(config.hp * hpMultiplier),
      size: config.size,
      color: config.color,
      name: config.name,
      pattern: config.pattern,
      phase: 0, fireTimer: 0, fireInterval: 0.25 + (6 - config.pattern) * 0.05,
      moveDir: 1, moveSpeed: 60 + this.level * 8 + config.pattern * 10,
      entered: false, phaseTimer: 0,
    }
    SFX.bossWarn()
    this.addShake(15, 0.5)
    this.hitStop(0.1)

    // Boss名称显示
    this.addFloatingText(config.name, this.W / 2, 100, config.color, 14)
  }

  private updateBullets(dt: number) {
    for (let i = this.playerBullets.length - 1; i >= 0; i--) {
      const b = this.playerBullets[i]
      b.x += b.vx * dt
      b.y += b.vy * dt
      if (b.y < -10 || b.y > this.H + 10 || b.x < -10 || b.x > this.W + 10) {
        this.playerBullets.splice(i, 1)
      }
    }
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i]
      b.x += b.vx * dt
      b.y += b.vy * dt
      if (b.y < -10 || b.y > this.H + 10 || b.x < -10 || b.x > this.W + 10) {
        this.enemyBullets.splice(i, 1)
      }
    }
  }

  private updateEnemies(dt: number) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]

      // 隐身敌人：闪烁效果
      if (e.type === 'stealth') {
        e.blinkTimer = (e.blinkTimer || 0) + dt
        e.alpha = 0.2 + Math.sin(e.blinkTimer * e.blinkRate * 100) * 0.3
      }

      // 召唤型敌人：定期生成小敌人
      if (e.type === 'summoner' && e.y > 50 && e.y < this.H * 0.4) {
        e.summonTimer = (e.summonTimer || 0) + dt
        if (e.summonTimer >= e.summonRate) {
          e.summonTimer = 0
          // 生成2个小敌人
          for (let s = 0; s < 2; s++) {
            this.enemies.push({
              x: e.x + (s === 0 ? -20 : 20),
              y: e.y + 20,
              vx: (Math.random() - 0.5) * 100,
              vy: 80 + Math.random() * 30,
              hp: 1, maxHp: 1, size: 8, type: 'small',
              score: 5, color: '#ff8844'
            })
          }
          SFX.powerup()
        }
      }

      if (e.type === 'kamikaze' && e.targetX !== undefined) {
        const angle = Math.atan2(this.py - e.y, this.px - e.x)
        e.vx = Math.cos(angle) * 160
        e.vy = Math.sin(angle) * 160
      }
      e.x += e.vx * dt
      e.y += e.vy * dt

      if ((e.type === 'shooter' || e.type === 'heavy' || e.type === 'tank') && e.y > 20 && e.y < this.H * 0.5) {
        e.fireTimer = (e.fireTimer || 0) + dt
        if (e.fireTimer >= (e.fireRate || 0.6)) {
          e.fireTimer = 0
          const angle = Math.atan2(this.py - e.y, this.px - e.x)
          const bulletSpeed = 150 + this.wave * 3
          const bulletSize = e.bulletSize || 4

          // 坦克敌人发射多发子弹
          const count = e.type === 'tank' ? 3 : 1
          for (let b = 0; b < count; b++) {
            const spread = count > 1 ? (b - 1) * 0.2 : 0
            this.enemyBullets.push({
              x: e.x, y: e.y + e.size,
              vx: Math.cos(angle + spread) * bulletSpeed, vy: Math.sin(angle + spread) * bulletSpeed,
              size: bulletSize, color: e.color
            })
          }
        }
      }

      if (e.y > this.H + 30 || e.x < -30 || e.x > this.W + 30) {
        this.enemies.splice(i, 1)
      }
    }

    // Boss AI - 多种攻击模式
    if (this.boss) {
      if (!this.boss.entered) {
        this.boss.y += this.boss.vy * dt
        if (this.boss.y >= 80) { this.boss.entered = true }
      } else {
        this.boss.x += this.boss.moveDir * this.boss.moveSpeed * dt
        if (this.boss.x > this.W - 60 || this.boss.x < 60) this.boss.moveDir *= -1

        this.boss.fireTimer += dt
        this.boss.phaseTimer += dt

        const hpRatio = this.boss.hp / this.boss.maxHp
        const pattern = this.boss.pattern || 1
        const bossColor = this.boss.color || '#FF2E88'
        const phase = hpRatio < 0.3 ? 3 : hpRatio < 0.6 ? 2 : 1
        const fireInterval = 0.5 - phase * 0.1 - pattern * 0.02

        // 散射攻击（所有Boss都有）
        if (this.boss.fireTimer >= fireInterval) {
          this.boss.fireTimer = 0
          const spread = 0.3 + phase * 0.1 + pattern * 0.05
          for (let a = -spread; a <= spread; a += 0.15) {
            this.enemyBullets.push({
              x: this.boss.x, y: this.boss.y + this.boss.size,
              vx: Math.sin(a) * (130 + phase * 20), vy: 170 + phase * 20,
              size: 4, color: bossColor
            })
          }
        }

        // Pattern 3+: 圆形弹幕
        if (pattern >= 3 && this.boss.phaseTimer >= 0.8) {
          for (let i = 0; i < 6 + pattern; i++) {
            const angle = (i / (6 + pattern)) * Math.PI * 2 + this.boss.phaseTimer
            this.enemyBullets.push({
              x: this.boss.x, y: this.boss.y,
              vx: Math.cos(angle) * 100, vy: Math.sin(angle) * 100,
              size: 3, color: '#7C3AED'
            })
          }
        }

        // 追踪弹（Phase 2+）
        if (phase >= 2 && this.boss.phaseTimer >= 1.5 - pattern * 0.1) {
          this.boss.phaseTimer = 0
          const angle = Math.atan2(this.py - this.boss.y, this.px - this.boss.x)
          const count = 1 + phase + Math.floor(pattern / 2)
          for (let i = -Math.floor(count/2); i <= Math.floor(count/2); i++) {
            this.enemyBullets.push({
              x: this.boss.x, y: this.boss.y + this.boss.size,
              vx: Math.cos(angle + i * 0.12) * 240, vy: Math.sin(angle + i * 0.12) * 240,
              size: 6, color: '#ffe600'
            })
          }
        }

        // Pattern 5+: 螺旋弹幕
        if (pattern >= 5) {
          if (!this.boss.spiralAngle) this.boss.spiralAngle = 0
          this.boss.spiralAngle += dt * 3
          if (this.boss.fireTimer >= fireInterval * 0.3) {
            this.enemyBullets.push({
              x: this.boss.x, y: this.boss.y,
              vx: Math.cos(this.boss.spiralAngle) * 120, vy: Math.sin(this.boss.spiralAngle) * 120,
              size: 4, color: '#ff6600'
            })
          }
        }

        // Pattern 6: 最终Boss超级攻击
        if (pattern >= 6 && phase >= 3 && this.boss.phaseTimer >= 2.5) {
          this.boss.phaseTimer = 0
          SFX.bossWarn()
          this.addShake(12, 0.4)
          // 横向激光墙
          for (let i = 0; i < Math.floor(this.W / 25); i++) {
            this.enemyBullets.push({
              x: i * 25 + 12, y: this.boss.y,
              vx: 0, vy: 280,
              size: 4, color: '#ffffff'
            })
          }
        }

        if (phase >= 3) this.boss.phase = 2
      }

      if (this.boss.hp <= 0) {
        const bossScore = 500 + this.level * 200
        this.score += bossScore
        this.onScoreUpdate(this.score)

        // 标记关卡Boss已击败
        this.levelBossDefeated = true
        this.bossWarningActive = false
        this.bossWarningTimer = 0

        SFX.bigExplosion()
        this.addShake(25, 0.7)
        this.hitStop(0.25)

        // 多次爆炸
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            if (this.running) {
              this.spawnExplosion(
                this.boss.x + (Math.random() - 0.5) * 80,
                this.boss.y + (Math.random() - 0.5) * 80,
                30 + Math.random() * 20, true
              )
              SFX.explosion()
            }
          }, i * 100)
        }

        // Boss奖励：武器升级 + 能量 + 可能的生命
        this.pickups.push({ x: this.boss.x, y: this.boss.y, vy: 100, type: 'weapon', size: 16 })
        this.pickups.push({ x: this.boss.x - 30, y: this.boss.y + 10, vy: 100, type: 'energy', size: 14 })
        this.pickups.push({ x: this.boss.x + 30, y: this.boss.y + 10, vy: 100, type: 'energy', size: 14 })
        if (this.level % 2 === 0 || this.lives < 3) {
          this.pickups.push({ x: this.boss.x, y: this.boss.y + 20, vy: 100, type: 'health', size: 12 })
        }

        // 进化经验奖励
        this.evolveExp += this.level * 80
        this.checkEvolve()

        const defeatText = getLang() === 'zh' ?
          `击败 ${this.boss.name}！+${bossScore}` :
          `${this.boss.name} defeated! +${bossScore}`
        this.addFloatingText(defeatText, this.W / 2, this.H / 3, '#ffe600', 16)

        this.boss = null
      }
    }
  }

  private updatePickups(dt: number) {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i]
      p.y += p.vy * dt
      if (p.y > this.H + 20) { this.pickups.splice(i, 1); continue }

      const dx = p.x - this.px, dy = p.y - this.py
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 60) {
        const pullSpeed = 250
        p.x -= (dx / dist) * pullSpeed * dt
        p.y -= (dy / dist) * pullSpeed * dt
      }
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
        SFX.pickup()
        this.addShake(3, 0.1)
        if (p.type === 'weapon') {
          this.upgradeBullet()
        } else if (p.type === 'health') {
          this.lives = Math.min(this.lives + 1, this.maxLives)
          this.addFloatingText(t('shooter_life_up'), this.px, this.py - 30, '#39ff14', 10)
        } else if (p.type === 'energy') {
          this.skillEnergy = Math.min(this.skillEnergy + 25, this.skillMax)
          this.addFloatingText(t('shooter_energy'), this.px, this.py - 30, '#ffe600', 8)
        }
        this.pickups.splice(i, 1)
      }
    }
  }

  private upgradeBullet() {
    if (this.bulletLevel < this.maxBulletLevel) {
      this.bulletLevel++
      SFX.powerup()
      this.addShake(5, 0.2)

      // 子弹等级名称随等级变化
      const getBulletName = (lv: number) => {
        if (lv <= 5) {
          const names = ['', 'SINGLE', 'DOUBLE', 'SPREAD', 'TRACK', 'MEGA']
          return getLang() === 'zh' ? ['', '单发', '双发', '扩散', '追踪', '密集'][lv] : names[lv]
        } else if (lv <= 10) {
          return getLang() === 'zh' ? `强化${lv - 5}` : `BOOST-${lv - 5}`
        } else if (lv <= 15) {
          return getLang() === 'zh' ? `超能${lv - 10}` : `HYPER-${lv - 10}`
        } else {
          return getLang() === 'zh' ? `终极${lv - 15}` : `ULTRA-${lv - 15}`
        }
      }

      const name = getBulletName(this.bulletLevel)
      const color = this.bulletLevel >= 15 ? '#ffffff' :
                    this.bulletLevel >= 10 ? '#ffe600' :
                    this.bulletLevel >= 5 ? '#FF2E88' : '#22D3EE'

      this.addFloatingText(`Lv${this.bulletLevel} ${name}!`, this.px, this.py - 40, color, 10)
    } else {
      const bonus = 300 + this.evolveLevel * 100
      this.score += bonus
      this.onScoreUpdate(this.score)
      this.addFloatingText(`+${bonus}`, this.px, this.py - 40, '#ffe600', 10)
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += (p.gravity || 0) * dt
      p.vx *= Math.exp(-p.drag * dt)
      p.vy *= Math.exp(-p.drag * dt)
      p.life -= dt
      if (p.life <= 0) this.particles.splice(i, 1)
    }
  }

  private updateFloatingTexts(dt: number) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i]
      ft.y += ft.vy * dt
      ft.timer -= dt
      ft.scaleTime += dt
      if (ft.scaleTime < 0.2) {
        ft.scale = 1 + 0.3 * ease.outBack(ft.scaleTime / 0.2)
      } else {
        ft.scale = 1
      }
      if (ft.timer <= 0) this.floatingTexts.splice(i, 1)
    }
  }

  private addFloatingText(text: string, x: number, y: number, color: string, size: number) {
    this.floatingTexts.push({
      text, x, y, vy: -50,
      timer: 1.2, maxTimer: 1.2,
      color, size, scale: 1.3, scaleTime: 0
    })
  }

  private checkCollisions() {
    // Player bullets vs enemies
    for (let bi = this.playerBullets.length - 1; bi >= 0; bi--) {
      const b = this.playerBullets[bi]
      for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
        const e = this.enemies[ei]
        if (Math.abs(b.x - e.x) < e.size + b.size && Math.abs(b.y - e.y) < e.size + b.size) {
          e.hp -= b.dmg
          this.playerBullets.splice(bi, 1)
          this.spawnHitFlash(b.x, b.y)
          SFX.hit()
          this.addShake(4, 0.12)
          this.hitStop(0.03)
          if (e.hp <= 0) {
            this.onEnemyKilled(e)
            this.enemies.splice(ei, 1)
          }
          break
        }
      }

      if (this.boss && this.boss.entered && bi < this.playerBullets.length) {
        const b2 = this.playerBullets[bi]
        if (b2 && Math.abs(b2.x - this.boss.x) < this.boss.size + b2.size && Math.abs(b2.y - this.boss.y) < this.boss.size + b2.size) {
          this.boss.hp -= b2.dmg
          this.spawnHitFlash(b2.x, b2.y)
          SFX.hit()
          this.addShake(6, 0.15)
          this.playerBullets.splice(bi, 1)
        }
      }
    }

    // Enemy bullets vs player
    if (this.invincible <= 0) {
      for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
        const b = this.enemyBullets[i]
        const hitW = this.pw * 0.35, hitH = this.ph * 0.35
        if (Math.abs(b.x - this.px) < hitW + b.size && Math.abs(b.y - this.py) < hitH + b.size) {
          this.enemyBullets.splice(i, 1)
          this.playerHit()
          break
        }
      }

      for (const e of this.enemies) {
        if (Math.abs(e.x - this.px) < e.size + this.pw / 2 && Math.abs(e.y - this.py) < e.size + this.ph / 2) {
          this.playerHit()
          if (e.type === 'kamikaze') {
            this.spawnExplosion(e.x, e.y, 15)
            e.hp = 0
          }
          break
        }
      }
    }
  }

  private onEnemyKilled(e: any) {
    this.killCount++
    this.waveEnemiesKilled++

    this.combo++
    this.comboTimer = this.comboWindow
    if (this.combo > this.bestCombo) this.bestCombo = this.combo

    if (this.combo >= 30) this.comboMultiplier = 10
    else if (this.combo >= 20) this.comboMultiplier = 5
    else if (this.combo >= 10) this.comboMultiplier = 3
    else if (this.combo >= 5) this.comboMultiplier = 2
    else this.comboMultiplier = 1

    const points = Math.floor(e.score * this.comboMultiplier)
    this.score += points
    this.scorePop = 0.3
    this.skillEnergy = Math.min(this.skillEnergy + 5 + this.combo * 0.2, this.skillMax)
    this.onScoreUpdate(this.score)

    SFX.explosion()
    this.addShake(8, 0.2)
    this.hitStop(0.05)
    this.spawnExplosion(e.x, e.y, e.size)
    this.addFloatingText(`+${points}`, e.x, e.y - 10, '#39ff14', 8)

    if (this.combo >= 5 && this.combo % 5 === 0) {
      SFX.combo()
      this.comboDisplay = { text: `x${this.comboMultiplier} COMBO!`, timer: 1.5, x: e.x, y: e.y }
      this.addFloatingText(t('shooter_combo', { n: this.combo }), this.W / 2, this.H / 2 - 60, '#ffe600', 14)
    }

    const milestones = [10, 25, 50, 100, 200]
    for (const m of milestones) {
      if (this.killCount >= m && !this.milestoneShown.has(m)) {
        this.milestoneShown.add(m)
        const bonus = m * 5
        this.score += bonus
        this.onScoreUpdate(this.score)
        SFX.powerup()
        this.addFloatingText(t('shooter_kills', { n: m, bonus }), this.W / 2, this.H / 2, '#7C3AED', 13)
      }
    }

    const dropRate = this.wave <= 2 ? 0.12 : 0.20
    if (Math.random() < dropRate) {
      const types = this.wave <= 2
        ? ['energy', 'energy', 'weapon']
        : ['weapon', 'weapon', 'energy', 'health']
      this.pickups.push({
        x: e.x, y: e.y, vy: 100,
        type: types[Math.floor(Math.random() * types.length)],
        size: 12
      })
    }
  }

  private playerHit() {
    this.lives--
    this.invincible = 2  // seconds
    this.flashTimer = 0.1
    this.combo = 0
    this.comboTimer = 0
    this.comboMultiplier = 1
    this.waveDamageTaken = true

    SFX.damage()
    this.addShake(15, 0.35)
    this.hitStop(0.12)

    if (this.bulletLevel > 1) {
      this.bulletLevel--
      this.addFloatingText(t('shooter_weapon_down'), this.px, this.py - 30, '#FF2E88', 9)
    }

    if (this.lives <= 0) {
      SFX.death()
      this.addShake(20, 0.5)
      this.hitStop(0.25)
      this.state = 'gameover'
      this.spawnExplosion(this.px, this.py, 30, true)
      const coins = Math.floor(this.score / 100)
      try {
        const { useGameStore } = require('../store/gameStore')
        const store = useGameStore.getState()
        store.addCoins(coins)
      } catch {}
    }
  }

  private spawnExplosion(x: number, y: number, size: number, big = false) {
    const count = Math.min(size * 2, big ? 40 : 30)
    const colors = ['#22D3EE', '#7C3AED', '#FF2E88', '#ffe600', '#39ff14']
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = (big ? 250 : 180) * (0.5 + Math.random() * 0.5)
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * (big ? 5 : 3) + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.9,
        gravity: 150,
        drag: 5,
        shape: 'circle'
      })
    }
  }

  private spawnHitFlash(x: number, y: number) {
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * 100,
        vy: Math.sin(angle) * 100,
        size: 3,
        color: '#ffffff',
        life: 0.08,
        maxLife: 0.08,
        gravity: 0,
        drag: 10,
        shape: 'circle'
      })
    }
  }

  // ========== RENDER ==========

  private render(dt: number) {
    const ctx = this.ctx
    const font = getGameFont()
    ctx.save()

    // Background with gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.H)
    bgGrad.addColorStop(0, '#05050f')
    bgGrad.addColorStop(0.5, '#0a0a18')
    bgGrad.addColorStop(1, '#0d0d20')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, this.W, this.H)

    // Animated stars - 多层次星空
    const now = performance.now()
    for (let i = 0; i < 80; i++) {
      const layer = i % 3
      const speed = 0.3 + layer * 0.2
      const size = 1 + layer * 0.5
      const sx = (i * 137.5 + this.wave * 3) % this.W
      const sy = (i * 97.3 + now / 40 * speed) % this.H
      const brightness = 0.3 + layer * 0.25
      ctx.fillStyle = `rgba(180,180,255,${brightness})`
      ctx.beginPath()
      ctx.arc(sx, sy, size, 0, Math.PI * 2)
      ctx.fill()
    }
    // 闪烁星星
    for (let i = 0; i < 15; i++) {
      const sx = (i * 73 + 50) % this.W
      const sy = (i * 41 + 30) % this.H
      const twinkle = Math.sin(now / 200 + i) * 0.5 + 0.5
      ctx.fillStyle = `rgba(255,255,255,${twinkle * 0.8})`
      ctx.beginPath()
      ctx.arc(sx, sy, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }

    // Flash
    if (this.flashTimer > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flashTimer * 3})`
      ctx.fillRect(0, 0, this.W, this.H)
    }

    // Apply screen shake (game objects only)
    ctx.save()
    ctx.translate(this.shake.x, this.shake.y)

    if (this.state === 'title') {
      this.renderTitle(font)
    } else if (this.state === 'gameover') {
      this.renderGame(font)
      this.renderGameOver(font)
    } else {
      this.renderGame(font)
    }

    ctx.restore() // Remove shake for UI
    ctx.restore()
  }

  private renderTitle(font: string) {
    const ctx = this.ctx

    ctx.fillStyle = '#22D3EE'
    ctx.shadowColor = '#22D3EE'
    ctx.shadowBlur = 20
    ctx.font = `bold 22px ${font}`
    ctx.textAlign = 'center'
    ctx.fillText(t('game_shooter'), this.W / 2, this.H / 2 - 50)
    ctx.shadowBlur = 0

    ctx.fillStyle = '#7C3AED'
    ctx.font = `bold 10px ${font}`
    ctx.fillText(t('shooter_subtitle'), this.W / 2, this.H / 2 - 10)

    ctx.fillStyle = '#4a4a6a'
    ctx.font = `9px ${font}`
    ctx.fillText(`${t('shooter_move')} | ${t('shooter_auto_fire')} | ${t('shooter_skill')}`, this.W / 2, this.H / 2 + 25)

    const blink = Math.sin(performance.now() / 300) > 0
    ctx.fillStyle = '#4a4a6a'
    ctx.font = `11px ${font}`
    if (blink) ctx.fillText(t('tap_start'), this.W / 2, this.H / 2 + 60)
  }

  private renderGame(font: string) {
    const ctx = this.ctx

    // Boss warning - 只在警告激活时显示
    if (this.bossWarningActive && this.bossWarningTimer > 0) {
      const alpha = Math.sin(this.bossWarningTimer * 8) * 0.5 + 0.5
      ctx.fillStyle = `rgba(255,46,136,${alpha * 0.15})`
      ctx.fillRect(0, 0, this.W, this.H)
      ctx.fillStyle = `rgba(255,46,136,${alpha})`
      ctx.shadowColor = '#FF2E88'
      ctx.shadowBlur = 15
      ctx.font = `bold 12px ${font}`
      ctx.textAlign = 'center'
      ctx.fillText(t('shooter_warning'), this.W / 2, this.H / 2)
      ctx.shadowBlur = 0
    }

    // Pickups - 脉动发光
    const pickupTime = performance.now() / 100
    for (const p of this.pickups) {
      ctx.save()
      ctx.translate(p.x, p.y)
      const pulse = 1 + Math.sin(pickupTime) * 0.15
      const glow = p.type === 'weapon' ? '#FF2E88' : p.type === 'health' ? '#39ff14' : '#ffe600'

      // 外发光
      ctx.shadowColor = glow
      ctx.shadowBlur = 12 + Math.sin(pickupTime) * 4
      ctx.fillStyle = glow
      ctx.globalAlpha = 0.6
      ctx.beginPath()
      ctx.arc(0, 0, 10 * pulse, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1

      // 物品本体
      if (p.type === 'weapon') {
        // 武器升级 - 十字星
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(-6 * pulse, -2, 12 * pulse, 4)
        ctx.fillRect(-2, -6 * pulse, 4, 12 * pulse)
      } else if (p.type === 'health') {
        // 生命 - 心形简化
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(-5 * pulse, -2, 10 * pulse, 4)
        ctx.fillRect(-2, -5 * pulse, 4, 10 * pulse)
      } else {
        // 能量 - 闪烁圆
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(0, 0, 6 * pulse, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(0, 0, 3 * pulse, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }

    // Enemy bullets - 带拖尾
    for (const b of this.enemyBullets) {
      const bColor = b.color || '#FF2E88'
      // 拖尾
      ctx.globalAlpha = 0.3
      ctx.fillStyle = bColor
      ctx.beginPath()
      ctx.arc(b.x, b.y - b.size * 2, b.size * 0.8, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 0.15
      ctx.beginPath()
      ctx.arc(b.x, b.y - b.size * 4, b.size * 0.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1

      // 主体渐变
      const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.size * 1.5)
      grad.addColorStop(0, '#ffffff')
      grad.addColorStop(0.3, bColor)
      grad.addColorStop(1, shadeColor(bColor, -30))
      ctx.fillStyle = grad
      ctx.shadowColor = bColor
      ctx.shadowBlur = 6
      ctx.beginPath()
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2)
      ctx.fill()
      // 核心
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(b.x, b.y, b.size * 0.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    }

    // Enemies - 带渐变和细节
    for (const e of this.enemies) {
      ctx.save()
      ctx.translate(e.x, e.y)

      // 外发光
      ctx.shadowColor = e.color
      ctx.shadowBlur = 12

      switch (e.type) {
        case 'small':
          // 渐变填充
          const smallGrad = ctx.createLinearGradient(-e.size/2, -e.size/2, e.size/2, e.size/2)
          smallGrad.addColorStop(0, '#ffffff')
          smallGrad.addColorStop(0.3, e.color)
          smallGrad.addColorStop(1, shadeColor(e.color, -30))
          ctx.fillStyle = smallGrad
          ctx.beginPath()
          ctx.roundRect(-e.size / 2, -e.size / 2, e.size, e.size, 3)
          ctx.fill()
          break

        case 'heavy':
          // 重型敌人 - 坚固外观
          const heavyGrad = ctx.createLinearGradient(-e.size/2, -e.size/2, e.size/2, e.size/2)
          heavyGrad.addColorStop(0, e.color)
          heavyGrad.addColorStop(0.5, shadeColor(e.color, -20))
          heavyGrad.addColorStop(1, shadeColor(e.color, -40))
          ctx.fillStyle = heavyGrad
          ctx.beginPath()
          ctx.roundRect(-e.size / 2, -e.size / 2, e.size, e.size, 4)
          ctx.fill()
          // 内部装甲
          ctx.fillStyle = '#0a0a18'
          ctx.beginPath()
          ctx.roundRect(-e.size / 4, -e.size / 4, e.size / 2, e.size / 2, 2)
          ctx.fill()
          // 核心点
          ctx.fillStyle = e.color
          ctx.beginPath()
          ctx.arc(0, 0, 3, 0, Math.PI * 2)
          ctx.fill()
          break

        case 'shooter':
          // 射击敌人 - 三角形带渐变
          ctx.fillStyle = e.color
          ctx.beginPath()
          ctx.moveTo(0, -e.size)
          ctx.lineTo(e.size, e.size)
          ctx.lineTo(-e.size, e.size)
          ctx.closePath()
          ctx.fill()
          // 中心线
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(0, -e.size * 0.7)
          ctx.lineTo(0, e.size * 0.5)
          ctx.stroke()
          break

        case 'kamikaze':
          // 自杀敌人 - 锐利箭头
          const kamiGrad = ctx.createLinearGradient(0, e.size, 0, -e.size * 0.5)
          kamiGrad.addColorStop(0, '#ffffff')
          kamiGrad.addColorStop(0.3, e.color)
          kamiGrad.addColorStop(1, shadeColor(e.color, -30))
          ctx.fillStyle = kamiGrad
          ctx.beginPath()
          ctx.moveTo(0, e.size)
          ctx.lineTo(e.size * 0.7, -e.size * 0.5)
          ctx.lineTo(0, -e.size * 0.2)
          ctx.lineTo(-e.size * 0.7, -e.size * 0.5)
          ctx.closePath()
          ctx.fill()
          // 危险标记
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.arc(0, 0, 4, 0, Math.PI * 2)
          ctx.stroke()
          break

        case 'stealth':
          // 隐身敌人 - 半透明闪烁效果
          ctx.globalAlpha = e.alpha || 0.3
          const stealthGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, e.size)
          stealthGrad.addColorStop(0, '#aaaaaa')
          stealthGrad.addColorStop(0.5, e.color)
          stealthGrad.addColorStop(1, 'rgba(100, 100, 100, 0.5)')
          ctx.fillStyle = stealthGrad
          ctx.beginPath()
          ctx.arc(0, 0, e.size, 0, Math.PI * 2)
          ctx.fill()
          // 幽灵效果 - 内部空心
          ctx.fillStyle = '#0a0a18'
          ctx.globalAlpha = 0.5
          ctx.beginPath()
          ctx.arc(0, 0, e.size * 0.5, 0, Math.PI * 2)
          ctx.fill()
          ctx.globalAlpha = 1
          break

        case 'summoner':
          // 召唤型敌人 - 带环绕效果
          const summonGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, e.size)
          summonGrad.addColorStop(0, '#ffffff')
          summonGrad.addColorStop(0.3, e.color)
          summonGrad.addColorStop(1, shadeColor(e.color, -40))
          ctx.fillStyle = summonGrad
          ctx.beginPath()
          ctx.arc(0, 0, e.size, 0, Math.PI * 2)
          ctx.fill()
          // 召唤环 - 旋转的圆环
          const ringTime = performance.now() / 1000
          ctx.strokeStyle = '#ffaa44'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(0, 0, e.size * 1.2, ringTime, ringTime + Math.PI * 1.5)
          ctx.stroke()
          ctx.beginPath()
          ctx.arc(0, 0, e.size * 1.3, ringTime + Math.PI, ringTime + Math.PI * 2.5)
          ctx.stroke()
          break

        case 'tank':
          // 坦克型敌人 - 厚重装甲外观
          const tankGrad = ctx.createLinearGradient(-e.size/2, -e.size/2, e.size/2, e.size/2)
          tankGrad.addColorStop(0, '#ff3388')
          tankGrad.addColorStop(0.5, e.color)
          tankGrad.addColorStop(1, shadeColor(e.color, -50))
          ctx.fillStyle = tankGrad
          ctx.beginPath()
          ctx.roundRect(-e.size / 2, -e.size / 2, e.size, e.size, 6)
          ctx.fill()
          // 装甲板
          ctx.fillStyle = '#0a0a18'
          ctx.beginPath()
          ctx.roundRect(-e.size / 3, -e.size / 3, e.size * 0.66, e.size * 0.66, 3)
          ctx.fill()
          // 炮管
          ctx.fillStyle = '#ff0066'
          ctx.fillRect(-2, 0, 4, e.size * 0.7)
          // 核心
          ctx.fillStyle = '#ffffff'
          ctx.beginPath()
          ctx.arc(0, 0, 4, 0, Math.PI * 2)
          ctx.fill()
          break
      }

      // HP条带渐变
      if (e.maxHp > 1) {
        ctx.shadowBlur = 0
        const hpWidth = e.size
        const hpHeight = 4
        const hpY = -e.size - 8
        // 背景
        ctx.fillStyle = '#1a1a2a'
        ctx.beginPath()
        ctx.roundRect(-hpWidth / 2, hpY, hpWidth, hpHeight, 2)
        ctx.fill()
        // HP渐变
        const hpGrad = ctx.createLinearGradient(-hpWidth/2, 0, hpWidth/2, 0)
        hpGrad.addColorStop(0, shadeColor(e.color, 20))
        hpGrad.addColorStop(1, e.color)
        ctx.fillStyle = hpGrad
        ctx.beginPath()
        ctx.roundRect(-hpWidth / 2, hpY, hpWidth * (e.hp / e.maxHp), hpHeight, 2)
        ctx.fill()
      }
      ctx.restore()
    }

    // Boss - 华丽外观
    if (this.boss) {
      const b = this.boss
      const hpRatio = b.hp / b.maxHp
      const bossColor = hpRatio < 0.3 ? '#ffe600' : '#FF2E88'
      const pulse = 1 + Math.sin(performance.now() / 100) * 0.05

      ctx.save()
      ctx.translate(b.x, b.y)

      if (b.phase === 2) {
        ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6)
      }

      // 外发光光环
      ctx.shadowColor = bossColor
      ctx.shadowBlur = 25 + (hpRatio < 0.3 ? 10 : 0)

      // 外框 - 八边形
      const s = b.size * pulse
      ctx.fillStyle = bossColor
      ctx.beginPath()
      ctx.moveTo(-s * 0.4, -s * 0.5)
      ctx.lineTo(s * 0.4, -s * 0.5)
      ctx.lineTo(s * 0.5, -s * 0.4)
      ctx.lineTo(s * 0.5, s * 0.4)
      ctx.lineTo(s * 0.4, s * 0.5)
      ctx.lineTo(-s * 0.4, s * 0.5)
      ctx.lineTo(-s * 0.5, s * 0.4)
      ctx.lineTo(-s * 0.5, -s * 0.4)
      ctx.closePath()
      ctx.fill()

      // 内部装甲渐变
      ctx.shadowBlur = 0
      const innerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.4)
      innerGrad.addColorStop(0, shadeColor(bossColor, 30))
      innerGrad.addColorStop(0.5, bossColor)
      innerGrad.addColorStop(1, shadeColor(bossColor, -40))
      ctx.fillStyle = innerGrad
      ctx.beginPath()
      ctx.roundRect(-s * 0.35, -s * 0.35, s * 0.7, s * 0.7, 6)
      ctx.fill()

      // 核心 - 旋转眼
      ctx.fillStyle = '#0a0a18'
      ctx.beginPath()
      ctx.arc(0, 0, s * 0.25, 0, Math.PI * 2)
      ctx.fill()

      const eyeAngle = performance.now() / 200
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(Math.cos(eyeAngle) * 5, Math.sin(eyeAngle) * 5, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = bossColor
      ctx.beginPath()
      ctx.arc(Math.cos(eyeAngle) * 5, Math.sin(eyeAngle) * 5, 4, 0, Math.PI * 2)
      ctx.fill()

      // HP条 - 渐变
      const bw = this.W * 0.5
      const bh = 6
      ctx.fillStyle = '#1a1a2a'
      ctx.beginPath()
      ctx.roundRect(-bw / 2, -b.size - 18, bw, bh, 3)
      ctx.fill()

      const hpGrad = ctx.createLinearGradient(-bw/2, 0, bw/2, 0)
      hpGrad.addColorStop(0, '#ff0000')
      hpGrad.addColorStop(0.5, bossColor)
      hpGrad.addColorStop(1, shadeColor(bossColor, 30))
      ctx.fillStyle = hpGrad
      ctx.beginPath()
      ctx.roundRect(-bw / 2, -b.size - 18, bw * hpRatio, bh, 3)
      ctx.fill()

      // HP条发光边
      ctx.strokeStyle = bossColor
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(-bw / 2, -b.size - 18, bw, bh, 3)
      ctx.stroke()

      ctx.restore()
    }

    // Player bullets - 带拖尾和渐变
    const bulletColors = ['#22D3EE', '#39ff14', '#ffe600', '#FF2E88', '#7C3AED']
    for (const b of this.playerBullets) {
      const bColor = b.color || bulletColors[this.bulletLevel - 1] || '#22D3EE'
      // 拖尾
      ctx.globalAlpha = 0.3
      ctx.fillStyle = bColor
      if (b.isLaser) {
        ctx.fillRect(b.x - b.size / 2, b.y - 16, b.size, 24)
      } else {
        ctx.fillRect(b.x - b.size / 2, b.y - b.size * 4, b.size, b.size * 6)
      }
      ctx.globalAlpha = 1
      // 主体渐变
      const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.size * 1.5)
      grad.addColorStop(0, '#ffffff')
      grad.addColorStop(0.3, bColor)
      grad.addColorStop(1, 'transparent')
      ctx.fillStyle = grad
      ctx.shadowColor = bColor
      ctx.shadowBlur = b.isLaser ? 15 : 8
      if (b.isLaser) {
        ctx.fillRect(b.x - b.size / 2, b.y - 10, b.size, 20)
        // 激光核心
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(b.x - b.size / 4, b.y - 8, b.size / 2, 16)
      } else {
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.size * 1.2, 0, Math.PI * 2)
        ctx.fill()
        // 核心
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.size * 0.4, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.shadowBlur = 0

    // Player - 飞机外观随进化等级变化
    if (this.state !== 'gameover') {
      ctx.save()
      ctx.translate(this.px, this.py)
      if (this.invincible > 0 && Math.floor(this.invincible / 0.08) % 2 === 0) {
        ctx.globalAlpha = 0.5
      }

      // 进化后飞机更大
      const scale = 1 + (this.evolveLevel - 1) * 0.15
      ctx.scale(scale, scale)

      // 根据进化等级选择配色
      const evolveColors = [
        { main: '#22D3EE', accent: '#0d4a5a', glow: '#22D3EE' },  // Lv1 青色
        { main: '#39ff14', accent: '#1a5a0a', glow: '#39ff14' },  // Lv2 绿色
        { main: '#ffe600', accent: '#8a6a00', glow: '#ffe600' },  // Lv3 金色
        { main: '#FF2E88', accent: '#8a1a4a', glow: '#FF2E88' },  // Lv4 粉色
      ]
      const colors = evolveColors[Math.min(this.evolveLevel - 1, 3)]

      // 护盾光环（进化后更强）
      if (this.invincible > 0) {
        const shieldAlpha = 0.4 + Math.sin(performance.now() / 80) * 0.3
        ctx.strokeStyle = `rgba(${hexToRgb(colors.glow)}, ${shieldAlpha})`
        ctx.lineWidth = 2 + this.evolveLevel
        ctx.shadowColor = colors.glow
        ctx.shadowBlur = 15 + this.evolveLevel * 5
        ctx.beginPath()
        ctx.arc(0, 0, this.pw * (0.9 + this.evolveLevel * 0.1), 0, Math.PI * 2)
        ctx.stroke()
        ctx.shadowBlur = 0
      }

      // 机身渐变 - 进化后更华丽
      const bodyGrad = ctx.createLinearGradient(0, -this.ph/2, 0, this.ph/2)
      bodyGrad.addColorStop(0, '#ffffff')
      bodyGrad.addColorStop(0.15, colors.main)
      bodyGrad.addColorStop(0.5, shadeColor(colors.main, -20))
      bodyGrad.addColorStop(1, colors.accent)
      ctx.fillStyle = bodyGrad
      ctx.shadowColor = colors.glow
      ctx.shadowBlur = 12 + this.evolveLevel * 3

      // 进化后机翼形状变化
      if (this.evolveLevel >= 3) {
        // 高级形态：三角翼
        ctx.beginPath()
        ctx.moveTo(0, -this.ph / 2)
        ctx.lineTo(this.pw * 0.6, this.ph * 0.4)
        ctx.lineTo(this.pw * 0.3, this.ph / 2)
        ctx.lineTo(0, this.ph * 0.35)
        ctx.lineTo(-this.pw * 0.3, this.ph / 2)
        ctx.lineTo(-this.pw * 0.6, this.ph * 0.4)
        ctx.closePath()
      } else if (this.evolveLevel >= 2) {
        // 中级形态：宽翼
        ctx.beginPath()
        ctx.moveTo(0, -this.ph / 2)
        ctx.lineTo(this.pw * 0.45, -this.ph * 0.15)
        ctx.lineTo(this.pw * 0.55, this.ph * 0.35)
        ctx.lineTo(this.pw * 0.28, this.ph / 2)
        ctx.lineTo(0, this.ph * 0.38)
        ctx.lineTo(-this.pw * 0.28, this.ph / 2)
        ctx.lineTo(-this.pw * 0.55, this.ph * 0.35)
        ctx.lineTo(-this.pw * 0.45, -this.ph * 0.15)
        ctx.closePath()
      } else {
        // 基础形态
        ctx.beginPath()
        ctx.moveTo(0, -this.ph / 2)
        ctx.lineTo(this.pw * 0.35, -this.ph * 0.2)
        ctx.lineTo(this.pw / 2, this.ph * 0.3)
        ctx.lineTo(this.pw * 0.25, this.ph / 2)
        ctx.lineTo(0, this.ph * 0.35)
        ctx.lineTo(-this.pw * 0.25, this.ph / 2)
        ctx.lineTo(-this.pw / 2, this.ph * 0.3)
        ctx.lineTo(-this.pw * 0.35, -this.ph * 0.2)
        ctx.closePath()
      }
      ctx.fill()

      // 机翼细节线 - 进化后更多细节
      ctx.shadowBlur = 0
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(0, -this.ph * 0.3)
      ctx.lineTo(0, this.ph * 0.2)
      ctx.stroke()

      if (this.evolveLevel >= 2) {
        // 进化后侧翼线
        ctx.beginPath()
        ctx.moveTo(-this.pw * 0.35, -this.ph * 0.1)
        ctx.lineTo(-this.pw * 0.5, this.ph * 0.2)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(this.pw * 0.35, -this.ph * 0.1)
        ctx.lineTo(this.pw * 0.5, this.ph * 0.2)
        ctx.stroke()
      }

      // 驾驶舱 - 进化后更大更亮
      ctx.fillStyle = colors.accent
      ctx.beginPath()
      ctx.ellipse(0, -this.ph * 0.15, 5 + this.evolveLevel, 8 + this.evolveLevel * 0.5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = colors.main
      ctx.beginPath()
      ctx.ellipse(0, -this.ph * 0.18, 3 + this.evolveLevel * 0.5, 4 + this.evolveLevel * 0.3, 0, 0, Math.PI * 2)
      ctx.fill()

      // 多引擎 - 进化后引擎数量增加
      const flameTime = performance.now() / 50
      const flameBase = 8 + this.evolveLevel * 3

      // 主引擎（双）
      for (let side = -1; side <= 1; side += 2) {
        const engineX = this.pw * 0.2 * side
        const flameLen = flameBase + Math.sin(flameTime + side) * 4
        const flameGrad = ctx.createLinearGradient(engineX, this.ph/2, engineX, this.ph/2 + flameLen)
        flameGrad.addColorStop(0, '#ffffff')
        flameGrad.addColorStop(0.2, colors.main)
        flameGrad.addColorStop(0.5, '#ff6600')
        flameGrad.addColorStop(1, 'transparent')
        ctx.fillStyle = flameGrad
        ctx.shadowColor = colors.main
        ctx.shadowBlur = 10 + this.evolveLevel * 2
        ctx.beginPath()
        ctx.moveTo(engineX - this.pw * 0.08, this.ph / 2)
        ctx.lineTo(engineX + this.pw * 0.08, this.ph / 2)
        ctx.lineTo(engineX, this.ph / 2 + flameLen)
        ctx.closePath()
        ctx.fill()
      }

      // 进化Lv3+: 中间大引擎
      if (this.evolveLevel >= 3) {
        const centerFlame = flameBase * 1.5 + Math.sin(flameTime * 1.5) * 5
        const centerGrad = ctx.createLinearGradient(0, this.ph/2, 0, this.ph/2 + centerFlame)
        centerGrad.addColorStop(0, '#ffffff')
        centerGrad.addColorStop(0.3, '#ffe600')
        centerGrad.addColorStop(0.7, '#ff6600')
        centerGrad.addColorStop(1, 'transparent')
        ctx.fillStyle = centerGrad
        ctx.shadowColor = '#ffe600'
        ctx.shadowBlur = 15
        ctx.beginPath()
        ctx.moveTo(-this.pw * 0.12, this.ph / 2)
        ctx.lineTo(this.pw * 0.12, this.ph / 2)
        ctx.lineTo(0, this.ph / 2 + centerFlame)
        ctx.closePath()
        ctx.fill()
      }

      // 子弹等级光环 - 进化后更强
      if (this.bulletLevel >= 5) {
        const auraCount = Math.min(Math.floor(this.bulletLevel / 5), 4)
        for (let i = 0; i < auraCount; i++) {
          const auraRadius = this.pw * (0.7 + i * 0.15)
          const auraAlpha = 1 - i * 0.25
          ctx.globalAlpha = auraAlpha
          ctx.strokeStyle = colors.main
          ctx.shadowColor = colors.glow
          ctx.shadowBlur = 8 + i * 2
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(0, 0, auraRadius, 0, Math.PI * 2)
          ctx.stroke()
        }
        ctx.globalAlpha = 1
        ctx.shadowBlur = 0
      }

      ctx.restore()
    }

    // Particles - 带发光效果
    for (const p of this.particles) {
      const alpha = Math.min(1, p.life / p.maxLife)
      const fadeSize = p.size * (0.5 + alpha * 0.5)
      ctx.globalAlpha = alpha * 0.8
      ctx.shadowColor = p.color
      ctx.shadowBlur = 4
      ctx.fillStyle = p.color
      if (p.shape === 'circle') {
        ctx.beginPath()
        ctx.arc(p.x, p.y, fadeSize, 0, Math.PI * 2)
        ctx.fill()
        // 核心
        ctx.globalAlpha = alpha
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(p.x, p.y, fadeSize * 0.3, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillRect(p.x - fadeSize / 2, p.y - fadeSize / 2, fadeSize, fadeSize)
      }
    }
    ctx.globalAlpha = 1
    ctx.shadowBlur = 0

    // Floating texts
    for (const ft of this.floatingTexts) {
      const alpha = Math.min(1, ft.timer / 0.3)
      ctx.globalAlpha = alpha
      ctx.fillStyle = ft.color
      ctx.shadowColor = ft.color
      ctx.shadowBlur = 8
      ctx.font = `${ft.size * ft.scale}px ${font}`
      ctx.textAlign = 'center'
      ctx.fillText(ft.text, ft.x, ft.y)
      ctx.shadowBlur = 0
    }
    ctx.globalAlpha = 1

    // Combo display
    if (this.comboDisplay.timer > 0) {
      const alpha = Math.min(1, this.comboDisplay.timer / 0.5)
      ctx.globalAlpha = alpha
      ctx.fillStyle = '#ffe600'
      ctx.shadowColor = '#ffe600'
      ctx.shadowBlur = 15
      ctx.font = this.comboDisplay.text.includes('BREAK') ? `8px ${font}` : `bold 10px ${font}`
      ctx.textAlign = 'center'
      ctx.fillText(this.comboDisplay.text, this.comboDisplay.x, this.comboDisplay.y - (1.5 - this.comboDisplay.timer) * 30)
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1
    }

    this.renderHUD(font)
  }

  private renderHUD(font: string) {
    const ctx = this.ctx
    const isZh = getLang() === 'zh'

    // 关卡和波次显示（左上角）
    ctx.fillStyle = '#7C3AED'
    ctx.shadowColor = '#7C3AED'
    ctx.shadowBlur = 6
    ctx.font = `bold 10px ${font}`
    ctx.textAlign = 'left'
    ctx.fillText(isZh ? `关卡 ${this.level}` : `Level ${this.level}`, 10, 20)
    ctx.shadowBlur = 0

    ctx.fillStyle = '#4a4a6a'
    ctx.font = `8px ${font}`
    ctx.fillText(isZh ? `波次 ${this.levelWaves}` : `Wave ${this.levelWaves}`, 10, 32)

    // Animated score（右上角）
    ctx.fillStyle = '#39ff14'
    ctx.font = `bold ${10 * (1 + this.scorePop * 0.3)}px ${font}`
    ctx.textAlign = 'right'
    ctx.fillText(`${Math.floor(this.displayScore).toLocaleString()}`, this.W - 10, 20)

    // Combo（右上角下方）
    if (this.combo >= 3) {
      ctx.fillStyle = this.comboMultiplier >= 5 ? '#FF2E88' : '#ffe600'
      ctx.shadowColor = ctx.fillStyle
      ctx.shadowBlur = 8
      ctx.font = `bold 9px ${font}`
      ctx.fillText(`x${this.comboMultiplier}`, this.W - 10, 32)
      ctx.shadowBlur = 0
      ctx.fillStyle = '#8a8aaa'
      ctx.font = `7px ${font}`
      ctx.fillText(`${this.combo}`, this.W - 25, 32)
    }

    // Lives（右上角）
    ctx.fillStyle = '#FF2E88'
    for (let i = 0; i < this.lives; i++) {
      ctx.fillRect(this.W - 15 - i * 12 - 60, 12, 8, 8)
    }

    // 进化信息（左侧下方）
    const evolveColors = ['#22D3EE', '#39ff14', '#ffe600', '#FF2E88']
    const evolveColor = evolveColors[Math.min(this.evolveLevel - 1, 3)]
    ctx.fillStyle = evolveColor
    ctx.shadowColor = evolveColor
    ctx.shadowBlur = 4
    ctx.font = `bold 7px ${font}`
    ctx.textAlign = 'left'
    ctx.fillText(isZh ? `进化 Lv${this.evolveLevel}` : `Evolve Lv${this.evolveLevel}`, 10, this.H - 8)
    ctx.shadowBlur = 0

    // 进化经验条
    if (this.evolveLevel < 4) {
      const expBarW = 40, expBarH = 3
      ctx.fillStyle = '#333'
      ctx.fillRect(10, this.H - 3, expBarW, expBarH)
      ctx.fillStyle = evolveColor
      ctx.fillRect(10, this.H - 3, expBarW * (this.evolveExp / this.evolveMaxExp), expBarH)
    }

    // 子弹等级（进化下方）
    const bulletColor = this.bulletLevel >= 15 ? '#ffffff' :
                        this.bulletLevel >= 10 ? '#ffe600' :
                        this.bulletLevel >= 5 ? '#FF2E88' : '#22D3EE'
    ctx.fillStyle = bulletColor
    ctx.shadowColor = bulletColor
    ctx.shadowBlur = this.bulletLevel >= 10 ? 8 : 4
    ctx.font = `bold 8px ${font}`
    ctx.fillText(isZh ? `子弹 Lv${this.bulletLevel}/${this.maxBulletLevel}` : `Bullet Lv${this.bulletLevel}/${this.maxBulletLevel}`, 55, this.H - 8)
    ctx.shadowBlur = 0

    // 技能条（底部中间）
    const barW = 80, barH = 5
    const barX = this.W / 2 - barW / 2, barY = this.H - 15
    ctx.fillStyle = '#1a1a2a'
    ctx.beginPath()
    ctx.roundRect(barX, barY, barW, barH, 2)
    ctx.fill()
    ctx.fillStyle = this.skillReady ? '#ffe600' : '#7C3AED'
    ctx.shadowColor = this.skillReady ? '#ffe600' : '#7C3AED'
    ctx.shadowBlur = this.skillReady ? 10 : 4
    ctx.beginPath()
    ctx.roundRect(barX, barY, barW * (this.skillEnergy / this.skillMax), barH, 2)
    ctx.fill()
    ctx.shadowBlur = 0
    if (this.skillReady) {
      ctx.fillStyle = '#ffe600'
      ctx.font = `bold 7px ${font}`
      ctx.textAlign = 'center'
      ctx.fillText(isZh ? '技能就绪 [空格]' : 'SKILL READY [SPACE]', this.W / 2, this.H - 22)
    }

    // Kill count（左侧更下方）
    ctx.fillStyle = '#4a4a6a'
    ctx.font = `7px ${font}`
    ctx.textAlign = 'left'
    ctx.fillText(isZh ? `击杀 ${this.killCount}` : `Kills ${this.killCount}`, 10, this.H - 20)

    // Boss HP条（如果Boss存在）
    if (this.boss && this.boss.entered) {
      const bossBarW = this.W * 0.6
      const bossBarH = 6
      const bossBarX = this.W / 2 - bossBarW / 2
      const bossBarY = 10
      const hpRatio = this.boss.hp / this.boss.maxHp
      const bossColor = this.boss.color || '#FF2E88'

      ctx.fillStyle = '#1a1a2a'
      ctx.beginPath()
      ctx.roundRect(bossBarX, bossBarY, bossBarW, bossBarH, 3)
      ctx.fill()

      const bossHpGrad = ctx.createLinearGradient(bossBarX, 0, bossBarX + bossBarW, 0)
      bossHpGrad.addColorStop(0, '#ff0000')
      bossHpGrad.addColorStop(0.5, bossColor)
      bossHpGrad.addColorStop(1, shadeColor(bossColor, 30))
      ctx.fillStyle = bossHpGrad
      ctx.shadowColor = bossColor
      ctx.shadowBlur = 6
      ctx.beginPath()
      ctx.roundRect(bossBarX, bossBarY, bossBarW * hpRatio, bossBarH, 3)
      ctx.fill()
      ctx.shadowBlur = 0

      // Boss名称
      ctx.fillStyle = bossColor
      ctx.font = `bold 8px ${font}`
      ctx.textAlign = 'center'
      ctx.fillText(this.boss.name || 'Boss', this.W / 2, bossBarY + bossBarH + 8)
    }
  }

  private renderGameOver(font: string) {
    const ctx = this.ctx
    ctx.fillStyle = 'rgba(10,10,24,0.85)'
    ctx.fillRect(0, 0, this.W, this.H)

    ctx.textAlign = 'center'

    ctx.fillStyle = '#FF2E88'
    ctx.font = `bold 16px ${font}`
    ctx.shadowColor = '#FF2E88'
    ctx.shadowBlur = 15
    ctx.fillText(t('game_over'), this.W / 2, this.H / 2 - 80)
    ctx.shadowBlur = 0

    ctx.fillStyle = '#22D3EE'
    ctx.font = `9px ${font}`
    ctx.fillText(t('shooter_reached_wave', { n: this.wave }), this.W / 2, this.H / 2 - 50)

    ctx.fillStyle = '#39ff14'
    ctx.font = `bold 10px ${font}`
    ctx.fillText(`${t('score')}: ${this.score.toLocaleString()}`, this.W / 2, this.H / 2 - 20)

    ctx.fillStyle = '#ffe600'
    ctx.font = `8px ${font}`
    ctx.fillText(t('shooter_best_combo', { n: this.bestCombo }), this.W / 2, this.H / 2 + 10)

    ctx.fillStyle = '#7C3AED'
    ctx.font = `7px ${font}`
    ctx.fillText(t('shooter_kills_count', { n: this.killCount }), this.W / 2, this.H / 2 + 30)

    ctx.fillStyle = '#22D3EE'
    ctx.font = `7px ${font}`
    ctx.fillText(t('shooter_base_damage', { n: this.totalBaseDamage }), this.W / 2, this.H / 2 + 48)

    const hs = parseInt(localStorage.getItem('neon_arcade_hs_shooter') || '0')
    if (this.score > hs) {
      localStorage.setItem('neon_arcade_hs_shooter', String(this.score))
      ctx.fillStyle = '#ffe600'
      ctx.shadowColor = '#ffe600'
      ctx.shadowBlur = 10
      ctx.font = `bold 9px ${font}`
      ctx.fillText(t('new_record'), this.W / 2, this.H / 2 + 70)
      ctx.shadowBlur = 0
    }

    const blink = Math.sin(performance.now() / 250) * 0.3 + 0.7
    ctx.fillStyle = `rgba(34, 211, 238, ${blink})`
    ctx.shadowColor = '#22D3EE'
    ctx.shadowBlur = 20
    ctx.font = `bold 10px ${font}`
    ctx.fillText(t('retry'), this.W / 2, this.H / 2 + 100)
    ctx.shadowBlur = 0
  }
}