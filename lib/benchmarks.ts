import type { Industry, InfraSignalKey, InfrastructureFindings, ReadinessBand, Recommendation, SubScores } from './types'

export const BENCHMARKS: Record<Industry, number> = {
  dental: 38,
  physio: 32,
  accountancy: 42,
  legal: 45,
  recruitment: 48,
  insurance: 36,
  other: 35,
}

export const INDUSTRY_LABELS: Record<Industry, string> = {
  dental: 'Dental',
  physio: 'Physiotherapy',
  accountancy: 'Accountancy',
  legal: 'Legal',
  recruitment: 'Recruitment',
  insurance: 'Insurance',
  other: 'Business',
}

export const BAND_META: Record<ReadinessBand, {
  label: string
  description: string
  color: string
  bgColor: string
  textColor: string
}> = {
  foundations: {
    label: 'Foundations first',
    description: "AI automation can add real value here — but starting with the infrastructure basics will make the biggest difference. The opportunity is real; the sequence matters.",
    color: '#92400E',
    bgColor: '#FEF3C7',
    textColor: '#78350F',
  },
  getting_there: {
    label: 'Getting there',
    description: "There's a strong automation opportunity here. A couple of gaps to close first, but the foundations are largely in place.",
    color: '#1D4ED8',
    bgColor: '#DBEAFE',
    textColor: '#1E3A8A',
  },
  ready: {
    label: 'Ready to build',
    description: "The infrastructure is there. This is the right point to start automating in earnest — the question is where to apply it first.",
    color: '#065F46',
    bgColor: '#D1FAE5',
    textColor: '#064E3B',
  },
  primed: {
    label: 'Primed',
    description: "Operationally ahead of most businesses this size. The gains now come from finding edge cases and optimising what's already in place.",
    color: '#3730A3',
    bgColor: '#E0E7FF',
    textColor: '#312E81',
  },
}

export const RECOMMENDATIONS: Record<Industry, Record<'infrastructure' | 'process' | 'volume', Recommendation>> = {
  dental: {
    infrastructure: {
      title: 'Consider adding online booking via Doctify or Jane App',
      description: 'Dental practices on Doctify tend to see a significant share of new patient bookings come through the platform, reducing phone admin and capturing patients who research outside office hours.',
      effort: 'Quick win',
    },
    process: {
      title: 'Automate patient recall and follow-up',
      description: 'Practice management software like Dentally or SOE can send automated recall reminders, appointment confirmations, and post-treatment follow-ups — recovering several hours of reception time per week.',
      effort: 'Medium lift',
    },
    volume: {
      title: 'Implement automated triage and scheduling',
      description: 'For practices handling 30+ patients per month, AI triage via a chat widget or intake form can route urgent cases immediately and fill cancellations from a waitlist automatically.',
      effort: 'Strategic',
    },
  },
  physio: {
    infrastructure: {
      title: 'Consider online booking via Cliniko or Physitrack',
      description: 'Self-referring physio patients want to book when they decide to act — often not during working hours. A booking widget captures that intent around the clock.',
      effort: 'Quick win',
    },
    process: {
      title: 'Digitise patient intake and outcome measures',
      description: 'Standardised outcome forms (PSFS, NPRS) collected digitally before sessions via Physitrack or Cliniko save time per new patient and create a proper data trail for progress tracking.',
      effort: 'Medium lift',
    },
    volume: {
      title: 'Automate session reminders and cancellation handling',
      description: 'Automated 48-hour text reminders cut no-shows significantly. High-volume clinics should also configure automated waitlist alerts to fill cancellations.',
      effort: 'Quick win',
    },
  },
  accountancy: {
    infrastructure: {
      title: 'Consider a Karbon or Practice Ignition client portal',
      description: 'Secure document exchange and engagement letter signing via a client portal removes email chase-up entirely. Karbon is widely used in the sector; Practice Ignition handles proposals and payment workflows.',
      effort: 'Medium lift',
    },
    process: {
      title: 'Automate client onboarding and document requests',
      description: 'Automated onboarding flows via Karbon or similar reduce time spent on new-client setup. Chaser-style automated document request sequences recover hours on VAT and year-end cycles.',
      effort: 'Medium lift',
    },
    volume: {
      title: 'Workflow automation for compliance deadlines',
      description: 'Practices with 30+ clients benefit from automated reminder and document collection workflows for VAT returns, confirmation statements, and year-end accounts — triggered from a practice management system.',
      effort: 'Strategic',
    },
  },
  legal: {
    infrastructure: {
      title: 'Consider Clio Grow or InfoTrack for client intake',
      description: 'Online intake forms with automated matter creation reduce the time from first contact to onboarded client. Clio Grow is purpose-built for legal intake; InfoTrack integrates with most UK case management systems.',
      effort: 'Medium lift',
    },
    process: {
      title: 'Automate client updates and matter progression',
      description: 'Automated status update emails triggered by matter progression milestones reduce inbound calls asking about case progress — a significant time cost in high-volume practices.',
      effort: 'Medium lift',
    },
    volume: {
      title: 'AI-assisted document drafting for standard matters',
      description: 'For higher-volume practices, AI drafting tools can accelerate standard letters, first-draft NDAs, and routine correspondence — reviewed and sent by a fee earner in minutes.',
      effort: 'Strategic',
    },
  },
  recruitment: {
    infrastructure: {
      title: 'Consider an online booking widget for candidate interviews',
      description: 'Allowing candidates to self-schedule interviews via a booking widget (Calendly, HireVue, or similar) removes email back-and-forth and speeds up time-to-interview significantly.',
      effort: 'Quick win',
    },
    process: {
      title: 'Implement a recruitment CRM for candidate tracking',
      description: 'Moving from spreadsheets or inbox-based tracking to a dedicated ATS/CRM (Bullhorn, Vincere, or Recruitee) enables automated candidate communication, pipeline visibility, and compliance record-keeping.',
      effort: 'Medium lift',
    },
    volume: {
      title: 'Automate candidate communications and interview reminders',
      description: 'High-volume recruitment desks benefit from automated acknowledgement emails, interview reminders, and post-placement check-in sequences — reducing manual touchpoints per placement.',
      effort: 'Quick win',
    },
  },
  insurance: {
    infrastructure: {
      title: 'Consider an online quote or enquiry form',
      description: 'A structured online enquiry form — collecting cover type, risk profile, and contact details — qualifies leads before human involvement and ensures nothing falls through the cracks outside office hours.',
      effort: 'Quick win',
    },
    process: {
      title: 'Automate renewal reminders and document collection',
      description: 'Policy renewal is the highest-churn moment in insurance. Automated renewal sequences starting 8–10 weeks before expiry, with integrated document re-collection, significantly improve retention.',
      effort: 'Medium lift',
    },
    volume: {
      title: 'Automated cross-sell and reactivation sequences',
      description: 'For brokers handling 30+ policies, automated cross-sell prompts triggered by life events (property purchase, business growth, new vehicle) and reactivation sequences for lapsed clients are consistently high ROI.',
      effort: 'Strategic',
    },
  },
  other: {
    infrastructure: {
      title: 'Consider adding an online booking or enquiry workflow',
      description: 'A booking widget or structured multi-step enquiry form captures leads your website currently loses outside business hours. Setup is typically fast and the impact on inbound conversion is immediate.',
      effort: 'Quick win',
    },
    process: {
      title: 'Implement a CRM to centralise client data',
      description: 'Moving from spreadsheets to a basic CRM (HubSpot free tier, or a sector-specific tool) enables automated follow-up, pipeline tracking, and retention sequences that are difficult with manual data management.',
      effort: 'Medium lift',
    },
    volume: {
      title: 'Automate follow-up and reactivation sequences',
      description: 'Regular touchpoints with existing clients are often missed in busy businesses. Automated check-in and reactivation sequences — triggered by inactivity or time since last engagement — tend to be high ROI.',
      effort: 'Quick win',
    },
  },
}

// Secondary signal gap copy (shared across industries — these are universal)
const SECONDARY_GAP_COPY = {
  paymentProcessing: "Accepting payment online removes friction from the billing cycle and signals a modern, professional operation.",
  analyticsSetup:    "Without analytics tracking you're flying blind on what's working — you can't improve what you can't measure.",
  newsletterCapture: "Without an email list you have no owned channel to re-engage past visitors and nurture future clients.",
}

export const GAP_COPY: Record<Industry, Record<InfraSignalKey, string>> = {
  dental: {
    bookingWidget: "Patients researching dental care outside office hours have no way to book. Without an online booking option, that intent goes elsewhere.",
    liveChat: "New patients comparing practices will have questions before booking. Without a chat tool, those questions stay unanswered.",
    intakeForm: "Paper intake or verbal medical history at arrival costs surgery time per new patient. A digital form sent after booking recovers that entirely.",
    reviewsWidget: "Most patients check reviews before choosing a dentist. Without visible social proof, you're asking them to trust without evidence.",
    clientPortal: "Recall, document sharing, and treatment plan communication handled by phone or post carries unnecessary admin cost.",
    ...SECONDARY_GAP_COPY,
  },
  physio: {
    bookingWidget: "Self-referral physio patients want to book when they decide to act — typically not during working hours. No booking widget means losing that moment.",
    liveChat: "Patients unsure whether physio is right for them need reassurance before committing. A chat tool can qualify and convert these enquiries around the clock.",
    intakeForm: "Collecting intake and outcome measures on paper means manual data entry and delayed session planning.",
    reviewsWidget: "Patients choosing a physio almost always check reviews. Social proof on your site converts the traffic that's already there.",
    clientPortal: "Session notes, exercise plans, and progress tracking shared by email or paper is fragmented and creates unnecessary admin.",
    ...SECONDARY_GAP_COPY,
  },
  accountancy: {
    bookingWidget: "Prospective clients researching accountants will check your website after hours. Without a booking option, they move on to firms that make it easy to self-schedule.",
    liveChat: "Business owners with urgent finance questions will engage with any practice that responds quickly. Chat tools are increasingly expected in professional services.",
    intakeForm: "Onboarding new clients with manual document collection delays every engagement. A structured digital intake flow speeds this up and creates a professional first impression.",
    reviewsWidget: "Business owners choosing an accountant want peer validation. A reviews widget provides the social proof that moves a prospect from considering to contacting.",
    clientPortal: "Exchanging sensitive financial documents by email creates compliance risk. A client portal with secure document exchange is now standard in the sector.",
    ...SECONDARY_GAP_COPY,
  },
  legal: {
    bookingWidget: "Clients researching solicitors often want to act immediately. No online intake or booking creates friction at the highest-intent moment.",
    liveChat: "Legal clients often have time-sensitive queries. Missing those enquiries can mean losing instructions with a short window of opportunity.",
    intakeForm: "Gathering client information by email or phone before a first consultation is slow and disorganised. Structured digital intake changes that.",
    reviewsWidget: "Legal clients seek reassurance before engaging a solicitor. Prominent published reviews reduce the barrier to making initial contact.",
    clientPortal: "Matter documentation sent by email is disorganised and a GDPR risk. A client portal with matter-specific document sharing reduces risk and improves the client experience.",
    ...SECONDARY_GAP_COPY,
  },
  recruitment: {
    bookingWidget: "Candidates expect to self-schedule interviews. Without a booking option, every interview requires manual email back-and-forth — adding days to time-to-offer.",
    liveChat: "Candidates evaluating roles often have questions they won't call about. A chat tool captures that intent and keeps them engaged.",
    intakeForm: "Collecting candidate information by email or phone is slow and inconsistent. A structured registration or intake form standardises the process and feeds your pipeline properly.",
    reviewsWidget: "Candidates research agencies before registering. Without visible reviews or testimonials, you're asking them to take a leap of faith your competitors don't require.",
    clientPortal: "Sharing job specs, candidate packs, and placement documents by email is fragmented. A client portal gives employers and candidates one place to manage the process.",
    ...SECONDARY_GAP_COPY,
  },
  insurance: {
    bookingWidget: "Prospective clients wanting to discuss cover have no way to self-schedule outside office hours. That's a meaningful share of your web traffic with no way to convert.",
    liveChat: "Insurance buyers often have questions before they're ready to request a quote. A chat tool captures that interest and qualifies leads before human involvement.",
    intakeForm: "A structured online enquiry form — collecting cover type, risk profile, and contact details — qualifies leads automatically and ensures nothing is missed out of hours.",
    reviewsWidget: "Insurance is a trust purchase. Without visible reviews or client testimonials, prospects have no independent validation of your service.",
    clientPortal: "Policy documents, renewal notices, and claims correspondence managed by email is difficult to track and creates unnecessary admin for both sides.",
    ...SECONDARY_GAP_COPY,
  },
  other: {
    bookingWidget: "Without online booking, your website can't convert visitors outside business hours. That's a material share of traffic arriving, finding no way to act, and leaving.",
    liveChat: "Website visitors with questions leave if there's no way to get a quick answer. A chat tool or simple FAQ bot reduces that abandonment.",
    intakeForm: "Collecting client information manually slows onboarding and creates a poor first impression. A structured digital intake form reduces friction for both sides.",
    reviewsWidget: "Without visible reviews, website visitors can't easily validate your reputation. Social proof is one of the highest-converting elements on any services site.",
    clientPortal: "Sharing documents and updates with clients via email creates fragmented communication. A simple portal or shared workspace reduces that overhead.",
    ...SECONDARY_GAP_COPY,
  },
}

type PrimaryFindings = Pick<InfrastructureFindings,
  'bookingWidget' | 'liveChat' | 'intakeForm' | 'reviewsWidget' | 'clientPortal'>

export function getLowestScoringSignal(findings: PrimaryFindings): InfraSignalKey | null {
  const priority: Array<{ key: keyof PrimaryFindings }> = [
    { key: 'bookingWidget' },
    { key: 'liveChat' },
    { key: 'intakeForm' },
    { key: 'clientPortal' },
    { key: 'reviewsWidget' },
  ]
  for (const s of priority) {
    if (!findings[s.key].found) return s.key
  }
  return null
}

export function getTopRecommendations(subScores: SubScores, industry: Industry): Recommendation[] {
  const ranked = [
    { key: 'infrastructure' as const, score: subScores.infrastructure },
    { key: 'process' as const, score: subScores.process },
    { key: 'volume' as const, score: subScores.volume },
  ].sort((a, b) => a.score - b.score)
  return ranked.slice(0, 2).map(d => RECOMMENDATIONS[industry][d.key])
}
