const LOCAL_API_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

export function validateFrontendEnv({ mode, env = {}, processEnv = process.env } = {}) {
  const isVercelBuild = processEnv.VERCEL === '1' || Boolean(processEnv.VERCEL_ENV)
  const isProductionBuild = mode === 'production'

  if (!isVercelBuild || !isProductionBuild) return

  const apiUrl = env.VITE_API_URL?.trim()
  if (!apiUrl) {
    throw new Error(
      'VITE_API_URL is required for Vercel production builds. Set it to your Render backend URL, for example https://your-service.onrender.com.',
    )
  }

  let parsedUrl
  try {
    parsedUrl = new URL(apiUrl)
  } catch {
    throw new Error(`VITE_API_URL must be a valid absolute URL. Received: ${apiUrl}`)
  }

  if (LOCAL_API_HOSTS.has(parsedUrl.hostname)) {
    throw new Error(
      'VITE_API_URL must point to your deployed backend during Vercel production builds, not localhost. Set it to your Render URL.',
    )
  }
}
