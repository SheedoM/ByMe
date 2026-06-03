import { useState } from 'react'
import OnboardingChoiceStep from '../components/onboarding/OnboardingChoiceStep'
import UploadStep     from '../components/onboarding/UploadStep'
import PostCountStep  from '../components/onboarding/PostCountStep'
import ProcessingStep from '../components/onboarding/ProcessingStep'
import ProviderStep   from '../components/onboarding/ProviderStep'
import StyleReviewStep from '../components/onboarding/StyleReviewStep'
import ManualStyleStep from '../components/onboarding/ManualStyleStep'
import LanguageToggle from '../components/ui/LanguageToggle'

// Onboarding flow:
// 1. upload      — user imports LinkedIn archive/CSV
// 2. post_count  — user picks how many posts to learn from
// 3. provider    — user chooses analysis method and starts extraction
// 4. processing  — AI extracts style profile in background
// 5. review      — user reviews extracted style profile

export default function Onboarding() {
  const [step, setStep] = useState('choice')
  const [totalPosts, setTotalPosts] = useState(0)
  const [manualMode, setManualMode] = useState(false)

  return (
    <div className="min-h-screen bg-paper flex flex-col px-6 py-8">
      <header className="w-full max-w-4xl mx-auto flex items-center justify-between">
        <span className="font-serif text-xl font-light text-ink tracking-tight">ByMe</span>
        <LanguageToggle compact />
      </header>

      <main className="flex-1 flex items-center justify-center w-full">
        <div className="w-full max-w-2xl flex justify-center">
          {step === 'choice' && (
            <OnboardingChoiceStep
              onImport={() => { setManualMode(false); setStep('upload') }}
              onManual={() => { setManualMode(true); setStep('manual_style') }}
            />
          )}
          {step === 'upload' && (
            <UploadStep onDone={(count) => { setTotalPosts(count); setStep('post_count') }} />
          )}
          {step === 'manual_style' && (
            <ManualStyleStep onDone={() => setStep('provider')} />
          )}
          {step === 'post_count' && (
            <PostCountStep totalPosts={totalPosts} onDone={() => setStep('provider')} />
          )}
          {step === 'provider'   && (
            <ProviderStep
              skipAnalysis={manualMode}
              onDone={() => setStep(manualMode ? 'review' : 'processing')}
            />
          )}
          {step === 'processing' && <ProcessingStep onDone={() => setStep('review')} />}
          {step === 'review'     && <StyleReviewStep />}
        </div>
      </main>
    </div>
  )
}
