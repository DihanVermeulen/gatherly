---
status: testing
phase: 21-nextjs-website
source: 21-01-SUMMARY.md, 21-02-SUMMARY.md, 21-03-SUMMARY.md, 21-04-SUMMARY.md, 21-05-SUMMARY.md
started: 2026-03-08T00:00:00Z
updated: 2026-03-08T00:00:00Z
---

## Current Test

number: 4
name: VideoModal opens on Watch Demo
expected: |
  Clicking "Watch Demo" on the home page opens a full-screen overlay modal.
  Pressing Escape or clicking the backdrop closes the modal.
awaiting: user response

## Tests

### 1. Site boots and Nav renders
expected: Running `pnpm dev` in apps/web starts the dev server on port 3001. Visiting http://localhost:3001 shows a sticky Nav with logo, Features / How it Works / Pricing / Download links, and a Get Started CTA button.
result: pass

### 2. Footer visible on every page
expected: Scrolling to the bottom of any page (home, features, etc.) shows a 4-column footer with brand tagline, Product, Company, and Support columns.
result: pass

### 3. Home page hero + feature grid
expected: The home page has a hero section with "Events Made Effortless" (or similar) heading, a teal CTA button, and a "Watch Demo" ghost button. Below that is a 3-column feature grid (Gift Exchange, Potluck Planner, Photo Gallery).
result: pass

### 4. VideoModal opens on Watch Demo
expected: Clicking "Watch Demo" on the home page opens a full-screen overlay modal. Pressing Escape or clicking the backdrop closes the modal.
result: [pending]

### 5. Mobile CTA section on home page
expected: The home page has a dark teal section at the bottom with App Store and Google Play download buttons and a phone mockup graphic.
result: [pending]

### 6. Features page renders
expected: Navigating to /features shows a dark teal hero section, three alternating two-column feature sections (Gift Exchange, Potluck Planner, Photo Memories each with icon badge and bullet points), and a bordered CTA box at the bottom.
result: [pending]

### 7. How it Works page renders
expected: Navigating to /how-it-works shows a hero with a "3 easy steps" highlight, three numbered step cards on a light background, a dark teal "Modular by Design" section with a checklist, and a CTA at the bottom.
result: [pending]

### 8. Download page renders
expected: Navigating to /download shows a hero with App Store and Google Play buttons, a phone mockup, and a 3-column mobile features grid.
result: [pending]

### 9. Pricing page (coming soon stub)
expected: Navigating to /pricing shows a branded coming-soon page (not a 404). The page has some content indicating pricing is coming soon.
result: [pending]

### 10. Magic link page — loading state (no Nav/Footer)
expected: Navigating to /magic-link/test-token shows a loading state ("Opening the app..." or similar) with no Nav or Footer visible on the page.
result: [pending]

### 11. Magic link page — not-installed fallback
expected: After ~2 seconds on /magic-link/test-token (if the app is not installed), the page switches to a fallback state showing App Store and Google Play download buttons.
result: [pending]

## Summary

total: 11
passed: 3
issues: 0
pending: 8
skipped: 0

## Gaps

[none yet]
