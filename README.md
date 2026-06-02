# AI Readiness Check

A free diagnostic tool that scores any business website on its AI automation readiness across three dimensions: infrastructure, process maturity, and volume/ROI potential.

Users enter their industry, website URL, name, email, and answer 7 diagnostic questions. The tool scrapes their site, analyses it with Claude, and returns an overall score out of 100 with a breakdown, findings, and tailored suggestions. A detailed report is emailed on request.

## How it works

1. **Industry + details** — user picks their sector and enters name, email, and website URL
2. **Diagnostic questions** — 7 questions covering enquiry handling, data storage, follow-up, volume, team size, and current AI usage
3. **Website scan** — Firecrawl (with plain-fetch fallback) scrapes the homepage; Claude Sonnet analyses it for 5 infrastructure signals
4. **Enrichment** — sub-pages are scanned for additional signals; Tavily searches for hiring/tech activity; Companies House returns company age and officer count
5. **Scoring** — three weighted sub-scores (infrastructure 40%, process 35%, volume 25%) combine into an overall score
6. **Results** — score, band, findings, industry comparison, gap callout, and Claude Haiku-generated recommendations shown in the browser
7. **Email report** — on request, a detailed HTML report is sent including personalised narrative, next steps, and full findings

## Scoring

| Dimension | Weight | Source |
|---|---|---|
| Infrastructure | 40% | Website scan — booking widget, live chat, intake form, reviews widget, client portal |
| Process maturity | 35% | Diagnostic answers — enquiry method, data storage, follow-up, admin load, AI usage |
| Volume / ROI | 25% | Diagnostic answers — monthly volume, team size, enriched by hiring signals |

**Score bands:** 0–39 Foundations first · 40–64 Getting there · 65–84 Ready to build · 85–100 Primed

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Claude Sonnet 4.6** — website infrastructure analysis
- **Claude Haiku 4.5** — personalised recommendations and email narrative
- **Firecrawl** — primary website scraper (JS-rendered sites)
- **Tavily** — web search enrichment (hiring and tech signals)
- **Companies House API** — UK company age, type, and officer count
- **Resend** — email report delivery

## Setup

```bash
npm install
cp .env.local.example .env
# fill in your keys, then:
npm run dev
```

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Website analysis + recommendations |
| `RESEND_API_KEY` | Yes | Email report delivery |
| `RESEND_FROM_EMAIL` | Yes | From address (must be verified in Resend) |
| `ADMIN_EMAIL` | Optional | BCC on every report sent |
| `FIRECRAWL_API_KEY` | Optional | Better scraping of JS-heavy sites |
| `TAVILY_API_KEY` | Optional | Hiring and tech adoption signals |
| `COMPANIES_HOUSE_API_KEY` | Optional | UK company data enrichment |

All optional keys degrade gracefully — the tool works without them, with less enrichment data.

## Deploying to Vercel

```bash
vercel --prod
```

Add all environment variables in the Vercel dashboard under Project → Settings → Environment Variables. No database required — the tool is fully stateless.
