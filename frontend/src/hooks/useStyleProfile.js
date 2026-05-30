import { useState, useEffect } from 'react'
import { getStyleProfile } from '../services/style'
import { useAuth } from './useAuth'

export function useStyleProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    getStyleProfile()
      .then(({ data }) => setProfile(data))
      .catch((e) => {
        if (e.response?.status === 404) {
          setProfile(null)
        } else {
          setError(e.message)
        }
      })
      .finally(() => setLoading(false))
  }, [user])

  const refresh = async () => {
    try {
      const { data } = await getStyleProfile()
      setProfile(data)
    } catch {
      setProfile(null)
    }
  }

  return { profile, loading, error, refresh }
}
