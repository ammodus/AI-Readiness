import type { AnalysisResult } from './types'
import { BAND_META, BENCHMARKS, INDUSTRY_LABELS, GAP_COPY, getLowestScoringSignal, getTopRecommendations } from './benchmarks'
import type { EmailNarrative } from './emailNarrative'

const PRIMARY_SIGNAL_LABELS: Record<string, string> = {
  bookingWidget: 'Online booking',
  liveChat: 'Live chat / chatbot',
  intakeForm: 'Digital intake form',
  reviewsWidget: 'Reviews widget',
  clientPortal: 'Client portal',
}

const SECONDARY_SIGNAL_LABELS: Record<string, string> = {
  paymentProcessing: 'Online payment processing',
  analyticsSetup: 'Analytics / tracking',
  newsletterCapture: 'Newsletter capture',
}

const EFFORT_COLORS: Record<string, { bg: string; text: string }> = {
  'Quick win':   { bg: '#DCFCE7', text: '#166534' },
  'Medium lift': { bg: '#DBEAFE', text: '#1E3A8A' },
  'Strategic':   { bg: '#EDE9FE', text: '#4C1D95' },
}

function scoreBar(label: string, score: number, desc: string, explanation?: string): string {
  return `
    <div style="margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px;">
        <span style="font-size:14px;color:#0C0C0C;font-weight:500;">${label}</span>
        <span style="font-size:13px;color:#6B6563;">${score}/100</span>
      </div>
      <div style="background:#D8D4CE;border-radius:4px;height:8px;overflow:hidden;margin-bottom:5px;">
        <div style="background:#0C0C0C;height:100%;width:${score}%;border-radius:4px;"></div>
      </div>
      <p style="font-size:12px;color:#6B6563;margin:0 0 ${explanation ? '5px' : '0'};">${desc}</p>
      ${explanation ? `<p style="font-size:12px;color:#0C0C0C;background:#F0EEE9;border-radius:4px;padding:8px 10px;margin:0;line-height:1.5;">${explanation}</p>` : ''}
    </div>`
}

export function buildEmailHtml(name: string, result: AnalysisResult, customIndustry?: string, narrative?: EmailNarrative): string {
  const band = BAND_META[result.band]
  const industryLabel = customIndustry?.trim() || INDUSTRY_LABELS[result.industry]
  const benchmark = BENCHMARKS[result.industry]
  const domain = result.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const recommendations = result.dynamicRecommendations?.length
    ? result.dynamicRecommendations
    : getTopRecommendations(result.subScores, result.industry)

  const lowestSignal = getLowestScoringSignal(result.findings)

  // ── Score breakdown ──────────────────────────────────────────────────────
  const subScoreBars = [
    {
      label: 'Infrastructure',
      score: result.subScores.infrastructure,
      desc: 'What your website already has in place — booking, chat, forms, reviews, portal',
      explanation: result.scoreExplanation?.infrastructure,
    },
    {
      label: 'Process maturity',
      score: result.subScores.process,
      desc: 'How digitised your day-to-day enquiry handling and operations are',
      explanation: result.scoreExplanation?.process,
    },
    {
      label: 'Automation ROI potential',
      score: result.subScores.volume,
      desc: 'Based on your volume — higher volume means greater return from automation',
      explanation: result.scoreExplanation?.volume,
    },
  ].map(s => scoreBar(s.label, s.score, s.desc, s.explanation)).join('')

  // ── Industry comparison ──────────────────────────────────────────────────
  const youPct = result.subScores.infrastructure
  const avgPct = benchmark
  const industryComparison = `
    <div style="margin-bottom:32px;">
      <h2 style="font-family:'Playfair Display',Georgia,serif;font-size:18px;font-weight:400;color:#0C0C0C;margin:0 0 8px;">How you compare</h2>
      <p style="font-size:13px;color:#6B6563;margin:0 0 16px;">${industryLabel} businesses average ${avgPct}/100 on infrastructure. You scored ${youPct}/100.</p>
      <div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px;">
          <span style="font-weight:500;color:#0C0C0C;">Your infrastructure</span>
          <span style="color:#6B6563;">${youPct}/100</span>
        </div>
        <div style="background:#D8D4CE;border-radius:4px;height:8px;overflow:hidden;">
          <div style="background:#0C0C0C;height:100%;width:${youPct}%;border-radius:4px;"></div>
        </div>
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px;">
          <span style="color:#6B6563;">${industryLabel} average</span>
          <span style="color:#6B6563;">${avgPct}/100</span>
        </div>
        <div style="background:#D8D4CE;border-radius:4px;height:8px;overflow:hidden;">
          <div style="background:#A8A29E;height:100%;width:${avgPct}%;border-radius:4px;"></div>
        </div>
      </div>
    </div>`

  // ── Findings ─────────────────────────────────────────────────────────────
  const primaryRows = Object.entries(PRIMARY_SIGNAL_LABELS).map(([key, label]) => {
    const signal = result.findings[key as keyof typeof result.findings] as { found: boolean; evidence: string } | undefined
    if (!signal) return ''
    const icon = signal.found ? '✓' : '—'
    const iconColor = signal.found ? '#166534' : '#6B6563'
    return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #D8D4CE;font-size:13px;font-weight:500;color:#0C0C0C;white-space:nowrap;width:40%;">${label}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #D8D4CE;font-size:13px;color:${iconColor};font-weight:600;white-space:nowrap;width:30px;">${icon}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #D8D4CE;font-size:12px;color:#6B6563;">${signal.evidence}</td>
      </tr>`
  }).join('')

  // Secondary signals — only show if any were found
  const secondaryFound = Object.entries(SECONDARY_SIGNAL_LABELS).filter(([key]) => {
    const s = result.findings[key as keyof typeof result.findings] as { found: boolean } | undefined
    return s?.found
  })

  const secondarySection = secondaryFound.length > 0 ? `
    <div style="margin-top:12px;padding:12px 16px;background:#F0EEE9;border-radius:6px;">
      <p style="font-size:12px;font-weight:600;color:#6B6563;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 6px;">Also detected</p>
      <p style="font-size:13px;color:#0C0C0C;margin:0;">${secondaryFound.map(([, label]) => label).join(', ')}</p>
    </div>` : ''

  const techLine = result.findings.techStack && result.findings.techStack !== 'Unknown' && result.findings.techStack !== 'unclear'
    ? `<p style="font-size:12px;color:#6B6563;margin:10px 0 0;">Platform: ${result.findings.techStack}</p>` : ''

  const observationLine = result.findings.generalObservation
    ? `<p style="font-size:13px;color:#6B6563;font-style:italic;margin:10px 0 0;line-height:1.5;">${result.findings.generalObservation}</p>` : ''

  // ── Gap callout ───────────────────────────────────────────────────────────
  const gapSection = lowestSignal ? `
    <div style="margin-bottom:32px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:20px;">
      <p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#92400E;margin:0 0 8px;">The gap that matters most</p>
      <p style="font-size:14px;color:#78350F;margin:0;line-height:1.6;">${GAP_COPY[result.industry][lowestSignal]}</p>
    </div>` : ''

  // ── Recommendations ───────────────────────────────────────────────────────
  const recCards = recommendations.map((r, i) => {
    const effortStyle = EFFORT_COLORS[r.effort] ?? EFFORT_COLORS['Medium lift']
    return `
    <div style="border:1px solid #D8D4CE;border-radius:8px;padding:16px 20px;margin-bottom:12px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="font-size:12px;font-weight:600;color:#6B6563;">${i + 1}.</span>
        <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;background:${effortStyle.bg};color:${effortStyle.text};padding:3px 8px;border-radius:4px;">${r.effort}</span>
      </div>
      <p style="font-size:14px;font-weight:600;color:#0C0C0C;margin:0 0 6px;">${r.title}</p>
      <p style="font-size:13px;color:#6B6563;margin:0;line-height:1.5;">${r.description}</p>
    </div>`
  }).join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#F0EEE9;font-family:'DM Sans',system-ui,sans-serif;color:#0C0C0C;">
  <div style="max-width:600px;margin:40px auto;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #D8D4CE;">

    <!-- Header -->
    <div style="background:#0C0C0C;padding:32px 40px;">
      <p style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:rgba(255,255,255,0.5);margin:0 0 8px;">AI Readiness Check</p>
      <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:400;color:#FFFFFF;margin:0 0 6px;">Your AI Readiness Report</h1>
      <p style="font-size:13px;color:rgba(255,255,255,0.55);margin:0;">Prepared for ${name} &middot; ${domain} &middot; ${date}</p>
    </div>

    <div style="padding:36px 40px;">

      <!-- Score hero -->
      <div style="text-align:center;padding:28px 24px;background:#F0EEE9;border-radius:8px;margin-bottom:${narrative?.intro ? '20px' : '32px'};">
        <p style="font-size:13px;color:#6B6563;margin:0 0 4px;">${industryLabel} business</p>
        <div style="font-family:'Playfair Display',Georgia,serif;font-size:72px;font-weight:600;color:#0C0C0C;line-height:1;">${result.overallScore}</div>
        <p style="font-size:14px;color:#6B6563;margin:0 0 12px;">out of 100</p>
        <span style="display:inline-block;background:${band.bgColor};color:${band.textColor};font-size:13px;font-weight:600;padding:5px 16px;border-radius:4px;">${band.label}</span>
        <p style="font-size:14px;color:#6B6563;margin:12px 0 0;line-height:1.6;">${band.description}</p>
      </div>

      ${narrative?.intro ? `
      <!-- Personalised intro -->
      <p style="font-size:15px;color:#0C0C0C;line-height:1.7;margin:0 0 32px;">${narrative.intro}</p>
      ` : ''}

      <!-- Score breakdown -->
      <div style="margin-bottom:32px;">
        <h2 style="font-family:'Playfair Display',Georgia,serif;font-size:18px;font-weight:400;color:#0C0C0C;margin:0 0 20px;">Score breakdown</h2>
        ${subScoreBars}
      </div>

      <!-- Industry comparison -->
      ${industryComparison}

      <!-- Findings -->
      <div style="margin-bottom:32px;">
        <h2 style="font-family:'Playfair Display',Georgia,serif;font-size:18px;font-weight:400;color:#0C0C0C;margin:0 0 16px;">What was found on your site</h2>
        ${result.scanFailed ? '<p style="font-size:13px;color:#92400E;background:#FFFBEB;border:1px solid #FDE68A;border-radius:6px;padding:10px 14px;margin:0 0 16px;">Site scan was unavailable — infrastructure score is based on your answers only.</p>' : ''}
        <table style="width:100%;border-collapse:collapse;border:1px solid #D8D4CE;border-radius:8px;overflow:hidden;">
          <tbody>${primaryRows}</tbody>
        </table>
        ${secondarySection}
        ${techLine}
        ${observationLine}
        ${narrative?.findingsNarrative ? `<p style="font-size:14px;color:#0C0C0C;line-height:1.7;margin:16px 0 0;padding-top:16px;border-top:1px solid #D8D4CE;">${narrative.findingsNarrative}</p>` : ''}
      </div>

      <!-- Gap callout -->
      ${gapSection}

      <!-- Suggestions -->
      <div style="margin-bottom:${narrative?.nextSteps?.length ? '32px' : '8px'};">
        <h2 style="font-family:'Playfair Display',Georgia,serif;font-size:18px;font-weight:400;color:#0C0C0C;margin:0 0 16px;">Suggestions</h2>
        ${recCards}
      </div>

      ${narrative?.nextSteps?.length ? `
      <!-- Next steps -->
      <div style="margin-bottom:8px;">
        <h2 style="font-family:'Playfair Display',Georgia,serif;font-size:18px;font-weight:400;color:#0C0C0C;margin:0 0 16px;">Your next steps</h2>
        <ol style="margin:0;padding:0 0 0 20px;">
          ${narrative.nextSteps.map(step => `
          <li style="font-size:14px;color:#0C0C0C;line-height:1.6;margin-bottom:12px;padding-left:6px;">${step}</li>`).join('')}
        </ol>
      </div>
      ` : ''}

    </div>

    <!-- Footer -->
    <div style="padding:20px 40px;border-top:1px solid #D8D4CE;">
      <p style="font-size:12px;color:#6B6563;margin:0;">This analysis is based on publicly available website content and your self-reported answers.</p>
    </div>

  </div>
</body>
</html>`
}
