import { useState, useEffect } from 'react'
import { getRawPosts, selectPostIds } from '../../services/style'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'
import { useLanguage } from '../../i18n'

export default function PostPickerView({ onDone }) {
  const { t } = useLanguage()
  const [posts,    setPosts]    = useState([])
  const [selected, setSelected] = useState(new Set())
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    getRawPosts()
      .then(({ data }) => {
        setPosts(data)
        // Pre-select posts already marked in_style=true
        setSelected(new Set(data.filter((p) => p.in_style).map((p) => p.id)))
      })
      .catch(() => setError('Could not load posts. Please try again.'))
      .finally(() => setLoading(false))
  }, [])

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleContinue = async () => {
    if (selected.size < 5) return
    setSaving(true)
    setError('')
    try {
      await selectPostIds([...selected])
      onDone()
    } catch (e) {
      setError(e.response?.data?.detail || 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-10">
        <Spinner size="lg" />
        <p className="text-sm text-muted">{t('postPickerLoading')}</p>
      </div>
    )
  }

  const tooFew = selected.size < 5

  return (
    <div className="w-full animate-fade-in">
      <p className="text-sm text-muted mb-4 leading-relaxed">{t('postPickerCopy')}</p>

      {/* Selected count + continue */}
      <div className="flex items-center justify-between mb-4 sticky top-0 bg-paper py-2 z-10">
        <span className={`text-sm font-medium ${tooFew ? 'text-red-500' : 'text-ink'}`}>
          {tooFew
            ? t('postPickerMinimum')
            : t('postPickerSelected', { n: selected.size })}
        </span>
        <Button
          size="sm"
          onClick={handleContinue}
          loading={saving}
          disabled={tooFew}
        >
          {t('postPickerContinue')} →
        </Button>
      </div>

      {/* Post list */}
      <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto scrollbar-thin pr-1">
        {posts.map((post) => {
          const isSelected = selected.has(post.id)
          return (
            <button
              key={post.id}
              onClick={() => toggle(post.id)}
              className={`
                w-full text-left p-4 rounded-2xl border transition-all
                ${isSelected
                  ? 'border-amber bg-amber/8 text-ink'
                  : 'border-border bg-surface/30 text-muted hover:border-muted hover:text-ink'}
              `}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox indicator */}
                <span className={`
                  mt-0.5 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center text-xs
                  ${isSelected ? 'bg-amber border-amber text-white' : 'border-border bg-paper'}
                `}>
                  {isSelected && '✓'}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-relaxed line-clamp-3">{post.preview}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {post.post_date && (
                      <span className="text-xs text-muted/70">
                        {new Date(post.post_date).toLocaleDateString()}
                      </span>
                    )}
                    {post.share_link && (
                      <a
                        href={post.share_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-amber hover:underline"
                      >
                        {t('postPickerViewOriginal')} ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </p>
      )}
    </div>
  )
}
