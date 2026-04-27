export interface GameInfo {
  id: string
  name: string
  description: string
  icon: string
  tags: string[]
  date: string
  authorId?: string
  authorName?: string
  authorAvatar?: string
  // 作者恒星效果
  authorStarColor?: string
  authorStarGlow?: number
  authorStarRing?: boolean
  authorStarRingColor?: string
  gameUrl?: string
  isOfficial?: boolean
  likes?: number
  views?: number
  // 星球自定义外观
  planetColor?: string
  planetSize?: number
  hasRing?: boolean
  ringColor?: string
  emissive?: number
  // 星球封面图
  planetImage?: string
}

export interface ScoreEntry {
  userId: string
  nickname: string
  avatar: string
  score: number
  createdAt: string
}

export interface CommentInfo {
  id: string
  gameId: string
  userId: string
  nickname: string
  avatar: string
  content: string
  createdAt: string
}

export interface UserInfo {
  id: string
  username: string
  nickname: string
  avatar: string
  createdAt: string
  // 恒星效果自定义
  starColor?: string
  starGlow?: number
  starRing?: boolean
  starRingColor?: string
}

// 动态 API 基础 URL：生产环境使用 Worker URL，开发环境使用本地代理
const API_BASE = import.meta.env.PROD
  ? 'https://neon-arcade-api.kna633336.workers.dev/api'
  : '/api'

function getToken(): string | null {
  return localStorage.getItem('neon_arcade_token')
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

// ============ Auth API ============
export const authApi = {
  register: (username: string, password: string, nickname?: string, avatar?: string) =>
    request<{ token: string; user: UserInfo }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, nickname, avatar }),
    }),

  login: (username: string, password: string) =>
    request<{ token: string; user: UserInfo }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  me: () =>
    request<UserInfo>('/auth/me'),
}

// ============ User Profile API ============
export const userApi = {
  getProfile: () =>
    request<UserInfo>('/user/profile'),

  updateProfile: (data: {
    nickname?: string
    avatar?: string
    starColor?: string
    starGlow?: number
    starRing?: boolean
    starRingColor?: string
  }) =>
    request<UserInfo>('/user/profile/update', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  uploadAvatar: async (file: File) => {
    const token = getToken()
    const formData = new FormData()
    formData.append('avatar', file)
    const res = await fetch(`${API_BASE}/user/avatar`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error || 'Upload failed')
    }
    return res.json() as Promise<{ avatar: string }>
  },

  getPresets: () =>
    request<string[]>('/avatars/presets'),
}

// ============ Games API ============
export const gameApi = {
  list: () =>
    request<GameInfo[]>('/games'),

  getById: (id: string) =>
    request<GameInfo>(`/games/${id}`),

  upload: async (formData: FormData) => {
    const token = getToken()
    const res = await fetch(`${API_BASE}/games/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error || 'Upload failed')
    }
    return res.json() as Promise<GameInfo>
  },

  like: (id: string) =>
    request<{ likes: number }>(`/games/${id}/like`, { method: 'POST' }),

  // 获取当前用户已发布的游戏
  getMyGames: () =>
    request<GameInfo[]>('/games/my'),

  // 更新游戏信息
  update: (id: string, data: Partial<{
    title: string
    description: string
    tag: string
    planetColor: string
    planetSize: number
    hasRing: boolean
    ringColor: string
    emissive: number
  }>) =>
    request<GameInfo>(`/games/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // 删除游戏
  delete: (id: string) =>
    request<{ success: boolean }>(`/games/${id}`, { method: 'DELETE' }),
}

// ============ Comments API ============
export const commentApi = {
  list: (gameId: string) =>
    request<CommentInfo[]>(`/comments?gameId=${gameId}`),

  create: (gameId: string, content: string) =>
    request<CommentInfo>('/comments', {
      method: 'POST',
      body: JSON.stringify({ gameId, content }),
    }),
}

// ============ Scores API ============
export const scoreApi = {
  submit: (gameId: string, score: number) =>
    request<{ highScore: number; isNewRecord: boolean }>('/scores', {
      method: 'POST',
      body: JSON.stringify({ gameId, score }),
    }),

  getLeaderboard: (gameId: string) =>
    request<ScoreEntry[]>(`/scores/${gameId}/leaderboard`),

  getMyBest: (gameId: string) =>
    request<{ score: number; rank: number }>(`/scores/${gameId}/me`),
}
