import { useState } from 'react'
import { Link } from 'react-router-dom'
import { signUp } from '../services/auth'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function Signup() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    setError('')

    const { error: err } = await signUp(email, password)

    if (err) {
      setError(err.message)
      setLoading(false)
    }
    // On success: PublicRoute in App.jsx watches user state and navigates
    // to /app when onAuthStateChange fires — no navigate() call needed here.
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6">
      <Link to="/" className="font-serif text-2xl font-light text-ink mb-10 tracking-tight">
        ByMe
      </Link>

      <div className="w-full max-w-sm animate-slide-up">
        <h1 className="font-serif text-3xl font-light text-ink mb-1">Create your account</h1>
        <p className="text-muted text-sm mb-8">Free tier included — no card needed</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint="At least 8 characters"
            required
          />

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} fullWidth size="lg">
            Create account
          </Button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-ink underline underline-offset-2 hover:text-amber transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
