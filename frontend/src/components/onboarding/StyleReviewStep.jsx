import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStyleProfile } from '../../services/style'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import Spinner from '../ui/Spinner'
import { useLanguage } from '../../i18n'

const EMOJI_LABELS = {
  none: 'No emojis',
  minimal: 'Minimal (1–2)',
  moderate: 'Moderate',
  heavy: 'Heavy',
}

export default function StyleReviewStep() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getStyleProfile()
      .then(({ data }) => setProfile(data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex justify-center"><Spinner size="lg" /></div>
  }

  if (!profile) {
    return (
      <div className="text-center">
        <p className="text-muted">Could not load profile. Please refresh.</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl animate-slide-up">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-2 h-2 bg-emerald-deep rounded-full" />
        <span className="text-xs font-medium text-emerald-deep uppercase tracking-wide">
          {t('profileReady')}
        </span>
      </div>
      <h1 className="font-serif text-4xl font-light text-ink mb-2">
        {t('reviewTitle')}
      </h1>
      <p className="text-muted text-sm mb-8">
        {profile.posts_analyzed > 0
          ? t('reviewCopy', { count: profile.posts_analyzed })
          : t('starterReviewCopy')}
      </p>

      {/* Voice summary */}
      <div className="bg-amber-light border border-amber/30 rounded-2xl p-5 mb-5">
        <p className="text-xs font-medium text-amber-dark uppercase tracking-wide mb-2">
          {t('voiceSummary')}
        </p>
        <p className="text-sm text-ink leading-relaxed italic">&ldquo;{profile.raw_summary}&rdquo;</p>
      </div>

      {/* Style grid */}
      <div className="grid sm:grid-cols-2 gap-3 mb-5">
        <StatCard label={t('tone')} value={profile.tone} />
        <StatCard label={t('formality')} value={`${profile.formality_level} / 10`} />
        <StatCard label={t('avgLength')} value={`~${profile.avg_post_length} words`} />
        <StatCard label={t('structure')} value={profile.structure_preference} />
        <StatCard label={t('paragraphs')} value={profile.paragraph_length} />
        <StatCard label={t('emojiUsage')} value={EMOJI_LABELS[profile.emoji_usage] || profile.emoji_usage} />
      </div>

      {profile.language_style_notes && (
        <div className="mb-5">
          <p className="text-xs text-muted uppercase tracking-wide mb-2">{t('languageStyle')}</p>
          <p className="text-sm text-ink leading-relaxed">{profile.language_style_notes}</p>
        </div>
      )}

      {/* Opening / closing patterns */}
      {profile.opening_patterns?.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-muted uppercase tracking-wide mb-2">{t('openingPatterns')}</p>
          <div className="flex flex-wrap gap-2">
            {profile.opening_patterns.map((p, i) => (
              <Badge key={i} variant="default">{p}</Badge>
            ))}
          </div>
        </div>
      )}

      {profile.closing_patterns?.length > 0 && (
        <div className="mb-5">
          <p className="text-xs text-muted uppercase tracking-wide mb-2">{t('closingPatterns')}</p>
          <div className="flex flex-wrap gap-2">
            {profile.closing_patterns.map((p, i) => (
              <Badge key={i} variant="default">{p}</Badge>
            ))}
          </div>
        </div>
      )}

      <Button
        id="btn-start-generating"
        onClick={() => navigate('/app')}
        fullWidth
        size="lg"
      >
        {t('startGenerating')} →
      </Button>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="bg-surface rounded-xl px-4 py-3">
      <p className="text-xs text-muted uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-ink font-medium capitalize">{value}</p>
    </div>
  )
}
