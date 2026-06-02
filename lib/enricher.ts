/**
 * Enricher — three optional enrichment steps that run after the main website scan.
 *
 * 1. Multi-page scraping  — tries common sub-pages (/about, /services, /contact …)
 *    to surface signals that aren't on the homepage.
 * 2. Tavily web search    — two queries per business (hiring activity + tech/software
 *    mentions) to enrich volume and process scores with real-world data.
 * 3. Companies House API  — free UK gov API, returns incorporation date, company type,
 *    and officer count as a headcount proxy.
 *
 * Every step is silently skipped if the relevant env key is missing or the call fails.
 * The existing scoring still works without any enrichment data.
 */

import type { InfrastructureFindings, Industry } from './types'
import { detectPrimaryFromHtml } from './detector'
import { assertPublicUrl } from './urlGuard'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface TavilySignals {
  hiringSignal: boolean        // Evidence of recent hiring / headcount growth
  techSignal: boolean          // Evidence of software / CRM / platform adoption
  hiringSnippet: string        // Raw Tavily text for the hiring query
  techSnippet: string          // Raw Tavily text for the tech query
}

export interface CompaniesHouseData {
  found: boolean
  companyName: string
  incorporationDate: string    // ISO date string or ''
  companyType: string          // e.g. 'ltd', 'llp'
  officerCount: number         // Proxy for headcount
  status: string               // 'active' | 'dissolved' etc.
}

export interface MultiPageFindings {
  /** Merged infrastructure signals from additional pages */
  extraSignals: Partial<Pick<InfrastructureFindings,
    'bookingWidget' | 'liveChat' | 'intakeForm' | 'reviewsWidget' | 'clientPortal'>>
  /** Pages that were successfully scraped */
  pagesScanned: string[]
}

export interface EnrichmentData {
  tavily: TavilySignals | null
  companiesHouse: CompaniesHouseData | null
  multiPage: MultiPageFindings | null
  /** Derived composite boosts — consumed by scoring.ts */
  volumeBoost: number   // 0–20 additional points for volume score
  processBoost: number  // 0–20 additional points for process score
}

// ─── Constants ──────────────────────────────────────────────────────────────

const SUBPAGES = [
  '/about',
  '/about-us',
  '/services',
  '/our-services',
  '/contact',
  '/contact-us',
  '/team',
  '/our-team',
  '/book',
  '/book-now',
  '/appointment',
  '/portal',
  '/client-portal',
]

// Keywords that indicate hiring activity
const HIRING_KEYWORDS = [
  'hiring', 'we\'re growing', 'join our team', 'open roles', 'job opening',
  'headcount', 'new hire', 'expanded the team', 'growing team', 'recruitment',
  'vacancies', 'careers',
]

// Keywords that indicate software/CRM/platform adoption
const TECH_KEYWORDS = [
  'crm', 'practice management', 'software', 'platform', 'automation',
  'integrated', 'cloud', 'digital', 'portal', 'workflow', 'system',
  'hubspot', 'salesforce', 'xero', 'quickbooks', 'clio', 'karbon',
  'bullhorn', 'vincere', 'cliniko', 'jane app', 'calendly', 'acuity',
]

const MIN_CONTENT_LENGTH = 100

// ─── Multi-page scraping ────────────────────────────────────────────────────

/** Fetch raw HTML for a sub-page (kept intact for fingerprint detection). */
async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
    })
    if (!res.ok) return null
    const html = await res.text()
    return html.length >= 500 ? html : null
  } catch {
    return null
  }
}

async function scrapeSubPages(baseUrl: string): Promise<MultiPageFindings> {
  const base = baseUrl.replace(/\/$/, '')
  const merged: Partial<Pick<InfrastructureFindings,
    'bookingWidget' | 'liveChat' | 'intakeForm' | 'reviewsWidget' | 'clientPortal'>> = {}
  const pagesScanned: string[] = []

  // Run concurrently in batches of 4 to stay polite
  const batches: string[][] = []
  for (let i = 0; i < SUBPAGES.length; i += 4) {
    batches.push(SUBPAGES.slice(i, i + 4))
  }

  for (const batch of batches) {
    await Promise.all(batch.map(async (path) => {
      const url = `${base}${path}`
      const html = await fetchPage(url)
      if (!html) return
      pagesScanned.push(url)
      const signals = detectPrimaryFromHtml(html)
      // Merge — once found, stays found
      for (const [k, v] of Object.entries(signals) as [keyof typeof merged, InfrastructureFindings[keyof InfrastructureFindings]][]) {
        if (!(merged[k] as { found: boolean } | undefined)?.found) {
          merged[k] = v as never
        }
      }
    }))
    // Small delay between batches
    await new Promise(r => setTimeout(r, 300))
  }

  return { extraSignals: merged, pagesScanned }
}

// ─── Tavily enrichment ──────────────────────────────────────────────────────

async function tavilySearch(query: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(12_000),
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        max_results: 3,
        include_answer: true,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()

    // Prefer synthesised answer
    const answer = (data.answer || '').trim()
    if (answer.length >= MIN_CONTENT_LENGTH) return answer

    // Fall back to first result snippet
    const results: Array<{ content?: string }> = data.results || []
    for (const r of results) {
      const content = (r.content || '').trim()
      if (content.length >= MIN_CONTENT_LENGTH) return content.slice(0, 400)
    }
    return null
  } catch {
    return null
  }
}

function isBoilerplate(text: string): boolean {
  const lower = text.toLowerCase()
  const hits = [
    'we are a leading', 'welcome to', 'contact us', 'privacy policy',
    'all rights reserved', 'cookie policy', 'terms and conditions',
    'page not found', '404', 'sign in', 'log in',
  ].filter(p => lower.includes(p)).length
  return hits >= 2
}

async function enrichWithTavily(
  companyName: string,
  websiteUrl: string,
): Promise<TavilySignals | null> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) return null

  try {
    const domain = new URL(websiteUrl).hostname.replace(/^www\./, '')

    const [hiringRaw, techRaw] = await Promise.all([
      tavilySearch(
        `"${companyName}" OR site:${domain} hiring OR "join our team" OR "open roles" OR growing 2025 2026 UK`,
        apiKey,
      ),
      tavilySearch(
        `"${companyName}" OR site:${domain} software OR CRM OR platform OR "practice management" OR automation 2025 2026`,
        apiKey,
      ),
    ])

    const hiringSnippet = hiringRaw && !isBoilerplate(hiringRaw) ? hiringRaw : ''
    const techSnippet = techRaw && !isBoilerplate(techRaw) ? techRaw : ''
    const hiringLower = hiringSnippet.toLowerCase()
    const techLower = techSnippet.toLowerCase()

    return {
      hiringSignal: HIRING_KEYWORDS.some(kw => hiringLower.includes(kw)),
      techSignal: TECH_KEYWORDS.some(kw => techLower.includes(kw)),
      hiringSnippet,
      techSnippet,
    }
  } catch {
    return null
  }
}

// ─── Companies House ────────────────────────────────────────────────────────

const CH_STOPWORDS = new Set([
  'ltd', 'limited', 'llp', 'plc', 'the', 'and', 'co', 'company', 'group',
  'uk', 'services', 'practice', 'clinic', 'associates', 'partners',
])

function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !CH_STOPWORDS.has(t))
}

/**
 * Confidence that a Companies House result is actually the same business.
 * The query name is guessed from the domain, so a blind "first active result"
 * can easily be the wrong company. Require meaningful token overlap before
 * trusting (and boosting on) the data.
 */
function isConfidentMatch(query: string, title: string): boolean {
  const q = nameTokens(query)
  const t = new Set(nameTokens(title))
  if (q.length === 0) return false
  const overlap = q.filter(tok => t.has(tok)).length
  // Every distinctive token in the (short) domain-derived name must appear,
  // or at least two distinctive tokens overlap for longer names.
  return q.length <= 2 ? overlap === q.length : overlap >= 2
}

async function lookupCompaniesHouse(
  companyName: string,
  apiKey?: string,
): Promise<CompaniesHouseData | null> {
  const BASE = 'https://api.company-information.service.gov.uk'
  const headers: HeadersInit = apiKey
    ? { Authorization: 'Basic ' + Buffer.from(`${apiKey}:`).toString('base64') }
    : {}

  try {
    // 1. Search for the company
    const searchRes = await fetch(
      `${BASE}/search/companies?q=${encodeURIComponent(companyName)}&items_per_page=5`,
      { headers, signal: AbortSignal.timeout(10_000) },
    )
    if (!searchRes.ok) return null
    const searchData = await searchRes.json()
    const items: Array<{
      company_number: string
      title: string
      company_type?: string
      company_status?: string
      date_of_creation?: string
    }> = searchData.items || []

    const notFound: CompaniesHouseData = { found: false, companyName, incorporationDate: '', companyType: '', officerCount: 0, status: '' }
    if (!items.length) return notFound

    // Only accept a match we're confident is the same business. The query name
    // is guessed from the domain, so trusting the first active result blindly
    // risks attributing another company's data to this report.
    const active =
      items.find(c => c.company_status === 'active' && isConfidentMatch(companyName, c.title))
      || items.find(c => isConfidentMatch(companyName, c.title))
    if (!active) return notFound
    const companyNumber = active.company_number

    // 2. Get officer count
    const officersRes = await fetch(
      `${BASE}/company/${companyNumber}/officers?items_per_page=100`,
      { headers, signal: AbortSignal.timeout(10_000) },
    )
    let officerCount = 0
    if (officersRes.ok) {
      const officersData = await officersRes.json()
      officerCount = officersData.active_count ?? (officersData.items?.length ?? 0)
    }

    return {
      found: true,
      companyName: active.title,
      incorporationDate: active.date_of_creation || '',
      companyType: active.company_type || '',
      officerCount,
      status: active.company_status || '',
    }
  } catch {
    return null
  }
}

// ─── Boost calculation ──────────────────────────────────────────────────────

function calcBoosts(
  tavily: TavilySignals | null,
  ch: CompaniesHouseData | null,
): { volumeBoost: number; processBoost: number } {
  let volumeBoost = 0
  let processBoost = 0

  // Tavily hiring signal → business is growing → higher volume likelihood
  if (tavily?.hiringSignal) volumeBoost += 10

  // Tavily tech signal → business already uses software → higher process maturity
  if (tavily?.techSignal) processBoost += 10

  // Companies House officer count as headcount proxy
  if (ch?.found) {
    if (ch.officerCount >= 10) volumeBoost += 10
    else if (ch.officerCount >= 4) volumeBoost += 5
  }

  // Well-established business (5+ years) → more likely to have volume
  if (ch?.found && ch.incorporationDate) {
    const years = (Date.now() - new Date(ch.incorporationDate).getTime()) / (1000 * 60 * 60 * 24 * 365)
    if (years >= 5) volumeBoost += 5
  }

  // LLP structure typically means higher professional volume
  if (ch?.found && ch.companyType?.includes('llp')) {
    volumeBoost += 5
  }

  return {
    volumeBoost: Math.min(20, volumeBoost),
    processBoost: Math.min(20, processBoost),
  }
}

// ─── Main entry point ───────────────────────────────────────────────────────

/**
 * Run all enrichment steps for a given business.
 * Every step is optional — failures are swallowed and return null for that step.
 *
 * @param url        Normalised website URL
 * @param industry   Selected industry
 * @param companyName  Inferred from the URL hostname — used for API queries
 */
export async function enrichBusiness(
  url: string,
  industry: Industry,
  companyName?: string,
): Promise<EnrichmentData> {
  // Derive a human-readable company name from the URL if not provided
  let name = companyName || ''
  if (!name) {
    try {
      name = new URL(url).hostname
        .replace(/^www\./, '')
        .split('.')[0]
        .replace(/-/g, ' ')
    } catch { name = '' }
  }

  // Only sweep sub-pages if the base URL passes the SSRF guard. Tavily and
  // Companies House hit fixed trusted APIs, so they don't need the check.
  const urlSafe = await assertPublicUrl(url).then(() => true).catch(() => false)

  // Run all three steps in parallel — independent of each other
  const [multiPage, tavily, ch] = await Promise.all([
    urlSafe ? scrapeSubPages(url).catch(() => null) : Promise.resolve(null),
    name ? enrichWithTavily(name, url).catch(() => null) : Promise.resolve(null),
    name
      ? lookupCompaniesHouse(name, process.env.COMPANIES_HOUSE_API_KEY).catch(() => null)
      : Promise.resolve(null),
  ])

  const { volumeBoost, processBoost } = calcBoosts(tavily, ch)

  return {
    tavily,
    companiesHouse: ch,
    multiPage,
    volumeBoost,
    processBoost,
  }
}
