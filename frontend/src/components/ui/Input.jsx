export default function Input({
  label,
  id,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  hint,
  required = false,
  disabled = false,
  className = '',
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-muted uppercase tracking-wide">
          {label}{required && <span className="text-amber ml-1">*</span>}
        </label>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`
          w-full bg-paper border rounded-xl px-4 py-2.5 text-sm text-ink
          placeholder:text-muted/60 transition-colors duration-150
          focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber/20
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-red-400' : 'border-border'}
        `}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
    </div>
  )
}
