import { useLanguage } from '../../i18n'

export default function LanguageToggle({ compact = false }) {
  const { locale, setLocale, t } = useLanguage()

  return (
    <div className="inline-flex rounded-xl border border-border bg-surface/60 p-1">
      {[
        { id: 'en', label: compact ? 'EN' : t('langEnglish') },
        { id: 'ar', label: compact ? 'AR' : t('langArabic') },
      ].map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => setLocale(option.id)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            locale === option.id
              ? 'bg-ink text-paper'
              : 'text-muted hover:text-ink'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
