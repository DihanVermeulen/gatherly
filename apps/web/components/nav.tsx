import Link from 'next/link'

export function Nav() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-gray-900">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
            A
          </div>
          <span>Gatherly</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600">
          <Link href="/features" className="hover:text-gray-900 transition-colors">Features</Link>
          <Link href="/how-it-works" className="hover:text-gray-900 transition-colors">How it Works</Link>
          <Link href="/pricing" className="hover:text-gray-900 transition-colors">Pricing</Link>
          <Link href="/download" className="hover:text-gray-900 transition-colors">Download</Link>
        </nav>

        {/* CTA */}
        <Link
          href="#"
          className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Get Started Free
        </Link>
      </div>
    </header>
  )
}
