import { useState } from 'react'
import AppNav from '../components/layout/AppNav'
import StyleCard from '../components/profile/StyleCard'
import StyleEditor from '../components/profile/StyleEditor'
import { useStyleProfile } from '../hooks/useStyleProfile'
import Spinner from '../components/ui/Spinner'
import Button from '../components/ui/Button'

export default function StyleProfile() {
  const { profile, loading, refresh } = useStyleProfile()
  const [editing, setEditing] = useState(false)

  return (
    <div className="min-h-screen bg-paper">
      <AppNav />

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl font-light text-ink">My style profile</h1>
            <p className="text-muted text-sm mt-0.5">
              This is what ByMe uses to generate posts in your voice.
            </p>
          </div>
          {profile && (
            <Button
              id="btn-toggle-edit"
              variant="secondary"
              size="sm"
              onClick={() => setEditing((e) => !e)}
            >
              {editing ? 'Cancel' : 'Edit'}
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : editing ? (
          <StyleEditor
            profile={profile}
            onSaved={() => { refresh(); setEditing(false) }}
          />
        ) : (
          <StyleCard profile={profile} />
        )}
      </main>
    </div>
  )
}
