import { useEffect, useState } from 'react'
import { getStyleStatus } from '../../services/style'
import Spinner from '../ui/Spinner'

const messages = [
  'Reading your posts…',
  'Studying your tone…',
  'Mapping your vocabulary…',
  'Identifying your patterns…',
  'Building your voice profile…',
]

export default function ProcessingStep({ onDone }) {
  const [msgIndex, setMsgIndex] = useState(0)
  const [failed,   setFailed]   = useState(false)

  // Cycle through status messages every 3 s
  useEffect(() => {
    const t = setInterval(() => {
      setMsgIndex((i) => (i + 1) % messages.length)
    }, 3000)
    return () => clearInterval(t)
  }, [])

  // Poll backend status every 3 s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const { data } = await getStyleStatus()
        if (data.status === 'ready') {
          clearInterval(interval)
          onDone()
        } else if (data.status === 'failed') {
          clearInterval(interval)
          setFailed(true)
        }
      } catch {
        // network hiccup — keep polling
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [onDone])

  if (failed) {
    return (
      <div className="w-full max-w-md text-center animate-fade-in">
        <div className="text-4xl mb-4">⚠</div>
        <h2 className="font-serif text-2xl font-light text-ink mb-3">
          Style extraction failed
        </h2>
        <p className="text-muted text-sm mb-6">
          Something went wrong while analysing your posts.
          Please go back and try uploading again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm underline text-muted hover:text-ink transition-colors"
        >
          Start over
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm text-center animate-fade-in">
      <div className="flex justify-center mb-8">
        <div className="relative">
          {/* Outer ring */}
          <div className="w-20 h-20 rounded-full border-2 border-amber/20 animate-pulse-slow" />
          {/* Spinner */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        </div>
      </div>

      <h2 className="font-serif text-3xl font-light text-ink mb-3">
        Learning your voice
      </h2>
      <p
        key={msgIndex}
        className="text-muted text-sm animate-fade-in transition-all"
      >
        {messages[msgIndex]}
      </p>
      <p className="text-xs text-muted/60 mt-4">
        This takes about 10–20 seconds
      </p>
    </div>
  )
}
