import { useState } from 'react'
import { exportStyleProfile } from '../../services/style'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { useLanguage } from '../../i18n'

export default function ExportStyleProfile({ isOpen, onClose }) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [copied,  setCopied]  = useState(false)
  const [error,   setError]   = useState('')

  const fetchPackage = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await exportStyleProfile()
      return data
    } catch {
      setError('Could not generate export. Please try again.')
      return null
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    const data = await fetchPackage()
    if (!data) return
    try {
      await navigator.clipboard.writeText(data.full_package)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setError('Copy failed — try the download button instead.')
    }
  }

  const handleDownload = async () => {
    const data = await fetchPackage()
    if (!data) return
    const blob = new Blob([data.full_package], { type: 'text/plain;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'byme-style-profile.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('exportTitle')} maxWidth="max-w-lg">
      <div className="space-y-4">
        <p className="text-sm text-muted leading-relaxed">{t('exportCopy')}</p>
        <p className="text-sm text-muted leading-relaxed">{t('exportCopy2')}</p>

        {/* How-to steps */}
        <div className="bg-surface/60 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-medium text-muted uppercase tracking-wide mb-3">How to use it</p>
          {[
            { n: '1', text: 'Download or copy the prompt package below.' },
            { n: '2', text: 'Open ChatGPT, Claude, or Gemini.' },
            { n: '3', text: 'Paste the SYSTEM PROMPT as your custom instruction or at the start of the conversation.' },
            { n: '4', text: 'Use the included POST TEMPLATE to generate posts in your voice.' },
          ].map(({ n, text }) => (
            <div key={n} className="flex gap-3 text-sm text-muted">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber/20 text-amber text-xs
                               flex items-center justify-center font-medium mt-0.5">
                {n}
              </span>
              <span className="leading-relaxed">{text}</span>
            </div>
          ))}
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <Button
            onClick={handleCopy}
            loading={loading && !copied}
            disabled={loading}
            fullWidth
          >
            {copied ? t('exportCopied') : (loading ? t('exportGenerating') : t('exportCopyBtn'))}
          </Button>
          <Button
            variant="secondary"
            onClick={handleDownload}
            loading={loading}
            disabled={loading}
            fullWidth
          >
            {t('exportDownloadBtn')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
