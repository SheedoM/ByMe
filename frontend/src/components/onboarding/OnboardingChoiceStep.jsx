import Button from '../ui/Button'
import { useLanguage } from '../../i18n'

export default function OnboardingChoiceStep({ onImport, onManual }) {
  const { t } = useLanguage()

  return (
    <div className="w-full max-w-2xl animate-slide-up">
      <h1 className="font-serif text-4xl font-light text-ink mb-3 text-center">
        {t('onboardingChoiceTitle')}
      </h1>
      <p className="text-muted text-sm mb-8 leading-relaxed text-center">
        {t('onboardingChoiceCopy')}
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <ChoiceCard
          title={t('importLinkedInTitle')}
          copy={t('importLinkedInCopy')}
          action={t('importLinkedInAction')}
          onClick={onImport}
        />
        <ChoiceCard
          title={t('manualSetupTitle')}
          copy={t('manualSetupCopy')}
          action={t('manualSetupAction')}
          onClick={onManual}
        />
      </div>
    </div>
  )
}

function ChoiceCard({ title, copy, action, onClick }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col">
      <h2 className="font-medium text-ink mb-2">{title}</h2>
      <p className="text-sm text-muted leading-relaxed mb-5 flex-1">{copy}</p>
      <Button onClick={onClick} variant="secondary" fullWidth>
        {action}
      </Button>
    </div>
  )
}
