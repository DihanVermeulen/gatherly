import type { Metadata } from 'next'
import { Check, Gift, UtensilsCrossed, Camera } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Features',
  description:
    'The modern toolkit for unforgettable gatherings. Gift exchange, potluck planning, and shared photo memories.',
}

const features = [
  {
    icon: Gift,
    title: 'Smart Gift Exchange (Secret Santa)',
    description:
      'Automated matching ensures everyone gets a thoughtful gift. Set budgets, create wishlists, and track deliveries — all in one place.',
    bullets: [
      'Anonymous assignment generation',
      'Built-in wishlists with priorities',
      'Budget limits and tracking',
      'Couple exclusions for fair matching',
    ],
    imageAlt: 'Gift exchange screenshot',
    imageLeft: true,
  },
  {
    icon: UtensilsCrossed,
    title: 'Real-Time Potluck Planner',
    description:
      "Never duplicate dishes again. Coordinate who brings what with real-time lists, dietary labels, and RSVP food commitments.",
    bullets: [
      'Live coordination prevents duplicates',
      'Dietary restriction labels',
      'RSVP with food commitments',
      'Categorised by course (mains, sides, drinks)',
    ],
    imageAlt: 'Potluck planner screenshot',
    imageLeft: false,
  },
  {
    icon: Camera,
    title: 'Shared Photo Memories',
    description:
      'Every guest contributes to a single private album. High-resolution uploads, bulk download, and shared commenting keep memories alive.',
    bullets: [
      'Private collaborative album',
      'High-resolution uploads',
      'Bulk download and print',
      'Shared commenting',
    ],
    imageAlt: 'Photo gallery screenshot',
    imageLeft: true,
  },
]

export default function FeaturesPage() {
  return (
    <>
      {/* Dark teal hero */}
      <section className="bg-brand-800 py-20 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-6">
            Gather without{' '}
            <span className="text-brand-400 italic">the chaos</span>
          </h1>
          <p className="text-brand-400 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
            Every feature is purpose-built for the moments that matter most. No generic tools, no
            compromise — just the right module for every type of gathering.
          </p>
          <a
            href="#"
            className="inline-block bg-white text-brand-800 hover:bg-gray-100 font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Get Started Free
          </a>
        </div>
      </section>

      {/* Alternating feature sections */}
      {features.map((feature, i) => {
        const Icon = feature.icon
        const isImageLeft = feature.imageLeft

        const imageBlock = (
          <div className="flex-1">
            {/* TODO: replace with real feature screenshot */}
            <div className="rounded-2xl bg-gray-100 w-full aspect-[4/3] flex items-center justify-center">
              <span className="text-gray-300 text-sm">Screenshot placeholder</span>
            </div>
          </div>
        )

        const textBlock = (
          <div className="flex-1 max-w-lg">
            <div className="w-10 h-10 bg-brand-500/10 rounded-lg flex items-center justify-center mb-4">
              <Icon size={20} className="text-brand-500" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{feature.title}</h2>
            <p className="text-gray-500 mb-6 leading-relaxed">{feature.description}</p>
            <ul className="space-y-2">
              {feature.bullets.map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm text-gray-600">
                  <Check size={14} className="text-brand-500 shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        )

        return (
          <section key={feature.title} className={`py-20 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
            <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center gap-12">
              {isImageLeft ? (
                <>{imageBlock}{textBlock}</>
              ) : (
                <>{textBlock}{imageBlock}</>
              )}
            </div>
          </section>
        )
      })}

      {/* CTA section */}
      <section className="py-20 bg-white">
        <div className="max-w-2xl mx-auto px-6">
          <div className="border-2 border-brand-500 rounded-2xl p-10 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Ready to simplify your next gathering?
            </h2>
            <p className="text-gray-500 mb-8">
              Gift exchanges, potluck coordination, shared photo albums — everything your gathering needs, in one place.
            </p>
            <a
              href="#"
              className="inline-block bg-brand-500 hover:bg-brand-600 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Get Started Free
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
