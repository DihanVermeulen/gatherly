import type { Metadata } from 'next'
import { ArrowRight, Check, LayoutGrid, Users, Sparkles } from 'lucide-react'

export const metadata: Metadata = {
  title: 'How it Works',
  description: 'Host your perfect event in 3 easy steps with Gatherly.',
}

const steps = [
  {
    number: '1',
    icon: LayoutGrid,
    title: 'Create & Plan',
    description:
      'Set up your event in minutes. Add a name, date, and invite your guests. Gatherly handles the structure so you can focus on the fun.',
  },
  {
    number: '2',
    icon: Sparkles,
    title: 'Customise Modules',
    description:
      'Enable only what you need — gift exchange, potluck coordinator, or shared photo gallery. Every event is different; your tools should be too.',
  },
  {
    number: '3',
    icon: Users,
    title: 'Invite & Enjoy',
    description:
      'Guests join with a single link, contribute to wishlists, coordinate dishes, and share photos — all in one place. You just show up.',
  },
]

const moduleBullets = [
  'Enable or disable any feature per event',
  'Mix and match: gift exchange + potluck + photos',
  'No feature bloat — guests only see what matters',
  'Works for 4 guests or 400',
]

export default function HowItWorksPage() {
  return (
    <>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 flex flex-col md:flex-row items-center gap-12">
        {/* Left */}
        <div className="flex-1 max-w-xl">
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-gray-900 mb-6">
            Host your perfect event in{' '}
            <span className="text-brand-500">3 easy steps</span>
          </h1>
          <p className="text-lg text-gray-500 mb-8 leading-relaxed">
            Gatherly removes the coordination headache from event planning. Set up in minutes,
            customise for any occasion, and let your guests do the rest.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="#"
              className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Start Planning <ArrowRight size={16} />
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-2 border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Watch Events
            </a>
          </div>
        </div>

        {/* Right — event photo placeholder */}
        <div className="flex-1 flex justify-center">
          {/* TODO: replace with real event/people photo */}
          <div className="w-full max-w-md aspect-[4/3] bg-gray-100 rounded-2xl flex items-center justify-center">
            <span className="text-gray-300 text-sm">Event photo placeholder</span>
          </div>
        </div>
      </section>

      {/* Journey steps */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              The Journey to a Great Event
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Three simple phases take you from idea to celebration. Each step is designed to reduce
              effort and increase enjoyment.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step) => {
              const Icon = step.icon
              return (
                <div
                  key={step.number}
                  className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 bg-brand-500 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {step.number}
                    </div>
                    <Icon size={20} className="text-brand-500" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Modular by Design — dark section */}
      <section className="bg-brand-800 py-20">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center gap-12">
          {/* Left text */}
          <div className="flex-1 text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
              Modular by Design
            </h2>
            <p className="text-brand-400 mb-8 leading-relaxed">
              Every gathering is unique. Gatherly lets you pick exactly the features you need —
              nothing more, nothing less. Your events, your rules.
            </p>
            <ul className="space-y-3">
              {moduleBullets.map((b) => (
                <li key={b} className="flex items-center gap-3 text-white">
                  <Check size={16} className="text-brand-400 shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {/* Right — product image placeholder */}
          <div className="flex-1 flex justify-center">
            {/* TODO: replace with real product/device image */}
            <div className="w-full max-w-sm aspect-square bg-brand-600/40 rounded-2xl flex items-center justify-center">
              <span className="text-brand-400 text-sm">Product image placeholder</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-white text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to plan your next great gathering?
          </h2>
          <p className="text-gray-500 mb-8">
            Everything you need to host a great gathering — gift exchanges, potluck planning, and shared memories — in one place.
          </p>
          <a
            href="#"
            className="inline-block bg-brand-500 hover:bg-brand-600 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Get Started Free
          </a>
        </div>
      </section>
    </>
  )
}
