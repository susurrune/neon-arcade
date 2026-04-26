# NEON ARCADE 🎮

一个赛博朋克风格的在线像素小游戏平台。

![Preview](universe-preview.png)

## 功能特性

- 🌌 **3D 游戏宇宙** - 游戏以星球形式呈现，用户发布游戏成为恒星
- 🎮 **内置小游戏** - 贪吃蛇、俄罗斯方块、跳一跳、飞机大战
- 🎨 **自定义星球外观** - 颜色、大小、行星环、发光效果
- ⭐ **自定义恒星效果** - 用户可设置恒星颜色、光晕、行星环
- 🏆 **排行榜系统** - 实时高分排行
- 💬 **评论系统** - 游戏评论区
- 🌐 **双语支持** - 中文/英文切换
- 📱 **移动端适配** - 虚拟按键控制

## 快速开始

```bash
# 安装后端依赖
cd server && npm install

# 安装前端依赖
cd client && npm install

# 启动后端 (端口 4000)
cd server && node index.js

# 启动前端 (端口 5173)
cd client && npm run dev
```

## 技术栈

| 前端 | 后端 |
|------|------|
| React 18 + TypeScript | Node.js + Express |
| Vite | JWT 认证 |
| TailwindCSS | 文件上传 (multer) |
| Zustand 状态管理 | JSON 数据库 |
| Three.js 3D 渲染 | |

## 项目结构

```
game/
├── client/          # React 前端
│   ├── src/
│   │   ├── games/   # 游戏逻辑
│   │   ├── universe/# 3D 宇宙渲染
│   │   ├── pages/   # 页面组件
│   │   └── api/     # API 客户端
│   └── public/
├── server/          # Express 后端
│   ├── index.js     # 主服务
│   └── data/        # 用户数据 (gitignore)
└── worker/          # Cloudflare Worker (备用)
```

## 内置游戏

| 游戏 | 类型 | 操作 |
|------|------|------|
| 贪吃蛇 | 益智 | 方向键移动 · 空格冲刺 |
| 俄罗斯方块 | 消除 | 方向键移动 · 空格硬降 |
| 跳一跳 | 冒险 | 按住空格蓄力 · 释放跳跃 |
| 霓虹陨石带 | 尲击 | A/D旋转 · W推进 · 空格射击 |

## 部署

### 前端部署 (Vercel/Cloudflare Pages)

1. 设置构建命令: `npm run build`
2. 输出目录: `dist`
3. 环境变量: `VITE_API_URL=你的后端地址`

### 后端部署 (VPS/云服务器)

1. 安装 Node.js 18+
2. `npm install`
3. `node index.js` 或使用 PM2

## License

MIT