import { useEffect, useState, useMemo } from 'react'
import AppNav from '../components/layout/AppNav'
import Spinner from '../components/ui/Spinner'
import { getHistory } from '../services/generate'
import { copyToClipboard, formatDate, formatProviderLabel } from '../utils/format'
import { getTextDirection } from '../utils/textDirection'
import { useLanguage } from '../i18n'

const POST_TYPE_COLORS = {
  story:       'bg-blue-50 text-blue-600',
  lesson:      'bg-amber/10 text-amber',
  hot_take:    'bg-red-50 text-red-500',
  observation: 'bg-emerald-soft text-emerald-deep',
  update:      'bg-purple-50 text-purple-500',
}

export default function History() {
  const { t } = useLanguage()
  const [posts,     setPosts]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [search,    setSearch]    = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [copiedId,  setCopiedId]  = useState(null)

  useEffect(() => {
    getHistory(100)
      .then(({ data }) => setPosts(data || []))
      .catch(() => setError(t('historyLoadError')))
      .finally(() => setLoading(false))
  }, [t])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return posts
    return posts.filter((p) =>
      (p.topic || '').toLowerCase().includes(q) ||
      (p.output || '').toLowerCase().includes(q) ||
      (p.final_output || '').toLowerCase().includes(q)
    )
  }, [posts, search])

  const handleCopy = async (post) => {
    const text = post.final_output || post.output || ''
    if (await copyToClipboard(text)) {
      setCopiedId(post.id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id))

  return (
    <div className="min-h-screen bg-paper">
      <AppNav />

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-serif text-3xl font-light text-ink">{t('historyTitle')}</h1>
            <p className="text-muted text-sm mt-0.5">{t('historyCopy')}</p>
          </div>
          {posts.length > 0 && (
            <span className="text-xs text-muted">{posts.length} posts</span>
          )}
        </div>

        {/* Search */}
        {posts.length > 5 && (
          <div className="relative mb-5">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/60"
              fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('historySearch') || 'Search posts…'}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-surface/60 border border-border
                         rounded-xl text-ink placeholder-muted/60 focus:outline-none
                         focus:border-amber transition-colors"
            />
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : error ? (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
        ) : filtered.length === 0 ? (
          <div className="bg-surface border border-border rounded-2xl p-8 text-center">
            <p className="text-sm text-muted">
              {search ? 'No posts match your search.' : t('historyEmpty')}
            </p>
          </div>
        ) : (
          <div className="border border-border rounded-2xl overflow-hidden divide-y divide-border">
            {filtered.map((post) => {
              const isOpen   = expandedId === post.id
              const isFinal  = Boolean(post.final_output)
              const text     = post.final_output || post.output || ''
              const typeKey  = post.post_type || 'story'
              const typeLabel = typeKey.replace('_', ' ')
              const preview  = text.replace(/\n+/g, ' ').slice(0, 90)

              return (
                <div key={post.id}>
                  {/* Row — always visible */}
                  <button
                    onClick={() => toggleExpand(post.id)}
                    className="w-full text-left px-5 py-4 flex items-start gap-4
                               hover:bg-surface/40 transition-colors"
                  >
                    {/* Chevron */}
                    <svg
                      className={`mt-0.5 w-4 h-4 text-muted shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                      fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6"/>
                    </svg>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {/* Date */}
                        <span className="text-xs text-muted">
                          {formatDate(post.final_saved_at || post.created_at)}
                        </span>
                        {/* Post type badge */}
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${POST_TYPE_COLORS[typeKey] || 'bg-surface text-muted'}`}>
                          {typeLabel}
                        </span>
                        {/* Final badge */}
                        {isFinal && (
                          <span className="text-xs text-emerald-deep bg-emerald-soft px-2 py-0.5 rounded-full">
                            {t('historyFinalVersion')}
                          </span>
                        )}
                      </div>
                      {/* Idea / preview */}
                      <p
                        dir={getTextDirection(post.topic || preview)}
                        className="text-sm text-ink leading-snug truncate"
                      >
                        {post.topic || preview}
                      </p>
                    </div>
                  </button>

                  {/* Expanded body */}
                  {isOpen && (
                    <div className="border-t border-border bg-paper">
                      {/* Hook used */}
                      {post.selected_hook && (
                        <div className="px-5 pt-4 pb-0">
                          <p className="text-xs text-muted uppercase tracking-wide mb-1">Hook used</p>
                          <p
                            dir={getTextDirection(post.selected_hook)}
                            className="text-sm text-amber-dark italic leading-relaxed"
                          >
                            {post.selected_hook}
                          </p>
                        </div>
                      )}
                      {/* Full post text */}
                      <div
                        dir={getTextDirection(text)}
                        className="px-5 py-4 text-sm text-ink leading-relaxed whitespace-pre-wrap post-output"
                      >
                        {text}
                      </div>
                      {/* Actions */}
                      <div className="flex justify-between items-center px-5 py-3 border-t border-border bg-surface/40">
                        <span className="text-xs text-muted">
                          {formatProviderLabel(post.provider_used)}
                        </span>
                        <button
                          onClick={() => handleCopy(post)}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border
                                     hover:border-amber hover:text-amber transition-all"
                        >
                          {copiedId === post.id ? `✓ ${t('copied')}` : t('copy')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
