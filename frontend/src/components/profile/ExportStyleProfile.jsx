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
      setError('Copy failed — try downloading instead.')
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
      <div className="space-y-5">
        <p className="text-sm text-muted leading-relaxed">{t('exportCopy')}</p>

        {/* How-to steps */}
        <div className="bg-surface/60 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-medium text-muted uppercase tracking-wide">How to use</p>
          {[
            'Paste the SYSTEM PROMPT as a Custom Instruction in ChatGPT, a Project instruction in Claude, or at the start of any conversation in Gemini.',
            'Each time you want a new post, use the included POST TEMPLATE — fill in your idea and post type.',
            'The system prompt is reusable. You only need to paste it once per conversation or project.',
          ].map((text, i) => (
            <div key={i} className="flex gap-3 text-sm text-muted">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber/20 text-amber text-xs
                               flex items-center justify-center font-medium mt-0.5">
                {i + 1}
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

        {/* Unified copy/download — same content, two delivery options */}
        <div className="space-y-3">
          <p className="text-xs text-muted">{t('exportSameContent')}</p>
          <div className="flex gap-3">
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
      </div>
    </Modal>
  )
}
