# AI Readiness Analyser — Assessment & Improvement Plan

_Reviewed: 2 June 2026. Scope: full `app/` + `lib/` + `components/` source._

## What the tool is

A Next.js 14 four-step wizard (industry → URL/contact → 7 diagnostic questions → results) that produces an "AI readiness" score for UK professional-services SMEs and emails a branded report.

Pipeline (`/api/analyse`):
1. In parallel: `analyseWebsite()` (fetch homepage → strip HTML → **Sonnet** extracts 8 infrastructure signals as JSON) and `enrichBusiness()` (multi-page scrape + Tavily + Companies House).
2. Deterministic scoring: industry-weighted infrastructure + process + volume → overall (40/35/25 blend) → band.
3. Deterministic plain-language score explanation.
4. **Haiku** generates 3 recommendations (static benchmark fallback on failure).
5. `/api/send-report` emails the result via Resend.

The architecture is genuinely good: clear separation, graceful degradation everywhere, deterministic scoring (reproducible), LLM used only where judgement is needed. The issues below are about correctness, safety, and where to spend model quality — not a rewrite.

---

## High priority — correctness & safety

### 1. The homepage scan strips out exactly the signals it's looking for
`analyseWebsite` removes `<script>`, `<style>`, and all tags before sending text to Sonnet. But live chat (Intercom/Tidio/Drift), analytics (gtag/GA4/Meta Pixel), booking embeds and payment widgets live **in `<script>` tags, `<iframe src>`, and `<link>` hrefs** — precisely what gets deleted. So Sonnet is asked to find vendor signals from visible body text that no longer contains them. Expect systematic under-detection of `liveChat`, `analyticsSetup`, `paymentProcessing`, and embedded `bookingWidget`.

Fix: before stripping, extract `script src`, `iframe src`, `link href`, and inline vendor fingerprints (calendly.com, intercom, gtag, stripe, etc.) and pass them to the detector. Note the irony: the **sub-page** detector (`detectSignalsInText`) already does keyword regex — but on stripped text too, so it shares the flaw for script-based signals.

### 2. Companies House matches on a guessed name and reports it as fact
`enrichBusiness` derives the company name from `hostname.split('.')[0]` (e.g. `smithdental.co.uk` → `"smithdental"`), searches CH, and **picks the first active result**. There's no verification that it's the same business. The report then states "Companies House shows N officers" and silently boosts the score by up to +20. A wrong match produces a confidently incorrect, externally-attributable claim in a client-facing document. Fix: require a stronger match (token overlap with the registered name, ideally confirm via website address/postcode), and when confidence is low, drop the data rather than display it.

### 3. No SSRF protection on user-supplied URLs
Both the main scan and the 13 sub-page fetches request arbitrary URLs server-side with a 10–15s timeout. A user can point it at `http://169.254.169.254/...` (cloud metadata), `localhost`, or internal IPs. Add a URL validator that blocks private/link-local ranges and non-http(s) schemes before any fetch.

### 4. `/api/send-report` is an open, branded-email relay
The endpoint emails the Ammodus report to **any address the client supplies**, with the **entire `result` object passed from the browser** (so content is fully attacker-controlled). Combined with no rate limiting, this can be abused to send spoofed "Ammodus" emails to arbitrary recipients. Fixes: rate-limit by IP, persist results server-side and email by ID (don't trust client-sent `result`), and consider double opt-in or a Turnstile/captcha.

### 5. No rate limiting or abuse control anywhere
`/api/analyse` triggers two Claude calls + ~14 outbound fetches + 2 Tavily queries + CH lookups per request, all on public endpoints. Trivially turned into a cost/DoS vector. Add per-IP rate limiting (Upstash/Vercel KV or middleware).

### 6. `answers` is cast, not validated
The route does `answers as DiagnosticAnswers` with no enum checks; bad values fall through `?? 0` / `?? 'none'` defaults and silently distort the score. Validate with a schema (zod is already in the dependency tree) and reject malformed input.

---

## Medium priority — scoring credibility

- **A failed scan tanks the overall score unfairly.** When `scanFailed`, infrastructure ≈ 0 but is still blended at 40%, so the business is heavily penalised for the tool's own fetch failure. Re-weight to process/volume (e.g. 0/60/40) when the scan fails, and say so.
- **"Volume / ROI potential" is just self-reported enquiry volume (q4) + boost.** The label oversells it. Either fold in more signal or rename it honestly.
- **Benchmarks and weights are unsourced magic numbers** (`dental: 38`, the 280 divisor, the per-industry weight rows). Fine as v1, but they're presented as authoritative. Document provenance, or caveat them.
- **Enrichment boosts (±20) ride on noisy signals** (crude Tavily keyword hits, possibly-wrong CH match). They can move a business across a band boundary. Make boosts smaller, or gate them behind confidence.
- **Findings should be detected deterministically, not by an LLM.** Vendor fingerprints are exact-match detectable. Making regex/fingerprint detection primary and reserving the LLM for the qualitative `generalObservation` would be cheaper, more reliable, hallucination-proof, and would remove the prompt-injection surface (a malicious site can currently instruct Sonnet to return `found: true` everywhere).

---

## Where Opus 4.8 actually helps

You asked specifically about using a stronger model. The highest-value placement is **not** the findings extraction (that should become deterministic — see above) but the **recommendations**, which is the one genuinely reasoning-heavy, low-volume step:

- **Upgrade `recommender.ts` from Haiku → Opus 4.8.** It runs once per analysis, ~800 output tokens, and quality compounds (it's the part the client reads and judges you on). Opus will prioritise better, avoid recommending enterprise tools to solo operators more reliably, and tie advice to the specific gaps. Cost impact is small because volume is low and it's a single call.
- **Optional: an Opus "narrative synthesis" pass** could replace the templated `buildScoreExplanation` with something more tailored. Trade-off: you'd lose determinism/reproducibility. I'd keep the deterministic version for consistency and only use Opus for the recommendations.
- **Keep Haiku/Sonnet for `generalObservation`** if you make detection deterministic — that residual task is light.
- Verify the exact API model string for Opus 4.8 against current Anthropic docs before wiring it in (the current code pins `claude-sonnet-4-6` and `claude-haiku-4-5`).

A good first experiment: build a small eval set of 10–15 known sites with hand-labelled signals + "ideal" recommendations, then compare Haiku vs Opus on the recommendation step and current-vs-fixed detection on findings. That turns "feels better" into a measured decision.

---

## Low priority — maintainability & hygiene

- **`CLAUDE.md` describes a completely different project** (the "Anyone Can" podcast outreach system). Anyone (including Claude) reading it for context will be misled. Rewrite it for this repo.
- **Dead/unused code:** the `bar()` helper in `emailTemplate.ts` is never used; `buildScoreExplanation` accepts a `subScores` param it never reads.
- **Duplicated label maps** (q1/q2/q4/q6/q7 → human text) are copy-pasted across `route.ts`, `recommender.ts`, and `emailTemplate.ts`. Centralise in one module.
- **Notion env vars exist (`NOTION_API_KEY`, `NOTION_DATABASE_ID`) but no Notion code does** — either a missing CRM-logging feature or stale config. Resolve.
- **No caching:** re-analysing the same URL repeats all work. Cache by normalised URL for a short TTL.
- **Observability:** failures are swallowed to fallbacks with `console` only. Add lightweight logging/metrics so you can see scan-failure and CH-mismatch rates in production.
- **GDPR:** you collect name/email/URL and BCC an admin. Make sure there's a consent checkbox and privacy basis on the contact step.

---

## Suggested sequence

1. Fix signal detection (don't strip scripts; make detection deterministic) — biggest accuracy win.
2. Add SSRF guard, rate limiting, server-side result storage for email — close the safety holes.
3. Validate `answers`; re-weight on scan failure; gate CH/Tavily boosts on confidence.
4. Move recommendations to Opus 4.8 and stand up a small eval to confirm the lift.
5. Clean up: rewrite CLAUDE.md, remove dead code, centralise label maps, resolve Notion.
