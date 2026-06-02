import { useState } from 'react'
import { exportStyleProfile } from '../../services/style'
import Button from '../ui/Button'
import { useLanguage } from '../../i18n'

export default function ExportStyleProfile() {
  const { t } = useLanguage()
  const [loading,   setLoading]   = useState(false)
  const [copied,    setCopied]    = useState(false)
  const [error,     setError]     = useState('')

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
    <div className="mt-8 p-6 bg-surface/40 border border-border rounded-2xl">
      <h2 className="font-medium text-ink mb-1">{t('exportTitle')}</h2>
      <p className="text-xs text-muted leading-relaxed mb-1">{t('exportCopy')}</p>
      <p className="text-xs text-muted leading-relaxed mb-5">{t('exportCopy2')}</p>

      {error && (
        <p className="mb-4 text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopy}
          loading={loading && !copied}
          disabled={loading}
        >
          {copied ? t('exportCopied') : (loading ? t('exportGenerating') : t('exportCopyBtn'))}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleDownload}
          loading={loading}
          disabled={loading}
        >
          {t('exportDownloadBtn')}
        </Button>
      </div>
    </div>
  )
}
