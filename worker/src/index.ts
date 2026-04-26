import { handleAuth } from './routes/auth'
import { handleGames } from './routes/games'
import { handleComments } from './routes/comments'

interface Env {
  DB: D1Database
  GAME_BUCKET: R2Bucket
  JWT_SECRET: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    // CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      })
    }

    try {
      let response: Response

      if (path.startsWith('/api/auth')) {
        response = await handleAuth(request, path, env)
      } else if (path.startsWith('/api/games')) {
        response = await handleGames(request, path, env)
      } else if (path.startsWith('/api/comments')) {
        response = await handleComments(request, path, env)
      } else {
        response = new Response('Not found', { status: 404 })
      }

      // Add CORS headers to all responses
      const headers = new Headers(response.headers)
      headers.set('Access-Control-Allow-Origin', '*')
      headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }
  },
}
