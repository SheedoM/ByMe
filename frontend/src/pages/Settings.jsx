import { useState, useEffect } from 'react'
import AppNav from '../components/layout/AppNav'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import Badge from '../components/ui/Badge'
import { getProviderSettings, saveProviderSettings, getProvidersCatalog } from '../services/userSettings'
import LanguageToggle from '../components/ui/LanguageToggle'
import { useLanguage } from '../i18n'

export default function Settings() {
  const { t } = useLanguage()
  const [settings,  setSettings]  = useState(null)
  const [catalog,   setCatalog]   = useState([])
  const [loading,   setLoading]   = useState(true)

  const [plan,      setPlan]      = useState('free')
  const [provider,  setProvider]  = useState('')
  const [model,     setModel]     = useState('')
  const [apiKey,    setApiKey]    = useState('')
  const [saving,    setSaving]    = useState(false)
  const [success,   setSuccess]   = useState(false)
  const [error,     setError]     = useState('')

  const applySettings = (nextSettings) => {
    setSettings(nextSettings)
    setPlan(nextSettings.plan_type || 'free')
    setProvider(nextSettings.byok_provider || '')
    setModel(nextSettings.byok_model || '')
  }

  useEffect(() => {
    Promise.all([getProviderSettings(), getProvidersCatalog()])
      .then(([{ data: s }, { data: c }]) => {
        applySettings(s)
        setCatalog(c.providers || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!provider) return
    const selected = catalog.find((c) => c.id === provider)
    const modelIds = selected?.models?.map((m) => m.id) || []
    if (modelIds.length && !modelIds.includes(model)) {
      setModel(modelIds[0])
    }
  }, [provider, catalog, model])

  const selectedProviderData = catalog.find((c) => c.id === provider)
  const openRouterData = catalog.find((c) => c.id === 'openrouter')
  const paidProviders = catalog.filter((c) => c.id !== 'openrouter')
  const activeChoice = plan === 'free' ? 'free' : provider === 'openrouter' ? 'freekey' : 'byok'
  const canReuseSavedKey = Boolean(
    settings?.has_api_key &&
    settings?.byok_provider &&
    settings.byok_provider === provider
  )
  const keyHint = canReuseSavedKey && settings?.api_key_hint
    ? t('savedKeyHint', { hint: settings.api_key_hint })
    : t('apiKeyHint')

  const chooseFree = () => {
    setPlan('free')
  }

  const chooseFreeKey = () => {
    setPlan('byok')
    setProvider('openrouter')
    setModel('')
  }

  const chooseOwnKey = () => {
    setPlan('byok')
    if (!provider || provider === 'openrouter') {
      setProvider(paidProviders[0]?.id || '')
      setModel('')
    }
  }

  const handleProviderChange = (providerId) => {
    setProvider(providerId)
    setModel('')
    setApiKey('')
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess(false)
    try {
      const payload = { plan_type: plan }
      if (plan === 'byok') {
        if (!provider) {
          setError(t('providerRequired'))
          setSaving(false)
          return
        }
        payload.byok_provider = provider
        payload.byok_model = model
        if (apiKey.trim()) payload.byok_api_key = apiKey
      }

      await saveProviderSettings(payload)
      const { data: latestSettings } = await getProviderSettings()
      applySettings(latestSettings)
      setSuccess(true)
      setApiKey('')
      setTimeout(() => setSuccess(false), 4000)
    } catch (e) {
      setError(e.response?.data?.detail || 'Save failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <AppNav />

      <main className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="font-serif text-3xl font-light text-ink mb-1">{t('settingsTitle')}</h1>
        <p className="text-muted text-sm mb-8">{t('settingsCopy')}</p>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : (
          <div className="space-y-6">
            {settings && (
              <div className="bg-surface rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted uppercase tracking-wide mb-1">{t('currentPlan')}</p>
                  <CurrentPlan settings={settings} t={t} />
                </div>
              </div>
            )}

            <div className="bg-surface rounded-2xl p-4 flex items-center justify-between">
              <p className="text-xs text-muted uppercase tracking-wide">{t('language')}</p>
              <LanguageToggle />
            </div>

            <div>
              <p className="text-xs font-medium text-muted uppercase tracking-wide mb-3">
                {t('changePlan')}
              </p>
              <div className="flex flex-col gap-3">
                <PlanCard
                  id="plan-free"
                  icon="⚡"
                  title={t('freeAnalysis')}
                  desc={t('freeAnalysisDesc')}
                  bullets={[
                    t('freeAnalysisBullet1'),
                    t('freeAnalysisBullet2'),
                    t('freeAnalysisBullet3'),
                  ]}
                  selected={activeChoice === 'free'}
                  onClick={chooseFree}
                  t={t}
                />
                <PlanCard
                  id="plan-freekey"
                  icon="🎁"
                  title={t('freeKeyAnalysis')}
                  desc={t('freeKeyAnalysisDesc')}
                  bullets={[
                    t('freeKeyBullet1'),
                    t('freeKeyBullet2'),
                    t('freeKeyBullet3'),
                  ]}
                  selected={activeChoice === 'freekey'}
                  onClick={chooseFreeKey}
                  t={t}
                />
                <PlanCard
                  id="plan-byok"
                  icon="🔑"
                  title={t('byokAnalysis')}
                  desc={t('byokAnalysisDesc')}
                  bullets={[
                    t('unlimitedPosts'),
                    t('chooseModel'),
                    t('yourDataKey'),
                  ]}
                  selected={activeChoice === 'byok'}
                  onClick={chooseOwnKey}
                  t={t}
                />
              </div>
              {activeChoice === 'free' && settings?.has_api_key && (
                <p className="mt-3 text-xs text-muted bg-surface border border-border rounded-xl px-4 py-3">
                  {t('savedKeyUnusedNote')}
                </p>
              )}
            </div>

            {activeChoice === 'freekey' && (
              <div className="bg-surface/60 border border-border rounded-2xl p-5 space-y-4 animate-slide-up">
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

                {openRouterData && (
                  <div>
                    <p className="text-xs text-muted mb-2">{t('model')}</p>
                    <select
                      id="settings-openrouter-model"
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
                  id="settings-openrouter-api-key"
                  label={canReuseSavedKey ? t('newApiKey') : t('apiKey')}
                  type="password"
                  placeholder={openRouterData?.key_placeholder || 'sk-or-...'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  hint={keyHint}
                />
              </div>
            )}

            {activeChoice === 'byok' && (
              <div className="bg-surface/60 border border-border rounded-2xl p-5 space-y-4 animate-slide-up">
                <p className="text-xs font-medium text-muted uppercase tracking-wide">
                  {t('apiKey')}
                </p>

                <div>
                  <p className="text-xs text-muted mb-2">{t('aiProvider')}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {paidProviders.map((p) => (
                      <button
                        key={p.id}
                        id={`provider-${p.id}`}
                        onClick={() => handleProviderChange(p.id)}
                        className={`text-sm px-3 py-2.5 rounded-xl border transition-all text-left
                          ${provider === p.id
                            ? 'border-amber bg-amber-light/40 text-ink font-medium'
                            : 'border-border bg-paper text-muted hover:border-muted hover:text-ink'}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {provider && selectedProviderData && (
                  <div>
                    <p className="text-xs text-muted mb-2">{t('model')}</p>
                    <select
                      id="settings-model"
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
                    id="settings-api-key"
                    label={canReuseSavedKey ? t('newApiKey') : t('apiKey')}
                    type="password"
                    placeholder={selectedProviderData?.key_placeholder || t('apiKeyPlaceholder')}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    hint={keyHint}
                  />
                )}
              </div>
            )}

            {error && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                {error}
              </p>
            )}
            {success && (
              <p className="text-sm text-emerald-deep bg-emerald-soft border border-emerald-deep/20 rounded-xl px-4 py-3">
                ✓ {t('settingsSaved')}
              </p>
            )}

            <Button
              id="btn-save-settings"
              onClick={handleSave}
              loading={saving}
              fullWidth
              size="lg"
            >
              {t('saveSettings')}
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}

function CurrentPlan({ settings, t }) {
  if (settings.plan_type === 'free') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="amber">⚡ {t('freeAnalysis')}</Badge>
        <span className="text-xs text-muted">{t('tryByMePlanMeta')}</span>
      </div>
    )
  }

  const isOpenRouter = settings.byok_provider === 'openrouter'
  const providerLabel = providerName(settings.byok_provider)
  const modelShort = settings.byok_model
    ? settings.byok_model.replace(/-\d{8}$/, '')
    : settings.byok_provider

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={isOpenRouter ? 'amber' : 'ink'}>
        {isOpenRouter ? '🎁' : '🔑'} {isOpenRouter ? t('freeKeyAnalysis') : t('ownApiKey')}
      </Badge>
      <span className="text-xs text-muted">
        {providerLabel} · {modelShort}
      </span>
      {settings.has_api_key && (
        <span className="text-xs text-emerald-deep">
          · {settings.api_key_hint || t('keySaved')}
        </span>
      )}
    </div>
  )
}

function PlanCard({ id, icon, title, desc, bullets, selected, onClick, t }) {
  return (
    <button
      id={id}
      onClick={onClick}
      className={`text-left p-5 rounded-2xl border-2 transition-all duration-200 w-full
        ${selected
          ? 'border-amber bg-amber-light/30 shadow-sm'
          : 'border-border bg-paper hover:border-muted hover:bg-surface/40'}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {selected && (
          <span className="text-xs font-medium text-amber bg-amber-light border border-amber/30 px-2 py-0.5 rounded-full">
            {t('selected')}
          </span>
        )}
      </div>
      <h3 className="font-medium text-ink mb-1">{title}</h3>
      <p className="text-xs text-muted leading-relaxed mb-3">{desc}</p>
      <ul className="text-xs text-muted space-y-1">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-center gap-1.5">
            <span className="text-emerald-deep">✓</span> {bullet}
          </li>
        ))}
      </ul>
    </button>
  )
}

function providerName(provider) {
  return {
    claude: 'Claude',
    openai: 'OpenAI',
    gemini: 'Gemini',
    openrouter: 'OpenRouter',
  }[provider] || provider
}
