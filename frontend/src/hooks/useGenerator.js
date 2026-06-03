import { useEffect, useState } from 'react'
import { generatePost } from '../services/generate'

const GENERATOR_STORAGE_KEY = 'byme_generator_state'

function loadGeneratorState() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(GENERATOR_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function useGenerator() {
  const [savedState] = useState(loadGeneratorState)
  const [topic,        setTopic]        = useState(savedState.topic || '')
  const [keyPoints,    setKeyPoints]    = useState(
    Array.isArray(savedState.keyPoints) && savedState.keyPoints.length
      ? savedState.keyPoints
      : ['']
  )
  const [postType,     setPostType]     = useState(savedState.postType || 'story')
  const [selectedHook, setSelectedHook] = useState(null)
  const [output,       setOutput]       = useState(savedState.output || '')
  const [postId,       setPostId]       = useState(savedState.postId || null)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(
      GENERATOR_STORAGE_KEY,
      JSON.stringify({ topic, keyPoints, postType, output, postId })
    )
  }, [topic, keyPoints, postType, output, postId])

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
