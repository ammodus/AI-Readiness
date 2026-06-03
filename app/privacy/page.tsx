import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — AI Readiness Check',
}

export default function PrivacyPolicy() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 md:py-20">
      <Link href="/" className="text-sm text-muted hover:text-ink transition-colors mb-10 block">
        ← Back
      </Link>

      <h1 className="font-serif text-3xl md:text-4xl font-normal text-ink mb-2 leading-tight">
        Privacy Policy
      </h1>
      <p className="text-sm text-muted mb-10">Last updated: June 2026</p>

      <div className="space-y-8 text-base text-ink leading-relaxed">

        <section>
          <h2 className="font-semibold text-lg mb-2">Who we are</h2>
          <p>
            This tool is operated by Ammodus Group. If you have any questions about this policy,
            contact us at <a href="mailto:hello@ammodusgroup.com" className="underline hover:no-underline">hello@ammodusgroup.com</a>.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-lg mb-2">What data we collect</h2>
          <p>When you use this tool, we collect:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-muted">
            <li>Your name and email address</li>
            <li>Your business website URL</li>
            <li>Your answers to the diagnostic questions</li>
            <li>The AI readiness score and analysis generated for your business</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-lg mb-2">How we use your data</h2>
          <p>Your data is used solely to:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-muted">
            <li>Run the AI readiness analysis on your website</li>
            <li>Send you your results report, if you request it</li>
            <li>Log your results in our internal CRM so we can follow up if relevant</li>
          </ul>
          <p className="mt-3">We do not send marketing emails or share your data with third parties for marketing purposes.</p>
        </section>

        <section>
          <h2 className="font-semibold text-lg mb-2">Third-party services</h2>
          <p>To provide this service, your data is processed by:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-muted">
            <li><strong className="text-ink">Anthropic</strong> — AI analysis of your business website and diagnostic answers</li>
            <li><strong className="text-ink">Firecrawl</strong> — Website scraping to read your publicly accessible web pages</li>
            <li><strong className="text-ink">Resend</strong> — Email delivery of your report</li>
            <li><strong className="text-ink">Notion</strong> — Internal CRM logging</li>
          </ul>
          <p className="mt-3">Each provider processes data only as necessary to perform their function and operates under their own privacy and security policies.</p>
        </section>

        <section>
          <h2 className="font-semibold text-lg mb-2">Legal basis (GDPR)</h2>
          <p>
            We process your data on the basis of your consent, given when you tick the consent box before submitting the form.
            You may withdraw consent at any time by contacting us.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-lg mb-2">How long we keep your data</h2>
          <p>
            We retain your name, email, and results in our CRM for up to 12 months. You can request deletion at any time.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-lg mb-2">Your rights</h2>
          <p>Under UK and EU GDPR, you have the right to:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-muted">
            <li>Access the personal data we hold about you</li>
            <li>Request correction or deletion of your data</li>
            <li>Withdraw consent at any time</li>
            <li>Lodge a complaint with the ICO (uk.ico.org.uk)</li>
          </ul>
          <p className="mt-3">
            To exercise any of these rights, email <a href="mailto:hello@ammodusgroup.com" className="underline hover:no-underline">hello@ammodusgroup.com</a>.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-lg mb-2">Cookies</h2>
          <p>
            This tool does not use tracking cookies or analytics. No data is stored in your browser beyond what is needed to run the session.
          </p>
        </section>

      </div>
    </div>
  )
}
