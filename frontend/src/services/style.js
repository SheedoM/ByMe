import api from './api'

export const uploadPosts = (file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/style/upload', form)
}

export const selectPostCount    = (count) => api.post('/style/select', { count })
export const selectPostIds      = (ids)   => api.post('/style/select', { ids })
export const getRawPosts        = ()      => api.get('/style/posts')
export const exportStyleProfile = ()      => api.get('/style/export')
export const uploadAnalytics    = (file)  => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/style/analytics-upload', form)
}
export const createStarterProfile = (data) => api.post('/style/starter-profile', data)
export const getStyleStatus     = () => api.get('/style/status')
export const analyzeStyle       = () => api.post('/style/analyze')
export const getStyleProfile    = () => api.get('/style/profile')
export const updateStyleProfile = (updates) => api.put('/style/profile', updates)
