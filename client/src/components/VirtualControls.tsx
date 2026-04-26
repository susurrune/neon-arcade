// ============ 移动端虚拟按键组件 — 游戏触屏操作支持 ============
import { useCallback, useEffect, useRef } from 'react'
import { playSound } from '../utils/sound'
import { dispatchVirtualInput } from '../utils/virtualInput'

// 各游戏的按键配置
export const GAME_CONTROLS: Record<string, VirtualControlConfig> = {
  snake: {
    type: 'dpad',
    buttons: [
      { id: 'up', icon: '↑', position: { top: true } },
      { id: 'down', icon: '↓', position: { bottom: true } },
      { id: 'left', icon: '←', position: { left: true } },
      { id: 'right', icon: '→', position: { right: true } },
    ],
    actions: [
      { id: 'dash', icon: '⚡', label: '冲刺', position: { right: true, bottom: true } },
    ],
  },
  tetris: {
    type: 'leftright',
    buttons: [
      { id: 'left', icon: '←', position: { left: true } },
      { id: 'right', icon: '→', position: { right: true } },
    ],
    actions: [
      { id: 'rotate', icon: '↻', label: '旋转', position: { left: true, bottom: true } },
      { id: 'drop', icon: '⇓', label: '落底', position: { right: true, bottom: true } },
      { id: 'skill', icon: '✦', label: '技能', position: { center: true, bottom: true } },
    ],
  },
  platformer: {
    type: 'single',
    buttons: [],
    actions: [
      { id: 'charge', icon: '⬆', label: '蓄力', position: { center: true, bottom: true } },
    ],
  },
  shooter: {
    type: 'leftright',
    buttons: [
      { id: 'left', icon: '←', position: { left: true } },
      { id: 'right', icon: '→', position: { right: true } },
    ],
    actions: [
      { id: 'skill', icon: '💣', label: '技能', position: { center: true, bottom: true } },
    ],
  },
  asteroids: {
    type: 'custom',
    buttons: [
      { id: 'rotate_left', icon: '↺', position: { left: true } },
      { id: 'rotate_right', icon: '↻', position: { right: true } },
    ],
    actions: [
      { id: 'thrust', icon: '⬆', label: '推进', position: { center: true, bottom: true } },
      { id: 'fire', icon: '●', label: '射击', position: { right: true, bottom: true } },
      { id: 'teleport', icon: '✦', label: '瞬移', position: { left: true, bottom: true } },
    ],
  },
}

interface VirtualControlConfig {
  type: 'dpad' | 'leftright' | 'custom' | 'single'
  buttons: ControlButton[]
  actions: ControlAction[]
}

interface ControlButton {
  id: string
  icon: string
  position: Record<string, boolean>
}

interface ControlAction {
  id: string
  icon: string
  label?: string
  position: Record<string, boolean>
}

interface VirtualControlsProps {
  gameId: string
  visible: boolean
}

export default function VirtualControls({ gameId, visible }: VirtualControlsProps) {
  const config = GAME_CONTROLS[gameId] || GAME_CONTROLS.snake
  const containerRef = useRef<HTMLDivElement>(null)

  // 触摸事件处理
  const handleTouch = useCallback((action: string, pressed: boolean) => {
    dispatchVirtualInput(gameId, action, pressed)
    if (pressed) playSound('click')
  }, [gameId])

  // 发送按键事件到游戏画布
  useEffect(() => {
    if (!visible) return

    const container = containerRef.current
    if (!container) return

    // 阻止触摸事件穿透到游戏画布
    const preventDefault = (e: TouchEvent) => e.preventDefault()
    container.addEventListener('touchstart', preventDefault, { passive: false })
    container.addEventListener('touchmove', preventDefault, { passive: false })
    container.addEventListener('touchend', preventDefault, { passive: false })

    return () => {
      container.removeEventListener('touchstart', preventDefault)
      container.removeEventListener('touchmove', preventDefault)
      container.removeEventListener('touchend', preventDefault)
    }
  }, [visible])

  if (!visible) return null

  return (
    <div ref={containerRef} className="virtual-controls">
      {/* 方向控制区域 */}
      <div className="controls-direction">
        {config.buttons.map((btn) => (
          <VirtualButton
            key={btn.id}
            icon={btn.icon}
            position={btn.position}
            onPress={(pressed) => handleTouch(btn.id, pressed)}
          />
        ))}
      </div>

      {/* 动作按钮区域 */}
      <div className="controls-actions">
        {config.actions.map((act) => (
          <VirtualButton
            key={act.id}
            icon={act.icon}
            label={act.label}
            position={act.position}
            isAction
            onPress={(pressed) => handleTouch(act.id, pressed)}
          />
        ))}
      </div>
    </div>
  )
}

interface VirtualButtonProps {
  icon: string
  label?: string
  position: Record<string, boolean>
  isAction?: boolean
  onPress: (pressed: boolean) => void
}

function VirtualButton({ icon, label, position, isAction, onPress }: VirtualButtonProps) {
  const pressedRef = useRef(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault()
    pressedRef.current = true
    onPress(true)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault()
    pressedRef.current = false
    onPress(false)
  }

  // 根据位置构建类名
  const positionClasses = Object.keys(position)
    .filter(key => position[key])
    .map(key => `pos-${key}`)
    .join(' ')

  return (
    <button
      type="button"
      className={`virtual-btn ${isAction ? 'action' : 'direction'} ${positionClasses}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <span className="btn-icon">{icon}</span>
      {label && <span className="btn-label">{label}</span>}
    </button>
  )
}