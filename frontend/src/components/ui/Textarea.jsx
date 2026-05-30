export default function Textarea({
  label,
  id,
  placeholder,
  value,
  onChange,
  rows = 4,
  error,
  hint,
  disabled = false,
  className = '',
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-muted uppercase tracking-wide">
          {label}
        </label>
      )}
      <textarea
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={`
          w-full bg-paper border rounded-xl px-4 py-2.5 text-sm text-ink
          placeholder:text-muted/60 resize-none transition-colors duration-150
          focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber/20
          disabled:opacity-50 disabled:cursor-not-allowed scrollbar-thin
          ${error ? 'border-red-400' : 'border-border'}
        `}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
    </div>
  )
}
