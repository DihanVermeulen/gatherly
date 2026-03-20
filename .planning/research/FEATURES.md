# Feature Landscape — Gatherly v2.2 (Potluck Module + Welcoming Flow)

**Domain:** Group event coordination — potluck food signup and first-run mobile onboarding
**Researched:** 2026-03-17
**Confidence:** HIGH (screen templates drive specifics; potluck patterns verified against SignUpGenius/PerfectPotluck/withlome; onboarding patterns verified against NNGroup, Appcues, VWO research)

---

## Context: What Already Exists

Before categorizing features, the existing system constrains and enables specific choices.

**Already built (do not re-implement):**
- `event_modules` table with `potluck` as a recognized module type and `config JSONB` column
- `plan_tier` on events — potluck is a premium module, gated behind `plan_tier != 'free'`
- Module toggle UI (`modules-config.tsx`) — potluck appears in list, upgrade modal exists
- JWT auth with `userId` (organizer) and `participantId` (magic-link participant) — both roles exist
- Users table with `name`, `bio`, `gift_preferences` — profile data model is present

**Already scaffolded in screen templates (defines scope):**
- `Welcoming/Getting-Started.png` — 3-dot paginated splash, "Welcome to Gatherly" / value prop
- `Welcoming/Preferences.png` — interest chip selection, "select 3 or more", search bar, "Skip" link, step 2 of 2 progress
- `Welcoming/Profile-Setup.png` — "Step 1 of 3" with avatar, name, bio, gift preferences fields
- `Potluck/Potluck-Setup.png` — organizer: category cards with quantity stepper + food image + suggestion chips + "Add New Category" + "Save and Publish"
- `Potluck/Potluck-List.png` — participant: grouped by category, item name + subtitle, claimed (avatar) vs unclaimed (Signup button), event readiness progress bar
- `Potluck/Potluck-Signup.png` — confirmation sheet: full food image, item name, event name, optional note field, Confirm/Cancel

---

## Part 1: Potluck Module

### Table Stakes — Potluck

Features the potluck coordination flow cannot work without. Missing any of these makes the feature non-functional.

| Feature | Why Required | Complexity | Existing Hook |
|---------|--------------|------------|---------------|
| **Category management (organizer)** | Organizer must define what food types are needed. Without categories, participants have no structure to sign up against. Industry standard: SignUpGenius and PerfectPotluck both require organizer-defined slots before participant signup can occur. | MEDIUM | `event_modules.config` JSONB can store category array; needs API endpoint |
| **Quantity needed per category** | Core duplicate-prevention mechanism. Potluck without quantity = no way to know if "Mains" is covered. Screen template shows stepper (−/+) per category. SignUpGenius calls these "slots". | LOW | Part of category config stored in JSONB |
| **Category food images** | Visual anchor helping participants identify what type of dish is wanted. Template shows per-category image (AI-generated food photo). Critical for the Setup screen. | MEDIUM | No image upload for modules yet; need new storage path |
| **Suggestion chips per category** | Organizer-facing UI only — helps them populate suggestions ("Lasagna, Tacos, Roast Chicken"). Template shows these as chips below category name. Not stored as claims — informational only. | LOW | Config JSONB per category |
| **Publish/unpublish control** | Organizer must explicitly publish the potluck list before participants can see it. Prevents premature visibility. Template has "Save and Publish" CTA. | LOW | `event_modules.status` field already exists ('draft' → 'active') |
| **Claimed vs unclaimed status per item** | The core participant-facing state. Template shows avatar for claimed, "Signup" button for unclaimed. Without this, there's no coordination value. | MEDIUM | Needs `module_potluck_signups` table |
| **Signup confirmation flow** | Single tap to "Signup" → full-screen confirmation sheet with food image, item name, event, optional note, Confirm/Cancel. Prevents accidental claims. Template: `Potluck-Signup.png`. | LOW | UI only; writes to signups table |
| **Un-signup (withdraw claim)** | Participants must be able to change their mind. Without this, a mistaken claim permanently blocks the slot. Industry standard. | LOW | DELETE on signup row |
| **Event readiness progress bar** | Organizer + participant view showing "13/20 Items Claimed, 65% Complete, 7 items still needed". Template shows this prominently at top of list. Motivates participation. | LOW | Computed from signups vs total quantity |
| **Grouped list view by category** | Participant list groups items under category headers (Appetizers / Main Course / Drinks). Without grouping, the list is unscannably flat. Template is explicit about this structure. | LOW | Client-side grouping of signup data |
| **Optional note on signup** | Participant can add context ("Homemade, contains dairy, gluten-free"). Template shows this in confirmation screen. Prevents allergen surprises at the event. | LOW | `note TEXT` column on signups table |

### Differentiators — Potluck

Features that make Gatherly's potluck better than a generic signup sheet. Not required to function, but create meaningful advantage.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Food images on signup confirmation** | The `Potluck-Signup.png` template shows a hero food image during confirmation — creates emotional context ("I'm bringing THIS"). Generic signup sheets (SignUpGenius) are text-only. | MEDIUM | Requires passing category image URL to signup screen |
| **Real-time claim updates** | When participant A claims an item, participant B sees it immediately without refresh. Prevents race conditions and the frustration of arriving to find someone else already brought what you committed to. | MEDIUM | Polling or WebSocket; same pattern as wishlist claiming already in place |
| **Integration with event system** | Potluck is embedded inside the existing event flow — participants are already in the event via magic-link invite. No second signup required. SignUpGenius requires a separate URL and no auth context. | LOW | Already designed — leverages `participant_id` from JWT |
| **Organizer preview mode** | "Preview" button in top-right of `Potluck-Setup.png`. Organizer can see participant view before publishing. Prevents publishing a misconfigured list. | LOW | Toggle state in UI; same data, different render mode |
| **Category-level coverage indicator** | Per-category: show how many of the quantity needed are filled (e.g., "2 of 4 claimed"). Template shows this at the list level; per-category is an enhancement. | LOW | Count query per category |

### Anti-Features — Potluck

Features to explicitly not build in v2.2.

| Anti-Feature | Why Requested | Why to Avoid | Alternative |
|--------------|---------------|--------------|-------------|
| **Dietary restriction profiles / allergy tracking** | "Safety" / "inclusivity" — users want to know if something is gluten-free before the event. | Becomes a food allergy database with liability implications. Requires verification. Scope is enormous. The optional note field covers the actual need. | The "optional note" on signup handles "contains dairy, gluten-free" without building a formal dietary system. |
| **Item-level comments / discussion thread** | "Let participants coordinate" | Chat feature inside a signup list creates noise and an unread-message burden. Participants already have group chats. | Optional note on signup is sufficient. Organizer contact via existing event flow. |
| **Automatic balancing / AI assignment** | "Assign who brings what automatically" | Potluck is explicitly opt-in and choice-based. Automatic assignment removes agency and creates resentment ("I didn't want to bring drinks"). The coordination value IS the choice. | Let participants self-select. Readiness bar motivates participation organically. |
| **Budget/cost tracking per item** | "Know what people spent" | Potluck contributions are in-kind (food), not monetary. Cost tracking for food is awkward and creates social tension. | If cost tracking is needed, that's the Expense Splitter module (already listed in module config, separate feature). |
| **Item-level quantity splitting** | "I'll bring half the drinks" | Fractional signups add data complexity with very little practical value. If two people both bring drinks, two items exist. | Create two items in the same category ("Drinks x2") during setup. Quantity stepper already handles multiple slots. |
| **Public potluck list (no event login)** | "Share with people not on the app" | Potluck is a module inside an event. People not in the event don't need to see it. Opens event data to unauthenticated access. | The invite link flow already handles bringing people into the event. Potluck visibility is scoped to event participants. |
| **Recurring/template potluck setups** | "We do this every month" | Template management adds significant persistence complexity. v2.2 scope is establishing the feature, not optimizing for power users. | Copy-event feature (if it exists) or manual re-entry. Defer templates to v3. |

### Feature Dependencies — Potluck

```
event_modules (existing, Phase 25)
    └──type 'potluck' recognized──> Module toggle already works
    └──status 'draft'/'active'──> Publish/unpublish is free
    └──config JSONB──> Category definitions stored here

New table: module_potluck_categories
    └──belongs to──> event_modules row (potluck type)
    └──has──> name, quantity_needed, image_url, suggestions[], sort_order

New table: module_potluck_signups
    └──belongs to──> module_potluck_categories row
    └──belongs to──> participants row (via participant_id)
    └──has──> note, claimed_at

Participant JWT (existing, Phase 27)
    └──participantId claim──> authorizes signup without organizer role

Organizer JWT (existing)
    └──userId claim + requireOrganizer──> authorizes category setup and publish

Event readiness
    └──computed──> SUM(signups) / SUM(quantity_needed) across all categories
```

---

## Part 2: Welcoming Flow (Onboarding)

### Table Stakes — Welcoming Flow

Features without which the onboarding feels broken or unprofessional.

| Feature | Why Required | Complexity | Existing Hook |
|---------|--------------|------------|---------------|
| **3-slide paginated splash screen** | `Getting-Started.png` template defines this. Standard first-run pattern: orienting value proposition before asking anything of the user. NNGroup confirms splash/onboarding screens set retention expectations. Three slides is the industry sweet spot — fewer feels rushed, more loses users (62% abandonment at 4+ screens per Appcues research). | MEDIUM | No existing onboarding flow; new screen(s) under `app/welcome/` |
| **Dot pagination indicator** | Template shows 3 dots at bottom of splash. Users need to know they are on slide 1 of 3 and can swipe forward. Without this, multi-slide feels like a dead end. | LOW | UI only — animated dot row |
| **Skip / "Already have an account" CTA** | Template shows "Already have an account? Log In" below "Get Started". Returning users must not be forced through new-user flow. Friction for existing users is a critical abandonment cause. | LOW | Routes to existing `sign-in.tsx` |
| **Interest/preference chip selection** | `Preferences.png` template: "What are you into?" with 13 categories shown as chips. User selects 3+. Required for the personalization value prop — without this screen, "Personalize Your Feed" label is a lie. | MEDIUM | No preferences data model yet; needs `user_preferences` or column on `users` |
| **Minimum selection enforcement (3+)** | Template says "Select 1 more to continue" at bottom — button disabled until threshold met. NNGroup: gating progression behind minimum completion increases profile quality. Without enforcement, users skip and data is useless. | LOW | Client-side count gate; CTA disabled until count >= 3 |
| **Skip option on preferences** | Template shows "Skip" in top-right corner. Some users reasonably refuse to categorize themselves. Forcing selection causes abandonment. Selected interests should be optional for app function. | LOW | Router push to next step; store empty preferences |
| **Step progress indicator** | `Profile-Setup.png` shows "Step 1 of 3" header and linear progress bar. Multi-step flows without progress indicators feel bottomless. Users abandon unknown-length processes at 3x the rate of progress-shown flows (Appcues 2025 data). | LOW | Progress bar component, step counter state |
| **Profile setup form: name, bio, gift preferences** | `Profile-Setup.png` defines the fields. Name is required for event participation. Bio and gift preferences feed the existing `users` table columns (`bio`, `gift_preferences` added in Phase 22). | MEDIUM | `usersApi.updateMe()` already exists; fields already in DB |
| **Avatar upload** | Template shows avatar circle with camera badge overlay. Users need visual identity for event participation. Without avatar, the participant list and potluck claimed-by indicators show generic placeholders. | MEDIUM | Base64 image pattern already used for wishlists; extend to user profile |
| **"Skip for now" on profile form** | Template shows "Skip for now" below "Next" CTA. Not all fields should block progression. Name may be pre-filled from registration. Bio and gift preferences are optional. | LOW | Sets partial data, continues flow |
| **Onboarding shown once on first login only** | The flow must not re-show after completion. A returning user should never see the splash. | LOW | Boolean flag in `AsyncStorage` or user record; check on `_layout.tsx` mount |

### Differentiators — Welcoming Flow

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Interest chips inform event discovery** | The `Preferences.png` title is "Personalize Your Feed" — selected interests should surface relevant event types or suggested modules. Connects onboarding data to actual app behavior rather than collecting data that goes nowhere. | MEDIUM | Requires feed/discovery logic that may not exist yet; may be v2.3 work |
| **Search bar within interest chips** | Template shows a search field above the chip list ("Search interests..."). With 13+ categories visible, search prevents scroll fatigue for users who know what they want. | LOW | Filter array client-side; no API needed |
| **Animated slide transitions** | Horizontal swipe between splash slides with momentum. Standard React Native pattern (FlatList with pagingEnabled or react-native-pager-view). Makes the first impression feel polished. | LOW | react-native-pager-view or FlatList pagingEnabled |
| **Avatar from device camera or gallery** | Two options: "Take photo" and "Choose from library" via ImagePicker. Better than upload-only. | LOW | `expo-image-picker` — already a likely dependency in Expo stack |

### Anti-Features — Welcoming Flow

| Anti-Feature | Why Requested | Why to Avoid | Alternative |
|--------------|---------------|--------------|-------------|
| **Mandatory account creation before onboarding** | "We need users in the DB" | Magic-link participants join events without accounts. Blocking them at splash would break the invite flow. Onboarding is for registered users only — post-registration. | Show onboarding after `register.tsx` succeeds, not as a gate before sign-in. |
| **More than 3 onboarding slides** | "Cover all features" | Completion rate drops sharply after 3 slides. The Getting-Started template defines 3 — trust the design. Feature discovery belongs in contextual tooltips, not onboarding. | Use contextual first-use hints when a user first encounters Polls, Potluck, etc. |
| **Forced interest selection (no skip)** | "Better personalization data" | Forcing categorization of self before seeing the app causes 40%+ abandonment (industry average). Skip must exist. Data collected under duress is low quality anyway. | Make interests optional; prompt to complete profile via a non-blocking banner later. |
| **Email verification gate during onboarding** | "Security" | Registration already handles email. Adding another verification step in the onboarding flow adds 2-3 minutes of friction before the user sees any value. | Email verification belongs at registration, not in the welcome flow. |
| **Social import (import contacts, sync friends)** | "Grow the network" | Permission dialogs for contacts mid-onboarding create distrust. Users have not yet established why they should trust the app with their address book. | Invite flow at event creation is the appropriate moment for contact sharing — after value is established. |
| **Permissions prompts (push notifications, location) during splash** | "Capture permissions early" | iOS shows permission dialogs when app requests them. Requesting during first-run, before value is demonstrated, results in ~80% denial (Apple permission best practice research). | Request notification permission contextually — e.g., when organizer creates first event ("Get notified when participants join?"). |

### Feature Dependencies — Welcoming Flow

```
Registration (existing, register.tsx)
    └──on success──> trigger welcoming flow (new)
                          └──Step: Splash (Getting-Started, 3 slides)
                          └──Step: Preferences (interest selection, skippable)
                                    └──writes to──> user_preferences[] or users.interests JSONB
                          └──Step: Profile Setup (name, bio, gift_preferences, avatar)
                                    └──writes via──> usersApi.updateMe() (existing)
                                    └──avatar stores as──> base64 in users table (extend existing pattern)
                          └──on complete/skip──> set AsyncStorage flag 'onboarding_complete'
                          └──route to──> (tabs)/index (home)

_layout.tsx (existing)
    └──on mount, authenticated user──> check AsyncStorage 'onboarding_complete'
    └──if missing──> redirect to welcome flow
    └──if present──> normal app navigation

Magic-link participants (existing, magic-link/[token].tsx)
    └──do NOT show welcoming flow──> participants join via invite, not registration
    └──onboarding is for registered organizer accounts only
```

---

## MVP Definition for v2.2

### Potluck Module — Build Now

| Feature | Priority |
|---------|----------|
| Category setup screen (organizer) with name, quantity stepper, image, suggestions | P1 |
| Save and Publish (sets module status active) | P1 |
| Potluck List screen (participant) grouped by category, claimed/unclaimed | P1 |
| Signup confirmation sheet with image, note, Confirm/Cancel | P1 |
| Un-signup (withdraw claim) | P1 |
| Event readiness progress bar | P1 |
| Organizer preview mode | P2 |
| Real-time claim updates (polling) | P2 |
| Per-category coverage indicators | P2 |

### Welcoming Flow — Build Now

| Feature | Priority |
|---------|----------|
| 3-slide splash with dot pagination and "Get Started" CTA | P1 |
| Preference chip selection (13 categories, min 3, skippable) | P1 |
| Profile setup (name, bio, gift_preferences, avatar, "Skip for now") | P1 |
| Step progress indicator | P1 |
| Onboarding-shown-once guard via AsyncStorage | P1 |
| Search bar in chip selection | P2 |
| Animated slide transitions | P2 |
| Interest data feeding event discovery | P3 (future milestone) |

---

## Sources

- [SignUpGenius Potluck Sign Up Sheets](https://www.signupgenius.com/how-to-use/potluck) — category/slot/quantity model, real-time updates, duplicate prevention
- [Perfect Potluck](https://perfectpotluck.com/) — category grouping, organizer-first flow
- [Potluck.us Features](https://www.potluck.us/features) — all-in-one party planning, flexible sign-up sheets
- [withlome Potluck Planner](https://www.withlome.com/potluck-planner) — mobile-oriented potluck coordination
- [7 Mobile Onboarding Best Practices 2025 — NextNative](https://nextnative.dev/blog/mobile-onboarding-best-practices) — skip functionality, minimum friction
- [Mobile App Onboarding Guide 2026 — VWO](https://vwo.com/blog/mobile-app-onboarding-guide/) — personalization timing, value-first approach
- [Mobile App Onboarding — Adapty](https://adapty.io/blog/mobile-app-onboarding/) — interest selection patterns, completion rates
- [Mobile-App Onboarding Analysis — NNGroup](https://www.nngroup.com/articles/mobile-app-onboarding/) — components and techniques, authoritative baseline
- [Mobile Onboarding Best Practices — Appcues](https://www.appcues.com/blog/mobile-onboarding-best-practices) — retention impact, skip rates, permission timing
- [20+ Best Sign Up Sheet Tools 2025 — Grasshopper Signup](https://blog.grasshoppersignup.com/post/best-sign-up-sheet-tools-2025-complete-comparison-guide) — competitive landscape for signup sheet tools
- Screen templates: `apps/gatherly-mobile/screen-templates/Potluck/` and `apps/gatherly-mobile/screen-templates/Welcoming/` — authoritative design spec for this milestone
- Existing code: `apps/gatherly-mobile/app/modules-config.tsx`, `apps/api/src/db/migrations/011-phase25-modules-polls-rsvp.sql` — verified what's already built

---

*Feature research for: Gatherly v2.2 — Potluck Module + Welcoming Flow*
*Researched: 2026-03-17*
*Confidence: HIGH — screen templates are authoritative design specs; patterns verified against current potluck apps and onboarding research; existing code audited directly*
