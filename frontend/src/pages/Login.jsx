import { useState } from 'react'
import { Link } from 'react-router-dom'
import { signIn } from '../services/auth'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function Login() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: err } = await signIn(email, password)

    if (err) {
      setError(err.message)
      setLoading(false)
    }
    // On success: PublicRoute in App.jsx watches user state and navigates
    // when onAuthStateChange fires — no navigate() call needed here.
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6">
      <Link to="/" className="font-serif text-2xl font-light text-ink mb-10 tracking-tight">
        ByMe
      </Link>

      <div className="w-full max-w-sm animate-slide-up">
        <h1 className="font-serif text-3xl font-light text-ink mb-1">Welcome back</h1>
        <p className="text-muted text-sm mb-8">Sign in to your account</p>

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
            required
          />

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200
              rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} fullWidth size="lg">
            Sign in
          </Button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          No account?{' '}
          <Link to="/signup" className="text-ink underline underline-offset-2 hover:text-amber transition-colors">
            Get started free
          </Link>
        </p>
      </div>
    </div>
  )
}
