import { useEffect, useState } from 'react'
import { generatePost } from '../services/generate'

const STORAGE_KEY = 'byme_generator_state'

function loadState() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function useGenerator() {
  const [saved]        = useState(loadState)
  const [idea,         setIdea]         = useState(saved.idea || '')
  const [postType,     setPostType]     = useState(saved.postType || 'story')
  const [selectedHook, setSelectedHook] = useState(null)   // never persisted
  const [output,       setOutput]       = useState(saved.output || '')
  const [postId,       setPostId]       = useState(saved.postId || null)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState(null)

  // Persist to localStorage on change (selectedHook/loading/error are transient)
  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ idea, postType, output, postId })
    )
  }, [idea, postType, output, postId])

  const generate = async () => {
    if (!idea.trim() || !selectedHook) return
    setLoading(true)
    setError(null)
    setPostId(null)
    try {
      const { data } = await generatePost({
        topic:         idea,
        key_points:    [],
        post_type:     postType,
        selected_hook: selectedHook,
      })
      setOutput(data.output)
      setPostId(data.id)
      return data
    } catch (e) {
      setError(e.response?.data?.detail || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const clearAll = () => {
    setIdea('')
    setSelectedHook(null)
    setOutput('')
    setPostId(null)
    setError(null)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }

  // Clear hook when idea changes significantly (user is starting fresh)
  const handleIdeaChange = (val) => {
    setIdea(val)
    if (!val.trim()) setSelectedHook(null)
  }

  return {
    idea,        setIdea: handleIdeaChange,
    postType,    setPostType,
    selectedHook, setSelectedHook,
    output,      setOutput,
    postId,
    loading, error,
    generate, clearAll,
  }
}
