import { useState } from 'react'
import UploadStep     from '../components/onboarding/UploadStep'
import ProcessingStep from '../components/onboarding/ProcessingStep'
import ProviderStep   from '../components/onboarding/ProviderStep'
import StyleReviewStep from '../components/onboarding/StyleReviewStep'

// Onboarding flow:
// 1. upload      — user uploads LinkedIn CSV
// 2. processing  — AI extracts style profile in background
// 3. provider    — user chooses Free tier or BYOK  ← NEW
// 4. review      — user reviews extracted style profile

const STEPS = ['upload', 'processing', 'provider', 'review']

function StepIndicator({ current }) {
  const labels = ['Upload', 'Analysing', 'Plan', 'Review']
  const idx = STEPS.indexOf(current)
  return (
    <div className="flex items-center gap-2 mb-10">
      {labels.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium transition-all
            ${i < idx  ? 'bg-ink text-paper'
            : i === idx ? 'bg-amber text-paper'
            :              'bg-surface text-muted'}`}
          >
            {i < idx ? '✓' : i + 1}
          </div>
          <span className={`text-xs hidden sm:block transition-colors
            ${i === idx ? 'text-ink font-medium' : 'text-muted'}`}>
            {label}
          </span>
          {i < labels.length - 1 && (
            <div className={`h-px w-6 transition-colors ${i < idx ? 'bg-ink' : 'bg-border'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function Onboarding() {
  const [step, setStep] = useState('upload')

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <span className="font-serif text-xl font-light text-ink tracking-tight">ByMe</span>
        </div>

        <StepIndicator current={step} />

        {step === 'upload'     && <UploadStep     onDone={() => setStep('processing')} />}
        {step === 'processing' && <ProcessingStep onDone={() => setStep('provider')} />}
        {step === 'provider'   && <ProviderStep   onDone={() => setStep('review')} />}
        {step === 'review'     && <StyleReviewStep />}
      </div>
    </div>
  )
}
