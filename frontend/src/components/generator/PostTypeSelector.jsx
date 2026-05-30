const POST_TYPES = [
  { id: 'story',       label: 'Story',       desc: 'Open with a moment'         },
  { id: 'hot_take',    label: 'Hot take',    desc: 'Lead with a bold claim'     },
  { id: 'lesson',      label: 'Lesson',      desc: 'Insight first, then why'    },
  { id: 'observation', label: 'Observation', desc: 'Something you noticed'      },
  { id: 'update',      label: 'Update',      desc: 'Share what just happened'   },
]

export default function PostTypeSelector({ value, onChange }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
        Post type
      </p>
      <div className="flex flex-wrap gap-2">
        {POST_TYPES.map((type) => (
          <button
            key={type.id}
            onClick={() => onChange(type.id)}
            title={type.desc}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              value === type.id
                ? 'bg-ink text-paper border-ink'
                : 'bg-transparent text-muted border-border hover:border-muted hover:text-ink'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>
    </div>
  )
}
