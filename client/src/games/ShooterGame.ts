// ============================================
// SHOOTER GAME v5 — 飞机大战
// 波次系统 + 5级子弹升级 + Boss弹幕优化 + 永久伤害成长 + 中英双语
// ============================================

import { t, getGameFont, getLang } from '../i18n'

export class ShooterGame {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private W: number = 640
  private H: number = 800
  private dpr: number = 1
  private animId = 0
  private running = false
  private state: 'title' | 'playing' | 'gameover' = 'title'

  // ====== 波次系统 ======
  private wave = 0
  private waveEnemiesLeft = 0
  private waveSpawnedCount = 0
  private waveTotalEnemies = 0
  private waveSpawnTimer = 0
  private waveSpawnInterval = 0
  private waveCooldown = 0
  private waveBoss = false
  private waveEnemiesKilled = 0
  private waveDamageTaken = false  // 本波是否受伤

  // Player
  private px = 0; private py = 0
  private pw = 30; private ph = 30
  private speed = 5
  private lives = 3
  private maxLives = 5
  private invincible = 0
  private autoFire = true
  private fireTimer = 0
  private fireRate = 10

  // ====== 5级子弹升级系统 ======
  // Lv1: 单发  Lv2: 双发  Lv3: 三发扇形  Lv4: 四发+追踪  Lv5: 五发密集+大弹
  private bulletLevel = 1  // 1-5

  // ====== 永久伤害成长 ======
  private baseDamage = 1          // 基础伤害（每3000分+1）
  private lastDamageMilestone = 0 // 上次加伤害时的分数门槛
  private totalBaseDamage = 1     // 总基础伤害 = baseDamage

  // Score + Combo
  private score = 0
  private combo = 0
  private comboTimer = 0
  private comboWindow = 180
  private bestCombo = 0
  private comboMultiplier = 1

  // ====== 成就反馈系统 ======
  private floatingTexts: { text: string; x: number; y: number; vy: number; timer: number; maxTimer: number; color: string; size: number }[] = []
  private killCount = 0
  private milestoneShown: Set<number> = new Set()

  // Skill system
  private skillEnergy = 0
  private skillMax = 100
  private skillReady = false

  // Enemies
  private enemies: any[] = []
  private difficulty = 1

  // Boss
  private boss: any = null
  private bossWarningTimer = 0

  // Bullets
  private playerBullets: any[] = []
  private enemyBullets: any[] = []

  // Pickups
  private pickups: any[] = []

  // Particles
  private particles: any[] = []
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

  private setupInput() {
    const kd = (e: KeyboardEvent) => {
      this.keys.add(e.key)
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault()
      if (this.state === 'title') { this.state = 'playing'; this.startFirstWave() }
      if (this.state === 'gameover' && (e.key === 'r' || e.key === 'R')) { this.state = 'playing'; this.resetGame() }
      if (e.key === ' ' && this.state === 'playing' && this.skillReady) this.useSkill()
    }
    const ku = (e: KeyboardEvent) => this.keys.delete(e.key)

    const ts = (e: TouchEvent) => {
      e.preventDefault()
      const t = e.touches[0]
      const rect = this.canvas.getBoundingClientRect()
      this.touchStart = { x: t.clientX - rect.left, y: t.clientY - rect.top }
      this.touchCurrent = { ...this.touchStart }
      if (this.state === 'title') { this.state = 'playing'; this.startFirstWave() }
      if (this.state === 'gameover') { this.state = 'playing'; this.resetGame() }
    }
    const tm = (e: TouchEvent) => {
      e.preventDefault()
      const t = e.touches[0]
      const rect = this.canvas.getBoundingClientRect()
      this.touchCurrent = { x: t.clientX - rect.left, y: t.clientY - rect.top }
    }
    const te = () => { this.touchStart = null; this.touchCurrent = null }

    let lastTap = 0
    const tap = (e: TouchEvent) => {
      const now = Date.now()
      if (now - lastTap < 300 && this.skillReady && this.state === 'playing') {
        this.useSkill()
      }
      lastTap = now
    }

    this.canvas.addEventListener('keydown', kd)
    this.canvas.addEventListener('keyup', ku)
    this.canvas.addEventListener('touchstart', ts, { passive: false })
    this.canvas.addEventListener('touchmove', tm, { passive: false })
    this.canvas.addEventListener('touchend', te)
    this.canvas.addEventListener('touchstart', tap)
    this.canvas.setAttribute('tabindex', '0')
    this.canvas.focus()
  }

  private resetGame() {
    this.px = this.W / 2
    this.py = this.H - 80
    this.lives = 3
    this.score = 0
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
    this.startFirstWave()
  }

  // ====== 波次系统核心（加长） ======

  private startFirstWave() {
    this.startWave(1)
  }

  private startWave(waveNum: number) {
    this.wave = waveNum
    this.waveSpawnedCount = 0
    this.waveEnemiesKilled = 0
    this.waveDamageTaken = false

    this.waveBoss = waveNum > 1 && waveNum % 5 === 0

    if (this.waveBoss) {
      // Boss波：杂兵更多，但节奏不赶
      this.waveTotalEnemies = 3 + waveNum
      this.waveSpawnInterval = Math.max(45, 80 - waveNum * 2)
    } else {
      // 普通波：从4起步，增长更缓，上限30
      // Wave1=4, Wave2=5, Wave3=5, Wave5=7, Wave10=12, Wave20=20, 上限30
      this.waveTotalEnemies = Math.min(3 + waveNum, 30)
      // 生成间隔：前期慢，后期也不太快
      // Wave1=80, Wave2=74, Wave3=68... 下限38
      this.waveSpawnInterval = Math.max(38, 80 - waveNum * 4)
    }

    this.waveEnemiesLeft = this.waveTotalEnemies
    this.waveSpawnTimer = 0
    this.difficulty = 1 + (waveNum - 1) * 0.07  // 每波+7%难度（更缓）

    // 直接进入 playing，不再停顿显示"第X波"
    this.state = 'playing'
  }

  // ====== 技能 ======

  private useSkill() {
    if (!this.skillReady) return
    this.skillEnergy = 0
    this.skillReady = false

    this.flashTimer = 10

    for (const e of this.enemies) {
      this.score += e.score || 10
      this.spawnExplosion(e.x, e.y, e.size || 10)
    }
    this.enemyBullets = []
    if (this.boss) {
      this.boss.hp -= this.boss.maxHp * 0.25
      this.spawnExplosion(this.boss.x, this.boss.y, 30)
    }
    this.enemies = []
    this.onScoreUpdate(this.score)
    this.addFloatingText(t('shooter_bomb'), this.W / 2, this.H / 2, '#ffe600', 16)
  }

  start() {
    this.running = true
    this.px = this.W / 2
    this.py = this.H - 80
    this.loop()
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

  // ========== UPDATE ==========

  private update() {
    if (this.state !== 'playing') return

    this.updateWaveSpawning()
    this.updatePlayerMovement()

    if (this.autoFire) {
      this.fireTimer++
      if (this.fireTimer >= this.fireRate) {
        this.fireTimer = 0
        this.firePlayerBullets()
      }
    }

    if (this.comboTimer > 0) {
      this.comboTimer--
      if (this.comboTimer <= 0) {
        if (this.combo >= 5) {
          this.comboDisplay = { text: t('shooter_combo_break'), timer: 60, x: this.W / 2, y: this.H / 2 - 50 }
        }
        this.combo = 0
        this.comboMultiplier = 1
      }
    }

    if (this.invincible > 0) this.invincible--

    this.updateBullets()
    this.updateEnemies()
    this.updatePickups()
    this.updateParticles()
    this.checkCollisions()
    this.updateFloatingTexts()

    // 永久伤害成长：每3000分+1基础伤害
    this.checkDamageGrowth()

    if (this.skillEnergy >= this.skillMax) {
      this.skillReady = true
    }

    if (this.comboDisplay.timer > 0) this.comboDisplay.timer--
    if (this.flashTimer > 0) this.flashTimer--
  }

  // ====== 永久伤害成长 ======
  private checkDamageGrowth() {
    const milestone = Math.floor(this.score / 3000) * 3000
    if (milestone > this.lastDamageMilestone && this.lastDamageMilestone >= 0) {
      this.lastDamageMilestone = milestone
      this.baseDamage++
      this.totalBaseDamage = this.baseDamage
      this.addFloatingText(t('shooter_damage_up'), this.W / 2, this.H / 2 + 30, '#7C3AED', 12)
    }
  }

  private updatePlayerMovement() {
    let dx = 0, dy = 0
    if (this.keys.has('ArrowLeft') || this.keys.has('a')) dx -= this.speed
    if (this.keys.has('ArrowRight') || this.keys.has('d')) dx += this.speed
    if (this.keys.has('ArrowUp') || this.keys.has('w')) dy -= this.speed
    if (this.keys.has('ArrowDown') || this.keys.has('s')) dy += this.speed

    if (this.touchStart && this.touchCurrent) {
      const tdx = this.touchCurrent.x - this.touchStart.x
      const tdy = this.touchCurrent.y - this.touchStart.y
      if (Math.abs(tdx) > 8) dx += Math.sign(tdx) * Math.min(Math.abs(tdx) * 0.15, this.speed)
      if (Math.abs(tdy) > 8) dy += Math.sign(tdy) * Math.min(Math.abs(tdy) * 0.15, this.speed)
    }

    this.px = Math.max(this.pw / 2, Math.min(this.W - this.pw / 2, this.px + dx))
    this.py = Math.max(this.ph / 2, Math.min(this.H - this.ph / 2, this.py + dy))
  }

  private updateWaveSpawning() {
    if (this.waveCooldown > 0) {
      this.waveCooldown--
      if (this.waveCooldown <= 0) {
        this.startWave(this.wave + 1)
      }
      return
    }

    if (this.waveSpawnedCount < this.waveTotalEnemies) {
      this.waveSpawnTimer++
      if (this.waveSpawnTimer >= this.waveSpawnInterval) {
        this.waveSpawnTimer = 0
        this.spawnEnemy()
        this.waveSpawnedCount++
      }
    }

    // Boss生成：杂兵全清后才出警告
    if (this.waveBoss && !this.boss && this.waveSpawnedCount >= this.waveTotalEnemies && this.enemies.length === 0) {
      if (this.bossWarningTimer <= 0) {
        this.bossWarningTimer = 90 // 1.5秒警告
      }
      this.bossWarningTimer--
      if (this.bossWarningTimer <= 0) {
        this.spawnBoss()
      }
    }

    const bossDone = this.waveBoss ? !this.boss : true
    if (this.waveSpawnedCount >= this.waveTotalEnemies && this.enemies.length === 0 && bossDone) {
      this.onWaveComplete()
    }
  }

  private onWaveComplete() {
    const waveBonus = this.wave * 50
    this.score += waveBonus
    this.onScoreUpdate(this.score)
    this.addFloatingText(t('shooter_wave_clear', { n: this.wave, bonus: waveBonus }), this.W / 2, this.H / 2 - 30, '#22D3EE', 12)

    // 完美波次（本波无伤）
    if (!this.waveDamageTaken) {
      const perfectBonus = this.wave * 100
      this.score += perfectBonus
      this.onScoreUpdate(this.score)
      this.addFloatingText(t('shooter_perfect', { bonus: perfectBonus }), this.W / 2, this.H / 2, '#39ff14', 14)
    }

    // 波次间休息：更充裕
    // Wave1=150帧(2.5s), Wave5=190帧(3.2s), Wave10=240帧(4s)
    this.waveCooldown = Math.min(300, 120 + this.wave * 14)
  }

  // ====== 5级子弹系统 ======
  private firePlayerBullets() {
    const bspeed = -8
    const cx = this.px
    const cy = this.py - this.ph / 2
    const dmg = this.totalBaseDamage

    // 子弹颜色随等级变化
    const bulletColors = ['#22D3EE', '#39ff14', '#ffe600', '#FF2E88', '#7C3AED']
    const color = bulletColors[this.bulletLevel - 1] || '#22D3EE'
    const bsize = this.bulletLevel >= 4 ? 5 : 4

    switch (this.bulletLevel) {
      case 1: // Lv1: 单发直射
        this.playerBullets.push({ x: cx, y: cy, vx: 0, vy: bspeed, size: bsize, dmg, color })
        break

      case 2: // Lv2: 双发平行
        this.playerBullets.push({ x: cx - 7, y: cy, vx: 0, vy: bspeed, size: bsize, dmg, color })
        this.playerBullets.push({ x: cx + 7, y: cy, vx: 0, vy: bspeed, size: bsize, dmg, color })
        break

      case 3: // Lv3: 三发扇形（-10°/0°/+10°）
        for (let i = -1; i <= 1; i++) {
          const angle = -Math.PI / 2 + i * 0.17
          this.playerBullets.push({
            x: cx, y: cy,
            vx: Math.cos(angle) * 8, vy: Math.sin(angle) * 8,
            size: bsize, dmg, color
          })
        }
        break

      case 4: // Lv4: 双排 + 两侧追踪弹
        // 双排
        this.playerBullets.push({ x: cx - 8, y: cy, vx: 0, vy: bspeed, size: bsize, dmg, color })
        this.playerBullets.push({ x: cx + 8, y: cy, vx: 0, vy: bspeed, size: bsize, dmg, color })
        // 侧翼弧形弹
        this.playerBullets.push({
          x: cx - 12, y: cy + 5,
          vx: -1.5, vy: bspeed * 0.9,
          size: 3, dmg: Math.max(1, dmg - 1), color: '#39ff14'
        })
        this.playerBullets.push({
          x: cx + 12, y: cy + 5,
          vx: 1.5, vy: bspeed * 0.9,
          size: 3, dmg: Math.max(1, dmg - 1), color: '#39ff14'
        })
        break

      case 5: // Lv5: 五发密集扇形 + 大核心弹
        // 五发扇形
        for (let i = -2; i <= 2; i++) {
          const angle = -Math.PI / 2 + i * 0.13
          this.playerBullets.push({
            x: cx + i * 3, y: cy,
            vx: Math.cos(angle) * 8, vy: Math.sin(angle) * 8,
            size: bsize, dmg, color
          })
        }
        // 大核心弹
        this.playerBullets.push({
          x: cx, y: cy - 5,
          vx: 0, vy: bspeed * 1.3,
          size: 8, dmg: dmg + 1, color: '#7C3AED', isLaser: true
        })
        break
    }
  }

  private spawnEnemy() {
    const types: string[] = ['small', 'small', 'small']

    if (this.wave >= 2) types.push('shooter')
    if (this.wave >= 3) types.push('heavy', 'shooter')
    if (this.wave >= 4) types.push('kamikaze')
    if (this.wave >= 6) types.push('kamikaze', 'heavy')
    if (this.wave >= 8) types.push('shooter', 'kamikaze', 'heavy')

    const type = types[Math.floor(Math.random() * types.length)]
    const x = 30 + Math.random() * (this.W - 60)
    let enemy: any

    const speedMult = 1 + (this.wave - 1) * 0.03  // 每波+3%（更缓）

    switch (type) {
      case 'small':
        enemy = {
          x, y: -20,
          vx: (Math.random() - 0.5) * 1.2, vy: (1.2 + Math.random() * 0.6) * speedMult,
          hp: 1, maxHp: 1, size: 12, type, score: 10,
          color: '#22D3EE',
        }
        break
      case 'heavy':
        enemy = {
          x, y: -20,
          vx: (Math.random() - 0.5) * 0.3, vy: (0.6 + Math.random() * 0.3) * speedMult,
          hp: 3 + Math.floor(this.wave / 3), maxHp: 3 + Math.floor(this.wave / 3),
          size: 20, type, score: 30 + this.wave * 2,
          color: '#7C3AED', fireTimer: 0, fireRate: Math.max(70, 120 - this.wave * 3)
        }
        break
      case 'shooter':
        enemy = {
          x, y: -20,
          vx: (Math.random() - 0.5) * 0.8, vy: (0.8 + Math.random() * 0.4) * speedMult,
          hp: 2, maxHp: 2, size: 14, type, score: 20 + this.wave,
          color: '#FF2E88', fireTimer: 0, fireRate: Math.max(60, 100 - this.wave * 2)
        }
        break
      case 'kamikaze':
        enemy = {
          x, y: -20,
          vx: 0, vy: (1.5 + Math.random() * 0.8) * speedMult,
          hp: 1, maxHp: 1, size: 10, type, score: 15 + this.wave,
          color: '#ffe600', targetX: this.px, targetY: this.py
        }
        break
    }
    this.enemies.push(enemy)
  }

  private spawnBoss() {
    const bossWave = Math.floor(this.wave / 5)
    this.boss = {
      x: this.W / 2, y: -60, vy: 1,
      hp: 40 + bossWave * 25, maxHp: 40 + bossWave * 25,
      size: 50, phase: 0, fireTimer: 0,
      moveDir: 1, entered: false,
      phaseTimer: 0,
    }
  }

  private updateBullets() {
    for (let i = this.playerBullets.length - 1; i >= 0; i--) {
      const b = this.playerBullets[i]
      b.x += b.vx; b.y += b.vy
      if (b.y < -10 || b.y > this.H + 10 || b.x < -10 || b.x > this.W + 10) {
        this.playerBullets.splice(i, 1)
      }
    }
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i]
      b.x += b.vx; b.y += b.vy
      if (b.y < -10 || b.y > this.H + 10 || b.x < -10 || b.x > this.W + 10) {
        this.enemyBullets.splice(i, 1)
      }
    }
  }

  private updateEnemies() {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]
      if (e.type === 'kamikaze' && e.targetX !== undefined) {
        const angle = Math.atan2(this.py - e.y, this.px - e.x)
        e.vx = Math.cos(angle) * 2.5
        e.vy = Math.sin(angle) * 2.5
      }
      e.x += e.vx; e.y += e.vy

      if ((e.type === 'shooter' || e.type === 'heavy') && e.y > 20 && e.y < this.H * 0.5) {
        e.fireTimer = (e.fireTimer || 0) + 1
        if (e.fireTimer >= (e.fireRate || 60)) {
          e.fireTimer = 0
          const angle = Math.atan2(this.py - e.y, this.px - e.x)
          const bulletSpeed = 2 + this.wave * 0.03
          this.enemyBullets.push({
            x: e.x, y: e.y + e.size,
            vx: Math.cos(angle) * bulletSpeed, vy: Math.sin(angle) * bulletSpeed,
            size: 4, color: e.color
          })
        }
      }

      if (e.y > this.H + 30 || e.x < -30 || e.x > this.W + 30) {
        this.enemies.splice(i, 1)
      }
    }

    // Boss AI — 三阶段，弹幕大幅减密
    if (this.boss) {
      if (!this.boss.entered) {
        this.boss.y += this.boss.vy
        if (this.boss.y >= 80) { this.boss.entered = true }
      } else {
        this.boss.x += this.boss.moveDir * (1.5 + this.wave * 0.08)
        if (this.boss.x > this.W - 60 || this.boss.x < 60) this.boss.moveDir *= -1

        this.boss.fireTimer++
        this.boss.phaseTimer++

        const hpRatio = this.boss.hp / this.boss.maxHp

        if (hpRatio > 0.6) {
          // 阶段1（HP>60%）：慢散射，每30帧5发
          if (this.boss.fireTimer % 30 === 0) {
            for (let a = -0.4; a <= 0.4; a += 0.2) {
              this.enemyBullets.push({
                x: this.boss.x, y: this.boss.y + this.boss.size,
                vx: Math.sin(a) * 2.2, vy: 2.8,
                size: 4, color: '#FF2E88'
              })
            }
          }
        } else if (hpRatio > 0.3) {
          // 阶段2（30%-60%）：每22帧散射 + 每80帧追踪弹
          if (this.boss.fireTimer % 22 === 0) {
            for (let a = -0.5; a <= 0.5; a += 0.25) {
              this.enemyBullets.push({
                x: this.boss.x, y: this.boss.y + this.boss.size,
                vx: Math.sin(a) * 2.5, vy: 3,
                size: 4, color: '#FF2E88'
              })
            }
          }
          if (this.boss.fireTimer % 80 === 0) {
            const angle = Math.atan2(this.py - this.boss.y, this.px - this.boss.x)
            this.enemyBullets.push({
              x: this.boss.x, y: this.boss.y + this.boss.size,
              vx: Math.cos(angle) * 3.5, vy: Math.sin(angle) * 3.5,
              size: 6, color: '#ffe600'
            })
          }
        } else {
          // 阶段3（HP<30%）：每16帧散射 + 每60帧追踪3发
          if (this.boss.fireTimer % 16 === 0) {
            for (let a = -0.6; a <= 0.6; a += 0.3) {
              this.enemyBullets.push({
                x: this.boss.x, y: this.boss.y + this.boss.size,
                vx: Math.sin(a) * 2.8, vy: 3.2,
                size: 4, color: '#FF2E88'
              })
            }
          }
          if (this.boss.fireTimer % 60 === 0) {
            const angle = Math.atan2(this.py - this.boss.y, this.px - this.boss.x)
            for (let i = -1; i <= 1; i++) {
              this.enemyBullets.push({
                x: this.boss.x, y: this.boss.y + this.boss.size,
                vx: Math.cos(angle + i * 0.15) * 4, vy: Math.sin(angle + i * 0.15) * 4,
                size: 6, color: '#ffe600'
              })
            }
          }
          this.boss.phase = 2
        }
      }

      if (this.boss.hp <= 0) {
        const bossScore = 300 + this.wave * 50
        this.score += bossScore
        this.spawnExplosion(this.boss.x, this.boss.y, 60)
        this.spawnExplosion(this.boss.x - 30, this.boss.y + 20, 40)
        this.spawnExplosion(this.boss.x + 30, this.boss.y - 10, 40)
        // Boss必掉武器升级
        this.pickups.push({ x: this.boss.x, y: this.boss.y, vy: 2, type: 'weapon', size: 16 })
        this.pickups.push({ x: this.boss.x - 20, y: this.boss.y + 10, vy: 2, type: 'energy', size: 12 })
        this.addFloatingText(t('shooter_boss_down', { bonus: bossScore }), this.W / 2, this.H / 3, '#ffe600', 14)
        this.boss = null
        this.bossWarningTimer = 0
        this.onScoreUpdate(this.score)
      }
    }
  }

  private updatePickups() {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i]
      p.y += p.vy
      if (p.y > this.H + 20) { this.pickups.splice(i, 1); continue }

      const dx = p.x - this.px, dy = p.y - this.py
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 60) {
        const pullSpeed = 4
        p.x -= (dx / dist) * pullSpeed
        p.y -= (dy / dist) * pullSpeed
      }
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
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

  // ====== 子弹升级（1-5级） ======
  private upgradeBullet() {
    if (this.bulletLevel < 5) {
      this.bulletLevel++
      const levelNames = ['', 'SINGLE', 'DOUBLE', 'SPREAD', 'TRACK', 'MEGA']
      const name = getLang() === 'zh'
        ? ['', '单发', '双发', '扩散', '追踪', '密集'][this.bulletLevel]
        : levelNames[this.bulletLevel]
      this.addFloatingText(`Lv${this.bulletLevel} ${name}!`, this.px, this.py - 40, '#FF2E88', 10)
    } else {
      // 已满级，给额外分数
      const bonus = 200
      this.score += bonus
      this.onScoreUpdate(this.score)
      this.addFloatingText(`+${bonus}`, this.px, this.py - 40, '#ffe600', 10)
    }
  }

  private updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx; p.y += p.vy
      p.vy += p.gravity || 0
      p.life--
      if (p.life <= 0) this.particles.splice(i, 1)
    }
  }

  private updateFloatingTexts() {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i]
      ft.y += ft.vy
      ft.timer--
      if (ft.timer <= 0) this.floatingTexts.splice(i, 1)
    }
  }

  private addFloatingText(text: string, x: number, y: number, color: string, size: number) {
    this.floatingTexts.push({
      text, x, y, vy: -0.8,
      timer: 70, maxTimer: 70,
      color, size
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
          if (e.hp <= 0) {
            this.onEnemyKilled(e)
            this.enemies.splice(ei, 1)
          }
          break
        }
      }

      // Player bullets vs boss
      if (this.boss && this.boss.entered && bi < this.playerBullets.length) {
        const b2 = this.playerBullets[bi]
        if (b2 && Math.abs(b2.x - this.boss.x) < this.boss.size + b2.size && Math.abs(b2.y - this.boss.y) < this.boss.size + b2.size) {
          this.boss.hp -= b2.dmg
          this.spawnHitFlash(b2.x, b2.y)
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

      // Enemies vs player
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
    this.skillEnergy = Math.min(this.skillEnergy + 5 + this.combo * 0.2, this.skillMax)
    this.onScoreUpdate(this.score)

    this.spawnExplosion(e.x, e.y, e.size)
    this.addFloatingText(`+${points}`, e.x, e.y - 10, '#39ff14', 8)

    if (this.combo >= 5 && this.combo % 5 === 0) {
      this.comboDisplay = { text: `x${this.comboMultiplier} COMBO!`, timer: 90, x: e.x, y: e.y }
      this.addFloatingText(t('shooter_combo', { n: this.combo }), this.W / 2, this.H / 2 - 60, '#ffe600', 14)
    }

    // 击杀里程碑
    const milestones = [10, 25, 50, 100, 200]
    for (const m of milestones) {
      if (this.killCount >= m && !this.milestoneShown.has(m)) {
        this.milestoneShown.add(m)
        const bonus = m * 5
        this.score += bonus
        this.onScoreUpdate(this.score)
        this.addFloatingText(t('shooter_kills', { n: m, bonus }), this.W / 2, this.H / 2, '#7C3AED', 13)
      }
    }

    // 随机掉落
    const dropRate = this.wave <= 2 ? 0.12 : 0.20
    if (Math.random() < dropRate) {
      const types = this.wave <= 2
        ? ['energy', 'energy', 'weapon']
        : ['weapon', 'weapon', 'energy', 'health']
      this.pickups.push({
        x: e.x, y: e.y, vy: 2,
        type: types[Math.floor(Math.random() * types.length)],
        size: 12
      })
    }
  }

  private playerHit() {
    this.lives--
    this.invincible = 120
    this.flashTimer = 5
    this.combo = 0
    this.comboTimer = 0
    this.comboMultiplier = 1
    this.waveDamageTaken = true

    // 子弹降一级
    if (this.bulletLevel > 1) {
      this.bulletLevel--
      this.addFloatingText(t('shooter_weapon_down'), this.px, this.py - 30, '#FF2E88', 9)
    }

    if (this.lives <= 0) {
      this.state = 'gameover'
      const coins = Math.floor(this.score / 100)
      try {
        const { useGameStore } = require('../store/gameStore')
        const store = useGameStore.getState()
        store.addCoins(coins)
      } catch {}
    }
  }

  private spawnExplosion(x: number, y: number, size: number) {
    const count = Math.min(size * 2, 30)
    const colors = ['#22D3EE', '#7C3AED', '#FF2E88', '#ffe600', '#39ff14']
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * 4 + 1
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 30 + Math.random() * 20,
        gravity: 0.05,
      })
    }
  }

  private spawnHitFlash(x: number, y: number) {
    this.particles.push({
      x, y, vx: 0, vy: 0, size: 8, color: '#ffffff', life: 5, gravity: 0
    })
  }

  // ========== RENDER ==========

  private render() {
    const ctx = this.ctx
    const font = getGameFont()
    ctx.save()

    // Background
    ctx.fillStyle = '#0a0a18'
    ctx.fillRect(0, 0, this.W, this.H)

    // Stars
    ctx.fillStyle = '#1a1a3a'
    for (let i = 0; i < 50; i++) {
      const sx = (i * 137.5 + this.wave * 3) % this.W
      const sy = (i * 97.3 + (Date.now() / 30) * (0.5 + (i % 3) * 0.3)) % this.H
      ctx.fillRect(sx, sy, 1, 1)
    }

    // Flash
    if (this.flashTimer > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flashTimer * 0.05})`
      ctx.fillRect(0, 0, this.W, this.H)
    }

    if (this.state === 'title') {
      this.renderTitle(font)
    } else if (this.state === 'gameover') {
      this.renderGame(font)
      this.renderGameOver(font)
    } else {
      this.renderGame(font)
    }

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

    ctx.fillStyle = '#4a4a6a'
    ctx.font = `11px ${font}`
    const blink = Math.sin(Date.now() / 300) > 0
    if (blink) ctx.fillText(t('tap_start'), this.W / 2, this.H / 2 + 60)
  }

  private renderGame(font: string) {
    const ctx = this.ctx

    // Boss warning
    if (this.bossWarningTimer > 0) {
      const alpha = Math.sin(this.bossWarningTimer * 0.1) * 0.5 + 0.5
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

    // Pickups
    for (const p of this.pickups) {
      ctx.save()
      ctx.translate(p.x, p.y)
      const glow = p.type === 'weapon' ? '#FF2E88' : p.type === 'health' ? '#39ff14' : '#ffe600'
      ctx.shadowColor = glow
      ctx.shadowBlur = 8
      ctx.fillStyle = glow
      if (p.type === 'weapon') {
        ctx.fillRect(-6, -2, 12, 4)
        ctx.fillRect(-2, -6, 4, 12)
      } else if (p.type === 'health') {
        ctx.fillRect(-5, -2, 10, 4)
        ctx.fillRect(-2, -5, 4, 10)
      } else {
        ctx.beginPath()
        ctx.arc(0, 0, 6, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }

    // Enemy bullets
    for (const b of this.enemyBullets) {
      ctx.fillStyle = b.color || '#FF2E88'
      ctx.shadowColor = b.color || '#FF2E88'
      ctx.shadowBlur = 6
      ctx.beginPath()
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    }

    // Enemies
    for (const e of this.enemies) {
      ctx.save()
      ctx.translate(e.x, e.y)
      ctx.fillStyle = e.color
      ctx.shadowColor = e.color
      ctx.shadowBlur = 6

      switch (e.type) {
        case 'small':
          ctx.fillRect(-e.size / 2, -e.size / 2, e.size, e.size)
          break
        case 'heavy':
          ctx.fillRect(-e.size / 2, -e.size / 2, e.size, e.size)
          ctx.fillStyle = '#0a0a18'
          ctx.fillRect(-e.size / 4, -e.size / 4, e.size / 2, e.size / 2)
          break
        case 'shooter':
          ctx.beginPath()
          ctx.moveTo(0, -e.size)
          ctx.lineTo(e.size, e.size)
          ctx.lineTo(-e.size, e.size)
          ctx.closePath()
          ctx.fill()
          break
        case 'kamikaze':
          ctx.beginPath()
          ctx.moveTo(0, e.size)
          ctx.lineTo(e.size * 0.7, -e.size * 0.5)
          ctx.lineTo(-e.size * 0.7, -e.size * 0.5)
          ctx.closePath()
          ctx.fill()
          break
      }

      if (e.maxHp > 1) {
        ctx.shadowBlur = 0
        ctx.fillStyle = '#333'
        ctx.fillRect(-e.size / 2, -e.size - 6, e.size, 3)
        ctx.fillStyle = e.color
        ctx.fillRect(-e.size / 2, -e.size - 6, e.size * (e.hp / e.maxHp), 3)
      }
      ctx.restore()
    }

    // Boss
    if (this.boss) {
      const b = this.boss
      const hpRatio = b.hp / b.maxHp
      const bossColor = hpRatio < 0.3 ? '#ffe600' : '#FF2E88'

      ctx.save()
      ctx.translate(b.x, b.y)

      ctx.fillStyle = bossColor
      ctx.shadowColor = bossColor
      ctx.shadowBlur = hpRatio < 0.3 ? 20 : 15
      ctx.fillRect(-b.size / 2, -b.size / 2, b.size, b.size)
      ctx.fillStyle = '#0a0a18'
      ctx.fillRect(-b.size / 3, -b.size / 3, b.size * 2 / 3, b.size * 2 / 3)
      ctx.fillStyle = bossColor
      ctx.fillRect(-b.size / 6, -b.size / 6, b.size / 3, b.size / 3)

      if (b.phase === 2) {
        const shake = (Math.random() - 0.5) * 4
        ctx.translate(shake, shake)
      }

      ctx.shadowBlur = 0
      const bw = this.W * 0.6
      ctx.fillStyle = '#333'
      ctx.fillRect(-bw / 2, -b.size - 15, bw, 5)
      ctx.fillStyle = bossColor
      ctx.fillRect(-bw / 2, -b.size - 15, bw * hpRatio, 5)

      ctx.restore()
    }

    // Player bullets — 每级不同颜色和形态
    const bulletColors = ['#22D3EE', '#39ff14', '#ffe600', '#FF2E88', '#7C3AED']
    for (const b of this.playerBullets) {
      const bColor = b.color || bulletColors[this.bulletLevel - 1] || '#22D3EE'
      ctx.fillStyle = bColor
      ctx.shadowColor = bColor
      ctx.shadowBlur = b.isLaser ? 12 : 6
      if (b.isLaser) {
        ctx.fillRect(b.x - b.size / 2, b.y - 8, b.size, 16)
      } else {
        // 高级子弹更圆润
        if (this.bulletLevel >= 3) {
          ctx.beginPath()
          ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.fillRect(b.x - b.size / 2, b.y - b.size / 2, b.size, b.size * 2)
        }
      }
    }
    ctx.shadowBlur = 0

    // Player
    if (this.state !== 'gameover') {
      ctx.save()
      ctx.translate(this.px, this.py)
      if (this.invincible > 0 && Math.floor(this.invincible / 4) % 2 === 0) {
        ctx.globalAlpha = 0.4
      }

      ctx.fillStyle = '#22D3EE'
      ctx.shadowColor = '#22D3EE'
      ctx.shadowBlur = 10
      ctx.beginPath()
      ctx.moveTo(0, -this.ph / 2)
      ctx.lineTo(this.pw / 2, this.ph / 2)
      ctx.lineTo(0, this.ph / 3)
      ctx.lineTo(-this.pw / 2, this.ph / 2)
      ctx.closePath()
      ctx.fill()

      // Engine glow
      ctx.fillStyle = '#ffe600'
      ctx.shadowColor = '#ffe600'
      ctx.shadowBlur = 8
      const flicker = 3 + Math.random() * 4
      ctx.fillRect(-4, this.ph / 3, 8, flicker)

      // 子弹等级光环
      if (this.bulletLevel >= 3) {
        const auraColors = ['', '', '#ffe600', '#FF2E88', '#7C3AED']
        ctx.strokeStyle = auraColors[this.bulletLevel]
        ctx.shadowColor = auraColors[this.bulletLevel]
        ctx.shadowBlur = 6
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(0, 0, this.pw * 0.7, 0, Math.PI * 2)
        ctx.stroke()
      }

      if (this.invincible > 0) {
        ctx.strokeStyle = `rgba(34, 211, 238, ${0.3 + Math.sin(Date.now() / 50) * 0.2})`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(0, 0, this.pw * 0.8, 0, Math.PI * 2)
        ctx.stroke()
      }

      ctx.restore()
    }

    // Particles
    for (const p of this.particles) {
      const alpha = Math.min(1, p.life / 20)
      ctx.globalAlpha = alpha
      ctx.fillStyle = p.color
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
    }
    ctx.globalAlpha = 1

    // Floating texts
    for (const ft of this.floatingTexts) {
      const alpha = Math.min(1, ft.timer / 20)
      ctx.globalAlpha = alpha
      ctx.fillStyle = ft.color
      ctx.shadowColor = ft.color
      ctx.shadowBlur = 8
      ctx.font = `${ft.size}px ${font}`
      ctx.textAlign = 'center'
      ctx.fillText(ft.text, ft.x, ft.y)
      ctx.shadowBlur = 0
    }
    ctx.globalAlpha = 1

    // Combo display
    if (this.comboDisplay.timer > 0) {
      const alpha = Math.min(1, this.comboDisplay.timer / 30)
      ctx.globalAlpha = alpha
      ctx.fillStyle = '#ffe600'
      ctx.shadowColor = '#ffe600'
      ctx.shadowBlur = 15
      ctx.font = this.comboDisplay.text.includes('BREAK') ? `8px ${font}` : `bold 10px ${font}`
      ctx.textAlign = 'center'
      ctx.fillText(this.comboDisplay.text, this.comboDisplay.x, this.comboDisplay.y - (90 - this.comboDisplay.timer) * 0.5)
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1
    }

    // HUD
    this.renderHUD(font)
  }

  private renderHUD(font: string) {
    const ctx = this.ctx

    // Score
    ctx.fillStyle = '#39ff14'
    ctx.font = `bold 9px ${font}`
    ctx.textAlign = 'left'
    ctx.fillText(`${this.score.toLocaleString()}`, 10, 20)

    // Wave
    ctx.fillStyle = '#4a4a6a'
    ctx.font = `8px ${font}`
    ctx.fillText(`W${this.wave}`, 10, 32)

    // Combo
    if (this.combo >= 3) {
      ctx.fillStyle = this.comboMultiplier >= 5 ? '#FF2E88' : '#ffe600'
      ctx.shadowColor = ctx.fillStyle
      ctx.shadowBlur = 8
      ctx.font = `bold 9px ${font}`
      ctx.fillText(`x${this.comboMultiplier}`, 55, 20)
      ctx.shadowBlur = 0
      ctx.fillStyle = '#8a8aaa'
      ctx.font = `7px ${font}`
      ctx.fillText(`${this.combo}`, 55, 32)
    }

    // Lives
    ctx.fillStyle = '#FF2E88'
    ctx.textAlign = 'right'
    for (let i = 0; i < this.lives; i++) {
      ctx.fillRect(this.W - 15 - i * 16, 12, 10, 10)
    }

    // Skill bar
    const barW = 60
    const barH = 6
    const barX = this.W - barW - 10
    const barY = 28
    ctx.fillStyle = '#333'
    ctx.fillRect(barX, barY, barW, barH)
    ctx.fillStyle = this.skillReady ? '#ffe600' : '#7C3AED'
    ctx.shadowColor = this.skillReady ? '#ffe600' : '#7C3AED'
    ctx.shadowBlur = this.skillReady ? 10 : 0
    ctx.fillRect(barX, barY, barW * (this.skillEnergy / this.skillMax), barH)
    ctx.shadowBlur = 0
    if (this.skillReady) {
      ctx.fillStyle = '#ffe600'
      ctx.font = `7px ${font}`
      ctx.textAlign = 'right'
      ctx.fillText(t('shooter_skill_label'), this.W - 10, barY + barH + 10)
    }

    // Bullet Level indicator
    const bulletColors = ['#22D3EE', '#39ff14', '#ffe600', '#FF2E88', '#7C3AED']
    const lvColor = bulletColors[this.bulletLevel - 1] || '#22D3EE'
    ctx.fillStyle = lvColor
    ctx.shadowColor = lvColor
    ctx.shadowBlur = this.bulletLevel >= 3 ? 8 : 4
    ctx.font = `bold 8px ${font}`
    ctx.textAlign = 'left'
    const lvNames = getLang() === 'zh'
      ? ['', '单发', '双发', '扩散', '追踪', '密集']
      : ['', 'SGL', 'DBL', 'SPR', 'TRK', 'MEGA']
    ctx.fillText(`Lv${this.bulletLevel} ${lvNames[this.bulletLevel]}`, 10, this.H - 10)
    ctx.shadowBlur = 0

    // Base Damage indicator
    ctx.fillStyle = '#7C3AED'
    ctx.font = `7px ${font}`
    ctx.textAlign = 'left'
    ctx.fillText(t('shooter_base_damage', { n: this.totalBaseDamage }), 10, this.H - 22)

    // Kill count
    ctx.fillStyle = '#4a4a6a'
    ctx.font = `7px ${font}`
    ctx.textAlign = 'left'
    ctx.fillText(t('shooter_kill', { n: this.killCount }), 10, this.H - 34)
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

    // Base damage reached
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

    const blink = Math.sin(Date.now() / 250) * 0.3 + 0.7
    ctx.fillStyle = `rgba(34, 211, 238, ${blink})`
    ctx.shadowColor = '#22D3EE'
    ctx.shadowBlur = 20
    ctx.font = `bold 10px ${font}`
    ctx.fillText(t('retry'), this.W / 2, this.H / 2 + 100)
    ctx.shadowBlur = 0
  }
}
