import { Link } from 'react-router-dom'
import Badge from '../ui/Badge'
import { useLanguage } from '../../i18n'

export default function ModelSelector({ settings }) {
  const { t } = useLanguage()
  if (!settings) return null

  if (settings.plan_type === 'free' || !settings.byok_provider) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="amber">⚡ ByMe Free · Powered by Gemini</Badge>
        <Link
          to="/settings"
          className="text-xs text-muted underline underline-offset-2 hover:text-ink transition-colors"
        >
          {t('byokAnalysis')}
        </Link>
      </div>
    )
  }

  const providerLabel = {
    claude: 'Claude',
    openai: 'OpenAI',
    gemini: 'Gemini',
  }[settings.byok_provider] || settings.byok_provider

  const modelShort = settings.byok_model
    ? settings.byok_model.replace(/-\d{8}$/, '')
    : settings.byok_provider

  return (
    <div className="flex items-center gap-2">
      <Badge variant="ink">🔑 {providerLabel} · {modelShort}</Badge>
      <Link
        to="/settings"
        className="text-xs text-muted underline underline-offset-2 hover:text-ink transition-colors"
      >
        {t('changePlan')}
      </Link>
    </div>
  )
}
