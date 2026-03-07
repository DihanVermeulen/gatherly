'use client'
import { use, useEffect, useState } from 'react'

type State = 'loading' | 'not_installed'

type PageProps = { params: Promise<{ token: string }> }

const PACKAGE_NAME = 'com.gatherly.gatherly'

export default function MagicLinkPage({ params }: PageProps) {
  const { token } = use(params)
  const [state, setState] = useState<State>('loading')

  useEffect(() => {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : ''
    const intentUrl = `intent://magic-link/${token}#Intent;scheme=https;package=${PACKAGE_NAME};S.browser_fallback_url=${encodeURIComponent(currentUrl)};end`

    // Attempt intent:// redirect for older Android Chrome.
    // NOTE: Chrome may block this from a timer (no user gesture) — the visible
    // "Open in app" <a> link below is the reliable click-based fallback.
    const intentTimer = setTimeout(() => {
      window.location.href = intentUrl
    }, 300)

    // If still on page after 2s, app is not installed
    const fallbackTimer = setTimeout(() => {
      setState('not_installed')
    }, 2000)

    return () => {
      clearTimeout(intentTimer)
      clearTimeout(fallbackTimer)
    }
  }, [token])

  const currentUrl = typeof window !== 'undefined' ? window.location.href : ''
  const intentUrl = `intent://magic-link/${token}#Intent;scheme=https;package=${PACKAGE_NAME};S.browser_fallback_url=${encodeURIComponent(currentUrl)};end`

  if (state === 'not_installed') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        {/* Gatherly logo */}
        <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center text-white text-2xl font-extrabold mb-6 shadow-lg">
          A
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Get Gatherly</h1>
        <p className="text-gray-500 mb-8 max-w-sm leading-relaxed">
          It looks like you don&apos;t have the Gatherly app installed. Download it to open this
          magic link and join your event.
        </p>

        {/* App store buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <a
            href="#"
            className="flex items-center gap-3 bg-black hover:bg-gray-900 text-white px-5 py-3 rounded-xl transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            <div className="text-left">
              <p className="text-xs opacity-70">Download on the</p>
              <p className="text-sm font-semibold">App Store</p>
            </div>
          </a>

          <a
            href="#"
            className="flex items-center gap-3 bg-black hover:bg-gray-900 text-white px-5 py-3 rounded-xl transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M3.18 23.76c.37.2.8.22 1.2.06l12.16-7.03-2.66-2.67-10.7 9.64zm-1.14-1.02A1.99 1.99 0 012 21.22V2.78c0-.66.36-1.23.87-1.55L14.12 12 2.04 22.74zM20.98 10.5l-2.63-1.52-2.98 2.97 2.98 2.98 2.65-1.53c.76-.44.76-1.47-.02-1.9zM4.38.18L16.54 7.2 13.88 9.87 3.18.24c.37-.17.82-.17 1.2-.06z" />
            </svg>
            <div className="text-left">
              <p className="text-xs opacity-70">Get it on</p>
              <p className="text-sm font-semibold">Google Play</p>
            </div>
          </a>
        </div>

        {/* Visible intent:// link for Android (reliable, user-gesture triggered) */}
        <a
          href={intentUrl}
          className="text-brand-500 hover:text-brand-600 text-sm underline"
        >
          Already installed? Try opening the app
        </a>
      </div>
    )
  }

  // Loading state — shown briefly before OS intercept or fallback triggers
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
      {/* Gatherly logo */}
      <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center text-white text-2xl font-extrabold mb-8 shadow-lg">
        A
      </div>

      {/* Spinner */}
      <div className="w-10 h-10 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin mb-6" />

      <h1 className="text-xl font-semibold text-gray-900 mb-2">Opening the app...</h1>
      <p className="text-gray-400 text-sm max-w-xs">
        If the app doesn&apos;t open automatically, you may need to install Gatherly first.
      </p>
    </div>
  )
}
