import { useState } from 'react'
import { Link } from 'react-router-dom'
import { signUp } from '../services/auth'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import LanguageToggle from '../components/ui/LanguageToggle'
import { useLanguage } from '../i18n'

export default function Signup() {
  const { t } = useLanguage()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [message,  setMessage]  = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 8) {
      setError(t('passwordError'))
      return
    }
    setLoading(true)
    setError('')
    setMessage('')

    const { data, error: err } = await signUp(email, password)

    if (err) {
      setError(err.message)
      setLoading(false)
    } else if (data?.user && !data.session) {
      // Email confirmation required
      setMessage('Please check your email to verify your account.')
      setLoading(false)
    } else {
      // Success, session created
      setLoading(false)
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
        <h1 className="font-serif text-3xl font-light text-ink mb-1">{t('signupTitle')}</h1>
        <p className="text-muted text-sm mb-8">{t('signupCopy')}</p>

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
            hint={t('passwordHint')}
            required
          />

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </p>
          )}
          {message && (
            <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              {message}
            </p>
          )}

          <Button type="submit" loading={loading} fullWidth size="lg">
            {t('createAccount')}
          </Button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          {t('alreadyAccount')}{' '}
          <Link to="/login" className="text-ink underline underline-offset-2 hover:text-amber transition-colors">
            {t('navSignIn')}
          </Link>
        </p>
      </div>
    </div>
  )
}
