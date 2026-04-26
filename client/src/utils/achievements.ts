// ============ 成就系统 — 统一成就管理器和徽章显示 ============

export interface Achievement {
  id: string
  name: string
  nameEn: string
  description: string
  descriptionEn: string
  icon: string
  category: 'score' | 'combo' | 'level' | 'survival' | 'collection'
  requirement: number
  game?: string // 如果是游戏特定成就
  unlocked: boolean
  unlockedAt?: number // 解锁时间戳
}

// 成就定义
export const ACHIEVEMENTS: Achievement[] = [
  // 通用得分成就
  { id: 'score_1000', name: '新手玩家', nameEn: 'Novice', description: '任意游戏得分达到1000', descriptionEn: 'Score 1000 in any game', icon: '🎮', category: 'score', requirement: 1000, unlocked: false },
  { id: 'score_5000', name: '熟练玩家', nameEn: 'Skilled', description: '任意游戏得分达到5000', descriptionEn: 'Score 5000 in any game', icon: '⭐', category: 'score', requirement: 5000, unlocked: false },
  { id: 'score_10000', name: '高手玩家', nameEn: 'Expert', description: '任意游戏得分达到10000', descriptionEn: 'Score 10000 in any game', icon: '🏆', category: 'score', requirement: 10000, unlocked: false },
  { id: 'score_50000', name: '大师玩家', nameEn: 'Master', description: '任意游戏得分达到50000', descriptionEn: 'Score 50000 in any game', icon: '👑', category: 'score', requirement: 50000, unlocked: false },

  // 连击成就
  { id: 'combo_5', name: '连击入门', nameEn: 'Combo Starter', description: '任意游戏达到5连击', descriptionEn: 'Reach 5x combo', icon: '🔥', category: 'combo', requirement: 5, unlocked: false },
  { id: 'combo_10', name: '连击达人', nameEn: 'Combo Master', description: '任意游戏达到10连击', descriptionEn: 'Reach 10x combo', icon: '💥', category: 'combo', requirement: 10, unlocked: false },
  { id: 'combo_20', name: '连击传说', nameEn: 'Combo Legend', description: '任意游戏达到20连击', descriptionEn: 'Reach 20x combo', icon: '🌟', category: 'combo', requirement: 20, unlocked: false },

  // 生存成就
  { id: 'shooter_wave10', name: '生存专家', nameEn: 'Survivor', description: '飞机大战存活10波', descriptionEn: 'Survive 10 waves in Shooter', icon: '✈️', category: 'survival', requirement: 10, game: 'shooter', unlocked: false },
  { id: 'shooter_wave20', name: '不死战神', nameEn: 'Immortal', description: '飞机大战存活20波', descriptionEn: 'Survive 20 waves in Shooter', icon: '🛡️', category: 'survival', requirement: 20, game: 'shooter', unlocked: false },
  { id: 'asteroids_wave5', name: '星际航行', nameEn: 'Space Traveler', description: '陨石带存活5波', descriptionEn: 'Survive 5 waves in Asteroids', icon: '🚀', category: 'survival', requirement: 5, game: 'asteroids', unlocked: false },

  // 游戏特定成就
  { id: 'snake_length20', name: '蛇王', nameEn: 'Snake King', description: '贪吃蛇长度达到20节', descriptionEn: 'Snake length 20', icon: '🐍', category: 'level', requirement: 20, game: 'snake', unlocked: false },
  { id: 'tetris_clear4', name: '四连消', nameEn: 'Tetris Master', description: '俄罗斯方块一次消除4行', descriptionEn: 'Clear 4 lines at once', icon: '🧱', category: 'level', requirement: 4, game: 'tetris', unlocked: false },
  { id: 'tetris_tspin', name: 'T-Spin', nameEn: 'T-Spin', description: '成功完成T-Spin', descriptionEn: 'Perform a T-Spin', icon: '🌀', category: 'level', requirement: 1, game: 'tetris', unlocked: false },
  { id: 'tetris_perfect', name: '完美清除', nameEn: 'Perfect Clear', description: '俄罗斯方块清空全屏', descriptionEn: 'Perfect Clear', icon: '💎', category: 'level', requirement: 1, game: 'tetris', unlocked: false },
  // 跳一跳成就 (新版蓄力跳跃游戏)
  { id: 'jump_score100', name: '跳跃新手', nameEn: 'Jump Novice', description: '跳一跳得分达到100', descriptionEn: 'Score 100 in Jump Jump', icon: '👟', category: 'score', requirement: 100, game: 'platformer', unlocked: false },
  { id: 'jump_score500', name: '跳跃达人', nameEn: 'Jump Master', description: '跳一跳得分达到500', descriptionEn: 'Score 500 in Jump Jump', icon: '🦘', category: 'score', requirement: 500, game: 'platformer', unlocked: false },
  { id: 'jump_score1000', name: '跳跃王者', nameEn: 'Jump King', description: '跳一跳得分达到1000', descriptionEn: 'Score 1000 in Jump Jump', icon: '👑', category: 'score', requirement: 1000, game: 'platformer', unlocked: false },
  { id: 'jump_combo10', name: '连续完美', nameEn: 'Perfect Streak', description: '跳一跳连续10次完美落地', descriptionEn: '10 perfect landings streak', icon: '🎯', category: 'combo', requirement: 10, game: 'platformer', unlocked: false },
  { id: 'jump_combo5', name: '精准连击', nameEn: 'Precision Combo', description: '跳一跳连续5次完美落地', descriptionEn: '5 perfect landings streak', icon: '✨', category: 'combo', requirement: 5, game: 'platformer', unlocked: false },

  // 收集成就
  { id: 'coins_100', name: '金币收藏', nameEn: 'Coin Collector', description: '累计获得100金币', descriptionEn: 'Earn 100 coins total', icon: '💰', category: 'collection', requirement: 100, unlocked: false },
  { id: 'coins_500', name: '富翁', nameEn: 'Rich', description: '累计获得500金币', descriptionEn: 'Earn 500 coins total', icon: '💎', category: 'collection', requirement: 500, unlocked: false },
]

const ACHIEVEMENT_KEY = 'neon_arcade_achievements'

// 获取已解锁成就
export function getUnlockedAchievements(): string[] {
  const data = localStorage.getItem(ACHIEVEMENT_KEY)
  if (!data) return []
  try {
    return JSON.parse(data)
  } catch {
    return []
  }
}

// 检查是否解锁某成就
export function hasAchievement(id: string): boolean {
  return getUnlockedAchievements().includes(id)
}

// 解锁成就
export function unlockAchievement(id: string): Achievement | null {
  const achievement = ACHIEVEMENTS.find(a => a.id === id)
  if (!achievement) return null

  const unlocked = getUnlockedAchievements()
  if (unlocked.includes(id)) return null // 已解锁

  unlocked.push(id)
  localStorage.setItem(ACHIEVEMENT_KEY, JSON.stringify(unlocked))
  achievement.unlocked = true
  achievement.unlockedAt = Date.now()

  return achievement
}

// 检查得分成就
export function checkScoreAchievement(score: number): Achievement | null {
  if (score >= 50000 && !hasAchievement('score_50000')) return unlockAchievement('score_50000')
  if (score >= 10000 && !hasAchievement('score_10000')) return unlockAchievement('score_10000')
  if (score >= 5000 && !hasAchievement('score_5000')) return unlockAchievement('score_5005')
  if (score >= 1000 && !hasAchievement('score_1000')) return unlockAchievement('score_1000')
  return null
}

// 检查连击成就
export function checkComboAchievement(combo: number): Achievement | null {
  if (combo >= 20 && !hasAchievement('combo_20')) return unlockAchievement('combo_20')
  if (combo >= 10 && !hasAchievement('combo_10')) return unlockAchievement('combo_10')
  if (combo >= 5 && !hasAchievement('combo_5')) return unlockAchievement('combo_5')
  return null
}

// 检查游戏特定成就
export function checkGameAchievement(gameId: string, type: string, value: number): Achievement | null {
  const relevant = ACHIEVEMENTS.filter(a => a.game === gameId && a.category === type)
  for (const a of relevant) {
    if (!hasAchievement(a.id) && value >= a.requirement) {
      return unlockAchievement(a.id)
    }
  }
  return null
}

// 获取所有成就状态
export function getAllAchievements(): Achievement[] {
  const unlocked = getUnlockedAchievements()
  return ACHIEVEMENTS.map(a => ({
    ...a,
    unlocked: unlocked.includes(a.id),
    unlockedAt: a.unlocked ? Date.now() : undefined,
  }))
}

// 获取成就进度
export function getAchievementProgress(): { total: number; unlocked: number; percentage: number } {
  const unlocked = getUnlockedAchievements()
  const total = ACHIEVEMENTS.length
  return {
    total,
    unlocked: unlocked.length,
    percentage: Math.round((unlocked.length / total) * 100),
  }
}