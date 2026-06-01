import { useState } from 'react'
import UploadStep     from '../components/onboarding/UploadStep'
import ProcessingStep from '../components/onboarding/ProcessingStep'
import ProviderStep   from '../components/onboarding/ProviderStep'
import StyleReviewStep from '../components/onboarding/StyleReviewStep'
import LanguageToggle from '../components/ui/LanguageToggle'

// Onboarding flow:
// 1. upload      — user imports LinkedIn archive/CSV
// 2. provider    — user chooses analysis method and starts extraction
// 3. processing  — AI extracts style profile in background
// 4. review      — user reviews extracted style profile

export default function Onboarding() {
  const [step, setStep] = useState('upload')

  return (
    <div className="min-h-screen bg-paper flex flex-col px-6 py-8">
      <header className="w-full max-w-4xl mx-auto flex items-center justify-between">
        <span className="font-serif text-xl font-light text-ink tracking-tight">ByMe</span>
        <LanguageToggle compact />
      </header>

      <main className="flex-1 flex items-center justify-center w-full">
        <div className="w-full max-w-2xl flex justify-center">
          {step === 'upload'     && <UploadStep     onDone={() => setStep('provider')} />}
          {step === 'provider'   && <ProviderStep   onDone={() => setStep('processing')} />}
          {step === 'processing' && <ProcessingStep onDone={() => setStep('review')} />}
          {step === 'review'     && <StyleReviewStep />}
        </div>
      </main>
    </div>
  )
}
