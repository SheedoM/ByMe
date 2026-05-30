import { useState } from 'react'
import { generatePost } from '../services/generate'

export function useGenerator() {
  const [topic,        setTopic]        = useState('')
  const [keyPoints,    setKeyPoints]    = useState([''])
  const [postType,     setPostType]     = useState('story')
  const [selectedHook, setSelectedHook] = useState(null)
  const [output,       setOutput]       = useState('')
  const [postId,       setPostId]       = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState(null)

  const generate = async () => {
    if (!topic.trim()) return
    const points = keyPoints.filter((p) => p.trim())
    if (!points.length) return

    setLoading(true)
    setError(null)
    setPostId(null)
    try {
      const { data } = await generatePost({
        topic,
        key_points:    points,
        post_type:     postType,
        selected_hook: selectedHook,
      })
      setOutput(data.output)
      setPostId(data.id)
      return data
    } catch (e) {
      const msg = e.response?.data?.detail || 'Something went wrong. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // When user picks a hook variant — clear it when they change topic
  const handleTopicChange = (val) => {
    setTopic(val)
    setSelectedHook(null)
  }

  return {
    topic, setTopic: handleTopicChange,
    keyPoints, setKeyPoints,
    postType, setPostType,
    selectedHook, setSelectedHook,
    output, setOutput,
    postId,
    loading, error,
    generate,
  }
}
