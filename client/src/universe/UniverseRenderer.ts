// ============ 宇宙渲染器 v2 — Three.js 视觉层 ============
// 恒星=用户头像, 行星=自定义外观, 星系=类别视觉, 无连线/光流

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import {
  UniverseEngine, GalaxyData, StarSystemData, PlanetData,
} from './UniverseEngine'

// ==================== 类型 ====================

export interface RendererCallbacks {
  onPlanetClick: (planet: PlanetData) => void
  onPlanetDoubleClick: (planet: PlanetData) => void // 双击进入游戏
  onStarClick: (star: StarSystemData) => void
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
  private starfieldGroup = new THREE.Group()
  private orbitLineGroup = new THREE.Group()

  // 网格映射: id → mesh
  private starMeshes = new Map<string, THREE.Mesh>()
  private planetMeshes = new Map<string, THREE.Mesh>()
  private planetRings = new Map<string, THREE.Mesh>()
  private planetLabels = new Map<string, THREE.Sprite>()

  // 轨道线
  private starOrbitLines = new Map<string, THREE.Line>()
  private planetOrbitLines = new Map<string, THREE.Line>()

  // 按星系分组的对象（用于显隐控制）
  private galaxyObjects = new Map<string, Set<THREE.Object3D>>()

  // 射线
  private raycaster = new THREE.Raycaster()
  private mouse = new THREE.Vector2(-999, -999)
  private hoveredId: string | null = null

  // 双击检测
  private lastClickTime = 0
  private lastClickPlanetId: string | null = null
  private DOUBLE_CLICK_THRESHOLD = 400 // ms

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
    this.buildGalaxies()
    this.buildStars()
    this.buildPlanets()
    this.buildOrbitLines()
    this.addLights()

    this.scene.add(this.galaxyGroup)
    this.scene.add(this.starMeshGroup)
    this.scene.add(this.planetMeshGroup)
    this.scene.add(this.starfieldGroup)
    this.scene.add(this.orbitLineGroup)

    // 事件
    this.renderer.domElement.addEventListener('click', this.onClick)
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove)
    window.addEventListener('resize', this.onResize)
  }

  // ---- 后处理 ----

  private setupPostProcessing() {
    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))

    if (!this.isMobile) {
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.8,   // strength
        0.4,   // radius
        0.85,  // threshold
      )
      this.composer.addPass(this.bloomPass)
    }

    this.composer.addPass(new OutputPass())
  }

  // ---- 背景星空 ---- 增强艺术美感与神秘感

  private buildStarfield() {
    // === 第一层：远景星尘（最远、最密集、最暗） ===
    this.buildDistantStarfield()

    // === 第二层：中景星星（多彩、闪烁） ===
    this.buildMidStarfield()

    // === 第三层：近景亮星（稀疏、明亮） ===
    this.buildBrightStarfield()

    // === 第四层：星云雾气（神秘感） ===
    this.buildNebulaCloud()

    // === 第五层：银河带 ===
    this.buildMilkyWay()
  }

  // 远景星尘 — 极远、密集、微弱
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

      // 极暗的星尘，偏冷色调
      const brightness = 0.15 + Math.random() * 0.25
      const tint = Math.random()
      if (tint < 0.3) {
        // 蓝色调
        colors[i3] = brightness * 0.7
        colors[i3 + 1] = brightness * 0.85
        colors[i3 + 2] = brightness
      } else if (tint < 0.6) {
        // 紫色调
        colors[i3] = brightness * 0.85
        colors[i3 + 1] = brightness * 0.65
        colors[i3 + 2] = brightness
      } else {
        // 纯白
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

  // 中景星星 — 多彩、中等密度
  private buildMidStarfield() {
    const count = this.isMobile ? 800 : 1500
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    // 星星颜色谱（神秘冷色调）
    const starColors = [
      [0.6, 0.75, 1.0],   // 冷蓝
      [0.75, 0.55, 1.0],  // 紫蓝
      [0.9, 0.7, 0.6],    // 暖橙（少数）
      [0.55, 0.85, 0.8],  // 青蓝
      [1.0, 0.85, 0.9],   // 淡粉
      [0.7, 0.7, 0.9],    // 淡蓝白
    ]

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const r = 200 + Math.random() * 300
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i3 + 2] = r * Math.cos(phi)

      // 随机选择颜色
      const colorIdx = Math.floor(Math.random() * starColors.length)
      const brightness = 0.4 + Math.random() * 0.5
      colors[i3] = starColors[colorIdx][0] * brightness
      colors[i3 + 1] = starColors[colorIdx][1] * brightness
      colors[i3 + 2] = starColors[colorIdx][2] * brightness

      sizes[i] = 0.6 + Math.random() * 1.0
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

  // 近景亮星 — 稀疏、明亮、有闪烁潜力
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

      // 明亮的星星，带轻微色调
      const brightness = 0.8 + Math.random() * 0.2
      const tint = Math.random()
      if (tint < 0.2) {
        // 蓝白
        colors[i3] = brightness * 0.85
        colors[i3 + 1] = brightness * 0.95
        colors[i3 + 2] = brightness
      } else if (tint < 0.4) {
        // 金白
        colors[i3] = brightness
        colors[i3 + 1] = brightness * 0.9
        colors[i3 + 2] = brightness * 0.75
      } else {
        // 纯白
        colors[i3] = brightness
        colors[i3 + 1] = brightness
        colors[i3 + 2] = brightness
      }
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

  // 星云雾气 — 神秘的紫色/蓝色渐变雾气
  private buildNebulaCloud() {
    // 创建多个星云区域
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

  // 生成星云纹理
  private generateNebulaTexture(baseColor: string, size: number): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')!

    // 解析颜色
    const color = new THREE.Color(baseColor)

    // 创建径向渐变 — 从中心向外渐暗
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
    gradient.addColorStop(0, `rgba(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)}, 0.8)`)
    gradient.addColorStop(0.3, `rgba(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)}, 0.4)`)
    gradient.addColorStop(0.7, `rgba(${Math.floor(color.r * 200)}, ${Math.floor(color.g * 200)}, ${Math.floor(color.b * 220)}, 0.15)`)
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 256, 256)

    // 添加一些噪点纹理
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

  // 银河带 — 横跨天空的淡蓝色光带
  private buildMilkyWay() {
    const count = this.isMobile ? 500 : 1000
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    // 银河带分布在一条倾斜的带状区域
    const bandWidth = 40
    const bandLength = 500
    const bandTilt = 0.3 // 倾斜角度

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      // 沿银河带分布
      const t = Math.random() // 0-1 沿带长
      const w = (Math.random() - 0.5) * bandWidth // 垂离带中心

      // 带状区域坐标
      const x = (t - 0.5) * bandLength
      const y = w * Math.sin(bandTilt) + Math.random() * 10 - 5
      const z = w * Math.cos(bandTilt) + 200 + Math.random() * 50

      positions[i3] = x
      positions[i3 + 1] = y
      positions[i3 + 2] = z

      // 银河色调 — 淡蓝紫混合
      const brightness = 0.2 + Math.random() * 0.35
      const hue = Math.random()
      if (hue < 0.5) {
        // 蓝色调
        colors[i3] = brightness * 0.6
        colors[i3 + 1] = brightness * 0.75
        colors[i3 + 2] = brightness * 1.0
      } else {
        // 紫色调
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

  // ---- 星系中心 ----

  private buildGalaxies() {
    for (const galaxy of this.engine.galaxies) {
      // 中心光晕
      // 星系中心光晕 — 隐藏（避免大方形色块）
      // const spriteMat = new THREE.SpriteMaterial({
      //   color: new THREE.Color(galaxy.color),
      //   transparent: true,
      //   opacity: 0.15,
      //   blending: THREE.AdditiveBlending,
      // })
      // const sprite = new THREE.Sprite(spriteMat)
      // sprite.position.copy(galaxy.center)
      // sprite.scale.set(30, 30, 1)
      // this.galaxyGroup.add(sprite)
      // this.addToGalaxyGroup(galaxy.id, sprite)

      // 星系名称标签 — 隐藏（避免方形矩形）
      // const canvas = document.createElement('canvas')
      // canvas.width = 512
      // canvas.height = 64
      // const ctx = canvas.getContext('2d')!
      // ctx.font = '28px "Noto Sans SC", sans-serif'
      // ctx.fillStyle = galaxy.color
      // ctx.textAlign = 'center'
      // ctx.fillText(galaxy.nameZh, 256, 40)
      //
      // const texture = new THREE.CanvasTexture(canvas)
      // const labelMat = new THREE.SpriteMaterial({
      //   map: texture,
      //   transparent: true,
      //   opacity: 0.6,
      // })
      // const label = new THREE.Sprite(labelMat)
      // label.position.set(galaxy.center.x, galaxy.center.y + 18, galaxy.center.z)
      // label.scale.set(20, 2.5, 1)
      // label.userData = { type: 'galaxy-label', galaxyId: galaxy.id }
      // this.galaxyGroup.add(label)
      // this.addToGalaxyGroup(galaxy.id, label)
    }
  }

  // ---- 恒星（用户头像） ----

  private buildStars() {
    for (const star of this.engine.getAllStars()) {
      this.createStarMesh(star)
    }
  }

  private createStarMesh(star: StarSystemData) {
    // 主体 — 头像球体
    const geo = new THREE.SphereGeometry(1.5, 32, 32)
    const color = new THREE.Color(star.starColor || this.starColorFromId(star.ownerId))
    const glowIntensity = (star.starGlow ?? 0.5) * 0.6

    // 初始材质（加载头像前用纯色）
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: color,
      emissiveIntensity: glowIntensity,
      roughness: 0.4,
      metalness: 0.1,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.userData = { type: 'star', data: star }
    this.starMeshGroup.add(mesh)
    this.starMeshes.set(star.id, mesh)

    // 注册到星系分组
    this.addToGalaxyGroup(star.galaxyId, mesh)

    // 光晕 — 隐藏（Sprite 会显示方形矩形）
    // if (star.starGlow > 0.3) {
    //   const glowMat = new THREE.SpriteMaterial({
    //     color,
    //     transparent: true,
    //     opacity: star.starGlow * 0.4,
    //     blending: THREE.AdditiveBlending,
    //   })
    //   const glow = new THREE.Sprite(glowMat)
    //   glow.scale.set(5 + star.starGlow * 3, 5 + star.starGlow * 3, 1)
    //   mesh.add(glow)
    // }

    // 恒星环 — 如果用户设置了
    if (star.starRing) {
      const ringColor = new THREE.Color(star.starRingColor || '#a855f7')
      const innerR = 2.0
      const outerR = 2.5
      const ringGeo = new THREE.RingGeometry(innerR, outerR, 64)
      const ringMat = new THREE.MeshBasicMaterial({
        color: ringColor,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.rotation.x = Math.PI * 0.5
      mesh.add(ring)
    }

    // 加载头像纹理
    this.loadAvatarTexture(star.ownerAvatar, (texture) => {
      if (texture) {
        mat.map = texture
        mat.color = new THREE.Color(0xffffff) // 纹理全色
        mat.emissive = color
        mat.emissiveIntensity = glowIntensity * 0.25 // 降低发光让头像更清晰
        mat.needsUpdate = true
      }
    })
  }

  // ---- 行星 ----

  private buildPlanets() {
    for (const planet of this.engine.getAllPlanets()) {
      this.createPlanetMesh(planet)
    }
  }

  private createPlanetMesh(planet: PlanetData) {
    const radius = Math.max(0.3, planet.size * 0.6)
    const geo = new THREE.SphereGeometry(radius, 24, 24)
    const color = new THREE.Color(planet.color)

    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: planet.emissive * 0.4,
      roughness: 0.5,
      metalness: 0.2,
    })

    const mesh = new THREE.Mesh(geo, mat)
    mesh.userData = { type: 'planet', data: planet }
    this.planetMeshGroup.add(mesh)
    this.planetMeshes.set(planet.id, mesh)

    // 注册到星系分组
    const planetStar = this.engine.findStarByPlanet(planet.id)
    if (planetStar) {
      this.addToGalaxyGroup(planetStar.galaxyId, mesh)
    }

    // 如果有封面图，加载纹理贴到球体上
    if (planet.image) {
      this.loadPlanetImageTexture(planet.image, (texture) => {
        if (texture) {
          mat.map = texture
          mat.color.set(0xffffff) // 贴图全色
          mat.emissive.set(0x000000) // 关掉颜色发光，让图片更清晰
          mat.emissiveIntensity = 0
          mat.needsUpdate = true
        }
      })
    }

    // 行星环
    if (planet.hasRing) {
      const innerR = Math.max(0.01, radius * 1.3)
      const outerR = Math.max(innerR + 0.1, radius * 2.0)
      const ringGeo = new THREE.RingGeometry(innerR, outerR, 48)
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(planet.ringColor),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5,
      })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.rotation.x = Math.PI * 0.45
      mesh.add(ring)
      this.planetRings.set(planet.id, ring)
      if (planetStar) {
        this.addToGalaxyGroup(planetStar.galaxyId, ring)
      }
    }

    // 小光晕 — 隐藏（避免方形矩形）
    // const glowMat = new THREE.SpriteMaterial({
    //   color,
    //   transparent: true,
    //   opacity: 0.15 + planet.emissive * 0.15,
    //   blending: THREE.AdditiveBlending,
    // })
    // const glow = new THREE.Sprite(glowMat)
    // glow.scale.set(radius * 4, radius * 4, 1)
    // mesh.add(glow)

    // 名称标签 — 隐藏（避免方形矩形）
    // const labelCanvas = document.createElement('canvas')
    // labelCanvas.width = 256
    // labelCanvas.height = 40
    // const lctx = labelCanvas.getContext('2d')!
    // lctx.font = 'bold 18px "Noto Sans SC", sans-serif'
    // lctx.fillStyle = '#ffffff'
    // lctx.textAlign = 'center'
    // lctx.fillText(planet.name, 128, 28)
    //
    // const labelTex = new THREE.CanvasTexture(labelCanvas)
    // const labelMat = new THREE.SpriteMaterial({
    //   map: labelTex,
    //   transparent: true,
    //   opacity: 0,
    // })
    // const label = new THREE.Sprite(labelMat)
    // label.scale.set(6, 1, 1)
    // label.position.y = radius + 1
    // mesh.add(label)
    // this.planetLabels.set(planet.id, label)
  }

  // ---- 轨道线 ----

  private buildOrbitLines() {
    // 恒星绕星系中心的轨道
    for (const star of this.engine.getAllStars()) {
      const galaxy = this.engine.galaxies.find(g => g.id === star.galaxyId)
      if (!galaxy) continue

      const points: THREE.Vector3[] = []
      const segments = 64
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2
        points.push(new THREE.Vector3(
          galaxy.center.x + Math.cos(a) * star.orbitRadius,
          Math.sin(star.orbitTilt) * star.orbitRadius * Math.sin(a) * 0.3,
          galaxy.center.z + Math.sin(a) * star.orbitRadius,
        ))
      }

      const geo = new THREE.BufferGeometry().setFromPoints(points)
      const mat = new THREE.LineBasicMaterial({
        color: new THREE.Color(galaxy.color),
        transparent: true,
        opacity: 0.08,
      })
      const line = new THREE.Line(geo, mat)
      this.orbitLineGroup.add(line)
      this.starOrbitLines.set(star.id, line)
      this.addToGalaxyGroup(galaxy.id, line)
    }

    // 行星绕恒星的轨道
    for (const planet of this.engine.getAllPlanets()) {
      const star = this.engine.findStarByPlanet(planet.id)
      if (!star) continue

      const points: THREE.Vector3[] = []
      const segments = 48
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2
        points.push(new THREE.Vector3(
          Math.cos(a) * planet.orbitRadius,
          Math.sin(planet.orbitTilt) * Math.sin(a) * planet.orbitRadius * 0.3,
          Math.sin(a) * planet.orbitRadius,
        ))
      }

      const geo = new THREE.BufferGeometry().setFromPoints(points)
      const mat = new THREE.LineBasicMaterial({
        color: new THREE.Color(planet.color),
        transparent: true,
        opacity: 0.06,
      })
      const line = new THREE.Line(geo, mat)
      this.orbitLineGroup.add(line)
      this.planetOrbitLines.set(planet.id, line)
      if (star) {
        this.addToGalaxyGroup(star.galaxyId, line)
      }
    }
  }

  // ---- 灯光 ----

  private addLights() {
    const ambient = new THREE.AmbientLight(0x222244, 0.8)
    this.scene.add(ambient)

    const dir = new THREE.DirectionalLight(0xffffff, 0.6)
    dir.position.set(50, 80, 30)
    this.scene.add(dir)

    // 宇宙中心微弱光
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
    }

    // 更新行星轨道线位置（跟随恒星）
    for (const planet of this.engine.getAllPlanets()) {
      const line = this.planetOrbitLines.get(planet.id)
      const star = this.engine.findStarByPlanet(planet.id)
      if (line && star) {
        line.position.copy(this.engine.getStarWorldPos(star))
      }
    }
  }

  private updateAnimations(dt: number) {
    const time = this.engine.getElapsed()

    // 恒星呼吸
    for (const [id, mesh] of this.starMeshes) {
      const pulse = 1 + Math.sin(time * 1.5 + id.length) * 0.05
      mesh.scale.setScalar(pulse)
    }

    // 行星微自转 + 悬停标签
    for (const [id, mesh] of this.planetMeshes) {
      mesh.rotation.y += dt * 0.3

      const label = this.planetLabels.get(id)
      if (label) {
        const targetOpacity = this.hoveredId === id ? 0.9 : 0
        const mat = label.material as THREE.SpriteMaterial
        mat.opacity += (targetOpacity - mat.opacity) * 0.1
      }
    }

    // 星空闪烁效果 — 让星空更有生命力
    this.updateStarfieldTwinkle(time)
  }

  // 星空闪烁 — 模拟星星的微弱闪烁
  private updateStarfieldTwinkle(time: number) {
    // 遍历星空组中的所有粒子系统
    let idx = 0
    for (const child of this.starfieldGroup.children) {
      if (child instanceof THREE.Points) {
        const material = child.material as THREE.PointsMaterial
        // 不同层有不同的闪烁频率
        const flickerSpeed = idx === 0 ? 0.8 : idx === 1 ? 1.2 : 1.5
        const flickerRange = idx === 0 ? 0.05 : idx === 1 ? 0.08 : 0.1
        const baseOpacity = idx === 0 ? 0.6 : idx === 1 ? 0.85 : 1.0

        // 添加整体的微弱波动
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

    // 先检测行星
    const planetHits = this.raycaster.intersectObjects(this.planetMeshGroup.children, false)
    for (const hit of planetHits) {
      const data = hit.object.userData
      if (data?.type === 'planet' && data.data) {
        const planet = data.data as PlanetData
        const now = performance.now()

        // 双击检测
        if (this.lastClickPlanetId === planet.id &&
            now - this.lastClickTime < this.DOUBLE_CLICK_THRESHOLD) {
          // 双击，进入游戏
          this.callbacks.onPlanetDoubleClick(planet)
          this.lastClickTime = 0
          this.lastClickPlanetId = null
        } else {
          // 单击，显示信息
          this.callbacks.onPlanetClick(planet)
          this.lastClickTime = now
          this.lastClickPlanetId = planet.id
        }
        return
      }
    }

    // 再检测恒星
    const starHits = this.raycaster.intersectObjects(this.starMeshGroup.children, false)
    for (const hit of starHits) {
      const data = hit.object.userData
      if (data?.type === 'star' && data.data) {
        this.callbacks.onStarClick(data.data as StarSystemData)
        // 点击恒星时重置双击状态
        this.lastClickTime = 0
        this.lastClickPlanetId = null
        return
      }
    }

    // 点击空白
    this.callbacks.onBackgroundClick()
    this.lastClickTime = 0
    this.lastClickPlanetId = null
  }

  private onMouseMove = (event: MouseEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const hits = this.raycaster.intersectObjects(this.planetMeshGroup.children, false)

    this.hoveredId = null
    for (const hit of hits) {
      if (hit.object.userData?.type === 'planet') {
        this.hoveredId = hit.object.userData.data.id
        this.renderer.domElement.style.cursor = 'pointer'
        return
      }
    }

    // 检测恒星悬停
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

  /** 飞向某个位置 */
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

  /** 重置视角 */
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

  /** 释放资源 */
  dispose() {
    this.stop()
    this.renderer.domElement.removeEventListener('click', this.onClick)
    this.renderer.domElement.removeEventListener('mousemove', this.onMouseMove)
    window.removeEventListener('resize', this.onResize)
    // 移除 canvas DOM 元素，防止 StrictMode 重复渲染后残留
    this.renderer.domElement.remove()
    this.renderer.dispose()
    this.composer.dispose()
  }

  // ---- 头像加载 ----

  private loadAvatarTexture(avatar: string, cb: (tex: THREE.Texture | null) => void) {
    if (this.avatarCache.has(avatar)) {
      cb(this.avatarCache.get(avatar)!)
      return
    }

    // preset:N → 生成几何图案纹理
    if (avatar.startsWith('preset:')) {
      const idx = parseInt(avatar.split(':')[1]) || 1
      const tex = this.generatePresetAvatar(idx)
      this.avatarCache.set(avatar, tex)
      cb(tex)
      return
    }

    // 自定义头像 URL
    const url = avatar.startsWith('/') ? avatar : `/api/avatars/${avatar}`
    this.textureLoader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace
        this.avatarCache.set(avatar, tex)
        cb(tex)
      },
      undefined,
      () => cb(null), // 加载失败
    )
  }

  /** 加载星球封面图纹理 */
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
        // 确保贴图在球体上正确包裹
        if (tex.image) {
          // 保持原始比例，不做额外处理 — SphereGeometry 的 UV 映射已足够
        }
        this.planetTextureCache.set(imageUrl, tex)
        cb(tex)
      },
      undefined,
      () => cb(null),
    )
  }

  private generatePresetAvatar(idx: number): THREE.Texture {
    // 和 Avatar 组件一样的 12 色调色板
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

    // 背景
    ctx.fillStyle = p.bg
    ctx.fillRect(0, 0, 128, 128)

    // 像素人脸图案 — 和 Avatar.tsx 一致
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

  private starColorFromId(id: string): string {
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#A855F7', '#39FF14', '#FF2E88', '#22D3EE', '#F97316']
    let hash = 0
    for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0
    return colors[Math.abs(hash) % colors.length]
  }

  // ---- 重建 ----

  /** 设置某个星系的可见性 */
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

    // 清除旧的
    this.starMeshGroup.clear()
    this.planetMeshGroup.clear()
    this.orbitLineGroup.clear()
    this.galaxyGroup.clear()
    this.starMeshes.clear()
    this.planetMeshes.clear()
    this.planetRings.clear()
    this.planetLabels.clear()
    this.starOrbitLines.clear()
    this.planetOrbitLines.clear()
    this.galaxyObjects.clear()
    // 清除纹理缓存，强制重新加载图片
    this.planetTextureCache.clear()
    this.avatarCache.clear()

    // 重建
    this.buildStars()
    this.buildPlanets()
    this.buildOrbitLines()
  }
}
