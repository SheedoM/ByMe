import { Link } from 'react-router-dom'

export default function PublicNav() {
  return (
    <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
      <Link to="/" className="font-serif text-xl font-light text-ink tracking-tight">
        ByMe
      </Link>
      <div className="flex items-center gap-4">
        <Link
          to="/login"
          className="text-sm text-muted hover:text-ink transition-colors"
        >
          Sign in
        </Link>
        <Link
          to="/signup"
          className="text-sm bg-ink text-paper px-4 py-2 rounded-xl hover:bg-ink/90 transition-colors"
        >
          Get started
        </Link>
      </div>
    </nav>
  )
}
