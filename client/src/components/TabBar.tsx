import { useLocation, useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import PixelIcon from './PixelIcon'

const TABS = [
  { path: '/', label: '首页', icon: 'home' },
  { path: '/upload', label: '发布', icon: 'upload' },
  { path: '/profile', label: '我的', icon: 'user' },
]

export default function TabBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useGameStore()
  const isGamePage = location.pathname.startsWith('/game/')

  // Hide tab bar during gameplay on mobile
  if (isGamePage) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-cyber-bg/95 backdrop-blur-sm border-t border-cyber-border safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {TABS.map((tab) => {
          const isActive = tab.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(tab.path)
          const needsAuth = tab.path === '/upload' || tab.path === '/profile'
          const iconColor = isActive ? 'var(--neon-blue)' : '#4a4a6a'

          return (
            <button
              key={tab.path}
              onClick={() => {
                if (needsAuth && !user) {
                  navigate('/login')
                } else {
                  navigate(tab.path)
                }
              }}
              className="flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] transition-colors"
            >
              <PixelIcon type={tab.icon} size={18} color={iconColor} />
              <span
                className="font-pixel text-[10px] transition-colors"
                style={{ color: iconColor }}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
