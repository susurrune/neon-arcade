-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
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
  created_at TEXT DEFAULT (datetime('now'))
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  nickname TEXT DEFAULT '',
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Likes table (track which user liked which game)
CREATE TABLE IF NOT EXISTS likes (
  user_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  PRIMARY KEY (user_id, game_id)
);

-- Seed official games
INSERT OR IGNORE INTO games (id, title, description, author_id, author_name, is_official, tags, created_at) VALUES
  ('snake', '贪吃蛇', '经典像素贪吃蛇，方向键控制移动，吃果子长身体，撞墙或撞自己就结束。', 'system', 'NEON ARCADE', 1, '["经典"]', '2025-01-15'),
  ('tetris', '俄罗斯方块', '永恒的方块消除！旋转、下落、消行、加速——你能撑多久？', 'system', 'NEON ARCADE', 1, '["消除"]', '2025-02-01'),
  ('platformer', '跳一跳', '赛博朋克世界的奔跑者！跳跃平台、收集金币，在霓虹城市中穿行。', 'system', 'NEON ARCADE', 1, '["平台"]', '2025-03-10'),
  ('shooter', '飞机大战', '驾驶战机迎击敌群！方向键移动、空格射击，在弹幕中生存！', 'system', 'NEON ARCADE', 1, '["射击"]', '2025-04-01');
