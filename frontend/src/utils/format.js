/** Format a date string to a human-readable short form */
export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Truncate text to maxLength characters */
export function truncate(text, maxLength = 120) {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '…'
}

/** Copy text to clipboard */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** Format a provider name for display */
export function formatProviderLabel(provider) {
  const map = {
    claude: 'Claude',
    openai: 'OpenAI',
    gemini: 'Gemini',
    openrouter: 'OpenRouter',
  }
  return map[provider] || provider
}

/** Format a model name for display */
export function formatModelLabel(model) {
  if (!model) return ''
  // Strip date suffixes like -20241022
  return model.replace(/-\d{8}$/, '').replace(/-/g, ' ')
}
