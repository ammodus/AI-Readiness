/**
 * Lightweight runtime validation for the /api/analyse payload.
 *
 * The route previously cast `answers as DiagnosticAnswers` with no checks, so
 * malformed enum values silently fell through to scoring defaults and distorted
 * the result. This validates each field against its allowed set and rejects bad
 * input up front. Hand-rolled to avoid adding a schema dependency.
 */

import type { DiagnosticAnswers, Industry } from './types'

const ALLOWED = {
  q1: ['phone_email', 'contact_form', 'booking_widget', 'mix'],
  q2: ['paper_spreadsheets', 'basic_software', 'crm'],
  q3: ['none', 'manual', 'automated'],
  q4: ['under_10', '10_30', '30_100', 'over_100'],
  q5: ['yes', 'no', 'not_sure'],
  q6: ['solo', '2_5', '6_20', 'over_20'],
  q7: ['none', 'basic_tools', 'some_automation', 'ai_integrated'],
} as const

export const VALID_INDUSTRIES: Industry[] =
  ['dental', 'physio', 'accountancy', 'legal', 'recruitment', 'insurance', 'other']

export function isValidIndustry(v: unknown): v is Industry {
  return typeof v === 'string' && (VALID_INDUSTRIES as string[]).includes(v)
}

/**
 * Returns the validated answers, or an error string naming the offending field.
 */
export function validateAnswers(
  input: unknown,
): { ok: true; answers: DiagnosticAnswers } | { ok: false; error: string } {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'answers must be an object' }
  }
  const a = input as Record<string, unknown>

  for (const key of Object.keys(ALLOWED) as Array<keyof typeof ALLOWED>) {
    const value = a[key]
    if (typeof value !== 'string' || !(ALLOWED[key] as readonly string[]).includes(value)) {
      return { ok: false, error: `Invalid or missing answer for ${key}` }
    }
  }

  return { ok: true, answers: a as unknown as DiagnosticAnswers }
}

/** Basic URL sanity check (SSRF is enforced separately at fetch time). */
export function isPlausibleUrl(raw: unknown): raw is string {
  if (typeof raw !== 'string') return false
  const v = raw.trim()
  return v.length >= 4 && v.length <= 2048 && v.includes('.')
}
