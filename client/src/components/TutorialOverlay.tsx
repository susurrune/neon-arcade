// ============ 教程覆盖层组件 — 首次进入游戏显示操作说明 ============
import { useState, useEffect } from 'react'
import { getTutorial, markTutorialSeen, TutorialData } from '../utils/tutorial'
import PixelIcon from './PixelIcon'

interface TutorialOverlayProps {
  gameId: string
  lang: 'zh' | 'en'
  onClose: () => void
}

export default function TutorialOverlay({ gameId, lang, onClose }: TutorialOverlayProps) {
  const [tutorial, setTutorial] = useState<TutorialData | null>(null)
  const [step, setStep] = useState(0)
  const isZh = lang === 'zh'

  useEffect(() => {
    const data = getTutorial(gameId)
    setTutorial(data)
  }, [gameId])

  if (!tutorial) return null

  const totalSteps = tutorial.steps.length
  const currentStepData = tutorial.steps[step]
  const isLastStep = step >= totalSteps - 1

  const handleNext = () => {
    if (isLastStep) {
      markTutorialSeen(gameId)
      onClose()
    } else {
      setStep(step + 1)
    }
  }

  const handleSkip = () => {
    markTutorialSeen(gameId)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md mx-4 p-5 md:p-6 bg-cyber-card border border-cyber-border relative">
        {/* 角装饰 */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-neon-blue/40 pointer-events-none" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-neon-blue/40 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-neon-blue/40 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-neon-blue/40 pointer-events-none" />

        {/* 标题 */}
        <div className="text-center mb-5">
          <div className="flex items-center justify-center gap-2 mb-2">
            <PixelIcon type="info" size={18} color="#00d4ff" />
            <h2 className="font-pixel text-lg md:text-xl neon-text-blue">
              {isZh ? '游戏教程' : 'TUTORIAL'}
            </h2>
          </div>
          <p className="font-pixel text-sm neon-text-green">{isZh ? tutorial.title : tutorial.titleEn}</p>
        </div>

        {/* 描述 */}
        <p className="text-body text-gray-400 text-center mb-5 px-2">
          {isZh ? tutorial.desc : tutorial.descEn}
        </p>

        {/* 当前步骤 */}
        <div className="bg-cyber-surface/50 p-4 mb-5 border border-white/10">
          <div className="flex items-center gap-4">
            {/* 图标 */}
            <div className="w-14 h-14 flex items-center justify-center bg-neon-blue/10 border border-neon-blue/30 font-pixel text-lg text-neon-blue">
              {currentStepData.icon}
            </div>
            {/* 内容 */}
            <div className="flex-1 min-w-0">
              <p className="font-pixel text-sm text-white mb-1.5">
                {isZh ? currentStepData.action : currentStepData.actionEn}
              </p>
              <p className="font-mono text-sm text-gray-400">
                {isZh ? currentStepData.effect : currentStepData.effectEn}
              </p>
            </div>
          </div>
        </div>

        {/* 进度指示 */}
        <div className="flex items-center justify-center gap-1.5 mb-5">
          {tutorial.steps.map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                i === step ? 'bg-neon-blue scale-110' : i < step ? 'bg-neon-blue/50' : 'bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* 提示（最后一步显示） */}
        {isLastStep && tutorial.tips && (
          <div className="bg-neon-yellow/10 border border-neon-yellow/30 p-3 mb-5">
            <p className="font-mono text-sm text-neon-yellow flex items-center gap-2">
              <span>💡</span>
              {isZh ? tutorial.tips : tutorial.tipsEn}
            </p>
          </div>
        )}

        {/* 按钮 */}
        <div className="flex gap-3">
          <button
            onClick={handleSkip}
            className="flex-1 font-pixel text-xs px-4 py-3 border border-gray-500 text-gray-400 hover:border-gray-400 hover:text-gray-300 transition-colors"
          >
            {isZh ? '跳过' : 'SKIP'}
          </button>
          <button
            onClick={handleNext}
            className="flex-1 font-pixel text-xs px-4 py-3 bg-neon-blue/15 border border-neon-blue/40 text-neon-blue hover:bg-neon-blue/25 transition-colors"
          >
            {isLastStep ? (isZh ? '开始游戏' : 'START') : (isZh ? '下一步' : 'NEXT')}
          </button>
        </div>

        {/* 步骤计数 */}
        <p className="text-meta text-center mt-3">
          {step + 1} / {totalSteps}
        </p>
      </div>
    </div>
  )
}