// ============================================
// TETRIS GAME v5 — 连击奖励 + 特殊方块 + 挑战模式
// ============================================
import { playSound, playCombo, playClear } from '../utils/sound'

const SHAPES: number[][][] = [
  [[1,1,1,1]], // I
  [[1,1],[1,1]], // O
  [[0,1,0],[1,1,1]], // T
  [[1,0,0],[1,1,1]], // L
  [[0,0,1],[1,1,1]], // J
  [[0,1,1],[1,1,0]], // S
  [[1,1,0],[0,1,1]], // Z
]
const COLORS = ['#00f0ff','#ffe600','#b026ff','#ff2d95','#39ff14','#00f0ff','#ff2d95']
const PIECE_NAMES = ['I','O','T','L','J','S','Z']

// 特殊方块类型
type SpecialBlock = 'none' | 'bomb' | 'rainbow' | 'freeze'

export class TetrisGame {
  private canvas!: HTMLCanvasElement
  private ctx!: CanvasRenderingContext2D
  private onScore: (s: number) => void = () => {}
  private animId = 0
  private lastDrop = 0
  private running = true
  private state: 'title' | 'playing' | 'paused' | 'gameover' = 'title'

  private cols = 10
  private rows = 20
  private cellSize = 24
  private board: (number | null)[][] = []
  private piece: { shape: number[][]; color: string; x: number; y: number; type: number; special?: SpecialBlock } | null = null

  // Hold系统 - 新增
  private holdPiece: { shape: number[][]; color: string; type: number } | null = null
  private canHold = true // 每次落定后才能Hold

  // Next预览
  private nextPieces: number[] = []
  private nextCount = 3

  private score = 0
  private level = 1
  private lines = 0
  private dropInterval = 800

  // Combo system
  private combo = 0
  private bestCombo = 0
  private comboDisplay = { text: '', timer: 0 }

  // T-Spin检测 - 新增
  private lastRotation = false
  private tspinDetected = false
  private tspinDisplay = { text: '', timer: 0 }

  // Skill system
  private skillEnergy = 0
  private skillMax = 100
  private skillType: 'clearRow' | 'freeze' = 'clearRow'

  // Freeze
  private freezeTimer = 0

  // 消除特效类型
  private clearEffectType = 0 // 1-4行不同特效

  // Particles - 增强粒子系统
  private particles: { x: number; y: number; vx: number; vy: number; color: string; life: number; size: number; type?: 'explosion' | 'rainbow' | 'flash' }[] = []
  private screenShake = 0

  // 消除行数统计（用于特效）
  private lastClearedLines = 0

  // 连击奖励系统
  private comboRewardActive = false
  private comboRewardMultiplier = 1
  private perfectClears = 0

  // 挑战模式
  private challengeMode = false
  private challengeType: 'time' | 'obstacle' | 'zen' = 'zen'
  private challengeTimer = 0
  private challengeMaxTime = 180 // 3分钟限时
  private obstacleBlocks: {x: number, y: number}[] = []

  // 特殊方块
  private activeSpecialBlock: SpecialBlock = 'none'
  private rainbowPending = false // 彩虹万能块

  private keys: Set<string> = new Set()

  init(canvas: HTMLCanvasElement, onScore: (s: number) => void) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.onScore = onScore
    const rect = canvas.parentElement?.getBoundingClientRect()
    const maxW = rect?.width || 300
    this.cellSize = Math.floor(Math.min(maxW / this.cols, 28))
    canvas.width = this.cols * this.cellSize
    canvas.height = this.rows * this.cellSize
    canvas.style.width = (this.cols * this.cellSize) + 'px'
    canvas.style.height = (this.rows * this.cellSize) + 'px'
    this.reset()
    this.loop(0)
    window.addEventListener('keydown', this.handleKey)
    canvas.setAttribute('tabindex', '0')
    canvas.focus()
  }

  destroy() {
    this.running = false
    cancelAnimationFrame(this.animId)
    window.removeEventListener('keydown', this.handleKey)
  }

  start() {
    this.running = true
    // 如果游戏处于暂停状态，恢复游戏循环
    if (this.state === 'paused') {
      this.state = 'playing'
    }
    // 确保游戏循环在运行
    if (this.animId === 0) {
      this.loop(performance.now())
    }
  }

  stop() {
    // 暂停游戏但不销毁状态
    if (this.state === 'playing') {
      this.state = 'paused'
    }
  }

  private reset() {
    this.board = Array.from({ length: this.rows }, () => Array(this.cols).fill(null))
    this.score = 0; this.level = 1; this.lines = 0
    this.dropInterval = 800
    this.combo = 0; this.bestCombo = 0
    this.skillEnergy = 0; this.freezeTimer = 0
    this.particles = []; this.screenShake = 0
    this.comboDisplay = { text: '', timer: 0 }
    this.tspinDisplay = { text: '', timer: 0 }
    this.holdPiece = null; this.canHold = true
    this.nextPieces = []
    this.generateNextPieces()
    this.state = 'title'
    this.spawnPiece()
    this.onScore(0)
  }

  private startGame() {
    this.board = Array.from({ length: this.rows }, () => Array(this.cols).fill(null))
    this.score = 0; this.level = 1; this.lines = 0
    this.dropInterval = 800
    this.combo = 0; this.bestCombo = 0
    this.skillEnergy = 0; this.freezeTimer = 0
    this.particles = []; this.screenShake = 0
    this.comboDisplay = { text: '', timer: 0 }
    this.tspinDisplay = { text: '', timer: 0 }
    this.holdPiece = null; this.canHold = true
    this.nextPieces = []
    this.generateNextPieces()
    this.spawnPiece()
    this.onScore(0)
    this.state = 'playing'
  }

  private generateNextPieces() {
    // 生成7个一组的随机序列（保证公平性）
    while (this.nextPieces.length < this.nextCount + 7) {
      const bag = [0, 1, 2, 3, 4, 5, 6]
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const temp = bag[i]
        bag[i] = bag[j]
        bag[j] = temp
      }
      this.nextPieces.push(...bag)
    }
  }

  private spawnPiece() {
    this.generateNextPieces()
    const idx = this.nextPieces.shift()!
    const shape = SHAPES[idx].map((r) => [...r])
    this.piece = {
      shape, color: COLORS[idx], type: idx,
      x: Math.floor((this.cols - shape[0].length) / 2), y: 0,
    }
    this.canHold = true
    this.lastRotation = false
    this.tspinDetected = false

    if (this.collides(this.piece.shape, this.piece.x, this.piece.y)) {
      this.state = 'gameover'
      this.screenShake = 15
      playSound('gameover')
      const coins = Math.floor(this.score / 50)
      try { require('../store/gameStore').useGameStore.getState().addCoins(coins) } catch {}
    }
  }

  // Hold功能 - 新增
  private hold() {
    if (!this.canHold || !this.piece) return

    this.canHold = false
    playSound('move')

    if (this.holdPiece === null) {
      // 第一次Hold：存当前，出新方块
      this.holdPiece = {
        shape: SHAPES[this.piece.type].map(r => [...r]),
        color: this.piece.color,
        type: this.piece.type,
      }
      this.spawnPiece()
    } else {
      // 交换当前和Hold
      const currentType = this.piece.type
      const holdType = this.holdPiece.type

      this.holdPiece = {
        shape: SHAPES[currentType].map(r => [...r]),
        color: COLORS[currentType],
        type: currentType,
      }

      const shape = SHAPES[holdType].map(r => [...r])
      this.piece = {
        shape, color: COLORS[holdType], type: holdType,
        x: Math.floor((this.cols - shape[0].length) / 2), y: 0,
      }
    }
  }

  private collides(shape: number[][], ox: number, oy: number): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue
        const nx = ox + c, ny = oy + r
        if (nx < 0 || nx >= this.cols || ny >= this.rows) return true
        if (ny >= 0 && this.board[ny][nx] !== null) return true
      }
    }
    return false
  }

  private rotate(): number[][] {
    const s = this.piece!.shape
    const rows = s.length, cols = s[0].length
    const rotated: number[][] = Array.from({ length: cols }, () => Array(rows).fill(0))
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        rotated[c][rows - 1 - r] = s[r][c]
    return rotated
  }

  // T-Spin检测 - 新增
  private checkTSpin(): boolean {
    if (!this.piece || this.piece.type !== 2) return false // 只检测T型方块
    if (!this.lastRotation) return false // 必须是旋转后

    const p = this.piece
    // 检查T方块四个角是否有3个或4个被阻挡
    const corners = [
      { x: p.x - 1, y: p.y - 1 },
      { x: p.x + 3, y: p.y - 1 },
      { x: p.x - 1, y: p.y + 3 },
      { x: p.x + 3, y: p.y + 3 },
    ]

    let blocked = 0
    for (const corner of corners) {
      if (corner.x < 0 || corner.x >= this.cols || corner.y >= this.rows) blocked++
      else if (corner.y >= 0 && this.board[corner.y]?.[corner.x] !== null) blocked++
    }

    return blocked >= 3
  }

  private lock() {
    const p = this.piece!

    // T-Spin检测
    this.tspinDetected = this.checkTSpin()

    for (let r = 0; r < p.shape.length; r++) {
      for (let c = 0; c < p.shape[r].length; c++) {
        if (p.shape[r][c]) {
          const ny = p.y + r
          if (ny >= 0) this.board[ny][p.x + c] = COLORS.indexOf(p.color)
        }
      }
    }
    this.clearLines()
    this.spawnPiece()
  }

  private clearLines() {
    let cleared = 0
    const clearedRows: number[] = []

    for (let r = this.rows - 1; r >= 0; r--) {
      if (this.board[r].every((c) => c !== null)) {
        clearedRows.push(r)
        this.board.splice(r, 1)
        this.board.unshift(Array(this.cols).fill(null))
        cleared++; r++
      }
    }

    if (cleared > 0) {
      this.lastClearedLines = cleared
      this.spawnClearEffect(cleared, clearedRows)

      // Combo
      this.combo++
      if (this.combo > this.bestCombo) this.bestCombo = this.combo
      const comboMult = Math.min(this.combo, 8)

      // Perfect Clear check
      const isPerfectClear = this.board.every(row => row.every(c => c === null))
      const perfectBonus = isPerfectClear ? 2000 : 0
      this.perfectClears = isPerfectClear ? this.perfectClears + 1 : 0

      // 连击奖励：连续消行触发额外倍率
      if (this.combo >= 3) {
        this.comboRewardActive = true
        this.comboRewardMultiplier = Math.min(1 + this.combo * 0.2, 3)
      }

      // 彩虹万能块效果：可匹配任何颜色
      let rainbowBonus = 0
      if (this.rainbowPending) {
        rainbowBonus = cleared * 50
        this.rainbowPending = false
      }

      // T-Spin加分
      let tspinBonus = 0
      if (this.tspinDetected) {
        tspinBonus = cleared === 1 ? 100 : cleared === 2 ? 300 : cleared === 3 ? 500 : 0
        this.tspinDisplay = { text: `T-SPIN ${cleared > 1 ? `x${cleared}` : ''}! +${tspinBonus}`, timer: 120 }
        playSound('skill')
      }

      const basePts = [0, 100, 300, 500, 800][cleared] || 800
      const pts = Math.floor((basePts * this.level * comboMult * this.comboRewardMultiplier) + perfectBonus + tspinBonus + rainbowBonus)
      this.score += pts
      this.lines += cleared
      this.level = Math.floor(this.lines / 10) + 1
      this.dropInterval = this.freezeTimer > 0 ? this.dropInterval : Math.max(100, 800 - (this.level - 1) * 70)

      // Skill energy
      this.skillEnergy = Math.min(this.skillEnergy + cleared * 15, this.skillMax)

      // 音效 - 根据消除行数
      if (isPerfectClear) playSound('perfect')
      else if (this.tspinDetected) playSound('combo_high')
      else playClear(cleared)
      if (this.combo >= 3) playCombo(this.combo)

      // Display
      if (this.combo >= 2) {
        this.comboDisplay = { text: `x${comboMult} COMBO!`, timer: 90 }
      }
      if (isPerfectClear) {
        this.comboDisplay = { text: 'PERFECT CLEAR!', timer: 120 }
        this.screenShake = 15
      }

      this.onScore(this.score)
    } else {
      this.combo = 0
      this.tspinDetected = false
    }
  }

  // 消除特效 - 新增
  private spawnClearEffect(lines: number, rows: number[]) {
    const cs = this.cellSize
    const colors = ['#00f0ff', '#ffe600', '#b026ff', '#ff2d95']

    for (const row of rows) {
      const y = row * cs + cs / 2

      for (let c = 0; c < this.cols; c++) {
        const x = c * cs + cs / 2
        const color = COLORS[this.board[row + rows.indexOf(row)]?.[c] as number] || colors[0]

        // 根据行数选择特效类型
        if (lines >= 4) {
          // 4行：彩虹渐变爆炸
          for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2
            this.particles.push({
              x, y,
              vx: Math.cos(angle) * 6,
              vy: Math.sin(angle) * 6 - 2,
              color: colors[i % 4],
              life: 50,
              size: 4,
              type: 'rainbow',
            })
          }
        } else if (lines >= 3) {
          // 3行：闪光爆破
          for (let i = 0; i < 8; i++) {
            this.particles.push({
              x, y,
              vx: (Math.random() - 0.5) * 8,
              vy: (Math.random() - 0.5) * 8,
              color: '#ffe600',
              life: 40,
              size: 5,
              type: 'flash',
            })
          }
        } else if (lines >= 2) {
          // 2行：水平撕裂
          this.particles.push({
            x, y,
            vx: (c < this.cols / 2 ? -4 : 4) + (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            color: color,
            life: 35,
            size: 4,
          })
        } else {
          // 单行：基础闪烁
          for (let i = 0; i < 3; i++) {
            this.particles.push({
              x, y,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4 - 2,
              color,
              life: 30,
              size: 3,
            })
          }
        }
      }
    }

    // 震动强度
    this.screenShake = lines >= 4 ? 15 : lines >= 3 ? 10 : lines >= 2 ? 6 : 4
  }

  private useSkill() {
    if (this.skillEnergy < this.skillMax) return
    this.skillEnergy = 0
    playSound('skill')

    if (this.skillType === 'clearRow') {
      // Remove bottom row
      this.board.splice(this.rows - 1, 1)
      this.board.unshift(Array(this.cols).fill(null))
      this.comboDisplay = { text: 'ROW CLEARED!', timer: 90 }
      this.screenShake = 8
      // Spawn particles
      for (let c = 0; c < this.cols; c++) {
        this.particles.push({
          x: c * this.cellSize + this.cellSize / 2,
          y: (this.rows - 1) * this.cellSize + this.cellSize / 2,
          vx: (Math.random() - 0.5) * 6,
          vy: -Math.random() * 4 - 2,
          color: '#ffe600', life: 40, size: 4,
        })
      }
    } else {
      // Freeze
      this.freezeTimer = 300
      this.comboDisplay = { text: 'FREEZE!', timer: 90 }
    }
  }

  private ghostY(): number {
    if (!this.piece) return 0
    let gy = this.piece.y
    while (!this.collides(this.piece.shape, this.piece.x, gy + 1)) gy++
    return gy
  }

  private handleKey = (e: KeyboardEvent) => {
    if (this.state === 'title') { this.startGame(); return }
    if (this.state === 'gameover' && (e.key === 'r' || e.key === 'R')) { this.startGame(); return }
    if (this.state !== 'playing' || !this.piece) return

    const p = this.piece
    switch (e.key) {
      case 'ArrowLeft':
        if (!this.collides(p.shape, p.x - 1, p.y)) { p.x--; playSound('move') }
        e.preventDefault(); break
      case 'ArrowRight':
        if (!this.collides(p.shape, p.x + 1, p.y)) { p.x++; playSound('move') }
        e.preventDefault(); break
      case 'ArrowDown':
        if (!this.collides(p.shape, p.x, p.y + 1)) { p.y++; this.score += 1; playSound('drop'); this.onScore(this.score) }
        e.preventDefault(); break
      case 'ArrowUp': {
        const rotated = this.rotate()
        this.lastRotation = true
        if (!this.collides(rotated, p.x, p.y)) { p.shape = rotated; playSound('rotate') }
        else if (!this.collides(rotated, p.x - 1, p.y)) { p.shape = rotated; p.x--; playSound('rotate') }
        else if (!this.collides(rotated, p.x + 1, p.y)) { p.shape = rotated; p.x++; playSound('rotate') }
        else if (!this.collides(rotated, p.x - 2, p.y)) { p.shape = rotated; p.x -= 2; playSound('rotate') }
        else if (!this.collides(rotated, p.x + 2, p.y)) { p.shape = rotated; p.x += 2; playSound('rotate') }
        e.preventDefault(); break
      }
      case ' ':
        while (!this.collides(p.shape, p.x, p.y + 1)) { p.y++; this.score += 2 }
        playSound('drop')
        this.lock()
        e.preventDefault(); break
      case 'c': case 'C':
        this.useSkill()
        break
      case 'Shift': // Hold功能
        this.hold()
        e.preventDefault(); break
    }
  }

  private loop = (time: number) => {
    if (!this.running) return
    this.animId = requestAnimationFrame(this.loop)

    if (this.state === 'playing' && !this.piece) { /* wait */ }
    else if (this.state === 'playing' && this.piece) {
      const interval = this.freezeTimer > 0 ? this.dropInterval * 3 : this.dropInterval
      if (time - this.lastDrop > interval) {
        this.lastDrop = time
        if (!this.collides(this.piece.shape, this.piece.x, this.piece.y + 1)) {
          this.piece.y++
        } else {
          this.lock()
        }
      }
      if (this.freezeTimer > 0) this.freezeTimer--
    }

    this.updateParticles()
    if (this.comboDisplay.timer > 0) this.comboDisplay.timer--
    if (this.tspinDisplay.timer > 0) this.tspinDisplay.timer--
    this.draw()
  }

  private updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life--
      if (p.type === 'rainbow') {
        // 彩虹粒子颜色渐变
        const colors = ['#00f0ff', '#ffe600', '#b026ff', '#ff2d95']
        p.color = colors[Math.floor((p.life / 50) * 4) % 4]
      }
      if (p.life <= 0) this.particles.splice(i, 1)
    }
  }

  private draw() {
    const { ctx, cellSize: cs } = this
    const w = this.canvas.width
    const h = this.canvas.height

    ctx.save()
    if (this.screenShake > 0) {
      ctx.translate((Math.random() - 0.5) * this.screenShake, (Math.random() - 0.5) * this.screenShake)
      this.screenShake -= 0.5
      if (this.screenShake < 0) this.screenShake = 0
    }

    // Background
    ctx.fillStyle = this.freezeTimer > 0 ? '#0f1525' : '#0f0f1a'
    ctx.fillRect(0, 0, w, h)

    // Grid
    ctx.strokeStyle = '#1a1a2e'
    ctx.lineWidth = 0.5
    for (let x = 0; x <= this.cols; x++) { ctx.beginPath(); ctx.moveTo(x * cs, 0); ctx.lineTo(x * cs, h); ctx.stroke() }
    for (let y = 0; y <= this.rows; y++) { ctx.beginPath(); ctx.moveTo(0, y * cs); ctx.lineTo(w, y * cs); ctx.stroke() }

    // Board
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.board[r][c] !== null) {
          ctx.fillStyle = COLORS[this.board[r][c] as number]
          ctx.fillRect(c * cs + 1, r * cs + 1, cs - 2, cs - 2)
        }
      }
    }

    // Ghost + Piece
    if (this.piece && this.state === 'playing') {
      const p = this.piece
      const gy = this.ghostY()
      ctx.globalAlpha = 0.15
      ctx.fillStyle = p.color
      for (let r = 0; r < p.shape.length; r++)
        for (let c = 0; c < p.shape[r].length; c++)
          if (p.shape[r][c]) ctx.fillRect((p.x + c) * cs + 1, (gy + r) * cs + 1, cs - 2, cs - 2)
      ctx.globalAlpha = 1

      ctx.fillStyle = p.color
      ctx.shadowColor = p.color; ctx.shadowBlur = 4
      for (let r = 0; r < p.shape.length; r++)
        for (let c = 0; c < p.shape[r].length; c++)
          if (p.shape[r][c]) ctx.fillRect((p.x + c) * cs + 1, (p.y + r) * cs + 1, cs - 2, cs - 2)
      ctx.shadowBlur = 0
    }

    // Particles
    for (const p of this.particles) {
      ctx.globalAlpha = Math.min(1, p.life / 15)
      ctx.fillStyle = p.color
      if (p.type === 'flash') {
        ctx.shadowColor = p.color
        ctx.shadowBlur = 8
      }
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
      ctx.shadowBlur = 0
    }
    ctx.globalAlpha = 1

    // HUD - Score
    ctx.fillStyle = '#39ff14'; ctx.font = '7px "Press Start 2P", monospace'; ctx.textAlign = 'left'
    ctx.fillText(`${this.score}`, 4, 14)
    ctx.fillStyle = '#4a4a6a'; ctx.font = '5px "Press Start 2P", monospace'
    ctx.fillText(`LV${this.level}`, 4, 26)
    if (this.combo >= 2) {
      ctx.fillStyle = '#ffe600'; ctx.font = '5px "Press Start 2P", monospace'
      ctx.fillText(`COMBO x${Math.min(this.combo, 8)}`, 4, 38)
    }

    // Hold显示 - 新增
    if (this.holdPiece) {
      ctx.fillStyle = '#4a4a6a'; ctx.font = '4px "Press Start 2P", monospace'
      ctx.fillText('HOLD', 4, h - 40)
      ctx.fillStyle = this.holdPiece.color
      const holdX = 4
      const holdY = h - 35
      const miniCs = cs * 0.6
      for (let r = 0; r < this.holdPiece.shape.length; r++) {
        for (let c = 0; c < this.holdPiece.shape[r].length; c++) {
          if (this.holdPiece.shape[r][c]) {
            ctx.fillRect(holdX + c * miniCs, holdY + r * miniCs, miniCs - 1, miniCs - 1)
          }
        }
      }
    }

    // Next预览 - 新增
    ctx.fillStyle = '#4a4a6a'; ctx.font = '4px "Press Start 2P", monospace'; ctx.textAlign = 'right'
    ctx.fillText('NEXT', w - 4, h - 40)
    for (let i = 0; i < Math.min(this.nextCount, this.nextPieces.length); i++) {
      const nextType = this.nextPieces[i]
      const nextShape = SHAPES[nextType]
      const nextColor = COLORS[nextType]
      ctx.fillStyle = nextColor
      const nextX = w - 30
      const nextY = h - 35 + i * 25
      const miniCs = cs * 0.5
      for (let r = 0; r < nextShape.length; r++) {
        for (let c = 0; c < nextShape[r].length; c++) {
          if (nextShape[r][c]) {
            ctx.fillRect(nextX + c * miniCs, nextY + r * miniCs, miniCs - 1, miniCs - 1)
          }
        }
      }
    }

    // Skill bar
    ctx.fillStyle = '#333'; ctx.fillRect(w - 52, 4, 48, 5)
    ctx.fillStyle = this.skillEnergy >= this.skillMax ? '#ffe600' : '#b026ff'
    ctx.fillRect(w - 52, 4, 48 * (this.skillEnergy / this.skillMax), 5)
    if (this.skillEnergy >= this.skillMax) {
      ctx.fillStyle = '#ffe600'; ctx.font = '4px "Press Start 2P", monospace'; ctx.textAlign = 'right'
      ctx.fillText('C:SKILL', w - 4, 18)
    }

    // T-Spin显示 - 新增
    if (this.tspinDisplay.timer > 0) {
      const alpha = Math.min(1, this.tspinDisplay.timer / 30)
      ctx.globalAlpha = alpha
      ctx.fillStyle = '#b026ff'; ctx.shadowColor = '#b026ff'; ctx.shadowBlur = 10
      ctx.font = '7px "Press Start 2P", monospace'; ctx.textAlign = 'center'
      ctx.fillText(this.tspinDisplay.text, w / 2, h / 2 - 20)
      ctx.shadowBlur = 0; ctx.globalAlpha = 1
    }

    // Combo display
    if (this.comboDisplay.timer > 0) {
      const alpha = Math.min(1, this.comboDisplay.timer / 30)
      ctx.globalAlpha = alpha
      ctx.fillStyle = '#ffe600'; ctx.shadowColor = '#ffe600'; ctx.shadowBlur = 10
      ctx.font = '8px "Press Start 2P", monospace'; ctx.textAlign = 'center'
      ctx.fillText(this.comboDisplay.text, w / 2, h / 2)
      ctx.shadowBlur = 0; ctx.globalAlpha = 1
    }

    // Freeze overlay
    if (this.freezeTimer > 0) {
      ctx.fillStyle = 'rgba(0,240,255,0.03)'
      ctx.fillRect(0, 0, w, h)
    }

    // Title
    if (this.state === 'title') {
      ctx.fillStyle = 'rgba(15,15,26,0.7)'; ctx.fillRect(0, 0, w, h)
      ctx.textAlign = 'center'
      ctx.fillStyle = '#b026ff'; ctx.font = '14px "Press Start 2P", monospace'
      ctx.fillText('TETRIS', w / 2, h / 2 - 40)
      ctx.fillStyle = '#ffe600'; ctx.font = '6px "Press Start 2P", monospace'
      ctx.fillText('HOLD + T-SPIN + COMBO', w / 2, h / 2 - 15)
      ctx.fillStyle = '#00f0ff'; ctx.font = '5px "Press Start 2P", monospace'
      ctx.fillText('SHIFT: Hold | ↑: Rotate', w / 2, h / 2 + 5)
      ctx.fillStyle = '#4a4a6a'; ctx.font = '6px "Press Start 2P", monospace'
      if (Math.sin(Date.now() / 300) > 0) ctx.fillText('PRESS ANY KEY', w / 2, h / 2 + 30)
    }

    // Game over
    if (this.state === 'gameover') {
      ctx.fillStyle = 'rgba(15,15,26,0.85)'; ctx.fillRect(0, 0, w, h)
      ctx.textAlign = 'center'
      ctx.fillStyle = '#ff2d95'; ctx.shadowColor = '#ff2d95'; ctx.shadowBlur = 12
      ctx.font = '14px "Press Start 2P", monospace'; ctx.fillText('GAME OVER', w / 2, h / 2 - 30); ctx.shadowBlur = 0
      ctx.fillStyle = '#39ff14'; ctx.font = '8px "Press Start 2P", monospace'
      ctx.fillText(`SCORE: ${this.score}`, w / 2, h / 2)
      ctx.fillStyle = '#ffe600'; ctx.font = '6px "Press Start 2P", monospace'
      ctx.fillText(`LV${this.level} LINES:${this.lines}`, w / 2, h / 2 + 20)
      if (this.bestCombo >= 2) {
        ctx.fillStyle = '#b026ff'; ctx.font = '6px "Press Start 2P", monospace'
        ctx.fillText(`BEST COMBO: x${this.bestCombo}`, w / 2, h / 2 + 35)
      }
      const hs = parseInt(localStorage.getItem('neon_arcade_hs_tetris') || '0')
      if (this.score > hs) { ctx.fillStyle = '#ffe600'; ctx.shadowColor = '#ffe600'; ctx.shadowBlur = 10; ctx.font = '7px "Press Start 2P", monospace'; ctx.fillText('NEW RECORD!', w / 2, h / 2 + 50); ctx.shadowBlur = 0 }
      ctx.fillStyle = '#4a4a6a'; ctx.font = '6px "Press Start 2P", monospace'
      if (Math.sin(Date.now() / 300) > 0) ctx.fillText('R TO RETRY', w / 2, h / 2 + 70)
    }

    ctx.restore()
  }
}