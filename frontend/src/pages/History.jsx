import { useEffect, useState } from 'react'
import AppNav from '../components/layout/AppNav'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import { getHistory } from '../services/generate'
import { copyToClipboard, formatDate, formatModelLabel, formatProviderLabel } from '../utils/format'
import { getTextDirection } from '../utils/textDirection'
import { useLanguage } from '../i18n'

export default function History() {
  const { t } = useLanguage()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getHistory(50)
      .then(({ data }) => {
        const rows = data || []
        setPosts(rows)
      })
      .catch(() => setError(t('historyLoadError')))
      .finally(() => setLoading(false))
  }, [t])

  const postText = (post) => post.final_output || post.output || ''

  const handleCopy = async (post) => {
    if (await copyToClipboard(postText(post))) {
      const postId = post.id
      setCopiedId(postId)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <AppNav />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="font-serif text-3xl font-light text-ink mb-1">{t('historyTitle')}</h1>
        <p className="text-muted text-sm mb-8">{t('historyCopy')}</p>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : error ? (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
        ) : posts.length === 0 ? (
          <div className="bg-surface border border-border rounded-2xl p-8 text-center">
            <p className="text-sm text-muted">{t('historyEmpty')}</p>
          </div>
        ) : (
          <div className="space-y-5">
            {posts.map((post) => (
              <HistoryItem
                key={post.id}
                post={post}
                text={postText(post)}
                copied={copiedId === post.id}
                onCopy={() => handleCopy(post)}
                t={t}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function HistoryItem({ post, text, copied, onCopy, t }) {
  const provider = `${formatProviderLabel(post.provider_used)} · ${formatModelLabel(post.model_used)}`
  const postType = post.post_type ? post.post_type.replace('_', ' ') : t('postType')
  const isFinal = Boolean(post.final_output)

  return (
    <article className="bg-surface/40 border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-paper/40">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium text-ink mb-1">{post.topic}</h2>
            <p className="text-xs text-muted capitalize">
              {formatDate(post.final_saved_at || post.created_at)} · {postType} · {provider}
            </p>
          </div>
          <p className="text-xs text-muted">
            {isFinal ? t('historyFinalVersion') : t('historyAiDraft')}
          </p>
        </div>
      </div>

      <div
        dir={getTextDirection(text)}
        className="bg-paper p-5 post-output text-ink min-h-[160px]"
      >
        {text}
      </div>

      <div className="flex flex-wrap justify-end gap-2 px-5 py-4 border-t border-border bg-surface/50">
        <Button variant="secondary" size="sm" onClick={onCopy}>
          {copied ? `✓ ${t('copied')}` : t('copy')}
        </Button>
      </div>
    </article>
  )
}
