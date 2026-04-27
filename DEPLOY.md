# NEON ARCADE 部署指南

## 部署完成 ✅

**网站地址**: https://neon-arcade-djj.pages.dev
**API 地址**: https://neon-arcade-api.kna633336.workers.dev/api

---

## 部署架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloudflare CDN                           │
├─────────────────────────────────────────────────────────────┤
│  Pages (前端)              │  Workers (API)    │  D1 (DB)    │
│  neon-arcade-djj.pages.dev │  neon-arcade-api  │  SQLite     │
│  9个游戏 + 3D宇宙          │  认证 + 游戏 API   │  用户数据   │
└─────────────────────────────────────────────────────────────┘
```

---

## 资源清单

| 服务 | 名称 | 状态 |
|------|------|------|
| Pages | neon-arcade | ✅ 已部署 |
| Workers | neon-arcade-api | ✅ 已部署 |
| D1 Database | neon-arcade-db | ✅ 已初始化 |

---

## 更新部署

### 前端更新
```bash
cd client
npm run build
wrangler pages deploy dist --project-name neon-arcade --commit-dirty=true
```

### API 更新
```bash
cd worker
wrangler deploy
```

---

## 本地开发

```bash
# 前端
cd client && npm run dev

# 后端（Express，用于本地测试）
cd server && node index.js
```

---

## Cloudflare Dashboard 管理

- Pages: https://dash.cloudflare.com/?to=/:account/pages
- Workers: https://dash.cloudflare.com/?to=/:account/workers
- D1: https://dash.cloudflare.com/?to=/:account/d1