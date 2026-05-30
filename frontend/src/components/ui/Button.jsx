const variants = {
  primary:   'bg-ink text-paper hover:bg-ink/90 active:scale-[0.98]',
  secondary: 'bg-surface text-ink border border-border hover:bg-border active:scale-[0.98]',
  ghost:     'bg-transparent text-muted hover:text-ink hover:bg-surface active:scale-[0.98]',
  amber:     'bg-amber text-paper hover:bg-amber-dark active:scale-[0.98]',
  danger:    'bg-red-600 text-white hover:bg-red-700 active:scale-[0.98]',
}

const sizes = {
  sm:   'px-3 py-1.5 text-xs rounded-lg',
  md:   'px-4 py-2 text-sm rounded-xl',
  lg:   'px-6 py-3 text-sm rounded-xl',
  xl:   'px-8 py-4 text-base rounded-2xl',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  type = 'button',
  onClick,
  className = '',
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 font-medium
        transition-all duration-150 select-none
        disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {loading && (
        <svg className="animate-spin h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
      )}
      {children}
    </button>
  )
}
