import FirecrawlApp from '@mendable/firecrawl-js'
import type { InfrastructureFindings, Industry } from './types'
import { detectFromHtml } from './detector'
import { assertPublicUrl } from './urlGuard'

const FALLBACK_FINDINGS: InfrastructureFindings = {
  bookingWidget:     { found: false, evidence: 'Site scan unavailable' },
  liveChat:          { found: false, evidence: 'Site scan unavailable' },
  intakeForm:        { found: false, evidence: 'Site scan unavailable' },
  reviewsWidget:     { found: false, evidence: 'Site scan unavailable' },
  clientPortal:      { found: false, evidence: 'Site scan unavailable' },
  paymentProcessing: { found: false, evidence: 'Site scan unavailable' },
  analyticsSetup:    { found: false, evidence: 'Site scan unavailable' },
  newsletterCapture: { found: false, evidence: 'Site scan unavailable' },
  techStack: 'Unknown',
  generalObservation: 'Site scan was unavailable. Infrastructure score is based on your answers only.',
}

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-GB,en;q=0.9',
}

/**
 * Fetch RAW HTML (scripts/iframes/link tags intact). The detector fingerprints
 * vendor signals that live in those tags, so — unlike the old text-stripping
 * scan — nothing is discarded before detection.
 */
async function fetchRawHtml(url: string): Promise<string> {
  const candidates = [url]
  try {
    const u = new URL(url)
    if (!u.hostname.startsWith('www.')) {
      candidates.push(`${u.protocol}//www.${u.hostname}${u.pathname}${u.search}`)
    }
  } catch { /* ignore */ }

  for (const candidate of candidates) {
    try {
      // Re-validate each candidate (the www. variant is a different host).
      await assertPublicUrl(candidate)
      const res = await fetch(candidate, { signal: AbortSignal.timeout(15_000), headers: BROWSER_HEADERS })
      if (!res.ok) continue
      const html = await res.text()
      if (html.length >= 500) return html
    } catch { /* try next */ }
  }

  throw new Error(`Could not fetch ${url}`)
}

/** Firecrawl raw-HTML fetch (better at bypassing bot walls), with plain-fetch fallback. */
async function fetchPageHtml(url: string): Promise<string> {
  if (process.env.FIRECRAWL_API_KEY) {
    try {
      const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY })
      const result = await app.scrape(url, { formats: ['rawHtml'] })
      const html = (result as { rawHtml?: string; html?: string }).rawHtml
        ?? (result as { html?: string }).html ?? ''
      if (html.length >= 500) return html
    } catch (err) {
      console.warn('Firecrawl failed, trying plain fetch:', (err as Error).message)
    }
  }
  return fetchRawHtml(url)
}

/**
 * Scan a website's homepage and detect infrastructure signals deterministically.
 * No LLM call — fingerprint matching on raw HTML.
 */
export async function analyseWebsite(
  url: string,
  _industry: Industry,
  _customIndustry?: string,
): Promise<{ findings: InfrastructureFindings; scanFailed: boolean }> {
  try {
    await assertPublicUrl(url)
  } catch (err) {
    console.error('URL rejected by SSRF guard:', (err as Error).message)
    return { findings: FALLBACK_FINDINGS, scanFailed: true }
  }

  try {
    const html = await fetchPageHtml(url)
    return { findings: detectFromHtml(html), scanFailed: false }
  } catch (err) {
    console.error('Page fetch failed:', (err as Error).message)
    return { findings: FALLBACK_FINDINGS, scanFailed: true }
  }
}
