import api from './api'

export const generatePost = ({ topic, key_points, post_type = 'story', selected_hook = null }) =>
  api.post('/generate/', { topic, key_points, post_type, selected_hook })

export const generateHooks = ({ topic, key_points }) =>
  api.post('/generate/hooks', { topic, key_points })

export const saveFinalPost = (postId, final_output) =>
  api.put(`/generate/${postId}/final`, { final_output })

export const getHistory = (limit = 20) =>
  api.get(`/generate/history?limit=${limit}`)

export const getUsage = () =>
  api.get('/generate/usage')
