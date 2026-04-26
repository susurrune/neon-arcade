import { Link, useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { Avatar } from './Avatar'
import PixelIcon from './PixelIcon'
import logoSvg from '../assets/icons/logo.svg'
import { t } from '../i18n'

export default function Header() {
  const { user, logout, lang, toggleLang } = useGameStore()
  const navigate = useNavigate()

  return (
    <header className="border-b border-cyber-border bg-cyber-bg/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 md:gap-3 group">
          <img src={logoSvg} alt="NEON ARCADE" className="h-7 w-auto transition-all duration-300 group-hover:drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]" />
          <span className="font-pixel text-xs md:text-sm neon-text-blue hidden sm:inline">NEON ARCADE</span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-3 md:gap-4">
          {/* Language toggle */}
          <button
            onClick={toggleLang}
            className="font-pixel text-[10px] md:text-xs px-2.5 py-1.5 border border-cyber-border text-gray-400 hover:text-neon-blue hover:border-neon-blue transition-colors select-none"
          >
            {lang === 'zh' ? '中' : 'EN'}
          </button>

          {/* Desktop nav items */}
          {user ? (
            <>
              <Link to="/upload" className="neon-btn-green text-[10px] md:text-xs px-3 md:px-4 py-2 hidden md:inline-flex items-center gap-1.5">
                <PixelIcon type="plus" size={10} color="#39ff14" />
                {t('upload_game')}
              </Link>
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <Avatar avatar={user.avatar} size={32} className="rounded-full border border-cyber-border" />
                <span className="font-pixel text-[11px] md:text-xs neon-text-blue hidden md:inline">{user.nickname || user.username}</span>
              </button>
              <button
                onClick={() => { logout(); navigate('/') }}
                className="font-pixel text-[10px] md:text-xs text-gray-500 hover:text-neon-pink transition-colors hidden md:inline"
              >
                {t('logout')}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="font-pixel text-[11px] md:text-xs text-gray-400 hover:text-neon-blue transition-colors">
                {t('login')}
              </Link>
              <Link to="/register" className="neon-btn-blue text-[10px] md:text-xs px-3 md:px-4 py-2">
                {t('register')}
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
