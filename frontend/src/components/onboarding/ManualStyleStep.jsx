import { useState } from 'react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Textarea from '../ui/Textarea'
import { createStarterProfile } from '../../services/style'
import { useLanguage } from '../../i18n'

const TONE_OPTIONS = ['conversational', 'educational', 'analytical', 'personal', 'blunt', 'storytelling']
const STRUCTURE_OPTIONS = ['prose', 'bullets', 'mixed']
const PARAGRAPH_OPTIONS = ['short', 'medium', 'long']
const EMOJI_OPTIONS = ['none', 'minimal', 'moderate', 'heavy']

export default function ManualStyleStep({ onDone }) {
  const { t } = useLanguage()
  const [form, setForm] = useState({
    language_style_notes: '',
    tone: 'conversational',
    formality_level: 5,
    avg_post_length: 130,
    structure_preference: 'prose',
    paragraph_length: 'short',
    emoji_usage: 'minimal',
    storytelling_style: '',
    vocabulary_notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const handleSubmit = async () => {
    setSaving(true)
    setError('')
    try {
      await createStarterProfile({
        ...form,
        formality_level: Number(form.formality_level),
        avg_post_length: Number(form.avg_post_length),
      })
      onDone()
    } catch (e) {
      setError(e.response?.data?.detail || t('manualSetupError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full max-w-2xl animate-slide-up">
      <h1 className="font-serif text-4xl font-light text-ink mb-2">
        {t('manualStyleTitle')}
      </h1>
      <p className="text-muted text-sm mb-6">
        {t('manualStyleCopy')}
      </p>

      <div className="space-y-5">
        <Textarea
          id="manual-language"
          label={t('languageStyle')}
          value={form.language_style_notes}
          onChange={(e) => set('language_style_notes', e.target.value)}
          rows={2}
          placeholder={t('manualLanguagePlaceholder')}
        />

        <OptionGroup label={t('tone')} options={TONE_OPTIONS} value={form.tone} onChange={(v) => set('tone', v)} />

        <div>
          <label className="text-xs font-medium text-muted uppercase tracking-wide">
            {t('formality')} - {form.formality_level} / 10
          </label>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={form.formality_level}
            onChange={(e) => set('formality_level', e.target.value)}
            className="w-full mt-2 accent-amber"
          />
          <div className="flex justify-between text-xs text-muted mt-1">
            <span>{t('veryCasual')}</span>
            <span>{t('veryFormal')}</span>
          </div>
        </div>

        <Input
          id="manual-length"
          label={t('avgLength')}
          type="number"
          value={form.avg_post_length}
          onChange={(e) => set('avg_post_length', e.target.value)}
        />

        <OptionGroup
          label={t('structure')}
          options={STRUCTURE_OPTIONS}
          value={form.structure_preference}
          onChange={(v) => set('structure_preference', v)}
        />
        <OptionGroup
          label={t('paragraphs')}
          options={PARAGRAPH_OPTIONS}
          value={form.paragraph_length}
          onChange={(v) => set('paragraph_length', v)}
        />
        <OptionGroup
          label={t('emojiUsage')}
          options={EMOJI_OPTIONS}
          value={form.emoji_usage}
          onChange={(v) => set('emoji_usage', v)}
        />

        <Textarea
          id="manual-storytelling"
          label={t('storytellingStyle')}
          value={form.storytelling_style}
          onChange={(e) => set('storytelling_style', e.target.value)}
          rows={3}
          placeholder={t('storytellingPlaceholder')}
        />
        <Textarea
          id="manual-vocabulary"
          label={t('vocabularyNotes')}
          value={form.vocabulary_notes}
          onChange={(e) => set('vocabulary_notes', e.target.value)}
          rows={2}
          placeholder={t('vocabularyPlaceholder')}
        />

        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <Button onClick={handleSubmit} loading={saving} fullWidth size="lg">
          {t('manualStyleContinue')} →
        </Button>
      </div>
    </div>
  )
}

function OptionGroup({ label, options, value, onChange }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors capitalize
              ${value === option
                ? 'bg-ink text-paper border-ink'
                : 'bg-paper text-muted border-border hover:border-muted hover:text-ink'}`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}
