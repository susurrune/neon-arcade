// Password hashing with Web Crypto API (PBKDF2)

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomUUID()
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256' },
    key,
    256
  )
  const hash = Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${salt}:${hash}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, expectedHash] = stored.split(':')
  if (!salt || !expectedHash) return false

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256' },
    key,
    256
  )
  const hash = Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, '0')).join('')
  return hash === expectedHash
}
