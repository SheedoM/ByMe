const DEFAULT_AUTH_REDIRECT = '/app'

export function getSafeRedirectPath(value, fallback = DEFAULT_AUTH_REDIRECT) {
  if (!value || typeof value !== 'string') return fallback
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return fallback
  }

  try {
    const parsed = new URL(value, 'https://byme.local')
    if (parsed.origin !== 'https://byme.local') return fallback
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || fallback
  } catch {
    return fallback
  }
}

export function buildLoginRedirect(pathname = '/', search = '', hash = '') {
  const target = getSafeRedirectPath(`${pathname || '/'}${search || ''}${hash || ''}`, '/app')
  return `/login?redirectTo=${encodeURIComponent(target)}`
}
