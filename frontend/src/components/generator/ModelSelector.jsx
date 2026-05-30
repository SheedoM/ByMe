import { useEffect, useState } from 'react'
import { getProviderSettings } from '../../services/userSettings'
import { Link } from 'react-router-dom'
import Badge from '../ui/Badge'

export default function ModelSelector() {
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    getProviderSettings()
      .then(({ data }) => setSettings(data))
      .catch(() => {})
  }, [])

  if (!settings) return null

  if (settings.plan_type === 'free' || !settings.byok_provider) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="amber">⚡ ByMe Free · Gemini Flash</Badge>
        <Link
          to="/settings"
          className="text-xs text-muted underline underline-offset-2 hover:text-ink transition-colors"
        >
          Use my own key
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
        Change
      </Link>
    </div>
  )
}
