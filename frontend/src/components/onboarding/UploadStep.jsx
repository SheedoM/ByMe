import { useState, useRef } from 'react'
import { uploadPosts } from '../../services/style'
import Button from '../ui/Button'
import { useLanguage } from '../../i18n'

export default function UploadStep({ onDone }) {
  const { t } = useLanguage()
  const [dragging,  setDragging]  = useState(false)
  const [file,      setFile]      = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState('')
  const [summary,   setSummary]   = useState('')
  const inputRef = useRef(null)

  const handleFile = (f) => {
    if (!f) return
    const lower = f.name.toLowerCase()
    if (!lower.endsWith('.zip') && !lower.endsWith('.csv') && !lower.endsWith('.xlsx')) {
      setError(t('uploadFileTypeError'))
      return
    }
    setFile(f)
    setError('')
    setSummary('')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleSubmit = async () => {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const { data } = await uploadPosts(file)
      const found = data.usable_posts_found ?? data.posts_found
      const used = data.posts_used ?? data.posts_found
      setSummary(t('importSummary', { found, used }))
      setTimeout(onDone, 900)
    } catch (e) {
      setError(e.response?.data?.detail || (e.request ? t('uploadNetworkError') : t('uploadGenericError')))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="w-full max-w-lg animate-slide-up">
      <h1 className="font-serif text-4xl font-light text-ink mb-3 text-center">
        {t('uploadTitle')}
      </h1>
      <p className="text-muted text-sm mb-3 leading-relaxed text-center">
        {t('uploadCopy')}
      </p>
      <p className="text-muted text-xs mb-8 leading-relaxed text-center">
        {t('uploadHint')}
      </p>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer
          transition-all duration-200
          ${dragging
            ? 'border-amber bg-amber-light/40 scale-[1.01]'
            : file
            ? 'border-emerald-deep/40 bg-emerald-soft/40'
            : 'border-border hover:border-muted hover:bg-surface/40'}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".zip,.csv,.xlsx"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {file ? (
          <>
            <div className="text-3xl mb-2">✓</div>
            <p className="text-sm font-medium text-ink">{file.name}</p>
            <p className="text-xs text-muted mt-1">
              {(file.size / 1024).toFixed(0)} KB · {t('clickToChange')}
            </p>
          </>
        ) : (
          <>
            <div className="text-3xl mb-3 opacity-30">↑</div>
            <p className="text-sm text-ink font-medium">{t('dropFile')}</p>
            <p className="text-xs text-muted mt-1">{t('browseFile')}</p>
          </>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {summary && (
        <p className="mt-3 text-sm text-emerald-deep bg-emerald-soft border border-emerald-deep/20 rounded-xl px-4 py-3">
          {summary}
        </p>
      )}

      <Button
        onClick={handleSubmit}
        disabled={!file}
        loading={uploading}
        fullWidth
        size="lg"
        className="mt-6"
      >
        {t('uploadButton')} →
      </Button>

      <p className="text-center text-xs text-muted mt-4">
        {t('uploadPrivacy')}
      </p>
    </div>
  )
}
