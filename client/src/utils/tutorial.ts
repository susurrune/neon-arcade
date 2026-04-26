// ============ 教程系统 — 各游戏操作说明 ============

export interface TutorialStep {
  icon: string
  action: string
  actionEn: string
  effect: string
  effectEn: string
}

export interface TutorialData {
  gameId: string
  title: string
  titleEn: string
  desc: string
  descEn: string
  steps: TutorialStep[]
  tips?: string
  tipsEn?: string
}

// 教程内容定义
export const TUTORIALS: TutorialData[] = [
  {
    gameId: 'snake',
    title: '贪吃蛇',
    titleEn: 'SNAKE',
    desc: '经典像素贪吃蛇！加速冲刺、连击倍率、随机道具，在障碍中闪避求生。',
    descEn: 'Classic pixel snake! Dash sprint, combo multipliers, random power-ups, dodge obstacles.',
    steps: [
      { icon: '↑↓←→', action: '方向键', actionEn: 'Arrow Keys', effect: '控制蛇移动方向', effectEn: 'Control snake direction' },
      { icon: 'SPACE', action: '空格键', actionEn: 'SPACE', effect: '冲刺加速（消耗能量）', effectEn: 'Dash sprint (uses energy)' },
      { icon: '滑动', action: '手指滑动', actionEn: 'Swipe', effect: '移动端方向控制', effectEn: 'Mobile direction control' },
      { icon: '🟡', action: '黄色食物', actionEn: 'Yellow Food', effect: '基础得分 +10', effectEn: 'Basic score +10' },
      { icon: '🔴', action: '红色道具', actionEn: 'Red Power-up', effect: '3秒磁铁效果', effectEn: '3s magnet effect' },
      { icon: '🟢', action: '绿色道具', actionEn: 'Green Power-up', effect: '3秒无敌效果', effectEn: '3s invincible' },
      { icon: '🔷', action: '蓝色道具', actionEn: 'Blue Power-up', effect: '速度提升', effectEn: 'Speed boost' },
      { icon: '⬛', action: '障碍物', actionEn: 'Obstacles', effect: '每50分新增一个', effectEn: 'New one every 50pts' },
    ],
    tips: '快速进食可触发连击倍率（最高x10），连击时得分翻倍！',
    tipsEn: 'Fast eating triggers combo (max x10), double points during combo!',
  },
  {
    gameId: 'tetris',
    title: '俄罗斯方块',
    titleEn: 'TETRIS',
    desc: '连消爽感升级！Perfect Clear奖励、技能系统、幽灵预览。',
    descEn: 'Combo excitement! Perfect Clear bonus, skill system, ghost preview.',
    steps: [
      { icon: '←→', action: '左右键', actionEn: 'Left/Right', effect: '移动方块', effectEn: 'Move piece' },
      { icon: '↑', action: '上键', actionEn: 'Up', effect: '旋转方块', effectEn: 'Rotate piece' },
      { icon: '↓', action: '下键', actionEn: 'Down', effect: '加速下落', effectEn: 'Soft drop' },
      { icon: 'SPACE', action: '空格键', actionEn: 'SPACE', effect: '瞬间落底', effectEn: 'Hard drop' },
      { icon: 'C', action: 'C键', actionEn: 'C Key', effect: '激活技能', effectEn: 'Use skill' },
      { icon: '技能1', action: '清除底行', actionEn: 'Clear Row', effect: '消除最底下一行', effectEn: 'Clear bottom row' },
      { icon: '技能2', action: '冻结', actionEn: 'Freeze', effect: '暂停下落5秒', effectEn: 'Pause fall 5s' },
      { icon: '连消', action: '连续消除', actionEn: 'Combo', effect: '倍率最高x8', effectEn: 'Multiplier up to x8' },
    ],
    tips: 'Perfect Clear（清空全屏）可获得2000分奖励！合理安排方块位置。',
    tipsEn: 'Perfect Clear (empty board) gives 2000 bonus! Plan piece placement wisely.',
  },
  {
    gameId: 'platformer',
    title: '跳一跳',
    titleEn: 'JUMP JUMP',
    desc: '蓄力精准跳跃！按住蓄力、释放跳跃，落点越准分数越高。',
    descEn: 'Charge and precision jump! Hold to charge, release to jump, land accurately for higher score.',
    steps: [
      { icon: '按住', action: '按住空格', actionEn: 'Hold SPACE', effect: '开始蓄力', effectEn: 'Start charging' },
      { icon: '释放', action: '释放空格', actionEn: 'Release SPACE', effect: '执行跳跃', effectEn: 'Execute jump' },
      { icon: '蓄力', action: '蓄力时间', actionEn: 'Charge Time', effect: '决定跳跃距离', effectEn: 'Controls jump distance' },
      { icon: '完美', action: '完美落地', actionEn: 'Perfect Landing', effect: '中心区域+40分', effectEn: 'Center zone +40pts' },
      { icon: '精准', action: '精准落地', actionEn: 'Good Landing', effect: '近中心+20分', effectEn: 'Near center +20pts' },
      { icon: '连击', action: '连续完美', actionEn: 'Combo', effect: '额外连击奖励', effectEn: 'Combo bonus' },
      { icon: '蓄力条', action: '蓄力指示', actionEn: 'Charge Bar', effect: '显示蓄力百分比', effectEn: 'Shows charge %' },
      { icon: 'R', action: 'R键', actionEn: 'R Key', effect: '游戏结束后重玩', effectEn: 'Restart after game over' },
    ],
    tips: '蓄力越久跳得越远！完美落地可触发连击倍率，连续完美得分更高。',
    tipsEn: 'Longer charge = farther jump! Perfect landing triggers combo multiplier.',
  },
  {
    gameId: 'shooter',
    title: '飞机大战',
    titleEn: 'SHOOTER',
    desc: '爆款飞机大战！连击系统、武器升级、Boss战、技能爆发。',
    descEn: 'Hit shooter! Combo system, weapon upgrade, boss fights, skill burst.',
    steps: [
      { icon: '←→', action: '左右键', actionEn: 'Left/Right', effect: '移动战机', effectEn: 'Move ship' },
      { icon: '自动', action: '自动射击', actionEn: 'Auto Fire', effect: '持续发射子弹', effectEn: 'Continuous bullets' },
      { icon: 'SPACE', action: '空格键', actionEn: 'SPACE', effect: '释放技能', effectEn: 'Use skill' },
      { icon: '技能', action: '清屏炸弹', actionEn: 'Bomb', effect: '消灭所有敌人', effectEn: 'Clear all enemies' },
      { icon: '⭐', action: '武器升级', actionEn: 'Weapon Up', effect: '得分自动升级', effectEn: 'Auto upgrade by score' },
      { icon: 'Boss', action: 'Boss战', actionEn: 'Boss Fight', effect: '每5波次出现', effectEn: 'Every 5 waves' },
      { icon: '连击', action: '击杀连击', actionEn: 'Kill Combo', effect: '倍率最高x10', effectEn: 'Multiplier up to x10' },
      { icon: '成长', action: '伤害成长', actionEn: 'Damage Grow', effect: '每3000分永久提升', effectEn: 'Permanent every 3000pts' },
    ],
    tips: '连击时分数增长更快！技能在Boss战时使用效果最佳。',
    tipsEn: 'Combo increases score faster! Best to use skill during boss fights.',
  },
  {
    gameId: 'asteroids',
    title: '霓虹陨石带',
    titleEn: 'ASTEROIDS',
    desc: '360° 旋转飞船 + 惯性物理 + 陨石分裂 + 超空间瞬移。',
    descEn: '360° ship rotation + inertia physics + asteroid split + hyperspace teleport.',
    steps: [
      { icon: 'A/D', action: 'A/D键', actionEn: 'A/D Keys', effect: '旋转飞船', effectEn: 'Rotate ship' },
      { icon: 'W', action: 'W键', actionEn: 'W Key', effect: '推进加速', effectEn: 'Thrust forward' },
      { icon: 'SPACE', action: '空格键', actionEn: 'SPACE', effect: '发射子弹', effectEn: 'Fire bullet' },
      { icon: 'SHIFT', action: 'Shift键', actionEn: 'SHIFT', effect: '超空间瞬移', effectEn: 'Hyperspace teleport' },
      { icon: '瞬移', action: '3次瞬移', actionEn: '3 Teleports', effect: '随机位置逃生', effectEn: 'Random escape' },
      { icon: '分裂', action: '陨石分裂', actionEn: 'Asteroid Split', effect: '击碎后变小', effectEn: 'Breaks into smaller' },
      { icon: '惯性', action: '惯性物理', actionEn: 'Inertia', effect: '飞船持续漂移', effectEn: 'Ship keeps drifting' },
      { icon: '连击', action: '快速击碎', actionEn: 'Combo', effect: '倍率x2~x3', effectEn: 'Multiplier x2~x3' },
    ],
    tips: '利用惯性漂移躲避陨石！瞬移是紧急逃生手段，但位置随机。',
    tipsEn: 'Use inertia drift to dodge asteroids! Teleport is emergency escape, but random location.',
  },
]

// 教程存储 key
const TUTORIAL_KEY = 'neon_arcade_tutorials_seen'

// 检查是否已看过教程
export function hasSeenTutorial(gameId: string): boolean {
  const seen = localStorage.getItem(TUTORIAL_KEY)
  if (!seen) return false
  try {
    const list = JSON.parse(seen)
    return list.includes(gameId)
  } catch {
    return false
  }
}

// 标记已看过教程
export function markTutorialSeen(gameId: string): void {
  const seen = localStorage.getItem(TUTORIAL_KEY)
  let list: string[] = []
  try {
    list = seen ? JSON.parse(seen) : []
  } catch {
    list = []
  }
  if (!list.includes(gameId)) {
    list.push(gameId)
    localStorage.setItem(TUTORIAL_KEY, JSON.stringify(list))
  }
}

// 获取教程数据
export function getTutorial(gameId: string): TutorialData | null {
  return TUTORIALS.find(t => t.gameId === gameId) || null
}