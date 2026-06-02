export type Industry = 'dental' | 'physio' | 'accountancy' | 'legal' | 'recruitment' | 'insurance' | 'other'

export type ReadinessBand = 'foundations' | 'getting_there' | 'ready' | 'primed'

export type InfraSignalKey =
  | 'bookingWidget'
  | 'liveChat'
  | 'intakeForm'
  | 'reviewsWidget'
  | 'clientPortal'
  | 'paymentProcessing'
  | 'analyticsSetup'
  | 'newsletterCapture'

/** Primary signals — displayed in the main "What we found" section */
export const PRIMARY_SIGNAL_KEYS: InfraSignalKey[] = [
  'bookingWidget', 'liveChat', 'intakeForm', 'reviewsWidget', 'clientPortal',
]

/** Secondary signals — shown as additional context, lighter weight */
export const SECONDARY_SIGNAL_KEYS: InfraSignalKey[] = [
  'paymentProcessing', 'analyticsSetup', 'newsletterCapture',
]

export interface DiagnosticAnswers {
  /** How new enquiries reach the business */
  q1: 'phone_email' | 'contact_form' | 'booking_widget' | 'mix'
  /** Where client/patient data is stored */
  q2: 'paper_spreadsheets' | 'basic_software' | 'crm'
  /** How reminders and follow-ups are sent */
  q3: 'none' | 'manual' | 'automated'
  /** Monthly enquiry/client volume */
  q4: 'under_10' | '10_30' | '30_100' | 'over_100'
  /** Whether staff spend 2+ hours/day on admin */
  q5: 'yes' | 'no' | 'not_sure'
  /** Team size */
  q6: 'solo' | '2_5' | '6_20' | 'over_20'
  /** Current AI / automation adoption level */
  q7: 'none' | 'basic_tools' | 'some_automation' | 'ai_integrated'
}

export interface InfraSignalResult {
  found: boolean
  evidence: string
}

export interface InfrastructureFindings {
  // Primary signals
  bookingWidget: InfraSignalResult
  liveChat: InfraSignalResult
  intakeForm: InfraSignalResult
  reviewsWidget: InfraSignalResult
  clientPortal: InfraSignalResult
  // Secondary signals
  paymentProcessing: InfraSignalResult
  analyticsSetup: InfraSignalResult
  newsletterCapture: InfraSignalResult
  // Meta
  techStack: string
  generalObservation: string
}

export interface SubScores {
  infrastructure: number
  process: number
  volume: number
}

export interface ScoreExplanation {
  infrastructure: string
  process: string
  volume: string
}

export interface Recommendation {
  title: string
  description: string
  effort: 'Quick win' | 'Medium lift' | 'Strategic'
}

export interface AnalysisResult {
  overallScore: number
  band: ReadinessBand
  subScores: SubScores
  findings: InfrastructureFindings
  scanFailed: boolean
  url: string
  industry: Industry
  /** Deterministic plain-language explanation for each sub-score */
  scoreExplanation: ScoreExplanation
  /** Claude-generated recommendations — null means use static fallback */
  dynamicRecommendations: Recommendation[] | null
  /** Enrichment summary — null if all enrichment steps were skipped/failed */
  enrichment: EnrichmentSummary | null
}

// ─── Enrichment types (populated by lib/enricher.ts) ──────────────────────

export interface EnrichmentSummary {
  /** Whether Tavily detected hiring / growth activity */
  hiringSignal: boolean
  /** Whether Tavily detected software / CRM / platform adoption */
  techSignal: boolean
  /** Company age in years (from Companies House), or null if not found */
  companyAgeYears: number | null
  /** Officer count proxy for headcount, or null if not found */
  officerCount: number | null
  /** Company type e.g. 'ltd', 'llp', or null if not found */
  companyType: string | null
  /** Extra infrastructure signals found on sub-pages */
  extraInfraSignals: string[]
}
