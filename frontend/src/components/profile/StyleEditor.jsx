import { useState } from 'react'
import { updateStyleProfile } from '../../services/style'
import Input from '../ui/Input'
import Textarea from '../ui/Textarea'
import Button from '../ui/Button'

const TONE_OPTIONS = [
  'conversational', 'educational', 'inspirational',
  'analytical', 'personal', 'blunt', 'storytelling',
]

const STRUCTURE_OPTIONS = ['prose', 'bullets', 'mixed']
const PARAGRAPH_OPTIONS = ['short', 'medium', 'long']
const EMOJI_OPTIONS     = ['none', 'minimal', 'moderate', 'heavy']

export default function StyleEditor({ profile, onSaved }) {
  const [form,    setForm]    = useState({ ...profile })
  const [saving,  setSaving]  = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState('')

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess(false)
    try {
      await updateStyleProfile({
        tone:                form.tone,
        formality_level:     parseInt(form.formality_level, 10),
        avg_post_length:     parseInt(form.avg_post_length, 10),
        emoji_usage:         form.emoji_usage,
        structure_preference:form.structure_preference,
        paragraph_length:    form.paragraph_length,
        storytelling_style:  form.storytelling_style,
        vocabulary_notes:    form.vocabulary_notes,
        raw_summary:         form.raw_summary,
        opening_patterns:    form.opening_patterns,
        closing_patterns:    form.closing_patterns,
      })
      setSuccess(true)
      onSaved?.()
      setTimeout(() => setSuccess(false), 3000)
    } catch (e) {
      setError(e.response?.data?.detail || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Tone */}
      <div>
        <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Tone</p>
        <div className="flex flex-wrap gap-2">
          {TONE_OPTIONS.map((t) => (
            <button
              key={t}
              onClick={() => set('tone', t)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors capitalize
                ${form.tone === t
                  ? 'bg-ink text-paper border-ink'
                  : 'bg-paper text-muted border-border hover:border-muted hover:text-ink'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Formality */}
      <div>
        <label className="text-xs font-medium text-muted uppercase tracking-wide">
          Formality — {form.formality_level} / 10
        </label>
        <input
          type="range" min={1} max={10} step={1}
          value={form.formality_level}
          onChange={(e) => set('formality_level', e.target.value)}
          className="w-full mt-2 accent-amber"
        />
        <div className="flex justify-between text-xs text-muted mt-1">
          <span>Very casual</span><span>Very formal</span>
        </div>
      </div>

      {/* Avg post length */}
      <Input
        id="avg-post-length"
        label="Typical post length (words)"
        type="number"
        value={form.avg_post_length}
        onChange={(e) => set('avg_post_length', e.target.value)}
      />

      {/* Structure */}
      <div>
        <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Structure</p>
        <div className="flex gap-2">
          {STRUCTURE_OPTIONS.map((s) => (
            <button key={s}
              onClick={() => set('structure_preference', s)}
              className={`flex-1 text-xs px-3 py-2 rounded-xl border transition-colors capitalize
                ${form.structure_preference === s
                  ? 'bg-ink text-paper border-ink'
                  : 'bg-paper text-muted border-border hover:border-muted'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Paragraph length */}
      <div>
        <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Paragraph length</p>
        <div className="flex gap-2">
          {PARAGRAPH_OPTIONS.map((p) => (
            <button key={p}
              onClick={() => set('paragraph_length', p)}
              className={`flex-1 text-xs px-3 py-2 rounded-xl border transition-colors capitalize
                ${form.paragraph_length === p
                  ? 'bg-ink text-paper border-ink'
                  : 'bg-paper text-muted border-border hover:border-muted'}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Emoji usage */}
      <div>
        <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Emoji usage</p>
        <div className="flex gap-2 flex-wrap">
          {EMOJI_OPTIONS.map((e) => (
            <button key={e}
              onClick={() => set('emoji_usage', e)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors capitalize
                ${form.emoji_usage === e
                  ? 'bg-ink text-paper border-ink'
                  : 'bg-paper text-muted border-border hover:border-muted'}`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Storytelling style */}
      <Textarea
        id="storytelling-style"
        label="Storytelling style"
        value={form.storytelling_style || ''}
        onChange={(e) => set('storytelling_style', e.target.value)}
        rows={3}
        placeholder="How do you tell stories or make points?"
      />

      {/* Vocabulary notes */}
      <Textarea
        id="vocabulary-notes"
        label="Vocabulary notes"
        value={form.vocabulary_notes || ''}
        onChange={(e) => set('vocabulary_notes', e.target.value)}
        rows={2}
        placeholder="Phrases you use often, words you avoid…"
      />

      {/* Summary */}
      <Textarea
        id="raw-summary"
        label="Voice summary"
        value={form.raw_summary || ''}
        onChange={(e) => set('raw_summary', e.target.value)}
        rows={3}
        placeholder="A short description of your writing voice"
      />

      {error   && <p className="text-sm text-red-500">{error}</p>}
      {success && <p className="text-sm text-emerald-deep">✓ Style profile updated</p>}

      <Button id="btn-save-style" onClick={handleSave} loading={saving} fullWidth size="lg">
        Save changes
      </Button>
    </div>
  )
}
