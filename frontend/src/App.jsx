import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/AuthContext'
import { LanguageProvider } from './i18n'
import { AuthGuard } from './components/auth/AuthGuard'
import { OnboardingGuard } from './components/auth/OnboardingGuard'

import Landing      from './pages/Landing'
import Login        from './pages/Login'
import Signup       from './pages/Signup'
import Onboarding   from './pages/Onboarding'
import Generator    from './pages/Generator'
import StyleProfile from './pages/StyleProfile'
import Settings     from './pages/Settings'

/**
 * Redirects already-authenticated users away from public pages.
 * Because AuthContext suppresses children while loading, this only
 * ever renders with a known (non-loading) auth state.
 */
function PublicRoute({ children }) {
  const { user } = useAuth()
  if (user) return <Navigate to="/app" replace />
  return children
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
          {/* Public routes — redirect to /app if already signed in */}
          <Route path="/"       element={<Landing />} />
          <Route path="/login"  element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />

          {/* Protected — requires auth, onboarding not required */}
          <Route path="/onboarding" element={
            <AuthGuard><Onboarding /></AuthGuard>
          } />

          {/* Protected — requires auth AND completed onboarding */}
          <Route path="/app" element={
            <AuthGuard><OnboardingGuard><Generator /></OnboardingGuard></AuthGuard>
          } />
          <Route path="/profile" element={
            <AuthGuard><OnboardingGuard><StyleProfile /></OnboardingGuard></AuthGuard>
          } />
          <Route path="/settings" element={
            <AuthGuard><OnboardingGuard><Settings /></OnboardingGuard></AuthGuard>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  )
}
