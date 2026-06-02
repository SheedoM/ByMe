import { useState } from 'react'
import Button from '../ui/Button'
import PostPickerView from './PostPickerView'
import { selectPostCount } from '../../services/style'
import { useLanguage } from '../../i18n'

function getPresets(total) {
  const fixed = [30, 50, 100, 200].filter((n) => n < total)
  return [...fixed, total]
}

export default function PostCountStep({ totalPosts, onDone }) {
  const { t } = useLanguage()
  const presets = getPresets(totalPosts)
  const [mode,     setMode]     = useState('recent')   // 'recent' | 'pick'
  const [selected, setSelected] = useState(presets[presets.length - 1])
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  const handleContinueRecent = async () => {
    setSaving(true)
    setError('')
    try {
      const count = selected >= totalPosts ? null : selected
      await selectPostCount(count)
      onDone()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full max-w-lg animate-slide-up">
      <h1 className="font-serif text-4xl font-light text-ink mb-3 text-center">
        {t('postCountTitle')}
      </h1>
      <p className="text-muted text-sm mb-6 leading-relaxed text-center">
        {t('postCountCopy', { total: totalPosts })}
      </p>

      {/* Mode toggle */}
      <div className="flex rounded-2xl border border-border overflow-hidden mb-6 bg-surface/30">
        {[
          { id: 'recent', label: t('postCountModeRecent') },
          { id: 'pick',   label: t('postCountModePick')   },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`
              flex-1 py-2.5 text-sm font-medium transition-all
              ${mode === id
                ? 'bg-amber/20 text-ink'
                : 'text-muted hover:text-ink'}
            `}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Recent mode ── */}
      {mode === 'recent' && (
        <>
          <div className="flex flex-col gap-3 mb-8">
            {presets.map((n) => {
              const isAll      = n === totalPosts
              const label      = isAll ? t('postCountAll', { n }) : t('postCountMostRecent', { n })
              const isSelected = selected === n
              return (
                <button
                  key={n}
                  onClick={() => setSelected(n)}
                  className={`
                    w-full px-5 py-4 rounded-2xl border text-left transition-all
                    ${isSelected
                      ? 'border-amber bg-amber/10 text-ink'
                      : 'border-border bg-surface/40 text-muted hover:border-muted hover:text-ink'}
                  `}
                >
                  <span className="font-medium text-sm">{label}</span>
                  {isAll && (
                    <span className="text-xs text-muted block mt-0.5">
                      Full corpus — best for capturing all of your writing range
                    </span>
                  )}
                  {!isAll && n === 30 && (
                    <span className="text-xs text-muted block mt-0.5">
                      Fast and focused — your most recent voice
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {error && (
            <p className="mb-4 text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <Button onClick={handleContinueRecent} loading={saving} fullWidth size="lg">
            {saving ? t('postCountSelecting') : t('postCountContinue')} →
          </Button>
        </>
      )}

      {/* ── Pick mode ── */}
      {mode === 'pick' && (
        <PostPickerView onDone={onDone} />
      )}
    </div>
  )
}
