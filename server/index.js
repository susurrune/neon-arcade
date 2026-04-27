const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const multer = require('multer')
const { v4: uuid } = require('uuid')
const fs = require('fs')
const path = require('path')

const app = express()
const PORT = 4000
const JWT_SECRET = 'neon-arcade-dev-secret'
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })
const avatarUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } })

app.use(cors())
app.use(express.json())

// Serve uploaded avatars
const AVATAR_DIR = path.join(__dirname, 'data', 'avatars')
if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true })
app.use('/api/avatars', express.static(AVATAR_DIR))

// Serve uploaded planet images
const PLANET_IMAGE_DIR = path.join(__dirname, 'data', 'planet-images')
if (!fs.existsSync(PLANET_IMAGE_DIR)) fs.mkdirSync(PLANET_IMAGE_DIR, { recursive: true })
app.use('/api/planet-images', express.static(PLANET_IMAGE_DIR))

const planetImageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } })

// === In-memory data store (dev fallback) ===
const DATA_FILE = path.join(__dirname, 'data', 'db.json')

// 12 preset avatars (pixel art SVG data URLs)
const PRESET_AVATARS = Array.from({ length: 12 }, (_, i) => `preset:${i + 1}`)

function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
  } catch {
    const db = {
      users: [
        // 系统官方账户
        {
          id: 'system',
          username: 'system',
          passwordHash: '$2a$10$systemaccount',
          nickname: 'NEON ARCADE',
          avatar: 'preset:1',
          createdAt: '2025-01-01',
          starColor: '#00F0FF',
          starGlow: 0.8,
          starRing: true,
          starRingColor: '#00F0FF',
        },
        // sunny 用户账户
        {
          id: 'sunny123',
          username: 'sunny123',
          passwordHash: '$2a$10$placeholder', // 实际密码需要在注册时设置
          nickname: 'sunny',
          avatar: 'preset:3',
          createdAt: '2026-04-27',
          starColor: '#F59E0B',
          starGlow: 0.7,
          starRing: true,
          starRingColor: '#FBBF24',
        },
      ],
      games: [
        { id: 'snake', title: '贪吃蛇', description: '经典像素贪吃蛇！加速冲刺、连击倍率、随机道具，在障碍中闪避求生。', authorId: 'system', authorName: 'NEON ARCADE', isOfficial: true, tags: ['益智'], likes: 42, views: 1280, date: '2025-01-15', planetColor: '#4ECDC4', planetSize: 0.8, hasRing: false, ringColor: '#ffffff', emissive: 0.4 },
        { id: 'tetris', title: '俄罗斯方块', description: '连消爽感升级！Perfect Clear奖励、技能系统、连击倍率——你能撑多久？', authorId: 'system', authorName: 'NEON ARCADE', isOfficial: true, tags: ['益智'], likes: 38, views: 960, date: '2025-02-01', planetColor: '#A855F7', planetSize: 0.9, hasRing: true, ringColor: '#E9D5FF', emissive: 0.5 },
        { id: 'platformer', title: '跳一跳', description: '赛博跑酷！二段跳、冲刺、敌人、金币、关卡目标——霓虹城市等你征服。', authorId: 'system', authorName: 'NEON ARCADE', isOfficial: true, tags: ['冒险'], likes: 35, views: 840, date: '2025-03-10', planetColor: '#7C3AED', planetSize: 0.7, hasRing: false, ringColor: '#ffffff', emissive: 0.3 },
        { id: 'shooter', title: '飞机大战', description: '爆款飞机大战！连击系统、武器升级、Boss战、技能爆发——活下去！', authorId: 'system', authorName: 'NEON ARCADE', isOfficial: true, tags: ['射击'], likes: 56, views: 2100, date: '2025-04-01', planetColor: '#FF2E88', planetSize: 1.2, hasRing: true, ringColor: '#FF6B9D', emissive: 0.7 },
        { id: 'asteroids', title: '霓虹陨石带', description: '360° 旋转飞船 + 惯性物理 + 陨石分裂 + 超空间瞬移。', authorId: 'system', authorName: 'NEON ARCADE', isOfficial: true, tags: ['射击'], likes: 31, views: 720, date: '2025-04-15', planetColor: '#22D3EE', planetSize: 0.6, hasRing: false, ringColor: '#ffffff', emissive: 0.5 },
        // sunny 的游戏
        { id: 'racing', title: '霓虹赛车', description: '极速漂移！四车道切换、障碍闪避、金币收集、难度递增——冲刺终点！', authorId: 'sunny123', authorName: 'sunny', isOfficial: false, tags: ['竞速'], likes: 28, views: 650, date: '2026-04-27', planetColor: '#F59E0B', planetSize: 0.8, hasRing: true, ringColor: '#FBBF24', emissive: 0.5 },
        { id: 'towerdefense', title: '霓虹塔防', description: '策略防守！四种塔楼、波次挑战、路径规划——守护基地最后一防线！', authorId: 'sunny123', authorName: 'sunny', isOfficial: false, tags: ['策略'], likes: 33, views: 780, date: '2026-04-27', planetColor: '#10B981', planetSize: 0.8, hasRing: true, ringColor: '#34D399', emissive: 0.5 },
        { id: 'warrior', title: '霓虹勇士', description: 'RPG战斗！WASD移动、四技能释放、敌人波次、升级解锁——成为最强勇士！', authorId: 'sunny123', authorName: 'sunny', isOfficial: false, tags: ['RPG'], likes: 45, views: 920, date: '2026-04-27', planetColor: '#8B5CF6', planetSize: 0.9, hasRing: true, ringColor: '#A78BFA', emissive: 0.6 },
        { id: 'farm', title: '霓虹农场', description: '模拟经营！种植作物、浇水加速、养殖动物、收获赚钱——打造你的农场！', authorId: 'sunny123', authorName: 'sunny', isOfficial: false, tags: ['模拟'], likes: 22, views: 480, date: '2026-04-27', planetColor: '#EC4899', planetSize: 0.7, hasRing: true, ringColor: '#F472B6', emissive: 0.5 },
      ],
      comments: [],
      scores: [],
    }
    writeDB(db)
    return db
  }
}

function writeDB(db) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2))
}

function sanitize(str) {
  return String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function isValidUsername(username) {
  return /^[a-zA-Z0-9]+$/.test(username)
}

// === Auth middleware ===
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

// Helper: format user for response
function formatUser(user) {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname || user.username,
    avatar: user.avatar || 'preset:1',
    createdAt: user.createdAt,
    // 恒星效果
    starColor: (user.starColor || '#FFAA00').toUpperCase(),
    starGlow: user.starGlow || 0.5,
    starRing: user.starRing || false,
    starRingColor: (user.starRingColor || '#A855F7').toUpperCase(),
  }
}

// === AUTH ROUTES ===

app.post('/api/auth/register', async (req, res) => {
  const { username, password, nickname, avatar } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' })

  // Username validation: only a-zA-Z0-9
  if (!isValidUsername(username)) return res.status(400).json({ error: 'Username: only letters and numbers' })
  if (username.length < 2 || username.length > 20) return res.status(400).json({ error: 'Username: 2-20 chars' })
  if (password.length < 4) return res.status(400).json({ error: 'Password: min 4 chars' })

  // Nickname validation
  const nick = nickname || username
  if (nick.length < 2 || nick.length > 20) return res.status(400).json({ error: 'Nickname: 2-20 chars' })

  const db = readDB()
  if (db.users.find(u => u.username === username)) return res.status(400).json({ error: 'Username taken' })

  const id = uuid()
  const passwordHash = await bcrypt.hash(password, 10)
  const user = {
    id, username, passwordHash,
    nickname: nick,
    avatar: avatar || 'preset:1',
    createdAt: new Date().toISOString(),
  }
  db.users.push(user)
  writeDB(db)

  const token = jwt.sign({ userId: id, username }, JWT_SECRET, { expiresIn: '7d' })
  res.json({ token, user: formatUser(user) })
})

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' })

  const db = readDB()
  const user = db.users.find(u => u.username === username)
  if (!user) return res.status(400).json({ error: 'Invalid credentials' })

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return res.status(400).json({ error: 'Invalid credentials' })

  const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' })
  res.json({ token, user: formatUser(user) })
})

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const db = readDB()
  const user = db.users.find(u => u.id === req.user.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(formatUser(user))
})

// === USER PROFILE ROUTES ===

app.get('/api/user/profile', authMiddleware, (req, res) => {
  const db = readDB()
  const user = db.users.find(u => u.id === req.user.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(formatUser(user))
})

app.put('/api/user/profile/update', authMiddleware, (req, res) => {
  console.log('=== Profile Update Request ===')
  console.log('Body:', req.body)
  const { nickname, avatar, starColor, starGlow, starRing, starRingColor } = req.body
  const db = readDB()
  const user = db.users.find(u => u.id === req.user.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })

  if (nickname !== undefined) {
    if (nickname.length < 1 || nickname.length > 20) return res.status(400).json({ error: 'Nickname: 1-20 chars' })
    user.nickname = sanitize(nickname)
  }
  if (avatar !== undefined) {
    // Validate avatar: preset:N or custom URL
    if (avatar.startsWith('preset:') || avatar.startsWith('/api/avatars/')) {
      user.avatar = avatar
    } else {
      return res.status(400).json({ error: 'Invalid avatar' })
    }
  }

  // 恒星效果更新
  if (starColor !== undefined) {
    // 验证颜色格式 (#RRGGBB)
    if (/^#[0-9A-Fa-f]{6}$/.test(starColor)) {
      user.starColor = starColor
    } else {
      return res.status(400).json({ error: 'Invalid star color format' })
    }
  }
  if (starGlow !== undefined) {
    const glow = parseFloat(starGlow)
    if (glow >= 0 && glow <= 1) {
      user.starGlow = glow
    } else {
      return res.status(400).json({ error: 'starGlow must be 0-1' })
    }
  }
  if (starRing !== undefined) {
    user.starRing = Boolean(starRing)
  }
  if (starRingColor !== undefined) {
    if (/^#[0-9A-Fa-f]{6}$/.test(starRingColor)) {
      user.starRingColor = starRingColor
    } else {
      return res.status(400).json({ error: 'Invalid ring color format' })
    }
  }

  writeDB(db)
  res.json(formatUser(user))
})

app.post('/api/user/avatar', authMiddleware, avatarUpload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File required' })
  const ext = req.file.mimetype === 'image/png' ? '.png' : '.jpg'
  if (!['.png', '.jpg'].includes(ext)) return res.status(400).json({ error: 'Only JPG/PNG' })
  if (req.file.size > 2 * 1024 * 1024) return res.status(400).json({ error: 'Max 2MB' })

  const filename = `${req.user.userId}${ext}`
  const filepath = path.join(AVATAR_DIR, filename)
  fs.writeFileSync(filepath, req.file.buffer)

  const db = readDB()
  const user = db.users.find(u => u.id === req.user.userId)
  if (user) {
    user.avatar = `/api/avatars/${filename}`
    writeDB(db)
  }

  res.json({ avatar: `/api/avatars/${filename}` })
})

// === GAMES ROUTES ===

app.get('/api/games', (req, res) => {
  const db = readDB()
  const games = db.games.map(g => {
    const user = db.users.find(u => u.id === g.authorId)
    return {
      id: g.id, name: g.title, description: g.description, icon: g.id,
      tags: g.tags, date: g.date, authorId: g.authorId, authorName: g.authorName || '',
      authorAvatar: g.authorAvatar || user?.avatar || 'preset:1',
      // 作者恒星效果
      authorStarColor: user?.starColor || '#ffaa00',
      authorStarGlow: user?.starGlow || 0.5,
      authorStarRing: user?.starRing || false,
      authorStarRingColor: user?.starRingColor || '#a855f7',
      gameUrl: g.gameUrl || '', isOfficial: g.isOfficial, likes: g.likes || 0, views: g.views || 0,
      planetColor: g.planetColor || '', planetSize: g.planetSize || 0.8,
      hasRing: g.hasRing || false, ringColor: g.ringColor || '', emissive: g.emissive || 0.3,
      planetImage: g.planetImage || '',
    }
  })
  res.json(games)
})

// 获取当前用户已发布的游戏 (必须在 /api/games/:id 之前定义)
app.get('/api/games/my', authMiddleware, (req, res) => {
  const db = readDB()
  const games = db.games
    .filter(g => g.authorId === req.user.userId)
    .map(g => ({
      id: g.id, name: g.title, description: g.description, icon: g.id,
      tags: g.tags, date: g.date, authorId: g.authorId, authorName: g.authorName,
      gameUrl: g.gameUrl || '', isOfficial: false, likes: g.likes || 0, views: g.views || 0,
      planetColor: g.planetColor || '', planetSize: g.planetSize || 0.8,
      hasRing: g.hasRing || false, ringColor: g.ringColor || '', emissive: g.emissive || 0.3,
      planetImage: g.planetImage || '',
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
  res.json(games)
})

app.get('/api/games/:id', (req, res) => {
  const db = readDB()
  const g = db.games.find(g => g.id === req.params.id)
  if (!g) return res.status(404).json({ error: 'Game not found' })
  g.views = (g.views || 0) + 1
  writeDB(db)
  const user = db.users.find(u => u.id === g.authorId)
  res.json({
    id: g.id, name: g.title, description: g.description, icon: g.id,
    tags: g.tags, date: g.date, authorId: g.authorId, authorName: g.authorName || '',
    authorAvatar: g.authorAvatar || user?.avatar || 'preset:1',
    gameUrl: g.gameUrl || '', isOfficial: g.isOfficial, likes: g.likes || 0, views: g.views,
    planetColor: g.planetColor || '', planetSize: g.planetSize || 0.8,
    hasRing: g.hasRing || false, ringColor: g.ringColor || '', emissive: g.emissive || 0.3,
    planetImage: g.planetImage || '',
  })
})

// Whitelist of galaxies a user-submitted game can join
const ALLOWED_USER_TAGS = ['用户', '经典', '消除', '平台', '射击', '益智', '冒险', '竞速', '策略', 'RPG', '模拟']

app.post('/api/games/upload', authMiddleware, upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'planetImage', maxCount: 1 },
]), (req, res) => {
  if (!req.files?.file || !req.files.file[0]) return res.status(400).json({ error: 'File required' })
  const reqFile = req.files.file[0]
  if (!reqFile.originalname.toLowerCase().endsWith('.zip')) {
    return res.status(400).json({ error: 'Only .zip files' })
  }

  // 可选的星球封面图
  let planetImageUrl = ''
  if (req.files?.planetImage && req.files.planetImage[0]) {
    const imgFile = req.files.planetImage[0]
    const imgExt = imgFile.mimetype === 'image/png' ? '.png' : (imgFile.mimetype === 'image/gif' ? '.gif' : '.jpg')
    if (!['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(imgExt)) {
      // 不阻止上传，只是忽略不支持的图片格式
    } else {
      const imgFilename = `${uuid().slice(0, 8)}${imgExt}`
      const imgPath = path.join(PLANET_IMAGE_DIR, imgFilename)
      fs.writeFileSync(imgPath, imgFile.buffer)
      planetImageUrl = `/api/planet-images/${imgFilename}`
    }
  }

  const title = String(req.body.title || '').trim()
  const description = String(req.body.description || '').trim()
  const requestedTag = String(req.body.tag || '用户').trim()
  const planetColor = String(req.body.planetColor || '').trim()
  const planetSize = parseFloat(req.body.planetSize) || 0.8
  const hasRing = req.body.hasRing === 'true' || req.body.hasRing === true
  const ringColor = String(req.body.ringColor || '').trim()
  const emissive = parseFloat(req.body.emissive) || 0.3

  if (!title) return res.status(400).json({ error: 'Title required' })
  if (title.length < 2 || title.length > 40) return res.status(400).json({ error: 'Title: 2-40 chars' })
  if (description.length > 300) return res.status(400).json({ error: 'Description: max 300 chars' })

  // Quick ZIP magic-number check (PK\x03\x04) to reject obvious non-ZIP uploads
  const buf = req.file.buffer
  if (buf.length < 4 || buf[0] !== 0x50 || buf[1] !== 0x4b || buf[2] !== 0x03 || buf[3] !== 0x04) {
    return res.status(400).json({ error: 'File is not a valid ZIP archive' })
  }

  const tag = ALLOWED_USER_TAGS.includes(requestedTag) ? requestedTag : '用户'

  const db = readDB()
  const user = db.users.find(u => u.id === req.user.userId)
  const id = uuid().slice(0, 8)

  const game = {
    id, title: sanitize(title), description: sanitize(description),
    authorId: req.user.userId,
    authorName: user?.nickname || user?.username || '',
    isOfficial: false,
    tags: [tag],
    likes: 0,
    views: 0,
    date: new Date().toISOString().split('T')[0],
    gameUrl: `/games/${id}/play`,
    planetColor: planetColor || '',
    planetSize: Math.min(Math.max(planetSize, 0.5), 2.0),
    hasRing,
    ringColor: ringColor || '#ffffff',
    emissive: Math.min(Math.max(emissive, 0), 1),
    planetImage: planetImageUrl,
  }
  db.games.push(game)
  writeDB(db)

  res.status(201).json({
    id, name: game.title, description: game.description, icon: id,
    tags: game.tags, date: game.date, authorId: game.authorId,
    authorName: game.authorName, gameUrl: game.gameUrl,
    isOfficial: false, likes: 0, views: 0,
    planetColor: game.planetColor, planetSize: game.planetSize,
    hasRing: game.hasRing, ringColor: game.ringColor, emissive: game.emissive,
    planetImage: game.planetImage,
  })
})

app.post('/api/games/:id/like', authMiddleware, (req, res) => {
  const db = readDB()
  const g = db.games.find(g => g.id === req.params.id)
  if (!g) return res.status(404).json({ error: 'Game not found' })
  g.likes = (g.likes || 0) + 1
  writeDB(db)
  res.json({ likes: g.likes })
})

// === COMMENTS ROUTES ===

app.get('/api/comments', (req, res) => {
  const { gameId } = req.query
  if (!gameId) return res.status(400).json({ error: 'gameId required' })
  const db = readDB()
  const comments = db.comments
    .filter(c => c.gameId === gameId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(c => {
      const user = db.users.find(u => u.id === c.userId)
      return {
        ...c,
        nickname: user?.nickname || c.nickname || '',
        avatar: user?.avatar || 'preset:1',
      }
    })
  res.json(comments)
})

app.post('/api/comments', authMiddleware, (req, res) => {
  const { gameId, content } = req.body
  if (!gameId || !content) return res.status(400).json({ error: 'Missing fields' })
  if (content.length > 200) return res.status(400).json({ error: 'Max 200 chars' })

  const db = readDB()
  const user = db.users.find(u => u.id === req.user.userId)
  const comment = {
    id: uuid(), gameId, userId: req.user.userId,
    nickname: user?.nickname || user?.username || '',
    avatar: user?.avatar || 'preset:1',
    content: sanitize(content),
    createdAt: new Date().toISOString(),
  }
  db.comments.push(comment)
  writeDB(db)
  res.status(201).json(comment)
})

// === SCORES ROUTES ===

app.post('/api/scores', authMiddleware, (req, res) => {
  const { gameId, score } = req.body
  if (!gameId || typeof score !== 'number') return res.status(400).json({ error: 'Missing fields' })
  if (score < 0) return res.status(400).json({ error: 'Score must be >= 0' })

  const db = readDB()
  const user = db.users.find(u => u.id === req.user.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })

  // 查找该用户在该游戏的最高分
  const existing = db.scores.find(s => s.userId === req.user.userId && s.gameId === gameId)
  let isNewRecord = false

  if (existing) {
    if (score > existing.score) {
      existing.score = score
      existing.updatedAt = new Date().toISOString()
      isNewRecord = true
    }
    existing.playCount = (existing.playCount || 0) + 1
  } else {
    db.scores.push({
      userId: req.user.userId,
      gameId,
      score,
      playCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    isNewRecord = true
  }

  writeDB(db)
  res.json({ highScore: score, isNewRecord })
})

app.get('/api/scores/:gameId/leaderboard', (req, res) => {
  const db = readDB()
  const gameId = req.params.gameId
  const top = db.scores
    .filter(s => s.gameId === gameId)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map(s => {
      const user = db.users.find(u => u.id === s.userId)
      return {
        userId: s.userId,
        nickname: user?.nickname || user?.username || '',
        avatar: user?.avatar || 'preset:1',
        score: s.score,
        createdAt: s.updatedAt || s.createdAt,
      }
    })
  res.json(top)
})

app.get('/api/scores/:gameId/me', authMiddleware, (req, res) => {
  const db = readDB()
  const gameId = req.params.gameId
  const entry = db.scores.find(s => s.userId === req.user.userId && s.gameId === gameId)
  if (!entry) return res.json({ score: 0, rank: -1 })

  // 计算排名
  const gameScores = db.scores.filter(s => s.gameId === gameId).sort((a, b) => b.score - a.score)
  const rank = gameScores.findIndex(s => s.userId === req.user.userId) + 1

  res.json({ score: entry.score, rank })
})

// === LEADERBOARD (local) ===
app.get('/api/leaderboard/:gameId', (req, res) => {
  // Return top scores from localStorage-based records
  // In production this would use D1; for dev we return empty
  res.json([])
})

// === PRESET AVATARS LIST ===
app.get('/api/avatars/presets', (req, res) => {
  res.json(PRESET_AVATARS)
})

// === MY GAMES ROUTES ===

// 更新游戏信息（支持星球封面图上传）
app.put('/api/games/:id', authMiddleware, upload.fields([
  { name: 'planetImage', maxCount: 1 },
]), (req, res) => {
  const db = readDB()
  const game = db.games.find(g => g.id === req.params.id)
  if (!game) return res.status(404).json({ error: 'Game not found' })
  if (game.authorId !== req.user.userId) return res.status(403).json({ error: 'Not your game' })
  if (game.isOfficial) return res.status(403).json({ error: 'Cannot edit official games' })

  // 解析字段（可能是 JSON body 或 form fields）
  const title = req.body.title !== undefined ? String(req.body.title) : undefined
  const description = req.body.description !== undefined ? String(req.body.description) : undefined
  const tag = req.body.tag !== undefined ? String(req.body.tag) : undefined
  const planetColor = req.body.planetColor !== undefined ? String(req.body.planetColor) : undefined
  const planetSize = req.body.planetSize !== undefined ? parseFloat(req.body.planetSize) : undefined
  const hasRing = req.body.hasRing !== undefined ? (req.body.hasRing === 'true' || req.body.hasRing === true) : undefined
  const ringColor = req.body.ringColor !== undefined ? String(req.body.ringColor) : undefined
  const emissive = req.body.emissive !== undefined ? parseFloat(req.body.emissive) : undefined

  // 更新字段
  if (title !== undefined) {
    if (title.length < 2 || title.length > 40) return res.status(400).json({ error: 'Title: 2-40 chars' })
    game.title = sanitize(title)
  }
  if (description !== undefined) {
    if (description.length > 300) return res.status(400).json({ error: 'Description: max 300 chars' })
    game.description = sanitize(description)
  }
  if (tag !== undefined && ALLOWED_USER_TAGS.includes(tag)) game.tags = [tag]
  if (planetColor !== undefined) game.planetColor = planetColor
  if (planetSize !== undefined) game.planetSize = Math.min(Math.max(planetSize, 0.5), 2.0)
  if (hasRing !== undefined) game.hasRing = hasRing
  if (ringColor !== undefined) game.ringColor = ringColor
  if (emissive !== undefined) game.emissive = Math.min(Math.max(emissive, 0), 1)

  // 处理星球封面图上传
  if (req.files?.planetImage && req.files.planetImage[0]) {
    const imgFile = req.files.planetImage[0]
    const imgExt = imgFile.mimetype === 'image/png' ? '.png' : (imgFile.mimetype === 'image/gif' ? '.gif' : (imgFile.mimetype === 'image/webp' ? '.webp' : '.jpg'))
    if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(imgExt)) {
      const imgFilename = `${uuid().slice(0, 8)}${imgExt}`
      const imgPath = path.join(PLANET_IMAGE_DIR, imgFilename)
      fs.writeFileSync(imgPath, imgFile.buffer)
      game.planetImage = `/api/planet-images/${imgFilename}`
    }
  }

  writeDB(db)
  res.json({
    id: game.id, name: game.title, description: game.description, icon: game.id,
    tags: game.tags, date: game.date, authorId: game.authorId, authorName: game.authorName,
    gameUrl: game.gameUrl || '', isOfficial: false, likes: game.likes || 0, views: game.views || 0,
    planetColor: game.planetColor, planetSize: game.planetSize,
    hasRing: game.hasRing, ringColor: game.ringColor, emissive: game.emissive,
    planetImage: game.planetImage || '',
  })
})

// 删除游戏
app.delete('/api/games/:id', authMiddleware, (req, res) => {
  const db = readDB()
  const idx = db.games.findIndex(g => g.id === req.params.id && g.authorId === req.user.userId)
  if (idx === -1) return res.status(404).json({ error: 'Game not found or not yours' })
  const game = db.games[idx]
  if (game.isOfficial) return res.status(403).json({ error: 'Cannot delete official games' })
  db.games.splice(idx, 1)
  writeDB(db)
  res.json({ success: true })
})

// === Start ===
app.listen(PORT, () => {
  console.log(`NEON ARCADE API v3 running on http://localhost:${PORT}`)
})
