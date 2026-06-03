import { Link } from 'react-router-dom'
import Badge from '../ui/Badge'
import { useLanguage } from '../../i18n'

export default function ModelSelector({ settings }) {
  const { t } = useLanguage()
  if (!settings) return null

  if (settings.plan_type === 'free' || !settings.byok_provider) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="amber">⚡ {t('freeAnalysis')}</Badge>
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
    openrouter: 'OpenRouter',
  }[settings.byok_provider] || settings.byok_provider

  const modelShort = settings.byok_model
    ? settings.byok_model.replace(/-\d{8}$/, '')
    : settings.byok_provider

  return (
    <div className="flex items-center gap-2">
      <Badge variant={settings.byok_provider === 'openrouter' ? 'amber' : 'ink'}>
        {settings.byok_provider === 'openrouter' ? '🎁' : '🔑'}{' '}
        {settings.byok_provider === 'openrouter' ? t('freeKeyAnalysis') : providerLabel} · {modelShort}
      </Badge>
      <Link
        to="/settings"
        className="text-xs text-muted underline underline-offset-2 hover:text-ink transition-colors"
      >
        {t('changePlan')}
      </Link>
    </div>
  )
}
