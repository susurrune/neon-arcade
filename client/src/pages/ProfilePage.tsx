import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { userApi, authApi, gameApi } from '../api'
import { Avatar, AvatarPicker } from '../components/Avatar'
import PixelIcon from '../components/PixelIcon'
import type { GameInfo } from '../api'
import { t } from '../i18n'

export default function ProfilePage() {
  const { user, token, setUser, logout, loadHighScore, lang, setGames } = useGameStore()
  const navigate = useNavigate()
  const isZh = lang === 'zh'

  const [nickname, setNickname] = useState('')
  const [avatar, setAvatar] = useState('preset:1')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // 恒星效果设置
  const [starColor, setStarColor] = useState('#ffaa00')
  const [starGlow, setStarGlow] = useState(0.5)
  const [starRing, setStarRing] = useState(false)
  const [starRingColor, setStarRingColor] = useState('#a855f7')

  // 恒星颜色预设
  const STAR_COLOR_PRESETS = [
    '#FFAA00', // 金色
    '#FF6B6B', // 红色
    '#4ECDC4', // 青色
    '#A855F7', // 紫色
    '#00F0FF', // 蓝色
    '#39FF14', // 绿色
    '#FF1493', // 粉色
    '#FFFFFF', // 白色
  ]

  const RING_COLOR_PRESETS = [
    '#A855F7', // 紫色
    '#00F0FF', // 蓝色
    '#39FF14', // 绿色
    '#FFAA00', // 金色
    '#FF6B6B', // 红色
    '#FF1493', // 粉色
  ]

  // 颜色比较（忽略大小写）
  const colorMatches = (a: string, b: string) => a.toUpperCase() === b.toUpperCase()

  // 折叠状态
  const [gamesExpanded, setGamesExpanded] = useState(true)

  // 我发布的游戏
  const [myGames, setMyGames] = useState<GameInfo[]>([])
  const [loadingGames, setLoadingGames] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // 初始化标记
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    // 只在首次加载时从 user 初始化
    if (!initializedRef.current && user) {
      setNickname(user.nickname || user.username)
      setAvatar(user.avatar || 'preset:1')
      setStarColor((user.starColor || '#FFAA00').toUpperCase())
      setStarGlow(user.starGlow ?? 0.5)
      setStarRing(user.starRing ?? false)
      setStarRingColor((user.starRingColor || '#A855F7').toUpperCase())
      initializedRef.current = true
    }
    // 加载用户已发布的游戏
    setLoadingGames(true)
    gameApi.getMyGames()
      .then(setMyGames)
      .catch(() => setMyGames([]))
      .finally(() => setLoadingGames(false))
  }, [user, token, navigate])

  const handleSave = async () => {
    // 前端验证
    if (nickname.length < 1 || nickname.length > 20) {
      setMessage(isZh ? '昵称需要1-20个字符' : 'Nickname: 1-20 chars')
      return
    }
    setSaving(true)
    setMessage('')
    try {
      await userApi.updateProfile({ nickname, avatar, starColor, starGlow, starRing, starRingColor })
      const updated = await authApi.me()
      setUser(updated, token)
      // 刷新游戏列表以更新宇宙中的恒星效果
      setGames([])
      const updatedGames = await gameApi.list()
      setGames(updatedGames)
      setEditing(false)
      setMessage(isZh ? '保存成功' : 'Saved')
      setTimeout(() => setMessage(''), 2000)
    } catch (err: any) {
      setMessage(err.message || (isZh ? '保存失败' : 'Failed'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteGame = async (gameId: string) => {
    try {
      await gameApi.delete(gameId)
      setMyGames(myGames.filter(g => g.id !== gameId))
      // 强制刷新全局游戏列表
      setGames([])
      const updatedGames = await gameApi.list()
      setGames(updatedGames)
      setDeleteConfirm(null)
    } catch (err: any) {
      alert(err.message || (isZh ? '删除失败' : 'Delete failed'))
    }
  }

  if (!user) return null

  // Show high scores
  const gameScores = [
    { id: 'snake', name: '贪吃蛇' },
    { id: 'tetris', name: '俄罗斯方块' },
    { id: 'platformer', name: '跳一跳' },
    { id: 'shooter', name: '飞机大战' },
  ].map(g => ({ ...g, score: loadHighScore(g.id) }))
    .sort((a, b) => b.score - a.score)

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 md:py-10">
      {/* Header Section - Full Width */}
      <div className="cyber-card cyber-card-hover p-6 md:p-8 mb-6 relative">
        {/* Corner decorations */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-neon-blue/40 pointer-events-none" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-neon-blue/40 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-neon-blue/40 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-neon-blue/40 pointer-events-none" />
        {/* Top gradient line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-blue/30 to-transparent" />

        <div className="flex flex-col md:flex-row md:items-center gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <Avatar avatar={user.avatar} size={96} className="rounded-lg border-2 border-neon-blue/40 shadow-[0_0_20px_rgba(0,240,255,0.25)]" />
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <h2 className="font-pixel text-lg md:text-xl neon-text-blue mb-2">{user.nickname || user.username}</h2>
            <p className="font-mono text-sm text-gray-600 mb-4">@{user.username}</p>

            {/* Stats Row */}
            <div className="flex flex-wrap gap-4">
              {/* Coins */}
              <div className="flex items-center gap-2 px-4 py-2 bg-black/30 border border-cyber-border/50 rounded">
                <PixelIcon type="coin" size={16} color="#ffe600" />
                <span className="font-pixel text-base neon-text-yellow">{useGameStore.getState().loadCoins().toLocaleString()}</span>
              </div>
              {/* Games Published */}
              <div className="flex items-center gap-2 px-4 py-2 bg-black/30 border border-cyber-border/50 rounded">
                <PixelIcon type="upload" size={16} color="#39ff14" />
                <span className="font-pixel text-base text-neon-green">{myGames.length}</span>
              </div>
              {/* Best Rank */}
              {gameScores[0]?.score > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-black/30 border border-cyber-border/50 rounded">
                  <PixelIcon type="star" size={16} color="#a855f7" />
                  <span className="font-pixel text-base text-neon-purple">{gameScores[0].name}</span>
                  <span className="font-mono text-sm text-gray-400">{gameScores[0].score.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Edit Button */}
          <div className="flex-shrink-0">
            {!editing ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="cyber-btn cyber-btn-sm border-neon-blue text-neon-blue"
              >
                {isZh ? '编辑资料' : 'EDIT PROFILE'}
              </button>
            ) : null}
          </div>
        </div>

        {/* Edit Form - Below */}
        {editing && (
          <div className="mt-6 pt-6 border-t border-cyber-border/30">
            <div className="grid md:grid-cols-2 gap-5">
              <div className="form-group">
                <label className="form-label">{isZh ? '用户名（不可修改）' : 'Username (immutable)'}</label>
                <input
                  type="text"
                  value={user.username}
                  disabled
                  className="neon-input opacity-50"
                />
              </div>
              <div className="form-group">
                <label className="form-label">{isZh ? '昵称' : 'Nickname'}</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="neon-input"
                  placeholder={isZh ? '显示昵称' : 'Display name'}
                  maxLength={20}
                />
              </div>
            </div>
            <div className="mt-5">
              <label className="form-label">{isZh ? '头像选择' : 'Avatar Selection'}</label>
              <AvatarPicker value={avatar} onChange={setAvatar} />
            </div>
            {/* 恒星效果设置 */}
            <div className="mt-5 pt-5 border-t border-cyber-border/30">
              <h4 className="font-pixel text-[11px] text-neon-yellow mb-4 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-gradient-radial" style={{ background: `radial-gradient(circle, ${starColor}, transparent)` }} />
                {isZh ? '恒星效果' : 'STAR EFFECT'}
              </h4>
              <div className="grid md:grid-cols-2 gap-5">
                {/* 恒星颜色 */}
                <div>
                  <label className="form-label">{isZh ? '恒星颜色' : 'Star Color'}</label>
                  <div className="flex flex-wrap gap-2">
                    {STAR_COLOR_PRESETS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setStarColor(color)}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${colorMatches(starColor, color) ? 'border-white scale-110' : 'border-white/20'}`}
                        style={{ background: color, boxShadow: colorMatches(starColor, color) ? `0 0 12px ${color}` : '' }}
                        aria-label={isZh ? `选择恒星颜色 ${color}` : `Select star color ${color}`}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
                {/* 恒星发光强度 */}
                <div>
                  <label className="form-label">{isZh ? '发光强度' : 'Glow Intensity'}</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={starGlow}
                      onChange={(e) => setStarGlow(parseFloat(e.target.value))}
                      className="w-full accent-neon-yellow"
                      aria-label={isZh ? '恒星发光强度' : 'Star glow intensity'}
                    />
                    <span className="font-mono text-xs text-gray-400 w-6">{starGlow.toFixed(1)}</span>
                  </div>
                </div>
              </div>
              {/* 行星环开关 */}
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStarRing(!starRing)}
                  className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${starRing ? 'border-neon-purple bg-neon-purple/20' : 'border-white/20'}`}
                  aria-label={isZh ? '切换行星环显示' : 'Toggle star ring'}
                  aria-pressed={starRing ? 'true' : 'false'}
                >
                  {starRing && <span className="text-neon-purple text-xs">✓</span>}
                </button>
                <label className="text-sm text-gray-400">{isZh ? '显示行星环' : 'Show Star Ring'}</label>
              </div>
              {/* 行星环颜色 */}
              {starRing && (
                <div className="mt-3">
                  <label className="form-label">{isZh ? '行星环颜色' : 'Ring Color'}</label>
                  <div className="flex flex-wrap gap-2">
                    {RING_COLOR_PRESETS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setStarRingColor(color)}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${colorMatches(starRingColor, color) ? 'border-white scale-110' : 'border-white/20'}`}
                        style={{ background: color, boxShadow: colorMatches(starRingColor, color) ? `0 0 12px ${color}` : '' }}
                        aria-label={isZh ? `选择行星环颜色 ${color}` : `Select ring color ${color}`}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}
              {/* 预览 */}
              <div className="mt-4 p-4 bg-black/30 rounded border border-cyber-border/30">
                <p className="text-[9px] text-gray-500 font-pixel mb-3">{isZh ? '预览效果' : 'Preview'}</p>
                <div className="flex items-center justify-center">
                  <div
                    className="w-12 h-12 rounded-full relative"
                    style={{
                      background: `radial-gradient(circle at 35% 35%, ${starColor}, ${starColor}88, transparent)`,
                      boxShadow: `0 0 ${starGlow * 30}px ${starColor}`,
                    }}
                  >
                    {starRing && (
                      <div
                        className="absolute inset-0 rounded-full"
                        style={{
                          border: `2px solid ${starRingColor}`,
                          transform: 'scale(1.5) rotateX(70deg)',
                          opacity: 0.8,
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="cyber-btn cyber-btn-sm flex-1 border-neon-green text-neon-green disabled:opacity-30"
              >
                {saving ? '...' : (isZh ? '保存' : 'SAVE')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false)
                  setNickname(user.nickname || user.username)
                  setAvatar(user.avatar || 'preset:1')
                  setStarColor((user.starColor || '#FFAA00').toUpperCase())
                  setStarGlow(user.starGlow ?? 0.5)
                  setStarRing(user.starRing ?? false)
                  setStarRingColor((user.starRingColor || '#A855F7').toUpperCase())
                }}
                className="cyber-btn cyber-btn-sm flex-1 border-neon-pink text-neon-pink"
              >
                {isZh ? '取消' : 'CANCEL'}
              </button>
            </div>
            {message && (
              <p className={`font-pixel text-[10px] mt-4 text-center ${message.includes(isZh ? '成功' : 'Saved') ? 'neon-text-green' : 'neon-text-pink'}`}>
                {message}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Column - High Scores */}
        <div className="cyber-card p-5 md:p-6 relative">
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-neon-purple/40 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-neon-purple/40 pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-purple/30 to-transparent" />

          <h3 className="title-section neon-text-purple mb-5 flex items-center gap-3">
            <div className="w-7 h-7 flex items-center justify-center rounded bg-black/30 border border-cyber-border">
              <PixelIcon type="star" size={12} color="#a855f7" />
            </div>
            HIGH SCORES
          </h3>

          <div className="space-y-3">
            {gameScores.map((g, idx) => (
              <div
                key={g.id}
                className={`flex items-center justify-between p-3 rounded border transition-colors ${
                  idx === 0 && g.score > 0
                    ? 'border-neon-yellow/30 bg-neon-yellow/5 hover:bg-neon-yellow/10'
                    : 'border-cyber-border/30 bg-black/20 hover:bg-black/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`font-pixel text-[9px] w-6 ${idx === 0 && g.score > 0 ? 'neon-text-yellow' : 'text-gray-500'}`}>
                    #{idx + 1}
                  </span>
                  <span className="font-mono text-sm text-gray-300">{g.name}</span>
                </div>
                <span className={`font-pixel text-xs flex items-center gap-2 ${g.score > 0 ? (idx === 0 ? 'neon-text-yellow' : 'text-gray-200') : 'text-gray-500'}`}>
                  {g.score > 0 ? g.score.toLocaleString() : '---'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column - Quick Actions */}
        <div className="space-y-5">
          {/* Upload Game Button */}
          <div className="cyber-card p-5 relative flex items-center justify-between">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-green/30 to-transparent" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center rounded bg-neon-green/10 border border-neon-green/30">
                <PixelIcon type="upload" size={18} color="#39ff14" />
              </div>
              <div>
                <p className="font-pixel text-sm text-white">{isZh ? '发布新游戏' : 'Publish Game'}</p>
                <p className="text-xs text-gray-500 mt-1">{isZh ? '把作品发射到宇宙' : 'Launch to the universe'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/upload')}
              className="cyber-btn cyber-btn-sm border-neon-green text-neon-green"
            >
              {isZh ? '发布' : 'PUBLISH'}
            </button>
          </div>

          {/* Stats Summary */}
          <div className="cyber-card p-5 relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-yellow/30 to-transparent" />
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-black/20 rounded border border-cyber-border/30">
                <p className="font-pixel text-xs neon-text-yellow">{useGameStore.getState().loadCoins().toLocaleString()}</p>
                <p className="text-[9px] text-gray-500 font-pixel mt-1">{isZh ? '金币' : 'COINS'}</p>
              </div>
              <div className="text-center p-3 bg-black/20 rounded border border-cyber-border/30">
                <p className="font-pixel text-xs text-neon-green">{myGames.length}</p>
                <p className="text-[9px] text-gray-500 font-pixel mt-1">{isZh ? '游戏' : 'GAMES'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* My Games Section - Collapsible */}
      <div className="cyber-card mt-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-neon-green/40 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-neon-green/40 pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-green/30 to-transparent" />

        {/* Header - Clickable to toggle */}
        <button
          type="button"
          onClick={() => setGamesExpanded(!gamesExpanded)}
          className="w-full p-5 md:p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
        >
          <h3 className="title-section neon-text-green flex items-center gap-3">
            <div className="w-7 h-7 flex items-center justify-center rounded bg-black/30 border border-cyber-border">
              <PixelIcon type="upload" size={12} color="#39ff14" />
            </div>
            {isZh ? '我发布的游戏' : 'MY GAMES'}
            <span className="text-xs text-gray-500 font-mono">({myGames.length})</span>
          </h3>
          <div className="flex items-center gap-2 text-gray-400">
            <span className="font-pixel text-[9px]">{gamesExpanded ? (isZh ? '收起' : 'Collapse') : (isZh ? '展开' : 'Expand')}</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="currentColor"
              className={`transition-transform duration-200 ${gamesExpanded ? 'rotate-180' : ''}`}
            >
              <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </button>

        {/* Content - Collapsible */}
        {gamesExpanded && (
          <div className="px-5 md:px-6 pb-5 md:pb-6 border-t border-cyber-border/30">
            {loadingGames ? (
              <div className="empty-state">
                <p className="font-pixel text-[10px] text-gray-500 loading-text">{isZh ? '加载中' : 'LOADING'}</p>
              </div>
            ) : myGames.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🎮</div>
                <p className="empty-state-text">{isZh ? '还没有发布游戏' : 'No games published yet'}</p>
                <button
                  type="button"
                  onClick={() => navigate('/upload')}
                  className="cyber-btn cyber-btn-sm border-neon-green text-neon-green mt-2"
                >
                  {isZh ? '发布第一个游戏' : 'Publish Your First Game'}
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                {myGames.map(game => (
                  <div key={game.id} className="cyber-card cyber-card-hover p-4 relative">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyber-border/50 to-transparent" />

                    {/* Game Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden border border-white/10"
                        style={{ boxShadow: `0 0 10px ${(game.planetColor || '#4ecdc4')}44` }}
                      >
                        {game.planetImage ? (
                          <img src={game.planetImage} alt={game.name} className="w-full h-full object-cover" style={{ borderRadius: '50%' }} />
                        ) : (
                          <div className="w-full h-full" style={{ background: game.planetColor || '#4ecdc4' }} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-pixel text-[11px] text-gray-200 truncate block">{game.name}</span>
                        <span className="text-xs text-gray-500 font-mono">{game.date}</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                      <span className="flex items-center gap-1 px-2 py-1 bg-black/20 rounded">
                        👁 {game.views || 0}
                      </span>
                      <span className="flex items-center gap-1 px-2 py-1 bg-black/20 rounded">
                        👍 {game.likes || 0}
                      </span>
                      {game.tags?.[0] && (
                        <span className="game-tag game-tag-sm text-neon-blue border-neon-blue/40 ml-auto">{game.tags[0]}</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/upload?edit=${game.id}`)}
                        className="cyber-btn cyber-btn-sm flex-1 border-neon-blue text-neon-blue"
                      >
                        {isZh ? '编辑' : 'EDIT'}
                      </button>
                      {deleteConfirm === game.id ? (
                        <div className="flex gap-1 flex-1">
                          <button
                            type="button"
                            onClick={() => handleDeleteGame(game.id)}
                            className="cyber-btn cyber-btn-sm flex-1 border-neon-pink text-neon-pink"
                          >
                            {isZh ? '确认' : 'YES'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(null)}
                            className="cyber-btn cyber-btn-sm flex-1 border-gray-500 text-gray-400"
                          >
                            {isZh ? '取消' : 'NO'}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(game.id)}
                          className="cyber-btn cyber-btn-sm flex-1 border-neon-pink/30 text-neon-pink hover:bg-neon-pink/10"
                        >
                          {isZh ? '删除' : 'DELETE'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Logout - At the very bottom */}
      <button
        type="button"
        onClick={() => { logout(); navigate('/') }}
        className="cyber-btn w-full mt-6 border-neon-pink/40 text-neon-pink hover:bg-neon-pink/10"
      >
        {isZh ? '退出登录' : 'LOGOUT'}
      </button>
    </main>
  )
}
