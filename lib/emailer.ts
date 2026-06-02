import { Resend } from 'resend'
import type { AnalysisResult } from './types'
import { buildEmailHtml } from './emailTemplate'
import { generateEmailNarrative } from './emailNarrative'
import { BAND_META } from './benchmarks'

function getResend() {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY not set')
  return new Resend(process.env.RESEND_API_KEY)
}

export async function sendReport(
  to: string,
  name: string,
  result: AnalysisResult,
  customIndustry?: string,
): Promise<void> {
  const domain = result.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]
  const bandLabel = BAND_META[result.band].label
  const bcc = process.env.ADMIN_EMAIL ? [process.env.ADMIN_EMAIL] : []

  // Generate the narrative in parallel — never blocks the send if it fails
  const narrative = await generateEmailNarrative(result, name, customIndustry).catch(() => undefined)

  await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
    to: [to],
    bcc,
    subject: `Your AI Readiness Report — ${domain} (${result.overallScore}/100 · ${bandLabel})`,
    html: buildEmailHtml(name, result, customIndustry, narrative),
  })
}
