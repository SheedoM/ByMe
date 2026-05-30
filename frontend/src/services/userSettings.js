import api from './api'

export const getProviderSettings = () =>
  api.get('/settings/provider')

export const saveProviderSettings = (data) =>
  api.post('/settings/provider', data)

export const getProvidersCatalog = () =>
  api.get('/settings/providers-catalog')
