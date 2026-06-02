'use client'

import { useState } from 'react'
import type { Industry } from '@/lib/types'

interface Props {
  selected: Industry | null
  customIndustry: string
  onSelect: (industry: Industry) => void
  onCustomIndustryChange: (value: string) => void
  onNext: () => void
}

const INDUSTRIES: Array<{ id: Industry; label: string; icon: string }> = [
  { id: 'dental', label: 'Dental', icon: '🦷' },
  { id: 'physio', label: 'Physiotherapy', icon: '🏃' },
  { id: 'accountancy', label: 'Accountancy', icon: '📊' },
  { id: 'legal', label: 'Legal', icon: '⚖️' },
  { id: 'recruitment', label: 'Recruitment', icon: '👥' },
  { id: 'insurance', label: 'Insurance', icon: '🛡️' },
  { id: 'other', label: 'Other', icon: '💬' },
]

export default function Step1Industry({ selected, customIndustry, onSelect, onCustomIndustryChange, onNext }: Props) {
  const canProceed = selected !== null && (selected !== 'other' || customIndustry.trim().length > 1)

  return (
    <div className="animate-fade-up">
      <p className="text-sm font-semibold uppercase tracking-widest text-muted mb-3">Step 1 of 3</p>
      <h1 className="font-serif text-3xl md:text-4xl font-normal text-ink mb-3 leading-tight">
        What type of business are you?
      </h1>
      <p className="text-muted mb-8 text-base leading-relaxed">
        Scores and suggestions are tailored to your sector.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        {INDUSTRIES.map(ind => (
          <button
            key={ind.id}
            onClick={() => onSelect(ind.id)}
            className={`
              flex flex-col items-start gap-2 p-4 rounded-lg border text-left transition-all duration-150
              ${selected === ind.id
                ? 'bg-ink text-white border-ink'
                : 'bg-card border-border text-ink hover:border-ink/50'
              }
            `}
          >
            <span className="text-2xl">{ind.icon}</span>
            <span className="font-medium text-sm leading-tight">{ind.label}</span>
          </button>
        ))}
      </div>

      {selected === 'other' && (
        <div className="mb-6 animate-fade-up">
          <label htmlFor="custom-industry" className="block text-sm font-medium text-ink mb-2">
            What industry are you in?
          </label>
          <input
            id="custom-industry"
            type="text"
            value={customIndustry}
            onChange={e => onCustomIndustryChange(e.target.value)}
            placeholder="e.g. Architecture, Veterinary, Financial Planning…"
            className="w-full px-4 py-3 bg-card border border-border rounded-lg text-ink text-base placeholder:text-muted/60 focus:outline-none focus:border-ink transition-colors"
            autoFocus
          />
        </div>
      )}

      <button
        onClick={onNext}
        disabled={!canProceed}
        className="w-full md:w-auto px-8 py-3 bg-ink text-white font-medium rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-85 transition-opacity text-base"
      >
        Continue →
      </button>
    </div>
  )
}
