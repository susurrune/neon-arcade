// ============================================
// NEON WARRIOR v1 — 霓虹勇士，RPG星系专属
// ============================================
import { playSound } from '../utils/sound'

type EnemyType = 'goblin' | 'orc' | 'demon' | 'dragon'
type SkillType = 'slash' | 'fireball' | 'iceblast' | 'heal'

interface Enemy {
  x: number
  y: number
  type: EnemyType
  hp: number
  maxHp: number
  damage: number
  attackCooldown: number
  lastAttack: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
}

export class WarriorGame {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private W = 640; private H = 480
  private animId = 0
  private running = false
  private state: 'title' | 'playing' | 'gameover' | 'levelup' = 'title'
  private onScore: (s: number) => void

  // 玩家
  private player = {
    x: 320,
    y: 240,
    hp: 100,
    maxHp: 100,
    level: 1,
    exp: 0,
    expToLevel: 50,
    attack: 10,
    defense: 5,
    speed: 200,
  }

  // 敌人
  private enemies: Enemy[] = []
  private wave = 0
  private enemiesInWave = 0
  private spawnedCount = 0
  private waveTimer = 0

  // 技能
  private skills: { type: SkillType; cooldown: number; lastUse: number; unlocked: boolean }[] = [
    { type: 'slash', cooldown: 200, lastUse: 0, unlocked: true },
    { type: 'fireball', cooldown: 1000, lastUse: 0, unlocked: false },
    { type: 'iceblast', cooldown: 800, lastUse: 0, unlocked: false },
    { type: 'heal', cooldown: 2000, lastUse: 0, unlocked: false },
  ]
  private currentSkill: SkillType = 'slash'
  private projectiles: { x: number; y: number; dx: number; dy: number; damage: number; color: string; type: string }[] = []

  // 分数
  private score = 0
  private kills = 0

  // 粒子
  private particles: Particle[] = []

  // 时间
  private lastTime = 0

  // 输入
  private keys: Set<string> = new Set()
  private mousePos = { x: 0, y: 0 }

  constructor(canvas: HTMLCanvasElement, onScore: (s: number) => void) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.onScore = onScore
    this.setupInput()
  }

  private kdHandler: ((e: KeyboardEvent) => void) | null = null
  private kuHandler: ((e: KeyboardEvent) => void) | null = null
  private clickHandler: ((e: MouseEvent) => void) | null = null
  private moveHandler: ((e: MouseEvent) => void) | null = null

  private setupInput() {
    this.kdHandler = (e: KeyboardEvent) => this.handleKey(e)
    this.kuHandler = (e: KeyboardEvent) => this.handleKeyUp(e)
    this.clickHandler = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      this.handleClick(mx, my)
    }
    this.moveHandler = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      this.handleMouseMove(mx, my)
    }
    this.canvas.addEventListener('keydown', this.kdHandler)
    this.canvas.addEventListener('keyup', this.kuHandler)
    this.canvas.addEventListener('click', this.clickHandler)
    this.canvas.addEventListener('mousemove', this.moveHandler)
    this.canvas.setAttribute('tabindex', '0')
    this.canvas.focus()
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

  destroy() {
    this.stop()
    if (this.kdHandler) this.canvas.removeEventListener('keydown', this.kdHandler)
    if (this.kuHandler) this.canvas.removeEventListener('keyup', this.kuHandler)
    if (this.clickHandler) this.canvas.removeEventListener('click', this.clickHandler)
    if (this.moveHandler) this.canvas.removeEventListener('mousemove', this.moveHandler)
  }

  private reset() {
    this.player = {
      x: 320,
      y: 240,
      hp: 100,
      maxHp: 100,
      level: 1,
      exp: 0,
      expToLevel: 50,
      attack: 10,
      defense: 5,
      speed: 200,
    }
    this.skills = [
      { type: 'slash', cooldown: 200, lastUse: 0, unlocked: true },
      { type: 'fireball', cooldown: 1000, lastUse: 0, unlocked: false },
      { type: 'iceblast', cooldown: 800, lastUse: 0, unlocked: false },
      { type: 'heal', cooldown: 2000, lastUse: 0, unlocked: false },
    ]
    this.enemies = []
    this.projectiles = []
    this.particles = []
    this.score = 0
    this.kills = 0
    this.wave = 0
    this.waveTimer = 0
    this.enemiesInWave = 0
    this.spawnedCount = 0
    this.state = 'playing'
    this.spawnWave()
  }

  private spawnWave() {
    this.wave++
    this.enemiesInWave = 3 + this.wave * 2
    this.spawnedCount = 0
    this.waveTimer = 0
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

    // 玩家移动
    const moveSpeed = this.player.speed * dt * 0.01
    if (this.keys.has('ArrowLeft') || this.keys.has('a')) this.player.x -= moveSpeed
    if (this.keys.has('ArrowRight') || this.keys.has('d')) this.player.x += moveSpeed
    if (this.keys.has('ArrowUp') || this.keys.has('w')) this.player.y -= moveSpeed
    if (this.keys.has('ArrowDown') || this.keys.has('s')) this.player.y += moveSpeed

    // 边界
    this.player.x = Math.max(20, Math.min(this.W - 20, this.player.x))
    this.player.y = Math.max(20, Math.min(this.H - 60, this.player.y))

    // 生成敌人
    this.waveTimer += dt * 16.67
    if (this.spawnedCount < this.enemiesInWave && this.waveTimer > 800) {
      this.waveTimer = 0
      this.spawnEnemy()
      this.spawnedCount++
    }

    // 更新敌人
    const nowMs = performance.now()
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i]

      // 向玩家移动
      const dx = this.player.x - enemy.x
      const dy = this.player.y - enemy.y
      const dist = Math.hypot(dx, dy)

      if (dist > 30) {
        const speed = enemy.type === 'dragon' ? 0.5 : enemy.type === 'orc' ? 0.8 : enemy.type === 'goblin' ? 1.2 : 1
        enemy.x += (dx / dist) * speed * dt * 3
        enemy.y += (dy / dist) * speed * dt * 3
      }

      // 攻击玩家
      if (dist < 30 && nowMs - enemy.lastAttack > enemy.attackCooldown) {
        enemy.lastAttack = nowMs
        const damage = Math.max(1, enemy.damage - this.player.defense)
        this.player.hp -= damage
        this.spawnParticles(this.player.x, this.player.y, '#ff4444')
        playSound('hit')

        if (this.player.hp <= 0) {
          this.state = 'gameover'
          playSound('hit')
        }
      }

      // 死亡
      if (enemy.hp <= 0) {
        const expGain = enemy.type === 'dragon' ? 30 : enemy.type === 'demon' ? 15 : enemy.type === 'orc' ? 10 : 5
        this.player.exp += expGain
        this.score += expGain * 10
        this.kills++

        // 粒子效果
        this.spawnParticles(enemy.x, enemy.y, '#b026ff')
        this.enemies.splice(i, 1)
        playSound('coin')

        // 升级检查
        if (this.player.exp >= this.player.expToLevel) {
          this.levelUp()
        }
      }
    }

    // 更新弹道
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i]
      proj.x += proj.dx * dt * 5
      proj.y += proj.dy * dt * 5

      // 碰撞检测
      for (const enemy of this.enemies) {
        const dist = Math.hypot(proj.x - enemy.x, proj.y - enemy.y)
        if (dist < 20) {
          enemy.hp -= proj.damage
          if (proj.type === 'iceblast') {
            // 冰冻效果：降低敌人攻击速度
            enemy.attackCooldown *= 2
          }
          this.spawnParticles(proj.x, proj.y, proj.color)
          this.projectiles.splice(i, 1)
          break
        }
      }

      // 超出边界
      if (proj.x < 0 || proj.x > this.W || proj.y < 0 || proj.y > this.H) {
        this.projectiles.splice(i, 1)
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

    // 波次完成
    if (this.spawnedCount >= this.enemiesInWave && this.enemies.length === 0) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 20) // 回血
      this.spawnWave()
    }

    this.onScore(this.score)
  }

  private spawnEnemy() {
    const types: EnemyType[] = this.wave < 3 ? ['goblin'] : this.wave < 5 ? ['goblin', 'orc'] : ['goblin', 'orc', 'demon']
    if (this.wave >= 7 && this.spawnedCount === this.enemiesInWave - 1) {
      types.push('dragon')
    }

    const type = types[Math.floor(Math.random() * types.length)]
    const config = {
      goblin: { hp: 20 + this.wave * 3, damage: 5 + this.wave, attackCooldown: 1500 },
      orc: { hp: 40 + this.wave * 5, damage: 10 + this.wave * 2, attackCooldown: 1000 },
      demon: { hp: 60 + this.wave * 8, damage: 15 + this.wave * 2, attackCooldown: 800 },
      dragon: { hp: 150 + this.wave * 15, damage: 25 + this.wave * 3, attackCooldown: 600 },
    }

    // 从边缘生成
    const edge = Math.floor(Math.random() * 4)
    let x = 0, y = 0
    if (edge === 0) { x = Math.random() * this.W; y = -20 }
    else if (edge === 1) { x = this.W + 20; y = Math.random() * this.H }
    else if (edge === 2) { x = Math.random() * this.W; y = this.H + 20 }
    else { x = -20; y = Math.random() * this.H }

    this.enemies.push({
      x, y, type,
      hp: config[type].hp,
      maxHp: config[type].hp,
      damage: config[type].damage,
      attackCooldown: config[type].attackCooldown,
      lastAttack: 0,
    })
  }

  private levelUp() {
    this.state = 'levelup'
    this.player.level++
    this.player.exp = 0
    this.player.expToLevel = Math.floor(this.player.expToLevel * 1.5)
    this.player.maxHp += 20
    this.player.hp = this.player.maxHp
    this.player.attack += 5
    this.player.defense += 2

    // 解锁技能
    if (this.player.level === 2) this.skills[1].unlocked = true // fireball
    if (this.player.level === 3) this.skills[2].unlocked = true // iceblast
    if (this.player.level === 4) this.skills[3].unlocked = true // heal

    playSound('levelup')

    setTimeout(() => {
      if (this.running) this.state = 'playing'
    }, 1500)
  }

  private useSkill(skill: SkillType) {
    const nowMs = performance.now()
    const skillData = this.skills.find(s => s.type === skill)
    if (!skillData || !skillData.unlocked || nowMs - skillData.lastUse < skillData.cooldown) return

    skillData.lastUse = nowMs

    if (skill === 'slash') {
      // 近战攻击
      for (const enemy of this.enemies) {
        const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y)
        if (dist < 50) {
          enemy.hp -= this.player.attack
          this.spawnParticles(enemy.x, enemy.y, '#00f0ff')
        }
      }
      playSound('click')
    }

    if (skill === 'fireball') {
      // 发射火球朝鼠标方向
      const dx = this.mousePos.x - this.player.x
      const dy = this.mousePos.y - this.player.y
      const dist = Math.hypot(dx, dy)
      this.projectiles.push({
        x: this.player.x,
        y: this.player.y,
        dx: dx / dist,
        dy: dy / dist,
        damage: this.player.attack * 2,
        color: '#ff6b00',
        type: 'fireball',
      })
      playSound('click')
    }

    if (skill === 'iceblast') {
      const dx = this.mousePos.x - this.player.x
      const dy = this.mousePos.y - this.player.y
      const dist = Math.hypot(dx, dy)
      this.projectiles.push({
        x: this.player.x,
        y: this.player.y,
        dx: dx / dist,
        dy: dy / dist,
        damage: this.player.attack * 1.5,
        color: '#22d3ee',
        type: 'iceblast',
      })
      playSound('click')
    }

    if (skill === 'heal') {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 30)
      this.spawnParticles(this.player.x, this.player.y, '#39ff14')
      playSound('coin')
    }
  }

  private spawnParticles(x: number, y: number, color: string) {
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        life: 1,
        color,
      })
    }
  }

  private render() {
    // 背景
    this.ctx.fillStyle = '#0f0f1a'
    this.ctx.fillRect(0, 0, this.W, this.H)

    // 地面纹理
    this.ctx.strokeStyle = 'rgba(58, 58, 92, 0.3)'
    for (let i = 0; i < 20; i++) {
      this.ctx.beginPath()
      this.ctx.moveTo(0, i * 24)
      this.ctx.lineTo(this.W, i * 24)
      this.ctx.stroke()
    }

    // 粒子
    for (const p of this.particles) {
      this.ctx.globalAlpha = p.life
      this.ctx.fillStyle = p.color
      this.ctx.fillRect(p.x - 3, p.y - 3, 6, 6)
    }
    this.ctx.globalAlpha = 1

    // 弹道
    for (const proj of this.projectiles) {
      this.ctx.beginPath()
      this.ctx.arc(proj.x, proj.y, 8, 0, Math.PI * 2)
      this.ctx.fillStyle = proj.color
      this.ctx.fill()
      this.ctx.strokeStyle = '#ffffff'
      this.ctx.lineWidth = 2
      this.ctx.stroke()
    }

    // 敌人
    for (const enemy of this.enemies) {
      this.ctx.save()
      this.ctx.translate(enemy.x, enemy.y)

      const size = enemy.type === 'dragon' ? 25 : enemy.type === 'demon' ? 18 : enemy.type === 'orc' ? 15 : 12
      const color = enemy.type === 'dragon' ? '#ff4444' : enemy.type === 'demon' ? '#b026ff' : enemy.type === 'orc' ? '#ffaa00' : '#39ff14'

      this.ctx.fillStyle = color
      this.ctx.beginPath()
      this.ctx.arc(0, 0, size, 0, Math.PI * 2)
      this.ctx.fill()

      // 眼睛
      this.ctx.fillStyle = '#ffffff'
      this.ctx.beginPath()
      this.ctx.arc(-5, -3, 3, 0, Math.PI * 2)
      this.ctx.arc(5, -3, 3, 0, Math.PI * 2)
      this.ctx.fill()
      this.ctx.fillStyle = '#ff0000'
      this.ctx.beginPath()
      this.ctx.arc(-5, -3, 2, 0, Math.PI * 2)
      this.ctx.arc(5, -3, 2, 0, Math.PI * 2)
      this.ctx.fill()

      // 血条
      this.ctx.fillStyle = '#333'
      this.ctx.fillRect(-size, -size - 10, size * 2, 5)
      this.ctx.fillStyle = '#ff4444'
      this.ctx.fillRect(-size, -size - 10, size * 2 * (enemy.hp / enemy.maxHp), 5)

      this.ctx.restore()
    }

    // 玩家
    this.ctx.save()
    this.ctx.translate(this.player.x, this.player.y)

    // 身体
    this.ctx.fillStyle = '#00f0ff'
    this.ctx.beginPath()
    this.ctx.arc(0, 0, 15, 0, Math.PI * 2)
    this.ctx.fill()

    // 剑
    this.ctx.strokeStyle = '#ffd700'
    this.ctx.lineWidth = 3
    this.ctx.beginPath()
    this.ctx.moveTo(0, 0)
    this.ctx.lineTo(20, -15)
    this.ctx.stroke()

    // 血条
    this.ctx.fillStyle = '#333'
    this.ctx.fillRect(-20, -25, 40, 5)
    this.ctx.fillStyle = '#39ff14'
    this.ctx.fillRect(-20, -25, 40 * (this.player.hp / this.player.maxHp), 5)

    this.ctx.restore()

    // HUD
    this.ctx.font = '12px "Press Start 2P"'
    this.ctx.fillStyle = '#ffd700'
    this.ctx.fillText(`LV ${this.player.level}`, 20, 30)

    this.ctx.fillStyle = '#00f0ff'
    this.ctx.fillText(`HP: ${this.player.hp}/${this.player.maxHp}`, 20, 50)

    this.ctx.fillStyle = '#b026ff'
    this.ctx.fillText(`EXP: ${this.player.exp}/${this.player.expToLevel}`, 20, 70)

    this.ctx.fillStyle = '#39ff14'
    this.ctx.fillText(`KILLS: ${this.kills}`, this.W - 120, 30)

    this.ctx.fillStyle = '#ff2d95'
    this.ctx.fillText(`WAVE ${this.wave}`, this.W - 120, 50)

    // 技能栏
    const skillNames = ['SLASH', 'FIRE', 'ICE', 'HEAL']
    for (let i = 0; i < 4; i++) {
      const x = 20 + i * 70
      const y = this.H - 40
      const skillData = this.skills[i]

      this.ctx.fillStyle = skillData.unlocked ? '#252540' : '#1a1a2e'
      this.ctx.fillRect(x, y, 60, 30)

      this.ctx.fillStyle = skillData.unlocked ? (this.currentSkill === skillData.type ? '#00f0ff' : '#ffffff') : '#666666'
      this.ctx.font = '8px "Press Start 2P"'
      this.ctx.fillText(skillNames[i], x + 10, y + 20)

      // 冷却显示
      if (skillData.unlocked) {
        const cooldownLeft = Math.max(0, skillData.cooldown - (performance.now() - skillData.lastUse))
        if (cooldownLeft > 0) {
          this.ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'
          this.ctx.fillRect(x, y, 60 * (cooldownLeft / skillData.cooldown), 30)
        }
      }
    }

    // 标题/结束画面
    if (this.state === 'title') {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      this.ctx.fillRect(0, 0, this.W, this.H)

      this.ctx.font = '20px "Press Start 2P"'
      this.ctx.fillStyle = '#00f0ff'
      this.ctx.textAlign = 'center'
      this.ctx.fillText('NEON WARRIOR', this.W / 2, this.H / 2 - 60)

      this.ctx.font = '12px "Press Start 2P"'
      this.ctx.fillStyle = '#ffffff'
      this.ctx.fillText('WASD/方向键 移动', this.W / 2, this.H / 2 - 20)
      this.ctx.fillText('1-4 切换技能', this.W / 2, this.H / 2)
      this.ctx.fillText('鼠标点击/SPACE 使用技能', this.W / 2, this.H / 2 + 20)
      this.ctx.fillText('消灭敌人获得经验升级', this.W / 2, this.H / 2 + 40)
      this.ctx.fillText('点击或按 R 开始', this.W / 2, this.H / 2 + 80)
    }

    if (this.state === 'gameover') {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      this.ctx.fillRect(0, 0, this.W, this.H)

      this.ctx.font = '20px "Press Start 2P"'
      this.ctx.fillStyle = '#ff4444'
      this.ctx.textAlign = 'center'
      this.ctx.fillText('YOU DIED', this.W / 2, this.H / 2 - 40)

      this.ctx.font = '14px "Press Start 2P"'
      this.ctx.fillStyle = '#ffd700'
      this.ctx.fillText(`SCORE: ${this.score}`, this.W / 2, this.H / 2)

      this.ctx.font = '12px "Press Start 2P"'
      this.ctx.fillStyle = '#ffffff'
      this.ctx.fillText('按 R 或点击重新开始', this.W / 2, this.H / 2 + 40)
    }

    if (this.state === 'levelup') {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
      this.ctx.fillRect(0, 0, this.W, this.H)

      this.ctx.font = '16px "Press Start 2P"'
      this.ctx.fillStyle = '#ffd700'
      this.ctx.textAlign = 'center'
      this.ctx.fillText(`LEVEL UP!`, this.W / 2, this.H / 2 - 20)
      this.ctx.fillText(`LV ${this.player.level}`, this.W / 2, this.H / 2 + 20)
    }
  }

  handleMouseMove(mx: number, my: number) {
    this.mousePos = { x: mx, y: my }
  }

  handleClick(mx: number, my: number) {
    this.mousePos = { x: mx, y: my }

    if (this.state === 'title') {
      this.reset()
      return
    }

    if (this.state === 'gameover') {
      this.reset()
      return
    }

    if (this.state === 'playing') {
      this.useSkill(this.currentSkill)
    }
  }

  handleKey(e: KeyboardEvent) {
    if (e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault()
    if (this.state === 'title' && e.key === 'r') {
      this.reset()
      return
    }

    if (this.state === 'gameover' && e.key === 'r') {
      this.reset()
      return
    }

    if (this.state === 'playing') {
      this.keys.add(e.key)

      // 切换技能
      if (e.key === '1') this.currentSkill = 'slash'
      if (e.key === '2') this.currentSkill = 'fireball'
      if (e.key === '3') this.currentSkill = 'iceblast'
      if (e.key === '4') this.currentSkill = 'heal'

      // 使用技能
      if (e.key === ' ') this.useSkill(this.currentSkill)
    }
  }

  handleKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.key)
  }
}