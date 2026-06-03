import axios from 'axios'
import { supabase } from './supabaseClient'
import { buildLoginRedirect } from '../utils/authRedirect'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

// Inject JWT into every request automatically
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})

// On 401: try refreshing the session once and retry. If refresh fails, the
// session is genuinely dead — sign out and send the user to login (once).
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const status = error.response?.status

    if (status === 401 && original) {
      if (!original._retried) {
        original._retried = true
        const { data, error: refreshError } = await supabase.auth.refreshSession()
        if (!refreshError && data?.session?.access_token) {
          original.headers = original.headers || {}
          original.headers.Authorization = `Bearer ${data.session.access_token}`
          return api(original)
        }
      }

      // Refresh failed, or the refreshed token was still rejected by the API.
      await supabase.auth.signOut()
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign(
          buildLoginRedirect(window.location.pathname, window.location.search, window.location.hash),
        )
      }
    }

    return Promise.reject(error)
  }
)

export default api
