/**
 * Notion CRM integration.
 *
 * Logs each completed AI Readiness submission to the
 * "🎯 AI Readiness Leads" database in the AV Consulting Group workspace.
 *
 * Fire-and-forget — never blocks the email send.
 * Silently skipped if NOTION_API_KEY or NOTION_DATABASE_ID are absent.
 */

import { Client } from '@notionhq/client'
import type { AnalysisResult } from './types'
import { INDUSTRY_LABELS } from './benchmarks'

// ─── Maps ────────────────────────────────────────────────────────────────────

/** Convert internal industry key → Notion select option label */
const INDUSTRY_SELECT: Record<string, string> = {
  dental:       'Dental',
  physio:       'Physio',
  accountancy:  'Accountancy',
  legal:        'Legal',
  recruitment:  'Recruitment',
  insurance:    'Insurance',
  other:        'Other',
}

/** Convert internal band key → Notion select option label */
const BAND_SELECT: Record<string, string> = {
  foundations:   'Foundations first',
  getting_there: 'Getting there',
  ready:         'Ready to build',
  primed:        'Primed',
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function logLeadToNotion(
  name: string,
  email: string,
  result: AnalysisResult,
  customIndustry?: string,
): Promise<void> {
  const apiKey    = process.env.NOTION_API_KEY
  const databaseId = process.env.NOTION_DATABASE_ID
  console.log('Notion env check — key present:', !!apiKey, '| db present:', !!databaseId)
  if (!apiKey || !databaseId) return

  const client = new Client({ auth: apiKey })

  const industryLabel = customIndustry?.trim()
    || INDUSTRY_SELECT[result.industry]
    || 'Other'

  const bandLabel = BAND_SELECT[result.band] || 'Foundations first'

  try {
    await client.pages.create({
      parent: { database_id: databaseId },
      properties: {
        // Title (Name)
        Name: {
          title: [{ text: { content: name } }],
        },
        Email: {
          email,
        },
        Website: {
          url: result.url,
        },
        Industry: {
          select: { name: industryLabel },
        },
        'Overall Score': {
          number: result.overallScore,
        },
        Band: {
          select: { name: bandLabel },
        },
        'Infrastructure Score': {
          number: result.subScores.infrastructure,
        },
        'Process Score': {
          number: result.subScores.process,
        },
        'Volume Score': {
          number: result.subScores.volume,
        },
        Status: {
          select: { name: 'New' },
        },
        Notes: {
          rich_text: result.findings.generalObservation
            ? [{ text: { content: result.findings.generalObservation } }]
            : [],
        },
      },
    })
  } catch (err) {
    // Never surface Notion errors to the user — log only
    console.error('Notion CRM log failed:', (err as Error).message)
  }
}
