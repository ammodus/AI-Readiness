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

const INDUSTRY_SELECT: Record<string, string> = {
  dental:       'Dental',
  physio:       'Physiotherapy',
  accountancy:  'Accountancy',
  legal:        'Legal',
  recruitment:  'Recruitment',
  insurance:    'Insurance',
  other:        'Other',
}

const BAND_SELECT: Record<string, string> = {
  foundations:   'Foundations first',
  getting_there: 'Getting there',
  ready:         'Ready to build',
  primed:        'Primed',
}

const client = new Client({ auth: process.env.NOTION_API_KEY })

export async function logLeadToNotion(
  name: string,
  email: string,
  result: AnalysisResult,
  customIndustry?: string,
): Promise<void> {
  const databaseId = process.env.NOTION_DATABASE_ID
  if (!process.env.NOTION_API_KEY || !databaseId) return

  const trimmedName = name.trim().slice(0, 200)
  const trimmedEmail = email.trim().slice(0, 200)
  if (!trimmedName || !trimmedEmail) return

  const industryLabel = customIndustry?.trim()
    || INDUSTRY_SELECT[result.industry]
    || 'Other'

  const bandLabel = BAND_SELECT[result.band] || 'Foundations first'

  const notes = (result.findings.generalObservation ?? '').slice(0, 2000)

  try {
    await client.pages.create({
      parent: { database_id: databaseId },
      properties: {
        Name: {
          title: [{ text: { content: trimmedName } }],
        },
        Email: {
          email: trimmedEmail,
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
          rich_text: notes ? [{ text: { content: notes } }] : [],
        },
      },
    })
  } catch (err) {
    console.error('Notion CRM log failed:', (err as Error).message)
  }
}
