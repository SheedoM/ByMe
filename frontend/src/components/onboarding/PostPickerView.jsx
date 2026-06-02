import { useState, useEffect, useRef } from 'react'
import { getRawPosts, selectPostIds, uploadAnalytics } from '../../services/style'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'
import { useLanguage } from '../../i18n'

export default function PostPickerView({ onDone }) {
  const { t } = useLanguage()
  const [posts,           setPosts]           = useState([])
  const [selected,        setSelected]        = useState(new Set())
  const [loading,         setLoading]         = useState(true)
  const [saving,          setSaving]          = useState(false)
  const [error,           setError]           = useState('')
  const [hasEngagement,   setHasEngagement]   = useState(false)
  const [analyticsStatus, setAnalyticsStatus] = useState(null) // null | 'uploading' | 'done' | 'error'
  const [analyticsMsg,    setAnalyticsMsg]    = useState('')
  const analyticsInputRef = useRef(null)

  const loadPosts = () => {
    setLoading(true)
    getRawPosts()
      .then(({ data }) => {
        setPosts(data)
        const anyScored = data.some((p) => p.engagement_score != null)
        setHasEngagement(anyScored)
        // Pre-select all candidates (user deselects what they don't want)
        setSelected(new Set(data.map((p) => p.id)))
      })
      .catch(() => setError('Could not load posts. Please try again.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadPosts() }, [])

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

  const handleAnalyticsFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAnalyticsStatus('uploading')
    setAnalyticsMsg('')
    try {
      const { data } = await uploadAnalytics(file)
      setAnalyticsMsg(t('analyticsMatched', { matched: data.matched, total: data.total }))
      setAnalyticsStatus('done')
      // Reload posts — now sorted by engagement score
      loadPosts()
    } catch (err) {
      setAnalyticsStatus('error')
      setAnalyticsMsg(err.response?.data?.detail || t('analyticsError'))
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

      {/* Sample / engagement note */}
      <p className="text-xs text-muted mb-3 leading-relaxed">
        {hasEngagement ? t('postPickerEngagementNote') : t('postPickerSampleNote')}
      </p>

      {/* Analytics upload banner */}
      {!hasEngagement && (
        <div className="mb-4 p-4 bg-surface/60 border border-border rounded-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink">{t('analyticsUploadBanner')}</p>
              <p className="text-xs text-muted mt-0.5 leading-relaxed">{t('analyticsUploadBannerSub')}</p>
            </div>
            <button
              onClick={() => analyticsInputRef.current?.click()}
              disabled={analyticsStatus === 'uploading'}
              className="flex-shrink-0 text-xs px-3 py-1.5 rounded-xl border border-amber text-amber
                         hover:bg-amber/10 transition-all disabled:opacity-40 whitespace-nowrap"
            >
              {analyticsStatus === 'uploading' ? t('analyticsUploading') : t('analyticsUploadBtn')}
            </button>
            <input
              ref={analyticsInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleAnalyticsFile}
            />
          </div>
          {analyticsMsg && (
            <p className={`mt-2 text-xs ${analyticsStatus === 'error' ? 'text-red-500' : 'text-emerald-deep'}`}>
              {analyticsMsg}
            </p>
          )}
        </div>
      )}

      {/* Selected count + continue */}
      <div className="flex items-center justify-between mb-3 sticky top-0 bg-paper py-2 z-10">
        <span className={`text-sm font-medium ${tooFew ? 'text-red-500' : 'text-ink'}`}>
          {tooFew
            ? t('postPickerMinimum')
            : t('postPickerSelected', { n: selected.size })}
        </span>
        <Button size="sm" onClick={handleContinue} loading={saving} disabled={tooFew}>
          {t('postPickerContinue')} →
        </Button>
      </div>

      {/* Post list */}
      <div className="flex flex-col gap-3 max-h-[55vh] overflow-y-auto scrollbar-thin pr-1">
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
                {/* Checkbox */}
                <span className={`
                  mt-0.5 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center text-xs
                  ${isSelected ? 'bg-amber border-amber text-white' : 'border-border bg-paper'}
                `}>
                  {isSelected && '✓'}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-relaxed line-clamp-3">{post.preview}</p>
                  <div className="flex items-center flex-wrap gap-3 mt-2">
                    {post.post_date && (
                      <span className="text-xs text-muted/70">
                        {new Date(post.post_date).toLocaleDateString()}
                      </span>
                    )}
                    {post.engagement_score != null && (
                      <span className="text-xs font-medium text-amber bg-amber/10 px-2 py-0.5 rounded-full">
                        {t('engagementScore', { score: post.engagement_score })}
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
