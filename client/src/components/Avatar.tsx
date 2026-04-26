import { useState } from 'react'

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
  // Pixel face pattern
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
  // Custom URL
  return avatar
}

export function Avatar({ avatar, size = 40, className = '', style }: {
  avatar?: string | null
  size?: number
  className?: string
  style?: React.CSSProperties
}) {
  const safeAvatar = avatar || 'preset:1'
  const src = getAvatarUrl(safeAvatar, size * 2) // 2x for retina
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
  const [showUpload, setShowUpload] = useState(false)

  return (
    <div>
      <p className="font-pixel text-[10px] md:text-[11px] neon-text-blue mb-3">选择头像</p>
      <div className="grid grid-cols-4 gap-3 mb-4">
        {AVATAR_PRESETS.map((_, i) => {
          const presetId = `preset:${i + 1}`
          const isSelected = value === presetId
          return (
            <button
              key={presetId}
              onClick={() => onChange(presetId)}
              className={`p-1 border-2 transition-all min-h-[56px] ${
                isSelected
                  ? 'border-neon-blue shadow-[0_0_8px_rgba(0,240,255,0.4)]'
                  : 'border-cyber-border hover:border-cyber-border/80'
              }`}
            >
              <img
                src={generateAvatarSvg(i, 80)}
                alt={`Avatar ${i + 1}`}
                width={48}
                height={48}
                className="mx-auto"
                style={{ imageRendering: 'pixelated' }}
              />
            </button>
          )
        })}
      </div>
      <button
        onClick={() => setShowUpload(!showUpload)}
        className="font-pixel text-[10px] text-gray-500 hover:text-neon-purple transition-colors"
      >
        {showUpload ? '取消上传' : '+ 上传自定义头像'}
      </button>
      {showUpload && (
        <div className="mt-3">
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              if (file.size > 2 * 1024 * 1024) {
                alert('最大 2MB')
                return
              }
              try {
                const { userApi } = await import('../api')
                const result = await userApi.uploadAvatar(file)
                onChange(result.avatar)
              } catch (err) {
                console.error('Upload failed:', err)
              }
            }}
            className="text-sm text-gray-400"
          />
          <p className="text-[10px] text-gray-600 mt-1">JPG/PNG, 最大 2MB</p>
        </div>
      )}
    </div>
  )
}
