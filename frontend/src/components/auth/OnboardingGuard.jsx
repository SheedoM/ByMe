import { Navigate } from 'react-router-dom'
import { useStyleProfile } from '../../hooks/useStyleProfile'
import Spinner from '../ui/Spinner'

export function OnboardingGuard({ children }) {
  const { profile, loading } = useStyleProfile()

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!profile || profile.status !== 'ready') {
    return <Navigate to="/onboarding" replace />
  }

  return children
}
