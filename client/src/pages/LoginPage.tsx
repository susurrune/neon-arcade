import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api'
import { useGameStore } from '../store/gameStore'
import PixelIcon from '../components/PixelIcon'
import logoSvg from '../assets/icons/logo.svg'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const { setUser } = useGameStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await authApi.login(username, password)
      setUser(result.user, result.token)
      setSuccess('登录成功！')
      setTimeout(() => navigate('/'), 800)
    } catch (err: any) {
      setError(err.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo + Title */}
        <div className="text-center mb-8">
          <img src={logoSvg} alt="NEON ARCADE" className="h-12 w-auto mx-auto mb-4 drop-shadow-[0_0_12px_rgba(0,240,255,0.4)]" />
          <h1 className="font-pixel text-base md:text-lg neon-text-blue mb-2">LOGIN</h1>
          <p className="text-sm text-gray-500 font-mono">回到赛博世界</p>
        </div>

        {/* Login card */}
        <div className="bg-cyber-card border border-cyber-border p-6 relative">
          {/* Corner decorations */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-neon-blue/40 pointer-events-none" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-neon-blue/40 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-neon-blue/40 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-neon-blue/40 pointer-events-none" />

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block font-pixel text-[10px] md:text-[11px] text-gray-500 mb-1.5 flex items-center gap-1.5">
                <PixelIcon type="user" size={10} color="#666" />
                USERNAME
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="neon-input"
                placeholder="用户名"
                autoComplete="username"
                autoFocus
              />
            </div>
            <div>
              <label className="block font-pixel text-[10px] md:text-[11px] text-gray-500 mb-1.5 flex items-center gap-1.5">
                <PixelIcon type="bolt" size={10} color="#666" />
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="neon-input"
                placeholder="密码"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-sm text-neon-pink font-mono animate-glow-pulse">{error}</p>
            )}
            {success && (
              <p className="text-sm neon-text-green font-mono animate-glow-pulse">{success}</p>
            )}

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="neon-btn-blue w-full text-[10px] md:text-xs py-2.5 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {loading ? '...' : '登录'}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 font-mono text-sm text-gray-600">
          没有账号？
          <Link to="/register" className="text-neon-blue hover:underline ml-1">注册</Link>
        </p>
      </div>
    </main>
  )
}
