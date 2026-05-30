import api from './api'

export const uploadPosts = (file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/style/upload', form)
}

export const getStyleStatus  = () => api.get('/style/status')
export const getStyleProfile = () => api.get('/style/profile')
export const updateStyleProfile = (updates) => api.put('/style/profile', updates)
