'use client'

import type { DiagnosticAnswers } from '@/lib/types'

interface Props {
  answers: Partial<DiagnosticAnswers>
  onAnswer: (q: keyof DiagnosticAnswers, value: string) => void
  onNext: () => void
  onBack: () => void
}

const QUESTIONS: Array<{
  key: keyof DiagnosticAnswers
  question: string
  options: Array<{ value: string; label: string }>
}> = [
  {
    key: 'q1',
    question: 'How do new enquiries typically reach you?',
    options: [
      { value: 'phone_email',    label: 'Phone or email only' },
      { value: 'contact_form',   label: 'Contact form on website' },
      { value: 'booking_widget', label: 'Online booking widget' },
      { value: 'mix',            label: 'Mix of the above' },
    ],
  },
  {
    key: 'q2',
    question: 'Where do you store client or patient information?',
    options: [
      { value: 'paper_spreadsheets', label: 'Paper or spreadsheets' },
      { value: 'basic_software',     label: 'Basic software like Gmail or Excel' },
      { value: 'crm',                label: 'Dedicated CRM or practice management system' },
    ],
  },
  {
    key: 'q3',
    question: 'How do you currently send reminders or follow-ups?',
    options: [
      { value: 'none',      label: "We don't" },
      { value: 'manual',    label: 'Someone does it manually' },
      { value: 'automated', label: 'We have something automated' },
    ],
  },
  {
    key: 'q4',
    question: 'How many new enquiries or clients do you handle per month?',
    options: [
      { value: 'under_10', label: 'Fewer than 10' },
      { value: '10_30',    label: '10–30' },
      { value: '30_100',   label: '30–100' },
      { value: 'over_100', label: 'More than 100' },
    ],
  },
  {
    key: 'q5',
    question: 'Does anyone in your team spend more than 2 hours a day on admin tasks?',
    options: [
      { value: 'yes',      label: 'Yes' },
      { value: 'no',       label: 'No' },
      { value: 'not_sure', label: 'Not sure' },
    ],
  },
  {
    key: 'q6',
    question: 'How many people work in your business?',
    options: [
      { value: 'solo',    label: 'Just me' },
      { value: '2_5',     label: '2–5 people' },
      { value: '6_20',    label: '6–20 people' },
      { value: 'over_20', label: 'More than 20' },
    ],
  },
  {
    key: 'q7',
    question: 'How much AI or automation are you already using in the business?',
    options: [
      { value: 'none',           label: 'None at all' },
      { value: 'basic_tools',    label: 'Basic tools only — email templates, spell check' },
      { value: 'some_automation', label: 'Some automation — scheduling, invoicing, reminders' },
      { value: 'ai_integrated',  label: 'AI is already part of how we work' },
    ],
  },
]

const TOTAL = QUESTIONS.length
const REQUIRED_KEYS = QUESTIONS.map(q => q.key)

export default function Step3Questions({ answers, onAnswer, onNext, onBack }: Props) {
  const answeredCount = REQUIRED_KEYS.filter(k => answers[k]).length
  const allAnswered = answeredCount === TOTAL
  const progressPct = (answeredCount / TOTAL) * 100

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted">Step 3 of 3</p>
        <p className="text-sm text-muted">{answeredCount} of {TOTAL} answered</p>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-border rounded-full h-1.5 mb-6">
        <div
          className="bg-ink h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <h1 className="font-serif text-3xl md:text-4xl font-normal text-ink mb-3 leading-tight">
        {TOTAL} quick questions
      </h1>
      <p className="text-muted mb-8 text-base leading-relaxed">
        Your answers calibrate the process and volume scores. Be honest — it gives you a more useful result.
      </p>

      <div className="space-y-8">
        {QUESTIONS.map((q, qi) => (
          <div key={q.key}>
            <p className="font-medium text-ink mb-3 text-base">
              <span className="text-muted mr-2">{qi + 1}.</span>
              {q.question}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {q.options.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onAnswer(q.key, opt.value)}
                  className={`
                    px-4 py-3 rounded-lg border text-left text-sm font-medium transition-all duration-150
                    ${answers[q.key] === opt.value
                      ? 'bg-ink text-white border-ink'
                      : 'bg-card border-border text-ink hover:border-ink/50'
                    }
                  `}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-10">
        <button
          onClick={onBack}
          className="px-6 py-3 border border-border text-ink font-medium rounded-lg hover:border-ink/50 transition-colors text-base"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!allAnswered}
          className="flex-1 md:flex-none md:w-auto px-8 py-3 bg-ink text-white font-medium rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-85 transition-opacity text-base"
        >
          {allAnswered ? 'Get my results →' : `Answer all ${TOTAL} to continue`}
        </button>
      </div>
    </div>
  )
}
