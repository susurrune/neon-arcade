import { verifyJWT } from './jwt'

interface Env {
  JWT_SECRET: string
}

export function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function error(msg: string, status = 400): Response {
  return json({ error: msg }, status)
}

export async function getUserId(request: Request, env: Env): Promise<string | null> {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const payload = await verifyJWT(auth.slice(7), env.JWT_SECRET)
  return payload?.userId || null
}
