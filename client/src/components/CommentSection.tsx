import { useEffect, useState } from 'react'
import { commentApi } from '../api'
import { useGameStore } from '../store/gameStore'
import { Avatar } from './Avatar'
import PixelIcon from './PixelIcon'
import type { CommentInfo } from '../api'

interface Props {
  gameId: string
}

export default function CommentSection({ gameId }: Props) {
  const { user, token } = useGameStore()
  const [comments, setComments] = useState<CommentInfo[]>([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    commentApi.list(gameId)
      .then(setComments)
      .catch(() => setComments([]))
  }, [gameId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || !token) return
    try {
      const newComment = await commentApi.create(gameId, content.trim())
      setComments([newComment, ...comments])
      setContent('')
    } catch (err) {
      console.error('Comment failed:', err)
    }
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return '刚刚'
    if (mins < 60) return `${mins}分钟前`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}小时前`
    return `${Math.floor(hours / 24)}天前`
  }

  return (
    <div className="mt-6">
      <h3 className="font-pixel text-[9px] neon-text-blue mb-4">COMMENTS ({comments.length})</h3>

      {/* Comment form */}
      {token ? (
        <form onSubmit={handleSubmit} className="mb-4 flex gap-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="说点什么..."
            className="neon-input flex-1 text-sm"
            maxLength={200}
          />
          <button
            type="submit"
            disabled={!content.trim()}
            className="neon-btn-blue text-[10px] px-3 py-2 disabled:opacity-30 flex items-center gap-1"
          >
            <PixelIcon type="send" size={8} color="#00f0ff" />
            发送
          </button>
        </form>
      ) : (
        <p className="text-xs text-gray-600 mb-4">登录后可以评论</p>
      )}

      {/* Comment list */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3 p-3 bg-cyber-surface/50 border border-cyber-border/50">
            <Avatar avatar={c.avatar || 'preset:1'} size={28} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-pixel text-[10px] neon-text-blue">{c.nickname}</span>
                <span className="font-mono text-[9px] text-gray-700">{timeAgo(c.createdAt)}</span>
              </div>
              <p className="text-sm text-gray-400 font-mono break-words">{c.content}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-xs text-gray-600 text-center py-4">暂无评论</p>
        )}
      </div>
    </div>
  )
}
