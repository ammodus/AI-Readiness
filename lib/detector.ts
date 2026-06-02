/**
 * Deterministic infrastructure-signal detector.
 *
 * Replaces the previous Claude-based website scan. Detection runs on RAW HTML
 * (scripts, iframes, link tags intact) because most of these signals — live
 * chat, analytics, payment, booking embeds — live in <script>/<iframe>/<link>
 * tags, not in visible body text. Fingerprint matching is cheaper, faster,
 * reproducible, immune to prompt injection, and more accurate than asking an
 * LLM to infer vendors from stripped text.
 *
 * Each signal records the concrete evidence (matched vendor or phrase) so the
 * report can show *why* something was detected.
 */

import type { InfrastructureFindings, InfraSignalResult } from './types'

// A fingerprint is a label plus the patterns that, if matched, prove the signal.
interface Fingerprint {
  evidence: string
  patterns: RegExp[]
}

const BOOKING: Fingerprint[] = [
  { evidence: 'Calendly booking embed', patterns: [/calendly\.com/i] },
  { evidence: 'Acuity Scheduling', patterns: [/acuityscheduling\.com|squarespace-scheduling/i] },
  { evidence: 'Cal.com booking', patterns: [/\bcal\.com\b|app\.cal\.com/i] },
  { evidence: 'YouCanBook.me', patterns: [/youcanbook\.me/i] },
  { evidence: 'SimplyBook.me', patterns: [/simplybook\.(me|it)/i] },
  { evidence: 'Setmore', patterns: [/setmore\.com/i] },
  { evidence: 'Doctify booking', patterns: [/doctify\.com/i] },
  { evidence: 'Cliniko booking', patterns: [/cliniko\.com/i] },
  { evidence: 'Jane App booking', patterns: [/jane\s?app|janeapp\.com|\.janeapp\./i] },
  { evidence: 'Dentally', patterns: [/dentally\.co/i] },
  { evidence: 'TIMIFY', patterns: [/timify\.com/i] },
  { evidence: 'Online booking flow', patterns: [/book\s+(online|now|an?\s+appointment)|schedule\s+(an?\s+)?appointment|reserve\s+your\s+slot/i] },
]

const LIVE_CHAT: Fingerprint[] = [
  { evidence: 'Intercom', patterns: [/intercom\.io|widget\.intercom|intercomcdn/i] },
  { evidence: 'Tidio', patterns: [/tidio\.co|tidiochat/i] },
  { evidence: 'Drift', patterns: [/drift\.com|js\.driftt\.com/i] },
  { evidence: 'Crisp', patterns: [/crisp\.chat/i] },
  { evidence: 'tawk.to', patterns: [/tawk\.to/i] },
  { evidence: 'LiveChat', patterns: [/livechatinc\.com|cdn\.livechat/i] },
  { evidence: 'Zendesk Chat', patterns: [/zopim\.com|zendesk\.com\/embeddable|static\.zdassets/i] },
  { evidence: 'Freshchat', patterns: [/freshchat|wchat\.freshchat/i] },
  { evidence: 'Olark', patterns: [/olark\.com/i] },
  { evidence: 'HubSpot chat', patterns: [/js\.hs-scripts\.com|hubspot.*conversations/i] },
  { evidence: 'Facebook Messenger chat', patterns: [/connect\.facebook\.net.*customerchat|fb-customerchat/i] },
  { evidence: 'Chat widget', patterns: [/live\s?chat|chat\s+with\s+us|chat\s+widget/i] },
]

const INTAKE_FORM: Fingerprint[] = [
  { evidence: 'Typeform', patterns: [/typeform\.com/i] },
  { evidence: 'Jotform', patterns: [/jotform\.com/i] },
  { evidence: 'Gravity Forms', patterns: [/gravity[_-]?forms|gform_/i] },
  { evidence: 'Cognito Forms', patterns: [/cognitoforms\.com/i] },
  { evidence: 'Patient/client intake form', patterns: [/new\s+patient\s+form|patient\s+registration|intake\s+form|client\s+questionnaire|registration\s+form|onboarding\s+form|new\s+client\s+form/i] },
]

const REVIEWS: Fingerprint[] = [
  { evidence: 'Trustpilot', patterns: [/trustpilot\.com|widget\.trustpilot/i] },
  { evidence: 'Google Reviews widget', patterns: [/google\s+reviews|elfsight.*review|trustindex|reviewsonmywebsite/i] },
  { evidence: 'Reviews.io', patterns: [/reviews\.(io|co\.uk)/i] },
  { evidence: 'Feefo', patterns: [/feefo\.com/i] },
  { evidence: 'Yotpo', patterns: [/yotpo\.com/i] },
  { evidence: 'Doctify reviews', patterns: [/doctify\.com/i] },
  { evidence: 'Displayed star rating / review count', patterns: [/\d+(\.\d+)?\s*(out of\s*5|stars?\b)|\b\d{2,}\s+reviews\b|★{3,}/i] },
]

const PORTAL: Fingerprint[] = [
  { evidence: 'Client/patient portal', patterns: [/client\s+portal|patient\s+portal|secure\s+portal|member\s+area|customer\s+portal/i] },
  { evidence: 'Clio client portal', patterns: [/clio\.com|clioapp/i] },
  { evidence: 'Karbon portal', patterns: [/karbonhq\.com|karbon\.app/i] },
  { evidence: 'Login / sign-in area', patterns: [/\bclient\s+login\b|\bpatient\s+login\b|\bmember\s+login\b|href=["'][^"']*\/(login|signin|sign-in|account|portal)\b/i] },
]

const PAYMENT: Fingerprint[] = [
  { evidence: 'Stripe', patterns: [/js\.stripe\.com|stripe\.com\/v\d/i] },
  { evidence: 'Square', patterns: [/squareup\.com|square\.site|web\.squarecdn/i] },
  { evidence: 'PayPal', patterns: [/paypal\.com\/sdk|paypalobjects\.com|paypal\.me/i] },
  { evidence: 'GoCardless', patterns: [/gocardless\.com/i] },
  { evidence: 'Opayo / Sage Pay', patterns: [/opayo|sagepay/i] },
  { evidence: 'Worldpay', patterns: [/worldpay\.com/i] },
  { evidence: 'Online payment flow', patterns: [/pay\s+(online|now|your\s+invoice)|make\s+a\s+payment|secure\s+checkout/i] },
]

const ANALYTICS: Fingerprint[] = [
  { evidence: 'Google Analytics (GA4/gtag)', patterns: [/googletagmanager\.com\/gtag|gtag\(|google-analytics\.com|ga\(['"]create|analytics\.js/i] },
  { evidence: 'Google Tag Manager', patterns: [/googletagmanager\.com\/gtm/i] },
  { evidence: 'Meta Pixel', patterns: [/connect\.facebook\.net.*fbevents|fbq\(/i] },
  { evidence: 'Hotjar', patterns: [/static\.hotjar\.com|hotjar\.com/i] },
  { evidence: 'Microsoft Clarity', patterns: [/clarity\.ms/i] },
  { evidence: 'Plausible / PostHog / Segment', patterns: [/plausible\.io|posthog\.com|cdn\.segment\.com/i] },
]

const NEWSLETTER: Fingerprint[] = [
  { evidence: 'Mailchimp signup', patterns: [/list-manage\.com|mailchimp\.com|mc\.us\d+\.list-manage/i] },
  { evidence: 'ConvertKit', patterns: [/convertkit\.com|ck\.page/i] },
  { evidence: 'Klaviyo', patterns: [/klaviyo\.com|static\.klaviyo/i] },
  { evidence: 'MailerLite', patterns: [/mailerlite\.com/i] },
  { evidence: 'Newsletter signup', patterns: [/subscribe\s+to\s+our|join\s+our\s+(mailing\s+list|newsletter)|sign\s+up\s+for\s+(our\s+)?(updates|newsletter)/i] },
]

function detectOne(html: string, fps: Fingerprint[]): InfraSignalResult {
  for (const fp of fps) {
    if (fp.patterns.some(p => p.test(html))) {
      return { found: true, evidence: fp.evidence }
    }
  }
  return { found: false, evidence: 'not found' }
}

function detectTechStack(html: string): string {
  const checks: Array<[RegExp, string]> = [
    [/wp-content|wp-includes|wordpress/i, 'WordPress'],
    [/static\.wixstatic|wix\.com/i, 'Wix'],
    [/squarespace\.com|static1\.squarespace/i, 'Squarespace'],
    [/cdn\.shopify\.com|myshopify\.com/i, 'Shopify'],
    [/assets\.website-files\.com|webflow/i, 'Webflow'],
    [/_next\/static|__NEXT_DATA__/i, 'Next.js / React'],
    [/drupal-settings-json|sites\/all|sites\/default\/files/i, 'Drupal'],
    [/joomla|\/media\/jui\//i, 'Joomla'],
    [/godaddy|secureserver\.net/i, 'GoDaddy Website Builder'],
    [/weebly\.com/i, 'Weebly'],
    [/hs-sites\.com|hubspotusercontent/i, 'HubSpot CMS'],
  ]
  for (const [re, name] of checks) {
    if (re.test(html)) return name
  }
  return 'Unknown'
}

const PRIMARY_KEYS = ['bookingWidget', 'liveChat', 'intakeForm', 'reviewsWidget', 'clientPortal'] as const

const PRIMARY_LABELS: Record<(typeof PRIMARY_KEYS)[number], string> = {
  bookingWidget: 'online booking',
  liveChat: 'live chat',
  intakeForm: 'a digital intake form',
  reviewsWidget: 'a reviews widget',
  clientPortal: 'a client portal',
}

/**
 * Detect every infrastructure signal from a page's raw HTML.
 * Caps input length to bound regex cost on very large pages.
 */
export function detectFromHtml(rawHtml: string): InfrastructureFindings {
  const html = rawHtml.slice(0, 400_000)

  const findings: InfrastructureFindings = {
    bookingWidget:     detectOne(html, BOOKING),
    liveChat:          detectOne(html, LIVE_CHAT),
    intakeForm:        detectOne(html, INTAKE_FORM),
    reviewsWidget:     detectOne(html, REVIEWS),
    clientPortal:      detectOne(html, PORTAL),
    paymentProcessing: detectOne(html, PAYMENT),
    analyticsSetup:    detectOne(html, ANALYTICS),
    newsletterCapture: detectOne(html, NEWSLETTER),
    techStack:         detectTechStack(html),
    generalObservation: '',
  }

  findings.generalObservation = buildObservation(findings)
  return findings
}

/** Detect only the 5 primary signals — used for cheap sub-page sweeps. */
export function detectPrimaryFromHtml(
  rawHtml: string,
): Partial<Pick<InfrastructureFindings, (typeof PRIMARY_KEYS)[number]>> {
  const html = rawHtml.slice(0, 200_000)
  const out: Partial<Pick<InfrastructureFindings, (typeof PRIMARY_KEYS)[number]>> = {}
  const fpMap = {
    bookingWidget: BOOKING, liveChat: LIVE_CHAT, intakeForm: INTAKE_FORM,
    reviewsWidget: REVIEWS, clientPortal: PORTAL,
  } as const
  for (const key of PRIMARY_KEYS) {
    const res = detectOne(html, fpMap[key])
    if (res.found) out[key] = { found: true, evidence: `${res.evidence} (sub-page)` }
  }
  return out
}

function buildObservation(f: InfrastructureFindings): string {
  const found = PRIMARY_KEYS.filter(k => f[k].found)
  const missing = PRIMARY_KEYS.filter(k => !f[k].found)
  const stack = f.techStack && f.techStack !== 'Unknown' ? ` The site appears to run on ${f.techStack}.` : ''

  if (found.length === 0) {
    return `None of the five core infrastructure signals were detected on the homepage.${stack} There is clear room to add the basics that convert and retain visitors.`
  }
  if (found.length >= 4) {
    return `Strong digital foundations — ${found.map(k => PRIMARY_LABELS[k]).join(', ')} are in place.${stack}${missing.length ? ` The remaining gap is ${missing.map(k => PRIMARY_LABELS[k]).join(' and ')}.` : ''}`
  }
  return `The site has ${found.map(k => PRIMARY_LABELS[k]).join(', ')} in place, but is missing ${missing.map(k => PRIMARY_LABELS[k]).join(', ')}.${stack}`
}
