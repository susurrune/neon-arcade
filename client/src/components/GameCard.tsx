import { useNavigate } from 'react-router-dom'
import type { GameInfo } from '../api'
import snakeIcon from '../assets/icons/snake.svg'
import tetrisIcon from '../assets/icons/tetris.svg'
import platformerIcon from '../assets/icons/platformer.svg'
import shooterIcon from '../assets/icons/shooter.svg'

interface Props {
  game: GameInfo
}

const TAG_STYLE: Record<string, string> = {
  '经典': 'neon-tag-blue',
  '消除': 'neon-tag-purple',
  '平台': 'neon-tag-green',
  '射击': 'neon-tag-pink',
  '用户': 'neon-tag-pink',
}

const ICON_MAP: Record<string, string> = {
  snake: snakeIcon,
  tetris: tetrisIcon,
  platformer: platformerIcon,
  shooter: shooterIcon,
}

export default function GameCard({ game }: Props) {
  const navigate = useNavigate()
  const iconSrc = ICON_MAP[game.id]

  return (
    <div className="game-card group" onClick={() => navigate(`/game/${game.id}`)}>
      {/* Icon area */}
      <div className="aspect-[4/3] mb-4 flex items-center justify-center bg-cyber-surface border border-cyber-border relative overflow-hidden">
        {iconSrc ? (
          <img
            src={iconSrc}
            alt={game.name}
            className="card-icon w-16 h-16 transition-all duration-300"
          />
        ) : (
          <span className="font-pixel text-xl neon-text-blue">{game.name[0]}</span>
        )}
        {/* Hover glow line */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-neon-blue opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Title */}
      <h3 className="font-pixel text-[11px] neon-text-blue mb-2 truncate group-hover:animate-glow-pulse">
        {game.name}
      </h3>

      {/* Description */}
      <p className="text-gray-500 text-xs mb-3 line-clamp-2 font-mono leading-relaxed">
        {game.description}
      </p>

      {/* Tags */}
      <div className="flex gap-2 flex-wrap mb-3">
        {game.tags.map((tag) => (
          <span key={tag} className={TAG_STYLE[tag] || 'neon-tag-blue'}>
            {tag}
          </span>
        ))}
        {!game.isOfficial && game.authorName && (
          <span className="neon-tag-purple">by {game.authorName}</span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-gray-600 font-pixel">{game.date}</span>
        <div className="flex items-center gap-2">
          {game.views !== undefined && game.views > 0 && (
            <span className="text-[10px] text-gray-600 font-pixel">{game.views > 999 ? `${(game.views / 1000).toFixed(1)}k` : game.views}</span>
          )}
          {game.likes !== undefined && game.likes > 0 && (
            <span className="text-[10px] text-neon-pink font-pixel">{game.likes}</span>
          )}
        </div>
      </div>
    </div>
  )
}
