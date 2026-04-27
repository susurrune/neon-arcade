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
  // sunny 的游戏
  { id: 'racing', name: '霓虹赛车', description: '极速漂移！四车道切换、障碍闪避、金币收集、难度递增——冲刺终点！', icon: 'racing', tags: ['竞速'], authorId: 'sunny123', authorName: 'sunny', authorAvatar: 'preset:3', authorStarColor: '#F59E0B', authorStarGlow: 0.7, authorStarRing: true, authorStarRingColor: '#FBBF24', date: '2026-04-27', likes: 28, views: 650, planetColor: '#F59E0B' },
  { id: 'towerdefense', name: '霓虹塔防', description: '策略防守！四种塔楼、波次挑战、路径规划——守护基地最后一防线！', icon: 'towerdefense', tags: ['策略'], authorId: 'sunny123', authorName: 'sunny', authorAvatar: 'preset:3', authorStarColor: '#10B981', authorStarGlow: 0.7, authorStarRing: true, authorStarRingColor: '#34D399', date: '2026-04-27', likes: 33, views: 780, planetColor: '#10B981' },
  { id: 'warrior', name: '霓虹勇士', description: 'RPG战斗！WASD移动、四技能释放、敌人波次、升级解锁——成为最强勇士！', icon: 'warrior', tags: ['RPG'], authorId: 'sunny123', authorName: 'sunny', authorAvatar: 'preset:3', authorStarColor: '#8B5CF6', authorStarGlow: 0.8, authorStarRing: true, authorStarRingColor: '#A78BFA', date: '2026-04-27', likes: 45, views: 920, planetColor: '#8B5CF6' },
  { id: 'farm', name: '霓虹农场', description: '模拟经营！种植作物、浇水加速、养殖动物、收获赚钱——打造你的农场！', icon: 'farm', tags: ['模拟'], authorId: 'sunny123', authorName: 'sunny', authorAvatar: 'preset:3', authorStarColor: '#EC4899', authorStarGlow: 0.7, authorStarRing: true, authorStarRingColor: '#F472B6', date: '2026-04-27', likes: 22, views: 480, planetColor: '#EC4899' },
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
