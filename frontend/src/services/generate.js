import api from './api'

export const generatePost = ({ topic, key_points, post_type = 'story', selected_hook = null }) =>
  api.post('/generate/', { topic, key_points, post_type, selected_hook })

export const generateHooks = ({ topic, key_points }) =>
  api.post('/generate/hooks', { topic, key_points })

export const submitFeedback = (postId, rating) =>
  api.post(`/generate/${postId}/feedback`, { rating })

export const getHistory = (limit = 20) =>
  api.get(`/generate/history?limit=${limit}`)

export const getUsage = () =>
  api.get('/generate/usage')
