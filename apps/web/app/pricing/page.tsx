import type { Metadata } from 'next'
import { Sparkles } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Gatherly pricing — coming soon.',
}

export default function PricingPage() {
  return (
    <section className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="w-14 h-14 bg-brand-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Sparkles size={28} className="text-brand-500" />
        </div>
        <div className="inline-block bg-brand-500/10 text-brand-600 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-4">
          Coming Soon
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-4">
          Simple, transparent pricing
        </h1>
        <p className="text-gray-500 leading-relaxed mb-8">
          We&apos;re working on pricing plans that work for individuals, families, and large
          organisations. Check back soon.
        </p>
        <a
          href="/"
          className="inline-block bg-brand-500 hover:bg-brand-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          Back to Home
        </a>
      </div>
    </section>
  )
}
