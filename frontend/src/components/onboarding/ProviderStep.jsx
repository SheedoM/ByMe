import { useState, useEffect } from 'react'
import { saveProviderSettings, getProvidersCatalog } from '../../services/userSettings'
import { analyzeStyle } from '../../services/style'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Spinner from '../ui/Spinner'
import { useLanguage } from '../../i18n'

export default function ProviderStep({ onDone }) {
  const { t } = useLanguage()
  const [choice,    setChoice]    = useState(null)      // null | 'free' | 'byok'
  const [catalog,   setCatalog]   = useState([])
  const [provider,  setProvider]  = useState('')
  const [model,     setModel]     = useState('')
  const [apiKey,    setApiKey]    = useState('')
  const [saving,    setSaving]    = useState(false)
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const [error,     setError]     = useState('')

  useEffect(() => {
    getProvidersCatalog()
      .then(({ data }) => setCatalog(data.providers || []))
      .catch(() => setCatalog([]))
      .finally(() => setLoadingCatalog(false))
  }, [])

  // When provider changes, auto-select first model
  useEffect(() => {
    if (!provider) return
    const p = catalog.find((c) => c.id === provider)
    if (p?.models?.length) setModel(p.models[0].id)
  }, [provider, catalog])

  const handleFree = async () => {
    setSaving(true)
    setError('')
    try {
      await saveProviderSettings({ plan_type: 'free' })
      await analyzeStyle()
      onDone()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleBYOK = async () => {
    if (!provider) { setError(t('providerRequired')); return }
    if (!apiKey.trim()) { setError(t('apiKeyRequired')); return }
    setSaving(true)
    setError('')
    try {
      await saveProviderSettings({
        plan_type:    'byok',
        byok_provider: provider,
        byok_model:    model,
        byok_api_key:  apiKey,
      })
      await analyzeStyle()
      onDone()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to save. Please check your key and try again.')
    } finally {
      setSaving(false)
    }
  }

  const selectedProviderData = catalog.find((c) => c.id === provider)

  return (
    <div className="w-full max-w-2xl animate-slide-up">
      <h1 className="font-serif text-4xl font-light text-ink mb-2">
        {t('providerTitle')}
      </h1>
      <p className="text-muted text-sm mb-8">
        {t('providerCopy')}
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {/* ── Free tier card ── */}
        <button
          id="plan-free"
          onClick={() => setChoice('free')}
          className={`
            text-left p-6 rounded-2xl border-2 transition-all duration-200
            ${choice === 'free'
              ? 'border-amber bg-amber-light/30 shadow-sm'
              : 'border-border bg-paper hover:border-muted hover:bg-surface/40'}
          `}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">⚡</span>
            {choice === 'free' && (
              <span className="text-xs font-medium text-amber bg-amber-light border border-amber/30 px-2 py-0.5 rounded-full">
                {t('selected')}
              </span>
            )}
          </div>
          <h3 className="font-medium text-ink mb-1">{t('freeAnalysis')}</h3>
          <p className="text-xs text-muted leading-relaxed mb-3">
            {t('freeAnalysisDesc')}
          </p>
          <ul className="text-xs text-muted space-y-1">
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-deep">✓</span> 10 posts/month
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-deep">✓</span> {t('noSetup')}
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-deep">✓</span> {t('goodStart')}
            </li>
          </ul>
        </button>

        {/* ── BYOK card ── */}
        <button
          id="plan-byok"
          onClick={() => setChoice('byok')}
          className={`
            text-left p-6 rounded-2xl border-2 transition-all duration-200
            ${choice === 'byok'
              ? 'border-amber bg-amber-light/30 shadow-sm'
              : 'border-border bg-paper hover:border-muted hover:bg-surface/40'}
          `}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">🔑</span>
            {choice === 'byok' && (
              <span className="text-xs font-medium text-amber bg-amber-light border border-amber/30 px-2 py-0.5 rounded-full">
                {t('selected')}
              </span>
            )}
          </div>
          <h3 className="font-medium text-ink mb-1">{t('byokAnalysis')}</h3>
          <p className="text-xs text-muted leading-relaxed mb-3">
            {t('byokAnalysisDesc')}
          </p>
          <ul className="text-xs text-muted space-y-1">
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-deep">✓</span> {t('unlimitedPosts')}
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-deep">✓</span> {t('chooseModel')}
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-deep">✓</span> {t('yourDataKey')}
            </li>
          </ul>
        </button>
      </div>

      {/* ── BYOK configuration (shown when byok selected) ── */}
      {choice === 'byok' && (
        <div className="bg-surface/60 border border-border rounded-2xl p-6 mb-6 animate-slide-up space-y-4">
          {loadingCatalog ? (
            <div className="flex justify-center py-4"><Spinner /></div>
          ) : (
            <>
              {/* Provider selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted uppercase tracking-wide">
                  {t('aiProvider')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {catalog.map((p) => (
                    <button
                      key={p.id}
                      id={`provider-${p.id}`}
                      onClick={() => setProvider(p.id)}
                      className={`
                        text-sm px-3 py-2.5 rounded-xl border transition-all text-left
                        ${provider === p.id
                          ? 'border-amber bg-amber-light/40 text-ink font-medium'
                          : 'border-border bg-paper text-muted hover:border-muted hover:text-ink'}
                      `}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Model selector */}
              {provider && selectedProviderData && (
                <div className="flex flex-col gap-1.5 animate-fade-in">
                  <label className="text-xs font-medium text-muted uppercase tracking-wide">
                    {t('model')}
                  </label>
                  <select
                    id="byok-model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-paper border border-border rounded-xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-amber transition-colors"
                  >
                    {selectedProviderData.models.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* API Key input */}
              {provider && (
                <Input
                  id="byok-api-key"
                  label={t('apiKey')}
                  type="password"
                  placeholder={selectedProviderData?.key_placeholder || t('apiKeyPlaceholder')}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  hint={t('apiKeyHint')}
                  className="animate-fade-in"
                />
              )}
            </>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
          {error}
        </p>
      )}

      {/* CTA */}
      {choice === 'free' && (
        <Button
          id="btn-continue-free"
          onClick={handleFree}
          loading={saving}
          fullWidth
          size="lg"
        >
          {t('analyzeFree')} →
        </Button>
      )}

      {choice === 'byok' && (
        <Button
          id="btn-save-byok"
          onClick={handleBYOK}
          loading={saving}
          disabled={!provider || !apiKey.trim()}
          fullWidth
          size="lg"
        >
          {t('analyzeByok')} →
        </Button>
      )}

      {choice && (
        <p className="text-center text-xs text-muted mt-4">
          {t('changeAnytime')}
        </p>
      )}
    </div>
  )
}
