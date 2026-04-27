import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import GameCanvas from '../components/GameCanvas'
import CommentSection from '../components/CommentSection'
import PixelIcon from '../components/PixelIcon'
import TutorialOverlay from '../components/TutorialOverlay'
import VirtualControls from '../components/VirtualControls'
import { Avatar } from '../components/Avatar'
import { hasSeenTutorial } from '../utils/tutorial'
import { initSound, setSoundEnabled, isSoundEnabled, playSound } from '../utils/sound'
import { useGameStore } from '../store/gameStore'
import { gameApi, scoreApi } from '../api'
import type { GameInfo, ScoreEntry } from '../api'
import { t } from '../i18n'

const FALLBACK_GAMES: GameInfo[] = [
  { id: 'snake', name: '贪吃蛇', description: '经典像素贪吃蛇！加速冲刺、连击倍率、随机道具。', icon: 'snake', tags: ['益智'], date: '2026-04-26', isOfficial: true, likes: 42, views: 1280 },
  { id: 'tetris', name: '俄罗斯方块', description: '连消爽感升级！Perfect Clear奖励、技能系统。', icon: 'tetris', tags: ['益智'], date: '2026-04-26', isOfficial: true, likes: 38, views: 960 },
  { id: 'platformer', name: '跳一跳', description: '蓄力精准跳跃！按住蓄力、释放跳跃，落点越准分数越高。', icon: 'platformer', tags: ['冒险'], date: '2026-04-26', isOfficial: true, likes: 35, views: 840 },
  { id: 'shooter', name: '飞机大战', description: '爆款飞机大战！连击系统、武器升级、Boss战。', icon: 'shooter', tags: ['射击'], date: '2026-04-26', isOfficial: true, likes: 56, views: 2100 },
  { id: 'asteroids', name: '霓虹陨石带', description: '360° 旋转飞船 + 惯性物理 + 陨石分裂 + 超空间瞬移。', icon: 'asteroids', tags: ['射击'], date: '2026-04-26', isOfficial: true, likes: 31, views: 720 },
  // sunny 的游戏
  { id: 'racing', name: '霓虹赛车', description: '极速漂移！四车道切换、障碍闪避、金币收集、难度递增——冲刺终点！', icon: 'racing', tags: ['竞速'], authorId: 'sunny123', authorName: 'sunny', authorAvatar: 'preset:3', date: '2026-04-27', likes: 28, views: 650 },
  { id: 'towerdefense', name: '霓虹塔防', description: '策略防守！四种塔楼、波次挑战、路径规划——守护基地最后一防线！', icon: 'towerdefense', tags: ['策略'], authorId: 'sunny123', authorName: 'sunny', authorAvatar: 'preset:3', date: '2026-04-27', likes: 33, views: 780 },
  { id: 'warrior', name: '霓虹勇士', description: 'RPG战斗！WASD移动、四技能释放、敌人波次、升级解锁——成为最强勇士！', icon: 'warrior', tags: ['RPG'], authorId: 'sunny123', authorName: 'sunny', authorAvatar: 'preset:3', date: '2026-04-27', likes: 45, views: 920 },
  { id: 'farm', name: '霓虹农场', description: '模拟经营！种植作物、浇水加速、养殖动物、收获赚钱——打造你的农场！', icon: 'farm', tags: ['模拟'], authorId: 'sunny123', authorName: 'sunny', authorAvatar: 'preset:3', date: '2026-04-27', likes: 22, views: 480 },
]

const CONTROLS_ZH: Record<string, string> = {
  snake: '方向键/滑动 移动 · SPACE 冲刺 · R 重开',
  tetris: '← → 移动 · ↑ 旋转 · ↓ 加速 · SPACE 硬降 · C 技能 · R 重开',
  platformer: '按住 SPACE 蓄力 · 释放跳跃 · 蓄力越久跳越远 · R 重开',
  shooter: '← → 移动 · 自动射击 · SPACE 技能 · R 重开',
  asteroids: 'A/D 旋转 · W 推进 · SPACE 射击 · SHIFT 超空间 · R 重开',
}

const CONTROLS_EN: Record<string, string> = {
  snake: 'Arrows/Swipe Move · SPACE Dash · R Restart',
  tetris: '← → Move · ↑ Rotate · ↓ Soft Drop · SPACE Hard Drop · C Skill · R Restart',
  platformer: 'Hold SPACE Charge · Release Jump · Longer = Farther · R Restart',
  shooter: '← → Move · Auto Fire · SPACE Skill · R Restart',
  asteroids: 'A/D Rotate · W Thrust · SPACE Fire · SHIFT Hyperspace · R Restart',
}

const GAME_NAMES: Record<string, { zh: string; en: string }> = {
  snake: { zh: '贪吃蛇', en: 'SNAKE' },
  tetris: { zh: '俄罗斯方块', en: 'TETRIS' },
  platformer: { zh: '跳一跳', en: 'JUMP JUMP' },
  shooter: { zh: '飞机大战', en: 'SHOOTER' },
  asteroids: { zh: '霓虹陨石带', en: 'ASTEROIDS' },
}

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>()
  const navigate = useNavigate()
  const { games, setGames, loadHighScore, setHighScore, isMobile, lang, toggleLang, token } = useGameStore()
  const [score, setScore] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [soundOn, setSoundOn] = useState(() => {
    initSound() // 初始化音效系统
    return isSoundEnabled()
  })
  const [showTutorial, setShowTutorial] = useState(() => gameId ? !hasSeenTutorial(gameId) : false)
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([])
  const [myRank, setMyRank] = useState<{ score: number; rank: number } | null>(null)
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false)
  const gameAreaRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (games.length === 0) {
      gameApi.list().then((g) => setGames(g.length > 0 ? g : FALLBACK_GAMES)).catch(() => setGames(FALLBACK_GAMES))
    }
  }, [games.length, setGames])

  // 加载排行榜
  useEffect(() => {
    if (!gameId) return
    setLoadingLeaderboard(true)
    scoreApi.getLeaderboard(gameId)
      .then(setLeaderboard)
      .catch(() => setLeaderboard([]))
      .finally(() => setLoadingLeaderboard(false))

    if (token) {
      scoreApi.getMyBest(gameId)
        .then(setMyRank)
        .catch(() => setMyRank(null))
    }
  }, [gameId, token])

  // 音效状态同步
  useEffect(() => {
    setSoundEnabled(soundOn)
  }, [soundOn])

  const allGames = games.length > 0 ? games : FALLBACK_GAMES
  const currentGame = allGames.find((g) => g.id === gameId) || null

  const handleScoreUpdate = useCallback((newScore: number) => {
    setScore(newScore)
    if (gameId) {
      const prevBest = loadHighScore(gameId)
      setHighScore(gameId, newScore)
      // 提交到服务器（仅当新分更高且已登录）
      if (newScore > prevBest && newScore > 0 && token) {
        scoreApi.submit(gameId, newScore).catch(() => { /* 静默失败 */ })
      }
    }
  }, [gameId, setHighScore, loadHighScore, token])

  const toggleFullscreen = useCallback(() => {
    const elem = mainRef.current
    if (!elem) {
      console.warn('Fullscreen: main element not found')
      return
    }
    try {
      if (!document.fullscreenElement) {
        elem.requestFullscreen().catch((err) => {
          console.warn('Fullscreen request failed:', err.message)
        })
      } else {
        document.exitFullscreen().catch((err) => {
          console.warn('Exit fullscreen failed:', err.message)
        })
      }
    } catch (e) {
      console.warn('Fullscreen API error:', e)
    }
  }, [])

  const togglePause = useCallback(() => setIsPaused((p) => !p), [])

  const toggleSound = useCallback(() => {
    setSoundOn((s) => {
      const next = !s
      setSoundEnabled(next)
      if (next) playSound('click')
      return next
    })
  }, [])

  const showTutorialAgain = useCallback(() => setShowTutorial(true), [])

  // ===== Keyboard shortcuts: P pause, M mute, F fullscreen, Esc back =====
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Avoid hijacking input fields (e.g. comment box)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const k = e.key.toLowerCase()
      if (k === 'p') { e.preventDefault(); togglePause() }
      else if (k === 'm') { e.preventDefault(); toggleSound() }
      else if (k === 'f') { e.preventDefault(); toggleFullscreen() }
      else if (k === 'escape') { e.preventDefault(); navigate('/') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [togglePause, toggleSound, toggleFullscreen, navigate])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  if (!currentGame) {
    return (
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-24 text-center">
        <p className="title-section neon-text-pink mb-6">GAME NOT FOUND</p>
        <button className="neon-btn-blue" onClick={() => navigate('/')}>{t('back')}</button>
      </main>
    )
  }

  const highScore = gameId ? loadHighScore(gameId) : 0
  const gameName = gameId && GAME_NAMES[gameId] ? GAME_NAMES[gameId][lang] : currentGame.name
  const controlsMap = lang === 'zh' ? CONTROLS_ZH : CONTROLS_EN
  const controlsText = (gameId && controlsMap[gameId]) || t('tap_start')

  return (
    <main ref={mainRef} className="max-w-5xl mx-auto px-3 md:px-6 py-3 md:py-6">
      {/* 教程覆盖层 */}
      {showTutorial && gameId && (
        <TutorialOverlay
          gameId={gameId}
          lang={lang}
          onClose={() => setShowTutorial(false)}
        />
      )}
      {/* ===== Top bar ===== */}
      <header className="flex items-center justify-between mb-4 md:mb-5 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/')}
            aria-label="back"
            className="text-text-muted hover:text-neon-blue transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <PixelIcon type="back" size={14} color="currentColor" />
          </button>
          <h1 className="title-section neon-text-blue truncate">{gameName}</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <IconButton onClick={toggleSound} active={soundOn} title={soundOn ? '静音 (M)' : '开声 (M)'}>
            {soundOn ? '♪' : '×'}
          </IconButton>
          <IconButton onClick={togglePause} active={isPaused} title="暂停 (P)">
            {isPaused ? '▶' : '⏸'}
          </IconButton>
          <button
            onClick={toggleLang}
            className="font-pixel text-[10px] md:text-xs px-2.5 h-9 border border-cyber-border text-text-muted hover:text-neon-blue hover:border-neon-blue/50 transition-colors"
          >
            {lang === 'zh' ? '中' : 'EN'}
          </button>
          <IconButton onClick={toggleFullscreen} active={isFullscreen} title="全屏 (F)">
            <PixelIcon type="fullscreen" size={14} color="currentColor" />
          </IconButton>
        </div>
      </header>

      {/* ===== Score panel — grid layout, tabular figures ===== */}
      <div className="score-panel mb-3 md:mb-4">
        <div className="stat">
          <span className="stat-label">{t('score')}</span>
          <span className="stat-value neon-text-green">{score.toLocaleString()}</span>
        </div>
        <div className="stat">
          <span className="stat-label">{t('best')}</span>
          <span className="stat-value neon-text-yellow">{highScore.toLocaleString()}</span>
        </div>
        <div className="stat">
          <span className="stat-label">STATUS</span>
          <span className="stat-value text-sm" style={{ color: isPaused ? '#ffe600' : '#39ff14' }}>
            {isPaused ? '⏸ PAUSED' : '● LIVE'}
          </span>
        </div>
      </div>

      {/* ===== Game area ===== */}
      <div ref={gameAreaRef} className="relative">
        <GameCanvas gameId={gameId!} onScoreUpdate={handleScoreUpdate} paused={isPaused} />
        {isPaused && (
          <div className="pause-overlay">
            <div className="text-center">
              <p className="title-page neon-text-yellow mb-3">⏸ PAUSED</p>
              <p className="text-meta">按 P 或点击继续按钮恢复</p>
              <button className="neon-btn-green mt-5" onClick={togglePause}>继续游戏</button>
            </div>
          </div>
        )}
      </div>

      {/* ===== Controls bar — always visible ===== */}
      <div className="mt-4 p-3 md:p-4 border border-cyber-border bg-cyber-surface/40 flex flex-col md:flex-row md:items-center gap-3 rounded-lg">
        <span className="font-pixel text-[10px] md:text-[11px] text-text-muted shrink-0">{t('controls')}</span>
        <p className="font-mono text-sm md:text-[15px] text-text-secondary leading-relaxed flex-1">
          {controlsText}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={showTutorialAgain}
            className="cyber-btn cyber-btn-sm border-neon-purple text-neon-purple"
          >
            {lang === 'zh' ? '教程' : 'TUTORIAL'}
          </button>
          {!isMobile && (
            <p className="font-mono text-xs md:text-sm text-text-hint">
              P 暂停 · M 静音 · F 全屏 · Esc 返回
            </p>
          )}
        </div>
      </div>

      {isMobile && (
        <p className="text-meta mt-2 px-1">{t('mobile_controls')}</p>
      )}

      {/* ===== About ===== */}
      <section className="mt-5 md:mt-7 cyber-card p-4 md:p-5">
        <h2 className="title-section neon-text-purple mb-3 flex items-center gap-3">
          <div className="section-title-icon">
            <PixelIcon type="sparkle" size={12} color="#a855f7" />
          </div>
          {t('about')}
        </h2>
        <p className="text-body text-text-secondary leading-relaxed">
          {gameId ? t(`desc_${gameId}`) : currentGame.description}
        </p>
        {currentGame.tags && currentGame.tags.length > 0 && (
          <div className="flex gap-2 mt-4 flex-wrap">
            {currentGame.tags.map((tag) => (
              <span key={tag} className="neon-tag-blue">
                {tag}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* ===== Leaderboard ===== */}
      <section className="mt-5 md:mt-7 cyber-card p-4 md:p-5">
        <h2 className="title-section neon-text-yellow mb-4 flex items-center gap-3">
          <div className="section-title-icon">
            <PixelIcon type="star" size={12} color="#ffe600" />
          </div>
          {lang === 'zh' ? '排行榜' : 'LEADERBOARD'}
        </h2>

        {loadingLeaderboard ? (
          <div className="empty-state">
            <p className="font-pixel text-[10px] text-gray-500 loading-text">{lang === 'zh' ? '加载中' : 'LOADING'}</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏆</div>
            <p className="empty-state-text">{lang === 'zh' ? '暂无记录，成为第一个上榜的玩家' : 'No records yet. Be the first!'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.slice(0, 10).map((entry, idx) => (
              <div
                key={entry.userId}
                className={`leaderboard-item ${idx === 0 ? 'rank-1' : idx < 3 ? 'rank-2' : ''}`}
              >
                <span className={`leaderboard-rank ${idx === 0 ? 'neon-text-yellow' : idx < 3 ? 'neon-text-green' : 'text-gray-500'}`}>
                  #{idx + 1}
                </span>
                <Avatar avatar={entry.avatar} size={28} className="leaderboard-avatar" />
                <span className="leaderboard-name">{entry.nickname}</span>
                <span className={`leaderboard-score ${idx === 0 ? 'neon-text-yellow' : idx < 3 ? 'text-gray-300' : 'text-gray-500'}`}>
                  {entry.score.toLocaleString()}
                </span>
              </div>
            ))}

            {myRank && myRank.rank > 10 && (
              <div className="mt-3 pt-3 border-t border-cyber-border">
                <div className="leaderboard-item border-neon-blue/30 bg-neon-blue/10">
                  <span className="leaderboard-rank neon-text-blue">#{myRank.rank}</span>
                  <span className="leaderboard-name">{lang === 'zh' ? '我的排名' : 'My Rank'}</span>
                  <span className="leaderboard-score neon-text-blue">{myRank.score.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ===== Comments ===== */}
      <CommentSection gameId={gameId!} />

      {/* ===== Virtual Controls (Mobile) ===== */}
      {isMobile && gameId && (
        <VirtualControls gameId={gameId} visible={!isPaused && !showTutorial} />
      )}
    </main>
  )
}

function IconButton({
  onClick, active, title, children,
}: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`min-w-[36px] h-9 px-2 border font-pixel text-[11px] flex items-center justify-center transition-colors ${
        active
          ? 'border-neon-blue text-neon-blue bg-neon-blue/10'
          : 'border-cyber-border text-gray-500 hover:text-neon-blue hover:border-neon-blue'
      }`}
    >
      {children}
    </button>
  )
}
