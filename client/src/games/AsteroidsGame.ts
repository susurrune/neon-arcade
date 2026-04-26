// ============================================
// NEON ASTEROIDS — 霓虹陨石带
// 360° 旋转控制 + 惯性物理 + 陨石碎裂 + 超空间瞬移
// ============================================

interface Vec { x: number; y: number }

interface Ship {
  pos: Vec
  vel: Vec
  rot: number          // radians, 0 = facing right
  thrustOn: boolean
  invuln: number       // frames of invulnerability remaining
}

interface Asteroid {
  pos: Vec
  vel: Vec
  size: 1 | 2 | 3       // 1=small  2=med  3=large
  rot: number
  rotSpeed: number
  shape: number[]       // pre-baked jagged radius offsets
  color: string
}

interface Bullet { pos: Vec; vel: Vec; life: number }

interface Particle {
  pos: Vec
  vel: Vec
  life: number
  maxLife: number
  color: string
  size: number
}

interface FloatText { x: number; y: number; text: string; life: number; color: string }

const MAX_SPEED        = 5.5
const FRICTION         = 0.992
const ROT_SPEED        = 0.08
const THRUST           = 0.14
const BULLET_SPEED     = 9
const BULLET_LIFE      = 55
const FIRE_DELAY       = 8         // frames between shots
const INVULN_FRAMES    = 100
const HYPERSPACE_COOL  = 90

const SIZE_RADIUS = { 1: 12, 2: 22, 3: 36 } as const
const SIZE_POINTS = { 1: 100, 2: 50, 3: 20 } as const
const SIZE_VERTS  = { 1: 7, 2: 9, 3: 11 } as const

export class AsteroidsGame {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private W = 640
  private H = 480
  private dpr = 1
  private animId = 0
  private running = false
  private state: 'title' | 'playing' | 'gameover' = 'title'

  private ship!: Ship
  private asteroids: Asteroid[] = []
  private bullets: Bullet[] = []
  private particles: Particle[] = []
  private floats: FloatText[] = []

  private wave = 1
  private score = 0
  private lives = 3
  private hyperspaceCharges = 3
  private fireDelay = 0
  private hyperspaceCool = 0
  private screenShake = 0
  private waveBanner = 0
  private starfield: { x: number; y: number; b: number }[] = []
  private gridPhase = 0
  private bestCombo = 0
  private comboCount = 0
  private comboTimer = 0

  private keys = new Set<string>()
  private touchPos: Vec | null = null

  private onScoreUpdate: (s: number) => void
  private boundDown: (e: KeyboardEvent) => void
  private boundUp: (e: KeyboardEvent) => void
  private boundCanvasClick: (e: MouseEvent) => void
  private boundTouchStart: (e: TouchEvent) => void
  private boundTouchEnd: (e: TouchEvent) => void

  constructor(canvas: HTMLCanvasElement, onScoreUpdate: (s: number) => void) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.onScoreUpdate = onScoreUpdate
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)

    this.W = canvas.width
    this.H = canvas.height
    this.canvas.width = this.W * this.dpr
    this.canvas.height = this.H * this.dpr
    this.canvas.style.imageRendering = 'auto' // crisp neon vectors, not pixel
    this.ctx.scale(this.dpr, this.dpr)
    this.ctx.lineCap = 'round'
    this.ctx.lineJoin = 'round'

    this.boundDown  = (e) => this.onKeyDown(e)
    this.boundUp    = (e) => this.onKeyUp(e)
    this.boundCanvasClick = () => this.onTap()
    this.boundTouchStart = (e) => { e.preventDefault(); this.onTap() }
    this.boundTouchEnd   = (e) => { e.preventDefault() }

    window.addEventListener('keydown', this.boundDown)
    window.addEventListener('keyup', this.boundUp)
    this.canvas.addEventListener('click', this.boundCanvasClick)
    this.canvas.addEventListener('touchstart', this.boundTouchStart, { passive: false })
    this.canvas.addEventListener('touchend',   this.boundTouchEnd,   { passive: false })

    this.initStarfield()
    this.resetGame()
  }

  // ====================================================
  // Public API (matches GameCanvas factory contract)
  // ====================================================
  start() {
    if (this.running) return
    this.running = true
    const loop = () => {
      if (!this.running) return
      this.update()
      this.draw()
      this.animId = requestAnimationFrame(loop)
    }
    this.animId = requestAnimationFrame(loop)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.animId)
  }

  destroy() {
    this.stop()
    window.removeEventListener('keydown', this.boundDown)
    window.removeEventListener('keyup', this.boundUp)
    this.canvas.removeEventListener('click', this.boundCanvasClick)
    this.canvas.removeEventListener('touchstart', this.boundTouchStart)
    this.canvas.removeEventListener('touchend',   this.boundTouchEnd)
  }

  // ====================================================
  // State management
  // ====================================================
  private resetGame() {
    this.ship = {
      pos: { x: this.W / 2, y: this.H / 2 },
      vel: { x: 0, y: 0 },
      rot: -Math.PI / 2,   // facing up
      thrustOn: false,
      invuln: 60,
    }
    this.asteroids = []
    this.bullets = []
    this.particles = []
    this.floats = []
    this.wave = 1
    this.score = 0
    this.lives = 3
    this.hyperspaceCharges = 3
    this.comboCount = 0
    this.comboTimer = 0
    this.bestCombo = 0
    this.spawnWave()
    this.onScoreUpdate(0)
  }

  private spawnWave() {
    const count = 3 + this.wave
    for (let i = 0; i < count; i++) {
      this.asteroids.push(this.makeAsteroid(3))
    }
    this.waveBanner = 90
  }

  private makeAsteroid(size: 1 | 2 | 3, atPos?: Vec): Asteroid {
    let pos: Vec
    if (atPos) {
      pos = { x: atPos.x, y: atPos.y }
    } else {
      // Spawn at edge, away from ship
      const edge = Math.floor(Math.random() * 4)
      switch (edge) {
        case 0: pos = { x: Math.random() * this.W, y: -30 }; break
        case 1: pos = { x: this.W + 30, y: Math.random() * this.H }; break
        case 2: pos = { x: Math.random() * this.W, y: this.H + 30 }; break
        default: pos = { x: -30, y: Math.random() * this.H }; break
      }
    }
    const speed = (size === 3 ? 0.6 : size === 2 ? 1.1 : 1.6) + Math.random() * 0.6 + this.wave * 0.06
    const dir = atPos
      ? Math.random() * Math.PI * 2
      : Math.atan2(this.H / 2 - pos.y, this.W / 2 - pos.x) + (Math.random() - 0.5) * 0.8

    const vertCount = SIZE_VERTS[size]
    const shape: number[] = []
    for (let i = 0; i < vertCount; i++) {
      shape.push(0.75 + Math.random() * 0.5)  // jagged radius factor
    }
    const colors = ['#FF2E88', '#7C3AED', '#FF6B35']
    return {
      pos,
      vel: { x: Math.cos(dir) * speed, y: Math.sin(dir) * speed },
      size,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.04,
      shape,
      color: colors[Math.floor(Math.random() * colors.length)],
    }
  }

  private initStarfield() {
    this.starfield = []
    for (let i = 0; i < 80; i++) {
      this.starfield.push({
        x: Math.random() * this.W,
        y: Math.random() * this.H,
        b: 0.2 + Math.random() * 0.8,
      })
    }
  }

  // ====================================================
  // Input
  // ====================================================
  private onKeyDown(e: KeyboardEvent) {
    const k = e.key.toLowerCase()
    if (['arrowleft','arrowright','arrowup','arrowdown',' ','space'].includes(k)) {
      e.preventDefault()
    }
    this.keys.add(k)

    if (this.state !== 'playing') {
      if (k === 'r' || k === 'enter') {
        this.resetGame()
        this.state = 'playing'
      }
      return
    }
    if (k === 'shift') this.useHyperspace()
  }

  private onKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.key.toLowerCase())
  }

  private onTap() {
    if (this.state === 'title' || this.state === 'gameover') {
      this.resetGame()
      this.state = 'playing'
    }
  }

  private useHyperspace() {
    if (this.hyperspaceCharges <= 0 || this.hyperspaceCool > 0) return
    this.hyperspaceCharges--
    this.hyperspaceCool = HYPERSPACE_COOL
    // Particle burst at old position
    this.spawnParticles(this.ship.pos.x, this.ship.pos.y, 24, '#22D3EE')
    // Teleport to a safe-ish random spot
    let bestX = this.W / 2, bestY = this.H / 2, bestDist = -1
    for (let i = 0; i < 8; i++) {
      const tx = 60 + Math.random() * (this.W - 120)
      const ty = 60 + Math.random() * (this.H - 120)
      let minD = Infinity
      for (const a of this.asteroids) {
        const d = Math.hypot(a.pos.x - tx, a.pos.y - ty)
        if (d < minD) minD = d
      }
      if (minD > bestDist) { bestDist = minD; bestX = tx; bestY = ty }
    }
    this.ship.pos.x = bestX
    this.ship.pos.y = bestY
    this.ship.vel.x = 0
    this.ship.vel.y = 0
    this.ship.invuln = 60
    this.spawnParticles(bestX, bestY, 24, '#22D3EE')
    this.screenShake = 8
  }

  // ====================================================
  // Update
  // ====================================================
  private update() {
    this.gridPhase = (this.gridPhase + 0.3) % 40
    this.particles = this.particles.filter((p) => --p.life > 0)
    this.floats = this.floats.filter((f) => --f.life > 0)
    for (const p of this.particles) {
      p.pos.x += p.vel.x
      p.pos.y += p.vel.y
      p.vel.x *= 0.97
      p.vel.y *= 0.97
    }
    if (this.screenShake > 0) this.screenShake *= 0.85

    if (this.state !== 'playing') return

    // === Ship rotation & thrust ===
    if (this.keys.has('arrowleft') || this.keys.has('a'))  this.ship.rot -= ROT_SPEED
    if (this.keys.has('arrowright') || this.keys.has('d')) this.ship.rot += ROT_SPEED

    this.ship.thrustOn = this.keys.has('arrowup') || this.keys.has('w')
    if (this.ship.thrustOn) {
      this.ship.vel.x += Math.cos(this.ship.rot) * THRUST
      this.ship.vel.y += Math.sin(this.ship.rot) * THRUST
      // Cap speed
      const sp = Math.hypot(this.ship.vel.x, this.ship.vel.y)
      if (sp > MAX_SPEED) {
        this.ship.vel.x = (this.ship.vel.x / sp) * MAX_SPEED
        this.ship.vel.y = (this.ship.vel.y / sp) * MAX_SPEED
      }
      // Engine particles
      if (Math.random() < 0.6) {
        const back = this.ship.rot + Math.PI
        const px = this.ship.pos.x + Math.cos(back) * 12
        const py = this.ship.pos.y + Math.sin(back) * 12
        this.particles.push({
          pos: { x: px, y: py },
          vel: { x: Math.cos(back) * 2 + (Math.random() - 0.5), y: Math.sin(back) * 2 + (Math.random() - 0.5) },
          life: 14, maxLife: 14, color: '#22D3EE', size: 1.5,
        })
      }
    }

    this.ship.vel.x *= FRICTION
    this.ship.vel.y *= FRICTION
    this.ship.pos.x = this.wrap(this.ship.pos.x + this.ship.vel.x, this.W)
    this.ship.pos.y = this.wrap(this.ship.pos.y + this.ship.vel.y, this.H)

    if (this.ship.invuln > 0) this.ship.invuln--
    if (this.hyperspaceCool > 0) this.hyperspaceCool--

    // === Fire ===
    if (this.fireDelay > 0) this.fireDelay--
    if ((this.keys.has(' ') || this.keys.has('space')) && this.fireDelay <= 0) {
      this.bullets.push({
        pos: { x: this.ship.pos.x + Math.cos(this.ship.rot) * 14, y: this.ship.pos.y + Math.sin(this.ship.rot) * 14 },
        vel: { x: Math.cos(this.ship.rot) * BULLET_SPEED + this.ship.vel.x * 0.3,
               y: Math.sin(this.ship.rot) * BULLET_SPEED + this.ship.vel.y * 0.3 },
        life: BULLET_LIFE,
      })
      this.fireDelay = FIRE_DELAY
    }

    // === Bullets ===
    this.bullets = this.bullets.filter((b) => {
      b.pos.x = this.wrap(b.pos.x + b.vel.x, this.W)
      b.pos.y = this.wrap(b.pos.y + b.vel.y, this.H)
      return --b.life > 0
    })

    // === Asteroids ===
    for (const a of this.asteroids) {
      a.pos.x = this.wrap(a.pos.x + a.vel.x, this.W)
      a.pos.y = this.wrap(a.pos.y + a.vel.y, this.H)
      a.rot += a.rotSpeed
    }

    // === Combo timer ===
    if (this.comboTimer > 0) {
      this.comboTimer--
      if (this.comboTimer === 0) this.comboCount = 0
    }

    // === Bullet × Asteroid collisions ===
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const a = this.asteroids[i]
      const r = SIZE_RADIUS[a.size]
      for (let j = this.bullets.length - 1; j >= 0; j--) {
        const b = this.bullets[j]
        if (Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y) < r) {
          this.destroyAsteroid(i, true)
          this.bullets.splice(j, 1)
          break
        }
      }
    }

    // === Ship × Asteroid collision ===
    if (this.ship.invuln <= 0) {
      for (const a of this.asteroids) {
        const r = SIZE_RADIUS[a.size]
        if (Math.hypot(a.pos.x - this.ship.pos.x, a.pos.y - this.ship.pos.y) < r + 8) {
          this.shipHit()
          break
        }
      }
    }

    // === Wave clear ===
    if (this.asteroids.length === 0) {
      this.wave++
      const bonus = this.wave * 200
      this.score += bonus
      this.onScoreUpdate(this.score)
      this.floats.push({ x: this.W / 2, y: this.H / 2 - 20, text: `WAVE ${this.wave - 1} CLEAR! +${bonus}`, life: 90, color: '#39ff14' })
      this.spawnWave()
    }

    if (this.waveBanner > 0) this.waveBanner--
  }

  private destroyAsteroid(idx: number, byPlayer: boolean) {
    const a = this.asteroids[idx]
    const points = SIZE_POINTS[a.size]
    if (byPlayer) {
      this.comboCount++
      this.comboTimer = 120
      if (this.comboCount > this.bestCombo) this.bestCombo = this.comboCount
      const mult = this.comboCount >= 5 ? 3 : this.comboCount >= 3 ? 2 : 1
      const gained = points * mult
      this.score += gained
      this.onScoreUpdate(this.score)
      this.floats.push({
        x: a.pos.x, y: a.pos.y,
        text: mult > 1 ? `+${gained} ×${mult}` : `+${gained}`,
        life: 50, color: mult > 1 ? '#ffe600' : '#22D3EE',
      })
    }
    this.spawnParticles(a.pos.x, a.pos.y, a.size === 3 ? 18 : a.size === 2 ? 12 : 8, a.color)
    this.screenShake = Math.max(this.screenShake, a.size * 1.5)

    // Split into two smaller pieces
    if (a.size > 1) {
      const childSize = (a.size - 1) as 1 | 2
      for (let k = 0; k < 2; k++) {
        const child = this.makeAsteroid(childSize, a.pos)
        // Spread velocity perpendicular to original
        const baseAngle = Math.atan2(a.vel.y, a.vel.x)
        const spread = baseAngle + (k === 0 ? Math.PI / 2 : -Math.PI / 2) + (Math.random() - 0.5) * 0.6
        const sp = Math.hypot(a.vel.x, a.vel.y) * 1.3 + 0.5
        child.vel.x = Math.cos(spread) * sp
        child.vel.y = Math.sin(spread) * sp
        this.asteroids.push(child)
      }
    }
    this.asteroids.splice(idx, 1)
  }

  private shipHit() {
    this.lives--
    this.spawnParticles(this.ship.pos.x, this.ship.pos.y, 30, '#FF2E88')
    this.screenShake = 16
    this.comboCount = 0
    this.comboTimer = 0
    if (this.lives <= 0) {
      this.state = 'gameover'
    } else {
      this.ship.pos = { x: this.W / 2, y: this.H / 2 }
      this.ship.vel = { x: 0, y: 0 }
      this.ship.rot = -Math.PI / 2
      this.ship.invuln = INVULN_FRAMES
    }
  }

  private spawnParticles(x: number, y: number, count: number, color: string) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const sp = 0.5 + Math.random() * 4
      this.particles.push({
        pos: { x, y },
        vel: { x: Math.cos(a) * sp, y: Math.sin(a) * sp },
        life: 25 + Math.random() * 20,
        maxLife: 45, color,
        size: 1 + Math.random() * 2,
      })
    }
  }

  private wrap(v: number, max: number): number {
    if (v < 0) return v + max
    if (v >= max) return v - max
    return v
  }

  // ====================================================
  // Draw
  // ====================================================
  private draw() {
    const ctx = this.ctx
    const w = this.W, h = this.H

    // Screen shake offset
    const sx = this.screenShake > 0 ? (Math.random() - 0.5) * this.screenShake : 0
    const sy = this.screenShake > 0 ? (Math.random() - 0.5) * this.screenShake : 0
    ctx.save()
    ctx.translate(sx, sy)

    // Background
    ctx.fillStyle = '#050510'
    ctx.fillRect(0, 0, w, h)

    // Subtle grid
    ctx.strokeStyle = 'rgba(124,58,237,0.08)'
    ctx.lineWidth = 1
    const gp = this.gridPhase
    for (let x = -gp; x < w; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
    }
    for (let y = -gp; y < h; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
    }

    // Stars
    for (const s of this.starfield) {
      ctx.fillStyle = `rgba(255,255,255,${s.b * 0.4})`
      ctx.fillRect(s.x, s.y, 1, 1)
    }

    // Asteroids
    for (const a of this.asteroids) this.drawAsteroid(a)

    // Bullets
    for (const b of this.bullets) {
      ctx.fillStyle = '#22D3EE'
      ctx.shadowColor = '#22D3EE'
      ctx.shadowBlur = 12
      ctx.beginPath()
      ctx.arc(b.pos.x, b.pos.y, 2.5, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.shadowBlur = 0

    // Ship
    if (this.state === 'playing' || this.state === 'gameover') {
      this.drawShip()
    }

    // Particles
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife
      ctx.fillStyle = this.alpha(p.color, alpha)
      ctx.fillRect(p.pos.x - p.size / 2, p.pos.y - p.size / 2, p.size, p.size)
    }

    // Float text
    for (const f of this.floats) {
      const a = Math.min(1, f.life / 30)
      ctx.font = '700 12px "JetBrains Mono", monospace'
      ctx.textAlign = 'center'
      ctx.fillStyle = this.alpha(f.color, a)
      ctx.shadowColor = f.color
      ctx.shadowBlur = 10
      ctx.fillText(f.text, f.x, f.y - (50 - f.life) * 0.3)
      ctx.shadowBlur = 0
    }

    ctx.restore()

    // HUD (no shake)
    this.drawHUD()

    // Wave banner
    if (this.waveBanner > 0 && this.state === 'playing') {
      const a = Math.min(1, this.waveBanner / 30) * (this.waveBanner > 60 ? (90 - this.waveBanner) / 30 : 1)
      ctx.font = '700 32px "Press Start 2P", "JetBrains Mono", monospace'
      ctx.textAlign = 'center'
      ctx.fillStyle = this.alpha('#FF2E88', a)
      ctx.shadowColor = '#FF2E88'
      ctx.shadowBlur = 18
      ctx.fillText(`WAVE ${this.wave}`, w / 2, h / 2)
      ctx.shadowBlur = 0
    }

    // Title / Game over screens
    if (this.state === 'title') this.drawTitle()
    if (this.state === 'gameover') this.drawGameOver()
  }

  private drawAsteroid(a: Asteroid) {
    const ctx = this.ctx
    const r = SIZE_RADIUS[a.size]
    ctx.save()
    ctx.translate(a.pos.x, a.pos.y)
    ctx.rotate(a.rot)
    ctx.strokeStyle = a.color
    ctx.shadowColor = a.color
    ctx.shadowBlur = 8
    ctx.lineWidth = 1.8
    ctx.beginPath()
    const verts = a.shape.length
    for (let i = 0; i < verts; i++) {
      const ang = (i / verts) * Math.PI * 2
      const rr = r * a.shape[i]
      const x = Math.cos(ang) * rr
      const y = Math.sin(ang) * rr
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.stroke()
    // Inner detail line
    ctx.strokeStyle = this.alpha(a.color, 0.3)
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let i = 0; i < verts; i += 2) {
      const ang = (i / verts) * Math.PI * 2
      const rr = r * a.shape[i] * 0.6
      const x = Math.cos(ang) * rr
      const y = Math.sin(ang) * rr
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.restore()
    ctx.shadowBlur = 0
  }

  private drawShip() {
    const ctx = this.ctx
    const s = this.ship
    // Blink while invulnerable
    if (s.invuln > 0 && Math.floor(s.invuln / 4) % 2 === 0) return
    ctx.save()
    ctx.translate(s.pos.x, s.pos.y)
    ctx.rotate(s.rot)

    // Triangle ship
    ctx.strokeStyle = '#22D3EE'
    ctx.shadowColor = '#22D3EE'
    ctx.shadowBlur = 14
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(14, 0)
    ctx.lineTo(-10, -9)
    ctx.lineTo(-6, 0)
    ctx.lineTo(-10, 9)
    ctx.closePath()
    ctx.stroke()
    ctx.shadowBlur = 0

    // Cockpit dot
    ctx.fillStyle = '#22D3EE'
    ctx.beginPath()
    ctx.arc(4, 0, 1.5, 0, Math.PI * 2)
    ctx.fill()

    // Thrust flame
    if (s.thrustOn && Math.random() > 0.2) {
      ctx.strokeStyle = '#ffe600'
      ctx.shadowColor = '#FF6B35'
      ctx.shadowBlur = 10
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(-6, -4)
      ctx.lineTo(-12 - Math.random() * 6, 0)
      ctx.lineTo(-6, 4)
      ctx.stroke()
      ctx.shadowBlur = 0
    }
    ctx.restore()
  }

  private drawHUD() {
    const ctx = this.ctx
    const w = this.W
    ctx.font = '700 11px "JetBrains Mono", monospace'
    ctx.textBaseline = 'top'

    // Score (left)
    ctx.textAlign = 'left'
    ctx.fillStyle = '#22D3EE'
    ctx.fillText(`SCORE  ${this.score.toString().padStart(6, '0')}`, 12, 10)

    // Wave (center)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#FF2E88'
    ctx.fillText(`WAVE ${this.wave}`, w / 2, 10)

    // Lives + hyperspace (right)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#39ff14'
    let xRight = w - 12
    // Lives icons
    for (let i = 0; i < this.lives; i++) {
      this.drawShipIcon(xRight - i * 14, 14, '#39ff14')
    }
    xRight -= this.lives * 14 + 10
    ctx.fillStyle = '#7C3AED'
    ctx.textAlign = 'right'
    ctx.fillText(`H:${this.hyperspaceCharges}`, xRight, 10)

    // Combo bar
    if (this.comboCount >= 2) {
      ctx.textAlign = 'left'
      ctx.fillStyle = this.comboCount >= 5 ? '#ffe600' : '#FF2E88'
      ctx.shadowColor = ctx.fillStyle as string
      ctx.shadowBlur = 8
      ctx.fillText(`× ${this.comboCount}`, 12, 28)
      // timer bar
      const barW = 60
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.fillRect(12, 44, barW, 3)
      ctx.fillStyle = ctx.shadowColor as string
      ctx.fillRect(12, 44, barW * (this.comboTimer / 120), 3)
      ctx.shadowBlur = 0
    }
  }

  private drawShipIcon(x: number, y: number, color: string) {
    const ctx = this.ctx
    ctx.save()
    ctx.translate(x, y)
    ctx.strokeStyle = color
    ctx.shadowColor = color
    ctx.shadowBlur = 6
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(0, -6)
    ctx.lineTo(4, 4)
    ctx.lineTo(-4, 4)
    ctx.closePath()
    ctx.stroke()
    ctx.shadowBlur = 0
    ctx.restore()
  }

  private drawTitle() {
    const ctx = this.ctx
    const w = this.W, h = this.H
    ctx.fillStyle = 'rgba(5,5,16,0.7)'
    ctx.fillRect(0, 0, w, h)

    ctx.font = '700 28px "Press Start 2P", "JetBrains Mono", monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#FF2E88'
    ctx.shadowColor = '#FF2E88'
    ctx.shadowBlur = 18
    ctx.fillText('NEON ASTEROIDS', w / 2, h / 2 - 60)
    ctx.shadowBlur = 0

    ctx.font = '700 11px "JetBrains Mono", monospace'
    ctx.fillStyle = '#22D3EE'
    ctx.fillText('A / D  旋转   ·   W  推进   ·   SPACE  射击', w / 2, h / 2 - 10)
    ctx.fillStyle = '#7C3AED'
    ctx.fillText('SHIFT  超空间瞬移 (3 次)', w / 2, h / 2 + 12)
    ctx.fillStyle = '#39ff14'
    ctx.fillText('击碎陨石得分 · 连击 ×3 倍率 · 清波奖励', w / 2, h / 2 + 34)

    // Blinking start hint
    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.font = '700 14px "Press Start 2P", "JetBrains Mono", monospace'
      ctx.fillStyle = '#ffe600'
      ctx.shadowColor = '#ffe600'
      ctx.shadowBlur = 10
      ctx.fillText('► 点击或按 ENTER 开始', w / 2, h / 2 + 80)
      ctx.shadowBlur = 0
    }
    ctx.textBaseline = 'alphabetic'
  }

  private drawGameOver() {
    const ctx = this.ctx
    const w = this.W, h = this.H
    ctx.fillStyle = 'rgba(5,5,16,0.75)'
    ctx.fillRect(0, 0, w, h)

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '700 28px "Press Start 2P", "JetBrains Mono", monospace'
    ctx.fillStyle = '#FF2E88'
    ctx.shadowColor = '#FF2E88'
    ctx.shadowBlur = 18
    ctx.fillText('GAME OVER', w / 2, h / 2 - 60)
    ctx.shadowBlur = 0

    ctx.font = '700 14px "JetBrains Mono", monospace'
    ctx.fillStyle = '#22D3EE'
    ctx.fillText(`分数  ${this.score.toLocaleString()}`, w / 2, h / 2 - 18)
    ctx.fillStyle = '#7C3AED'
    ctx.fillText(`到达第 ${this.wave} 波`, w / 2, h / 2 + 4)
    ctx.fillStyle = '#39ff14'
    ctx.fillText(`最高连击  ×${this.bestCombo}`, w / 2, h / 2 + 26)

    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.font = '700 12px "Press Start 2P", "JetBrains Mono", monospace'
      ctx.fillStyle = '#ffe600'
      ctx.shadowColor = '#ffe600'
      ctx.shadowBlur = 10
      ctx.fillText('► 按 R 或点击重来', w / 2, h / 2 + 70)
      ctx.shadowBlur = 0
    }
    ctx.textBaseline = 'alphabetic'
  }

  private alpha(color: string, a: number): string {
    if (color.startsWith('rgba')) return color
    if (color.length === 7) {
      const v = Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0')
      return color + v
    }
    return color
  }
}
