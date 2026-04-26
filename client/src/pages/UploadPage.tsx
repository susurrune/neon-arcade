import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { gameApi } from '../api'
import { useGameStore } from '../store/gameStore'
import PixelIcon from '../components/PixelIcon'
import { PLANET_PRESETS } from '../universe/UniverseEngine'
import { t } from '../i18n'

// ============================================
// Format constraints
// ============================================
const MAX_SIZE_MB = 5
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

const SUPPORTED = [
  { ext: 'HTML5', detail: 'index.html + JS + CSS — 单 HTML 入口' },
  { ext: 'Canvas 2D / WebGL', detail: '原生浏览器游戏（PixiJS、Phaser、Three.js）' },
  { ext: 'WASM', detail: '编译后的 .wasm + JS 胶水代码' },
]

const UNSUPPORTED = [
  { name: 'Flash (.swf)', reason: '浏览器已停止支持，请用 HTML5 重写' },
  { name: 'Unity 原始构建', reason: '需先用 WebGL 平台导出，且总大小 ≤ 5MB' },
  { name: 'Unreal Engine', reason: 'HTML5 输出体积过大，暂不支持' },
  { name: '.exe / .apk / .ipa', reason: '本平台仅运行浏览器内游戏' },
  { name: '依赖外部服务的游戏', reason: '需自带所有资源，禁止外部 CDN/API 调用' },
  { name: 'Java Applet', reason: '现代浏览器已不支持' },
]

// 游戏类别 → 星系
const GAME_CATEGORIES = [
  { id: '益智', icon: '🧩', color: '#22D3EE' },
  { id: '射击', icon: '🔫', color: '#FF2E88' },
  { id: '冒险', icon: '⚔️', color: '#7C3AED' },
  { id: '竞速', icon: '🏎️', color: '#F59E0B' },
  { id: '策略', icon: '♟️', color: '#10B981' },
  { id: 'RPG', icon: '🧙', color: '#8B5CF6' },
  { id: '模拟', icon: '🏗️', color: '#EC4899' },
  { id: '经典', icon: '🎮', color: '#4ECDC4' },
  { id: '消除', icon: '💎', color: '#A855F7' },
  { id: '平台', icon: '🏃', color: '#F97316' },
]

interface ValidationResult {
  ok: boolean
  warnings: string[]
  errors: string[]
}

function validateFile(file: File | null, isEditMode: boolean): ValidationResult {
  const warnings: string[] = []
  const errors: string[] = []
  // 编辑模式下文件可选
  if (!file) {
    if (isEditMode) return { ok: true, warnings, errors }
    return { ok: false, warnings, errors: ['请选择 ZIP 文件'] }
  }

  if (!file.name.toLowerCase().endsWith('.zip')) {
    errors.push('文件必须为 .zip 压缩包')
  }
  if (file.size > MAX_SIZE_BYTES) {
    errors.push(`文件超过 ${MAX_SIZE_MB} MB 限制（当前 ${(file.size / 1024 / 1024).toFixed(2)} MB）`)
  }
  if (file.size < 512) {
    warnings.push('文件体积异常小，请确认是否打包完整')
  }
  if (file.size > MAX_SIZE_BYTES * 0.8) {
    warnings.push('体积接近上限，建议压缩贴图/音频后再上传')
  }
  return { ok: errors.length === 0, warnings, errors }
}

export default function UploadPage() {
  const { user, token, lang, setGames } = useGameStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isZh = lang === 'zh'

  // 编辑模式检测
  const editGameId = searchParams.get('edit')
  const isEditMode = Boolean(editGameId)
  const [loadingEdit, setLoadingEdit] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tag, setTag] = useState('益智')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // 星球自定义
  const [planetColor, setPlanetColor] = useState(PLANET_PRESETS[0].color)
  const [planetSize, setPlanetSize] = useState(0.8)
  const [hasRing, setHasRing] = useState(false)
  const [ringColor, setRingColor] = useState('#ffffff')
  const [emissive, setEmissive] = useState(0.4)
  // 星球封面图
  const [planetImageFile, setPlanetImageFile] = useState<File | null>(null)
  const [planetImagePreview, setPlanetImagePreview] = useState<string | null>(null)

  const validation = useMemo(() => validateFile(file, isEditMode), [file, isEditMode])

  // 编辑模式下加载现有游戏数据
  useEffect(() => {
    if (isEditMode && editGameId) {
      setLoadingEdit(true)
      gameApi.getById(editGameId)
        .then(g => {
          setTitle(g.name)
          setDescription(g.description)
          setTag(g.tags?.[0] || '益智')
          setPlanetColor(g.planetColor || PLANET_PRESETS[0].color)
          setPlanetSize(g.planetSize || 0.8)
          setHasRing(g.hasRing || false)
          setRingColor(g.ringColor || '#ffffff')
          setEmissive(g.emissive || 0.4)
          if (g.planetImage) setPlanetImagePreview(g.planetImage)
        })
        .catch(err => {
          setError(err.message || (isZh ? '加载游戏数据失败' : 'Failed to load game'))
        })
        .finally(() => setLoadingEdit(false))
    }
  }, [isEditMode, editGameId, isZh])

  if (!token || !user) {
    return (
      <main className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="title-section neon-text-pink mb-4">{isZh ? '请先登录' : 'Please login first'}</p>
          <button className="neon-btn-blue" onClick={() => navigate('/login')}>{isZh ? '去登录' : 'Login'}</button>
        </div>
      </main>
    )
  }

  const canSubmit = !uploading && !loadingEdit && validation.ok && title.trim().length >= 2

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setUploading(true)
    setError('')
    setProgress(10)
    try {
      if (isEditMode && editGameId) {
        // 编辑模式 - 使用 FormData 支持图片上传
        const formData = new FormData()
        formData.append('title', title)
        formData.append('description', description)
        formData.append('tag', tag)
        formData.append('planetColor', planetColor)
        formData.append('planetSize', String(planetSize))
        formData.append('hasRing', String(hasRing))
        formData.append('ringColor', ringColor)
        formData.append('emissive', String(emissive))
        if (planetImageFile) {
          formData.append('planetImage', planetImageFile)
        }

        const interval = setInterval(() => setProgress(p => Math.min(p + 20, 80)), 200)
        // 直接使用 fetch 发送 FormData
        const token = localStorage.getItem('neon_arcade_token')
        const res = await fetch(`/api/games/${editGameId}`, {
          method: 'PUT',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: res.statusText }))
          throw new Error(err.error || 'Update failed')
        }
        clearInterval(interval)
        // 强制刷新游戏列表 - 先清空再加载
        setGames([])
        const updatedGames = await gameApi.list()
        setGames(updatedGames)
        setProgress(100)
        setSuccess(true)
        setTimeout(() => navigate('/'), 1500)
      } else {
        // 上传模式 - 使用 upload API
        if (!file) {
          setError(isZh ? '请选择 ZIP 文件' : 'Please select ZIP file')
          setUploading(false)
          return
        }
        const formData = new FormData()
        formData.append('file', file)
        formData.append('title', title)
        formData.append('description', description)
        formData.append('tag', tag)
        formData.append('planetColor', planetColor)
        formData.append('planetSize', String(planetSize))
        formData.append('hasRing', String(hasRing))
        formData.append('ringColor', ringColor)
        formData.append('emissive', String(emissive))
        if (planetImageFile) {
          formData.append('planetImage', planetImageFile)
        }

        const interval = setInterval(() => setProgress(p => Math.min(p + 12, 90)), 250)
        await gameApi.upload(formData)
        clearInterval(interval)
        // 强制刷新游戏列表 - 先清空再加载
        setGames([])
        const updatedGames = await gameApi.list()
        setGames(updatedGames)
        setProgress(100)
        setSuccess(true)
        setTimeout(() => navigate('/'), 1500)
      }
    } catch (err: any) {
      setError(err.message || (isZh ? '操作失败' : 'Failed'))
      setProgress(0)
    } finally {
      setUploading(false)
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 md:py-10">
      <header className="mb-6">
        <h1 className="title-page neon-text-green flex items-center gap-3">
          <PixelIcon type="upload" size={18} color="#39ff14" />
          {isEditMode ? (isZh ? '编辑游戏' : 'Edit Game') : (isZh ? '发布游戏' : 'Publish Game')}
        </h1>
        <p className="text-meta mt-2">
          {isEditMode
            ? (isZh ? '修改你的游戏星球的外观和信息' : 'Update your game planet appearance and info')
            : (isZh ? '把你的作品发射到 NEON ARCADE 宇宙 — 它将变成一颗新星球' : 'Launch your creation into the NEON ARCADE universe — it will become a new planet')}
        </p>
      </header>

      {loadingEdit ? (
        <div className="text-center py-12">
          <p className="font-pixel text-[10px] text-gray-500">{isZh ? '加载中...' : 'Loading...'}</p>
        </div>
      ) : success ? (
        <div className="text-center py-12 bg-cyber-card border border-neon-green/40 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(57,255,20,0.12), transparent 60%)' }} />
          <p className="title-section neon-text-green mb-3">★ {isEditMode ? (isZh ? '保存成功' : 'Saved') : (isZh ? '发布成功' : 'Published')} ★</p>
          <p className="text-body text-gray-400">
            {isEditMode ? (isZh ? '正在返回个人中心...' : 'Returning to profile...') : (isZh ? '你的星球正在加入宇宙…' : 'Your planet is joining the universe…')}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-[1fr_320px] gap-6">
          {/* 左侧：表单 */}
          <form onSubmit={handleSubmit} className="space-y-5 bg-cyber-card border border-cyber-border p-5 md:p-6 relative">
            {/* 角落装饰 */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-neon-green/50 pointer-events-none" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-neon-green/50 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-neon-green/50 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-neon-green/50 pointer-events-none" />

            <Field label={isZh ? '游戏标题 *' : 'Game Title *'} hint={`${title.length}/40`}>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="neon-input"
                placeholder={isZh ? '例如：霓虹弹幕' : 'e.g. Neon Barrage'}
                maxLength={40}
                required
              />
            </Field>

            <Field label={isZh ? '游戏简介' : 'Description'} hint={`${description.length}/300`}>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="neon-input min-h-[90px] resize-y"
                placeholder={isZh ? '一段话告诉玩家这游戏的玩法和特色' : 'Tell players about the gameplay and features'}
                maxLength={300}
              />
            </Field>

            <Field label={isZh ? '所属星系' : 'Galaxy'}>
              <div className="flex flex-wrap gap-2">
                {GAME_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setTag(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 border text-[11px] font-pixel transition-colors ${
                      tag === cat.id
                        ? 'border-neon-green text-neon-green bg-neon-green/10'
                        : 'border-cyber-border text-gray-500 hover:border-neon-green/50 hover:text-gray-300'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    {cat.id}
                  </button>
                ))}
              </div>
            </Field>

            <Field label={isEditMode ? `游戏文件 (.zip, ≤ ${MAX_SIZE_MB} MB) — ${isZh ? '可选，不修改则保留原文件' : 'Optional, keep original if unchanged'}` : `游戏文件 (.zip, ≤ ${MAX_SIZE_MB} MB) *`}>
              <label className="block border-2 border-dashed border-cyber-border hover:border-neon-green/50 transition-colors cursor-pointer p-5 text-center">
                <input
                  type="file"
                  accept=".zip,application/zip"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                {file ? (
                  <div>
                    <p className="font-mono text-sm text-neon-green truncate">{file.name}</p>
                    <p className="text-meta mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-pixel text-[10px] text-gray-500">
                      {isEditMode ? (isZh ? '点击更换 ZIP 文件（可选）' : 'Click to change ZIP (optional)') : (isZh ? '点击选择 ZIP 文件' : 'Click to select ZIP')}
                    </p>
                    <p className="text-meta mt-1.5">{isZh ? '或将文件拖到此处' : 'Or drag file here'}</p>
                  </div>
                )}
              </label>
              {file && validation.errors.map((e, i) => (
                <p key={`e${i}`} className="text-sm font-mono text-neon-pink mt-2">✕ {e}</p>
              ))}
              {file && validation.warnings.map((w, i) => (
                <p key={`w${i}`} className="text-sm font-mono text-neon-yellow mt-2">⚠ {w}</p>
              ))}
              {file && validation.ok && (
                <p className="text-sm font-mono text-neon-green mt-2">✓ {isZh ? '校验通过' : 'Validation passed'}</p>
              )}
            </Field>

            {uploading && (
              <div>
                <div className="w-full h-2 bg-cyber-surface border border-cyber-border overflow-hidden">
                  <div
                    className="h-full bg-neon-green transition-all duration-300"
                    style={{ width: `${progress}%`, boxShadow: '0 0 8px rgba(57,255,20,0.6)' }}
                  />
                </div>
                <p className="text-meta mt-1.5 font-tnum">{isZh ? '上传中' : 'Uploading'} {progress}%</p>
              </div>
            )}

            {error && (
              <p className="text-sm font-mono text-neon-pink p-2 border border-neon-pink/30 bg-neon-pink/5">
                ✕ {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="neon-btn-green w-full disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {uploading
                ? `${isEditMode ? (isZh ? '保存中…' : 'Saving…') : (isZh ? '发射中…' : 'Launching…')} ${progress}%`
                : isEditMode
                  ? (isZh ? '保存修改' : 'SAVE CHANGES')
                  : (isZh ? '发射 → 加入宇宙' : 'LAUNCH → Join Universe')}
            </button>
          </form>

          {/* 右侧：星球自定义 */}
          <div className="space-y-5">
            {/* 星球预览 */}
            <div className="bg-cyber-card border border-cyber-border p-5">
              <h3 className="title-section neon-text-blue mb-4 flex items-center gap-2">
                🪐 {isZh ? '星球外观' : 'Planet Appearance'}
              </h3>

              {/* 星球封面图上传 */}
              <div className="mb-4">
                <label className="font-pixel text-[10px] text-gray-500 mb-2 block">
                  🖼️ {isZh ? '封面图（可选）' : 'Cover Image (optional)'}
                </label>
                <label
                  className="block border-2 border-dashed border-cyber-border hover:border-neon-blue/50 transition-colors cursor-pointer p-3 text-center rounded-lg"
                  style={{ minHeight: planetImagePreview ? 'auto' : '60px' }}
                >
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      if (f.size > 2 * 1024 * 1024) {
                        setError(isZh ? '封面图最大 2MB' : 'Cover max 2MB')
                        return
                      }
                      setPlanetImageFile(f)
                      setPlanetImagePreview(URL.createObjectURL(f))
                      setError('')
                    }}
                    className="hidden"
                  />
                  {planetImagePreview ? (
                    <div className="relative inline-block">
                      <img
                        src={planetImagePreview}
                        alt="preview"
                        className="w-full max-h-32 object-cover rounded-md"
                        style={{ maxHeight: 120 }}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setPlanetImageFile(null)
                          setPlanetImagePreview(null)
                        }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-neon-pink/80 text-white text-xs rounded-full flex items-center justify-center hover:bg-neon-pink"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <p className="font-pixel text-[9px] text-gray-500">{isZh ? '点击上传 JPG/PNG/GIF' : 'Click to upload image'}</p>
                  )}
                </label>
              </div>

              {/* 颜色选择 */}
              <div className="mb-4">
                <label className="font-pixel text-[10px] text-gray-500 mb-2 block">{isZh ? '星球颜色' : 'Planet Color'}</label>
                <div className="flex flex-wrap gap-2">
                  {PLANET_PRESETS.map((p) => (
                    <button
                      key={p.color}
                      type="button"
                      onClick={() => setPlanetColor(p.color)}
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                        planetColor === p.color ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ background: p.color, boxShadow: planetColor === p.color ? `0 0 10px ${p.color}` : 'none' }}
                      title={isZh ? p.name : p.nameEn}
                    />
                  ))}
                </div>
              </div>

              {/* 大小 */}
              <div className="mb-4">
                <label className="font-pixel text-[10px] text-gray-500 mb-2 block">
                  {isZh ? '大小' : 'Size'}: {planetSize.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={planetSize}
                  onChange={(e) => setPlanetSize(parseFloat(e.target.value))}
                  className="w-full accent-neon-blue"
                />
              </div>

              {/* 行星环 */}
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasRing}
                    onChange={(e) => setHasRing(e.target.checked)}
                    className="accent-neon-blue"
                  />
                  <span className="font-pixel text-[10px] text-gray-400">💍 {isZh ? '行星环' : 'Planet Ring'}</span>
                </label>
                {hasRing && (
                  <div className="mt-2">
                    <label className="font-pixel text-[9px] text-gray-500 mb-1 block">{isZh ? '环颜色' : 'Ring Color'}</label>
                    <input
                      type="color"
                      value={ringColor}
                      onChange={(e) => setRingColor(e.target.value)}
                      className="w-8 h-8 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* 发光 */}
              <div className="mb-4">
                <label className="font-pixel text-[10px] text-gray-500 mb-2 block">
                  ✨ {isZh ? '发光强度' : 'Glow'}: {emissive.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={emissive}
                  onChange={(e) => setEmissive(parseFloat(e.target.value))}
                  className="w-full accent-neon-blue"
                />
              </div>

              {/* 实时预览 */}
              <div className="mt-4 flex items-center justify-center h-32 bg-black/30 border border-white/5 rounded-lg relative overflow-hidden">
                {planetImagePreview ? (
                  <div
                    className="rounded-full overflow-hidden"
                    style={{
                      width: `${planetSize * 40}px`,
                      height: `${planetSize * 40}px`,
                      boxShadow: `0 0 ${emissive * 20}px ${planetColor}44`,
                    }}
                  >
                    <img
                      src={planetImagePreview}
                      alt="planet cover"
                      className="w-full h-full object-cover"
                      style={{ borderRadius: '50%' }}
                    />
                  </div>
                ) : (
                  <div
                    className="rounded-full transition-all duration-300"
                    style={{
                      width: `${planetSize * 40}px`,
                      height: `${planetSize * 40}px`,
                      background: `radial-gradient(circle at 35% 35%, ${planetColor}dd, ${planetColor}88, ${planetColor}44)`,
                      boxShadow: `0 0 ${emissive * 30}px ${planetColor}${Math.round(emissive * 200).toString(16).padStart(2, '0')}, inset 0 0 20px ${planetColor}33`,
                    }}
                  >
                    {/* 行星环预览 */}
                    {hasRing && (
                      <div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
                        style={{
                          width: `${planetSize * 80}px`,
                          height: `${planetSize * 20}px`,
                          borderColor: ringColor,
                          opacity: 0.6,
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 格式说明 */}
            <div className="spec-card p-4">
              <h3 className="title-section neon-text-blue mb-3">{isZh ? '支持的格式' : 'Supported Formats'}</h3>
              {SUPPORTED.map((s) => (
                <div key={s.ext} className="spec-row">
                  <span className="spec-icon-ok font-pixel text-[12px] mt-0.5">✓</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-pixel text-[10px] text-gray-200">{s.ext}</p>
                    <p className="text-meta mt-0.5">{s.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="font-pixel text-[10px] text-gray-500">{label}</label>
        {hint && <span className="text-meta font-tnum">{hint}</span>}
      </div>
      {children}
    </div>
  )
}
