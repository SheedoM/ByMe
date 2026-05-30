import { useState, useRef } from 'react'
import { uploadPosts } from '../../services/style'
import Button from '../ui/Button'

export default function UploadStep({ onDone }) {
  const [dragging,  setDragging]  = useState(false)
  const [file,      setFile]      = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState('')
  const inputRef = useRef(null)

  const handleFile = (f) => {
    if (!f) return
    if (!f.name.endsWith('.csv')) {
      setError('Please upload a .csv file from LinkedIn.')
      return
    }
    setFile(f)
    setError('')
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
      await uploadPosts(file)
      onDone()
    } catch (e) {
      setError(e.response?.data?.detail || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="w-full max-w-lg animate-slide-up">
      <h1 className="font-serif text-4xl font-light text-ink mb-2">
        Upload your posts
      </h1>
      <p className="text-muted text-sm mb-8 leading-relaxed">
        Export your LinkedIn posts (Settings → Data Privacy → Posts),
        then upload the <code className="bg-surface px-1.5 py-0.5 rounded text-xs">Share.csv</code> file here.
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
          accept=".csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {file ? (
          <>
            <div className="text-3xl mb-2">✓</div>
            <p className="text-sm font-medium text-ink">{file.name}</p>
            <p className="text-xs text-muted mt-1">
              {(file.size / 1024).toFixed(0)} KB · click to change
            </p>
          </>
        ) : (
          <>
            <div className="text-3xl mb-3 opacity-30">↑</div>
            <p className="text-sm text-ink font-medium">Drop your CSV here</p>
            <p className="text-xs text-muted mt-1">or click to browse</p>
          </>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
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
        Analyse my writing style →
      </Button>

      <p className="text-center text-xs text-muted mt-4">
        We analyse your posts to extract your style. Nothing is sold or shared.
      </p>
    </div>
  )
}
