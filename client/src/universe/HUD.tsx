// ============ HUD 悬浮界面 ============
import { useGameStore } from '../store/gameStore'
import PixelIcon from '../components/PixelIcon'
import { Avatar } from '../components/Avatar'
import { t } from '../i18n'

interface HUDProps {
  currentGalaxy?: string
  onLoginClick: () => void
  onProfileClick: () => void
  onUploadClick: () => void
}

export default function HUD({ currentGalaxy, onLoginClick, onProfileClick, onUploadClick }: HUDProps) {
  const { user, logout, lang, toggleLang } = useGameStore()

  const navLabels = lang === 'zh'
    ? { drag: '拖拽探索', zoom: '滚轮缩放', click: '点击进入', upload: '发布' }
    : { drag: 'Drag', zoom: 'Scroll', click: 'Click', upload: 'Upload' }

  return (
    <div className="fixed inset-0 pointer-events-none z-20" style={{ fontFamily: 'monospace' }}>
      {/* 左上：星系名称 */}
      <div className="absolute top-4 left-4 md:top-6 md:left-6">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-neon-blue rounded-full animate-glow-pulse" />
          <span className="font-pixel text-[11px] md:text-xs neon-text-blue tracking-widest">
            GAME UNIVERSE
          </span>
        </div>
        {currentGalaxy && (
          <p className="text-xs md:text-sm text-gray-500 mt-1 ml-4">
            SECTOR: {currentGalaxy}
          </p>
        )}
      </div>

      {/* 右上：用户状态 + 语言切换 */}
      <div className="absolute top-4 right-4 md:top-6 md:right-6 pointer-events-auto">
        <div className="flex items-center gap-3">
          {/* Language toggle */}
          <button
            onClick={toggleLang}
            className="font-pixel text-[10px] md:text-xs px-2.5 py-1.5 border border-cyber-border text-gray-400 hover:text-neon-blue hover:border-neon-blue transition-colors select-none"
          >
            {lang === 'zh' ? '中' : 'EN'}
          </button>

          {user ? (
            <>
              <button
                onClick={onUploadClick}
                className="font-pixel text-[10px] md:text-xs px-3 py-1.5 border border-neon-purple text-neon-purple hover:bg-neon-purple/10 transition-colors flex items-center gap-1"
              >
                <PixelIcon type="plus" size={10} color="#b026ff" />
                {navLabels.upload}
              </button>
              <button
                onClick={onProfileClick}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <Avatar avatar={user.avatar} size={32} className="rounded-full border border-neon-blue/50" style={{ boxShadow: '0 0 8px rgba(0,240,255,0.3)' }} />
                <span className="font-pixel text-[10px] md:text-xs text-gray-400 hidden md:block">
                  {user.nickname || user.username}
                </span>
              </button>
              <button
                onClick={logout}
                className="hover:opacity-80 transition-opacity"
              >
                <PixelIcon type="close" size={12} color="#666" className="hover:text-neon-pink" />
              </button>
            </>
          ) : (
            <button
              onClick={onLoginClick}
              className="font-pixel text-xs md:text-sm px-4 py-2 border border-neon-blue text-neon-blue hover:bg-neon-blue/10 transition-colors tracking-wider"
            >
              {t('login')}
            </button>
          )}
        </div>
      </div>

      {/* 底部：极简导航 */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto">
        <div className="flex items-center gap-4 md:gap-6 bg-black/40 backdrop-blur-sm border border-cyber-border px-5 py-2.5 rounded">
          <NavHint icon="mouse" label={navLabels.drag} />
          <div className="w-px h-4 bg-cyber-border" />
          <NavHint icon="search" label={navLabels.zoom} />
          <div className="w-px h-4 bg-cyber-border" />
          <NavHint icon="planet" label={navLabels.click} />
        </div>
      </div>

      {/* 左下：星系统计 */}
      <div className="absolute bottom-6 left-4 md:left-6 hidden md:block">
        <p className="font-pixel text-[9px] text-gray-700 tracking-wider">
          UNIVERSE MAP v1.0
        </p>
      </div>
    </div>
  )
}

function NavHint({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <PixelIcon type={icon} size={14} color="#8888aa" />
      <span className="font-pixel text-[9px] md:text-[10px] text-gray-500">{label}</span>
    </div>
  )
}
