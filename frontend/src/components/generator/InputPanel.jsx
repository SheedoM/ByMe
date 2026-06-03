import Textarea from '../ui/Textarea'
import KeyPointsList from './KeyPointsList'
import Button from '../ui/Button'
import PostTypeSelector from './PostTypeSelector'
import HookVariants from './HookVariants'
import { useLanguage } from '../../i18n'

export default function InputPanel({
  topic, setTopic,
  keyPoints, setKeyPoints,
  postType, setPostType,
  selectedHook, setSelectedHook,
  onGenerate,
  loading,
  error,
}) {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col gap-5">
      {/* Post type */}
      <PostTypeSelector value={postType} onChange={setPostType} />
      <Textarea
        id="topic"
        label={t('topic')}
        placeholder={t('topicPlaceholder')}
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        rows={3}
        hint={t('topicHint')}
      />

      <div>
        <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
          {t('keyPoints')}
        </p>
        <KeyPointsList points={keyPoints} onChange={setKeyPoints} />
      </div>

      {/* Hook variants */}
      <HookVariants
        topic={topic}
        keyPoints={keyPoints}
        selectedHook={selectedHook}
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
        {loading ? t('generating') : selectedHook ? `${t('writeFromHook')} →` : t('writeMyPost')}
      </Button>
    </div>
  )
}
