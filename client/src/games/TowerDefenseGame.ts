// ============================================
// NEON TOWER DEFENSE v1 — 霓虹塔防，策略星系专属
// ============================================
import { playSound } from '../utils/sound'

type TowerType = 'basic' | 'laser' | 'frost' | 'plasma'
type EnemyType = 'basic' | 'fast' | 'tank' | 'boss'

interface Tower {
  x: number
  y: number
  type: TowerType
  level: number
  range: number
  damage: number
  cooldown: number
  lastShot: number
}

interface Enemy {
  x: number
  y: number
  type: EnemyType
  hp: number
  maxHp: number
  speed: number
  reward: number
  pathProgress: number
}

export class TowerDefenseGame {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private W = 640; private H = 480
  private animId = 0
  private running = false
  private state: 'title' | 'playing' | 'placing' | 'gameover' | 'win' = 'title'
  private onScore: (s: number) => void

  // 游戏状态
  private score = 0
  private money = 100
  private wave = 0
  private maxWave = 10
  private enemiesKilled = 0

  // 塔和敌人
  private towers: Tower[] = []
  private enemies: Enemy[] = []
  private projectiles: { x: number; y: number; targetId: number; speed: number; damage: number; color: string }[] = []

  // 路径点
  private path = [
    { x: 50, y: 240 },
    { x: 150, y: 240 },
    { x: 150, y: 120 },
    { x: 250, y: 120 },
    { x: 250, y: 360 },
    { x: 350, y: 360 },
    { x: 350, y: 240 },
    { x: 450, y: 240 },
    { x: 450, y: 120 },
    { x: 550, y: 120 },
    { x: 550, y: 480 },
  ]

  // 塔类型配置
  private TOWER_CONFIG: Record<TowerType, { range: number; damage: number; cooldown: number; cost: number; color: string }> = {
    basic: { range: 60, damage: 10, cooldown: 1000, cost: 20, color: '#00f0ff' },
    laser: { range: 80, damage: 25, cooldown: 500, cost: 50, color: '#ff2d95' },
    frost: { range: 50, damage: 5, cooldown: 800, cost: 30, color: '#22d3ee' },
    plasma: { range: 100, damage: 50, cooldown: 1500, cost: 80, color: '#b026ff' },
  }

  // 选择的塔类型
  private selectedTower: TowerType = 'basic'
  private hoverCell = { x: -1, y: -1 }

  // 网格
  private gridSize = 40
  private gridCols = 16
  private gridRows = 12
  private grid: boolean[][] = [] // true = 已放置塔

  // 时间
  private lastTime = 0
  private waveTimer = 0
  private enemiesInWave = 0
  private spawnedCount = 0

  constructor(canvas: HTMLCanvasElement, onScore: (s: number) => void) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.onScore = onScore
    this.initGrid()
    this.setupInput()
  }

  private kdHandler: ((e: KeyboardEvent) => void) | null = null
  private clickHandler: ((e: MouseEvent) => void) | null = null
  private moveHandler: ((e: MouseEvent) => void) | null = null

  private setupInput() {
    this.kdHandler = (e: KeyboardEvent) => this.handleKey(e)
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
    this.canvas.addEventListener('click', this.clickHandler)
    this.canvas.addEventListener('mousemove', this.moveHandler)
    this.canvas.setAttribute('tabindex', '0')
    this.canvas.focus()
  }

  private initGrid() {
    this.grid = Array(this.gridRows).fill(null).map(() => Array(this.gridCols).fill(false))
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
    if (this.clickHandler) this.canvas.removeEventListener('click', this.clickHandler)
    if (this.moveHandler) this.canvas.removeEventListener('mousemove', this.moveHandler)
  }

  private reset() {
    this.initGrid()
    this.towers = []
    this.enemies = []
    this.projectiles = []
    this.score = 0
    this.money = 100
    this.wave = 0
    this.waveTimer = 0
    this.enemiesInWave = 0
    this.spawnedCount = 0
    this.enemiesKilled = 0
    this.state = 'playing'
    this.spawnWave()
  }

  private spawnWave() {
    this.wave++
    this.enemiesInWave = 5 + this.wave * 2
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

    // 生成敌人
    this.waveTimer += dt * 16.67
    if (this.spawnedCount < this.enemiesInWave && this.waveTimer > 500) {
      this.waveTimer = 0
      this.spawnEnemy()
      this.spawnedCount++
    }

    // 更新敌人
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i]

      // 沿路径移动
      if (enemy.pathProgress < this.path.length - 1) {
        const currentPoint = this.path[Math.floor(enemy.pathProgress)]
        const nextPoint = this.path[Math.floor(enemy.pathProgress) + 1]
        const progress = enemy.pathProgress % 1

        enemy.x = currentPoint.x + (nextPoint.x - currentPoint.x) * progress
        enemy.y = currentPoint.y + (nextPoint.y - currentPoint.y) * progress

        const speedMod = enemy.type === 'fast' ? 1.5 : enemy.type === 'tank' ? 0.6 : 1
        enemy.pathProgress += (enemy.speed * speedMod * dt) / 100

        // 减速效果（霜塔）
        for (const tower of this.towers) {
          if (tower.type === 'frost') {
            const dist = Math.hypot(enemy.x - tower.x, enemy.y - tower.y)
            if (dist < tower.range) {
              enemy.pathProgress += (enemy.speed * dt) / 100 * 0.5 // 减速50%
            }
          }
        }
      } else {
        // 到达终点
        this.enemies.splice(i, 1)
        this.state = 'gameover'
        playSound('hit')
      }

      // 死亡
      if (enemy.hp <= 0) {
        this.money += enemy.reward
        this.score += enemy.reward * 10
        this.enemiesKilled++
        this.enemies.splice(i, 1)
        playSound('coin')
      }
    }

    // 塔攻击
    const nowMs = performance.now()
    for (const tower of this.towers) {
      if (nowMs - tower.lastShot > tower.cooldown) {
        // 找最近的敌人
        let closestEnemy: Enemy | null = null
        let closestDist = Infinity
        for (const enemy of this.enemies) {
          const dist = Math.hypot(enemy.x - tower.x, enemy.y - tower.y)
          if (dist < tower.range && dist < closestDist) {
            closestDist = dist
            closestEnemy = enemy
          }
        }

        if (closestEnemy) {
          tower.lastShot = nowMs
          closestEnemy.hp -= tower.damage
          this.projectiles.push({
            x: tower.x,
            y: tower.y,
            targetId: this.enemies.indexOf(closestEnemy),
            speed: 10,
            damage: tower.damage,
            color: this.TOWER_CONFIG[tower.type].color
          })
          playSound('click')
        }
      }
    }

    // 更新弹道
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i]
      const target = this.enemies[proj.targetId]
      if (!target) {
        this.projectiles.splice(i, 1)
        continue
      }

      const dx = target.x - proj.x
      const dy = target.y - proj.y
      const dist = Math.hypot(dx, dy)
      if (dist < 10) {
        this.projectiles.splice(i, 1)
      } else {
        proj.x += (dx / dist) * proj.speed * dt
        proj.y += (dy / dist) * proj.speed * dt
      }
    }

    // 波次完成检查
    if (this.spawnedCount >= this.enemiesInWave && this.enemies.length === 0) {
      if (this.wave >= this.maxWave) {
        this.state = 'win'
        playSound('levelup')
      } else {
        this.money += this.wave * 10 // 波次奖励
        this.spawnWave()
      }
    }

    this.onScore(this.score)
  }

  private spawnEnemy() {
    const types: EnemyType[] = this.wave < 3 ? ['basic'] : this.wave < 6 ? ['basic', 'fast'] : ['basic', 'fast', 'tank']
    if (this.wave === this.maxWave && this.spawnedCount === this.enemiesInWave - 1) {
      types.push('boss')
    }

    const type = types[Math.floor(Math.random() * types.length)]
    const config = {
      basic: { hp: 30 + this.wave * 5, speed: 0.8, reward: 5 },
      fast: { hp: 20 + this.wave * 3, speed: 1.2, reward: 8 },
      tank: { hp: 80 + this.wave * 10, speed: 0.5, reward: 15 },
      boss: { hp: 200 + this.wave * 20, speed: 0.4, reward: 50 },
    }

    this.enemies.push({
      x: this.path[0].x,
      y: this.path[0].y,
      type,
      hp: config[type].hp,
      maxHp: config[type].hp,
      speed: config[type].speed,
      reward: config[type].reward,
      pathProgress: 0,
    })
  }

  private render() {
    // 背景
    this.ctx.fillStyle = '#0f0f1a'
    this.ctx.fillRect(0, 0, this.W, this.H)

    // 网格
    this.ctx.strokeStyle = 'rgba(58, 58, 92, 0.3)'
    this.ctx.lineWidth = 1
    for (let x = 0; x < this.W; x += this.gridSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(x, 0)
      this.ctx.lineTo(x, this.H)
      this.ctx.stroke()
    }
    for (let y = 0; y < this.H; y += this.gridSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(0, y)
      this.ctx.lineTo(this.W, y)
      this.ctx.stroke()
    }

    // 路径
    this.ctx.strokeStyle = '#39ff14'
    this.ctx.lineWidth = 30
    this.ctx.lineCap = 'round'
    this.ctx.lineJoin = 'round'
    this.ctx.beginPath()
    this.ctx.moveTo(this.path[0].x, this.path[0].y)
    for (const point of this.path) {
      this.ctx.lineTo(point.x, point.y)
    }
    this.ctx.stroke()

    // 路径中心线
    this.ctx.strokeStyle = '#0f0f1a'
    this.ctx.lineWidth = 20
    this.ctx.beginPath()
    this.ctx.moveTo(this.path[0].x, this.path[0].y)
    for (const point of this.path) {
      this.ctx.lineTo(point.x, point.y)
    }
    this.ctx.stroke()

    // 塔
    for (const tower of this.towers) {
      const config = this.TOWER_CONFIG[tower.type]
      this.ctx.save()
      this.ctx.translate(tower.x, tower.y)

      // 范围圈（放置模式时显示）
      if (this.state === 'placing') {
        this.ctx.beginPath()
        this.ctx.arc(0, 0, config.range, 0, Math.PI * 2)
        this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)'
        this.ctx.stroke()
      }

      // 塔底座
      this.ctx.fillStyle = '#252540'
      this.ctx.fillRect(-15, -15, 30, 30)

      // 塔主体
      this.ctx.fillStyle = config.color
      this.ctx.beginPath()
      this.ctx.arc(0, 0, 12, 0, Math.PI * 2)
      this.ctx.fill()

      // 塔等级
      this.ctx.fillStyle = '#ffffff'
      this.ctx.font = '8px "Press Start 2P"'
      this.ctx.textAlign = 'center'
      this.ctx.fillText(String(tower.level), 0, 4)

      this.ctx.restore()
    }

    // 弹道
    for (const proj of this.projectiles) {
      this.ctx.beginPath()
      this.ctx.arc(proj.x, proj.y, 4, 0, Math.PI * 2)
      this.ctx.fillStyle = proj.color
      this.ctx.fill()
    }

    // 敌人
    for (const enemy of this.enemies) {
      this.ctx.save()
      this.ctx.translate(enemy.x, enemy.y)

      const size = enemy.type === 'boss' ? 20 : enemy.type === 'tank' ? 15 : enemy.type === 'fast' ? 8 : 12
      const color = enemy.type === 'boss' ? '#ff4444' : enemy.type === 'tank' ? '#ffaa00' : enemy.type === 'fast' ? '#ff2d95' : '#b026ff'

      this.ctx.fillStyle = color
      this.ctx.beginPath()
      this.ctx.arc(0, 0, size, 0, Math.PI * 2)
      this.ctx.fill()

      // 血条
      this.ctx.fillStyle = '#333'
      this.ctx.fillRect(-size, -size - 8, size * 2, 4)
      this.ctx.fillStyle = '#39ff14'
      this.ctx.fillRect(-size, -size - 8, size * 2 * (enemy.hp / enemy.maxHp), 4)

      this.ctx.restore()
    }

    // 悬停格子（放置模式）
    if (this.state === 'placing' && this.hoverCell.x >= 0) {
      this.ctx.fillStyle = 'rgba(0, 240, 255, 0.3)'
      this.ctx.fillRect(
        this.hoverCell.x * this.gridSize,
        this.hoverCell.y * this.gridSize,
        this.gridSize,
        this.gridSize
      )
    }

    // HUD
    this.ctx.font = '12px "Press Start 2P"'
    this.ctx.fillStyle = '#ffd700'
    this.ctx.fillText(`$${this.money}`, 20, 30)

    this.ctx.fillStyle = '#00f0ff'
    this.ctx.fillText(`WAVE ${this.wave}/${this.maxWave}`, this.W - 140, 30)

    this.ctx.fillStyle = '#ff2d95'
    this.ctx.fillText(`SCORE: ${this.score}`, 20, 50)

    // 塔选择栏
    const barY = this.H - 50
    const towerTypes: TowerType[] = ['basic', 'laser', 'frost', 'plasma']
    for (let i = 0; i < towerTypes.length; i++) {
      const type = towerTypes[i]
      const config = this.TOWER_CONFIG[type]
      const x = 20 + i * 80

      this.ctx.fillStyle = this.selectedTower === type ? config.color : '#252540'
      this.ctx.fillRect(x, barY, 60, 40)

      this.ctx.fillStyle = '#ffffff'
      this.ctx.font = '10px "Press Start 2P"'
      this.ctx.fillText(`$${config.cost}`, x + 5, barY + 15)
      this.ctx.fillText(type.slice(0, 4).toUpperCase(), x + 5, barY + 30)
    }

    // 标题/结束画面
    if (this.state === 'title') {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      this.ctx.fillRect(0, 0, this.W, this.H)

      this.ctx.font = '20px "Press Start 2P"'
      this.ctx.fillStyle = '#00f0ff'
      this.ctx.textAlign = 'center'
      this.ctx.fillText('NEON TOWER DEFENSE', this.W / 2, this.H / 2 - 60)

      this.ctx.font = '12px "Press Start 2P"'
      this.ctx.fillStyle = '#ffffff'
      this.ctx.fillText('点击底部选择塔类型', this.W / 2, this.H / 2 - 20)
      this.ctx.fillText('点击格子放置塔', this.W / 2, this.H / 2)
      this.ctx.fillText('阻止敌人到达终点', this.W / 2, this.H / 2 + 20)
      this.ctx.fillText('点击或按 R 开始', this.W / 2, this.H / 2 + 60)
    }

    if (this.state === 'gameover') {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      this.ctx.fillRect(0, 0, this.W, this.H)

      this.ctx.font = '20px "Press Start 2P"'
      this.ctx.fillStyle = '#ff4444'
      this.ctx.textAlign = 'center'
      this.ctx.fillText('DEFENSE FAILED', this.W / 2, this.H / 2 - 30)

      this.ctx.font = '14px "Press Start 2P"'
      this.ctx.fillStyle = '#ffd700'
      this.ctx.fillText(`SCORE: ${this.score}`, this.W / 2, this.H / 2 + 10)

      this.ctx.font = '12px "Press Start 2P"'
      this.ctx.fillStyle = '#ffffff'
      this.ctx.fillText('按 R 或点击重新开始', this.W / 2, this.H / 2 + 50)
    }

    if (this.state === 'win') {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      this.ctx.fillRect(0, 0, this.W, this.H)

      this.ctx.font = '20px "Press Start 2P"'
      this.ctx.fillStyle = '#39ff14'
      this.ctx.textAlign = 'center'
      this.ctx.fillText('DEFENSE SUCCESS!', this.W / 2, this.H / 2 - 30)

      this.ctx.font = '14px "Press Start 2P"'
      this.ctx.fillStyle = '#ffd700'
      this.ctx.fillText(`FINAL SCORE: ${this.score}`, this.W / 2, this.H / 2 + 10)
      this.ctx.fillText(`ENEMIES KILLED: ${this.enemiesKilled}`, this.W / 2, this.H / 2 + 40)

      this.ctx.font = '12px "Press Start 2P"'
      this.ctx.fillStyle = '#ffffff'
      this.ctx.fillText('按 R 或点击重新开始', this.W / 2, this.H / 2 + 80)
    }
  }

  // 检查格子是否在路径上
  private isOnPath(cellX: number, cellY: number): boolean {
    const cellCenterX = cellX * this.gridSize + this.gridSize / 2
    const cellCenterY = cellY * this.gridSize + this.gridSize / 2

    for (const point of this.path) {
      const dist = Math.hypot(cellCenterX - point.x, cellCenterY - point.y)
      if (dist < 25) return true
    }
    return false
  }

  // 点击处理
  handleClick(mx: number, my: number) {
    if (this.state === 'title') {
      this.reset()
      return
    }

    if (this.state === 'gameover' || this.state === 'win') {
      this.reset()
      return
    }

    // 塔选择栏
    const barY = this.H - 50
    if (my >= barY && my <= barY + 40) {
      const towerTypes: TowerType[] = ['basic', 'laser', 'frost', 'plasma']
      for (let i = 0; i < towerTypes.length; i++) {
        const x = 20 + i * 80
        if (mx >= x && mx <= x + 60) {
          this.selectedTower = towerTypes[i]
          playSound('click')
          return
        }
      }
    }

    // 放置塔
    const cellX = Math.floor(mx / this.gridSize)
    const cellY = Math.floor(my / this.gridSize)

    if (cellX >= 0 && cellX < this.gridCols && cellY >= 0 && cellY < this.gridRows) {
      if (!this.grid[cellY][cellX] && !this.isOnPath(cellX, cellY)) {
        const config = this.TOWER_CONFIG[this.selectedTower]
        if (this.money >= config.cost) {
          this.money -= config.cost
          this.towers.push({
            x: cellX * this.gridSize + this.gridSize / 2,
            y: cellY * this.gridSize + this.gridSize / 2,
            type: this.selectedTower,
            level: 1,
            range: config.range,
            damage: config.damage,
            cooldown: config.cooldown,
            lastShot: 0,
          })
          this.grid[cellY][cellX] = true
          playSound('coin')
        }
      }
    }
  }

  handleMouseMove(mx: number, my: number) {
    if (this.state !== 'playing') return

    const cellX = Math.floor(mx / this.gridSize)
    const cellY = Math.floor(my / this.gridSize)
    this.hoverCell = { x: cellX, y: cellY }
  }

  handleKey(e: KeyboardEvent) {
    if (e.key === ' ') e.preventDefault()
    if (this.state === 'title' && e.key === 'r') {
      this.reset()
    }
    if ((this.state === 'gameover' || this.state === 'win') && e.key === 'r') {
      this.reset()
    }
  }
}