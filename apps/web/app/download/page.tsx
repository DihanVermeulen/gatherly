import type { Metadata } from 'next'
import { Bell, Image as ImageIcon, WifiOff, Shield } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Download',
  description:
    'Get Gatherly on iOS and Android. Manage events, receive notifications, and capture memories on the go.',
}

const mobileFeatures = [
  {
    icon: Bell,
    title: 'Real-time Notifications',
    description:
      'Instant alerts for schedule shifts, attendee messages, and important broadcast updates.',
  },
  {
    icon: ImageIcon,
    title: 'Easy Photo Uploads',
    description:
      'Capture moments as they happen and share them instantly with all event participants.',
  },
  {
    icon: WifiOff,
    title: 'Offline Access',
    description:
      'Access your tickets, itineraries, and maps even when connection is spotty or unavailable.',
  },
]

export default function DownloadPage() {
  return (
    <>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 flex flex-col md:flex-row items-center gap-12">
        {/* Left */}
        <div className="flex-1 max-w-xl">
          <p className="text-xs font-semibold tracking-widest text-brand-500 uppercase mb-4">
            Mobile App
          </p>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-gray-900 mb-6">
            Gatherly in your{' '}
            <span className="text-brand-500">pocket</span>
          </h1>
          <p className="text-lg text-gray-500 mb-8 leading-relaxed">
            Manage events, receive real-time updates, and capture memories on the go. Experience
            the best way to stay connected with your community.
          </p>

          {/* App store buttons */}
          <div className="flex flex-wrap gap-4 mb-6">
            {/* App Store */}
            <a
              href="#"
              className="flex items-center gap-3 bg-black hover:bg-gray-900 text-white px-5 py-3 rounded-xl transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6" aria-hidden="true">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <div>
                <p className="text-xs opacity-70">Download on the</p>
                <p className="text-sm font-semibold">App Store</p>
              </div>
            </a>

            {/* Google Play — default state only (PLAY_INSTALLED in template is a mockup artifact) */}
            <a
              href="#"
              className="flex items-center gap-3 bg-black hover:bg-gray-900 text-white px-5 py-3 rounded-xl transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6" aria-hidden="true">
                <path d="M3.18 23.76c.37.2.8.22 1.2.06l12.16-7.03-2.66-2.67-10.7 9.64zm-1.14-1.02A1.99 1.99 0 012 21.22V2.78c0-.66.36-1.23.87-1.55L14.12 12 2.04 22.74zM20.98 10.5l-2.63-1.52-2.98 2.97 2.98 2.98 2.65-1.53c.76-.44.76-1.47-.02-1.9zM4.38.18L16.54 7.2 13.88 9.87 3.18.24c.37-.17.82-.17 1.2-.06z" />
              </svg>
              <div>
                <p className="text-xs opacity-70">Get it on</p>
                <p className="text-sm font-semibold">Google Play</p>
              </div>
            </a>
          </div>

          {/* Trust badge */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Shield size={16} className="text-brand-500" />
            <span>
              Trusted by <strong className="text-gray-700">50,000+</strong> organisers
            </span>
          </div>
        </div>

        {/* Right — phone mockup */}
        <div className="flex-1 flex justify-center">
          <div className="w-60 h-[500px] bg-gray-900 rounded-[3rem] border-4 border-gray-800 shadow-2xl overflow-hidden p-4 flex flex-col">
            <div className="text-white text-xs font-semibold mb-3">My Events</div>
            {[
              { name: "Anna's Birthday", sub: 'Tomorrow • 12 guests', color: 'bg-brand-500' },
              { name: 'Team Offsite Dinner', sub: 'Friday • 8 guests', color: 'bg-purple-500' },
              { name: 'Annual Holiday Bash', sub: 'Dec 20 • 24 guests', color: 'bg-orange-400' },
              { name: 'Wine Tasting Evening', sub: 'Jan 12 • 6 guests', color: 'bg-pink-500' },
            ].map((ev) => (
              <div key={ev.name} className="flex items-center gap-3 bg-gray-800 rounded-xl p-3 mb-2">
                <div className={`w-8 h-8 ${ev.color} rounded-lg shrink-0`} />
                <div>
                  <p className="text-white text-xs font-medium">{ev.name}</p>
                  <p className="text-gray-400 text-xs">{ev.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile-first features grid */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything you need,{' '}
              <span className="text-brand-500">mobile-first</span>
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              We&apos;ve rebuilt the Gatherly experience from the ground up to empower you on the
              field, at the venue, or on your commute.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {mobileFeatures.map((f) => {
              const Icon = f.icon
              return (
                <div
                  key={f.title}
                  className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm"
                >
                  <div className="w-10 h-10 bg-brand-500/10 rounded-lg flex items-center justify-center mb-4">
                    <Icon size={20} className="text-brand-500" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Teal CTA section */}
      <section className="bg-brand-800 py-20 text-white text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to simplify your next event?
          </h2>
          <p className="text-brand-400 mb-8 leading-relaxed">
            Join thousands of organisers who use Gatherly to create unforgettable experiences.
            Available now for iOS and Android.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="#"
              className="border-2 border-white hover:bg-white hover:text-brand-800 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Get Started for Free
            </a>
            <a
              href="#"
              className="bg-white text-brand-800 hover:bg-gray-100 font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              View Live Demo
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
