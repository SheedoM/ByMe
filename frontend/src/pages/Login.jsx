import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { signIn } from '../services/auth'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import LanguageToggle from '../components/ui/LanguageToggle'
import { useLanguage } from '../i18n'
import { getSafeRedirectPath } from '../utils/authRedirect'

export default function Login() {
  const { t } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const redirectTo = getSafeRedirectPath(new URLSearchParams(location.search).get('redirectTo'))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: err } = await signIn(email, password)

    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      navigate(redirectTo, { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6">
      <div className="absolute top-6 flex items-center justify-between w-full max-w-sm">
        <Link to="/" className="font-serif text-2xl font-light text-ink tracking-tight">
          ByMe
        </Link>
        <LanguageToggle compact />
      </div>

      <div className="w-full max-w-sm animate-slide-up">
        <h1 className="font-serif text-3xl font-light text-ink mb-1">{t('loginTitle')}</h1>
        <p className="text-muted text-sm mb-8">{t('loginCopy')}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="email"
            label={t('email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            id="password"
            label={t('password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200
              rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} fullWidth size="lg">
            {t('navSignIn')}
          </Button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          {t('noAccount')}{' '}
          <Link to="/signup" className="text-ink underline underline-offset-2 hover:text-amber transition-colors">
            {t('getStartedFree')}
          </Link>
        </p>
      </div>
    </div>
  )
}
