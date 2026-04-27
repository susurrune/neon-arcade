// ============ 宇宙引擎 v2 — 玩家驱动的有序游戏宇宙 ============
// 无自演化、无引力、无光流。星球按轨道规律运动。
// 玩家发布游戏 → 成为恒星，游戏成为行星。
// 星系 = 游戏大类，恒星 = 用户，行星 = 游戏。

import * as THREE from 'three'

// ==================== 类型定义 ====================

export interface PlanetData {
  id: string
  gameId: string
  name: string
  description: string

  // 自定义外观
  color: string
  size: number            // 0.5~2.0
  hasRing: boolean
  ringColor: string
  emissive: number        // 0~1
  image?: string          // 星球封面图 URL

  // 轨道参数
  orbitRadius: number
  orbitAngle: number      // 初始角度 (rad)
  orbitSpeed: number      // rad/s
  orbitTilt: number       // 轨道倾斜 (rad), 增加视觉层次

  // 数据
  creatorId: string
  creatorName: string
  creatorAvatar: string
  playCount: number
  highScore: number
  rating: number
}

export interface StarSystemData {
  id: string
  ownerId: string
  ownerName: string
  ownerAvatar: string
  galaxyId: string

  // 恒星效果自定义
  starColor: string
  starGlow: number         // 0~1
  starRing: boolean
  starRingColor: string

  // 轨道参数（绕星系中心）
  orbitRadius: number
  orbitAngle: number
  orbitSpeed: number
  orbitTilt: number       // 轻微倾斜

  planets: PlanetData[]
}

export interface GalaxyData {
  id: string
  nameZh: string
  nameEn: string
  color: string
  center: THREE.Vector3
  radius: number

  // 星系轨道参数（绕宇宙中心）
  orbitRadius: number
  orbitAngle: number      // 当前角度
  orbitSpeed: number      // 旋转速度

  starSystems: StarSystemData[]
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
  // 作者恒星效果
  authorStarColor?: string
  authorStarGlow?: number
  authorStarRing?: boolean
  authorStarRingColor?: string
  playCount?: number
  highScore?: number
  rating?: number
  // 星球自定义
  planetColor?: string
  planetSize?: number
  hasRing?: boolean
  ringColor?: string
  emissive?: number
  planetImage?: string   // 星球封面图 URL
}

export interface UserInfo {
  id: string
  nickname: string
  avatar: string
  // 恒星效果自定义
  starColor?: string
  starGlow?: number
  starRing?: boolean
  starRingColor?: string
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
  '用户': 'puzzle', // 默认放益智
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

/** 确定性随机 — 同一输入永远返回同一结果 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

/** 字符串 → 数字种子 */
function strSeed(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/** 从预设色板中选色 */
function pickColor(seed: string): string {
  const idx = Math.floor(seededRandom(strSeed(seed)) * PLANET_PRESETS.length)
  return PLANET_PRESETS[idx % PLANET_PRESETS.length].color
}

// ==================== 宇宙引擎 ====================

export class UniverseEngine {
  galaxies: GalaxyData[] = []
  private elapsed = 0
  private allPlanets = new Map<string, PlanetData>()
  private allStars = new Map<string, StarSystemData>()

  /** 从游戏列表构建整个宇宙 */
  build(games: GameInput[], users?: Map<string, UserInfo>) {
    this.galaxies = []
    this.allPlanets.clear()
    this.allStars.clear()

    // 1. 初始化所有星系（圆环分布 + 轨道参数）
    const galaxyCount = GALAXY_DEFS.length
    const universeRadius = 80 // 宇宙半径

    GALAXY_DEFS.forEach((def, i) => {
      const initAngle = (i / galaxyCount) * Math.PI * 2
      const orbitRadius = universeRadius

      this.galaxies.push({
        id: def.id,
        nameZh: def.nameZh,
        nameEn: def.nameEn,
        color: def.color,
        center: new THREE.Vector3(0, 0, 0), // 动态计算
        radius: 25,
        orbitRadius,
        orbitAngle: initAngle,
        orbitSpeed: 0.003 + seededRandom(strSeed(def.id)) * 0.002, // 缓慢旋转
        starSystems: [],
      })
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

    // 3. 为每组创建 StarSystem + Planets
    for (const [key, groupGames] of groups) {
      const [galaxyId, authorId] = key.split('::')
      const galaxy = this.galaxies.find(g => g.id === galaxyId)
      if (!galaxy) continue

      const firstGame = groupGames[0]
      const user = users?.get(authorId)
      const ownerName = user?.nickname || firstGame.authorName || (authorId === 'system' ? 'NEON ARCADE' : authorId)
      const ownerAvatar = user?.avatar || firstGame.authorAvatar || 'preset:1'

      // 恒星轨道参数 — 确定性分配
      const starSeed = strSeed(key)
      const starIdx = galaxy.starSystems.length
      const starOrbitRadius = 8 + starIdx * 5 + seededRandom(starSeed) * 3
      const starOrbitAngle = (starIdx / Math.max(groupGames.length, 1)) * Math.PI * 2 + seededRandom(starSeed + 1) * 0.5
      const starOrbitSpeed = 0.02 + seededRandom(starSeed + 2) * 0.015 // 慢速公转
      const starOrbitTilt = (seededRandom(starSeed + 3) - 0.5) * 0.15

      const starSystem: StarSystemData = {
        id: `star_${galaxyId}_${authorId}`,
        ownerId: authorId,
        ownerName,
        ownerAvatar,
        galaxyId,
        // 恒星效果 — 从游戏数据中获取（作者设置）
        starColor: firstGame.authorStarColor || '#ffaa00',
        starGlow: firstGame.authorStarGlow ?? 0.5,
        starRing: firstGame.authorStarRing ?? false,
        starRingColor: firstGame.authorStarRingColor || '#a855f7',
        orbitRadius: starOrbitRadius,
        orbitAngle: starOrbitAngle,
        orbitSpeed: starOrbitSpeed,
        orbitTilt: starOrbitTilt,
        planets: [],
      }

      // 行星
      groupGames.forEach((game, pIdx) => {
        const pSeed = strSeed(game.id)
        const planet: PlanetData = {
          id: `planet_${game.id}`,
          gameId: game.id,
          name: game.name,
          description: game.description,

          color: game.planetColor || pickColor(game.id),
          size: game.planetSize || (0.6 + seededRandom(pSeed) * 0.8),
          hasRing: game.hasRing ?? seededRandom(pSeed + 10) > 0.6,
          ringColor: game.ringColor || '#ffffff',
          emissive: game.emissive ?? (0.2 + seededRandom(pSeed + 20) * 0.5),
          image: game.planetImage || undefined,

          orbitRadius: 2.5 + pIdx * 1.8 + seededRandom(pSeed + 30) * 0.8,
          orbitAngle: (pIdx / groupGames.length) * Math.PI * 2 + seededRandom(pSeed + 40) * 1.0,
          orbitSpeed: 0.15 + seededRandom(pSeed + 50) * 0.2, // 行星比恒星快
          orbitTilt: (seededRandom(pSeed + 60) - 0.5) * 0.4,

          creatorId: authorId,
          creatorName: ownerName,
          creatorAvatar: ownerAvatar,
          playCount: game.playCount || 0,
          highScore: game.highScore || 0,
          rating: game.rating || 0,
        }

        starSystem.planets.push(planet)
        this.allPlanets.set(planet.id, planet)
      })

      galaxy.starSystems.push(starSystem)
      this.allStars.set(starSystem.id, starSystem)
    }

    this.elapsed = 0
  }

  /** 每帧更新 — 轨道运动 + 星系旋转 */
  update(dt: number) {
    this.elapsed += dt

    for (const galaxy of this.galaxies) {
      // 星系绕宇宙中心缓慢旋转
      galaxy.orbitAngle += galaxy.orbitSpeed * dt
      const cx = Math.cos(galaxy.orbitAngle) * galaxy.orbitRadius
      const cz = Math.sin(galaxy.orbitAngle) * galaxy.orbitRadius
      galaxy.center.set(cx, 0, cz)

      for (const star of galaxy.starSystems) {
        // 恒星绕星系中心公转
        star.orbitAngle += star.orbitSpeed * dt

        // 行星绕恒星公转
        for (const planet of star.planets) {
          planet.orbitAngle += planet.orbitSpeed * dt
        }
      }
    }
  }

  /** 获取恒星世界坐标 */
  getStarWorldPos(star: StarSystemData): THREE.Vector3 {
    const galaxy = this.galaxies.find(g => g.id === star.galaxyId)
    if (!galaxy) return new THREE.Vector3()

    const a = star.orbitAngle
    const r = star.orbitRadius
    const tilt = star.orbitTilt

    return new THREE.Vector3(
      galaxy.center.x + Math.cos(a) * r,
      Math.sin(tilt) * r * Math.sin(a) * 0.3,
      galaxy.center.z + Math.sin(a) * r,
    )
  }

  /** 获取行星世界坐标 */
  getPlanetWorldPos(planet: PlanetData): THREE.Vector3 {
    const star = this.findStarByPlanet(planet.id)
    if (!star) return new THREE.Vector3()

    const starPos = this.getStarWorldPos(star)
    const a = planet.orbitAngle
    const r = planet.orbitRadius
    const tilt = planet.orbitTilt

    return new THREE.Vector3(
      starPos.x + Math.cos(a) * r,
      starPos.y + Math.sin(tilt) * Math.sin(a) * r * 0.3,
      starPos.z + Math.sin(a) * r,
    )
  }

  /** 查找行星所属恒星 */
  findStarByPlanet(planetId: string): StarSystemData | null {
    for (const galaxy of this.galaxies) {
      for (const star of galaxy.starSystems) {
        if (star.planets.some(p => p.id === planetId)) return star
      }
    }
    return null
  }

  /** 根据 ID 查找行星 */
  findPlanet(id: string): PlanetData | undefined {
    return this.allPlanets.get(id)
  }

  /** 根据 ID 查找恒星系统 */
  findStar(id: string): StarSystemData | undefined {
    return this.allStars.get(id)
  }

  /** 获取所有行星（用于 Raycasting） */
  getAllPlanets(): PlanetData[] {
    return Array.from(this.allPlanets.values())
  }

  /** 获取所有恒星 */
  getAllStars(): StarSystemData[] {
    return Array.from(this.allStars.values())
  }

  /** 获取经过时间 */
  getElapsed(): number {
    return this.elapsed
  }

  // ---- 内部方法 ----

  private resolveGalaxyId(tags: string[]): string {
    for (const tag of tags) {
      if (TAG_TO_GALAXY[tag]) return TAG_TO_GALAXY[tag]
    }
    return 'puzzle' // 默认
  }
}
