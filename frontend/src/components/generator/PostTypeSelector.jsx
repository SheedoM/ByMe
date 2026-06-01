import { useLanguage } from '../../i18n'

export default function PostTypeSelector({ value, onChange }) {
  const { t } = useLanguage()
  const postTypes = [
    { id: 'story',       label: t('postTypeStory'),       desc: t('postTypeStoryDesc') },
    { id: 'hot_take',    label: t('postTypeHotTake'),     desc: t('postTypeHotTakeDesc') },
    { id: 'lesson',      label: t('postTypeLesson'),      desc: t('postTypeLessonDesc') },
    { id: 'observation', label: t('postTypeObservation'), desc: t('postTypeObservationDesc') },
    { id: 'update',      label: t('postTypeUpdate'),      desc: t('postTypeUpdateDesc') },
  ]

  return (
    <div>
      <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
        {t('postType')}
      </p>
      <div className="flex flex-wrap gap-2">
        {postTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => onChange(type.id)}
            title={type.desc}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              value === type.id
                ? 'bg-ink text-paper border-ink'
                : 'bg-transparent text-muted border-border hover:border-muted hover:text-ink'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>
    </div>
  )
}
