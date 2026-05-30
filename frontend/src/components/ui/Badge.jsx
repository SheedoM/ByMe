const variants = {
  default: 'bg-surface text-muted border border-border',
  amber:   'bg-amber-light text-amber-dark border border-amber/30',
  green:   'bg-emerald-soft text-emerald-deep border border-emerald-deep/20',
  ink:     'bg-ink text-paper border border-ink',
}

export default function Badge({ children, variant = 'default', className = '' }) {
  return (
    <span className={`
      inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
      ${variants[variant]} ${className}
    `}>
      {children}
    </span>
  )
}
