import { NextRequest, NextResponse } from 'next/server'
import { sendReport } from '@/lib/emailer'
import { verifyResult } from '@/lib/signing'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import type { AnalysisResult } from '@/lib/types'

export async function POST(req: NextRequest) {
  // Rate limit to stop the endpoint being used as a bulk email relay.
  const limit = rateLimit(`send:${clientIp(req)}`, 5, 10 * 60 * 1000)
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
    )
  }

  let body: { name?: string; email?: string; result?: AnalysisResult; signature?: string; customIndustry?: string }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { name, email, result, signature, customIndustry } = body

  if (!name || !email || !result) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  // Only email reports this server actually generated — reject forged/edited payloads.
  if (!verifyResult(result, signature)) {
    return NextResponse.json({ error: 'Report could not be verified. Please re-run the analysis.' }, { status: 400 })
  }

  try {
    await sendReport(email, name, result, customIndustry)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('send-report error:', err)
    return NextResponse.json({ error: 'Failed to send report. Please try again.' }, { status: 500 })
  }
}
