import { useState } from 'react'
import { generatePost } from '../services/generate'

export function useGenerator() {
  const [topic,     setTopic]     = useState('')
  const [keyPoints, setKeyPoints] = useState([''])
  const [output,    setOutput]    = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)

  const generate = async () => {
    if (!topic.trim()) return
    const points = keyPoints.filter((p) => p.trim())
    if (!points.length) return

    setLoading(true)
    setError(null)
    try {
      const { data } = await generatePost({ topic, key_points: points })
      setOutput(data.output)
      return data
    } catch (e) {
      const msg = e.response?.data?.detail || 'Something went wrong. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return {
    topic, setTopic,
    keyPoints, setKeyPoints,
    output, setOutput,
    loading, error,
    generate,
  }
}
