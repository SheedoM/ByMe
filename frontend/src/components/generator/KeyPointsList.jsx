export default function KeyPointsList({ points, onChange }) {
  const update = (i, val) => {
    const next = [...points]
    next[i] = val
    onChange(next)
  }
  const add    = () => onChange([...points, ''])
  const remove = (i) => onChange(points.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-2">
      {points.map((point, i) => (
        <div key={i} className="flex gap-2 items-center">
          <span className="text-xs text-muted w-4 shrink-0 text-right">{i + 1}.</span>
          <input
            id={`key-point-${i}`}
            value={point}
            onChange={(e) => update(i, e.target.value)}
            placeholder={`Key point ${i + 1}`}
            className="flex-1 bg-paper border border-border rounded-xl px-3 py-2 text-sm text-ink
              placeholder:text-muted/50 focus:outline-none focus:border-amber focus:ring-1
              focus:ring-amber/20 transition-colors"
          />
          {points.length > 1 && (
            <button
              id={`remove-point-${i}`}
              onClick={() => remove(i)}
              className="text-muted hover:text-red-500 transition-colors text-lg leading-none w-6 shrink-0"
              aria-label="Remove point"
            >
              ×
            </button>
          )}
        </div>
      ))}
      <button
        id="btn-add-point"
        onClick={add}
        className="text-xs text-muted hover:text-ink underline underline-offset-2 transition-colors ml-6"
      >
        + Add point
      </button>
    </div>
  )
}
