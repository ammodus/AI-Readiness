import type { Industry } from './types'
import { INDUSTRY_LABELS } from './benchmarks'

export function buildAnalysisPrompt(url: string, industry: Industry, customIndustry?: string): string {
  const industryLabel = customIndustry?.trim() || INDUSTRY_LABELS[industry]

  return `You are an AI automation analyst.

You will be given the text content scraped from a business website. Assess ONLY what you can genuinely observe in the content provided. Do not invent findings. If something is not present, say "not found." If something is ambiguous, say "unclear."

Assess the following signals and return a JSON object with exactly these fields:

{
  "bookingWidget":       { "found": boolean, "evidence": "brief description of what you saw, or 'not found'" },
  "liveChat":            { "found": boolean, "evidence": "..." },
  "intakeForm":          { "found": boolean, "evidence": "..." },
  "reviewsWidget":       { "found": boolean, "evidence": "..." },
  "clientPortal":        { "found": boolean, "evidence": "..." },
  "paymentProcessing":   { "found": boolean, "evidence": "..." },
  "analyticsSetup":      { "found": boolean, "evidence": "..." },
  "newsletterCapture":   { "found": boolean, "evidence": "..." },
  "techStack": "brief description of platform/tech observed (e.g. WordPress, Wix, custom), or 'unclear'",
  "generalObservation": "2-3 sentence honest summary of the site's digital maturity for a ${industryLabel} business"
}

Scoring guidance:

PRIMARY SIGNALS:
- bookingWidget: Look for Calendly, Acuity, Doctify, Jane App, Cliniko, or any embedded booking system. Also look for "book online", "book now", "schedule appointment" text suggesting a live booking flow (not just a contact form).
- liveChat: Look for Intercom, Tidio, Drift, Crisp, LiveChat mentions, or any chat widget references in script tags or visible UI.
- intakeForm: Look for multi-field forms beyond a basic contact form — new patient forms, client questionnaires, intake workflows, registration forms, onboarding flows.
- reviewsWidget: Look for Google Reviews, Trustpilot, Doctify, Reviews.co.uk, or other review badges/widgets, star ratings, or review counts displayed on the page.
- clientPortal: Look for login areas, patient portals, client login links, or mentions of a secure portal, member area, or client dashboard.

SECONDARY SIGNALS:
- paymentProcessing: Look for Stripe, Square, PayPal, GoCardless, Sage Pay, or any "pay online", "pay now", "payment" link that implies live transaction capability (not just a bank transfer note).
- analyticsSetup: Look for Google Analytics (gtag.js, ga.js, GA4), Google Tag Manager, Meta Pixel (fbq), or any other tracking/analytics script references.
- newsletterCapture: Look for email newsletter sign-up forms, Mailchimp embeds, ConvertKit, Klaviyo, or "subscribe" / "join our mailing list" calls to action with an email input.

Only return the JSON object. No markdown fences. No preamble. No trailing text.`
}
