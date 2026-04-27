// ============================================
// NEON FARM v1 — 霓虹农场，模拟星系专属
// ============================================
import { playSound } from '../utils/sound'

type CropType = 'wheat' | 'tomato' | 'corn' | 'flower'
type AnimalType = 'chicken' | 'cow' | 'pig'

interface Crop {
  x: number
  y: number
  type: CropType
  stage: number // 0-4 成长阶段
  growthTime: number
  plantedTime: number
  watered: boolean
}

interface Animal {
  x: number
  y: number
  type: AnimalType
  happiness: number
  productionTimer: number
  lastProduce: number
}

export class FarmGame {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private W = 640; private H = 480
  private animId = 0
  private running = false
  private state: 'title' | 'playing' = 'title'
  private onScore: (s: number) => void

  // 游戏状态
  private score = 0
  private money = 50
  private day = 1
  private dayTimer = 0
  private dayLength = 30000 // 30秒一天

  // 农场网格
  private gridCols = 8
  private gridRows = 6
  private cellSize = 60
  private grid: (Crop | null)[][] = []

  // 动物
  private animals: Animal[] = []
  private animalArea = { x: 480, y: 120, w: 140, h: 300 }

  // 产品
  private products: { x: number; y: number; type: string; value: number }[] = []

  // 当前选择
  private selectedTool: 'plant' | 'water' | 'harvest' | 'buy' = 'plant'
  private selectedCrop: CropType = 'wheat'
  private selectedAnimal: AnimalType | null = null

  // 作物配置
  private CROP_CONFIG: Record<CropType, { growthTime: number; price: number; value: number; color: string }> = {
    wheat: { growthTime: 10000, price: 5, value: 15, color: '#ffd700' },
    tomato: { growthTime: 15000, price: 10, value: 30, color: '#ff4444' },
    corn: { growthTime: 20000, price: 15, value: 45, color: '#ffaa00' },
    flower: { growthTime: 25000, price: 20, value: 60, color: '#ff2d95' },
  }

  // 动物配置
  private ANIMAL_CONFIG: Record<AnimalType, { price: number; productValue: number; productTime: number }> = {
    chicken: { price: 30, productValue: 10, productTime: 10000 },
    cow: { price: 100, productValue: 25, productTime: 15000 },
    pig: { price: 50, productValue: 15, productTime: 12000 },
  }

  // 时间
  private lastTime = 0

  constructor(canvas: HTMLCanvasElement, onScore: (s: number) => void) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.onScore = onScore
    this.initGrid()
    this.setupInput()
  }

  private kdHandler: ((e: KeyboardEvent) => void) | null = null
  private clickHandler: ((e: MouseEvent) => void) | null = null

  private setupInput() {
    this.kdHandler = (e: KeyboardEvent) => this.handleKey(e)
    this.clickHandler = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      this.handleClick(mx, my)
    }
    this.canvas.addEventListener('keydown', this.kdHandler)
    this.canvas.addEventListener('click', this.clickHandler)
    this.canvas.setAttribute('tabindex', '0')
    this.canvas.focus()
  }

  private initGrid() {
    this.grid = Array(this.gridRows).fill(null).map(() => Array(this.gridCols).fill(null))
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
  }

  private reset() {
    this.initGrid()
    this.animals = []
    this.products = []
    this.score = 0
    this.money = 50
    this.day = 1
    this.dayTimer = 0
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

    // 时间流逝
    this.dayTimer += dt * 16.67
    if (this.dayTimer >= this.dayLength) {
      this.dayTimer = 0
      this.day++
      playSound('levelup')
    }

    // 作物生长
    const nowMs = performance.now()
    for (let y = 0; y < this.gridRows; y++) {
      for (let x = 0; x < this.gridCols; x++) {
        const crop = this.grid[y][x]
        if (crop && crop.stage < 4) {
          const growthSpeed = crop.watered ? 1.5 : 1
          if (nowMs - crop.plantedTime > crop.growthTime * growthSpeed * (crop.stage + 1) / 4) {
            crop.stage++
            crop.watered = false
            if (crop.stage === 4) playSound('coin')
          }
        }
      }
    }

    // 动物生产
    for (const animal of this.animals) {
      if (nowMs - animal.lastProduce > this.ANIMAL_CONFIG[animal.type].productTime) {
        animal.lastProduce = nowMs
        animal.happiness = Math.min(100, animal.happiness + 10)

        // 生成产品
        const prodX = animal.x + Math.random() * 20 - 10
        const prodY = animal.y + 30
        this.products.push({
          x: prodX,
          y: prodY,
          type: animal.type === 'chicken' ? 'egg' : animal.type === 'cow' ? 'milk' : 'truffle',
          value: this.ANIMAL_CONFIG[animal.type].productValue,
        })
        playSound('click')
      }

      // 动物移动
      animal.x += (Math.random() - 0.5) * 2 * dt
      animal.y += (Math.random() - 0.5) * 2 * dt
      animal.x = Math.max(this.animalArea.x + 20, Math.min(this.animalArea.x + this.animalArea.w - 20, animal.x))
      animal.y = Math.max(this.animalArea.y + 20, Math.min(this.animalArea.y + this.animalArea.h - 40, animal.y))
    }

    this.onScore(this.score)
  }

  private render() {
    // 背景 - 草地
    this.ctx.fillStyle = '#1a3a1a'
    this.ctx.fillRect(0, 0, this.W, this.H)

    // 农田区域
    this.ctx.fillStyle = '#2a4a2a'
    this.ctx.fillRect(0, 60, this.gridCols * this.cellSize, this.gridRows * this.cellSize)

    // 农田格子
    this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)'
    for (let x = 0; x <= this.gridCols; x++) {
      this.ctx.beginPath()
      this.ctx.moveTo(x * this.cellSize, 60)
      this.ctx.lineTo(x * this.cellSize, 60 + this.gridRows * this.cellSize)
      this.ctx.stroke()
    }
    for (let y = 0; y <= this.gridRows; y++) {
      this.ctx.beginPath()
      this.ctx.moveTo(0, 60 + y * this.cellSize)
      this.ctx.lineTo(this.gridCols * this.cellSize, 60 + y * this.cellSize)
      this.ctx.stroke()
    }

    // 动物区域
    this.ctx.fillStyle = '#3a2a1a'
    this.ctx.fillRect(this.animalArea.x, this.animalArea.y, this.animalArea.w, this.animalArea.h)
    this.ctx.strokeStyle = '#ffaa00'
    this.ctx.strokeRect(this.animalArea.x, this.animalArea.y, this.animalArea.w, this.animalArea.h)

    // 作物
    for (let y = 0; y < this.gridRows; y++) {
      for (let x = 0; x < this.gridCols; x++) {
        const crop = this.grid[y][x]
        if (crop) {
          const cx = x * this.cellSize + this.cellSize / 2
          const cy = 60 + y * this.cellSize + this.cellSize / 2
          const config = this.CROP_CONFIG[crop.type]

          // 生长阶段可视化
          const stageSize = 5 + crop.stage * 8
          this.ctx.fillStyle = config.color
          this.ctx.beginPath()
          this.ctx.arc(cx, cy, stageSize, 0, Math.PI * 2)
          this.ctx.fill()

          // 成熟标记
          if (crop.stage === 4) {
            this.ctx.strokeStyle = '#ffd700'
            this.ctx.lineWidth = 2
            this.ctx.beginPath()
            this.ctx.arc(cx, cy, stageSize + 3, 0, Math.PI * 2)
            this.ctx.stroke()
          }

          // 浇水效果
          if (crop.watered) {
            this.ctx.fillStyle = 'rgba(0, 240, 255, 0.3)'
            this.ctx.fillRect(x * this.cellSize, 60 + y * this.cellSize, this.cellSize, this.cellSize)
          }
        }
      }
    }

    // 动物
    for (const animal of this.animals) {
      this.ctx.save()
      this.ctx.translate(animal.x, animal.y)

      const size = animal.type === 'cow' ? 18 : animal.type === 'pig' ? 15 : 12
      const color = animal.type === 'cow' ? '#ffffff' : animal.type === 'pig' ? '#ffaaaa' : '#ffdd00'

      this.ctx.fillStyle = color
      this.ctx.beginPath()
      this.ctx.arc(0, 0, size, 0, Math.PI * 2)
      this.ctx.fill()

      // 眼睛
      this.ctx.fillStyle = '#000000'
      this.ctx.beginPath()
      this.ctx.arc(-4, -3, 2, 0, Math.PI * 2)
      this.ctx.arc(4, -3, 2, 0, Math.PI * 2)
      this.ctx.fill()

      this.ctx.restore()
    }

    // 产品
    for (const prod of this.products) {
      this.ctx.fillStyle = prod.type === 'egg' ? '#fffddd' : prod.type === 'milk' ? '#ffffff' : '#8a5a3a'
      this.ctx.beginPath()
      this.ctx.arc(prod.x, prod.y, 8, 0, Math.PI * 2)
      this.ctx.fill()
      this.ctx.strokeStyle = '#ffd700'
      this.ctx.stroke()
    }

    // HUD
    this.ctx.font = '12px "Press Start 2P"'
    this.ctx.fillStyle = '#ffd700'
    this.ctx.fillText(`$${this.money}`, 20, 30)

    this.ctx.fillStyle = '#00f0ff'
    this.ctx.fillText(`DAY ${this.day}`, this.W - 100, 30)

    this.ctx.fillStyle = '#39ff14'
    this.ctx.fillText(`SCORE: ${this.score}`, 20, 50)

    // 工具栏
    const toolY = this.H - 50
    const tools = ['PLANT', 'WATER', 'HARVEST', 'BUY']
    for (let i = 0; i < 4; i++) {
      const x = 20 + i * 80
      this.ctx.fillStyle = this.selectedTool === tools[i].toLowerCase() ? '#00f0ff' : '#252540'
      this.ctx.fillRect(x, toolY, 70, 40)

      this.ctx.fillStyle = '#ffffff'
      this.ctx.font = '8px "Press Start 2P"'
      this.ctx.fillText(tools[i], x + 10, toolY + 25)
    }

    // 作物选择（种植模式）
    if (this.selectedTool === 'plant') {
      const crops: CropType[] = ['wheat', 'tomato', 'corn', 'flower']
      for (let i = 0; i < 4; i++) {
        const x = 340 + i * 50
        const config = this.CROP_CONFIG[crops[i]]
        this.ctx.fillStyle = this.selectedCrop === crops[i] ? config.color : '#252540'
        this.ctx.fillRect(x, toolY, 45, 40)
        this.ctx.fillStyle = '#ffffff'
        this.ctx.font = '7px "Press Start 2P"'
        this.ctx.fillText(`$${config.price}`, x + 5, toolY + 25)
      }
    }

    // 动物购买（购买模式）
    if (this.selectedTool === 'buy') {
      const animals: AnimalType[] = ['chicken', 'cow', 'pig']
      for (let i = 0; i < 3; i++) {
        const x = 340 + i * 60
        const config = this.ANIMAL_CONFIG[animals[i]]
        this.ctx.fillStyle = '#252540'
        this.ctx.fillRect(x, toolY, 55, 40)
        this.ctx.fillStyle = '#ffffff'
        this.ctx.font = '7px "Press Start 2P"'
        this.ctx.fillText(`${animals[i]}`, x + 5, toolY + 15)
        this.ctx.fillText(`$${config.price}`, x + 5, toolY + 30)
      }
    }

    // 标题画面
    if (this.state === 'title') {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      this.ctx.fillRect(0, 0, this.W, this.H)

      this.ctx.font = '20px "Press Start 2P"'
      this.ctx.fillStyle = '#39ff14'
      this.ctx.textAlign = 'center'
      this.ctx.fillText('NEON FARM', this.W / 2, this.H / 2 - 60)

      this.ctx.font = '12px "Press Start 2P"'
      this.ctx.fillStyle = '#ffffff'
      this.ctx.fillText('点击格子种植作物', this.W / 2, this.H / 2 - 20)
      this.ctx.fillText('点击成熟作物收获', this.W / 2, this.H / 2)
      this.ctx.fillText('点击动物区域购买动物', this.W / 2, this.H / 2 + 20)
      this.ctx.fillText('收集产品赚钱', this.W / 2, this.H / 2 + 40)
      this.ctx.fillText('点击或按 R 开始', this.W / 2, this.H / 2 + 80)
    }
  }

  handleClick(mx: number, my: number) {
    if (this.state === 'title') {
      this.reset()
      return
    }

    // 工具栏点击
    const toolY = this.H - 50
    if (my >= toolY && my <= toolY + 40) {
      const tools: ('plant' | 'water' | 'harvest' | 'buy')[] = ['plant', 'water', 'harvest', 'buy']
      for (let i = 0; i < 4; i++) {
        const x = 20 + i * 80
        if (mx >= x && mx <= x + 70) {
          this.selectedTool = tools[i]
          playSound('click')
          return
        }
      }

      // 作物选择
      if (this.selectedTool === 'plant') {
        const crops: CropType[] = ['wheat', 'tomato', 'corn', 'flower']
        for (let i = 0; i < 4; i++) {
          const x = 340 + i * 50
          if (mx >= x && mx <= x + 45) {
            this.selectedCrop = crops[i]
            playSound('click')
            return
          }
        }
      }

      // 动物购买
      if (this.selectedTool === 'buy') {
        const animals: AnimalType[] = ['chicken', 'cow', 'pig']
        for (let i = 0; i < 3; i++) {
          const x = 340 + i * 60
          if (mx >= x && mx <= x + 55) {
            this.selectedAnimal = animals[i]
            const config = this.ANIMAL_CONFIG[animals[i]]
            if (this.money >= config.price) {
              this.money -= config.price
              this.animals.push({
                x: this.animalArea.x + 50 + Math.random() * 40,
                y: this.animalArea.y + 50 + Math.random() * 200,
                type: animals[i],
                happiness: 50,
                productionTimer: 0,
                lastProduce: performance.now(),
              })
              playSound('coin')
            }
            return
          }
        }
      }
    }

    // 农田点击
    if (mx < this.gridCols * this.cellSize && my >= 60 && my < 60 + this.gridRows * this.cellSize) {
      const cellX = Math.floor(mx / this.cellSize)
      const cellY = Math.floor((my - 60) / this.cellSize)

      if (this.selectedTool === 'plant') {
        if (!this.grid[cellY][cellX]) {
          const config = this.CROP_CONFIG[this.selectedCrop]
          if (this.money >= config.price) {
            this.money -= config.price
            this.grid[cellY][cellX] = {
              x: cellX,
              y: cellY,
              type: this.selectedCrop,
              stage: 0,
              growthTime: config.growthTime,
              plantedTime: performance.now(),
              watered: false,
            }
            playSound('click')
          }
        }
      }

      if (this.selectedTool === 'water') {
        const crop = this.grid[cellY][cellX]
        if (crop && crop.stage < 4 && !crop.watered) {
          crop.watered = true
          playSound('click')
        }
      }

      if (this.selectedTool === 'harvest') {
        const crop = this.grid[cellY][cellX]
        if (crop && crop.stage === 4) {
          const config = this.CROP_CONFIG[crop.type]
          this.money += config.value
          this.score += config.value * 10
          this.grid[cellY][cellX] = null
          playSound('coin')
        }
      }
    }

    // 收集产品
    for (let i = this.products.length - 1; i >= 0; i--) {
      const prod = this.products[i]
      const dist = Math.hypot(mx - prod.x, my - prod.y)
      if (dist < 20) {
        this.money += prod.value
        this.score += prod.value * 10
        this.products.splice(i, 1)
        playSound('coin')
      }
    }
  }

  handleKey(e: KeyboardEvent) {
    if (e.key === ' ') e.preventDefault()
    if (this.state === 'title' && e.key === 'r') {
      this.reset()
    }

    if (this.state === 'playing') {
      if (e.key === '1') this.selectedTool = 'plant'
      if (e.key === '2') this.selectedTool = 'water'
      if (e.key === '3') this.selectedTool = 'harvest'
      if (e.key === '4') this.selectedTool = 'buy'
    }
  }
}