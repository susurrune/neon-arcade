// ============ 宇宙渲染器 v3 — 新层级结构 ============
// 恒星 = 星系中心（显示星系信息）
// 行星 = 发布游戏的用户
// 卫星 = 具体游戏

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import {
  UniverseEngine, GalaxyData, StarData, PlanetData, SatelliteData,
} from './UniverseEngine'

// ==================== 类型 ====================

export interface RendererCallbacks {
  onSatelliteClick: (satellite: SatelliteData) => void
  onSatelliteDoubleClick: (satellite: SatelliteData) => void
  onPlanetClick: (planet: PlanetData) => void
  onStarClick: (star: StarData) => void
  onBackgroundClick: () => void
}

// ==================== 渲染器 ====================

export class UniverseRenderer {
  private engine: UniverseEngine
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private composer!: EffectComposer
  private bloomPass!: UnrealBloomPass

  // 分组
  private galaxyGroup = new THREE.Group()
  private starMeshGroup = new THREE.Group()
  private planetMeshGroup = new THREE.Group()
  private satelliteMeshGroup = new THREE.Group()
  private starfieldGroup = new THREE.Group()
  private orbitLineGroup = new THREE.Group()

  // 网格映射: id → mesh
  private starMeshes = new Map<string, THREE.Mesh>()
  private planetMeshes = new Map<string, THREE.Mesh>()
  private satelliteMeshes = new Map<string, THREE.Mesh>()
  private planetRings = new Map<string, THREE.Mesh>()
  private satelliteLabels = new Map<string, THREE.Sprite>()

  // 轨道线
  private planetOrbitLines = new Map<string, THREE.Line>()
  private satelliteOrbitLines = new Map<string, THREE.Line>()

  // 按星系分组的对象
  private galaxyObjects = new Map<string, Set<THREE.Object3D>>()

  // 射线
  private raycaster = new THREE.Raycaster()
  private mouse = new THREE.Vector2(-999, -999)
  private hoveredId: string | null = null

  // 双击检测
  private lastClickTime = 0
  private lastClickSatelliteId: string | null = null
  private DOUBLE_CLICK_THRESHOLD = 400

  // 动画
  private clock = new THREE.Clock()
  private animId = 0

  // 回调
  private callbacks: RendererCallbacks

  // 移动端检测
  private isMobile = false

  // 纹理加载
  private textureLoader = new THREE.TextureLoader()
  private avatarCache = new Map<string, THREE.Texture>()
  private planetTextureCache = new Map<string, THREE.Texture>()

  constructor(container: HTMLElement, engine: UniverseEngine, callbacks: RendererCallbacks) {
    this.engine = engine
    this.callbacks = callbacks
    this.isMobile = window.innerWidth < 768

    // 场景
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x050510)

    // 相机
    const aspect = container.clientWidth / container.clientHeight
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 2000)
    this.camera.position.set(0, 80, 120)
    this.camera.lookAt(0, 0, 0)

    // 渲染器
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isMobile,
      powerPreference: 'high-performance',
    })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 1.5 : 2))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2
    container.appendChild(this.renderer.domElement)

    // 控制器
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.minDistance = 10
    this.controls.maxDistance = 300
    this.controls.maxPolarAngle = Math.PI * 0.85
    this.controls.rotateSpeed = 0.5
    this.controls.zoomSpeed = 0.8

    // 后处理
    this.setupPostProcessing()

    // 构建场景
    this.buildStarfield()
    this.buildStars()
    this.buildPlanets()
    this.buildSatellites()
    this.buildOrbitLines()
    this.addLights()

    this.scene.add(this.galaxyGroup)
    this.scene.add(this.starMeshGroup)
    this.scene.add(this.planetMeshGroup)
    this.scene.add(this.satelliteMeshGroup)
    this.scene.add(this.starfieldGroup)
    this.scene.add(this.orbitLineGroup)

    // 事件
    this.renderer.domElement.addEventListener('click', this.onClick)
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove)
    window.addEventListener('resize', this.onResize)
  }

  private setupPostProcessing() {
    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))

    if (!this.isMobile) {
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.8,
        0.4,
        0.85,
      )
      this.composer.addPass(this.bloomPass)
    }

    this.composer.addPass(new OutputPass())
  }

  // ---- 背景星空 ----

  private buildStarfield() {
    this.buildDistantStarfield()
    this.buildMidStarfield()
    this.buildBrightStarfield()
    this.buildNebulaCloud()
    this.buildMilkyWay()
  }

  private buildDistantStarfield() {
    const count = this.isMobile ? 2000 : 4000
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const r = 400 + Math.random() * 400
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i3 + 2] = r * Math.cos(phi)

      const brightness = 0.15 + Math.random() * 0.25
      const tint = Math.random()
      if (tint < 0.3) {
        colors[i3] = brightness * 0.7
        colors[i3 + 1] = brightness * 0.85
        colors[i3 + 2] = brightness
      } else if (tint < 0.6) {
        colors[i3] = brightness * 0.85
        colors[i3 + 1] = brightness * 0.65
        colors[i3 + 2] = brightness
      } else {
        colors[i3] = brightness
        colors[i3 + 1] = brightness
        colors[i3 + 2] = brightness
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const mat = new THREE.PointsMaterial({
      size: 0.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
    })

    this.starfieldGroup.add(new THREE.Points(geo, mat))
  }

  private buildMidStarfield() {
    const count = this.isMobile ? 800 : 1500
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    const starColors = [
      [0.6, 0.75, 1.0],
      [0.75, 0.55, 1.0],
      [0.9, 0.7, 0.6],
      [0.55, 0.85, 0.8],
      [1.0, 0.85, 0.9],
      [0.7, 0.7, 0.9],
    ]

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const r = 200 + Math.random() * 300
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i3 + 2] = r * Math.cos(phi)

      const colorIdx = Math.floor(Math.random() * starColors.length)
      const brightness = 0.4 + Math.random() * 0.5
      colors[i3] = starColors[colorIdx][0] * brightness
      colors[i3 + 1] = starColors[colorIdx][1] * brightness
      colors[i3 + 2] = starColors[colorIdx][2] * brightness
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const mat = new THREE.PointsMaterial({
      size: 0.7,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
    })

    this.starfieldGroup.add(new THREE.Points(geo, mat))
  }

  private buildBrightStarfield() {
    const count = this.isMobile ? 50 : 100
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const r = 150 + Math.random() * 200
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i3 + 2] = r * Math.cos(phi)

      const brightness = 0.8 + Math.random() * 0.2
      colors[i3] = brightness
      colors[i3 + 1] = brightness
      colors[i3 + 2] = brightness
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const mat = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      sizeAttenuation: true,
    })

    this.starfieldGroup.add(new THREE.Points(geo, mat))
  }

  private buildNebulaCloud() {
    const nebulaConfigs = [
      { center: [100, 50, -150], color: '#4a1a7a', size: 80, opacity: 0.06 },
      { center: [-200, -30, 100], color: '#1a3a5a', size: 100, opacity: 0.05 },
      { center: [0, 80, 200], color: '#2a1a4a', size: 60, opacity: 0.07 },
      { center: [-150, -60, -200], color: '#3a2a5a', size: 90, opacity: 0.04 },
      { center: [180, 0, 50], color: '#1a2a3a', size: 70, opacity: 0.05 },
    ]

    for (const config of nebulaConfigs) {
      const spriteMat = new THREE.SpriteMaterial({
        map: this.generateNebulaTexture(config.color, config.size),
        transparent: true,
        opacity: config.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      const sprite = new THREE.Sprite(spriteMat)
      sprite.position.set(config.center[0], config.center[1], config.center[2])
      sprite.scale.set(config.size * 2, config.size * 2, 1)
      this.starfieldGroup.add(sprite)
    }
  }

  private generateNebulaTexture(baseColor: string, size: number): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    const color = new THREE.Color(baseColor)

    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
    gradient.addColorStop(0, `rgba(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)}, 0.8)`)
    gradient.addColorStop(0.3, `rgba(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)}, 0.4)`)
    gradient.addColorStop(0.7, `rgba(${Math.floor(color.r * 200)}, ${Math.floor(color.g * 200)}, ${Math.floor(color.b * 220)}, 0.15)`)
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 256, 256)

    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 256
      const y = Math.random() * 256
      const r = Math.random() * 3
      const alpha = Math.random() * 0.3
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }

    const tex = new THREE.CanvasTexture(canvas)
    return tex
  }

  private buildMilkyWay() {
    const count = this.isMobile ? 500 : 1000
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    const bandWidth = 40
    const bandLength = 500
    const bandTilt = 0.3

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const t = Math.random()
      const w = (Math.random() - 0.5) * bandWidth

      const x = (t - 0.5) * bandLength
      const y = w * Math.sin(bandTilt) + Math.random() * 10 - 5
      const z = w * Math.cos(bandTilt) + 200 + Math.random() * 50

      positions[i3] = x
      positions[i3 + 1] = y
      positions[i3 + 2] = z

      const brightness = 0.2 + Math.random() * 0.35
      const hue = Math.random()
      if (hue < 0.5) {
        colors[i3] = brightness * 0.6
        colors[i3 + 1] = brightness * 0.75
        colors[i3 + 2] = brightness * 1.0
      } else {
        colors[i3] = brightness * 0.75
        colors[i3 + 1] = brightness * 0.55
        colors[i3 + 2] = brightness * 0.9
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const mat = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true,
    })

    this.starfieldGroup.add(new THREE.Points(geo, mat))
  }

  // ---- 恒星（星系中心） ----

  private buildStars() {
    for (const star of this.engine.getAllStars()) {
      this.createStarMesh(star)
    }
  }

  private createStarMesh(star: StarData) {
    // 恒星主体 — 大型发光球体
    const radius = star.radius
    const geo = new THREE.SphereGeometry(radius, 32, 32)
    const color = new THREE.Color(star.color)

    const mat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 1.0,
      roughness: 0.2,
      metalness: 0.1,
    })

    const mesh = new THREE.Mesh(geo, mat)
    mesh.userData = { type: 'star', data: star }
    this.starMeshGroup.add(mesh)
    this.starMeshes.set(star.id, mesh)
    this.addToGalaxyGroup(star.galaxyId, mesh)

    // 光晕效果
    const glowMat = new THREE.SpriteMaterial({
      color: color,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
    })
    const glow = new THREE.Sprite(glowMat)
    glow.scale.set(radius * 4, radius * 4, 1)
    mesh.add(glow)
  }

  // ---- 行星（发布者） ----

  private buildPlanets() {
    for (const planet of this.engine.getAllPlanets()) {
      this.createPlanetMesh(planet)
    }
  }

  private createPlanetMesh(planet: PlanetData) {
    const radius = planet.planetSize
    const geo = new THREE.SphereGeometry(radius, 32, 32)
    const color = new THREE.Color(planet.planetColor)
    const glowIntensity = planet.planetGlow * 0.5

    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: color,
      emissiveIntensity: glowIntensity,
      roughness: 0.4,
      metalness: 0.1,
    })

    const mesh = new THREE.Mesh(geo, mat)
    mesh.userData = { type: 'planet', data: planet }
    this.planetMeshGroup.add(mesh)
    this.planetMeshes.set(planet.id, mesh)
    this.addToGalaxyGroup(planet.galaxyId, mesh)

    // 行星环
    if (planet.planetRing) {
      const ringColor = new THREE.Color(planet.planetRingColor)
      const innerR = radius * 1.4
      const outerR = radius * 2.0
      const ringGeo = new THREE.RingGeometry(innerR, outerR, 64)
      const ringMat = new THREE.MeshBasicMaterial({
        color: ringColor,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.rotation.x = Math.PI * 0.45
      mesh.add(ring)
      this.planetRings.set(planet.id, ring)
    }

    // 加载头像纹理
    this.loadAvatarTexture(planet.ownerAvatar, (texture) => {
      if (texture) {
        mat.map = texture
        mat.color = new THREE.Color(0xffffff)
        mat.emissive = color
        mat.emissiveIntensity = glowIntensity * 0.25
        mat.needsUpdate = true
      }
    })
  }

  // ---- 卫星（游戏） ----

  private buildSatellites() {
    for (const satellite of this.engine.getAllSatellites()) {
      this.createSatelliteMesh(satellite)
    }
  }

  private createSatelliteMesh(satellite: SatelliteData) {
    const radius = satellite.size * 0.8
    const geo = new THREE.SphereGeometry(radius, 24, 24)
    const color = new THREE.Color(satellite.color)

    const mat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: satellite.emissive * 0.5,
      roughness: 0.5,
      metalness: 0.2,
    })

    const mesh = new THREE.Mesh(geo, mat)
    mesh.userData = { type: 'satellite', data: satellite }
    this.satelliteMeshGroup.add(mesh)
    this.satelliteMeshes.set(satellite.id, mesh)

    // 注册到星系分组
    const planet = this.engine.findPlanetBySatellite(satellite.id)
    if (planet) {
      this.addToGalaxyGroup(planet.galaxyId, mesh)
    }

    // 卫星环
    if (satellite.hasRing) {
      const ringColor = new THREE.Color(satellite.ringColor)
      const innerR = radius * 1.3
      const outerR = radius * 1.8
      const ringGeo = new THREE.RingGeometry(innerR, outerR, 48)
      const ringMat = new THREE.MeshBasicMaterial({
        color: ringColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
      })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.rotation.x = Math.PI * 0.5
      mesh.add(ring)
    }

    // 加载封面图
    if (satellite.image) {
      this.loadPlanetImageTexture(satellite.image, (texture) => {
        if (texture) {
          mat.map = texture
          mat.color.set(0xffffff)
          mat.emissive.set(0x000000)
          mat.emissiveIntensity = 0
          mat.needsUpdate = true
        }
      })
    }
  }

  // ---- 轨道线 ----

  private buildOrbitLines() {
    // 行星绕恒星的轨道
    for (const planet of this.engine.getAllPlanets()) {
      const galaxy = this.engine.galaxies.find(g => g.id === planet.galaxyId)
      if (!galaxy) continue

      const points: THREE.Vector3[] = []
      const segments = 64
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2
        points.push(new THREE.Vector3(
          Math.cos(a) * planet.orbitRadius,
          Math.sin(planet.orbitTilt) * planet.orbitRadius * Math.sin(a) * 0.3,
          Math.sin(a) * planet.orbitRadius,
        ))
      }

      const geo = new THREE.BufferGeometry().setFromPoints(points)
      const mat = new THREE.LineBasicMaterial({
        color: new THREE.Color(planet.planetColor),
        transparent: true,
        opacity: 0.08,
      })
      const line = new THREE.Line(geo, mat)
      this.orbitLineGroup.add(line)
      this.planetOrbitLines.set(planet.id, line)
      this.addToGalaxyGroup(planet.galaxyId, line)
    }

    // 卫星绕行星的轨道
    for (const satellite of this.engine.getAllSatellites()) {
      const planet = this.engine.findPlanetBySatellite(satellite.id)
      if (!planet) continue

      const points: THREE.Vector3[] = []
      const segments = 48
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2
        points.push(new THREE.Vector3(
          Math.cos(a) * satellite.orbitRadius,
          Math.sin(satellite.orbitTilt) * Math.sin(a) * satellite.orbitRadius * 0.3,
          Math.sin(a) * satellite.orbitRadius,
        ))
      }

      const geo = new THREE.BufferGeometry().setFromPoints(points)
      const mat = new THREE.LineBasicMaterial({
        color: new THREE.Color(satellite.color),
        transparent: true,
        opacity: 0.05,
      })
      const line = new THREE.Line(geo, mat)
      this.orbitLineGroup.add(line)
      this.satelliteOrbitLines.set(satellite.id, line)
      this.addToGalaxyGroup(planet.galaxyId, line)
    }
  }

  // ---- 灯光 ----

  private addLights() {
    const ambient = new THREE.AmbientLight(0x222244, 0.8)
    this.scene.add(ambient)

    const dir = new THREE.DirectionalLight(0xffffff, 0.6)
    dir.position.set(50, 80, 30)
    this.scene.add(dir)

    const center = new THREE.PointLight(0x7C3AED, 0.5, 200)
    center.position.set(0, 5, 0)
    this.scene.add(center)
  }

  // ---- 主循环 ----

  start() {
    this.clock.start()
    const animate = () => {
      this.animId = requestAnimationFrame(animate)
      const dt = Math.min(this.clock.getDelta(), 0.05)

      this.engine.update(dt)
      this.updatePositions()
      this.updateAnimations(dt)

      this.controls.update()
      this.composer.render()
    }
    animate()
  }

  stop() {
    cancelAnimationFrame(this.animId)
  }

  private updatePositions() {
    // 更新恒星位置
    for (const star of this.engine.getAllStars()) {
      const mesh = this.starMeshes.get(star.id)
      if (mesh) {
        mesh.position.copy(this.engine.getStarWorldPos(star))
      }
    }

    // 更新行星位置
    for (const planet of this.engine.getAllPlanets()) {
      const mesh = this.planetMeshes.get(planet.id)
      if (mesh) {
        mesh.position.copy(this.engine.getPlanetWorldPos(planet))
      }

      // 更新行星轨道线位置（跟随恒星）
      const line = this.planetOrbitLines.get(planet.id)
      if (line) {
        const galaxy = this.engine.galaxies.find(g => g.id === planet.galaxyId)
        if (galaxy) {
          line.position.copy(galaxy.star.position)
        }
      }
    }

    // 更新卫星位置
    for (const satellite of this.engine.getAllSatellites()) {
      const mesh = this.satelliteMeshes.get(satellite.id)
      if (mesh) {
        mesh.position.copy(this.engine.getSatelliteWorldPos(satellite))
      }

      // 更新卫星轨道线位置（跟随行星）
      const line = this.satelliteOrbitLines.get(satellite.id)
      if (line) {
        const planet = this.engine.findPlanetBySatellite(satellite.id)
        if (planet) {
          line.position.copy(this.engine.getPlanetWorldPos(planet))
        }
      }
    }
  }

  private updateAnimations(dt: number) {
    const time = this.engine.getElapsed()

    // 恒星呼吸
    for (const [id, mesh] of this.starMeshes) {
      const pulse = 1 + Math.sin(time * 2 + id.length) * 0.08
      mesh.scale.setScalar(pulse)
    }

    // 行星自转
    for (const mesh of this.planetMeshes.values()) {
      mesh.rotation.y += dt * 0.2
    }

    // 卫星自转
    for (const mesh of this.satelliteMeshes.values()) {
      mesh.rotation.y += dt * 0.5
    }

    // 星空闪烁
    let idx = 0
    for (const child of this.starfieldGroup.children) {
      if (child instanceof THREE.Points) {
        const material = child.material as THREE.PointsMaterial
        const flickerSpeed = idx === 0 ? 0.8 : idx === 1 ? 1.2 : 1.5
        const flickerRange = idx === 0 ? 0.05 : idx === 1 ? 0.08 : 0.1
        const baseOpacity = idx === 0 ? 0.6 : idx === 1 ? 0.85 : 1.0
        material.opacity = baseOpacity + Math.sin(time * flickerSpeed) * flickerRange
        idx++
      }
    }
  }

  // ---- 交互 ----

  private onClick = (event: MouseEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)

    // 先检测卫星（游戏）
    const satHits = this.raycaster.intersectObjects(this.satelliteMeshGroup.children, false)
    for (const hit of satHits) {
      const data = hit.object.userData
      if (data?.type === 'satellite' && data.data) {
        const satellite = data.data as SatelliteData
        const now = performance.now()

        if (this.lastClickSatelliteId === satellite.id &&
            now - this.lastClickTime < this.DOUBLE_CLICK_THRESHOLD) {
          this.callbacks.onSatelliteDoubleClick(satellite)
          this.lastClickTime = 0
          this.lastClickSatelliteId = null
        } else {
          this.callbacks.onSatelliteClick(satellite)
          this.lastClickTime = now
          this.lastClickSatelliteId = satellite.id
        }
        return
      }
    }

    // 再检测行星（发布者）
    const planetHits = this.raycaster.intersectObjects(this.planetMeshGroup.children, false)
    for (const hit of planetHits) {
      const data = hit.object.userData
      if (data?.type === 'planet' && data.data) {
        this.callbacks.onPlanetClick(data.data as PlanetData)
        this.lastClickTime = 0
        this.lastClickSatelliteId = null
        return
      }
    }

    // 最后检测恒星（星系中心）
    const starHits = this.raycaster.intersectObjects(this.starMeshGroup.children, false)
    for (const hit of starHits) {
      const data = hit.object.userData
      if (data?.type === 'star' && data.data) {
        this.callbacks.onStarClick(data.data as StarData)
        this.lastClickTime = 0
        this.lastClickSatelliteId = null
        return
      }
    }

    this.callbacks.onBackgroundClick()
    this.lastClickTime = 0
    this.lastClickSatelliteId = null
  }

  private onMouseMove = (event: MouseEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)

    this.hoveredId = null

    // 检测卫星
    const satHits = this.raycaster.intersectObjects(this.satelliteMeshGroup.children, false)
    for (const hit of satHits) {
      if (hit.object.userData?.type === 'satellite') {
        this.hoveredId = hit.object.userData.data.id
        this.renderer.domElement.style.cursor = 'pointer'
        return
      }
    }

    // 检测行星
    const planetHits = this.raycaster.intersectObjects(this.planetMeshGroup.children, false)
    for (const hit of planetHits) {
      if (hit.object.userData?.type === 'planet') {
        this.renderer.domElement.style.cursor = 'pointer'
        return
      }
    }

    // 检测恒星
    const starHits = this.raycaster.intersectObjects(this.starMeshGroup.children, false)
    for (const hit of starHits) {
      if (hit.object.userData?.type === 'star') {
        this.renderer.domElement.style.cursor = 'pointer'
        return
      }
    }

    this.renderer.domElement.style.cursor = 'default'
  }

  private onResize = () => {
    const parent = this.renderer.domElement.parentElement
    if (!parent) return

    const w = parent.clientWidth
    const h = parent.clientHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
    this.composer.setSize(w, h)
  }

  // ---- 工具方法 ----

  flyTo(target: THREE.Vector3, duration = 1500) {
    const start = this.camera.position.clone()
    const offset = new THREE.Vector3(8, 6, 8)
    const end = target.clone().add(offset)

    const startTime = performance.now()
    const animate = () => {
      const t = Math.min((performance.now() - startTime) / duration, 1)
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

      this.camera.position.lerpVectors(start, end, ease)
      this.controls.target.lerp(target, ease * 0.1)

      if (t < 1) requestAnimationFrame(animate)
    }
    animate()
  }

  resetCamera() {
    const target = new THREE.Vector3(0, 80, 120)
    const start = this.camera.position.clone()
    const startTime = performance.now()

    const animate = () => {
      const t = Math.min((performance.now() - startTime) / 1000, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      this.camera.position.lerpVectors(start, target, ease)
      this.controls.target.lerp(new THREE.Vector3(0, 0, 0), ease * 0.05)
      if (t < 1) requestAnimationFrame(animate)
    }
    animate()
  }

  dispose() {
    this.stop()
    this.renderer.domElement.removeEventListener('click', this.onClick)
    this.renderer.domElement.removeEventListener('mousemove', this.onMouseMove)
    window.removeEventListener('resize', this.onResize)
    this.renderer.domElement.remove()
    this.renderer.dispose()
    this.composer.dispose()
  }

  // ---- 纹理加载 ----

  private loadAvatarTexture(avatar: string, cb: (tex: THREE.Texture | null) => void) {
    if (this.avatarCache.has(avatar)) {
      cb(this.avatarCache.get(avatar)!)
      return
    }

    if (avatar.startsWith('preset:')) {
      const idx = parseInt(avatar.split(':')[1]) || 1
      const tex = this.generatePresetAvatar(idx)
      this.avatarCache.set(avatar, tex)
      cb(tex)
      return
    }

    const url = avatar.startsWith('/') ? avatar : `/api/avatars/${avatar}`
    this.textureLoader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace
        this.avatarCache.set(avatar, tex)
        cb(tex)
      },
      undefined,
      () => cb(null),
    )
  }

  private loadPlanetImageTexture(imageUrl: string, cb: (tex: THREE.Texture | null) => void) {
    if (this.planetTextureCache.has(imageUrl)) {
      cb(this.planetTextureCache.get(imageUrl)!)
      return
    }

    const url = imageUrl.startsWith('/') ? imageUrl : `/api/planet-images/${imageUrl}`
    this.textureLoader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace
        this.planetTextureCache.set(imageUrl, tex)
        cb(tex)
      },
      undefined,
      () => cb(null),
    )
  }

  private generatePresetAvatar(idx: number): THREE.Texture {
    const PRESETS = [
      { bg: '#00f0ff', fg: '#0f0f1a' },
      { bg: '#b026ff', fg: '#ffffff' },
      { bg: '#ff2d95', fg: '#ffffff' },
      { bg: '#39ff14', fg: '#0f0f1a' },
      { bg: '#ffe600', fg: '#0f0f1a' },
      { bg: '#ff6b35', fg: '#ffffff' },
      { bg: '#0088ff', fg: '#ffffff' },
      { bg: '#ff0055', fg: '#ffffff' },
      { bg: '#00ffaa', fg: '#0f0f1a' },
      { bg: '#8b5cf6', fg: '#ffffff' },
      { bg: '#06b6d4', fg: '#ffffff' },
      { bg: '#f472b6', fg: '#ffffff' },
    ]
    const p = PRESETS[(idx - 1) % PRESETS.length]

    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')!

    ctx.fillStyle = p.bg
    ctx.fillRect(0, 0, 128, 128)

    const pixels = [
      [0,1,1,1,1,0],
      [1,0,1,1,0,1],
      [1,1,1,1,1,1],
      [1,0,1,1,0,1],
      [0,1,0,0,1,0],
      [0,0,1,1,0,0],
    ]
    const cellSize = 16
    const offset = Math.floor((128 - 6 * cellSize) / 2)

    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 6; x++) {
        if (pixels[y][x]) {
          ctx.fillStyle = p.fg
          ctx.fillRect(offset + x * cellSize, offset + y * cellSize, cellSize, cellSize)
        }
      }
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }

  // ---- 星系显隐 ----

  setGalaxyVisibility(galaxyId: string, visible: boolean) {
    const objects = this.galaxyObjects.get(galaxyId)
    if (objects) {
      for (const obj of objects) {
        obj.visible = visible
      }
    }
  }

  private addToGalaxyGroup(galaxyId: string, obj: THREE.Object3D) {
    if (!this.galaxyObjects.has(galaxyId)) {
      this.galaxyObjects.set(galaxyId, new Set())
    }
    this.galaxyObjects.get(galaxyId)!.add(obj)
  }

  rebuild(engine: UniverseEngine) {
    this.engine = engine

    this.starMeshGroup.clear()
    this.planetMeshGroup.clear()
    this.satelliteMeshGroup.clear()
    this.orbitLineGroup.clear()
    this.galaxyGroup.clear()
    this.starMeshes.clear()
    this.planetMeshes.clear()
    this.satelliteMeshes.clear()
    this.planetRings.clear()
    this.satelliteLabels.clear()
    this.planetOrbitLines.clear()
    this.satelliteOrbitLines.clear()
    this.galaxyObjects.clear()
    this.planetTextureCache.clear()
    this.avatarCache.clear()

    this.buildStars()
    this.buildPlanets()
    this.buildSatellites()
    this.buildOrbitLines()
  }
}