import axios from 'axios'
import { supabase } from './supabaseClient'

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

// Global error handler — just reject, let callers handle errors.
// Do NOT sign out or hard-redirect on 401; that causes redirect loops.
api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
)

export default api
