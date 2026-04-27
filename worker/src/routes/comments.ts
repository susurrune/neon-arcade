import { getUserId, json, error } from '../utils/response'

interface Env {
  DB: D1Database
  JWT_SECRET: string
}

function sanitize(str: string): string {
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export async function handleComments(request: Request, path: string, env: Env): Promise<Response> {
  // GET /api/comments?gameId=xxx
  if (path === '/api/comments' && request.method === 'GET') {
    const url = new URL(request.url)
    const gameId = url.searchParams.get('gameId')
    if (!gameId) return error('gameId required')

    const rows = await env.DB.prepare(
      `SELECT c.*, u.nickname, u.avatar FROM comments c JOIN users u ON c.user_id = u.id WHERE c.game_id = ? ORDER BY c.created_at DESC LIMIT 50`
    ).bind(gameId).all()

    const comments = (rows.results || []).map((r: any) => ({
      id: r.id,
      gameId: r.game_id,
      userId: r.user_id,
      nickname: r.nickname || r.user_nickname || '',
      avatar: r.avatar || 'preset:1',
      content: r.content,
      createdAt: r.created_at,
    }))

    return json(comments)
  }

  // POST /api/comments
  if (path === '/api/comments' && request.method === 'POST') {
    const userId = await getUserId(request, env)
    if (!userId) return error('Unauthorized', 401)

    const { gameId, content } = await request.json() as any
    if (!gameId || !content) return error('Missing fields')
    if (content.length > 200) return error('Max 200 chars')

    const user = await env.DB.prepare('SELECT nickname, avatar FROM users WHERE id = ?').bind(userId).first() as any
    if (!user) return error('User not found', 401)

    const id = crypto.randomUUID()
    const safeContent = sanitize(content)
    const nickname = user.nickname || ''

    await env.DB.prepare(
      'INSERT INTO comments (id, game_id, user_id, nickname, avatar, content) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, gameId, userId, nickname, user.avatar || 'preset:1', safeContent).run()

    return json({
      id, gameId, userId,
      nickname,
      avatar: user.avatar || 'preset:1',
      content: safeContent,
      createdAt: new Date().toISOString(),
    }, 201)
  }

  return error('Not found', 404)
}
