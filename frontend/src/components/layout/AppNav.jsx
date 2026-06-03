import { Link, useLocation } from 'react-router-dom'
import { signOut } from '../../services/auth'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../i18n'
import LanguageToggle from '../ui/LanguageToggle'

export default function AppNav() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const { t } = useLanguage()
  const navLinks = [
    { to: '/app',     label: t('navGenerate') },
    { to: '/history', label: t('navHistory') },
    { to: '/profile', label: t('navProfile') },
    { to: '/settings', label: t('navSettings') },
  ]

  return (
    <nav className="sticky top-0 z-30 bg-paper/90 backdrop-blur border-b border-border">
      <div className="flex items-center justify-between px-6 py-3 max-w-6xl mx-auto">
        {/* Logo */}
        <Link to="/app" className="font-serif text-xl font-light text-ink tracking-tight">
          ByMe
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`
                px-3 py-1.5 rounded-lg text-sm transition-colors
                ${pathname === to
                  ? 'bg-surface text-ink font-medium'
                  : 'text-muted hover:text-ink hover:bg-surface/60'}
              `}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* User + sign out */}
        <div className="flex items-center gap-3">
          <LanguageToggle compact />
          <span className="text-xs text-muted hidden sm:block truncate max-w-[140px]">
            {user?.email}
          </span>
          <button
            onClick={() => signOut().then(() => window.location.href = '/login')}
            className="text-xs text-muted hover:text-ink transition-colors border border-border rounded-lg px-3 py-1.5"
          >
            {t('navSignOut')}
          </button>
        </div>
      </div>
    </nav>
  )
}
