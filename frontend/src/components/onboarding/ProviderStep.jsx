import { useState, useEffect } from 'react'
import { saveProviderSettings, getProvidersCatalog } from '../../services/userSettings'
import { analyzeStyle } from '../../services/style'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Spinner from '../ui/Spinner'
import { useLanguage } from '../../i18n'

export default function ProviderStep({ onDone, skipAnalysis = false }) {
  const { t } = useLanguage()
  const [choice,         setChoice]         = useState(null)   // 'free' | 'freekey' | 'byok'
  const [catalog,        setCatalog]        = useState([])
  const [provider,       setProvider]       = useState('')
  const [model,          setModel]          = useState('')
  const [apiKey,         setApiKey]         = useState('')
  const [saving,         setSaving]         = useState(false)
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const [error,          setError]          = useState('')

  useEffect(() => {
    getProvidersCatalog()
      .then(({ data }) => setCatalog(data.providers || []))
      .catch(() => setCatalog([]))
      .finally(() => setLoadingCatalog(false))
  }, [])

  // Auto-select first model when provider changes
  useEffect(() => {
    if (!provider) return
    const p = catalog.find((c) => c.id === provider)
    if (p?.models?.length) setModel(p.models[0].id)
  }, [provider, catalog])

  // Auto-select OpenRouter when free-key card is chosen
  useEffect(() => {
    if (choice === 'freekey') setProvider('openrouter')
  }, [choice])

  const handleFree = async () => {
    setSaving(true)
    setError('')
    try {
      await saveProviderSettings({ plan_type: 'free' })
      if (!skipAnalysis) await analyzeStyle()
      onDone()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleKey = async () => {
    if (!provider) { setError(t('providerRequired')); return }
    if (!apiKey.trim()) { setError(t('apiKeyRequired')); return }
    setSaving(true)
    setError('')
    try {
      await saveProviderSettings({
        plan_type:     'byok',
        byok_provider:  provider,
        byok_model:     model,
        byok_api_key:   apiKey,
      })
      if (!skipAnalysis) await analyzeStyle()
      onDone()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to save. Please check your key and try again.')
    } finally {
      setSaving(false)
    }
  }

  const selectedProviderData = catalog.find((c) => c.id === provider)
  const openRouterData       = catalog.find((c) => c.id === 'openrouter')
  const paidProviders        = catalog.filter((c) => c.id !== 'openrouter')

  const cardClass = (id) => `
    text-left p-6 rounded-2xl border-2 transition-all duration-200 w-full
    ${choice === id
      ? 'border-amber bg-amber-light/30 shadow-sm'
      : 'border-border bg-paper hover:border-muted hover:bg-surface/40'}
  `

  return (
    <div className="w-full max-w-2xl animate-slide-up">
      <h1 className="font-serif text-4xl font-light text-ink mb-2">
        {t('providerTitle')}
      </h1>
      <p className="text-muted text-sm mb-8">
        {t('providerCopy')}
      </p>

      <div className="flex flex-col gap-4 mb-6">

        {/* ── Card 1: Try ByMe ── */}
        <button id="plan-free" onClick={() => setChoice('free')} className={cardClass('free')}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">⚡</span>
            {choice === 'free' && (
              <span className="text-xs font-medium text-amber bg-amber-light border border-amber/30 px-2 py-0.5 rounded-full">
                {t('selected')}
              </span>
            )}
          </div>
          <h3 className="font-medium text-ink mb-1">{t('freeAnalysis')}</h3>
          <p className="text-xs text-muted leading-relaxed mb-3">{t('freeAnalysisDesc')}</p>
          <ul className="text-xs text-muted space-y-1">
            <li className="flex items-center gap-1.5"><span className="text-emerald-deep">✓</span> {t('freeAnalysisBullet1')}</li>
            <li className="flex items-center gap-1.5"><span className="text-emerald-deep">✓</span> {t('freeAnalysisBullet2')}</li>
            <li className="flex items-center gap-1.5"><span className="text-emerald-deep">✓</span> {t('freeAnalysisBullet3')}</li>
          </ul>
        </button>

        {/* ── Card 2: Free API key (OpenRouter) ── */}
        <button id="plan-freekey" onClick={() => setChoice('freekey')} className={cardClass('freekey')}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">🎁</span>
            {choice === 'freekey' && (
              <span className="text-xs font-medium text-amber bg-amber-light border border-amber/30 px-2 py-0.5 rounded-full">
                {t('selected')}
              </span>
            )}
          </div>
          <h3 className="font-medium text-ink mb-1">{t('freeKeyAnalysis')}</h3>
          <p className="text-xs text-muted leading-relaxed mb-3">{t('freeKeyAnalysisDesc')}</p>
          <ul className="text-xs text-muted space-y-1">
            <li className="flex items-center gap-1.5"><span className="text-emerald-deep">✓</span> {t('freeKeyBullet1')}</li>
            <li className="flex items-center gap-1.5"><span className="text-emerald-deep">✓</span> {t('freeKeyBullet2')}</li>
            <li className="flex items-center gap-1.5"><span className="text-emerald-deep">✓</span> {t('freeKeyBullet3')}</li>
          </ul>
        </button>

        {/* ── Card 3: Paid API key ── */}
        <button id="plan-byok" onClick={() => setChoice('byok')} className={cardClass('byok')}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">🔑</span>
            {choice === 'byok' && (
              <span className="text-xs font-medium text-amber bg-amber-light border border-amber/30 px-2 py-0.5 rounded-full">
                {t('selected')}
              </span>
            )}
          </div>
          <h3 className="font-medium text-ink mb-1">{t('byokAnalysis')}</h3>
          <p className="text-xs text-muted leading-relaxed mb-3">{t('byokAnalysisDesc')}</p>
          <ul className="text-xs text-muted space-y-1">
            <li className="flex items-center gap-1.5"><span className="text-emerald-deep">✓</span> {t('unlimitedPosts')}</li>
            <li className="flex items-center gap-1.5"><span className="text-emerald-deep">✓</span> {t('chooseModel')}</li>
            <li className="flex items-center gap-1.5"><span className="text-emerald-deep">✓</span> {t('yourDataKey')}</li>
          </ul>
        </button>
      </div>

      {/* ── OpenRouter guided wizard ── */}
      {choice === 'freekey' && (
        <div className="bg-surface/60 border border-border rounded-2xl p-6 mb-6 animate-slide-up space-y-4">
          <ol className="text-sm text-muted space-y-2">
            <li>{t('openRouterStep1')}</li>
            <li>{t('openRouterStep2')}</li>
            <li>{t('openRouterStep3')}</li>
          </ol>
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-amber hover:underline"
          >
            {t('getOpenRouterKey')}
          </a>

          {/* Model selector */}
          {loadingCatalog ? (
            <div className="flex justify-center py-2"><Spinner /></div>
          ) : openRouterData && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted uppercase tracking-wide">{t('model')}</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-paper border border-border rounded-xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-amber transition-colors"
              >
                {openRouterData.models.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
          )}

          <Input
            id="freekey-api-key"
            label={t('apiKey')}
            type="password"
            placeholder={openRouterData?.key_placeholder || 'sk-or-...'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            hint={t('apiKeyHint')}
          />
        </div>
      )}

      {/* ── Paid BYOK config ── */}
      {choice === 'byok' && (
        <div className="bg-surface/60 border border-border rounded-2xl p-6 mb-6 animate-slide-up space-y-4">
          {loadingCatalog ? (
            <div className="flex justify-center py-4"><Spinner /></div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted uppercase tracking-wide">{t('aiProvider')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {paidProviders.map((p) => (
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

              {provider && selectedProviderData && (
                <div className="flex flex-col gap-1.5 animate-fade-in">
                  <label className="text-xs font-medium text-muted uppercase tracking-wide">{t('model')}</label>
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

      {/* CTAs */}
      {choice === 'free' && (
        <Button id="btn-continue-free" onClick={handleFree} loading={saving} fullWidth size="lg">
          {t('analyzeFree')} →
        </Button>
      )}
      {(choice === 'freekey' || choice === 'byok') && (
        <Button
          id="btn-save-key"
          onClick={handleKey}
          loading={saving}
          disabled={!apiKey.trim()}
          fullWidth
          size="lg"
        >
          {skipAnalysis ? t('saveKeyContinue') : t('analyzeByok')} →
        </Button>
      )}

      {choice && (
        <p className="text-center text-xs text-muted mt-4">{t('changeAnytime')}</p>
      )}
    </div>
  )
}
