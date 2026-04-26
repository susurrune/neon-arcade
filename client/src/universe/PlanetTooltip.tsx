// ============ 星球悬浮提示 ============
import type { Planet } from './types'
import { useGameStore } from '../store/gameStore'
import PixelIcon from '../components/PixelIcon'

interface PlanetTooltipProps {
  data: { planet: Planet; screenX: number; screenY: number } | null
}

export default function PlanetTooltip({ data }: PlanetTooltipProps) {
  if (!data) return null

  const { planet, screenX, screenY } = data
  const { loadHighScore } = useGameStore()
  const highScore = loadHighScore(planet.gameId)

  // 定位：在星球上方显示，避免超出屏幕
  const tooltipW = 200
  const tooltipH = 140
  const x = Math.min(Math.max(screenX - tooltipW / 2, 8), window.innerWidth - tooltipW - 8)
  const y = Math.max(screenY - tooltipH - 40, 8)

  return (
    <div
      className="fixed z-30 pointer-events-none"
      style={{ left: x, top: y, width: tooltipW }}
    >
      <div
        className="bg-black/80 backdrop-blur-md border rounded-sm p-3.5"
        style={{
          borderColor: planet.colorTheme + '60',
          boxShadow: `0 0 20px ${planet.colorTheme}20, inset 0 0 20px ${planet.colorTheme}08`,
        }}
      >
        {/* 游戏名 */}
        <h3
          className="font-pixel text-[11px] md:text-xs mb-2"
          style={{ color: planet.colorTheme }}
        >
          {planet.name}
        </h3>

        {/* 描述 */}
        <p className="text-[11px] text-gray-400 leading-relaxed mb-2 line-clamp-2">
          {planet.description}
        </p>

        {/* 统计 */}
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="flex items-center gap-1 text-neon-green">
            <PixelIcon type="heart" size={10} color="#39ff14" />
            {planet.likes}
          </span>
          <span className="flex items-center gap-1 text-gray-500">
            <PixelIcon type="eye" size={10} color="#888" />
            {planet.views}
          </span>
          {highScore > 0 && (
            <span className="flex items-center gap-1" style={{ color: planet.colorTheme }}>
              <PixelIcon type="star" size={10} color={planet.colorTheme } />
              {highScore}
            </span>
          )}
        </div>

        {/* 标签 */}
        <div className="flex gap-1 mt-2">
          {planet.tags.map(tag => (
            <span
              key={tag}
              className="text-[9px] px-1.5 py-0.5 rounded-sm"
              style={{
                backgroundColor: planet.colorTheme + '15',
                color: planet.colorTheme + 'cc',
                border: `1px solid ${planet.colorTheme}30`,
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* 进入提示 */}
        <p className="font-pixel text-[8px] text-gray-600 mt-2 text-center tracking-wider">
          CLICK TO WARP ▸
        </p>
      </div>

      {/* 指向箭头 - 像素风格三角 */}
      <div className="mx-auto -mt-px flex justify-center">
        <svg width="12" height="8" viewBox="0 0 12 8" style={{ imageRendering: 'pixelated' }}>
          <rect x="4" y="0" width="4" height="2" fill={planet.colorTheme + '60'} />
          <rect x="2" y="2" width="8" height="2" fill={planet.colorTheme + '60'} />
          <rect x="0" y="4" width="12" height="2" fill={planet.colorTheme + '60'} />
        </svg>
      </div>
    </div>
  )
}
