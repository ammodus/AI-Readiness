import { NextRequest, NextResponse } from 'next/server'
import { analyseWebsite } from '@/lib/analyser'
import { enrichBusiness } from '@/lib/enricher'
import { getDynamicRecommendations } from '@/lib/recommender'
import { calcInfraScore, calcProcessScore, calcVolumeScore, calcOverallScore, getBand } from '@/lib/scoring'
import { isValidIndustry, validateAnswers, isPlausibleUrl } from '@/lib/validation'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { signResult } from '@/lib/signing'
import { logLeadToNotion } from '@/lib/notion'
import type {
  DiagnosticAnswers, Industry, AnalysisResult, EnrichmentSummary,
  InfrastructureFindings, SubScores, ScoreExplanation,
} from '@/lib/types'
import type { EnrichmentData } from '@/lib/enricher'

export const maxDuration = 90

// ─── Helpers ────────────────────────────────────────────────────────────────

function mergeFindings(
  primary: InfrastructureFindings,
  enrichment: EnrichmentData,
): InfrastructureFindings {
  const extra = enrichment.multiPage?.extraSignals ?? {}
  return {
    ...primary,
    bookingWidget: extra.bookingWidget?.found && !primary.bookingWidget.found
      ? extra.bookingWidget : primary.bookingWidget,
    liveChat: extra.liveChat?.found && !primary.liveChat.found
      ? extra.liveChat : primary.liveChat,
    intakeForm: extra.intakeForm?.found && !primary.intakeForm.found
      ? extra.intakeForm : primary.intakeForm,
    reviewsWidget: extra.reviewsWidget?.found && !primary.reviewsWidget.found
      ? extra.reviewsWidget : primary.reviewsWidget,
    clientPortal: extra.clientPortal?.found && !primary.clientPortal.found
      ? extra.clientPortal : primary.clientPortal,
  }
}

function buildEnrichmentSummary(e: EnrichmentData): EnrichmentSummary | null {
  const hasAnyData = e.tavily !== null || e.companiesHouse !== null || e.multiPage !== null
  if (!hasAnyData) return null

  const companyAgeYears = e.companiesHouse?.found && e.companiesHouse.incorporationDate
    ? Math.floor((Date.now() - new Date(e.companiesHouse.incorporationDate).getTime()) / (1000 * 60 * 60 * 24 * 365))
    : null

  const extraInfraSignals = Object.entries(e.multiPage?.extraSignals ?? {})
    .filter(([, v]) => (v as { found: boolean }).found)
    .map(([k]) => k)

  return {
    hiringSignal: e.tavily?.hiringSignal ?? false,
    techSignal: e.tavily?.techSignal ?? false,
    companyAgeYears,
    officerCount: e.companiesHouse?.found ? e.companiesHouse.officerCount : null,
    companyType: e.companiesHouse?.found ? e.companiesHouse.companyType : null,
    extraInfraSignals,
  }
}

const SIGNAL_NAMES: Record<string, string> = {
  bookingWidget: 'online booking',
  liveChat: 'live chat',
  intakeForm: 'digital intake form',
  reviewsWidget: 'reviews widget',
  clientPortal: 'client portal',
}

function buildScoreExplanation(
  findings: InfrastructureFindings,
  answers: DiagnosticAnswers,
  subScores: SubScores,
  enrichment: EnrichmentSummary | null,
  scanFailed: boolean,
): ScoreExplanation {
  // ── Infrastructure ──
  let infrastructure: string
  if (scanFailed) {
    infrastructure = 'Site scan was unavailable — this score is based on your answers only.'
  } else {
    const found = (['bookingWidget', 'liveChat', 'intakeForm', 'reviewsWidget', 'clientPortal'] as const)
      .filter(k => findings[k].found).map(k => SIGNAL_NAMES[k])
    const missing = (['bookingWidget', 'liveChat', 'intakeForm', 'reviewsWidget', 'clientPortal'] as const)
      .filter(k => !findings[k].found).map(k => SIGNAL_NAMES[k])
    const secondaryFound = [
      findings.paymentProcessing?.found && 'payment processing',
      findings.analyticsSetup?.found    && 'analytics tracking',
      findings.newsletterCapture?.found && 'newsletter signup',
    ].filter(Boolean) as string[]

    if (found.length === 0) {
      infrastructure = `None of the five key infrastructure signals were detected on your site${missing.length ? ` — missing ${missing.join(', ')}` : ''}.`
    } else {
      infrastructure = `Found: ${found.join(', ')}.${missing.length ? ` Missing: ${missing.join(', ')}.` : ''}`
    }
    if (secondaryFound.length) {
      infrastructure += ` Also detected: ${secondaryFound.join(', ')}.`
    }
    if (enrichment?.extraInfraSignals.length) {
      infrastructure += ` Additional signals found on sub-pages.`
    }
  }

  // ── Process ──
  const enquiryLabel = {
    phone_email: 'phone or email only',
    contact_form: 'a website contact form',
    booking_widget: 'an online booking widget',
    mix: 'multiple channels',
  }[answers.q1]

  const storageLabel = {
    paper_spreadsheets: 'paper or spreadsheets',
    basic_software: 'basic software',
    crm: 'a dedicated CRM or practice management system',
  }[answers.q2]

  const followUpLabel = {
    none: 'no automated follow-up in place',
    manual: 'manual follow-up',
    automated: 'automated follow-up',
  }[answers.q3]

  const aiLabel = {
    none: 'no AI or automation tools',
    basic_tools: 'basic tools only',
    some_automation: 'some automation already in use',
    ai_integrated: 'AI already integrated into workflows',
  }[answers.q7 ?? 'none']

  let process = `Enquiries arrive via ${enquiryLabel}. Client data stored in ${storageLabel}. Follow-up: ${followUpLabel}. AI/automation: ${aiLabel}.`
  if (enrichment?.techSignal) {
    process += ' Web research suggests software or platform adoption beyond what was self-reported.'
  }

  // ── Volume ──
  const volumeLabel = {
    under_10: 'fewer than 10 enquiries per month',
    '10_30':  '10–30 enquiries per month',
    '30_100': '30–100 enquiries per month',
    over_100: 'more than 100 enquiries per month',
  }[answers.q4]

  const teamLabel = {
    solo: 'solo operator',
    '2_5': '2–5 person team',
    '6_20': '6–20 person team',
    over_20: '20+ person team',
  }[answers.q6 ?? 'solo']

  let volume = `You handle ${volumeLabel} with a ${teamLabel}.`
  if (enrichment?.hiringSignal) {
    volume += ' Web research found evidence of recent hiring — actual volume may be higher than reported.'
  }
  if (enrichment?.officerCount !== null && enrichment?.officerCount !== undefined) {
    volume += ` Companies House shows ${enrichment.officerCount} officers on record.`
  }

  return { infrastructure, process, volume }
}

// ─── Route ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: {
    url?: string
    industry?: string
    customIndustry?: string
    answers?: Partial<DiagnosticAnswers>
    name?: string
    email?: string
  }

  // Rate limit: each call triggers external fetches + an LLM call.
  const limit = rateLimit(`analyse:${clientIp(req)}`, 8, 10 * 60 * 1000)
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
    )
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { url, industry, customIndustry, answers, name, email } = body

  if (!isPlausibleUrl(url)) {
    return NextResponse.json({ error: 'Enter a valid website URL' }, { status: 400 })
  }
  if (!isValidIndustry(industry)) {
    return NextResponse.json({ error: 'Invalid industry' }, { status: 400 })
  }
  const validation = validateAnswers(answers)
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const normUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`
  const fullAnswers = validation.answers

  // Website scan + enrichment run in parallel
  const [{ findings: primaryFindings, scanFailed }, enrichmentData] = await Promise.all([
    analyseWebsite(normUrl, industry as Industry, customIndustry),
    enrichBusiness(normUrl, industry as Industry),
  ])

  const findings = mergeFindings(primaryFindings, enrichmentData)
  const enrichmentSummary = buildEnrichmentSummary(enrichmentData)

  // Scores
  const infraScore   = calcInfraScore(findings, industry as Industry)
  const processScore = calcProcessScore(fullAnswers, enrichmentData.processBoost)
  const volumeScore  = calcVolumeScore(fullAnswers, enrichmentData.volumeBoost)

  const subScores = { infrastructure: infraScore, process: processScore, volume: volumeScore }
  // When the site scan fails, infrastructure is unknown (not zero) — don't let a
  // tool-side fetch failure tank the overall score. Re-weight onto process/volume.
  const overallScore = calcOverallScore(subScores, scanFailed)
  const band = getBand(overallScore)

  // Score explanation (deterministic — no Claude call needed)
  const scoreExplanation = buildScoreExplanation(
    findings, fullAnswers, subScores, enrichmentSummary, scanFailed,
  )

  // Dynamic recommendations (Claude Sonnet — falls back to static on failure)
  const dynamicRecommendations = await getDynamicRecommendations(
    industry as Industry, findings, subScores, fullAnswers, enrichmentSummary,
  )

  const result: AnalysisResult = {
    overallScore,
    band,
    subScores,
    findings,
    scanFailed,
    url: normUrl,
    industry: industry as Industry,
    scoreExplanation,
    dynamicRecommendations,
    enrichment: enrichmentSummary,
  }

  // Sign the result so /api/send-report can verify it was produced here and
  // not forged by the client.
  const signature = signResult(result)

  // Log to Notion CRM as soon as analysis completes — fire and forget
  if (name && email) {
    logLeadToNotion(name, email, result, customIndustry).catch(() => {})
  }

  return NextResponse.json({ result, signature })
}
