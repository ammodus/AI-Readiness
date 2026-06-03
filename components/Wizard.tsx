'use client'

import { useState } from 'react'
import type { Industry, DiagnosticAnswers, AnalysisResult } from '@/lib/types'
import Step1Industry from './Step1Industry'
import Step2URL from './Step2URL'
import Step3Questions from './Step3Questions'
import Step4Results from './Step4Results'

type Step = 1 | 2 | 3 | 4

export default function Wizard() {
  const [step, setStep] = useState<Step>(1)
  const [industry, setIndustry] = useState<Industry | null>(null)
  const [customIndustry, setCustomIndustry] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [url, setUrl] = useState('')
  const [answers, setAnswers] = useState<Partial<DiagnosticAnswers>>({})
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [signature, setSignature] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleAnswer(q: keyof DiagnosticAnswers, value: string) {
    setAnswers(prev => ({ ...prev, [q]: value as DiagnosticAnswers[typeof q] }))
  }

  function reset() {
    setStep(1)
    setIndustry(null)
    setCustomIndustry('')
    setName('')
    setEmail('')
    setUrl('')
    setAnswers({})
    setResult(null)
    setSignature('')
    setError('')
  }

  async function runAnalysis() {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, industry, customIndustry: customIndustry.trim() || undefined, answers }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed. Please try again.')

      setResult(data.result)
      setSignature(data.signature ?? '')
      setStep(4)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
        <div className="w-10 h-10 border-2 border-border border-t-ink rounded-full animate-spin" />
        <div className="text-center">
          <p className="font-medium text-ink text-base">Scanning your website…</p>
          <p className="text-sm text-muted mt-1">Analysing 5 readiness dimensions — this takes up to 60 seconds</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 md:py-16">

      {(step === 2 || step === 3) && (
        <div className="mb-10">
          <div className="flex gap-1">
            {([1, 2, 3] as const).map(s => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${s <= step ? 'bg-ink' : 'bg-border'}`}
              />
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between gap-4">
          <span>{error}</span>
          <button onClick={() => setError('')} className="underline hover:no-underline shrink-0">Dismiss</button>
        </div>
      )}

      {step === 1 && (
        <Step1Industry
          selected={industry}
          customIndustry={customIndustry}
          onSelect={setIndustry}
          onCustomIndustryChange={setCustomIndustry}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <Step2URL
          url={url}
          name={name}
          email={email}
          onUrlChange={setUrl}
          onNameChange={setName}
          onEmailChange={setEmail}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <Step3Questions
          answers={answers}
          onAnswer={handleAnswer}
          onNext={runAnalysis}
          onBack={() => setStep(2)}
        />
      )}

      {step === 4 && result && (
        <Step4Results
          result={result}
          signature={signature}
          name={name}
          email={email}
          customIndustry={customIndustry}
          onReset={reset}
        />
      )}
    </div>
  )
}
