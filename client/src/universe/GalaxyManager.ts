// ============ 星系布局管理器 — 工业级动态宇宙 ============
import type { Planet, Galaxy, GameInfo } from './types'

const GALAXY_THEMES: Record<string, { color: string; name: string; pixelIcon: string }> = {
  '经典': { color: '#22D3EE', name: '经典星系', pixelIcon: 'swirl' },
  '消除': { color: '#7C3AED', name: '消除星系', pixelIcon: 'sparkle' },
  '平台': { color: '#39ff14', name: '冒险星系', pixelIcon: 'earth' },
  '射击': { color: '#FF2E88', name: '战斗星系', pixelIcon: 'bolt' },
  'user':  { color: '#ffe600', name: '创客星系', pixelIcon: 'hammer' },
  '用户':  { color: '#ffe600', name: '创客星系', pixelIcon: 'hammer' },
}

const PLANET_COLORS: Record<string, { primary: string; secondary: string }> = {
  'snake':     { primary: '#22D3EE', secondary: '#0891b2' },
  'tetris':    { primary: '#7C3AED', secondary: '#5b21b6' },
  'platformer':{ primary: '#39ff14', secondary: '#15803d' },
  'shooter':   { primary: '#FF2E88', secondary: '#be185d' },
}

// "Born" animation lasts this long after a planet first appears
const BORN_DURATION_MS = 3500
// FRESH badge lifetime — 7 days
const FRESH_THRESHOLD_DAYS = 7

export class GalaxyManager {
  private galaxies: Galaxy[] = []
  private allPlanets: Planet[] = []
  // Track which planets we've seen before so we can detect newly added ones
  private knownPlanetIds = new Set<string>()
  // Track when each new planet first appeared
  private firstSeenAt = new Map<string, number>()

  planetPositions: { planet: Planet; worldX: number; worldY: number }[] = []

  get galaxiesList() { return this.galaxies }
  get planets() { return this.allPlanets }

  buildFromGames(games: GameInfo[]) {
    const now = Date.now()
    this.galaxies = []
    this.allPlanets = []

    // 按标签分组
    const groups: Record<string, GameInfo[]> = {}
    const userGames: GameInfo[] = []

    for (const game of games) {
      if (!game.isOfficial) {
        userGames.push(game)
        continue
      }
      const tag = game.tags?.[0] || '经典'
      if (!groups[tag]) groups[tag] = []
      groups[tag].push(game)
    }
    if (userGames.length > 0) groups['user'] = userGames

    const galaxyKeys = Object.keys(groups)
    const galaxyCount = galaxyKeys.length

    // ==========================================================
    // Galaxies arranged in a ring; ring radius scales with count.
    // ==========================================================
    const ringRadius = Math.max(420, 280 + galaxyCount * 90)
    const angleOffset = -Math.PI / 2

    galaxyKeys.forEach((tag, idx) => {
      const gamesList = groups[tag]
      const theme = GALAXY_THEMES[tag] || GALAXY_THEMES['经典']
      const angle = angleOffset + (idx / galaxyCount) * Math.PI * 2
      const cx = Math.cos(angle) * ringRadius
      const cy = Math.sin(angle) * ringRadius

      // Galaxy radius grows with planet count — outermost orbit + breathing room
      const planetCount = gamesList.length
      const galaxyRadius = 120 + Math.max(0, planetCount - 1) * 55 + 60

      // ===== Slow self-rotation =====
      // Cosmic feel: each galaxy completes a full rotation in 4–10 minutes.
      // Alternating sign + slight variation so neighboring galaxies don't sync.
      const rotationSpeed = (idx % 2 === 0 ? 1 : -1) * (0.012 + (idx % 3) * 0.006)

      // ===== Elliptical drift around home position =====
      // Each galaxy slowly traces a unique elliptical path.
      // Different X/Y periods → Lissajous-like motion, never repeats exactly.
      const driftRadiusX = 26 + (idx % 3) * 10              // 26 / 36 / 46 px
      const driftRadiusY = 20 + (idx % 4) * 7               // 20 / 27 / 34 / 41 px
      const driftPeriodX = 75 + idx * 11                    // 75–130 s per X cycle
      const driftPeriodY = 105 + (idx * 7) % 40             // 105–145 s per Y cycle
      const driftPhase = idx * 1.37                         // unique starting offset

      // Parallax depth: galaxies further around the ring sit "deeper"
      const depth = Math.min(0.8, 0.15 + idx * 0.12)

      const planets: Planet[] = gamesList.map((game, pi) => {
        // Detect new planets: first time we see this id, stamp bornAt
        const planetKey = `planet-${game.id}`
        if (!this.knownPlanetIds.has(planetKey)) {
          this.firstSeenAt.set(planetKey, now)
          this.knownPlanetIds.add(planetKey)
        }
        const bornAt = this.firstSeenAt.get(planetKey) ?? now
        const sinceBorn = now - bornAt
        const isJustBorn = sinceBorn < BORN_DURATION_MS

        const ageDays = (now - new Date(game.date).getTime()) / 86400000

        const popularity = Math.min((game.views || 0) / 2000, 1)
        const size = 35 + popularity * 40
        const glowIntensity = 0.3 + popularity * 0.5
        const colors = PLANET_COLORS[game.id] || { primary: theme.color, secondary: '#333' }
        const highScore = (game.likes || 0) > 30
        const isFresh = ageDays < FRESH_THRESHOLD_DAYS

        // 星球在星系内的位置
        const orbitRadius = 100 + pi * 60
        const orbitAngle = (pi / Math.max(1, gamesList.length)) * Math.PI * 2

        const planet: Planet = {
          id: planetKey,
          name: game.name,
          description: game.description,
          size,
          colorTheme: colors.primary,
          colorSecondary: colors.secondary,
          difficulty: tag === '经典' ? 2 : tag === '射击' ? 4 : 3,
          playerCount: Math.floor(Math.random() * 50) + 5,
          // Slower orbit so motion feels celestial, not mechanical.
          // Combined with galaxyRotation in getPlanetPosition, full orbit ≈ 3–8 min.
          orbitSpeed: 0.05 + Math.random() * 0.08,
          glowIntensity,
          hasRing: highScore,
          isPulsing: isFresh, // pulse for first 7 days
          gameId: game.id,
          tags: game.tags,
          likes: game.likes || 0,
          views: game.views || 0,
          date: game.date,
          isOfficial: !!game.isOfficial,
          bornAt,
          ageDays,
          isJustBorn,
          // 相对星系中心
          _orbitRadius: orbitRadius,
          _orbitAngle: orbitAngle,
          _galaxyX: cx,
          _galaxyY: cy,
        } as Planet & { _orbitRadius: number; _orbitAngle: number; _galaxyX: number; _galaxyY: number }

        return planet
      })

      this.galaxies.push({
        id: `galaxy-${tag}`,
        name: theme.name,
        x: cx,
        y: cy,
        colorTheme: theme.color,
        planets,
        rotationSpeed,
        depth,
        radius: galaxyRadius,
        driftRadiusX,
        driftRadiusY,
        driftPeriodX,
        driftPeriodY,
        driftPhase,
      })

      this.allPlanets.push(...planets)
    })
  }

  /** Galaxy 中心位置 — 椭圆形缓慢漂移（Lissajous 路径） */
  getGalaxyPosition(galaxy: Galaxy, time: number): { x: number; y: number } {
    const tx = (time / galaxy.driftPeriodX) * Math.PI * 2 + galaxy.driftPhase
    const ty = (time / galaxy.driftPeriodY) * Math.PI * 2 + galaxy.driftPhase * 0.7
    return {
      x: galaxy.x + Math.sin(tx) * galaxy.driftRadiusX,
      y: galaxy.y + Math.cos(ty) * galaxy.driftRadiusY,
    }
  }

  /** 获取星球的世界坐标（含轨道运动 + 星系自转 + 星系漂移） */
  getPlanetPosition(planet: Planet, time: number): { x: number; y: number } {
    const p = planet as Planet & {
      _orbitRadius: number; _orbitAngle: number;
      _galaxyX: number; _galaxyY: number;
    }
    // Find the parent galaxy — small N, linear search is fine
    const galaxy = this.galaxies.find((g) => g.planets.some((pp) => pp.id === planet.id))
    if (!galaxy) {
      return { x: p._galaxyX, y: p._galaxyY }
    }

    // 1. Galaxy drift offset (the whole galaxy is moving through space)
    const drift = this.getGalaxyPosition(galaxy, time)
    const driftX = drift.x - galaxy.x
    const driftY = drift.y - galaxy.y

    // 2. Galaxy self-rotation (planets revolve around galaxy center)
    const galaxyRotation = galaxy.rotationSpeed * time

    // 3. Planet's own orbital motion
    const angle = p._orbitAngle + time * planet.orbitSpeed * 0.1 + galaxyRotation

    return {
      x: p._galaxyX + driftX + Math.cos(angle) * p._orbitRadius,
      y: p._galaxyY + driftY + Math.sin(angle) * p._orbitRadius,
    }
  }

  /** 星系间能量流 — 端点跟随星系漂移 */
  getEnergyStreams(time: number = 0): { from: { x: number; y: number }; to: { x: number; y: number }; color: string }[] {
    const streams: { from: { x: number; y: number }; to: { x: number; y: number }; color: string }[] = []
    for (let i = 0; i < this.galaxies.length; i++) {
      const a = this.getGalaxyPosition(this.galaxies[i], time)
      for (let j = i + 1; j < this.galaxies.length; j++) {
        const b = this.getGalaxyPosition(this.galaxies[j], time)
        streams.push({
          from: a,
          to: b,
          color: this.galaxies[i].colorTheme,
        })
      }
    }
    return streams
  }

  /** Refresh isJustBorn flag every frame (called by render loop) */
  updateBornStates() {
    const now = Date.now()
    for (const planet of this.allPlanets) {
      if (planet.bornAt) {
        planet.isJustBorn = now - planet.bornAt < BORN_DURATION_MS
      }
    }
  }
}
