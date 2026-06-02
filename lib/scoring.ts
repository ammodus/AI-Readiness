import type { DiagnosticAnswers, Industry, InfrastructureFindings, ReadinessBand, SubScores } from './types'

// ─── Industry-specific infrastructure weights ───────────────────────────────
// Each row sums to 100. Weights reflect which signals matter most per sector.

const INFRA_WEIGHTS: Record<Industry, {
  bookingWidget: number
  liveChat: number
  intakeForm: number
  reviewsWidget: number
  clientPortal: number
}> = {
  // Dental: booking and reviews are the conversion levers
  dental:       { bookingWidget: 30, liveChat: 15, intakeForm: 20, reviewsWidget: 25, clientPortal: 10 },
  // Physio: similar to dental — booking drives revenue; intake saves chair time
  physio:       { bookingWidget: 30, liveChat: 15, intakeForm: 20, reviewsWidget: 20, clientPortal: 15 },
  // Accountancy: client portal is table-stakes for compliance; intake form critical for onboarding
  accountancy:  { bookingWidget: 15, liveChat: 10, intakeForm: 25, reviewsWidget: 15, clientPortal: 35 },
  // Legal: client portal is paramount (GDPR, matter docs); intake form close second
  legal:        { bookingWidget: 10, liveChat: 15, intakeForm: 25, reviewsWidget: 10, clientPortal: 40 },
  // Recruitment: booking for interviews; intake form to standardise candidate registration
  recruitment:  { bookingWidget: 30, liveChat: 20, intakeForm: 25, reviewsWidget: 15, clientPortal: 10 },
  // Insurance: intake/enquiry form is the first conversion point; chat captures late-night queries
  insurance:    { bookingWidget: 20, liveChat: 20, intakeForm: 25, reviewsWidget: 15, clientPortal: 20 },
  // Other: balanced defaults
  other:        { bookingWidget: 25, liveChat: 20, intakeForm: 20, reviewsWidget: 15, clientPortal: 20 },
}

// Secondary signal bonus points (each adds up to 5 pts, capped so total ≤ 100)
const SECONDARY_BONUS = {
  paymentProcessing: 5,
  analyticsSetup: 5,
  newsletterCapture: 5,
} as const

export function calcInfraScore(findings: InfrastructureFindings, industry: Industry = 'other'): number {
  const w = INFRA_WEIGHTS[industry]
  const primary =
    (findings.bookingWidget.found  ? w.bookingWidget  : 0) +
    (findings.liveChat.found       ? w.liveChat       : 0) +
    (findings.intakeForm.found     ? w.intakeForm     : 0) +
    (findings.reviewsWidget.found  ? w.reviewsWidget  : 0) +
    (findings.clientPortal.found   ? w.clientPortal   : 0)

  const secondary =
    (findings.paymentProcessing?.found ? SECONDARY_BONUS.paymentProcessing : 0) +
    (findings.analyticsSetup?.found    ? SECONDARY_BONUS.analyticsSetup    : 0) +
    (findings.newsletterCapture?.found ? SECONDARY_BONUS.newsletterCapture : 0)

  return Math.min(100, primary + secondary)
}

/**
 * Process maturity score.
 *
 * Questions:
 *   q1  How enquiries arrive          (0–40)
 *   q2  Where client data is stored   (0–60)
 *   q3  Follow-up / reminder method   (0–60)
 *   q5  Staff admin burden            (−10–+10)
 *   q6  Team size (new)               (0–30)
 *   q7  Current AI/automation (new)   (0–80)
 *
 * Max raw: 40+60+60+10+30+80 = 280
 *
 * @param boost  Optional enrichment boost (0–20)
 */
export function calcProcessScore(a: DiagnosticAnswers, boost = 0): number {
  const q1 = { phone_email: 0, contact_form: 20, booking_widget: 40, mix: 30 }[a.q1] ?? 0
  const q2 = { paper_spreadsheets: 0, basic_software: 30, crm: 60 }[a.q2] ?? 0
  const q3 = { none: 0, manual: 20, automated: 60 }[a.q3] ?? 0
  const q5 = { yes: -10, no: 10, not_sure: 0 }[a.q5] ?? 0
  const q6 = { solo: 0, '2_5': 10, '6_20': 20, over_20: 30 }[a.q6 ?? 'solo'] ?? 0
  const q7 = { none: 0, basic_tools: 20, some_automation: 50, ai_integrated: 80 }[a.q7 ?? 'none'] ?? 0

  const raw = q1 + q2 + q3 + q5 + q6 + q7
  const base = Math.min(100, Math.max(0, Math.round((raw / 280) * 100)))
  return Math.min(100, base + boost)
}

/**
 * Volume / ROI potential score.
 *
 * @param boost  Optional enrichment boost (0–20)
 */
export function calcVolumeScore(a: DiagnosticAnswers, boost = 0): number {
  const base = { under_10: 20, '10_30': 50, '30_100': 80, over_100: 100 }[a.q4] ?? 20
  return Math.min(100, base + boost)
}

export function calcOverallScore(sub: SubScores, scanFailed = false): number {
  // Normal weighting: infrastructure 40% / process 35% / volume 25%.
  // If the website scan failed, infrastructure is unknown rather than zero —
  // redistribute its weight across the two answer-based dimensions (≈58/42)
  // so a tool-side fetch failure doesn't unfairly penalise the business.
  if (scanFailed) {
    return Math.round(sub.process * 0.58 + sub.volume * 0.42)
  }
  return Math.round(sub.infrastructure * 0.4 + sub.process * 0.35 + sub.volume * 0.25)
}

export function getBand(score: number): ReadinessBand {
  if (score < 40) return 'foundations'
  if (score < 65) return 'getting_there'
  if (score < 85) return 'ready'
  return 'primed'
}
