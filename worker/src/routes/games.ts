import { getUserId, json, error } from '../utils/response'

interface Env {
  DB: D1Database
}

export async function handleGames(request: Request, path: string, env: Env & { JWT_SECRET: string }): Promise<Response> {
  // GET /api/games
  if (path === '/api/games' && request.method === 'GET') {
    const rows = await env.DB.prepare(`
      SELECT g.*, u.nickname as author_nickname, u.avatar as author_avatar, u.star_color, u.star_glow, u.star_ring, u.star_ring_color
      FROM games g LEFT JOIN users u ON g.author_id = u.id
      ORDER BY g.is_official DESC, g.created_at DESC
    `).all()

    const games = (rows.results || []).map((r: any) => ({
      id: r.id,
      name: r.title,
      description: r.description || '',
      icon: r.id,
      tags: JSON.parse(r.tags || '[]'),
      date: r.created_at?.split('T')[0] || r.created_at?.split(' ')[0] || '',
      authorId: r.author_id,
      authorName: r.author_nickname || r.author_name || '',
      authorAvatar: r.author_avatar || 'preset:1',
      authorStarColor: (r.star_color || '#FFAA00').toUpperCase(),
      authorStarGlow: r.star_glow || 0.5,
      authorStarRing: Boolean(r.star_ring),
      authorStarRingColor: (r.star_ring_color || '#A855F7').toUpperCase(),
      gameUrl: r.game_url || '',
      isOfficial: Boolean(r.is_official),
      likes: r.likes || 0,
      views: r.views || 0,
      planetColor: r.planet_color || '',
      planetSize: r.planet_size || 0.8,
      hasRing: Boolean(r.has_ring),
      ringColor: r.ring_color || '#ffffff',
      emissive: r.emissive || 0.3,
      planetImage: r.planet_image || '',
    }))

    return json(games)
  }

  // GET /api/games/:id
  const getByIdMatch = path.match(/^\/api\/games\/([^/]+)$/)
  if (getByIdMatch && request.method === 'GET') {
    const id = getByIdMatch[1]
    const row = await env.DB.prepare(`
      SELECT g.*, u.nickname as author_nickname, u.avatar as author_avatar, u.star_color, u.star_glow, u.star_ring, u.star_ring_color
      FROM games g LEFT JOIN users u ON g.author_id = u.id WHERE g.id = ?
    `).bind(id).first() as any

    if (!row) return error('Game not found', 404)

    // Increment views
    await env.DB.prepare('UPDATE games SET views = views + 1 WHERE id = ?').bind(id).run()

    return json({
      id: row.id,
      name: row.title,
      description: row.description || '',
      icon: row.id,
      tags: JSON.parse(row.tags || '[]'),
      date: row.created_at?.split('T')[0] || row.created_at?.split(' ')[0] || '',
      authorId: row.author_id,
      authorName: row.author_nickname || row.author_name || '',
      authorAvatar: row.author_avatar || 'preset:1',
      authorStarColor: (row.star_color || '#FFAA00').toUpperCase(),
      authorStarGlow: row.star_glow || 0.5,
      authorStarRing: Boolean(row.star_ring),
      authorStarRingColor: (row.star_ring_color || '#A855F7').toUpperCase(),
      gameUrl: row.game_url || '',
      isOfficial: Boolean(row.is_official),
      likes: row.likes || 0,
      views: (row.views || 0) + 1,
      planetColor: row.planet_color || '',
      planetSize: row.planet_size || 0.8,
      hasRing: Boolean(row.has_ring),
      ringColor: row.ring_color || '#ffffff',
      emissive: row.emissive || 0.3,
      planetImage: row.planet_image || '',
    })
  }

  // POST /api/games/:id/like
  const likeMatch = path.match(/^\/api\/games\/([^/]+)\/like$/)
  if (likeMatch && request.method === 'POST') {
    const userId = await getUserId(request, env)
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