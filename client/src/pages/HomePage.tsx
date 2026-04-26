// ============ 宇宙主页 — 3D游戏宇宙 v2 ============
import { useEffect, useState } from 'react'
import Universe3D from '../universe/Universe3D'
import { useGameStore } from '../store/gameStore'
import { gameApi } from '../api'
import type { GameInfo } from '../api'

const FALLBACK_GAMES: GameInfo[] = [
  { id: 'snake', name: '贪吃蛇', description: '经典像素贪吃蛇！加速冲刺、连击倍率、随机道具，在障碍中闪避求生。', icon: 'snake', tags: ['益智'], date: '2026-04-26', isOfficial: true, likes: 42, views: 1280 },
  { id: 'tetris', name: '俄罗斯方块', description: '连消爽感升级！Perfect Clear奖励、技能系统、连击倍率——你能撑多久？', icon: 'tetris', tags: ['益智'], date: '2026-04-26', isOfficial: true, likes: 38, views: 960 },
  { id: 'platformer', name: '跳一跳', description: '赛博跑酷！二段跳、冲刺、敌人、金币、关卡目标——霓虹城市等你征服。', icon: 'platformer', tags: ['冒险'], date: '2026-04-26', isOfficial: true, likes: 35, views: 840 },
  { id: 'shooter', name: '飞机大战', description: '爆款飞机大战！连击系统、武器升级、Boss战、技能爆发——活下去！', icon: 'shooter', tags: ['射击'], date: '2026-04-26', isOfficial: true, likes: 56, views: 2100 },
  { id: 'asteroids', name: '霓虹陨石带', description: '360° 旋转飞船，惯性物理，陨石碎裂分裂，超空间瞬移——清波生存战。', icon: 'asteroids', tags: ['射击'], date: '2026-04-26', isOfficial: true, likes: 31, views: 720 },
]

export default function HomePage() {
  const { games, setGames, setLoading } = useGameStore()

  useEffect(() => {
    setLoading(true)
    gameApi.list()
      .then((g) => setGames(g.length > 0 ? g : FALLBACK_GAMES))
      .catch(() => setGames(FALLBACK_GAMES))
      .finally(() => setLoading(false))
  }, [setGames, setLoading])

  return (
    <Universe3D />
  )
}
