-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nickname TEXT DEFAULT '',
  avatar TEXT DEFAULT 'preset:1',
  star_color TEXT DEFAULT '#FFAA00',
  star_glow REAL DEFAULT 0.5,
  star_ring INTEGER DEFAULT 0,
  star_ring_color TEXT DEFAULT '#A855F7',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  author_id TEXT NOT NULL,
  author_name TEXT DEFAULT '',
  game_url TEXT DEFAULT '',
  is_official INTEGER DEFAULT 0,
  tags TEXT DEFAULT '[]',
  likes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  planet_color TEXT DEFAULT '',
  planet_size REAL DEFAULT 0.8,
  has_ring INTEGER DEFAULT 0,
  ring_color TEXT DEFAULT '#ffffff',
  emissive REAL DEFAULT 0.3,
  planet_image TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  nickname TEXT DEFAULT '',
  avatar TEXT DEFAULT 'preset:1',
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Scores table
CREATE TABLE IF NOT EXISTS scores (
  user_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  play_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, game_id)
);

-- Likes table (track which user liked which game)
CREATE TABLE IF NOT EXISTS likes (
  user_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  PRIMARY KEY (user_id, game_id)
);

-- Seed system user
INSERT OR IGNORE INTO users (id, username, password_hash, nickname, avatar, star_color, star_glow, star_ring, star_ring_color) VALUES
  ('system', 'system', '$2a$10$systemaccount', 'NEON ARCADE', 'preset:1', '#00F0FF', 0.8, 1, '#00F0FF');

-- Seed sunny user
INSERT OR IGNORE INTO users (id, username, password_hash, nickname, avatar, star_color, star_glow, star_ring, star_ring_color) VALUES
  ('sunny123', 'sunny123', '$2a$10$placeholder', 'sunny', 'preset:3', '#F59E0B', 0.7, 1, '#FBBF24');

-- Seed official games (system)
INSERT OR IGNORE INTO games (id, title, description, author_id, author_name, is_official, tags, likes, views, planet_color, planet_size, has_ring, ring_color, emissive, created_at) VALUES
  ('snake', '贪吃蛇', '经典像素贪吃蛇！加速冲刺、连击倍率、随机道具，在障碍中闪避求生。', 'system', 'NEON ARCADE', 1, '["益智"]', 42, 1280, '#4ECDC4', 0.8, 0, '#ffffff', 0.4, '2025-01-15'),
  ('tetris', '俄罗斯方块', '连消爽感升级！Perfect Clear奖励、技能系统、连击倍率——你能撑多久？', 'system', 'NEON ARCADE', 1, '["益智"]', 38, 960, '#A855F7', 0.9, 1, '#E9D5FF', 0.5, '2025-02-01'),
  ('platformer', '跳一跳', '赛博跑酷！二段跳、冲刺、敌人、金币、关卡目标——霓虹城市等你征服。', 'system', 'NEON ARCADE', 1, '["冒险"]', 35, 840, '#7C3AED', 0.7, 0, '#ffffff', 0.3, '2025-03-10'),
  ('shooter', '飞机大战', '爆款飞机大战！连击系统、武器升级、Boss战、技能爆发——活下去！', 'system', 'NEON ARCADE', 1, '["射击"]', 56, 2100, '#FF2E88', 1.2, 1, '#FF6B9D', 0.7, '2025-04-01'),
  ('asteroids', '霓虹陨石带', '360° 旋转飞船 + 惯性物理 + 陨石分裂 + 超空间瞬移。', 'system', 'NEON ARCADE', 1, '["射击"]', 31, 720, '#22D3EE', 0.6, 0, '#ffffff', 0.5, '2025-04-15');

-- Seed sunny games
INSERT OR IGNORE INTO games (id, title, description, author_id, author_name, is_official, tags, likes, views, planet_color, planet_size, has_ring, ring_color, emissive, created_at) VALUES
  ('racing', '霓虹赛车', '极速漂移！四车道切换、障碍闪避、金币收集、难度递增——冲刺终点！', 'sunny123', 'sunny', 0, '["竞速"]', 28, 650, '#F59E0B', 0.8, 1, '#FBBF24', 0.5, '2026-04-27'),
  ('towerdefense', '霓虹塔防', '策略防守！四种塔楼、波次挑战、路径规划——守护基地最后一防线！', 'sunny123', 'sunny', 0, '["策略"]', 33, 780, '#10B981', 0.8, 1, '#34D399', 0.5, '2026-04-27'),
  ('warrior', '霓虹勇士', 'RPG战斗！WASD移动、四技能释放、敌人波次、升级解锁——成为最强勇士！', 'sunny123', 'sunny', 0, '["RPG"]', 45, 920, '#8B5CF6', 0.9, 1, '#A78BFA', 0.6, '2026-04-27'),
  ('farm', '霓虹农场', '模拟经营！种植作物、浇水加速、养殖动物、收获赚钱——打造你的农场！', 'sunny123', 'sunny', 0, '["模拟"]', 22, 480, '#EC4899', 0.7, 1, '#F472B6', 0.5, '2026-04-27');