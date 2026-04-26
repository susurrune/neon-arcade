import { getUserId, json, error } from '../utils/response'

interface Env {
  DB: D1Database
  GAME_BUCKET: R2Bucket
}

export async function handleGames(request: Request, path: string, env: Env): Promise<Response> {
  // GET /api/games
  if (path === '/api/games' && request.method === 'GET') {
    const rows = await env.DB.prepare(
      `SELECT g.*, u.username as author_name FROM games g LEFT JOIN users u ON g.author_id = u.id ORDER BY g.is_official DESC, g.created_at DESC`
    ).all()

    const games = (rows.results || []).map((r: any) => ({
      id: r.id,
      name: r.title,
      description: r.description || '',
      icon: r.id,
      tags: JSON.parse(r.tags || '[]'),
      date: r.created_at?.split(' ')[0] || r.created_at,
      authorId: r.author_id,
      authorName: r.author_name || '',
      gameUrl: r.game_url || '',
      isOfficial: !!r.is_official,
      likes: r.likes || 0,
      views: r.views || 0,
    }))

    return json(games)
  }

  // GET /api/games/:id
  const getByIdMatch = path.match(/^\/api\/games\/([^/]+)$/)
  if (getByIdMatch && request.method === 'GET') {
    const id = getByIdMatch[1]
    const row = await env.DB.prepare(
      `SELECT g.*, u.username as author_name FROM games g LEFT JOIN users u ON g.author_id = u.id WHERE g.id = ?`
    ).bind(id).first() as any

    if (!row) return error('Game not found', 404)

    // Increment views
    await env.DB.prepare('UPDATE games SET views = views + 1 WHERE id = ?').bind(id).run()

    return json({
      id: row.id,
      name: row.title,
      description: row.description || '',
      icon: row.id,
      tags: JSON.parse(row.tags || '[]'),
      date: row.created_at?.split(' ')[0] || row.created_at,
      authorId: row.author_id,
      authorName: row.author_name || '',
      gameUrl: row.game_url || '',
      isOfficial: !!row.is_official,
      likes: row.likes || 0,
      views: (row.views || 0) + 1,
    })
  }

  // POST /api/games/upload
  if (path === '/api/games/upload' && request.method === 'POST') {
    const userId = await getUserId(request, { JWT_SECRET: '' } as any)
    if (!userId) return error('Unauthorized', 401)

    // Get user
    const user = await env.DB.prepare('SELECT username FROM users WHERE id = ?').bind(userId).first() as any
    if (!user) return error('User not found', 401)

    const formData = await request.formData()
    const title = formData.get('title') as string
    const description = (formData.get('description') as string) || ''
    const file = formData.get('file') as File | null

    if (!title) return error('Title required')
    if (!file) return error('File required')
    if (!file.name.endsWith('.zip')) return error('Only .zip files')
    if (file.size > 5 * 1024 * 1024) return error('Max 5MB')

    const id = crypto.randomUUID().slice(0, 8)
    const r2Key = `games/${id}/${file.name}`

    await env.GAME_BUCKET.put(r2Key, file.stream())

    const gameUrl = `/api/games/${id}/play`
    await env.DB.prepare(
      'INSERT INTO games (id, title, description, author_id, author_name, game_url, is_official, tags) VALUES (?, ?, ?, ?, ?, ?, 0, ?)'
    ).bind(id, title, description, userId, user.username, gameUrl, '["用户"]').run()

    return json({
      id, name: title, description, icon: id,
      tags: ['用户'], date: new Date().toISOString().split('T')[0],
      authorId: userId, authorName: user.username,
      gameUrl, isOfficial: false, likes: 0, views: 0,
    }, 201)
  }

  // POST /api/games/:id/like
  const likeMatch = path.match(/^\/api\/games\/([^/]+)\/like$/)
  if (likeMatch && request.method === 'POST') {
    const userId = await getUserId(request, { JWT_SECRET: '' } as any)
    if (!userId) return error('Unauthorized', 401)
    const gameId = likeMatch[1]

    const existing = await env.DB.prepare('SELECT 1 FROM likes WHERE user_id = ? AND game_id = ?')
      .bind(userId, gameId).first()
    if (existing) return error('Already liked')

    await env.DB.prepare('INSERT INTO likes (user_id, game_id) VALUES (?, ?)').bind(userId, gameId).run()
    await env.DB.prepare('UPDATE games SET likes = likes + 1 WHERE id = ?').bind(gameId).run()

    const row = await env.DB.prepare('SELECT likes FROM games WHERE id = ?').bind(gameId).first() as any
    return json({ likes: row?.likes || 0 })
  }

  return error('Not found', 404)
}
