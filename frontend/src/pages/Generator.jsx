import { useState, useEffect } from 'react'
import AppNav from '../components/layout/AppNav'
import InputPanel from '../components/generator/InputPanel'
import OutputPanel from '../components/generator/OutputPanel'
import ModelSelector from '../components/generator/ModelSelector'
import { useGenerator } from '../hooks/useGenerator'
import { getUsage } from '../services/generate'
import { getProviderSettings } from '../services/userSettings'
import { useLanguage } from '../i18n'

export default function Generator() {
  const { t } = useLanguage()
  const {
    idea, setIdea,
    postType, setPostType,
    selectedHook, setSelectedHook,
    output, setOutput,
    postId,
    loading, error,
    generate, clearAll,
  } = useGenerator()

  const [providerInfo, setProviderInfo] = useState(null)
  const [usage,        setUsage]        = useState(null)

  useEffect(() => {
    getProviderSettings().then(({ data }) => setProviderInfo(data)).catch(() => {})
    getUsage().then(({ data }) => setUsage(data)).catch(() => {})
  }, [])

  const handleGenerate = async () => {
    const result = await generate()
    if (result) {
      setProviderInfo((prev) => ({ ...prev, ...result }))
      getUsage().then(({ data }) => setUsage(data)).catch(() => {})
    }
  }

  const handleClear = () => {
    clearAll()
  }

  const hasContent = idea.trim() || output

  return (
    <div className="min-h-screen bg-paper">
      <AppNav />

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-3xl font-light text-ink">{t('generateTitle')}</h1>
            <p className="text-muted text-sm mt-0.5">{t('generateCopy')}</p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2">
            <ModelSelector settings={providerInfo} />
            {usage && providerInfo?.plan_type === 'free' && (
              <p className="text-xs text-muted">
                {usage.used} / {usage.limit} posts this month
              </p>
            )}
          </div>
        </div>

        {/* Two-panel layout */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input */}
          <div className="bg-surface/40 border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xs font-medium text-muted uppercase tracking-wide">
                {t('yourInput')}
              </h2>
              {hasContent && (
                <button
                  onClick={handleClear}
                  className="text-xs text-muted hover:text-red-500 transition-colors underline underline-offset-2"
                >
                  {t('clearAll')}
                </button>
              )}
            </div>
            <InputPanel
              idea={idea}
              setIdea={setIdea}
              postType={postType}
              setPostType={setPostType}
              selectedHook={selectedHook}
              setSelectedHook={setSelectedHook}
              onGenerate={handleGenerate}
              loading={loading}
              error={error}
            />
          </div>

          {/* Output */}
          <div className="bg-surface/40 border border-border rounded-2xl p-6">
            <h2 className="text-xs font-medium text-muted uppercase tracking-wide mb-5">
              {t('yourPost')}
            </h2>
            <OutputPanel
              output={output}
              loading={loading}
              providerInfo={providerInfo}
              postId={postId}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
