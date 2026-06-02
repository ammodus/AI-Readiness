/**
 * Generates the narrative sections of the email report using Claude Haiku.
 * These are the parts that go deeper than the browser — personalised intro,
 * per-finding business impact, and a concrete next-steps plan.
 * Falls back to plain strings on any failure.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { AnalysisResult } from './types'
import { BAND_META, INDUSTRY_LABELS } from './benchmarks'

export interface EmailNarrative {
  intro: string
  findingsNarrative: string
  nextSteps: string[]
}

const FALLBACK: EmailNarrative = {
  intro: '',
  findingsNarrative: '',
  nextSteps: [],
}

export async function generateEmailNarrative(
  result: AnalysisResult,
  name: string,
  customIndustry?: string,
): Promise<EmailNarrative> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return FALLBACK

  const industryLabel = customIndustry?.trim() || INDUSTRY_LABELS[result.industry]
  const band = BAND_META[result.band]

  const found = [
    result.findings.bookingWidget.found && 'online booking widget',
    result.findings.liveChat.found && 'live chat',
    result.findings.intakeForm.found && 'digital intake form',
    result.findings.reviewsWidget.found && 'reviews widget',
    result.findings.clientPortal.found && 'client portal',
  ].filter(Boolean).join(', ') || 'none of the five key signals'

  const missing = [
    !result.findings.bookingWidget.found && `online booking (${result.findings.bookingWidget.evidence})`,
    !result.findings.liveChat.found && `live chat (${result.findings.liveChat.evidence})`,
    !result.findings.intakeForm.found && `digital intake form (${result.findings.intakeForm.evidence})`,
    !result.findings.reviewsWidget.found && `reviews widget (${result.findings.reviewsWidget.evidence})`,
    !result.findings.clientPortal.found && `client portal (${result.findings.clientPortal.evidence})`,
  ].filter(Boolean).join(', ') || 'none'

  const enrichmentContext = result.enrichment ? [
    result.enrichment.hiringSignal && 'Recent hiring activity was detected online — suggesting growth.',
    result.enrichment.techSignal && 'Software or platform adoption signals were found via web research.',
    result.enrichment.companyAgeYears !== null && `The business has been operating for approximately ${result.enrichment.companyAgeYears} years.`,
    result.enrichment.officerCount !== null && `Companies House shows ${result.enrichment.officerCount} officers on record.`,
  ].filter(Boolean).join(' ') : ''

  const prompt = `You are writing sections of a professional AI readiness report for ${name}, who runs a ${industryLabel} business.

Overall score: ${result.overallScore}/100 — ${band.label}
Band description: ${band.description}

Infrastructure score: ${result.subScores.infrastructure}/100
Process score: ${result.subScores.process}/100
Volume/ROI score: ${result.subScores.volume}/100

Website signals found: ${found}
Website signals missing: ${missing}

Score context:
- Infrastructure: ${result.scoreExplanation?.infrastructure || 'n/a'}
- Process: ${result.scoreExplanation?.process || 'n/a'}
- Volume: ${result.scoreExplanation?.volume || 'n/a'}

General site observation: ${result.findings.generalObservation || 'n/a'}
Tech stack: ${result.findings.techStack || 'unknown'}
${enrichmentContext ? `External signals: ${enrichmentContext}` : ''}

Write three sections. Return as a JSON object with exactly these keys:

{
  "intro": "3–4 sentences. A personalised, honest opening that tells ${name} what the score actually means for a ${industryLabel} business at their stage. Reference their specific score and the most notable finding. Don't start with 'Your score is' — lead with context. British English.",

  "findingsNarrative": "4–5 sentences explaining what the website findings mean for their day-to-day business. Don't just list what was or wasn't found — explain the practical consequence of each gap for a ${industryLabel} business specifically. Be concrete. Reference the actual evidence where useful.",

  "nextSteps": [
    "Step 1 — specific, actionable, scoped to their situation. Name a real tool or process. Include a rough time estimate.",
    "Step 2 — ...",
    "Step 3 — ...",
    "Step 4 — ..."
  ]
}

Rules:
- British spelling throughout
- Write as a knowledgeable independent adviser, not a service provider
- No invented revenue figures — stick to time, process, or conversion framing
- Be honest about what you don't know from the data
- nextSteps must be ordered by priority (quickest wins first)
- Return only the JSON object. No markdown. No preamble.`

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim()

    const parsed = JSON.parse(raw)

    return {
      intro: typeof parsed.intro === 'string' ? parsed.intro : '',
      findingsNarrative: typeof parsed.findingsNarrative === 'string' ? parsed.findingsNarrative : '',
      nextSteps: Array.isArray(parsed.nextSteps)
        ? parsed.nextSteps.filter((s: unknown) => typeof s === 'string').slice(0, 5)
        : [],
    }
  } catch (err) {
    console.warn('Email narrative generation failed:', (err as Error).message)
    return FALLBACK
  }
}
