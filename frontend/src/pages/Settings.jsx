import { useState, useEffect } from 'react'
import AppNav from '../components/layout/AppNav'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import Badge from '../components/ui/Badge'
import { getProviderSettings, saveProviderSettings, getProvidersCatalog } from '../services/userSettings'

export default function Settings() {
  const [settings,  setSettings]  = useState(null)
  const [catalog,   setCatalog]   = useState([])
  const [loading,   setLoading]   = useState(true)

  // Form state
  const [plan,      setPlan]      = useState('free')
  const [provider,  setProvider]  = useState('')
  const [model,     setModel]     = useState('')
  const [apiKey,    setApiKey]    = useState('')
  const [saving,    setSaving]    = useState(false)
  const [success,   setSuccess]   = useState(false)
  const [error,     setError]     = useState('')

  useEffect(() => {
    Promise.all([getProviderSettings(), getProvidersCatalog()])
      .then(([{ data: s }, { data: c }]) => {
        setSettings(s)
        setCatalog(c.providers || [])
        setPlan(s.plan_type || 'free')
        setProvider(s.byok_provider || '')
        setModel(s.byok_model || '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Auto-select first model when provider changes
  useEffect(() => {
    if (!provider) return
    const p = catalog.find((c) => c.id === provider)
    if (p?.models?.length && !model) setModel(p.models[0].id)
  }, [provider, catalog, model])

  const selectedProviderData = catalog.find((c) => c.id === provider)

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess(false)
    try {
      const payload = { plan_type: plan }
      if (plan === 'byok') {
        if (!provider) { setError('Please select a provider.'); setSaving(false); return }
        payload.byok_provider = provider
        payload.byok_model    = model
        if (apiKey.trim()) payload.byok_api_key = apiKey
      }
      await saveProviderSettings(payload)
      setSuccess(true)
      setApiKey('')  // clear key field after save
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
        <h1 className="font-serif text-3xl font-light text-ink mb-1">Settings</h1>
        <p className="text-muted text-sm mb-8">Manage your AI provider and generation plan.</p>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : (
          <div className="space-y-6">
            {/* Current plan status */}
            {settings && (
              <div className="bg-surface rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted uppercase tracking-wide mb-1">Current plan</p>
                  <div className="flex items-center gap-2">
                    {settings.plan_type === 'free' ? (
                      <>
                        <Badge variant="amber">⚡ ByMe Free</Badge>
                        <span className="text-xs text-muted">Gemini Flash · 10 posts/month</span>
                      </>
                    ) : (
                      <>
                        <Badge variant="ink">🔑 Own API Key</Badge>
                        <span className="text-xs text-muted capitalize">
                          {settings.byok_provider} · {settings.byok_model?.replace(/-\d{8}$/, '')}
                        </span>
                        {settings.has_api_key && (
                          <span className="text-xs text-emerald-deep">· key saved</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Plan selector */}
            <div>
              <p className="text-xs font-medium text-muted uppercase tracking-wide mb-3">
                Change plan
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <PlanCard
                  id="plan-free"
                  icon="⚡"
                  title="ByMe Free"
                  desc="Gemini Flash · 10 posts/month · no key needed"
                  selected={plan === 'free'}
                  onClick={() => setPlan('free')}
                />
                <PlanCard
                  id="plan-byok"
                  icon="🔑"
                  title="Own API Key"
                  desc="Choose Claude, OpenAI, or Gemini · unlimited posts"
                  selected={plan === 'byok'}
                  onClick={() => setPlan('byok')}
                />
              </div>
            </div>

            {/* BYOK config */}
            {plan === 'byok' && (
              <div className="bg-surface/60 border border-border rounded-2xl p-5 space-y-4 animate-slide-up">
                <p className="text-xs font-medium text-muted uppercase tracking-wide">
                  API Key Configuration
                </p>

                {/* Provider */}
                <div>
                  <p className="text-xs text-muted mb-2">Provider</p>
                  <div className="grid grid-cols-3 gap-2">
                    {catalog.map((p) => (
                      <button
                        key={p.id}
                        id={`provider-${p.id}`}
                        onClick={() => { setProvider(p.id); setModel('') }}
                        className={`text-sm px-3 py-2.5 rounded-xl border transition-all
                          ${provider === p.id
                            ? 'border-amber bg-amber-light/40 text-ink font-medium'
                            : 'border-border bg-paper text-muted hover:border-muted hover:text-ink'}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Model */}
                {provider && selectedProviderData && (
                  <div>
                    <p className="text-xs text-muted mb-2">Model</p>
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

                {/* API Key */}
                <Input
                  id="settings-api-key"
                  label={settings?.has_api_key ? 'New API Key (leave blank to keep current)' : 'API Key'}
                  type="password"
                  placeholder={selectedProviderData?.key_placeholder || 'Paste your API key'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  hint="Encrypted and stored securely. Never shared or logged."
                />
              </div>
            )}

            {error   && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}
            {success && <p className="text-sm text-emerald-deep bg-emerald-soft border border-emerald-deep/20 rounded-xl px-4 py-3">✓ Settings saved successfully</p>}

            <Button
              id="btn-save-settings"
              onClick={handleSave}
              loading={saving}
              fullWidth
              size="lg"
            >
              Save settings
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}

function PlanCard({ id, icon, title, desc, selected, onClick }) {
  return (
    <button
      id={id}
      onClick={onClick}
      className={`text-left p-4 rounded-2xl border-2 transition-all duration-200
        ${selected
          ? 'border-amber bg-amber-light/20'
          : 'border-border bg-paper hover:border-muted'}`}
    >
      <div className="text-xl mb-2">{icon}</div>
      <p className="text-sm font-medium text-ink mb-1">{title}</p>
      <p className="text-xs text-muted leading-relaxed">{desc}</p>
    </button>
  )
}
