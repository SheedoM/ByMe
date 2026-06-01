import { useState } from 'react'
import { generateHooks } from '../../services/generate'
import Spinner from '../ui/Spinner'
import { useLanguage } from '../../i18n'

export default function HookVariants({ topic, keyPoints, onSelect }) {
  const { t } = useLanguage()
  const [hooks,   setHooks]   = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [chosen,  setChosen]  = useState(null)

  const handleGenerate = async () => {
    const points = keyPoints.filter(p => p.trim())
    if (!topic.trim() || !points.length) return
    setLoading(true)
    setError(null)
    setHooks([])
    setChosen(null)
    try {
      const { data } = await generateHooks({ topic, key_points: points })
      setHooks(data.hooks || [])
    } catch {
      setError(t('hookError'))
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (hook) => {
    setChosen(hook)
    onSelect(hook)
  }

  return (
    <div>
      <button
        onClick={handleGenerate}
        disabled={loading || !topic.trim()}
        className="text-xs text-muted underline underline-offset-2 hover:text-ink
                   transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? t('generatingHooks') : hooks.length ? t('regenerateHooks') : `${t('tryHooks')} ↗`}
      </button>

      {loading && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted">
          <Spinner size="sm" /> {t('craftingHooks')}
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      )}

      {hooks.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted uppercase tracking-wide">{t('pickHook')}</p>
          {hooks.map((hook, i) => (
            <button
              key={i}
              onClick={() => handleSelect(hook)}
              className={`w-full text-left text-sm px-4 py-3 rounded-xl border transition-all ${
                chosen === hook
                  ? 'border-amber bg-amber-light/30 text-ink'
                  : 'border-border bg-paper text-ink hover:border-muted'
              }`}
            >
              <span className="text-xs text-muted mr-2">{i + 1}.</span>
              {hook}
              {chosen === hook && (
                <span className="ml-2 text-xs text-amber font-medium">{t('hookSelected')}</span>
              )}
            </button>
          ))}
          {chosen && (
            <p className="text-xs text-muted pt-1">
              {t('hookLocked')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
