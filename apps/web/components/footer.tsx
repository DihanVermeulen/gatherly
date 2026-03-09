import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 py-12 mt-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand column */}
          <div>
            <div className="flex items-center gap-2 font-bold text-gray-900 mb-3">
              <div className="w-7 h-7 bg-brand-500 rounded-md flex items-center justify-center text-white text-xs font-bold">
                A
              </div>
              <span>Gatherly</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Gather without the chaos. Gatherly handles the details so you can focus on the memories.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Product</h3>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/features" className="hover:text-gray-900 transition-colors">Features</Link></li>
              <li><Link href="/how-it-works" className="hover:text-gray-900 transition-colors">Integrations</Link></li>
              <li><Link href="/pricing" className="hover:text-gray-900 transition-colors">Pricing</Link></li>
              <li><Link href="#" className="hover:text-gray-900 transition-colors">Photo App</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Company</h3>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="#" className="hover:text-gray-900 transition-colors">About Us</Link></li>
              <li><Link href="#" className="hover:text-gray-900 transition-colors">Careers</Link></li>
              <li><Link href="#" className="hover:text-gray-900 transition-colors">Blog</Link></li>
              <li><Link href="#" className="hover:text-gray-900 transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Support</h3>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="#" className="hover:text-gray-900 transition-colors">Help Center</Link></li>
              <li><Link href="#" className="hover:text-gray-900 transition-colors">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-gray-900 transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-gray-900 transition-colors">Status</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6 text-center text-xs text-gray-400">
          &copy; 2026 Gatherly Technologies Inc. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
