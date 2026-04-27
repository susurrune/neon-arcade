import { useEffect, useRef, useState, useCallback } from 'react'
import { SnakeGame } from '../games/SnakeGame'
import { TetrisGame } from '../games/TetrisGame'
import { PlatformerGame } from '../games/PlatformerGame'
import { ShooterGame } from '../games/ShooterGame'
import { AsteroidsGame } from '../games/AsteroidsGame'
import { RacingGame } from '../games/RacingGame'
import { TowerDefenseGame } from '../games/TowerDefenseGame'
import { WarriorGame } from '../games/WarriorGame'
import { FarmGame } from '../games/FarmGame'
import { setActiveCanvas } from '../utils/virtualInput'

interface GameImpl {
  start: () => void
  stop: () => void
}

interface GameInit {
  init: (canvas: HTMLCanvasElement, onScore: (s: number) => void) => void
  destroy: () => void
}

function createSnake(): GameImpl & GameInit {
  let g: SnakeGame | null = null
  return {
    init: (canvas, onScore) => { g = new SnakeGame(canvas, onScore); g.start() },
    start: () => g?.start(),
    stop: () => g?.stop(),
    destroy: () => g?.stop(),
  }
}

function createTetris(): GameImpl & GameInit {
  const g = new TetrisGame()
  return {
    init: (canvas, onScore) => g.init(canvas, onScore),
    start: () => g.start(),
    stop: () => g.stop(),
    destroy: () => g.destroy(),
  }
}

function createPlatformer(): GameImpl & GameInit {
  let g: PlatformerGame | null = null
  return {
    init: (canvas, onScore) => { g = new PlatformerGame(canvas, onScore); g.start() },
    start: () => g?.start(),
    stop: () => g?.stop(),
    destroy: () => g?.destroy(),
  }
}

function createShooter(): GameImpl & GameInit {
  let g: ShooterGame | null = null
  return {
    init: (canvas, onScore) => { g = new ShooterGame(canvas, onScore); g.start() },
    start: () => g?.start(),
    stop: () => g?.stop(),
    destroy: () => g?.stop(),
  }
}

function createAsteroids(): GameImpl & GameInit {
  let g: AsteroidsGame | null = null
  return {
    init: (canvas, onScore) => { g = new AsteroidsGame(canvas, onScore); g.start() },
    start: () => g?.start(),
    stop: () => g?.stop(),
    destroy: () => g?.destroy(),
  }
}

function createRacing(): GameImpl & GameInit {
  let g: RacingGame | null = null
  return {
    init: (canvas, onScore) => { g = new RacingGame(canvas, onScore); g.start() },
    start: () => g?.start(),
    stop: () => g?.stop(),
    destroy: () => g?.destroy(),
  }
}

function createTowerDefense(): GameImpl & GameInit {
  let g: TowerDefenseGame | null = null
  return {
    init: (canvas, onScore) => { g = new TowerDefenseGame(canvas, onScore); g.start() },
    start: () => g?.start(),
    stop: () => g?.stop(),
    destroy: () => g?.destroy(),
  }
}

function createWarrior(): GameImpl & GameInit {
  let g: WarriorGame | null = null
  return {
    init: (canvas, onScore) => { g = new WarriorGame(canvas, onScore); g.start() },
    start: () => g?.start(),
    stop: () => g?.stop(),
    destroy: () => g?.destroy(),
  }
}

function createFarm(): GameImpl & GameInit {
  let g: FarmGame | null = null
  return {
    init: (canvas, onScore) => { g = new FarmGame(canvas, onScore); g.start() },
    start: () => g?.start(),
    stop: () => g?.stop(),
    destroy: () => g?.destroy(),
  }
}

const GAME_MAP: Record<string, () => GameImpl & GameInit> = {
  snake: createSnake,
  tetris: createTetris,
  platformer: createPlatformer,
  shooter: createShooter,
  asteroids: createAsteroids,
  racing: createRacing,
  towerdefense: createTowerDefense,
  warrior: createWarrior,
  farm: createFarm,
}

interface Props {
  gameId: string
  onScoreUpdate: (score: number) => void
  /** When true, the underlying game's loop is stopped (preserves state). */
  paused?: boolean
}

export default function GameCanvas({ gameId, onScoreUpdate, paused = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<(GameImpl & GameInit) | null>(null)
  const [ready, setReady] = useState(false)

  const stableOnScore = useCallback((score: number) => {
    onScoreUpdate(score)
  }, [onScoreUpdate])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // 注册为活动画布（用于虚拟输入）
    setActiveCanvas(canvas)

    const factory = GAME_MAP[gameId]
    if (!factory) return

    const game = factory()
    gameRef.current = game
    game.init(canvas, stableOnScore)
    setReady(true)

    return () => {
      setActiveCanvas(null)
      game.destroy()
      gameRef.current = null
      setReady(false)
    }
  }, [gameId, stableOnScore])

  // Pause/resume: relies on GameImpl.start/stop being safe to call repeatedly
  useEffect(() => {
    if (!ready) return
    const game = gameRef.current
    if (!game) return
    if (paused) game.stop()
    else game.start()
  }, [paused, ready])

  return (
    <div className="relative border border-cyber-border bg-cyber-surface overflow-hidden">
      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-neon-blue opacity-50 z-10 pointer-events-none" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-neon-blue opacity-50 z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-neon-blue opacity-50 z-10 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-neon-blue opacity-50 z-10 pointer-events-none" />

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-cyber-surface z-10">
          <span className="font-pixel text-[10px] neon-text-blue loading-text">LOADING</span>
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="w-full max-w-[640px] mx-auto block touch-none"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  )
}
