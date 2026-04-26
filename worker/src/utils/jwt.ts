// Lightweight JWT for Cloudflare Workers (Web Crypto API)

function base64url(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlStr(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function textToBuffer(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer
}

export async function signJWT(payload: Record<string, any>, secret: string): Promise<string> {
  const header = base64urlStr(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64urlStr(JSON.stringify(payload))
  const data = `${header}.${body}`

  const key = await crypto.subtle.importKey(
    'raw',
    textToBuffer(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, textToBuffer(data))
  return `${data}.${base64url(sig)}`
}

export async function verifyJWT(token: string, secret: string): Promise<Record<string, any> | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [header, body, sig] = parts
  const data = `${header}.${body}`

  const key = await crypto.subtle.importKey(
    'raw',
    textToBuffer(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )

  // Decode base64url sig
  const sigStr = sig.replace(/-/g, '+').replace(/_/g, '/')
  const sigBytes = Uint8Array.from(atob(sigStr), (c) => c.charCodeAt(0))

  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, textToBuffer(data))
  if (!valid) return null

  try {
    const payload = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/')))
    if (payload.exp && payload.exp < Date.now() / 1000) return null
    return payload
  } catch {
    return null
  }
}
