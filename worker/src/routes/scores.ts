import { getUserId, json, error } from '../utils/response'

interface Env {
  DB: D1Database
  JWT_SECRET: string
}

export async function handleScores(request: Request, path: string, env: Env): Promise<Response> {
  // POST /api/scores
  if (path === '/api/scores' && request.method === 'POST') {
    const userId = await getUserId(request, env)
    if (!userId) return error('Unauthorized', 401)

    const body = await request.json() as any
    const gameId = body.gameId
    const score = body.score

    if (!gameId || typeof score !== 'number') return error('Missing fields')
    if (score < 0) return error('Score must be >= 0')

    // 查找现有记录
    const existing = await env.DB.prepare('SELECT score, play_count FROM scores WHERE user_id = ? AND game_id = ?')
      .bind(userId, gameId).first() as any

    let isNewRecord = false
    const now = new Date().toISOString()

    if (existing) {
      if (score > existing.score) {
        isNewRecord = true
        await env.DB.prepare('UPDATE scores SET score = ?, play_count = play_count + 1, updated_at = ? WHERE user_id = ? AND game_id = ?')
          .bind(score, now, userId, gameId).run()
      } else {
        await env.DB.prepare('UPDATE scores SET play_count = play_count + 1 WHERE user_id = ? AND game_id = ?')
          .bind(userId, gameId).run()
      }
    } else {
      isNewRecord = true
      await env.DB.prepare('INSERT INTO scores (user_id, game_id, score, play_count, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)')
        .bind(userId, gameId, score, now, now).run()
    }

    return json({ highScore: score, isNewRecord })
  }

  // GET /api/scores/:gameId/leaderboard
  const leaderboardMatch = path.match(/^\/api\/scores\/([^/]+)\/leaderboard$/)
  if (leaderboardMatch && request.method === 'GET') {
    const gameId = leaderboardMatch[1]

    const rows = await env.DB.prepare(`
      SELECT s.score, s.updated_at, u.id as user_id, u.nickname, u.avatar
      FROM scores s JOIN users u ON s.user_id = u.id
      WHERE s.game_id = ?
      ORDER BY s.score DESC LIMIT 20
    `).bind(gameId).all()

    const leaderboard = (rows.results || []).map((r: any) => ({
      userId: r.user_id,
      nickname: r.nickname || '',
      avatar: r.avatar || 'preset:1',
      score: r.score,
      createdAt: r.updated_at,
    }))

    return json(leaderboard)
  }

  // GET /api/scores/:gameId/me
  const meMatch = path.match(/^\/api\/scores\/([^/]+)\/me$/)
  if (meMatch && request.method === 'GET') {
    const userId = await getUserId(request, env)
    if (!userId) return error('Unauthorized', 401)
    const gameId = meMatch[1]

    const row = await env.DB.prepare('SELECT score FROM scores WHERE user_id = ? AND game_id = ?')
      .bind(userId, gameId).first() as any

    if (!row) return json({ score: 0, rank: -1 })

    // 计算排名
    const countRow = await env.DB.prepare('SELECT COUNT(*) as cnt FROM scores WHERE game_id = ? AND score > ?')
      .bind(gameId, row.score).first() as any
    const rank = (countRow?.cnt || 0) + 1

    return json({ score: row.score, rank })
  }

  return error('Not found', 404)
}