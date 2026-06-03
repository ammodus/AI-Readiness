'use client'

import { useState } from 'react'
import type { AnalysisResult, InfraSignalKey, Recommendation } from '@/lib/types'
import { PRIMARY_SIGNAL_KEYS, SECONDARY_SIGNAL_KEYS } from '@/lib/types'
import { BAND_META, BENCHMARKS, INDUSTRY_LABELS, GAP_COPY, getLowestScoringSignal, getTopRecommendations } from '@/lib/benchmarks'

interface Props {
  result: AnalysisResult
  signature: string
  name: string
  email: string
  customIndustry?: string
  onReset: () => void
}

const SIGNAL_LABELS: Record<InfraSignalKey, string> = {
  bookingWidget:     'Online booking',
  liveChat:          'Live chat / chatbot',
  intakeForm:        'Digital intake form',
  reviewsWidget:     'Reviews widget',
  clientPortal:      'Client portal',
  paymentProcessing: 'Online payment processing',
  analyticsSetup:    'Analytics / tracking',
  newsletterCapture: 'Newsletter capture',
}

function ScoreBar({
  label, score, description, explanation,
}: {
  label: string
  score: number
  description: string
  explanation?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm font-medium text-ink">{label}</span>
        <span className="text-sm text-muted">{score}/100</span>
      </div>
      <div className="w-full bg-border rounded-full h-2 mb-1.5">
        <div className="bg-ink h-2 rounded-full transition-all duration-700" style={{ width: `${score}%` }} />
      </div>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted">{description}</p>
        {explanation && (
          <button
            onClick={() => setOpen(v => !v)}
            className="text-xs text-muted underline underline-offset-2 whitespace-nowrap hover:text-ink transition-colors flex-shrink-0"
          >
            {open ? 'hide' : 'why?'}
          </button>
        )}
      </div>
      {open && explanation && (
        <p className="text-xs text-ink/70 bg-bg border border-border rounded px-3 py-2 mt-2 leading-relaxed">
          {explanation}
        </p>
      )}
    </div>
  )
}

function RecommendationCard({ rec, index }: { rec: Recommendation; index: number }) {
  return (
    <div className="border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-muted font-medium w-4">{index + 1}.</span>
        <span className={`
          text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded
          ${rec.effort === 'Quick win'    ? 'bg-green-100 text-green-700' :
            rec.effort === 'Medium lift'  ? 'bg-blue-100 text-blue-700' :
                                            'bg-purple-100 text-purple-700'}
        `}>
          {rec.effort}
        </span>
      </div>
      <p className="font-medium text-ink text-sm mb-1">{rec.title}</p>
      <p className="text-xs text-muted leading-relaxed">{rec.description}</p>
    </div>
  )
}

export default function Step4Results({ result, signature, name, email, customIndustry, onReset }: Props) {
  const [emailSent, setEmailSent] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailError, setEmailError] = useState('')

  const band = BAND_META[result.band]
  const benchmark = BENCHMARKS[result.industry]
  const industryLabel = INDUSTRY_LABELS[result.industry]
  const lowestSignal = getLowestScoringSignal(result.findings)
  const domain = result.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]

  // Use dynamic recommendations if available, fall back to static
  const recommendations: Recommendation[] =
    result.dynamicRecommendations?.length
      ? result.dynamicRecommendations
      : getTopRecommendations(result.subScores, result.industry)

  const secondaryFound = SECONDARY_SIGNAL_KEYS.filter(k => result.findings[k]?.found)

  async function handleEmailReport() {
    setEmailError('')
    setEmailLoading(true)
    try {
      const res = await fetch('/api/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, result, signature, customIndustry }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send report')
      setEmailSent(true)
    } catch (err) {
      setEmailError((err as Error).message)
    } finally {
      setEmailLoading(false)
    }
  }

  return (
    <div className="animate-fade-up space-y-6">

      {/* Score hero */}
      <div className="bg-card border border-border rounded-lg p-6 md:p-8 text-center">
        <div className="inline-flex items-center gap-2 bg-bg border border-border rounded px-3 py-1 mb-4">
          <span className="w-2 h-2 rounded-full bg-ink/30" />
          <span className="text-sm font-medium text-muted">{domain}</span>
        </div>
        <div className="font-serif text-7xl md:text-8xl font-semibold text-ink leading-none mb-2">
          {result.overallScore}
        </div>
        <p className="text-muted mb-4">out of 100</p>
        <span
          className="inline-block text-sm font-semibold px-4 py-1.5 rounded"
          style={{ background: band.bgColor, color: band.textColor }}
        >
          {band.label}
        </span>
        <p className="text-muted mt-4 text-sm leading-relaxed max-w-md mx-auto">
          {band.description}
        </p>
      </div>

      {/* Sub-scores with explanations */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="font-serif text-xl font-normal text-ink mb-5">Score breakdown</h2>
        <div className="space-y-5">
          <ScoreBar
            label="Infrastructure"
            score={result.subScores.infrastructure}
            description="What your website already has in place — booking, chat, forms, reviews, portal"
            explanation={result.scoreExplanation?.infrastructure}
          />
          <ScoreBar
            label="Process maturity"
            score={result.subScores.process}
            description="How digitised your day-to-day enquiry handling and operations are"
            explanation={result.scoreExplanation?.process}
          />
          <ScoreBar
            label="Automation ROI potential"
            score={result.subScores.volume}
            description="Based on your volume — higher volume means greater return from automation"
            explanation={result.scoreExplanation?.volume}
          />
        </div>
      </div>

      {/* Industry comparison */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="font-serif text-xl font-normal text-ink mb-2">How you compare</h2>
        <p className="text-sm text-muted mb-5">
          {industryLabel} businesses average {benchmark}/100 on infrastructure. You scored {result.subScores.infrastructure}/100.
        </p>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-medium text-ink">Your infrastructure</span>
              <span className="text-muted">{result.subScores.infrastructure}/100</span>
            </div>
            <div className="w-full bg-border rounded-full h-2">
              <div className="bg-ink h-2 rounded-full" style={{ width: `${result.subScores.infrastructure}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-medium text-muted">{industryLabel} average</span>
              <span className="text-muted">{benchmark}/100</span>
            </div>
            <div className="w-full bg-border rounded-full h-2">
              <div className="bg-muted/40 h-2 rounded-full" style={{ width: `${benchmark}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Findings — primary signals */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="font-serif text-xl font-normal text-ink mb-1">What we found on your site</h2>
        {result.scanFailed && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mt-2 mb-2">
            Site scan was unavailable — infrastructure score is based on your answers only.
          </p>
        )}
        <div className="divide-y divide-border mt-4">
          {PRIMARY_SIGNAL_KEYS.map(key => {
            const signal = result.findings[key]
            return (
              <div key={key} className="flex items-start gap-4 py-3.5">
                <div className="flex-shrink-0 mt-0.5">
                  {signal.found
                    ? <span className="text-green-700 font-bold text-sm">✓</span>
                    : <span className="text-muted text-sm font-medium">—</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink">{SIGNAL_LABELS[key]}</p>
                  <p className="text-xs text-muted mt-0.5">{signal.evidence}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Secondary signals (only show if at least one found) */}
        {secondaryFound.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-3">Also detected</p>
            <div className="flex flex-wrap gap-2">
              {secondaryFound.map(key => (
                <span key={key} className="text-xs bg-green-50 text-green-700 border border-green-200 rounded px-2 py-1">
                  ✓ {SIGNAL_LABELS[key]}
                </span>
              ))}
            </div>
          </div>
        )}

        {result.findings.techStack && result.findings.techStack !== 'Unknown' && result.findings.techStack !== 'unclear' && (
          <p className="text-xs text-muted mt-3 pt-3 border-t border-border">
            Platform: {result.findings.techStack}
          </p>
        )}
      </div>

      {/* Gap callout */}
      {lowestSignal && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 mb-2">The gap that matters most</p>
          <p className="text-sm text-amber-900 leading-relaxed">
            {GAP_COPY[result.industry][lowestSignal as keyof typeof GAP_COPY[typeof result.industry]]}
          </p>
        </div>
      )}

      {/* Recommendations */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="font-serif text-xl font-normal text-ink">Suggestions</h2>
          {result.dynamicRecommendations && (
            <span className="text-xs text-muted">Personalised to your results</span>
          )}
        </div>
        <div className="space-y-4">
          {recommendations.map((rec, i) => (
            <RecommendationCard key={i} rec={rec} index={i} />
          ))}
        </div>
      </div>

      {/* Email report */}
      <div className="bg-card border border-border rounded-lg p-6 text-center">
        {emailSent ? (
          <div>
            <p className="font-medium text-ink mb-1">Report sent</p>
            <p className="text-sm text-muted">Check {email} — it should arrive within a minute.</p>
          </div>
        ) : (
          <div>
            <p className="font-serif text-xl font-normal text-ink mb-2">Get the full report by email</p>
            <p className="text-sm text-muted mb-5">
              Score breakdown, all findings, and your suggestions — sent to {email}.
            </p>
            <button
              onClick={handleEmailReport}
              disabled={emailLoading}
              className="px-8 py-3 bg-ink text-white font-medium rounded-lg text-base hover:opacity-85 transition-opacity disabled:opacity-40"
            >
              {emailLoading ? 'Sending…' : 'Email me my full report →'}
            </button>
            {emailError && <p className="text-sm text-red-600 mt-3">{emailError}</p>}
          </div>
        )}
      </div>

      <div className="text-center pb-4">
        <button onClick={onReset} className="text-sm text-muted hover:text-ink underline underline-offset-2 transition-colors">
          Check another business
        </button>
      </div>

    </div>
  )
}
