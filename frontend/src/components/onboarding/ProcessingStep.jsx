import { useEffect, useState } from 'react'
import { getStyleStatus, analyzeStyle } from '../../services/style'
import Spinner from '../ui/Spinner'
import Button from '../ui/Button'
import { useLanguage } from '../../i18n'

export default function ProcessingStep({ onDone }) {
  const { t } = useLanguage()
  const messages = t('processingMessages')
  const [msgIndex, setMsgIndex] = useState(0)
  const [elapsed,  setElapsed]  = useState(0)
  const [failure,  setFailure]  = useState(null)   // null | 'busy' | 'error'
  const [retrying, setRetrying] = useState(false)

  // Cycle status messages + count elapsed seconds while processing.
  useEffect(() => {
    if (failure) return
    const msgTimer = setInterval(() => setMsgIndex((i) => (i + 1) % messages.length), 3000)
    const secTimer = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => { clearInterval(msgTimer); clearInterval(secTimer) }
  }, [failure, messages.length])

  // Poll backend status while processing.
  useEffect(() => {
    if (failure) return
    const interval = setInterval(async () => {
      try {
        const { data } = await getStyleStatus()
        if (data.status === 'ready') {
          clearInterval(interval)
          onDone()
        } else if (data.status === 'failed') {
          clearInterval(interval)
          setFailure(data.reason === 'busy' ? 'busy' : 'error')
        }
      } catch {
        // network hiccup — keep polling
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [failure, onDone])

  // Retry re-runs analysis on the already-uploaded posts — no re-upload needed.
  const handleRetry = async () => {
    setRetrying(true)
    try {
      await analyzeStyle()
      setElapsed(0)
      setMsgIndex(0)
      setFailure(null)   // resumes the timers + polling effects
    } catch {
      setFailure('error')
    } finally {
      setRetrying(false)
    }
  }

  if (failure) {
    const busy = failure === 'busy'
    return (
      <div className="w-full max-w-md text-center animate-fade-in">
        <div className="text-4xl mb-4">{busy ? '⏳' : '⚠'}</div>
        <h2 className="font-serif text-2xl font-light text-ink mb-3">
          {busy ? t('processingBusyTitle') : t('processingFailedTitle')}
        </h2>
        <p className="text-muted text-sm mb-6 leading-relaxed">
          {busy ? t('processingBusyCopy') : t('processingFailedCopy')}
        </p>
        <Button onClick={handleRetry} loading={retrying} fullWidth size="lg">
          {t('tryAgain')}
        </Button>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 text-sm underline text-muted hover:text-ink transition-colors"
        >
          {t('startOver')}
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm text-center animate-fade-in">
      <div className="flex justify-center mb-8">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-2 border-amber/20 animate-pulse-slow" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        </div>
      </div>

      <h2 className="font-serif text-3xl font-light text-ink mb-3">
        {t('processingTitle')}
      </h2>
      <p key={msgIndex} className="text-muted text-sm animate-fade-in transition-all">
        {messages[msgIndex]}
      </p>
      <p className="text-xs text-muted/60 mt-4">
        {t('processingTimeRange')} · {elapsed}s
      </p>
    </div>
  )
}
