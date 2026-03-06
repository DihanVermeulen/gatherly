# Phase 21: Gatherly Next.js Website - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a Next.js marketing website in `apps/web/` that showcases Gatherly's features. Includes: Home page, Features page, How it Works page, Download page, a Pricing stub page, and a magic link redirect page. Screen templates exist in `apps/web/screen-templates/` (Home.png, Features.png, Download.png) and must be matched pixel-for-pixel. This phase does not include backend auth, user accounts, or connecting to the API.

</domain>

<decisions>
## Implementation Decisions

### Page structure
- Pages to build: Home, Features, How it Works, Download, Pricing (stub), Magic Link redirect
- Features and How it Works are **two separate pages** with different content
  - Features page: matches Features.png template
  - How it Works page: own page with its own content/layout
- Pricing page: minimal "coming soon" stub so nav link doesn't 404
- Nav items: Features, How it Works, Pricing, Download
- "Get Started" / "Sign Up" nav button: `href="#"` (placeholder, no live destination yet)

### Magic link redirect page
- URL pattern: `/magic-link/[token]` (dynamic route)
- UI while redirecting: minimal branded loader — Gatherly logo + spinner + "Opening the app..." message
- Deep link method: Universal Links / App Links (https:// intercept via AASA + assetlinks.json already in place from Phase 20) **with intent:// fallback for older Android**
- App not installed fallback: stay on the redirect page, show inline App Store + Google Play buttons with a brief message

### CTAs and links
- App Store and Google Play buttons: `href="#"` (placeholder — app not yet published)
- "Watch Demo" button: opens an **inline video modal**
  - Video URL: hardcoded TODO comment in source — `// TODO: replace with real demo video URL`
  - Build the modal component ready to accept the URL
- "Start Planning Now" button: `href="#"` (placeholder)

### Monorepo integration
- Location: `apps/web/`
- Dev port: **3001** (3000 is taken by apps/gatherly)
- Shared packages: `@repo/eslint-config` and `@repo/typescript-config`
- CSS: **Tailwind CSS v4**
- Framework: Next.js latest (App Router)

### Screen templates
- Three templates provided in `apps/web/screen-templates/`:
  - `Home.png` — full landing page: hero ("Events Made Effortless"), features grid (Gift Exchange, Potluck Planner, Photo Gallery), mobile app CTA section, footer
  - `Features.png` — features detail: "The modern toolkit for unforgettable gatherings", Smart Gift Exchange, Real-Time Potluck Planner, Shared Photo Memories, CTA
  - `Download.png` — mobile app: "Gatherly in your pocket", app store buttons, feature highlights (Real-time Notifications, Easy Photo Uploads, Offline Access), CTA
- Match templates exactly for layout, color, typography, and component structure

### Claude's Discretion
- How it Works page layout and content (no template provided)
- Exact Pricing stub page design
- Magic link redirect page visual design (no template — use Gatherly brand/colors)
- Video modal implementation details (player, animation, backdrop)
- Exact Tailwind v4 configuration and color token mapping from templates
- Footer content and links

</decisions>

<specifics>
## Specific Ideas

- Brand color from templates: teal/green (#1DB8A0 approximate) used for CTAs and accent text
- Templates use a clean sans-serif typeface, white/light backgrounds
- Home hero shows a plant image + app mockup card on the right — match this composition
- Download page shows "PLAY_INSTALLED" state on the Google Play button — implement both states (default + installed indicator) or just default
- Nav is persistent across all pages

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 21-nextjs-website*
*Context gathered: 2026-03-06*
