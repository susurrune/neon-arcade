// ============ 宇宙系统类型定义 ============
// v2: 玩家驱动的游戏宇宙

// ===== 新增: v2 引擎导出 =====
export type { PlanetData, StarData, GalaxyData, GameInput, SatelliteData } from './UniverseEngine'
export { UniverseEngine, GALAXY_DEFS, PLANET_PRESETS } from './UniverseEngine'

// ===== 工业级 Camera 配置 =====
export const CAMERA_CONFIG = {
  damping: 0.08,           // 阻尼系数（0.06~0.12，越低越滑）
  rotateSpeed: 0.4,        // 旋转速度
  zoomSpeed: 0.8,          // 缩放速度
  panSpeed: 0.6,           // 平移速度
  inertiaDecay: 0.92,      // 惯性衰减（0.92~0.97，越高惯性越大）
  velocityCap: 30,         // 最大速度上限
  minZoom: 0.25,
  maxZoom: 3,
  zoomSmoothing: 0.1,      // 缩放缓动系数
  touchSensitivity: 0.7,   // 触控灵敏度
  touchSmoothing: 0.12,    // 触控平滑
}

export const WARP_CONFIG = {
  duration: 1200,           // ms
  distortionStrength: 0.6,  // 扭曲强度
  cameraPullSpeed: 0.12,    // 镜头拉近速度
  chromaticShift: 3,        // 色差偏移量
  zoomCurve: 'easeInOutCubic' as const,
  starStreakCount: 120,
  debrisCount: 40,
}

export const HOVER_CONFIG = {
  scaleFrom: 1.0,
  scaleTo: 1.08,
  transitionMs: 150,        // 平滑过渡时间
  emissiveBoost: 0.2,       // 发光增强
  rotationBoost: 0.3,       // 旋转加速
  borderGlowRadius: 18,     // 边框发光半径
  borderGlowAlpha: 0.5,     // 边框发光透明度
}

export const DESIGN_SYSTEM = {
  colors: {
    primary: '#7C3AED',       // 紫
    secondary: '#22D3EE',     // 青
    accent: '#FF2E88',        // 霓虹粉
    bgStart: '#050510',
    bgEnd: '#0A0A1A',
  },
  glow: {
    minRadius: 8,
    maxRadius: 24,
    minOpacity: 0.3,
    maxOpacity: 0.6,
  },
  ui: {
    borderRadius: 12,
    hoverAnimMs: 200,
    transitionEasing: 'cubic-bezier(0.33, 1, 0.68, 1)', // easeOutCubic
  },
  game: {
    comboWindow: 150,         // frames (~2.5s at 60fps)
    comboMultipliers: [1, 1, 2, 3, 5, 10],
    feedbackMaxMs: 50,        // 操作反馈最大延迟
  },
  performance: {
    targetFPS_PC: 60,
    targetFPS_Mobile: 45,
    degradeThreshold: 30,     // FPS低于此值触发降级
  },
}

export interface GameInfo {
  id: string
  name: string
  description: string
  icon: string
  tags: string[]
  date: string
  authorId?: string
  authorName?: string
  gameUrl?: string
  isOfficial?: boolean
  likes?: number
  views?: number
}

export interface Planet {
  id: string
  name: string
  description: string
  size: number
  colorTheme: string
  colorSecondary: string
  difficulty: number
  playerCount: number
  orbitSpeed: number
  glowIntensity: number
  hasRing: boolean
  isPulsing: boolean
  gameId: string
  tags: string[]
  likes: number
  views: number
  date: string
  isOfficial: boolean
  // ===== 新增: 发布事件相关 =====
  /** Unix timestamp (ms) when planet first appeared in universe.
   *  Used to drive "born" animation for ~3s after appearance. */
  bornAt?: number
  /** Days since publish, used for FRESH badge (< 7 days) */
  ageDays?: number
  /** True for the brief window where the "born" energy ring is animating */
  isJustBorn?: boolean
  // 动画状态（运行时）
  _hoverT?: number           // 0→1 hover平滑过渡
  _currentScale?: number     // 当前缩放值
}

export interface Galaxy {
  id: string
  name: string
  /** Home position — galaxy slowly drifts around this point */
  x: number
  y: number
  colorTheme: string
  planets: Planet[]
  /** Galaxy-level rotation speed (rad/s). Negative = counter-clockwise. */
  rotationSpeed: number
  /** Parallax depth: 0 = front, 1 = far back. */
  depth: number
  /** Radius the galaxy occupies — auto-grows with planet count */
  radius: number
  // ===== Slow elliptical drift around home position =====
  /** Horizontal drift amplitude in world units */
  driftRadiusX: number
  /** Vertical drift amplitude in world units */
  driftRadiusY: number
  /** Seconds for one horizontal cycle (longer = slower) */
  driftPeriodX: number
  /** Seconds for one vertical cycle — different from X to create Lissajous path */
  driftPeriodY: number
  /** Initial phase offset so galaxies don't all drift in sync */
  driftPhase: number
}

export interface Camera {
  x: number
  y: number
  zoom: number
  targetX: number
  targetY: number
  targetZoom: number
  // 惯性系统
  vx: number                // X方向速度
  vy: number                // Y方向速度
  pinchStartDist?: number
  pinchStartZoom?: number
}

export interface Star {
  x: number
  y: number
  size: number
  brightness: number
  speed: number
  color: string
  twinklePhase: number
  twinkleSpeed: number
}

export interface EnergyStream {
  fromX: number
  fromY: number
  toX: number
  toY: number
  color: string
  particles: StreamParticle[]
  intensity: number
}

export interface StreamParticle {
  t: number
  speed: number
  size: number
  offset: number
}

export interface WarpState {
  active: boolean
  progress: number
  targetPlanetId: string | null
  startX: number
  startY: number
  startZoom: number
  startTime: number         // 跃迁开始时间戳
}

export interface HoveredPlanet {
  planet: Planet
  screenX: number
  screenY: number
}

export type InteractionMode = 'explore' | 'warp' | 'enter-game'

// ===== 缓动函数库 =====
export const Easing = {
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeInExpo: (t: number) => t === 0 ? 0 : Math.pow(2, 10 * t - 10),
  easeOutExpo: (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeOutBack: (t: number) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2) },
  smoothStep: (t: number) => t * t * (3 - 2 * t),
}
