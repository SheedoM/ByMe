import Badge from '../ui/Badge'
import { useLanguage } from '../../i18n'

const EMOJI_LABELS = {
  none: 'No emojis',
  minimal: '1–2 emojis',
  moderate: 'Moderate emojis',
  heavy: 'Heavy emojis',
}

export default function StyleCard({ profile }) {
  const { t } = useLanguage()
  if (!profile) return null

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="bg-amber-light border border-amber/30 rounded-2xl p-5">
        <p className="text-xs font-medium text-amber-dark uppercase tracking-wide mb-2">
          {t('yourVoice')}
        </p>
        <p className="text-sm text-ink leading-relaxed italic">
          &ldquo;{profile.raw_summary}&rdquo;
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat label={t('tone')} value={profile.tone} />
        <Stat label={t('formality')} value={`${profile.formality_level} / 10`} />
        <Stat label={t('avgLength')} value={`~${profile.avg_post_length} words`} />
        <Stat label={t('structure')} value={profile.structure_preference} />
        <Stat label={t('paragraphs')} value={profile.paragraph_length} />
        <Stat label={t('emojiUsage')} value={EMOJI_LABELS[profile.emoji_usage] || profile.emoji_usage} />
      </div>

      {profile.language_style_notes && (
        <Detail label={t('languageStyle')} value={profile.language_style_notes} />
      )}

      {/* Opening patterns */}
      {profile.opening_patterns?.length > 0 && (
        <div>
          <p className="text-xs text-muted uppercase tracking-wide mb-2">{t('openingPatterns')}</p>
          <div className="flex flex-wrap gap-2">
            {profile.opening_patterns.map((p, i) => (
              <Badge key={i}>{p}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Closing patterns */}
      {profile.closing_patterns?.length > 0 && (
        <div>
          <p className="text-xs text-muted uppercase tracking-wide mb-2">{t('closingPatterns')}</p>
          <div className="flex flex-wrap gap-2">
            {profile.closing_patterns.map((p, i) => (
              <Badge key={i}>{p}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Storytelling / Vocabulary */}
      {profile.storytelling_style && (
        <Detail label={t('storytellingStyle')} value={profile.storytelling_style} />
      )}
      {profile.vocabulary_notes && (
        <Detail label={t('vocabularyNotes')} value={profile.vocabulary_notes} />
      )}

      <p className="text-xs text-muted">
        {t('lastUpdated', { count: profile.posts_analyzed })}
      </p>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="bg-surface rounded-xl px-4 py-3">
      <p className="text-xs text-muted uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-ink font-medium capitalize">{value}</p>
    </div>
  )
}

function Detail({ label, value }) {
  return (
    <div className="border-l-2 border-amber pl-4">
      <p className="text-xs text-muted uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-ink leading-relaxed">{value}</p>
    </div>
  )
}
