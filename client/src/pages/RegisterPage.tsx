import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api'
import { useGameStore } from '../store/gameStore'
import { AvatarPicker } from '../components/Avatar'
import PixelIcon from '../components/PixelIcon'
import logoSvg from '../assets/icons/logo.svg'

export default function RegisterPage() {
  const [username, setUsername] = useState('')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [avatar, setAvatar] = useState('preset:1')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const { setUser } = useGameStore()
  const navigate = useNavigate()

  // Client-side username validation
  const isValidUsername = (v: string) => /^[a-zA-Z0-9]+$/.test(v)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!username) { setError('请输入用户名'); return }
    if (!isValidUsername(username)) { setError('用户名只能包含字母和数字'); return }
    if (username.length < 2 || username.length > 20) { setError('用户名需要 2-20 个字符'); return }
    if (!password) { setError('请输入密码'); return }
    if (password.length < 4) { setError('密码至少 4 位'); return }
    if (password !== confirmPassword) { setError('两次密码不一致'); return }
    if (nickname && (nickname.length < 2 || nickname.length > 20)) { setError('昵称需要 2-20 个字符'); return }

    setLoading(true)
    try {
      const result = await authApi.register(username, password, nickname || username, avatar)
      setUser(result.user, result.token)

      setSuccess('注册成功！正在跳转...')
      setTimeout(() => navigate('/'), 1200)
    } catch (err: any) {
      setError(err.message || '注册失败')
    } finally {
      setLoading(false)
    }
  }

  const usernameError = username && !isValidUsername(username) ? '仅允许字母和数字' : ''

  return (
    <main className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Logo + Title */}
        <div className="text-center mb-8">
          <img src={logoSvg} alt="NEON ARCADE" className="h-10 w-auto mx-auto mb-4" style={{ filter: 'drop-shadow(0 0 8px oklch(0.55 0.20 285 / 0.5))' }} />
          <h1 className="font-pixel text-base md:text-lg neon-text-purple mb-2">REGISTER</h1>
          <p className="text-sm text-text-muted font-mono">加入赛博世界</p>
        </div>

        {/* Register card */}
        <div className="cyber-card p-6 relative">
          {/* 简化装饰 — 单色顶线 */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-purple/30 to-transparent" />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group">
              <label className="form-label">USERNAME *</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="neon-input"
                placeholder="登录用户名（仅字母+数字）"
                autoComplete="username"
                autoFocus
              />
              {usernameError && <p className="text-[11px] neon-text-pink mt-1">{usernameError}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">NICKNAME</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="neon-input"
                placeholder="显示昵称（可中文，2-20字）"
                maxLength={20}
              />
            </div>

            <div className="form-group">
              <label className="form-label flex items-center gap-1.5">
                <PixelIcon type="bolt" size={10} color="var(--text-muted)" />
                PASSWORD *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="neon-input"
                placeholder="密码（至少4位）"
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label className="form-label flex items-center gap-1.5">
                <PixelIcon type="bolt" size={10} color="var(--text-muted)" />
                CONFIRM PASSWORD *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="neon-input"
                placeholder="再次输入密码"
                autoComplete="new-password"
              />
            </div>

            {/* Avatar picker */}
            <AvatarPicker value={avatar} onChange={setAvatar} />

            {error && (
              <p className="text-sm neon-text-pink font-mono">{error}</p>
            )}
            {success && (
              <p className="text-sm neon-text-green font-mono animate-glow-pulse">{success}</p>
            )}

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="cyber-btn cyber-btn-lg w-full border-neon-purple text-neon-purple disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {loading ? '...' : '注册'}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 font-mono text-sm text-text-muted">
          已有账号？
          <Link to="/login" className="text-neon-blue hover:underline ml-1">登录</Link>
        </p>
      </div>
    </main>
  )
}
