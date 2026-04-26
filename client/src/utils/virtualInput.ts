// ============ 虚拟输入系统 — 将触屏操作转换为键盘事件 ============

// 游戏操作映射到键盘按键
export const INPUT_MAP: Record<string, Record<string, { key: string; code: string }>> = {
  snake: {
    up: { key: 'ArrowUp', code: 'ArrowUp' },
    down: { key: 'ArrowDown', code: 'ArrowDown' },
    left: { key: 'ArrowLeft', code: 'ArrowLeft' },
    right: { key: 'ArrowRight', code: 'ArrowRight' },
    dash: { key: ' ', code: 'Space' },
  },
  tetris: {
    left: { key: 'ArrowLeft', code: 'ArrowLeft' },
    right: { key: 'ArrowRight', code: 'ArrowRight' },
    rotate: { key: 'ArrowUp', code: 'ArrowUp' },
    drop: { key: ' ', code: 'Space' },
    skill: { key: 'c', code: 'KeyC' },
  },
  platformer: {
    charge: { key: ' ', code: 'Space' },
  },
  shooter: {
    left: { key: 'ArrowLeft', code: 'ArrowLeft' },
    right: { key: 'ArrowRight', code: 'ArrowRight' },
    skill: { key: ' ', code: 'Space' },
  },
  asteroids: {
    rotate_left: { key: 'a', code: 'KeyA' },
    rotate_right: { key: 'd', code: 'KeyD' },
    thrust: { key: 'w', code: 'KeyW' },
    fire: { key: ' ', code: 'Space' },
    teleport: { key: 'Shift', code: 'ShiftLeft' },
  },
}

// 当前活动画布
let activeCanvas: HTMLCanvasElement | null = null

// 设置活动画布
export function setActiveCanvas(canvas: HTMLCanvasElement | null) {
  activeCanvas = canvas
}

// 发送虚拟按键事件到画布
export function dispatchVirtualInput(gameId: string, action: string, pressed: boolean) {
  if (!activeCanvas) return

  const mapping = INPUT_MAP[gameId]
  if (!mapping) return

  const keyInfo = mapping[action]
  if (!keyInfo) return

  // 创建并分发键盘事件
  const eventType = pressed ? 'keydown' : 'keyup'
  const event = new KeyboardEvent(eventType, {
    key: keyInfo.key,
    code: keyInfo.code,
    bubbles: true,
    cancelable: true,
  })

  activeCanvas.dispatchEvent(event)
}