import { useEffect, useState } from 'react'
import { copyToClipboard } from '../../utils/format'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'
import { saveFinalPost } from '../../services/generate'
import { useLanguage } from '../../i18n'
import { getTextDirection } from '../../utils/textDirection'

export default function OutputPanel({ output, loading, providerInfo, postId }) {
  const { t } = useLanguage()
  const [draft, setDraft] = useState(output || '')
  const [copied, setCopied] = useState(false)
  const [savingFinal, setSavingFinal] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    setDraft(output || '')
    setSaveMessage('')
    setSaveError('')
  }, [output, postId])

  const handleCopy = async () => {
    const ok = await copyToClipboard(draft)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSaveFinal = async () => {
    if (!postId || !draft.trim()) return
    setSavingFinal(true)
    setSaveMessage('')
    setSaveError('')
    try {
      await saveFinalPost(postId, draft)
      setSaveMessage(t('finalSaved'))
    } catch (e) {
      setSaveError(e.response?.data?.detail || t('finalSaveError'))
    } finally {
      setSavingFinal(false)
    }
  }

  const handleRestore = () => {
    setDraft(output)
    setSaveMessage('')
    setSaveError('')
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-4">
        <Spinner size="lg" />
        <p className="text-sm text-muted animate-pulse">{t('writingVoice')}</p>
      </div>
    )
  }

  if (!output) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-3 text-center px-8">
        <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center text-2xl">
          ✍
        </div>
        <p className="text-sm text-muted">
          {t('postWillAppear')}
        </p>
        <p className="text-xs text-muted/60">
          {t('fillTopic')}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <textarea
        value={draft}
        onChange={(e) => { setDraft(e.target.value); setSaveMessage(''); setSaveError('') }}
        dir={getTextDirection(draft)}
        className="flex-1 bg-paper border border-border rounded-2xl p-6 post-output post-editor text-ink leading-relaxed min-h-[300px] overflow-y-auto scrollbar-thin resize-none focus:outline-none focus:border-amber transition-colors"
      />

      {/* Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
        {providerInfo && (
          <span className="text-xs text-muted">
            {providerInfo.plan_type === 'free'
              ? `⚡ ${t('freeAnalysis')}`
              : `🔑 ${providerInfo.provider} · ${providerInfo.model}`}
          </span>
        )}
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <Button id="btn-restore-ai" variant="ghost" size="sm" onClick={handleRestore}>
            {t('restoreAiDraft')}
          </Button>
          <Button
            id="btn-save-final"
            variant="amber"
            size="sm"
            onClick={handleSaveFinal}
            loading={savingFinal}
            disabled={!postId || !draft.trim()}
          >
            {t('saveFinal')}
          </Button>
          <Button
            id="btn-copy"
            variant="secondary"
            size="sm"
            onClick={handleCopy}
          >
            {copied ? `✓ ${t('copied')}` : t('copy')}
          </Button>
        </div>
      </div>

      {saveMessage && <p className="mt-3 text-xs text-emerald-deep">{saveMessage}</p>}
      {saveError && <p className="mt-3 text-xs text-red-500">{saveError}</p>}
    </div>
  )
}
