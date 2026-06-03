import { useEffect, useState } from 'react'
import { generateHooks } from '../../services/generate'
import Spinner from '../ui/Spinner'
import { useLanguage } from '../../i18n'
import { getTextDirection } from '../../utils/textDirection'

export default function HookVariants({ topic, keyPoints, selectedHook, onSelect }) {
  const { t } = useLanguage()
  const [hooks,   setHooks]   = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!selectedHook) return
    setHooks((current) => current.includes(selectedHook) ? current : [selectedHook, ...current])
  }, [selectedHook])

  const canGenerate = Boolean(topic.trim())

  const handleGenerate = async () => {
    if (!canGenerate) return
    setLoading(true)
    setError(null)
    setHooks([])
    onSelect(null)
    try {
      const { data } = await generateHooks({ topic, key_points: [] })
      setHooks(data.hooks || [])
    } catch {
      setError(t('hookError'))
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (hook) => {
    onSelect(hook)
  }

  const handleChange = () => {
    onSelect(null)
  }

  if (selectedHook) {
    return (
      <div className="rounded-xl border border-amber bg-amber-light/20 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-amber-dark mb-1">{t('hookSelected')}</p>
            <p dir={getTextDirection(selectedHook)} className="text-sm text-ink leading-relaxed">{selectedHook}</p>
          </div>
          <button
            type="button"
            onClick={handleChange}
            className="shrink-0 text-xs font-medium text-muted hover:text-ink transition-colors"
          >
            {t('changeHook')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {loading && (
        <div className="rounded-xl border border-border bg-paper px-4 py-5 flex items-center gap-3 text-sm text-muted">
          <Spinner size="sm" /> {t('craftingHooks')}
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      )}

      {!loading && hooks.length === 0 && (
        <div className="rounded-xl border border-border bg-paper px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink mb-1">{t('hookCardTitle')}</p>
              <p className="text-xs text-muted leading-relaxed">{t('hookCardPitch')}</p>
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="shrink-0 inline-flex items-center justify-center rounded-xl bg-ink px-4 py-2 text-xs font-medium text-paper
                         hover:bg-ink/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('generateHooksCta')}
            </button>
          </div>
        </div>
      )}

      {!loading && hooks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted uppercase tracking-wide">{t('pickHook')}</p>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="text-xs text-muted underline underline-offset-2 hover:text-ink
                         transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('regenerateHooks')}
            </button>
          </div>
          {hooks.map((hook, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(hook)}
              dir={getTextDirection(hook)}
              className={`w-full text-left text-sm px-4 py-3 rounded-xl border transition-all ${
                selectedHook === hook
                  ? 'border-amber bg-amber-light/30 text-ink'
                  : 'border-border bg-paper text-ink hover:border-muted'
              }`}
            >
              <span className="flex items-start gap-3">
                <span className="text-xs text-muted mt-0.5 shrink-0" dir="ltr">{i + 1}.</span>
                <span className="flex-1 leading-relaxed">{hook}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
