import { create } from 'zustand'
import type { GameInfo, UserInfo } from '../api'
import { getLang, setLang as saveLang, type Lang } from '../i18n'

// In-memory caches — avoids synchronous localStorage reads on every call.
// Values are loaded once on first access and written through to localStorage.
const hsCache = new Map<string, number>()
const unlockCache = new Map<string, string[]>()
let coinsCache: number | null = null

function readCoins(): number {
  if (coinsCache !== null) return coinsCache
  const v = localStorage.getItem('neon_arcade_coins')
  coinsCache = v ? parseInt(v, 10) : 0
  return coinsCache
}

function writeCoins(amount: number) {
  coinsCache = amount
  localStorage.setItem('neon_arcade_coins', String(amount))
}

function readHighScore(gameId: string): number {
  if (hsCache.has(gameId)) return hsCache.get(gameId)!
  const v = localStorage.getItem(`neon_arcade_hs_${gameId}`)
  const score = v ? parseInt(v, 10) : 0
  hsCache.set(gameId, score)
  return score
}

function writeHighScore(gameId: string, score: number) {
  hsCache.set(gameId, score)
  localStorage.setItem(`neon_arcade_hs_${gameId}`, String(score))
}

function readUnlocks(category: string): string[] {
  if (unlockCache.has(category)) return unlockCache.get(category)!
  const v = localStorage.getItem(`neon_arcade_unlock_${category}`)
  const list: string[] = v ? JSON.parse(v) : []
  unlockCache.set(category, list)
  return list
}

function writeUnlocks(category: string, list: string[]) {
  unlockCache.set(category, list)
  localStorage.setItem(`neon_arcade_unlock_${category}`, JSON.stringify(list))
}

interface GameState {
  // User
  user: UserInfo | null
  token: string | null
  setUser: (user: UserInfo | null, token?: string | null) => void
  logout: () => void

  // Games
  games: GameInfo[]
  setGames: (games: GameInfo[]) => void
  currentGame: GameInfo | null
  setCurrentGame: (game: GameInfo | null) => void

  // High scores
  loadHighScore: (gameId: string) => number
  setHighScore: (gameId: string, score: number) => void

  // Coins / meta progression
  loadCoins: () => number
  addCoins: (amount: number) => void
  spendCoins: (amount: number) => boolean

  // Unlocks
  loadUnlocks: (category: string) => string[]
  unlock: (category: string, id: string) => void
  isUnlocked: (category: string, id: string) => boolean

  // Language
  lang: Lang
  toggleLang: () => void

  // UI
  loading: boolean
  setLoading: (v: boolean) => void
  isMobile: boolean
  setIsMobile: (v: boolean) => void
}

export const useGameStore = create<GameState>((set, get) => ({
  // User
  user: null,
  token: localStorage.getItem('neon_arcade_token'),
  setUser: (user, token) => {
    if (token) localStorage.setItem('neon_arcade_token', token)
    else if (user === null) localStorage.removeItem('neon_arcade_token')
    set({ user, token: token ?? get().token })
  },
  logout: () => {
    localStorage.removeItem('neon_arcade_token')
    set({ user: null, token: null })
  },

  // Games
  games: [],
  setGames: (games) => set({ games }),
  currentGame: null,
  setCurrentGame: (currentGame) => set({ currentGame }),

  // High scores — write-through cache
  loadHighScore: (gameId) => readHighScore(gameId),
  setHighScore: (gameId, score) => {
    if (score > readHighScore(gameId)) writeHighScore(gameId, score)
  },

  // Coins — write-through cache
  loadCoins: () => readCoins(),
  addCoins: (amount) => writeCoins(readCoins() + amount),
  spendCoins: (amount) => {
    const cur = readCoins()
    if (cur >= amount) {
      writeCoins(cur - amount)
      return true
    }
    return false
  },

  // Unlocks — write-through cache
  loadUnlocks: (category) => readUnlocks(category),
  unlock: (category, id) => {
    const list = readUnlocks(category)
    if (!list.includes(id)) {
      writeUnlocks(category, [...list, id])
    }
  },
  isUnlocked: (category, id) => readUnlocks(category).includes(id),

  // Language
  lang: getLang(),
  toggleLang: () => {
    const next = get().lang === 'zh' ? 'en' : 'zh'
    saveLang(next)
    set({ lang: next })
  },

  // UI
  loading: false,
  setLoading: (loading) => set({ loading }),
  isMobile: typeof window !== 'undefined' && window.innerWidth < 768,
  setIsMobile: (isMobile) => set({ isMobile }),
}))
