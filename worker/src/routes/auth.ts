import { hashPassword, verifyPassword } from '../utils/hash'
import { signJWT } from '../utils/jwt'
import { json, error, getUserId } from '../utils/response'

interface Env {
  DB: D1Database
  JWT_SECRET: string
}

export async function handleAuth(request: Request, path: string, env: Env): Promise<Response> {
  if (path === '/api/auth/register' && request.method === 'POST') {
    const { username, password } = await request.json() as any
    if (!username || !password) return error('Missing fields')
    if (username.length < 2 || username.length > 20) return error('Username: 2-20 chars')
    if (password.length < 4) return error('Password: min 4 chars')

    const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()
    if (existing) return error('Username taken')

    const id = crypto.randomUUID()
    const passwordHash = await hashPassword(password)
    await env.DB.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)')
      .bind(id, username, passwordHash).run()

    const token = await signJWT({ userId: id, username }, env.JWT_SECRET, )
    // JWT with 7 day expiry
    const tokenWithExp = await signJWT({ userId: id, username, exp: Math.floor(Date.now() / 1000) + 86400 * 7 }, env.JWT_SECRET)
    return json({ token: tokenWithExp, user: { id, username, createdAt: new Date().toISOString() } })
  }

  if (path === '/api/auth/login' && request.method === 'POST') {
    const { username, password } = await request.json() as any
    if (!username || !password) return error('Missing fields')

    const row = await env.DB.prepare('SELECT id, username, password_hash, created_at FROM users WHERE username = ?')
      .bind(username).first() as any
    if (!row) return error('Invalid credentials')

    const valid = await verifyPassword(password, row.password_hash)
    if (!valid) return error('Invalid credentials')

    const token = await signJWT({ userId: row.id, username: row.username, exp: Math.floor(Date.now() / 1000) + 86400 * 7 }, env.JWT_SECRET)
    return json({ token, user: { id: row.id, username: row.username, createdAt: row.created_at } })
  }

  if (path === '/api/auth/me' && request.method === 'GET') {
    const userId = await getUserId(request, env)
    if (!userId) return error('Unauthorized', 401)

    const row = await env.DB.prepare('SELECT id, username, created_at FROM users WHERE id = ?')
      .bind(userId).first() as any
    if (!row) return error('User not found', 404)

    return json({ id: row.id, username: row.username, createdAt: row.created_at })
  }

  return error('Not found', 404)
}
