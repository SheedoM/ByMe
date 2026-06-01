import { useState } from 'react'
import { copyToClipboard } from '../../utils/format'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'
import { submitFeedback } from '../../services/generate'
import { useLanguage } from '../../i18n'

export default function OutputPanel({ output, loading, providerInfo, postId }) {
  const { t } = useLanguage()
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [fbSaving, setFbSaving] = useState(false)

  const handleCopy = async () => {
    const ok = await copyToClipboard(output)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
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

  const handleFeedback = async (rating) => {
    if (!postId || feedback) return
    setFbSaving(true)
    try {
      await submitFeedback(postId, rating)
      setFeedback(rating)
    } catch {
      // fail silently — feedback is non-critical
    } finally {
      setFbSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Post output */}
      <div className="flex-1 bg-paper border border-border rounded-2xl p-6 post-output text-ink leading-relaxed min-h-[300px] overflow-y-auto scrollbar-thin">
        {output}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4">
        {providerInfo && (
          <span className="text-xs text-muted">
            {providerInfo.plan_type === 'free'
              ? '⚡ ByMe Free · Powered by Gemini'
              : `🔑 ${providerInfo.provider} · ${providerInfo.model}`}
          </span>
        )}
        <Button
          id="btn-copy"
          variant="secondary"
          size="sm"
          onClick={handleCopy}
          className="ml-auto"
        >
          {copied ? `✓ ${t('copied')}` : t('copy')}
        </Button>
      </div>

      {/* Feedback row — only shown after generation, disappears after rating */}
      {output && postId && !feedback && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted mb-2">{t('feedbackQuestion')}</p>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'nailed_it', label: `✓ ${t('nailedIt')}` },
              { id: 'almost',    label: `~ ${t('almost')}`    },
              { id: 'not_quite', label: `✗ ${t('notQuite')}` },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => handleFeedback(id)}
                disabled={fbSaving}
                className="text-xs px-3 py-1.5 rounded-full border border-border
                           min-w-[6.25rem] whitespace-nowrap text-center
                           text-muted hover:border-muted hover:text-ink
                           transition-all disabled:opacity-40"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Thank-you state after feedback submitted */}
      {feedback && (
        <p className="mt-4 pt-4 border-t border-border text-xs text-muted">
          {t('feedbackThanks')}
        </p>
      )}
    </div>
  )
}
