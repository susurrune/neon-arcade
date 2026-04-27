import { getUserId, json, error } from '../utils/response'

interface Env {
  DB: D1Database
  JWT_SECRET: string
}

export async function handleUser(request: Request, path: string, env: Env): Promise<Response> {
  // GET /api/user/profile
  if (path === '/api/user/profile' && request.method === 'GET') {
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
      starColor: (row.star_color || '#FFAA00').toUpperCase(),
      starGlow: row.star_glow || 0.5,
      starRing: Boolean(row.star_ring),
      starRingColor: (row.star_ring_color || '#A855F7').toUpperCase(),
    })
  }

  // POST /api/user/avatar - 上传头像 (Base64)
  if (path === '/api/user/avatar' && request.method === 'POST') {
    const userId = await getUserId(request, env)
    if (!userId) return error('Unauthorized', 401)

    const body = await request.json() as any
    const base64 = body.base64

    if (!base64) return error('No image data')

    // 验证格式: data:image/png;base64,xxxxx
    if (!base64.startsWith('data:image/')) return error('Invalid format')

    // 限制大小 (base64 约 133KB 对应 100KB 图片)
    if (base64.length > 150000) return error('Image too large (max 100KB)')

    // 更新数据库 - 存储为 base64:格式
    await env.DB.prepare('UPDATE users SET avatar = ? WHERE id = ?').bind(base64, userId).run()

    return json({ avatar: base64 })
  }

  // PUT /api/user/profile/update
  if (path === '/api/user/profile/update' && request.method === 'PUT') {
    const userId = await getUserId(request, env)
    if (!userId) return error('Unauthorized', 401)

    const body = await request.json() as any
    const nickname = body.nickname
    const avatar = body.avatar
    const starColor = body.starColor
    const starGlow = body.starGlow
    const starRing = body.starRing
    const starRingColor = body.starRingColor

    // 验证用户存在
    const user = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first()
    if (!user) return error('User not found', 404)

    // 构建更新语句
    const updates: string[] = []
    const values: any[] = []

    if (nickname !== undefined) {
      if (nickname.length < 1 || nickname.length > 20) return error('Nickname: 1-20 chars')
      updates.push('nickname = ?')
      values.push(nickname)
    }

    if (avatar !== undefined) {
      // 支持 preset:, base64:, 或 /api/avatars/
      if (avatar.startsWith('preset:') || avatar.startsWith('data:image/') || avatar.startsWith('/api/avatars/')) {
        updates.push('avatar = ?')
        values.push(avatar)
      } else {
        return error('Invalid avatar format')
      }
    }

    if (starColor !== undefined) {
      if (!/^#[0-9A-Fa-f]{6}$/.test(starColor)) return error('Invalid star color format')
      updates.push('star_color = ?')
      values.push(starColor.toUpperCase())
    }

    if (starGlow !== undefined) {
      const glow = parseFloat(starGlow)
      if (glow < 0 || glow > 1) return error('starGlow must be 0-1')
      updates.push('star_glow = ?')
      values.push(glow)
    }

    if (starRing !== undefined) {
      updates.push('star_ring = ?')
      values.push(starRing ? 1 : 0)
    }

    if (starRingColor !== undefined) {
      if (!/^#[0-9A-Fa-f]{6}$/.test(starRingColor)) return error('Invalid ring color format')
      updates.push('star_ring_color = ?')
      values.push(starRingColor.toUpperCase())
    }

    if (updates.length === 0) return error('No fields to update')

    values.push(userId)
    await env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run()

    // 返回更新后的用户数据
    const row = await env.DB.prepare(`
      SELECT id, username, nickname, avatar, created_at, star_color, star_glow, star_ring, star_ring_color
      FROM users WHERE id = ?
    `).bind(userId).first() as any

    return json({
      id: row.id,
      username: row.username,
      nickname: row.nickname || row.username,
      avatar: row.avatar || 'preset:1',
      createdAt: row.created_at,
      starColor: (row.star_color || '#FFAA00').toUpperCase(),
      starGlow: row.star_glow || 0.5,
      starRing: Boolean(row.star_ring),
      starRingColor: (row.star_ring_color || '#A855F7').toUpperCase(),
    })
  }

  // GET /api/games/my (获取我的游戏)
  if (path === '/api/games/my' && request.method === 'GET') {
    const userId = await getUserId(request, env)
    if (!userId) return error('Unauthorized', 401)

    const rows = await env.DB.prepare(`
      SELECT g.*, u.nickname as author_nickname, u.avatar as author_avatar, u.star_color, u.star_glow, u.star_ring, u.star_ring_color
      FROM games g LEFT JOIN users u ON g.author_id = u.id
      WHERE g.author_id = ?
      ORDER BY g.created_at DESC
    `).bind(userId).all()

    const games = (rows.results || []).map((r: any) => ({
      id: r.id,
      name: r.title,
      description: r.description || '',
      icon: r.id,
      tags: JSON.parse(r.tags || '[]'),
      date: r.created_at?.split(' ')[0] || r.created_at,
      authorId: r.author_id,
      authorName: r.author_nickname || '',
      authorAvatar: r.author_avatar || 'preset:1',
      authorStarColor: r.star_color || '#FFAA00',
      authorStarGlow: r.star_glow || 0.5,
      authorStarRing: Boolean(r.star_ring),
      authorStarRingColor: r.star_ring_color || '#A855F7',
      gameUrl: r.game_url || '',
      isOfficial: false,
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

  // DELETE /api/games/:id (删除游戏)
  const deleteMatch = path.match(/^\/api\/games\/([^/]+)$/)
  if (deleteMatch && request.method === 'DELETE') {
    const userId = await getUserId(request, env)
    if (!userId) return error('Unauthorized', 401)
    const gameId = deleteMatch[1]

    const game = await env.DB.prepare('SELECT id, author_id, is_official FROM games WHERE id = ?').bind(gameId).first() as any
    if (!game) return error('Game not found', 404)
    if (game.author_id !== userId) return error('Not your game', 403)
    if (game.is_official) return error('Cannot delete official games', 403)

    await env.DB.prepare('DELETE FROM games WHERE id = ?').bind(gameId).run()
    return json({ success: true })
  }

  return error('Not found', 404)
}