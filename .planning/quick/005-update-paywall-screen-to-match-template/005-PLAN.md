# Quick Task 005: Update Paywall Screen to Match PayWall.png Template

## Goal
Update `app/pricing.tsx` to match the PayWall.png screen template exactly.

## Differences (current → template)

1. **Page headline**: Add "Elevate your events" title and "Choose the plan that fits your hosting style." subtitle above the tier cards
2. **Free tier**: Add "Gift Exchange module" feature row
3. **Premium tier**:
   - Add "RECOMMENDED" amber pill badge next to title
   - Update subtitle: "No limits. All modules. Unlimited."
   - Add "Photo Gallery module" and "Expense Splitter module" feature rows
   - Change CTA text from "Request Access" → "Upgrade"
4. **Bottom section** (below cards):
   - Shield icon + "Secure Payments" + "Your transaction is encrypted and secured by global payment standards."
   - "Need help choosing? Talk to an event specialist" link
   - Footer: "Privacy Policy · Terms of Service · Restore Purchases"

## Tasks

### Task 1: Update pricing.tsx to match template
**Files:** `apps/gatherly-mobile/app/pricing.tsx`
**Changes:**
- Add page headline section
- Add Gift Exchange row to free tier
- Add RECOMMENDED badge, extra modules, updated subtitle to premium tier
- Change CTA text to "Upgrade"
- Add bottom trust/footer section
- Import Shield icon from lucide-react-native

## Verification
- Visual comparison against PayWall.png template
