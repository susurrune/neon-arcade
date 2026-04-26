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
  { id: 'snake', name: '贪吃蛇', description: '经典像素贪吃蛇！加速冲刺、连击倍率、随机道具。', icon: 'snake', tags: ['经典'], date: '2026-04-26', isOfficial: true },
  { id: 'tetris', name: '俄罗斯方块', description: '连消爽感升级！Perfect Clear奖励、技能系统。', icon: 'tetris', tags: ['消除'], date: '2026-04-26', isOfficial: true },
  { id: 'platformer', name: '跳一跳', description: '蓄力精准跳跃！按住蓄力、释放跳跃，落点越准分数越高。', icon: 'platformer', tags: ['跳跃'], date: '2026-04-26', isOfficial: true },
  { id: 'shooter', name: '飞机大战', description: '爆款飞机大战！连击系统、武器升级、Boss战。', icon: 'shooter', tags: ['射击'], date: '2026-04-26', isOfficial: true },
  { id: 'asteroids', name: '霓虹陨石带', description: '360° 旋转飞船 + 惯性物理 + 陨石分裂 + 超空间瞬移。', icon: 'asteroids', tags: ['射击'], date: '2026-04-26', isOfficial: true },
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
    if (!document.fullscreenElement) {
      gameAreaRef.current?.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
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
    <main className="max-w-5xl mx-auto px-3 md:px-6 py-3 md:py-6">
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
            className="text-gray-500 hover:text-neon-blue transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
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
            className="font-pixel text-[10px] md:text-xs px-2.5 h-9 border border-cyber-border text-gray-400 hover:text-neon-blue hover:border-neon-blue transition-colors"
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

      {/* ===== Controls bar — always visible, no longer hidden in <details> ===== */}
      <div className="mt-4 p-3 md:p-4 border border-cyber-border bg-cyber-surface/40 flex flex-col md:flex-row md:items-center gap-3">
        <span className="font-pixel text-[10px] md:text-[11px] text-gray-500 shrink-0">{t('controls')}</span>
        <p className="font-mono text-sm md:text-[15px] text-gray-300 leading-relaxed flex-1">
          {controlsText}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={showTutorialAgain}
            className="font-pixel text-[10px] px-3 py-1.5 border border-neon-purple/40 text-neon-purple hover:bg-neon-purple/10 transition-colors"
          >
            {lang === 'zh' ? '教程' : 'TUTORIAL'}
          </button>
          {!isMobile && (
            <p className="font-mono text-xs md:text-sm text-gray-600">
              P 暂停 · M 静音 · F 全屏 · Esc 返回
            </p>
          )}
        </div>
      </div>

      {isMobile && (
        <p className="text-meta mt-2 px-1">{t('mobile_controls')}</p>
      )}

      {/* ===== About ===== */}
      <section className="mt-5 md:mt-7 p-4 md:p-5 bg-cyber-card border border-cyber-border rounded-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-purple/30 to-transparent" />

        <h2 className="title-section neon-text-purple mb-3 flex items-center gap-3">
          <div className="w-7 h-7 flex items-center justify-center rounded bg-black/30 border border-cyber-border">
            <PixelIcon type="sparkle" size={12} color="#a855f7" />
          </div>
          {t('about')}
        </h2>
        <p className="text-body text-gray-400 leading-relaxed">
          {gameId ? t(`desc_${gameId}`) : currentGame.description}
        </p>
        {currentGame.tags && currentGame.tags.length > 0 && (
          <div className="flex gap-2 mt-4 flex-wrap">
            {currentGame.tags.map((tag) => (
              <span key={tag} className="game-tag game-tag-sm border-neon-blue/40 text-neon-blue bg-neon-blue/6">
                {tag}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* ===== Leaderboard ===== */}
      <section className="mt-5 md:mt-7 p-4 md:p-5 bg-cyber-card border border-cyber-border rounded-lg relative overflow-hidden">
        {/* Top glow line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-yellow/30 to-transparent" />

        <h2 className="title-section neon-text-yellow mb-4 flex items-center gap-3">
          <div className="w-7 h-7 flex items-center justify-center rounded bg-black/30 border border-cyber-border">
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
