import { useState } from 'react'
import { copyToClipboard } from '../../utils/format'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'

export default function OutputPanel({ output, loading, providerInfo }) {
  const [copied, setCopied] = useState(false)

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
        <p className="text-sm text-muted animate-pulse">Writing in your voice…</p>
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
          Your post will appear here.
        </p>
        <p className="text-xs text-muted/60">
          Fill in the topic and key points, then hit &ldquo;Write my post&rdquo;.
        </p>
      </div>
    )
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
              ? '⚡ ByMe Free · Gemini Flash'
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
          {copied ? '✓ Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  )
}
