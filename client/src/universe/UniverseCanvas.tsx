// ============ 宇宙主画布组件 — 工业级交互 ============
import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Starfield } from './Starfield'
import { GalaxyManager } from './GalaxyManager'
import { PlanetSystem } from './PlanetSystem'
import { WarpEffect } from './WarpEffect'
import { PerformanceMonitor } from './PerformanceMonitor'
import { CAMERA_CONFIG, WARP_CONFIG } from './types'
import type { Camera, Planet, GameInfo } from './types'

interface UniverseCanvasProps {
  games: GameInfo[]
  onHoverPlanet: (info: { planet: Planet; screenX: number; screenY: number } | null) => void
  onWarpStart: (planet: Planet) => void
  onWarpEnd: () => void
}

export default function UniverseCanvas({ games, onHoverPlanet, onWarpStart, onWarpEnd }: UniverseCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const navRef = useRef(useNavigate())
  const cameraRef = useRef<Camera>({
    x: 0, y: 0, zoom: 0.65,
    targetX: 0, targetY: 0, targetZoom: 0.65,
    vx: 0, vy: 0,
  })
  const galaxyRef = useRef(new GalaxyManager())
  const starfieldRef = useRef(new Starfield())
  const planetSysRef = useRef(new PlanetSystem())
  const warpRef = useRef(new WarpEffect())
  const perfRef = useRef(new PerformanceMonitor())

  // 交互状态
  const dragRef = useRef({ dragging: false, lastX: 0, lastY: 0, prevX: 0, prevY: 0, startTime: 0 })
  const pinchRef = useRef({ pinching: false, startDist: 0, startZoom: 1 })
  const lastTimeRef = useRef(0)
  const animFrameRef = useRef(0)
  const hoveredRef = useRef<Planet | null>(null)

  // 双击检测状态
  const lastClickRef = useRef({ time: 0, x: 0, y: 0, planetId: '' })
  const DOUBLE_CLICK_THRESHOLD = 400 // ms
  const DOUBLE_CLICK_DISTANCE_THRESHOLD = 20 // px

  // 构建/重建星系
  useEffect(() => {
    if (games.length > 0) {
      galaxyRef.current.buildFromGames(games)
    }
  }, [games])

  // 主渲染循环
  const renderLoop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const now = performance.now() / 1000
    const dt = Math.min(now - (lastTimeRef.current || now), 0.1)
    lastTimeRef.current = now

    const w = canvas.width
    const h = canvas.height
    const cam = cameraRef.current
    const starfield = starfieldRef.current
    const galaxy = galaxyRef.current
    const planetSys = planetSysRef.current
    const warp = warpRef.current
    const perf = perfRef.current

    // === FPS 监控 + 动态降级 ===
    perf.update(dt)
    const quality = perf.qualityLevel // 1.0 = full, 0.5 = low

    // === 工业级 Camera 物理更新 ===
    const cfg = CAMERA_CONFIG

    // 1. 惯性：如果不在拖拽，应用速度衰减
    if (!dragRef.current.dragging) {
      cam.vx *= cfg.inertiaDecay
      cam.vy *= cfg.inertiaDecay
      // 速度极小时归零
      if (Math.abs(cam.vx) < 0.01) cam.vx = 0
      if (Math.abs(cam.vy) < 0.01) cam.vy = 0
      // 将惯性速度应用到 target
      cam.targetX += cam.vx
      cam.targetY += cam.vy
    }

    // 2. 平滑追踪（阻尼缓动）
    const lerp = cfg.damping
    cam.x += (cam.targetX - cam.x) * lerp
    cam.y += (cam.targetY - cam.y) * lerp
    cam.zoom += (cam.targetZoom - cam.zoom) * cfg.zoomSmoothing

    // 3. Zoom 限制
    cam.zoom = Math.max(cfg.minZoom, Math.min(cfg.maxZoom, cam.zoom))

    // === Warp 镜头动画 ===
    if (warp.isActive && warp['state']?.targetPlanetId) {
      const targetPlanet = galaxy.planets.find(p => p.id === warp['state'].targetPlanetId)
      if (targetPlanet) {
        const pos = galaxy.getPlanetPosition(targetPlanet, now)
        const pullSpeed = WARP_CONFIG.cameraPullSpeed
        cam.targetX += (pos.x - cam.targetX) * pullSpeed
        cam.targetY += (pos.y - cam.targetY) * pullSpeed
        cam.targetZoom = Math.min(cam.targetZoom + 0.015, cfg.maxZoom)
        // 停止惯性
        cam.vx = 0
        cam.vy = 0
      }
    }

    // === 清屏 + 深空背景 ===
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7)
    bgGrad.addColorStop(0, '#0a0a2e')
    bgGrad.addColorStop(0.5, '#060618')
    bgGrad.addColorStop(1, '#030308')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, w, h)

    // === 星空（降级时减少渲染） ===
    starfield.update(dt)
    starfield.render(ctx, cam.x, cam.y, cam.zoom, quality)

    // === 能量流 (端点跟随星系漂移) ===
    const streams = galaxy.getEnergyStreams(now)
    for (const stream of streams) {
      planetSys.renderEnergyStream(ctx, stream.from.x, stream.from.y, stream.to.x, stream.to.y, stream.color, cam, now, quality)
    }

    // === 更新新生星球状态（驱动 born 动画结束） ===
    galaxy.updateBornStates()

    // === 星系标签（位置含轻微飘移，避免完全静止） ===
    for (const g of galaxy.galaxiesList) {
      const gp = galaxy.getGalaxyPosition(g, now)
      planetSys.renderGalaxyLabel(ctx, g.name, g.colorTheme, gp.x, gp.y, cam)
    }

    // === 星球 ===
    planetSys.update(dt)
    const planetPositions: { planet: Planet; worldX: number; worldY: number }[] = []
    for (const planet of galaxy.planets) {
      const pos = galaxy.getPlanetPosition(planet, now)
      planetPositions.push({ planet, worldX: pos.x, worldY: pos.y })
      planetSys.renderPlanet(ctx, planet, pos.x, pos.y, cam, now, quality)
    }

    // 存储位置供点击检测
    galaxyRef.current.planetPositions = planetPositions

    // === Warp 特效 ===
    if (warp.isActive) {
      warp.update(dt, cam)
      warp.render(ctx, w, h, warp.progress, quality)
    }

    // === CRT 扫描线（像素风标配，降级时减弱） ===
    if (quality > 0.5) {
      const scanGap = quality > 0.8 ? 3 : 5
      ctx.fillStyle = `rgba(0,0,0,${0.03 * quality})`
      for (let y = 0; y < h; y += scanGap) {
        ctx.fillRect(0, y, w, 1)
      }
      // 缓慢滚动的亮线
      const _scanY = lastTimeRef.current * 30 % h
      ctx.fillStyle = 'rgba(0,240,255,0.02)'
      ctx.fillRect(0, _scanY, w, 2)
    }

    animFrameRef.current = requestAnimationFrame(renderLoop)
  }, [])

  // 初始化
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = window.innerWidth + 'px'
      canvas.style.height = window.innerHeight + 'px'
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.scale(dpr, dpr)
      planetSysRef.current.setCanvasSize(window.innerWidth, window.innerHeight)
      starfieldRef.current.resize(window.innerWidth, window.innerHeight)
    }

    resize()
    starfieldRef.current.init(window.innerWidth, window.innerHeight, 350)
    window.addEventListener('resize', resize)

    lastTimeRef.current = performance.now() / 1000
    animFrameRef.current = requestAnimationFrame(renderLoop)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [renderLoop])

  // === 鼠标交互 — 工业级手感 ===
  const cfg = CAMERA_CONFIG

  const handleMouseDown = (e: React.MouseEvent) => {
    if (warpRef.current.isActive) return
    dragRef.current = {
      dragging: true,
      lastX: e.clientX,
      lastY: e.clientY,
      prevX: e.clientX,
      prevY: e.clientY,
      startTime: performance.now(),
    }
    // 清除现有惯性
    cameraRef.current.vx = 0
    cameraRef.current.vy = 0
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const cam = cameraRef.current
    const drag = dragRef.current

    if (drag.dragging) {
      const dx = e.clientX - drag.lastX
      const dy = e.clientY - drag.lastY

      // 平移（考虑zoom和panSpeed）
      const panScale = cfg.panSpeed / cam.zoom
      cam.targetX -= dx * panScale
      cam.targetY -= dy * panScale

      // 记录速度用于惯性
      cam.vx = -dx * panScale * 0.3
      cam.vy = -dy * panScale * 0.3

      // 速度上限
      const speed = Math.sqrt(cam.vx * cam.vx + cam.vy * cam.vy)
      if (speed > cfg.velocityCap) {
        cam.vx = (cam.vx / speed) * cfg.velocityCap
        cam.vy = (cam.vy / speed) * cfg.velocityCap
      }

      drag.prevX = drag.lastX
      drag.prevY = drag.lastY
      drag.lastX = e.clientX
      drag.lastY = e.clientY
    }

    // 悬停检测
    const positions = galaxyRef.current.planetPositions || []
    const hit = planetSysRef.current.hitTest(e.clientX, e.clientY, positions, cam)
    if (hit !== hoveredRef.current) {
      hoveredRef.current = hit
      planetSysRef.current.setHovered(hit)
      if (hit) {
        const pos = galaxyRef.current.getPlanetPosition(hit, performance.now() / 1000)
        const screen = planetSysRef.current.worldToScreen(pos.x, pos.y, cam)
        onHoverPlanet({ planet: hit, screenX: screen.x, screenY: screen.y })
      } else {
        onHoverPlanet(null)
      }
    }
    canvasRef.current!.style.cursor = hit ? 'pointer' : (drag.dragging ? 'grabbing' : 'grab')
  }

  const handleMouseUp = () => {
    // 保留惯性速度（已在mousemove中记录）
    dragRef.current.dragging = false
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (warpRef.current.isActive) return
    e.preventDefault()
    const cam = cameraRef.current
    const delta = e.deltaY > 0 ? (1 / cfg.zoomSpeed) : cfg.zoomSpeed
    cam.targetZoom = Math.max(cfg.minZoom, Math.min(cfg.maxZoom, cam.targetZoom * delta))
  }

  const handleClick = (e: React.MouseEvent) => {
    if (warpRef.current.isActive) return
    const cam = cameraRef.current
    const drag = dragRef.current

    // 判断是否为点击（而非拖拽）
    const dx = e.clientX - drag.prevX
    const dy = e.clientY - drag.prevY
    const elapsed = performance.now() - drag.startTime
    if (elapsed > 300 || Math.abs(dx) > 5 || Math.abs(dy) > 5) return

    const positions = galaxyRef.current.planetPositions || []
    const hit = planetSysRef.current.hitTest(e.clientX, e.clientY, positions, cam)

    // 双击检测
    const now = performance.now()
    const lastClick = lastClickRef.current
    const timeDiff = now - lastClick.time
    const distDiff = Math.sqrt(Math.pow(e.clientX - lastClick.x, 2) + Math.pow(e.clientY - lastClick.y, 2))

    if (hit) {
      // 检测双击：两次点击同一行星，时间间隔小于阈值，位置相近
      if (hit.id === lastClick.planetId &&
          timeDiff < DOUBLE_CLICK_THRESHOLD &&
          distDiff < DOUBLE_CLICK_DISTANCE_THRESHOLD) {
        // 双击成功，进入游戏
        startWarp(hit)
        // 重置双击状态
        lastClickRef.current = { time: 0, x: 0, y: 0, planetId: '' }
      } else {
        // 单击，记录状态（等待可能的第二次点击）
        lastClickRef.current = { time: now, x: e.clientX, y: e.clientY, planetId: hit.id }
      }
    } else {
      // 点击空白区域，重置双击状态
      lastClickRef.current = { time: 0, x: 0, y: 0, planetId: '' }
    }
  }

  const startWarp = (planet: Planet) => {
    const cam = cameraRef.current
    const pos = galaxyRef.current.getPlanetPosition(planet, performance.now() / 1000)

    // 清除惯性
    cam.vx = 0
    cam.vy = 0

    onWarpStart(planet)
    warpRef.current.start(
      planet,
      pos.x, pos.y,
      cam,
      (planetId) => {
        onWarpEnd()
        const gamePlanet = galaxyRef.current.planets.find(p => p.id === planetId)
        if (gamePlanet) {
          navRef.current(`/game/${gamePlanet.gameId}`)
        }
      }
    )
  }

  // === 触控 — 工业级手感 ===
  const handleTouchStart = (e: React.TouchEvent) => {
    if (warpRef.current.isActive) return
    if (e.touches.length === 1) {
      dragRef.current = {
        dragging: true,
        lastX: e.touches[0].clientX,
        lastY: e.touches[0].clientY,
        prevX: e.touches[0].clientX,
        prevY: e.touches[0].clientY,
        startTime: performance.now(),
      }
      cameraRef.current.vx = 0
      cameraRef.current.vy = 0
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      pinchRef.current = {
        pinching: true,
        startDist: Math.sqrt(dx * dx + dy * dy),
        startZoom: cameraRef.current.targetZoom,
      }
      dragRef.current.dragging = false
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault()
    const cam = cameraRef.current
    const touchCfg = cfg.touchSensitivity

    if (e.touches.length === 1 && dragRef.current.dragging) {
      const dx = e.touches[0].clientX - dragRef.current.lastX
      const dy = e.touches[0].clientY - dragRef.current.lastY

      const panScale = touchCfg / cam.zoom
      cam.targetX -= dx * panScale
      cam.targetY -= dy * panScale

      // 惯性
      cam.vx = -dx * panScale * 0.25
      cam.vy = -dy * panScale * 0.25

      dragRef.current.prevX = dragRef.current.lastX
      dragRef.current.prevY = dragRef.current.lastY
      dragRef.current.lastX = e.touches[0].clientX
      dragRef.current.lastY = e.touches[0].clientY
    } else if (e.touches.length === 2 && pinchRef.current.pinching) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const scale = dist / pinchRef.current.startDist
      cameraRef.current.targetZoom = Math.max(cfg.minZoom, Math.min(cfg.maxZoom, pinchRef.current.startZoom * scale))
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      // 单击检测（区分拖拽和点击）
      const drag = dragRef.current
      const elapsed = performance.now() - drag.startTime
      const dx = drag.lastX - drag.prevX
      const dy = drag.lastY - drag.prevY

      if (elapsed < 300 && Math.abs(dx) < 10 && Math.abs(dy) < 10) {
        const cam = cameraRef.current
        const positions = galaxyRef.current.planetPositions || []
        const hit = planetSysRef.current.hitTest(drag.lastX, drag.lastY, positions, cam)

        if (hit) {
          // 双击检测
          const now = performance.now()
          const lastClick = lastClickRef.current
          const timeDiff = now - lastClick.time
          const distDiff = Math.sqrt(Math.pow(drag.lastX - lastClick.x, 2) + Math.pow(drag.lastY - lastClick.y, 2))

          if (hit.id === lastClick.planetId &&
              timeDiff < DOUBLE_CLICK_THRESHOLD &&
              distDiff < DOUBLE_CLICK_DISTANCE_THRESHOLD) {
            // 双击成功，进入游戏
            startWarp(hit)
            lastClickRef.current = { time: 0, x: 0, y: 0, planetId: '' }
          } else {
            // 单击，记录状态
            lastClickRef.current = { time: now, x: drag.lastX, y: drag.lastY, planetId: hit.id }
          }
        } else {
          lastClickRef.current = { time: 0, x: 0, y: 0, planetId: '' }
        }
      }

      dragRef.current.dragging = false
      pinchRef.current.pinching = false
    }
  }

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ touchAction: 'none' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    />
  )
}
