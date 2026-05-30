import api from './api'

export const generatePost = ({ topic, key_points }) =>
  api.post('/generate/', { topic, key_points })

export const getHistory = (limit = 20) =>
  api.get(`/generate/history?limit=${limit}`)

export const getUsage = () =>
  api.get('/generate/usage')
