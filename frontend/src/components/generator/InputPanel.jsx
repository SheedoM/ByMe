import { useRef, useState } from 'react'
import Button from '../ui/Button'
import PostTypeSelector from './PostTypeSelector'
import HookVariants from './HookVariants'
import { useLanguage } from '../../i18n'

export default function InputPanel({
  idea, setIdea,
  postType, setPostType,
  selectedHook, setSelectedHook,
  onGenerate,
  loading,
  error,
}) {
  const { t, locale } = useLanguage()
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef(null)

  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      alert(t('ideaVoiceUnsupported'))
      return
    }

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = locale === 'ar' ? 'ar-EG' : 'en-US'

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .slice(event.resultIndex)
        .filter((r) => r.isFinal)
        .map((r) => r[0].transcript)
        .join(' ')
      if (transcript) {
        setIdea((prev) => prev ? prev + ' ' + transcript : transcript)
      }
    }

    recognition.onerror = () => setIsListening(false)
    recognition.onend   = () => setIsListening(false)

    recognition.start()
    recognitionRef.current = recognition
    setIsListening(true)
  }

  const canGenerate = idea.trim() && selectedHook

  return (
    <div className="flex flex-col gap-5">
      {/* Post type */}
      <PostTypeSelector value={postType} onChange={setPostType} />

      {/* Idea textarea + voice */}
      <div>
        <label className="text-xs font-medium text-muted uppercase tracking-wide block mb-2">
          {t('topic')}
        </label>
        <div className="relative">
          <textarea
            id="idea"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder={t('topicPlaceholder')}
            rows={5}
            className="w-full bg-paper border border-border rounded-2xl px-4 py-3 text-sm text-ink
                       placeholder-muted/60 resize-none focus:outline-none focus:border-amber
                       transition-colors leading-relaxed pr-10"
          />
          {/* Voice button */}
          <button
            type="button"
            onClick={toggleVoice}
            title={isListening ? t('ideaVoiceStop') : t('ideaVoiceStart')}
            className={`absolute bottom-3 right-3 w-7 h-7 flex items-center justify-center
                        rounded-full transition-all
                        ${isListening
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-surface border border-border text-muted hover:text-ink hover:border-muted'}`}
          >
            {isListening ? (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2"/>
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2z"/>
              </svg>
            )}
          </button>
        </div>
        {isListening && (
          <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse inline-block"/>
            {t('ideaVoiceStop')}
          </p>
        )}
      </div>

      {/* Hook variants — mandatory step before generate */}
      <HookVariants
        topic={idea}
        keyPoints={[]}
        selectedHook={selectedHook}
        onSelect={setSelectedHook}
      />

      {error && (
        <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {!selectedHook && idea.trim() && (
        <p className="text-xs text-muted text-center">{t('hooksRequired')}</p>
      )}

      <Button
        id="btn-generate"
        onClick={onGenerate}
        loading={loading}
        disabled={!canGenerate}
        fullWidth
        size="lg"
      >
        {loading ? t('generating') : `${t('writeFromHook')} →`}
      </Button>
    </div>
  )
}
