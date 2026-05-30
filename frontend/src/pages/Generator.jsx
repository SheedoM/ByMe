import { useState } from 'react'
import AppNav from '../components/layout/AppNav'
import InputPanel from '../components/generator/InputPanel'
import OutputPanel from '../components/generator/OutputPanel'
import ModelSelector from '../components/generator/ModelSelector'
import { useGenerator } from '../hooks/useGenerator'
import { useEffect } from 'react'
import { getUsage } from '../services/generate'
import { getProviderSettings } from '../services/userSettings'

export default function Generator() {
  const {
    topic, setTopic,
    keyPoints, setKeyPoints,
    postType, setPostType,
    selectedHook, setSelectedHook,
    output, setOutput,
    postId,
    loading, error,
    generate,
  } = useGenerator()

  const [providerInfo, setProviderInfo] = useState(null)
  const [usage, setUsage] = useState(null)

  useEffect(() => {
    getProviderSettings().then(({ data }) => setProviderInfo(data)).catch(() => {})
    getUsage().then(({ data }) => setUsage(data)).catch(() => {})
  }, [])

  const handleGenerate = async () => {
    const result = await generate()
    if (result) {
      setProviderInfo((prev) => ({ ...prev, ...result }))
      // Refresh usage count
      getUsage().then(({ data }) => setUsage(data)).catch(() => {})
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <AppNav />

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-3xl font-light text-ink">Generate a post</h1>
            <p className="text-muted text-sm mt-0.5">
              Tell us what to write about. We&apos;ll write it in your voice.
            </p>
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
          <div className="bg-surface/40 border border-border rounded-2xl p-6">
            <h2 className="text-xs font-medium text-muted uppercase tracking-wide mb-5">
              Your input
            </h2>
            <InputPanel
              topic={topic}
              setTopic={setTopic}
              keyPoints={keyPoints}
              setKeyPoints={setKeyPoints}
              postType={postType}
              setPostType={setPostType}
              selectedHook={selectedHook}
              setSelectedHook={setSelectedHook}
              onGenerate={handleGenerate}
              loading={loading}
              error={error}
            />
          </div>

          <div className="bg-surface/40 border border-border rounded-2xl p-6">
            <h2 className="text-xs font-medium text-muted uppercase tracking-wide mb-5">
              Your post
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
