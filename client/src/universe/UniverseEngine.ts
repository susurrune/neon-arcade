// ============ 宇宙引擎 v3 — 新层级结构 ============
// 星系 = 游戏分类
// 恒星 = 星系中心（显示星系信息）
// 行星 = 发布游戏的用户
// 卫星 = 具体游戏

import * as THREE from 'three'

// ==================== 类型定义 ====================

/** 卫星数据 = 具体游戏 */
export interface SatelliteData {
  id: string
  gameId: string
  name: string
  description: string

  // 自定义外观
  color: string
  size: number            // 0.3~1.0（比行星小）
  hasRing: boolean
  ringColor: string
  emissive: number
  image?: string

  // 轨道参数（绕行星）
  orbitRadius: number
  orbitAngle: number
  orbitSpeed: number
  orbitTilt: number

  // 数据
  playCount: number
  highScore: number
  rating: number
}

/** 行星数据 = 发布游戏的用户 */
export interface PlanetData {
  id: string
  ownerId: string
  ownerName: string
  ownerAvatar: string
  galaxyId: string

  // 行星外观
  planetColor: string
  planetGlow: number
  planetRing: boolean
  planetRingColor: string
  planetSize: number

  // 轨道参数（绕恒星）
  orbitRadius: number
  orbitAngle: number
  orbitSpeed: number
  orbitTilt: number

  // 卫星（游戏）
  satellites: SatelliteData[]
}

/** 恒星数据 = 星系中心 */
export interface StarData {
  id: string
  galaxyId: string
  name: string
  nameZh: string
  nameEn: string
  color: string
  icon: string

  // 恒星位置（在星系中心）
  position: THREE.Vector3
  radius: number
  glowIntensity: number

  // 所属行星（作者）
  planets: PlanetData[]
}

/** 星系数据 */
export interface GalaxyData {
  id: string
  nameZh: string
  nameEn: string
  color: string
  icon: string

  // 星系位置和范围
  center: THREE.Vector3
  radius: number

  // 星系轨道参数（绕宇宙中心）
  orbitRadius: number
  orbitAngle: number
  orbitSpeed: number

  // 中心恒星
  star: StarData
}

// 从 API GameInfo 映射过来的简化接口
export interface GameInput {
  id: string
  name: string
  description: string
  tags: string[]
  authorId?: string
  authorName?: string
  authorAvatar?: string
  // 作者行星效果
  authorStarColor?: string
  authorStarGlow?: number
  authorStarRing?: boolean
  authorStarRingColor?: string
  playCount?: number
  highScore?: number
  rating?: number
  // 游戏卫星自定义
  planetColor?: string
  planetSize?: number
  hasRing?: boolean
  ringColor?: string
  emissive?: number
  planetImage?: string
}

export interface UserInfo {
  id: string
  nickname: string
  avatar: string
  planetColor?: string
  planetGlow?: number
  planetRing?: boolean
  planetRingColor?: string
}

// ==================== 星系定义 ====================

export const GALAXY_DEFS = [
  { id: 'puzzle',      nameZh: '益智星系',   nameEn: 'Puzzle Galaxy',      color: '#22D3EE', icon: '🧩' },
  { id: 'shooter',     nameZh: '射击星系',   nameEn: 'Shooter Galaxy',     color: '#FF2E88', icon: '🔫' },
  { id: 'adventure',   nameZh: '冒险星系',   nameEn: 'Adventure Galaxy',   color: '#7C3AED', icon: '⚔️' },
  { id: 'racing',      nameZh: '竞速星系',   nameEn: 'Racing Galaxy',      color: '#F59E0B', icon: '🏎️' },
  { id: 'strategy',    nameZh: '策略星系',   nameEn: 'Strategy Galaxy',    color: '#10B981', icon: '♟️' },
  { id: 'rpg',         nameZh: 'RPG星系',    nameEn: 'RPG Galaxy',         color: '#8B5CF6', icon: '🧙' },
  { id: 'simulation',  nameZh: '模拟星系',   nameEn: 'Simulation Galaxy',  color: '#EC4899', icon: '🏗️' },
] as const

// tag → galaxyId 映射
const TAG_TO_GALAXY: Record<string, string> = {
  '益智': 'puzzle', '经典': 'puzzle', '消除': 'puzzle',
  '射击': 'shooter',
  '冒险': 'adventure', '平台': 'adventure',
  '竞速': 'racing', '赛车': 'racing',
  '策略': 'strategy', '塔防': 'strategy',
  'RPG': 'rpg', '角色': 'rpg',
  '模拟': 'simulation', '经营': 'simulation',
  '用户': 'puzzle',
}

// ==================== 颜色预设 ====================

export const PLANET_PRESETS = [
  { color: '#FF6B6B', name: '烈焰红', nameEn: 'Flame Red' },
  { color: '#4ECDC4', name: '薄荷青', nameEn: 'Mint Cyan' },
  { color: '#FFE66D', name: '星辰金', nameEn: 'Star Gold' },
  { color: '#A855F7', name: '星云紫', nameEn: 'Nebula Purple' },
  { color: '#22D3EE', name: '冰蓝', nameEn: 'Ice Blue' },
  { color: '#39FF14', name: '脉冲绿', nameEn: 'Pulse Green' },
  { color: '#FF2E88', name: '超新星粉', nameEn: 'Supernova Pink' },
  { color: '#F97316', name: '日冕橙', nameEn: 'Corona Orange' },
]

// ==================== 工具函数 ====================

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

function strSeed(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function pickColor(seed: string): string {
  const idx = Math.floor(seededRandom(strSeed(seed)) * PLANET_PRESETS.length)
  return PLANET_PRESETS[idx % PLANET_PRESETS.length].color
}

// ==================== 宇宙引擎 ====================

export class UniverseEngine {
  galaxies: GalaxyData[] = []
  private elapsed = 0
  private allSatellites = new Map<string, SatelliteData>()
  private allPlanets = new Map<string, PlanetData>()
  private allStars = new Map<string, StarData>()

  /** 从游戏列表构建整个宇宙 */
  build(games: GameInput[], users?: Map<string, UserInfo>) {
    this.galaxies = []
    this.allSatellites.clear()
    this.allPlanets.clear()
    this.allStars.clear()

    const galaxyCount = GALAXY_DEFS.length
    const universeRadius = 80

    // 1. 初始化所有星系
    GALAXY_DEFS.forEach((def, i) => {
      const initAngle = (i / galaxyCount) * Math.PI * 2

      // 创建中心恒星
      const star: StarData = {
        id: `star_${def.id}`,
        galaxyId: def.id,
        name: def.nameZh,
        nameZh: def.nameZh,
        nameEn: def.nameEn,
        color: def.color,
        icon: def.icon,
        position: new THREE.Vector3(0, 0, 0), // 动态计算
        radius: 4,
        glowIntensity: 0.8,
        planets: [],
      }

      const galaxy: GalaxyData = {
        id: def.id,
        nameZh: def.nameZh,
        nameEn: def.nameEn,
        color: def.color,
        icon: def.icon,
        center: new THREE.Vector3(0, 0, 0),
        radius: 25,
        orbitRadius: universeRadius,
        orbitAngle: initAngle,
        orbitSpeed: 0.003 + seededRandom(strSeed(def.id)) * 0.002,
        star,
      }

      star.position = galaxy.center.clone()
      this.galaxies.push(galaxy)
      this.allStars.set(star.id, star)
    })

    // 2. 按 (galaxyId, authorId) 分组
    const groups = new Map<string, GameInput[]>()
    for (const g of games) {
      const galaxyId = this.resolveGalaxyId(g.tags)
      const authorId = g.authorId || 'system'
      const key = `${galaxyId}::${authorId}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(g)
    }

    // 3. 为每组创建 Planet + Satellites
    for (const [key, groupGames] of groups) {
      const [galaxyId, authorId] = key.split('::')
      const galaxy = this.galaxies.find(g => g.id === galaxyId)
      if (!galaxy) continue

      const firstGame = groupGames[0]
      const user = users?.get(authorId)
      const ownerName = user?.nickname || firstGame.authorName || (authorId === 'system' ? 'NEON ARCADE' : authorId)
      const ownerAvatar = user?.avatar || firstGame.authorAvatar || 'preset:1'

      // 行星轨道参数
      const planetSeed = strSeed(key)
      const planetIdx = galaxy.star.planets.length
      const planetOrbitRadius = 8 + planetIdx * 6 + seededRandom(planetSeed) * 4
      const planetOrbitAngle = seededRandom(planetSeed + 1) * Math.PI * 2
      const planetOrbitSpeed = 0.015 + seededRandom(planetSeed + 2) * 0.01
      const planetOrbitTilt = (seededRandom(planetSeed + 3) - 0.5) * 0.2

      const planet: PlanetData = {
        id: `planet_${galaxyId}_${authorId}`,
        ownerId: authorId,
        ownerName,
        ownerAvatar,
        galaxyId,
        planetColor: firstGame.authorStarColor || pickColor(authorId),
        planetGlow: firstGame.authorStarGlow ?? 0.5,
        planetRing: firstGame.authorStarRing ?? false,
        planetRingColor: firstGame.authorStarRingColor || '#ffffff',
        planetSize: 1.5 + seededRandom(planetSeed + 4) * 0.5,
        orbitRadius: planetOrbitRadius,
        orbitAngle: planetOrbitAngle,
        orbitSpeed: planetOrbitSpeed,
        orbitTilt: planetOrbitTilt,
        satellites: [],
      }

      // 卫星（游戏）
      groupGames.forEach((game, sIdx) => {
        const sSeed = strSeed(game.id)
        const satellite: SatelliteData = {
          id: `satellite_${game.id}`,
          gameId: game.id,
          name: game.name,
          description: game.description,

          color: game.planetColor || pickColor(game.id),
          size: game.planetSize || (0.4 + seededRandom(sSeed) * 0.3),
          hasRing: game.hasRing ?? seededRandom(sSeed + 10) > 0.7,
          ringColor: game.ringColor || '#ffffff',
          emissive: game.emissive ?? (0.2 + seededRandom(sSeed + 20) * 0.4),
          image: game.planetImage || undefined,

          orbitRadius: 2 + sIdx * 1.2 + seededRandom(sSeed + 30) * 0.5,
          orbitAngle: (sIdx / groupGames.length) * Math.PI * 2 + seededRandom(sSeed + 40) * 0.5,
          orbitSpeed: 0.25 + seededRandom(sSeed + 50) * 0.15,
          orbitTilt: (seededRandom(sSeed + 60) - 0.5) * 0.3,

          playCount: game.playCount || 0,
          highScore: game.highScore || 0,
          rating: game.rating || 0,
        }

        planet.satellites.push(satellite)
        this.allSatellites.set(satellite.id, satellite)
      })

      galaxy.star.planets.push(planet)
      this.allPlanets.set(planet.id, planet)
    }

    this.elapsed = 0
  }

  /** 每帧更新 */
  update(dt: number) {
    this.elapsed += dt

    for (const galaxy of this.galaxies) {
      // 星系绕宇宙中心旋转
      galaxy.orbitAngle += galaxy.orbitSpeed * dt
      const cx = Math.cos(galaxy.orbitAngle) * galaxy.orbitRadius
      const cz = Math.sin(galaxy.orbitAngle) * galaxy.orbitRadius
      galaxy.center.set(cx, 0, cz)

      // 恒星位置跟随星系中心
      galaxy.star.position.copy(galaxy.center)

      // 行星绕恒星公转
      for (const planet of galaxy.star.planets) {
        planet.orbitAngle += planet.orbitSpeed * dt

        // 卫星绕行星公转
        for (const satellite of planet.satellites) {
          satellite.orbitAngle += satellite.orbitSpeed * dt
        }
      }
    }
  }

  /** 获取行星世界坐标 */
  getPlanetWorldPos(planet: PlanetData): THREE.Vector3 {
    const galaxy = this.galaxies.find(g => g.id === planet.galaxyId)
    if (!galaxy) return new THREE.Vector3()

    const a = planet.orbitAngle
    const r = planet.orbitRadius
    const tilt = planet.orbitTilt

    return new THREE.Vector3(
      galaxy.star.position.x + Math.cos(a) * r,
      Math.sin(tilt) * r * Math.sin(a) * 0.3,
      galaxy.star.position.z + Math.sin(a) * r,
    )
  }

  /** 获取卫星世界坐标 */
  getSatelliteWorldPos(satellite: SatelliteData): THREE.Vector3 {
    const planet = this.findPlanetBySatellite(satellite.id)
    if (!planet) return new THREE.Vector3()

    const planetPos = this.getPlanetWorldPos(planet)
    const a = satellite.orbitAngle
    const r = satellite.orbitRadius
    const tilt = satellite.orbitTilt

    return new THREE.Vector3(
      planetPos.x + Math.cos(a) * r,
      planetPos.y + Math.sin(tilt) * Math.sin(a) * r * 0.3,
      planetPos.z + Math.sin(a) * r,
    )
  }

  /** 获取恒星世界坐标 */
  getStarWorldPos(star: StarData): THREE.Vector3 {
    return star.position.clone()
  }

  /** 查找卫星所属行星 */
  findPlanetBySatellite(satelliteId: string): PlanetData | null {
    for (const galaxy of this.galaxies) {
      for (const planet of galaxy.star.planets) {
        if (planet.satellites.some(s => s.id === satelliteId)) return planet
      }
    }
    return null
  }

  /** 查找行星所属恒星 */
  findStarByPlanet(planetId: string): StarData | null {
    for (const galaxy of this.galaxies) {
      if (galaxy.star.planets.some(p => p.id === planetId)) return galaxy.star
    }
    return null
  }

  /** 根据 ID 查找卫星 */
  findSatellite(id: string): SatelliteData | undefined {
    return this.allSatellites.get(id)
  }

  /** 根据 ID 查找行星 */
  findPlanet(id: string): PlanetData | undefined {
    return this.allPlanets.get(id)
  }

  /** 根据 ID 查找恒星 */
  findStar(id: string): StarData | undefined {
    return this.allStars.get(id)
  }

  /** 获取所有卫星（用于 Raycasting） */
  getAllSatellites(): SatelliteData[] {
    return Array.from(this.allSatellites.values())
  }

  /** 获取所有行星 */
  getAllPlanets(): PlanetData[] {
    return Array.from(this.allPlanets.values())
  }

  /** 获取所有恒星 */
  getAllStars(): StarData[] {
    return Array.from(this.allStars.values())
  }

  /** 获取经过时间 */
  getElapsed(): number {
    return this.elapsed
  }

  private resolveGalaxyId(tags: string[]): string {
    for (const tag of tags) {
      if (TAG_TO_GALAXY[tag]) return TAG_TO_GALAXY[tag]
    }
    return 'puzzle'
  }
}