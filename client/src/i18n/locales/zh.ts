// 中文语言包
const zh = {
  // 通用
  app_name: '霓虹街机',
  score: '分数',
  best: '最佳',
  controls: '操作',
  about: '关于',
  loading: '加载中',
  back: '返回',
  retry: '再来一局',
  new_record: '新纪录！',
  game_over: '游戏结束',
  tap_start: '点击 / 按任意键开始',

  // 导航
  login: '登录',
  register: '注册',
  logout: '退出',
  upload_game: '发布游戏',

  // 宇宙主页
  universe_title: 'NEON ARCADE',
  warping: '跃迁中',

  // 游戏列表
  game_snake: '贪吃蛇',
  game_tetris: '俄罗斯方块',
  game_platformer: '跳一跳',
  game_shooter: '飞机大战',

  // 飞机大战
  shooter_subtitle: '连击 × 武器 × Boss',
  shooter_move: '方向键 移动',
  shooter_auto_fire: '自动射击',
  shooter_skill: '空格 技能',
  shooter_wave: '第{n}波',
  shooter_enemies: '{n}个敌人',
  shooter_boss_incoming: 'Boss来袭！',
  shooter_warning: '警告: Boss即将出现',
  shooter_wave_clear: '第{n}波 通过！+{bonus}',
  shooter_perfect: '完美！+{bonus}',
  shooter_combo: '{n}连击！',
  shooter_combo_break: '连击中断',
  shooter_kills: '{n}击杀！+{bonus}',
  shooter_weapon_up: '武器 Lv{n}',
  shooter_weapon_down: '武器降级！',
  shooter_weapon_type: '{type}！',
  shooter_boss_down: 'Boss击破！+{bonus}',
  shooter_bomb: '全屏炸弹！',
  shooter_life_up: '+1 生命',
  shooter_energy: '+能量',
  shooter_reached_wave: '到达第{n}波',
  shooter_best_combo: '最佳连击: x{n}',
  shooter_kills_count: '击杀数: {n}',
  shooter_weapon_single: '单发',
  shooter_weapon_double: '双发',
  shooter_weapon_spread: '扩散',
  shooter_weapon_laser: '激光',
  shooter_skill_label: '技能[空格]',
  shooter_kill: '击杀:{n}',
  shooter_damage_up: '伤害提升！+1',
  shooter_base_damage: '基础伤害:{n}',

  // 贪吃蛇
  snake_subtitle: '经典像素贪吃蛇！',
  snake_controls: '方向键/滑动 移动 | 空格 冲刺 | R 重开',

  // 俄罗斯方块
  tetris_subtitle: '连消爽感升级！',
  tetris_controls: '< > 移动 | ↑ 旋转 | ↓ 加速 | 空格 硬降 | C 技能 | R 重开',

  // 跳一跳
  platformer_subtitle: '蓄力精准跳跃！',
  platformer_controls: '按住空格 蓄力 | 释放跳跃 | 蓄力越久跳越远 | R 重开',

  // 游戏描述
  desc_snake: '经典像素贪吃蛇！加速冲刺、连击倍率、随机道具，在障碍中闪避求生。',
  desc_tetris: '连消爽感升级！Perfect Clear奖励、技能系统、连击倍率——你能撑多久？',
  desc_platformer: '蓄力精准跳跃！按住蓄力、释放跳跃，落点越准分数越高，连续完美触发连击倍率。',
  desc_shooter: '爆款飞机大战！连击系统、武器升级、Boss战、技能爆发——活下去！',

  // 移动端
  mobile_controls: '移动端：滑动/虚拟按键控制 | 点击游戏区域开始',

  // 语言
  lang_label: '中/EN',

  // 宇宙 v2
  universe_subtitle: '游戏宇宙 — 探索你的游戏星球',
  universe_hint: '单击查看详情 · 双击进入游戏 · 拖拽探索宇宙',
  enter_game: '进入游戏 →',
  creator: '创作者',
  published_games: '已发布 {n} 个游戏',
  view_profile: '查看资料',
  overview: '全景',
  publish: '发布',
  plays: '游玩',
  high_score: '最高分',
  rate: '评分',
  color: '颜色',
  ring: '行星环',
  glow: '发光',
  galaxy_puzzle: '益智星系',
  galaxy_shooter: '射击星系',
  galaxy_adventure: '冒险星系',
  galaxy_racing: '竞速星系',
  galaxy_strategy: '策略星系',
  galaxy_rpg: 'RPG星系',
  galaxy_simulation: '模拟星系',
  planet_customize: '星球外观',
  planet_size: '大小',
  planet_color: '颜色',
  planet_ring: '行星环',
  planet_glow: '发光强度',
  leaderboard: '排行榜',
  my_best: '我的最高',
  score_submit_success: '分数已提交！',
}

export default zh
export type LocaleKey = keyof typeof zh
