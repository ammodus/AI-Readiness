import Wizard from '@/components/Wizard'

export default function Home() {
  return (
    <main>
      <div className="border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="font-serif text-lg text-ink">AI Readiness Check</span>
        </div>
      </div>
      <Wizard />
    </main>
  )
}
