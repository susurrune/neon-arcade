// ============ 宇宙3D组件 v3 — 新层级结构 ============
// 恒星 = 星系中心，行星 = 发布者，卫星 = 游戏
import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UniverseEngine, PlanetData, StarData, SatelliteData, GALAXY_DEFS, GameInput,
} from './UniverseEngine'
import { UniverseRenderer } from './UniverseRenderer'
import { useGameStore } from '../store/gameStore'
import { Avatar } from '../components/Avatar'
import type { GameInfo } from '../api'

// ==================== 宇宙主页组件 ====================

export default function Universe3D() {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<UniverseEngine | null>(null)
  const rendererRef = useRef<UniverseRenderer | null>(null)

  const { games, setGames, user, lang, loadHighScore } = useGameStore()
  const navigate = useNavigate()

  const [selectedSatellite, setSelectedSatellite] = useState<SatelliteData | null>(null)
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetData | null>(null)
  const [selectedStar, setSelectedStar] = useState<StarData | null>(null)
  const [showHint, setShowHint] = useState(true)

  // 星系显隐状态
  const [galaxyVisible, setGalaxyVisible] = useState<Record<string, boolean>>(
    Object.fromEntries(GALAXY_DEFS.map(g => [g.id, true]))
  )

  const isZh = lang === 'zh'
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!containerRef.current) return
    if (initializedRef.current) return
    initializedRef.current = true

    const engine = new UniverseEngine()
    engineRef.current = engine

    const gameInputs: GameInput[] = (games.length > 0 ? games : FALLBACK_GAMES).map((g: GameInfo) => ({
      id: g.id,
      name: g.name,
      description: g.description || '',
      tags: g.tags || ['益智'],
      authorId: g.authorId || (g.isOfficial ? 'system' : undefined),
      authorName: g.authorName || (g.isOfficial ? 'NEON ARCADE' : ''),
      authorAvatar: g.authorAvatar || 'preset:1',
      authorStarColor: g.authorStarColor || '#ffaa00',
      authorStarGlow: g.authorStarGlow ?? 0.5,
      authorStarRing: g.authorStarRing ?? false,
      authorStarRingColor: g.authorStarRingColor || '#a855f7',
      playCount: g.views || 0,
      highScore: 0,
      rating: 0,
      planetColor: g.planetColor,
      planetSize: g.planetSize,
      hasRing: g.hasRing,
      ringColor: g.ringColor,
      emissive: g.emissive,
      planetImage: g.planetImage,
    }))

    engine.build(gameInputs)

    const renderer = new UniverseRenderer(
      containerRef.current,
      engine,
      {
        onSatelliteClick: (satellite) => {
          setSelectedSatellite(satellite)
          setSelectedPlanet(null)
          setSelectedStar(null)
        },
        onSatelliteDoubleClick: (satellite) => {
          navigate(`/game/${satellite.gameId}`)
        },
        onPlanetClick: (planet) => {
          setSelectedPlanet(planet)
          setSelectedSatellite(null)
          setSelectedStar(null)
        },
        onStarClick: (star) => {
          setSelectedStar(star)
          setSelectedSatellite(null)
          setSelectedPlanet(null)
        },
        onBackgroundClick: () => {
          setSelectedSatellite(null)
          setSelectedPlanet(null)
          setSelectedStar(null)
        },
      },
    )
    rendererRef.current = renderer
    renderer.start()

    const timer = setTimeout(() => setShowHint(false), 5000)

    return () => {
      clearTimeout(timer)
      renderer.dispose()
      initializedRef.current = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 当 games 更新时重建宇宙
  useEffect(() => {
    if (!engineRef.current || !rendererRef.current) return

    const gameInputs: GameInput[] = (games.length > 0 ? games : FALLBACK_GAMES).map((g: GameInfo) => ({
      id: g.id,
      name: g.name,
      description: g.description || '',
      tags: g.tags || ['益智'],
      authorId: g.authorId || (g.isOfficial ? 'system' : undefined),
      authorName: g.authorName || (g.isOfficial ? 'NEON ARCADE' : ''),
      authorAvatar: g.authorAvatar || 'preset:1',
      authorStarColor: g.authorStarColor || '#ffaa00',
      authorStarGlow: g.authorStarGlow ?? 0.5,
      authorStarRing: g.authorStarRing ?? false,
      authorStarRingColor: g.authorStarRingColor || '#a855f7',
      playCount: g.views || 0,
      highScore: 0,
      rating: 0,
      planetColor: g.planetColor,
      planetSize: g.planetSize,
      hasRing: g.hasRing,
      ringColor: g.ringColor,
      emissive: g.emissive,
      planetImage: g.planetImage,
    }))

    engineRef.current.build(gameInputs)
    rendererRef.current.rebuild(engineRef.current)
  }, [games])

  // 飞向选中对象
  useEffect(() => {
    if (!rendererRef.current || !engineRef.current) return

    if (selectedSatellite) {
      const pos = engineRef.current.getSatelliteWorldPos(selectedSatellite)
      rendererRef.current.flyTo(pos)
    } else if (selectedPlanet) {
      const pos = engineRef.current.getPlanetWorldPos(selectedPlanet)
      rendererRef.current.flyTo(pos)
    } else if (selectedStar) {
      const pos = engineRef.current.getStarWorldPos(selectedStar)
      rendererRef.current.flyTo(pos)
    }
  }, [selectedSatellite, selectedPlanet, selectedStar])

  // 进入游戏
  const handleEnterGame = useCallback(() => {
    if (selectedSatellite) {
      navigate(`/game/${selectedSatellite.gameId}`)
    }
  }, [selectedSatellite, navigate])

  // 查看用户资料
  const handleViewProfile = useCallback(() => {
    if (selectedPlanet) {
      navigate(`/profile?id=${selectedPlanet.ownerId}`)
    }
  }, [selectedPlanet, navigate])

  const highScore = selectedSatellite ? loadHighScore(selectedSatellite.gameId) : 0

  return (
    <div className="fixed inset-0 bg-[#050510] overflow-hidden">
      {/* Three.js 画布 */}
      <div ref={containerRef} className="w-full h-full" />

      {/* 顶部信息栏 + 用户系统 */}
      <div className="fixed top-0 left-0 right-0 z-10 flex items-start justify-between p-4 pointer-events-none">
        {/* 左侧：标题 */}
        <div className="pointer-events-auto">
          <h1 className="font-pixel text-base md:text-xl neon-text-blue mb-1">
            NEON ARCADE
          </h1>
          <p className="font-pixel text-[10px] md:text-xs text-gray-500 tracking-wider">
            {isZh ? '游戏宇宙 — 探索你的游戏星球' : 'GAME UNIVERSE — Explore your game planets'}
          </p>
        </div>

        {/* 右侧：用户系统 */}
        <div className="pointer-events-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => useGameStore.getState().toggleLang()}
            className="font-pixel text-[11px] md:text-xs px-3 py-1.5 border border-white/10 text-gray-400 hover:text-neon-blue hover:border-neon-blue/50 transition-colors"
          >
            {isZh ? '中' : 'EN'}
          </button>

          {user ? (
            <>
              <button
                type="button"
                onClick={() => navigate('/upload')}
                className="font-pixel text-[11px] md:text-xs px-3 py-1.5 bg-neon-green/10 border border-neon-green/40 text-neon-green hover:bg-neon-green/20 transition-colors"
              >
                + {isZh ? '发布游戏' : 'PUBLISH'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <Avatar avatar={user.avatar} size={36} className="rounded-full" />
                <span className="font-pixel text-xs neon-text-blue hidden md:inline">{user.nickname || user.username}</span>
              </button>
              <button
                type="button"
                onClick={() => { useGameStore.getState().logout(); navigate('/') }}
                className="font-pixel text-[10px] md:text-xs text-gray-500 hover:text-neon-pink transition-colors"
              >
                {isZh ? '退出' : 'EXIT'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="font-pixel text-[11px] md:text-xs text-gray-400 hover:text-neon-blue transition-colors"
              >
                {isZh ? '登录' : 'LOGIN'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="font-pixel text-[11px] md:text-xs px-3 py-1.5 bg-neon-blue/10 border border-neon-blue/40 text-neon-blue hover:bg-neon-blue/20 transition-colors"
              >
                {isZh ? '注册' : 'REGISTER'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* 星系列表 */}
      <div className="fixed top-20 right-4 z-10 flex flex-col gap-2">
        {GALAXY_DEFS.map((g) => {
          const visible = galaxyVisible[g.id] !== false
          return (
            <div
              key={g.id}
              className="flex items-center gap-2.5 px-3 py-1.5 bg-black/50 border border-white/8 backdrop-blur-sm cursor-pointer hover:border-white/25 transition-colors"
              onClick={() => {
                const galaxy = engineRef.current?.galaxies.find(gx => gx.id === g.id)
                if (galaxy && rendererRef.current) {
                  rendererRef.current.flyTo(galaxy.star.position)
                }
              }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  const next = !visible
                  setGalaxyVisible(prev => ({ ...prev, [g.id]: next }))
                  rendererRef.current?.setGalaxyVisibility(g.id, next)
                }}
                className={`w-[18px] h-[18px] border rounded-sm flex-shrink-0 transition-all duration-150 ${
                  visible
                    ? 'bg-white/20 border-white/40'
                    : 'border-white/10 bg-transparent'
                }`}
                style={{ borderColor: visible ? g.color + '88' : undefined }}
              >
                {visible && (
                  <svg viewBox="0 0 12 12" className="w-full h-full p-[2px]" style={{ color: g.color }}>
                    <path d="M2 6l2.5 2.5L10 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>

              <span className="text-sm">{g.icon}</span>
              <span className={`font-pixel text-[10px] md:text-xs transition-opacity ${visible ? '' : 'opacity-30'}`} style={{ color: g.color }}>
                {isZh ? g.nameZh : g.nameEn}
              </span>
            </div>
          )
        })}
      </div>

      {/* 右下角操作 */}
      <div className="fixed bottom-4 right-4 z-10 flex gap-2">
        <button
          type="button"
          onClick={() => rendererRef.current?.resetCamera()}
          className="font-pixel text-[11px] md:text-xs px-4 py-2.5 bg-black/50 border border-white/10 text-gray-400 hover:text-white hover:border-white/30 transition-colors backdrop-blur-sm"
        >
          {isZh ? '全景' : 'OVERVIEW'}
        </button>
      </div>

      {/* 卫星信息卡（游戏） */}
      {selectedSatellite && (
        <SatelliteInfoCard
          satellite={selectedSatellite}
          highScore={highScore}
          isZh={isZh}
          onEnterGame={handleEnterGame}
          onClose={() => setSelectedSatellite(null)}
        />
      )}

      {/* 行星信息卡（发布者） */}
      {selectedPlanet && (
        <PlanetInfoCard
          planet={selectedPlanet}
          isZh={isZh}
          onViewProfile={handleViewProfile}
          onClose={() => setSelectedPlanet(null)}
        />
      )}

      {/* 恒星信息卡（星系中心） */}
      {selectedStar && (
        <StarInfoCard
          star={selectedStar}
          isZh={isZh}
          onClose={() => setSelectedStar(null)}
        />
      )}

      {/* 初始提示 */}
      {showHint && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center pointer-events-none"
          style={{ animation: 'fadeInOut 5s ease-in-out forwards' }}
        >
          <div className="text-center">
            <h1 className="font-pixel text-xl md:text-3xl neon-text-blue mb-3 animate-glow-pulse">
              NEON ARCADE
            </h1>
            <p className="font-pixel text-xs md:text-sm text-gray-500 tracking-[0.2em]">
              {isZh ? '单击查看详情 · 双击进入游戏 · 拖拽探索宇宙' : 'Click for details · Double-click to play · Drag to explore'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== 卫星信息卡（游戏） ====================

function SatelliteInfoCard({
  satellite, highScore, isZh, onEnterGame, onClose,
}: {
  satellite: SatelliteData
  highScore: number
  isZh: boolean
  onEnterGame: () => void
  onClose: () => void
}) {
  const planet = useGameStore.getState().games.find(g => g.id === satellite.gameId)
  const creatorName = planet?.authorName || 'NEON ARCADE'
  const creatorAvatar = planet?.authorAvatar || 'preset:1'

  return (
    <div className="fixed left-4 bottom-16 z-20 w-80 md:w-96 animate-slide-up">
      <div className="cyber-card cyber-card-hover p-5 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-text-muted hover:text-white hover:bg-white/10 rounded transition-colors"
        >
          ✕
        </button>

        {/* 标题行 */}
        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-14 h-14 rounded-full flex-shrink-0 overflow-hidden border-2 border-white/10"
            style={{
              boxShadow: `0 0 24px ${satellite.color}44, inset 0 0 12px ${satellite.color}22`,
            }}
          >
            {satellite.image ? (
              <img
                src={satellite.image}
                alt={satellite.name}
                className="w-full h-full object-cover"
                style={{ borderRadius: '50%' }}
              />
            ) : (
              <div
                className="w-full h-full"
                style={{
                  background: `radial-gradient(circle at 35% 35%, ${satellite.color}dd, ${satellite.color}88, ${satellite.color}44)`,
                }}
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-pixel text-base md:text-lg text-white truncate">{satellite.name}</h3>
            <p className="text-xs text-text-muted mt-1.5 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full overflow-hidden border border-white/10">
                <Avatar avatar={creatorAvatar} size={20} className="rounded-full" />
              </span>
              {creatorName}
            </p>
          </div>
        </div>

        {/* 描述 */}
        <p className="text-sm text-text-secondary mb-5 line-clamp-2 leading-relaxed">{satellite.description}</p>

        {/* 数据 */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="text-center p-2 bg-black/20 rounded border border-cyber-border/30">
            <p className="font-mono text-base md:text-lg text-white font-semibold">{satellite.playCount}</p>
            <p className="text-[9px] text-text-muted font-pixel mt-1">{isZh ? '游玩' : 'PLAYS'}</p>
          </div>
          <div className="text-center p-2 bg-black/20 rounded border border-cyber-border/30">
            <p className={`font-mono text-base md:text-lg font-semibold ${highScore > 0 ? 'neon-text-yellow' : 'text-text-muted'}`}>
              {highScore > 0 ? highScore.toLocaleString() : '---'}
            </p>
            <p className="text-[9px] text-text-muted font-pixel mt-1">{isZh ? '最高分' : 'HIGH'}</p>
          </div>
          <div className="text-center p-2 bg-black/20 rounded border border-cyber-border/30">
            <p className={`font-mono text-base md:text-lg font-semibold ${satellite.rating > 0 ? 'text-text-secondary' : 'text-text-muted'}`}>
              {satellite.rating > 0 ? satellite.rating.toFixed(1) : '---'}
            </p>
            <p className="text-[9px] text-text-muted font-pixel mt-1">{isZh ? '评分' : 'RATE'}</p>
          </div>
        </div>

        {/* 进入游戏按钮 */}
        <button
          type="button"
          onClick={onEnterGame}
          className="cyber-btn cyber-btn-lg w-full border-neon-blue text-neon-blue hover:bg-neon-blue/10"
        >
          {isZh ? '进入游戏 →' : 'ENTER GAME →'}
        </button>

        <p className="text-center text-[9px] text-text-hint mt-3 font-pixel">
          {isZh ? '双击卫星可直接进入' : 'Double-click satellite to enter directly'}
        </p>
      </div>
    </div>
  )
}

// ==================== 行星信息卡（发布者） ====================

function PlanetInfoCard({
  planet, isZh, onViewProfile, onClose,
}: {
  planet: PlanetData
  isZh: boolean
  onViewProfile: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed left-4 bottom-16 z-20 w-80 md:w-96 animate-slide-up">
      <div className="cyber-card cyber-card-hover p-5 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-text-muted hover:text-white hover:bg-white/10 rounded transition-colors"
        >
          ✕
        </button>

        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 border-2"
            style={{
              borderColor: planet.planetColor + '60',
              boxShadow: `0 0 24px ${planet.planetColor}40`,
            }}
          >
            <Avatar avatar={planet.ownerAvatar} size={64} className="rounded-full" />
          </div>
          <div>
            <h3 className="font-pixel text-base md:text-lg text-white">{planet.ownerName}</h3>
            <p className="text-xs text-text-muted mt-1.5 flex items-center gap-2">
              🪐 {isZh ? '创作者' : 'Creator'}
            </p>
          </div>
        </div>

        {/* 发布的游戏列表 */}
        <div className="mb-5 border-t border-cyber-border/30 pt-4">
          <p className="text-xs text-text-muted mb-3 font-pixel">
            {isZh ? `已发布 ${planet.satellites.length} 个游戏` : `${planet.satellites.length} games published`}
          </p>
          <div className="flex flex-wrap gap-2">
            {planet.satellites.map(s => (
              <span
                key={s.id}
                className="game-tag game-tag-sm text-text-secondary"
                style={{ borderLeftColor: s.color, borderLeftWidth: 3 }}
              >
                {s.name}
              </span>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onViewProfile}
          className="cyber-btn w-full text-text-muted border-white/10 hover:text-white hover:border-white/20"
        >
          {isZh ? '查看资料' : 'VIEW PROFILE'}
        </button>
      </div>
    </div>
  )
}

// ==================== 恒星信息卡（星系中心） ====================

function StarInfoCard({
  star, isZh, onClose,
}: {
  star: StarData
  isZh: boolean
  onClose: () => void
}) {
  return (
    <div className="fixed left-4 bottom-16 z-20 w-80 md:w-96 animate-slide-up">
      <div className="cyber-card cyber-card-hover p-5 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-text-muted hover:text-white hover:bg-white/10 rounded transition-colors"
        >
          ✕
        </button>

        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-16 h-16 rounded-full flex-shrink-0 border-2 flex items-center justify-center text-2xl"
            style={{
              borderColor: star.color + '60',
              boxShadow: `0 0 30px ${star.color}60`,
              background: `radial-gradient(circle, ${star.color}40, transparent)`,
            }}
          >
            {star.icon}
          </div>
          <div>
            <h3 className="font-pixel text-base md:text-lg text-white">
              {isZh ? star.nameZh : star.nameEn}
            </h3>
            <p className="text-xs text-text-muted mt-1.5 flex items-center gap-2">
              ⭐ {isZh ? '星系中心' : 'Galaxy Center'}
            </p>
          </div>
        </div>

        {/* 星系内的创作者 */}
        <div className="mb-5 border-t border-cyber-border/30 pt-4">
          <p className="text-xs text-text-muted mb-3 font-pixel">
            {isZh ? `${star.planets.length} 位创作者` : `${star.planets.length} creators`}
          </p>
          <div className="flex flex-wrap gap-2">
            {star.planets.map(p => (
              <span
                key={p.id}
                className="flex items-center gap-1.5 px-2 py-1 bg-black/30 border border-cyber-border/30 rounded text-xs"
              >
                <Avatar avatar={p.ownerAvatar} size={16} className="rounded-full" />
                {p.ownerName}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ==================== Fallback 数据 ====================

const FALLBACK_GAMES: GameInfo[] = [
  { id: 'snake', name: '贪吃蛇', description: '经典像素贪吃蛇！加速冲刺、连击倍率、随机道具，在障碍中闪避求生。', icon: 'snake', tags: ['益智'], date: '2026-04-26', isOfficial: true, likes: 42, views: 1280 },
  { id: 'tetris', name: '俄罗斯方块', description: '连消爽感升级！Perfect Clear奖励、技能系统、连击倍率——你能撑多久？', icon: 'tetris', tags: ['益智'], date: '2026-04-26', isOfficial: true, likes: 38, views: 960 },
  { id: 'platformer', name: '跳一跳', description: '赛博跑酷！二段跳、冲刺、敌人、金币、关卡目标——霓虹城市等你征服。', icon: 'platformer', tags: ['冒险'], date: '2026-04-26', isOfficial: true, likes: 35, views: 840 },
  { id: 'shooter', name: '飞机大战', description: '爆款飞机大战！连击系统、武器升级、Boss战、技能爆发——活下去！', icon: 'shooter', tags: ['射击'], date: '2026-04-26', isOfficial: true, likes: 56, views: 2100 },
  { id: 'asteroids', name: '霓虹陨石带', description: '360° 旋转飞船，惯性物理，陨石碎裂分裂，超空间瞬移——清波生存战。', icon: 'asteroids', tags: ['射击'], date: '2026-04-26', isOfficial: true, likes: 31, views: 720 },
  { id: 'racing', name: '霓虹赛车', description: '极速漂移！四车道切换、障碍闪避、金币收集、难度递增——冲刺终点！', icon: 'racing', tags: ['竞速'], authorId: 'sunny123', authorName: 'sunny', authorAvatar: 'preset:3', authorStarColor: '#F59E0B', authorStarGlow: 0.7, authorStarRing: true, authorStarRingColor: '#FBBF24', date: '2026-04-27', likes: 28, views: 650, planetColor: '#F59E0B' },
  { id: 'towerdefense', name: '霓虹塔防', description: '策略防守！四种塔楼、波次挑战、路径规划——守护基地最后一防线！', icon: 'towerdefense', tags: ['策略'], authorId: 'sunny123', authorName: 'sunny', authorAvatar: 'preset:3', authorStarColor: '#10B981', authorStarGlow: 0.7, authorStarRing: true, authorStarRingColor: '#34D399', date: '2026-04-27', likes: 33, views: 780, planetColor: '#10B981' },
  { id: 'warrior', name: '霓虹勇士', description: 'RPG战斗！WASD移动、四技能释放、敌人波次、升级解锁——成为最强勇士！', icon: 'warrior', tags: ['RPG'], authorId: 'sunny123', authorName: 'sunny', authorAvatar: 'preset:3', authorStarColor: '#8B5CF6', authorStarGlow: 0.8, authorStarRing: true, authorStarRingColor: '#A78BFA', date: '2026-04-27', likes: 45, views: 920, planetColor: '#8B5CF6' },
  { id: 'farm', name: '霓虹农场', description: '模拟经营！种植作物、浇水加速、养殖动物、收获赚钱——打造你的农场！', icon: 'farm', tags: ['模拟'], authorId: 'sunny123', authorName: 'sunny', authorAvatar: 'preset:3', authorStarColor: '#EC4899', authorStarGlow: 0.7, authorStarRing: true, authorStarRingColor: '#F472B6', date: '2026-04-27', likes: 22, views: 480, planetColor: '#EC4899' },
]