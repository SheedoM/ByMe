import Textarea from '../ui/Textarea'
import KeyPointsList from './KeyPointsList'
import Button from '../ui/Button'
import PostTypeSelector from './PostTypeSelector'
import HookVariants from './HookVariants'

export default function InputPanel({
  topic, setTopic,
  keyPoints, setKeyPoints,
  postType, setPostType,
  selectedHook, setSelectedHook,
  onGenerate,
  loading,
  error,
}) {
  return (
    <div className="flex flex-col gap-5">
      {/* Post type */}
      <PostTypeSelector value={postType} onChange={setPostType} />
      <Textarea
        id="topic"
        label="Topic"
        placeholder="What do you want to write about today?"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        rows={3}
        hint="Be specific — 'Lessons from my first product launch' beats 'my startup'."
      />

      <div>
        <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
          Key points to include
        </p>
        <KeyPointsList points={keyPoints} onChange={setKeyPoints} />
      </div>

      {/* Hook variants */}
      <HookVariants
        topic={topic}
        keyPoints={keyPoints}
        onSelect={setSelectedHook}
      />

      {error && (
        <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <Button
        id="btn-generate"
        onClick={onGenerate}
        loading={loading}
        disabled={!topic.trim() || keyPoints.every((p) => !p.trim())}
        fullWidth
        size="lg"
      >
        {loading ? 'Generating…' : selectedHook ? 'Write from this hook →' : 'Write my post'}
      </Button>
    </div>
  )
}
