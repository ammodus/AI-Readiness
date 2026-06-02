'use client'

import { useState } from 'react'

interface Props {
  url: string
  name: string
  email: string
  onUrlChange: (url: string) => void
  onNameChange: (name: string) => void
  onEmailChange: (email: string) => void
  onNext: () => void
  onBack: () => void
}

export default function Step2URL({ url, name, email, onUrlChange, onNameChange, onEmailChange, onNext, onBack }: Props) {
  const [urlError, setUrlError] = useState('')
  const [emailError, setEmailError] = useState('')

  function normalise(raw: string): string {
    return raw.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '')
  }

  function validateUrl(val: string) {
    const clean = normalise(val)
    if (!clean || !clean.includes('.') || clean.length < 4) {
      setUrlError('Enter a valid website URL, e.g. yourbusiness.co.uk')
    } else {
      setUrlError('')
    }
  }

  function validateEmail(val: string) {
    if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setEmailError('Enter a valid email address')
    } else {
      setEmailError('')
    }
  }

  function handleContinue() {
    const cleanUrl = normalise(url)
    if (!cleanUrl || !cleanUrl.includes('.') || cleanUrl.length < 4) {
      setUrlError('Enter a valid website URL, e.g. yourbusiness.co.uk')
      return
    }
    if (!name.trim()) return
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Enter a valid email address')
      return
    }
    onUrlChange(cleanUrl)
    onNext()
  }

  const canProceed = url.trim() && name.trim() && email.trim() && !urlError && !emailError

  return (
    <div className="animate-fade-up">
      <p className="text-sm font-semibold uppercase tracking-widest text-muted mb-3">Step 2 of 3</p>
      <h1 className="font-serif text-3xl md:text-4xl font-normal text-ink mb-3 leading-tight">
        A few details
      </h1>
      <p className="text-muted mb-8 text-base leading-relaxed">
        We&apos;ll scan your website to assess your digital infrastructure.
        Your email is only used to send your report if you request it.
      </p>

      <div className="space-y-5 mb-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-ink mb-2">Your name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={e => onNameChange(e.target.value)}
            placeholder="Sarah Johnson"
            className="w-full px-4 py-3 bg-card border border-border rounded-lg text-ink text-base placeholder:text-muted/60 focus:outline-none focus:border-ink transition-colors"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-ink mb-2">Email address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => { onEmailChange(e.target.value); setEmailError('') }}
            onBlur={e => validateEmail(e.target.value)}
            placeholder="sarah@yourbusiness.co.uk"
            className={`w-full px-4 py-3 bg-card border rounded-lg text-ink text-base placeholder:text-muted/60 focus:outline-none focus:border-ink transition-colors ${emailError ? 'border-red-400' : 'border-border'}`}
          />
          {emailError && <p className="mt-1.5 text-sm text-red-600">{emailError}</p>}
        </div>

        <div>
          <label htmlFor="url" className="block text-sm font-medium text-ink mb-2">Website URL</label>
          <input
            id="url"
            type="text"
            value={url}
            onChange={e => { onUrlChange(e.target.value); setUrlError('') }}
            onBlur={e => validateUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleContinue()}
            placeholder="yourbusiness.co.uk"
            className={`w-full px-4 py-3 bg-card border rounded-lg text-ink text-base placeholder:text-muted/60 focus:outline-none focus:border-ink transition-colors ${urlError ? 'border-red-400' : 'border-border'}`}
          />
          {urlError && <p className="mt-1.5 text-sm text-red-600">{urlError}</p>}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-6 py-3 border border-border text-ink font-medium rounded-lg hover:border-ink/50 transition-colors text-base"
        >
          ← Back
        </button>
        <button
          onClick={handleContinue}
          disabled={!canProceed}
          className="flex-1 md:flex-none md:w-auto px-8 py-3 bg-ink text-white font-medium rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-85 transition-opacity text-base"
        >
          Continue →
        </button>
      </div>
    </div>
  )
}
