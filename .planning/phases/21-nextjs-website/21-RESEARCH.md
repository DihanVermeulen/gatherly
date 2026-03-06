# Phase 21: Gatherly Next.js Website - Research

**Researched:** 2026-03-06
**Domain:** Next.js 15 App Router, Tailwind CSS v4, Turborepo monorepo integration, Universal Links deep link redirect
**Confidence:** HIGH

---

## Summary

This phase builds a marketing website (`apps/web/`) using Next.js 15 App Router with Tailwind CSS v4, integrated into the existing pnpm + Turborepo monorepo. Six pages must be produced: Home, Features, How it Works, Download, Pricing (stub), and a Magic Link redirect page. Four screen templates (Home.png, Features.png, Download.png, HowItWorks.png) define the exact visual target.

The standard approach is a manually scaffolded Next.js 15 package within `apps/web/`, reusing `@repo/eslint-config` (which already has a Next.js preset) and `@repo/typescript-config` (which already has a `nextjs.json`). Tailwind v4 setup is CSS-first: no `tailwind.config.js` — configuration lives entirely in `globals.css` via `@import "tailwindcss"` and `@theme {}` blocks. Custom brand colors are defined as `--color-*` tokens inside `@theme`.

The magic link redirect page is a pure client component (`'use client'`) that on mount attempts Universal Links (https:// App Links/AASA already configured from Phase 20), falls back to Android `intent://` for older Android Chrome, and shows store buttons + a message if the app is not installed.

**Primary recommendation:** Scaffold `apps/web/` manually (no `create-next-app` since the repo already exists). Add the package as a workspace member via the existing `pnpm-workspace.yaml` `apps/*` glob. Reuse existing `@repo/eslint-config/next` and `@repo/typescript-config/nextjs.json`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | `latest` (~15.x) | Framework with App Router, file-based routing, SSR/SSG | Official Next.js — only choice |
| `react` | `19.1.0` (monorepo override) | UI runtime | Monorepo override pins this |
| `react-dom` | `19.1.0` (monorepo override) | DOM rendering | Monorepo override pins this |
| `tailwindcss` | `^4.x` | Utility CSS | Locked decision; v4 is CSS-first |
| `@tailwindcss/postcss` | `^4.x` | PostCSS plugin for Tailwind v4 | Required companion for v4 in Next.js |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | `latest` | SVG icon components | Already used in mobile app; consistent icon set |
| `@repo/eslint-config` | `workspace:*` | Shared ESLint (has `./next` export) | Use `./next` preset |
| `@repo/typescript-config` | `workspace:*` | Shared tsconfig (has `nextjs.json`) | Extend from `nextjs.json` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Tailwind v4 | Tailwind v3 | v3 uses `tailwind.config.js`; locked decision is v4 |
| lucide-react | heroicons | lucide already in codebase |
| Manual scaffold | `create-next-app` | Can't run interactively in existing monorepo dir |

### Installation

```bash
# From apps/web/ after creating the directory
pnpm add next react react-dom
pnpm add -D tailwindcss @tailwindcss/postcss lucide-react typescript @types/node @types/react @types/react-dom
pnpm add -D @repo/eslint-config@workspace:* @repo/typescript-config@workspace:*
```

---

## Architecture Patterns

### Recommended Project Structure

```
apps/web/
├── app/
│   ├── layout.tsx           # Root layout — Nav + Footer, imports globals.css
│   ├── page.tsx             # Home page (matches Home.png)
│   ├── features/
│   │   └── page.tsx         # Features page (matches Features.png)
│   ├── how-it-works/
│   │   └── page.tsx         # How it Works page (matches HowItWorks.png)
│   ├── download/
│   │   └── page.tsx         # Download page (matches Download.png)
│   ├── pricing/
│   │   └── page.tsx         # Pricing stub — "Coming soon"
│   ├── magic-link/
│   │   └── [token]/
│   │       └── page.tsx     # Deep link redirect — 'use client'
│   └── globals.css          # @import "tailwindcss" + @theme {} brand tokens
├── components/
│   ├── nav.tsx              # Persistent nav bar (shared via root layout)
│   ├── footer.tsx           # Footer (shared via root layout)
│   └── video-modal.tsx      # Video modal — 'use client', dialog/backdrop
├── public/
│   └── .well-known/         # AASA + assetlinks.json (copy from gatherly app)
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── eslint.config.mjs
└── package.json
```

### Pattern 1: Root Layout for Persistent Nav

The root layout (`app/layout.tsx`) wraps every page with Nav and Footer. Because App Router layouts do NOT re-render on navigation, this is the standard pattern for persistent UI.

```typescript
// app/layout.tsx
// Source: https://nextjs.org/docs/app/getting-started/layouts-and-pages
import './globals.css'
import { Nav } from '@/components/nav'
import { Footer } from '@/components/footer'

export const metadata = {
  title: { template: '%s | Gatherly', default: 'Gatherly — Events Made Effortless' },
  description: 'Plan, manage, and enjoy your gatherings without the stress.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
```

The magic link page (`/magic-link/[token]`) should use its own layout (or no layout) since it has no nav/footer. Create `app/magic-link/layout.tsx` that renders only `{children}` to override the root layout for that subtree.

### Pattern 2: Tailwind v4 CSS-First Configuration

No `tailwind.config.js`. All configuration is in `globals.css`.

```css
/* app/globals.css */
/* Source: https://nextjs.org/docs/app/getting-started/css */
@import "tailwindcss";

@theme {
  /* Brand teal — extracted from template visuals */
  --color-brand-500: #1DB8A0;
  --color-brand-600: #189e88;
  --color-brand-700: #137870;

  /* Dark teal section background (CTA sections) */
  --color-brand-dark: #0f766e;

  /* Typography */
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
}
```

Usage in components: `bg-brand-500`, `text-brand-600`, `hover:bg-brand-600`.

```css
/* postcss.config.mjs */
/* Source: https://nextjs.org/docs/app/getting-started/css */
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

### Pattern 3: Dynamic Route for Magic Link — Client Component

In Next.js 15, `params` is a Promise. For a client component, unwrap with React's `use()`.

```typescript
// app/magic-link/[token]/page.tsx
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes
'use client'
import { use, useEffect, useState } from 'react'

type PageProps = { params: Promise<{ token: string }> }

export default function MagicLinkPage({ params }: PageProps) {
  const { token } = use(params)
  const [state, setState] = useState<'loading' | 'not_installed'>('loading')

  useEffect(() => {
    // Universal Links intercept automatically on iOS + verified Android.
    // For older Android Chrome, attempt intent:// after a short delay.
    const packageName = 'com.gatherly.gatherly'
    const intentUrl = `intent://magic-link/${token}#Intent;scheme=https;package=${packageName};S.browser_fallback_url=${encodeURIComponent(window.location.href)};end`

    // On iOS + modern Android with App Links, the browser intercepts
    // the page load itself — no JS needed. This code is the fallback.
    const timer = setTimeout(() => {
      window.location.href = intentUrl
    }, 300)

    // If still here after 2s, app not installed
    const fallbackTimer = setTimeout(() => {
      setState('not_installed')
    }, 2000)

    return () => {
      clearTimeout(timer)
      clearTimeout(fallbackTimer)
    }
  }, [token])

  // render loading state or not_installed state
}
```

### Pattern 4: Video Modal — Client Component

The video modal is a `'use client'` component that renders a `<dialog>` element or a custom backdrop div with an iframe/video. Keep it as a named export imported by the Home page.

```typescript
// components/video-modal.tsx
'use client'
import { useState } from 'react'

interface VideoModalProps {
  videoUrl?: string
  triggerLabel: string
}

export function VideoModal({ videoUrl, triggerLabel }: VideoModalProps) {
  const [open, setOpen] = useState(false)
  // TODO: replace with real demo video URL
  const url = videoUrl ?? ''

  return (
    <>
      <button onClick={() => setOpen(true)}>{triggerLabel}</button>
      {open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
             onClick={() => setOpen(false)}>
          <div className="relative w-full max-w-3xl aspect-video bg-black rounded-xl overflow-hidden"
               onClick={e => e.stopPropagation()}>
            {url ? (
              <iframe src={url} className="w-full h-full" allowFullScreen />
            ) : (
              <p className="text-white text-center p-8">Video coming soon</p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
```

### Pattern 5: package.json for apps/web

```json
{
  "name": "web",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "eslint .",
    "check-types": "tsc --noEmit"
  },
  "dependencies": {
    "next": "latest",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "lucide-react": "latest"
  },
  "devDependencies": {
    "@repo/eslint-config": "workspace:*",
    "@repo/typescript-config": "workspace:*",
    "@tailwindcss/postcss": "latest",
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "tailwindcss": "latest",
    "typescript": "latest"
  }
}
```

Note: Port 3001 is set in the `dev` script via `-p 3001` flag (not via next.config.ts).

### Pattern 6: next.config.ts

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async headers() {
    return [
      // AASA must be served as application/json (no file extension)
      {
        source: '/.well-known/apple-app-site-association',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
      },
    ]
  },
}

export default nextConfig
```

### Pattern 7: tsconfig.json

```json
{
  "extends": "@repo/typescript-config/nextjs.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Pattern 8: eslint.config.mjs

```javascript
// eslint.config.mjs
import { config } from '@repo/eslint-config/next'
export default config
```

### Anti-Patterns to Avoid

- **Never put `window` or DOM APIs in server components** — magic link page must be `'use client'`. Any `useEffect`, `window.location`, or timer must be inside a client component.
- **Never access `params` synchronously in Next.js 15 async server components** — always `await params` or use `use(params)` in client components.
- **Never put Nav inside individual page files** — it belongs only in `app/layout.tsx`.
- **Never use `tailwind.config.js` for v4** — all customization goes in `@theme {}` inside the CSS file.
- **Don't create a separate layout for magic-link that includes Nav** — the magic link page is a standalone redirect screen. Override the root layout.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSS utility classes | Custom CSS properties | Tailwind v4 utility classes | v4 auto-generates utilities from `@theme` tokens |
| Icon SVGs inline | Hardcoded SVG markup | `lucide-react` | Tree-shakeable, consistent, already in monorepo |
| Deep link fallback logic | Complex OS detection | intent:// syntax + `S.browser_fallback_url` | Chrome handles the fallback natively; no custom UA sniffing needed |
| AASA / assetlinks.json | Hand-craft files | Copy from `apps/gatherly/public/.well-known/` | Already created and verified in Phase 20 |
| Metadata for SEO | `<head>` tags in JSX | Next.js `export const metadata` | Next.js metadata API handles OG, title, description |

**Key insight:** The intent:// syntax with `S.browser_fallback_url` is Chrome for Android's built-in mechanism — Chrome intercepts the navigation, attempts to open the app, and falls back to the provided URL if the package is not installed. No custom UA detection needed.

---

## Common Pitfalls

### Pitfall 1: Forgetting `'use client'` on the Magic Link Page

**What goes wrong:** `window`, `useEffect`, and `useState` are used but Next.js attempts to render on the server — runtime error "window is not defined."
**Why it happens:** App Router defaults all components to Server Components.
**How to avoid:** Add `'use client'` as the first line of `app/magic-link/[token]/page.tsx`.
**Warning signs:** Build error mentioning `window is not defined` or hook rules violation.

### Pitfall 2: Accessing `params` Synchronously in Next.js 15

**What goes wrong:** TypeScript error — `params.token` doesn't exist because `params` is `Promise<{token: string}>`.
**Why it happens:** Next.js 15 changed `params` from a plain object to a Promise.
**How to avoid:** In server components: `const { token } = await params`. In client components: `const { token } = use(params)`.
**Warning signs:** TypeScript reports `Property 'token' does not exist on type 'Promise<...>'`.

### Pitfall 3: Nav Appearing on Magic Link Page

**What goes wrong:** The root layout wraps the magic link redirect page with Nav and Footer, which looks wrong for a branded loader.
**Why it happens:** Root layout applies to all routes by default.
**How to avoid:** Create `app/magic-link/layout.tsx` that renders only `{children}` — this overrides the root layout for the `/magic-link/*` subtree.

### Pitfall 4: AASA Served Without `application/json` Content-Type

**What goes wrong:** iOS Universal Links verification fails silently — App Links don't trigger.
**Why it happens:** Files without extensions in `/public` may be served as `application/octet-stream`.
**How to avoid:** Set the Content-Type header explicitly in `next.config.ts` headers configuration (see Pattern 6 above).

### Pitfall 5: Tailwind v4 `@theme` Token Naming Mismatch

**What goes wrong:** Color utilities like `bg-brand` don't exist — Tailwind doesn't pick up the tokens.
**Why it happens:** Tailwind v4 generates utilities from `--color-*` variables. Using `--brand-color` instead of `--color-brand-500` skips utility generation.
**How to avoid:** All color tokens must be prefixed `--color-` inside `@theme {}`. Typography tokens use `--font-`. Spacing uses `--spacing-`.

### Pitfall 6: `intent://` Fired Without User Gesture

**What goes wrong:** Chrome blocks the intent:// navigation in a `setTimeout` with no prior user interaction — the redirect silently fails.
**Why it happens:** Chrome's security policy blocks intent launches from timers that weren't triggered by a user gesture.
**How to avoid:** The Universal Links / App Links path (iOS + verified Android) works without this issue. For older Android, the `intent://` link works best when placed as an actual `<a>` element the user taps. Use a short timeout (300ms) as a soft redirect, but always show a visible "Open in app" button as the fallback.

### Pitfall 7: React 19 Peer Dependency Warnings

**What goes wrong:** Some packages show peer dependency warnings against React 19.
**Why it happens:** Monorepo pins React 19.1.0 via pnpm overrides. Some packages haven't updated their peerDependencies yet.
**How to avoid:** These are safe to ignore (as noted in existing CLAUDE.md). Do not downgrade React.

### Pitfall 8: Port Conflict with `apps/gatherly`

**What goes wrong:** `next dev` starts on port 3000, colliding with the existing gatherly React app.
**Why it happens:** Next.js defaults to port 3000.
**How to avoid:** Always use `next dev -p 3001` in `package.json` scripts. Port is NOT configurable via `next.config.ts`.

---

## Code Examples

### Tailwind v4 Theme — Brand Color Tokens

```css
/* Source: https://tailwindcss.com/docs/theme */
@import "tailwindcss";

@theme {
  /* Teal brand — from visual analysis of templates (#1DB8A0 approximate) */
  --color-brand-400: #25d0b4;
  --color-brand-500: #1db8a0;
  --color-brand-600: #189e88;
  --color-brand-800: #0f766e;  /* dark teal CTA sections */

  /* Keep default Tailwind colors — don't reset with --color-*: initial */
}
```

Usage: `bg-brand-500 hover:bg-brand-600 text-brand-500`

### Dynamic Route Params — Async Server Component

```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return <div>Token: {token}</div>
}
```

### Dynamic Route Params — Client Component

```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes
'use client'
import { use } from 'react'

export default function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  // ... useEffect etc.
}
```

### Android intent:// Deep Link Syntax

```
intent://magic-link/{token}#Intent;scheme=https;package=com.gatherly.gatherly;S.browser_fallback_url={encoded_fallback_url};end
```

Where:
- `scheme=https` — the scheme of the original URL being opened in the app
- `package=com.gatherly.gatherly` — from `app.json` android.package
- `S.browser_fallback_url` — URL-encoded page URL; Chrome redirects here if app not installed

Chrome will NOT fire intent:// launched via JavaScript timer without a user gesture. Show a visible button as a guaranteed fallback.

### Static Metadata Export

```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/generate-metadata
export const metadata = {
  title: 'Download | Gatherly',
  description: 'Get Gatherly on iOS and Android.',
}
```

### Root Layout with Persistent Nav

```typescript
// app/layout.tsx — Nav and Footer rendered once, preserved across navigations
import './globals.css'
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
```

---

## Visual Analysis of Screen Templates

### Home.png

- **Hero:** White background, left column (label "SIMPLIFY YOUR SOCIAL LIFE", heading "Events Made Effortless" in bold black + teal italic, subtext, two CTA buttons), right column (plant photo + floating app mockup card "Upcoming: Rooftop BBQ Party")
- **Feature grid:** Heading "Everything you need for the perfect host", 3-column cards: Gift Exchange, Potluck Planner, Photo Gallery — each with teal icon, title, description, 2-3 bullet points
- **Mobile CTA section:** Dark teal background, left text ("Experience Gatherly on the go"), App Store + Google Play buttons (black), right: phone mockup showing event list
- **Footer:** 4 columns — Gatherly logo + tagline left, then Product / Company / Support columns; copyright line

### Features.png

- **Hero section:** Dark teal background, large heading "The modern toolkit for unforgettable gatherings", subtext, CTA button
- **Feature sections (alternating left/right):** 3 features — Smart Gift Exchange (image left), Real-Time Potluck Planner (image right), Shared Photo Memories (image left) — each with teal icon, title, bullet points
- **CTA section:** Teal-bordered box "Ready to simplify your next gathering?" with button

### Download.png (nav differs — shows "Features, Pricing, About, Sign Up")

- **Hero:** White bg, left text ("MOBILE APP", "Gatherly in your pocket", description, App Store button, "PLAY_INSTALLED" state Google Play button, trust badge "Trusted by 50,000+ organizers"), right: phone mockup
- **Features grid:** "Everything you need, mobile-first" — 3 columns: Real-time Notifications, Easy Photo Uploads, Offline Access
- **CTA section:** Teal background, "Ready to simplify your next event?", two buttons

### HowItWorks.png

- **Hero:** White bg, heading "Host your perfect event in 3 easy steps", subtext, two CTA buttons, right: photo of people socializing
- **Journey steps:** 3-column cards labeled "Create & Plan", "Customize Modules", "Invite & Enjoy"
- **Modular by Design:** Dark section (teal/navy), left text with bullet features, right: product image of physical object
- **CTA:** "Ready to plan your next great gathering?" with button

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` with `content: []` | CSS-first `@theme {}` in globals.css | Tailwind v4.0 (Jan 2025) | No JS config file; tokens auto-generate utilities |
| `@tailwind base; components; utilities` directives | `@import "tailwindcss"` | Tailwind v4.0 | Single import replaces 3 directives |
| `params.token` (sync) | `await params` or `use(params)` (async) | Next.js 15 | Params is now a Promise |
| `next build` runs linter | Linter must be run via separate script | Next.js 16 | Does not affect this phase (Next.js 15) |
| `next dev` (webpack) | `next dev` uses Turbopack by default | Next.js 15 | Faster HMR; no config needed |

**Deprecated/outdated:**
- `tailwind.config.js` content paths: Not needed in v4 — content detection is automatic
- `next/head`: Not used in App Router — use `export const metadata` instead
- `getServerSideProps` / `getStaticProps`: Pages Router only — App Router uses async server components and fetch

---

## Deep Link Architecture for Magic Link Page

### How Universal Links Work (Phase 20 already configured)

1. User receives email with link `https://yourdomain.com/magic-link/{token}`
2. On iOS: AASA file (`/.well-known/apple-app-site-association`) tells iOS to intercept `/magic-link/*` URLs and open Gatherly app — browser never loads the page
3. On Android (verified): `assetlinks.json` + `autoVerify: true` in `intentFilters` tells Android to intercept — browser never loads the page
4. App receives the URL, extracts token, calls `/api/magic-link/redeem`

### Fallback Case — Browser Loads the Page

When app interception fails (app not installed, old Android, verification not yet completed):
1. Browser loads `/magic-link/{token}` — the Next.js page renders
2. Page shows: Gatherly logo + spinner + "Opening the app..."
3. `useEffect` fires with 300ms delay → sets `window.location.href` to `intent://` URL
4. If still on page after 2s → show "App not installed" state with store buttons

### Intent URL Construction

```
intent://magic-link/{token}#Intent;scheme=https;package=com.gatherly.gatherly;S.browser_fallback_url={encoded_current_url};end
```

The `S.browser_fallback_url` pointing back to the same page creates a stable fallback loop — Chrome redirects back to the redirect page which then shows the "not installed" state.

### .well-known Files

The `apps/web/public/.well-known/` directory must contain the same AASA and assetlinks.json as `apps/gatherly/public/.well-known/`. Copy both files. The production domain will determine which app serves these — when `apps/web` is the production website, its `.well-known/` is authoritative.

---

## Open Questions

1. **Production domain for .well-known**
   - What we know: `app.json` has `YOUR_DOMAIN` placeholder; Phase 20 created the files but with placeholder team ID in AASA
   - What's unclear: The actual domain isn't finalized; AASA has `TEAMID.com.gatherly.gatherly` placeholder
   - Recommendation: Copy the files as-is with placeholders; add TODO comments. No functional impact since app isn't published yet.

2. **Google Play "PLAY_INSTALLED" state on Download page**
   - What we know: Template shows "PLAY_INSTALLED" badge — an installed-state indicator
   - What's unclear: Context implies this is a visual state mockup, not a real detection mechanism (JS can't reliably detect app installation)
   - Recommendation: Implement only the default (not-installed) state. The "PLAY_INSTALLED" in the template is likely a design mockup artifact. Add a comment.

3. **Inter font loading**
   - What we know: Templates use a clean sans-serif consistent with Inter
   - What's unclear: Whether to use `next/font/google` to load Inter or rely on system font stack
   - Recommendation: Use `next/font/google` with Inter — it's zero-CLS, self-hosted via Next.js, and matches the template visuals precisely.

4. **HowItWorks dark "Modular by Design" section image**
   - What we know: Template shows a product/object image (appears to be a physical product render)
   - What's unclear: What image to use as a placeholder
   - Recommendation: Use a placeholder image div with brand colors; add TODO comment for real asset.

---

## Sources

### Primary (HIGH confidence)

- `https://nextjs.org/docs/app/getting-started/css` — Tailwind v4 + Next.js setup (fetched, current as of 2026-02-27)
- `https://nextjs.org/docs/app/getting-started/installation` — Next.js 15 manual installation, package.json scripts (fetched, current as of 2026-02-27)
- `https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes` — Dynamic routes, params as Promise, client component pattern (fetched, current as of 2026-02-27)
- `https://nextjs.org/docs/app/api-reference/config/next-config-js/headers` — Custom HTTP headers configuration (fetched, current as of 2026-02-27)
- `https://tailwindcss.com/docs/theme` — @theme directive, --color-* token syntax (fetched)
- `https://turborepo.dev/docs/guides/frameworks/nextjs` — Adding Next.js to Turborepo monorepo (fetched)
- `C:/repos/gatherly/packages/config-eslint/package.json` + `next.js` — Confirmed `./next` export exists with Next.js ESLint preset
- `C:/repos/gatherly/packages/config-typescript/nextjs.json` — Confirmed `nextjs.json` tsconfig exists
- `C:/repos/gatherly/apps/gatherly/public/.well-known/apple-app-site-association` — AASA content for copying
- `C:/repos/gatherly/apps/gatherly-mobile/app.json` — Bundle ID: `com.gatherly.gatherly`, scheme: `gatherly`
- `https://developer.chrome.com/docs/android/intents` — intent:// URL syntax and S.browser_fallback_url (fetched)

### Secondary (MEDIUM confidence)

- WebSearch for "Android Chrome intent:// syntax" — verified against Chrome developer docs above
- WebSearch for "Next.js port 3001 custom dev port" — confirmed via CLI flag `-p 3001` in dev script
- WebSearch for "Turborepo Next.js monorepo pnpm workspaces 2025" — confirmed workspace:* dependency protocol

### Tertiary (LOW confidence)

- Visual analysis of template PNGs for exact color values — `#1DB8A0` is an approximation; exact value may differ slightly. Verify with a color picker on the actual PNG files during implementation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — official Next.js docs confirm Tailwind v4 + PostCSS setup; monorepo configs exist
- Architecture: HIGH — App Router patterns verified via official docs; layout strategy is standard
- Deep link pattern: HIGH — intent:// syntax verified via Chrome developer docs; Phase 20 already has AASA/assetlinks.json
- Tailwind v4 theme: HIGH — @theme syntax verified via official Tailwind docs
- Brand colors: MEDIUM — visually extracted from PNG templates; exact hex may need fine-tuning
- Pitfalls: HIGH — params-as-Promise is a known breaking change in Next.js 15, documented

**Research date:** 2026-03-06
**Valid until:** 2026-06-06 (stable ecosystem — Next.js 15 and Tailwind v4 are current stable releases)
