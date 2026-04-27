import { useState, useRef } from 'react'

// 12 预设头像配色 (霓虹赛博风)
const AVATAR_PRESETS = [
  { bg: '#00f0ff', fg: '#0f0f1a', label: '青' },
  { bg: '#b026ff', fg: '#ffffff', label: '紫' },
  { bg: '#ff2d95', fg: '#ffffff', label: '粉' },
  { bg: '#39ff14', fg: '#0f0f1a', label: '绿' },
  { bg: '#ffe600', fg: '#0f0f1a', label: '黄' },
  { bg: '#ff6b35', fg: '#ffffff', label: '橙' },
  { bg: '#0088ff', fg: '#ffffff', label: '蓝' },
  { bg: '#ff0055', fg: '#ffffff', label: '红' },
  { bg: '#00ffaa', fg: '#0f0f1a', label: '翠' },
  { bg: '#8b5cf6', fg: '#ffffff', label: '靛' },
  { bg: '#06b6d4', fg: '#ffffff', label: '湖' },
  { bg: '#f472b6', fg: '#ffffff', label: '桃' },
]

function generateAvatarSvg(index: number, size: number = 64): string {
  const p = AVATAR_PRESETS[index % AVATAR_PRESETS.length]
  const pixels = [
    [0,1,1,1,1,0],
    [1,0,1,1,0,1],
    [1,1,1,1,1,1],
    [1,0,1,1,0,1],
    [0,1,0,0,1,0],
    [0,0,1,1,0,0],
  ]
  const cellSize = Math.floor(size / 8)
  const offset = Math.floor(size / 2 - (6 * cellSize) / 2)

  let rects = ''
  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < 6; x++) {
      if (pixels[y][x]) {
        rects += `<rect x="${offset + x * cellSize}" y="${offset + y * cellSize}" width="${cellSize}" height="${cellSize}" fill="${p.fg}"/>`
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${p.bg}" rx="2"/>
    ${rects}
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export function getAvatarUrl(avatar: string, size: number = 64): string {
  if (!avatar) return generateAvatarSvg(0, size)
  if (avatar.startsWith('preset:')) {
    const idx = parseInt(avatar.split(':')[1], 10) - 1
    return generateAvatarSvg(idx, size)
  }
  // Base64 或 URL
  return avatar
}

export function Avatar({ avatar, size = 40, className = '', style }: {
  avatar?: string | null
  size?: number
  className?: string
  style?: React.CSSProperties
}) {
  const safeAvatar = avatar || 'preset:1'
  const src = getAvatarUrl(safeAvatar, size * 2)
  return (
    <img
      src={src}
      alt="avatar"
      width={size}
      height={size}
      className={`border border-cyber-border ${className}`}
      style={{ imageRendering: safeAvatar.startsWith('preset:') ? 'pixelated' : 'auto', ...style }}
    />
  )
}

export function AvatarPicker({ value, onChange }: {
  value: string
  onChange: (avatar: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setUploading(true)

    try {
      // 压缩图片到 64x64, 最大 100KB
      const img = new Image()
      img.onload = async () => {
        const canvas = document.createElement('canvas')
        const maxSize = 64
        canvas.width = maxSize
        canvas.height = maxSize
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, maxSize, maxSize)

        // 转 base64 (PNG)
        const base64 = canvas.toDataURL('image/png', 0.8)

        // 检查大小
        if (base64.length > 150000) {
          setError('图片过大，请选择更小的图片')
          setUploading(false)
          return
        }

        // 上传
        const token = localStorage.getItem('neon_arcade_token')
        const res = await fetch('/api/user/avatar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ base64 }),
        })

        if (!res.ok) {
          const data = await res.json()
          setError(data.error || '上传失败')
          setUploading(false)
          return
        }

        const data = await res.json()
        onChange(data.avatar)
        setUploading(false)
      }
      img.onerror = () => {
        setError('图片加载失败')
        setUploading(false)
      }
      img.src = URL.createObjectURL(file)
    } catch (err) {
      setError('上传失败')
      setUploading(false)
    }
  }

  return (
    <div>
      <p className="font-pixel text-[10px] md:text-[11px] neon-text-blue mb-3">选择头像</p>

      {/* 预设头像 */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {AVATAR_PRESETS.map((preset, i) => {
          const presetId = `preset:${i + 1}`
          const isSelected = value === presetId
          return (
            <button
              key={presetId}
              onClick={() => onChange(presetId)}
              className={`p-2 border-2 transition-all relative ${
                isSelected
                  ? 'border-neon-blue bg-neon-blue/10'
                  : 'border-cyber-border hover:border-neon-blue/50'
              }`}
              title={preset.label}
            >
              <img
                src={generateAvatarSvg(i, 64)}
                alt={`Avatar ${i + 1}`}
                width={32}
                height={32}
                className="mx-auto"
                style={{ imageRendering: 'pixelated' }}
              />
            </button>
          )
        })}
      </div>

      {/* 上传按钮 */}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        onChange={handleUpload}
        className="hidden"
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className={`font-pixel text-[10px] px-4 py-2 border transition-all ${
          uploading
            ? 'border-gray-500 text-gray-500'
            : 'border-neon-purple text-neon-purple hover:bg-neon-purple/20'
        }`}
      >
        {uploading ? '上传中...' : '上传自定义头像'}
      </button>

      {error && (
        <p className="font-pixel text-[10px] text-neon-pink mt-2">{error}</p>
      )}

      <p className="text-[10px] text-gray-500 mt-2">PNG/JPG, 建议 64x64, 最大 100KB</p>
    </div>
  )
}