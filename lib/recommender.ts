/**
 * Dynamic recommendation generator.
 *
 * Uses Claude Haiku to produce 3 personalised recommendations based on:
 *   - actual website findings (what's there, what's missing)
 *   - enrichment signals (hiring activity, tech adoption, company age, headcount)
 *   - sub-scores (which dimension is weakest)
 *   - diagnostic answers
 *   - industry context
 *
 * Falls back to the static benchmark recommendations if Claude fails.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { DiagnosticAnswers, Industry, InfrastructureFindings, Recommendation, SubScores } from './types'
import type { EnrichmentSummary } from './types'
import { INDUSTRY_LABELS } from './benchmarks'
import { getTopRecommendations } from './benchmarks'

const EFFORT_VALUES = ['Quick win', 'Medium lift', 'Strategic'] as const

function isValidEffort(v: unknown): v is Recommendation['effort'] {
  return EFFORT_VALUES.includes(v as Recommendation['effort'])
}

function buildContext(
  industry: Industry,
  findings: InfrastructureFindings,
  subScores: SubScores,
  answers: DiagnosticAnswers,
  enrichment: EnrichmentSummary | null,
): string {
  const industryLabel = INDUSTRY_LABELS[industry]

  const foundSignals = [
    findings.bookingWidget.found     && 'online booking widget',
    findings.liveChat.found          && 'live chat',
    findings.intakeForm.found        && 'digital intake form',
    findings.reviewsWidget.found     && 'reviews widget',
    findings.clientPortal.found      && 'client portal',
    findings.paymentProcessing?.found && 'online payment processing',
    findings.analyticsSetup?.found   && 'analytics/tracking setup',
    findings.newsletterCapture?.found && 'newsletter capture',
  ].filter(Boolean).join(', ') || 'none detected'

  const missingSignals = [
    !findings.bookingWidget.found     && 'online booking',
    !findings.liveChat.found          && 'live chat',
    !findings.intakeForm.found        && 'digital intake form',
    !findings.reviewsWidget.found     && 'reviews widget',
    !findings.clientPortal.found      && 'client portal',
  ].filter(Boolean).join(', ') || 'none'

  const enquiryMethod = {
    phone_email: 'phone or email only',
    contact_form: 'website contact form',
    booking_widget: 'online booking widget',
    mix: 'mix of channels',
  }[answers.q1]

  const dataStorage = {
    paper_spreadsheets: 'paper or spreadsheets',
    basic_software: 'basic software (Gmail / Excel)',
    crm: 'dedicated CRM or practice management system',
  }[answers.q2]

  const followUp = {
    none: 'no follow-up process',
    manual: 'manual follow-up',
    automated: 'automated follow-up',
  }[answers.q3]

  const volume = {
    under_10: 'fewer than 10 enquiries/clients per month',
    '10_30': '10–30 enquiries/clients per month',
    '30_100': '30–100 enquiries/clients per month',
    over_100: 'more than 100 enquiries/clients per month',
  }[answers.q4]

  const teamSize = {
    solo: 'solo operator',
    '2_5': '2–5 person team',
    '6_20': '6–20 person team',
    over_20: '20+ person team',
  }[answers.q6 ?? 'solo']

  const aiUsage = {
    none: 'no AI or automation tools currently',
    basic_tools: 'basic tools only (e.g. email templates)',
    some_automation: 'some automation in place',
    ai_integrated: 'AI already integrated into workflows',
  }[answers.q7 ?? 'none']

  const enrichmentNotes = enrichment ? [
    enrichment.hiringSignal && '- Recent hiring activity detected (business is growing)',
    enrichment.techSignal && '- Software/platform adoption signals detected online',
    enrichment.officerCount !== null && `- Companies House shows ~${enrichment.officerCount} officers`,
    enrichment.companyAgeYears !== null && `- Business has been operating for ~${enrichment.companyAgeYears} years`,
    enrichment.companyType && `- Registered as ${enrichment.companyType.toUpperCase()}`,
  ].filter(Boolean).join('\n') : ''

  return `Industry: ${industryLabel}
Website signals found: ${foundSignals}
Website signals missing: ${missingSignals}
Tech stack: ${findings.techStack || 'unknown'}
General observation: ${findings.generalObservation || 'n/a'}

Sub-scores (out of 100):
- Infrastructure: ${subScores.infrastructure} ${subScores.infrastructure < 40 ? '(weak)' : subScores.infrastructure < 70 ? '(moderate)' : '(strong)'}
- Process maturity: ${subScores.process} ${subScores.process < 40 ? '(weak)' : subScores.process < 70 ? '(moderate)' : '(strong)'}
- Volume/ROI potential: ${subScores.volume} ${subScores.volume < 40 ? '(low)' : subScores.volume < 70 ? '(moderate)' : '(high)'}

How enquiries arrive: ${enquiryMethod}
Client data storage: ${dataStorage}
Follow-up method: ${followUp}
Monthly volume: ${volume}
Team size: ${teamSize}
AI / automation usage: ${aiUsage}
${enrichmentNotes ? `\nExternal signals:\n${enrichmentNotes}` : ''}`
}

export async function getDynamicRecommendations(
  industry: Industry,
  findings: InfrastructureFindings,
  subScores: SubScores,
  answers: DiagnosticAnswers,
  enrichment: EnrichmentSummary | null,
): Promise<Recommendation[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return getTopRecommendations(subScores, industry)

  const context = buildContext(industry, findings, subScores, answers, enrichment)

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 800,
      system: `You are an AI readiness consultant specialising in small UK professional services businesses.
You give practical, specific, honest recommendations — not generic advice.
You understand the real-world constraints of UK SMEs: limited budget, small teams, no in-house tech.
You never recommend enterprise software to a solo operator.
You always use British spelling.
You never mention AI, automation, or technology as abstract concepts — only concrete tools and specific actions.`,
      messages: [{
        role: 'user',
        content: `Based on this AI readiness assessment, give exactly 3 prioritised recommendations.

CONTEXT:
${context}

Return a JSON array with exactly 3 objects. Each object must have:
- "title": short action-oriented title (max 10 words)
- "description": 2-3 sentences. Specific, concrete, grounded in the context above. Reference actual tools or processes relevant to this industry. Explain the tangible benefit.
- "effort": exactly one of "Quick win", "Medium lift", or "Strategic"

Order by priority: most impactful first.
Return only the JSON array. No markdown. No preamble.`,
      }],
    })

    const raw = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim()

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Invalid response shape')

    return parsed.slice(0, 3).map((r: unknown) => {
      const rec = r as Record<string, unknown>
      return {
        title: String(rec.title ?? ''),
        description: String(rec.description ?? ''),
        effort: isValidEffort(rec.effort) ? rec.effort : 'Medium lift',
      }
    }).filter(r => r.title && r.description)

  } catch (err) {
    console.warn('Dynamic recommendations failed, using static fallback:', (err as Error).message)
    return getTopRecommendations(subScores, industry)
  }
}
