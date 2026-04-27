import { hashPassword, verifyPassword } from '../utils/hash'
import { signJWT } from '../utils/jwt'
import { json, error, getUserId } from '../utils/response'

interface Env {
  DB: D1Database
  JWT_SECRET: string
}

// 预设头像颜色
const PRESET_AVATAR_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A855F7', '#22D3EE', '#39FF14', '#FF2E88', '#F97316']

export async function handleAuth(request: Request, path: string, env: Env): Promise<Response> {
  // 注册
  if (path === '/api/auth/register' && request.method === 'POST') {
    const body = await request.json() as any
    const username = String(body.username || '').trim()
    const password = String(body.password || '').trim()
    const nickname = String(body.nickname || username).trim()
    const avatar = String(body.avatar || '').trim()

    if (!username || !password) return error('Missing fields')
    if (!/^[a-zA-Z0-9]+$/.test(username)) return error('Username: only letters and numbers')
    if (username.length < 2 || username.length > 20) return error('Username: 2-20 chars')
    if (password.length < 4) return error('Password: min 4 chars')
    if (nickname.length < 1 || nickname.length > 20) return error('Nickname: 1-20 chars')

    const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()
    if (existing) return error('Username taken')

    const id = crypto.randomUUID()
    const passwordHash = await hashPassword(password)
    const avatarValue = avatar || `preset:${Math.floor(Math.random() * 8) + 1}`
    const starColor = PRESET_AVATAR_COLORS[Math.floor(Math.random() * PRESET_AVATAR_COLORS.length)]
    const now = new Date().toISOString()

    await env.DB.prepare(`
      INSERT INTO users (id, username, password_hash, nickname, avatar, star_color, star_glow, star_ring, star_ring_color, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0.5, 0, '#A855F7', ?)
    `).bind(id, username, passwordHash, nickname, avatarValue, starColor, now).run()

    const token = await signJWT({ userId: id, username, exp: Math.floor(Date.now() / 1000) + 86400 * 7 }, env.JWT_SECRET)
    return json({
      token,
      user: {
        id,
        username,
        nickname,
        avatar: avatarValue,
        createdAt: now,
        starColor,
        starGlow: 0.5,
        starRing: false,
        starRingColor: '#A855F7'
      }
    })
  }

  // 登录
  if (path === '/api/auth/login' && request.method === 'POST') {
    const { username, password } = await request.json() as any
    if (!username || !password) return error('Missing fields')

    const row = await env.DB.prepare(`
      SELECT id, username, password_hash, nickname, avatar, created_at, star_color, star_glow, star_ring, star_ring_color
      FROM users WHERE username = ?
    `).bind(username).first() as any
    if (!row) return error('Invalid credentials')

    const valid = await verifyPassword(password, row.password_hash)
    if (!valid) return error('Invalid credentials')

    const token = await signJWT({ userId: row.id, username: row.username, exp: Math.floor(Date.now() / 1000) + 86400 * 7 }, env.JWT_SECRET)
    return json({
      token,
      user: {
        id: row.id,
        username: row.username,
        nickname: row.nickname || row.username,
        avatar: row.avatar || 'preset:1',
        createdAt: row.created_at,
        starColor: row.star_color || '#FFAA00',
        starGlow: row.star_glow || 0.5,
        starRing: Boolean(row.star_ring),
        starRingColor: row.star_ring_color || '#A855F7'
      }
    })
  }

  // 获取当前用户
  if (path === '/api/auth/me' && request.method === 'GET') {
    const userId = await getUserId(request, env)
    if (!userId) return error('Unauthorized', 401)

    const row = await env.DB.prepare(`
      SELECT id, username, nickname, avatar, created_at, star_color, star_glow, star_ring, star_ring_color
      FROM users WHERE id = ?
    `).bind(userId).first() as any
    if (!row) return error('User not found', 404)

    return json({
      id: row.id,
      username: row.username,
      nickname: row.nickname || row.username,
      avatar: row.avatar || 'preset:1',
      createdAt: row.created_at,
      starColor: row.star_color || '#FFAA00',
      starGlow: row.star_glow || 0.5,
      starRing: Boolean(row.star_ring),
      starRingColor: row.star_ring_color || '#A855F7'
    })
  }

  return error('Not found', 404)
}