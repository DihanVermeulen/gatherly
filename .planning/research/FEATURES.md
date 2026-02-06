# Feature Research

**Domain:** Gift exchange wishlist and event invite system
**Researched:** 2026-02-06
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Personal wishlists per participant** | Standard in all modern gift apps (Elfster, Giftster, Drawnames). Users expect to communicate what they want. | MEDIUM | Must support multiple items per person. Needs image, description, link, price fields. Build on existing event structure. |
| **Add items from any retailer (universal wishlist)** | 2026 standard - users hate platform lock-in. Apps like Moonsift, Giftbuster prove retailer-agnostic is baseline. | LOW | Copy/paste URL, extract metadata (price, image, description). No scraping needed - just store URL + manual fields. |
| **Gift claiming/reservation system** | Core problem solved by all competitors: prevents duplicate purchases. Giftwhale explicitly markets "eliminates double gift buying". | MEDIUM | Mark item as "claimed" with buyer identity hidden. Must prevent double-claims with optimistic locking or transactions. |
| **Anonymous claiming (hide buyer identity)** | Privacy-first approach is 2026 expectation. Favory launched privacy-first platform in 2026. Users want surprise preserved. | LOW | Store claimer_id but don't reveal in API responses to list owner. Simple permission check. |
| **Event invite links (shareable URL)** | All platforms (Elfster, Drawnames, SecretSanta) use shareable links. Expected behavior for any event. | LOW | Generate unique event code/slug. Public join page. Already have event ID system. |
| **Participant status tracking (joined/pending)** | Organizers need to know who's accepted. AO3 gift exchange shows "pending/joined" as standard feature. | MEDIUM | Add `status` enum to participants table. Update on invite acceptance. Show organizer dashboard. |
| **Mobile-optimized interface** | 50%+ of usage is mobile in 2026. Poor mobile UX cited as major complaint in reviews (Giftful reviews). | HIGH | Responsive design insufficient - needs mobile-first approach. Thumb zone navigation, bottom bars, gesture support. |
| **Item images** | Visual identification is baseline. All modern wishlists (Giftster, Amazon, Giftwhale) show product images prominently. | LOW | Already support base64 images. Extend to wishlist items. 65% of apps fail photo selection - allow manual upload. |
| **Price display** | Budget awareness is critical. Users need to know if item is $20 or $200. Universal wishlist apps all show pricing. | LOW | Optional numeric field. Display with currency formatting. No currency conversion needed for MVP. |
| **Item priority levels** | Helps givers choose. Yotpo and Giftlist.com research shows 3-tier priority (must-have/nice-to-have/dream) is standard. | LOW | Simple enum: HIGH/MEDIUM/LOW or "Need/Want/Dream". Single column addition. |
| **Direct purchase links** | Friction reduction. Must click through to retailer to buy. All universal wishlist apps preserve original URLs. | LOW | Store URL field, open in new tab. No affiliate integration needed. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **iOS-style interface with 2026 patterns** | Liquid Glass visual language, Dynamic Island integration, predictive UI. Competitors stuck in 2010 (Giftful review complaint). | HIGH | Requires deep iOS design knowledge. Bottom navigation (49pt), 25x25pt icons, translucency, dark mode, Dynamic Type support. |
| **Integrated wishlist + assignment system** | Competitors separate wishlist apps from Secret Santa (Giftster vs Elfster). We unify: assign names AND see wishlists in one flow. | MEDIUM | Leverage existing assignment algorithm. Show assigned person's wishlist after reveal. Unique value prop. |
| **Real-time claim updates without spoiling surprise** | When someone claims your wishlist item, you see "claimed" but not WHO. Maintains surprise while confirming gift coverage. | MEDIUM | WebSocket or polling for live updates. Show claim status but filter claimer identity. Balance transparency + surprise. |
| **QR code event invites** | 2026 trend for physical gatherings (weddings, parties). GiftsQR and ME-QR show QR codes on invitations are standard. | LOW | Generate QR from event invite URL. Use browser API or library. Print-friendly format. |
| **Offline-first wishlist editing** | Extends existing offline localStorage pattern to wishlists. Edit wishlist on plane, sync when online. | MEDIUM | Already have hybrid storage for events. Extend pattern to wishlists. Conflict resolution needed. |
| **Contextual notifications (not spam)** | Predictive + context-aware. Only notify when actionable (assignment generated, event starting soon). Not every wishlist update. | MEDIUM | Smart notification rules. User preferences for frequency. Learn from 2026 Gmail spam crisis - less is more. |
| **Wishlist import from other platforms** | Reduce friction for switchers. Paste Amazon/Target wishlist URL, import items. | HIGH | Requires per-retailer parsing logic. Start with manual CSV import, add retailer support later. Defer to post-MVP. |
| **Group chat per event** | Coordinate logistics without leaving app. WhatsApp/Messenger integration or built-in. | HIGH | Scope creep risk. Most users already have group chats. Consider push to external chat instead. Defer. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Mandatory account for viewing wishlists** | "Security" and "user growth" | Creates massive friction. Giftwhale reviews cite this as dealbreaker. Grandma won't create account to see wishlist. | Public wishlist view with event invite link. No account required to view, only to create/claim. |
| **Notifications for every wishlist change** | "Keep everyone updated" | Notification fatigue. 2026 spam report shows 60% of emails are spam. Users will disable ALL notifications or abandon app. | Digest mode: daily summary or only critical events (assignment ready, event in 3 days). User controls frequency. |
| **Revealing who bought what before event** | "Transparency" / "coordination" | Destroys surprise element - core value of gift exchange. Even showing "John bought Mary's gift" spoils it. | Show claim status without identity. "2 of 5 items claimed" but never reveal WHO until after event date. |
| **Complex price tracking / deal alerts** | "Help people save money" | Scope creep. Becomes price comparison engine. CamelCamelCamel exists. Maintenance burden as retailer APIs change. | Static price display. Link to retailer for current price. Let user monitor deals themselves. |
| **In-app purchasing** | "Seamless experience" | Payment processing liability, PCI compliance, returns/refunds. Need merchant agreements with every retailer. Massive scope. | Direct links to retailer. One-click "buy on Amazon" button. No payment handling. |
| **AI gift suggestions** | "Trendy" / "personalized" | 2026 AI spam crisis shows users distrust AI-generated content. Suggestions often miss mark. Feels impersonal for intimate gift-giving. | Manual wishlist creation. Optional "inspiration" section with curated categories (books, tech, experiences), not AI. |
| **Social feed of all activity** | "Engagement" / "social proof" | Privacy violation. Don't broadcast "John joined Sarah's event" to everyone. Gift-giving is often private/family-only. | Activity visible only to event organizer. Participants see their own status + event details, nothing else. |
| **Blockchain / NFT receipts** | "Innovation" / "proof of gift" | Zero user demand. Complexity with no benefit. Buzzword-driven development. | Traditional confirmation: "You claimed this item on [date]". Simple audit log. |
| **Add items to multiple wishlists** | "I want this for both birthday and Christmas" | Data sync complexity. When someone claims on Christmas wishlist, should birthday show claimed? Causes confusion. | One wishlist per participant per event. If needed for multiple events, user can add same item twice. Keep wishlists event-scoped. |
| **Public wishlist profiles (Pinterest-style)** | "Build community" / "discovery" | Scope creep. Becomes social network. Gift exchanges are private groups, not public profiles. | Event-scoped wishlists only. No cross-event visibility unless explicitly shared by organizer. |

## Feature Dependencies

```
Event System (existing)
    └──requires──> Participants (existing)
                       └──enables──> Personal Wishlists (new)
                                         └──requires──> Gift Items (new)
                                                           └──enables──> Anonymous Claiming (new)

Invite Links (new)
    └──requires──> Event ID/Slug (existing)
    └──enables──> Participant Status Tracking (new)
    └──enhances──> QR Code Generation (new)

Assignment Algorithm (existing)
    └──enhances──> Wishlist Display (new)
    └──conflict──> Pre-Assignment Wishlist Viewing (must hide assignments until revealed)

Anonymous Claiming (new)
    └──requires──> User Authentication (existing)
    └──conflicts──> Public Wishlist View (only authenticated users can claim)
    └──requires──> Real-time Updates (new, for claim conflicts)

Mobile-First UI (new)
    └──replaces──> Current Desktop UI (existing)
    └──requires──> Responsive Components (partial existing)
    └──enables──> Gesture Navigation (new)
    └──enables──> Bottom Navigation (new)
```

### Dependency Notes

- **Personal Wishlists require Participants:** Each wishlist belongs to a participant in an event. Event-scoped model prevents cross-event data leaks.
- **Anonymous Claiming requires Authentication:** Must know WHO is claiming to enforce "one claim per item" and hide identity from list owner.
- **Assignment Algorithm conflicts with Wishlist Viewing:** If Alice is assigned to Bob, she shouldn't see her own assignment on Bob's wishlist (spoiler). Must hide assignment-related UI elements until codes are deciphered.
- **Invite Links enable Status Tracking:** When someone clicks invite link and joins, their status changes from "pending" to "joined". Link is the trigger.
- **Mobile-First UI replaces Desktop UI:** Not additive - requires re-architecture of existing components. Header, navigation, forms all need mobile-first redesign.
- **Real-time Updates needed for Claiming:** Without websockets/polling, two people could claim same item (race condition). Optimistic locking or live updates prevent conflicts.

## MVP Definition (v2.0)

### Launch With (v2.0 Release)

Minimum viable feature set for this milestone.

- [x] **Personal wishlists per participant** - Core value prop: know what people want
- [x] **Add items with image, description, link, price** - Table stakes for any wishlist
- [x] **Item priority levels (3 tiers)** - Helps givers choose between items
- [x] **Anonymous gift claiming** - Prevents duplicates while preserving surprise
- [x] **Event invite links** - Simple shareable URL for joining events
- [x] **Participant status tracking** - Organizer sees who's joined vs pending
- [x] **Mobile-first UI redesign** - iOS-style bottom navigation, thumb-friendly
- [x] **Dark mode for new components** - Consistency with existing v1.0 dark mode
- [x] **Real-time claim updates** - Prevent race conditions on popular items
- [x] **Direct retailer links** - One-click to purchase on original site

### Add After Validation (v2.1 - v2.3)

Features to add once core is working and user feedback collected.

- [ ] **QR code event invites** - Nice-to-have for physical gatherings, not critical for online flow (trigger: users request print-friendly invites)
- [ ] **Email invite option** - Complement link sharing with direct email (trigger: users complain about sharing friction)
- [ ] **Wishlist item comments** - "Size medium" or "Blue preferred" notes (trigger: users ask how to add item details)
- [ ] **Organizer dashboard** - Aggregate view of event status, claims, participation (trigger: organizers report coordination difficulty)
- [ ] **Notification preferences** - User controls frequency and channels (trigger: complaints about too many/few notifications)
- [ ] **Wishlist item sorting/filtering** - By price, priority, claimed status (trigger: wishlists exceed 10+ items)
- [ ] **Bulk wishlist operations** - Delete multiple, change priority in batch (trigger: users with 20+ item lists)

### Future Consideration (v3.0+)

Features to defer until product-market fit is established.

- [ ] **Wishlist import from retailers** - Complex parsing logic, defer until clear ROI (why defer: high complexity, unclear user demand)
- [ ] **Group chat integration** - Users already have WhatsApp/Messenger (why defer: scope creep, low differentiation)
- [ ] **AI gift suggestions** - User distrust of AI in 2026, feels impersonal (why defer: low value, implementation cost)
- [ ] **Price tracking/alerts** - Becomes price comparison engine (why defer: maintenance burden, scope creep)
- [ ] **Multi-event wishlists** - Sync complexity outweighs benefit (why defer: confusing UX, data model complexity)
- [ ] **Public wishlist profiles** - Shifts from private groups to social network (why defer: core product is private events, not social discovery)
- [ ] **Cross-platform wishlist sharing** - Export to Amazon, Giftster, etc. (why defer: requires reverse-engineering competitor APIs, unclear demand)

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Personal wishlists | HIGH | MEDIUM | P1 |
| Anonymous claiming | HIGH | MEDIUM | P1 |
| Event invite links | HIGH | LOW | P1 |
| Participant status | HIGH | MEDIUM | P1 |
| Mobile-first UI | HIGH | HIGH | P1 |
| Item priority levels | HIGH | LOW | P1 |
| Real-time claim updates | HIGH | MEDIUM | P1 |
| Retailer links | HIGH | LOW | P1 |
| Item images | HIGH | LOW | P1 |
| Price display | MEDIUM | LOW | P1 |
| QR code invites | MEDIUM | LOW | P2 |
| Email invites | MEDIUM | MEDIUM | P2 |
| Item comments | MEDIUM | LOW | P2 |
| Organizer dashboard | MEDIUM | MEDIUM | P2 |
| Notification prefs | MEDIUM | MEDIUM | P2 |
| Item sorting/filtering | MEDIUM | LOW | P2 |
| Bulk operations | LOW | MEDIUM | P2 |
| Wishlist import | MEDIUM | HIGH | P3 |
| Group chat | LOW | HIGH | P3 |
| AI suggestions | LOW | HIGH | P3 |
| Price tracking | LOW | HIGH | P3 |
| Multi-event lists | LOW | HIGH | P3 |
| Public profiles | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for v2.0 launch - core value proposition
- P2: Should have, add in v2.1-v2.3 based on feedback
- P3: Nice to have, defer to v3.0+ or never

## Competitor Feature Analysis

| Feature | Elfster | Giftster | Giftwhale | Drawnames | Our Approach (gatherly v2.0) |
|---------|---------|----------|-----------|-----------|------------------------------|
| **Wishlists** | Yes, per event | Yes, per person | Yes, universal | Yes, per event | Per participant per event (event-scoped) |
| **Retailer-agnostic** | Yes | Yes | Yes | Yes | Yes - any URL + manual entry |
| **Anonymous claiming** | Yes | Yes ("mark purchased") | Yes | Yes | Yes - hide claimer identity from list owner |
| **Secret Santa** | Yes | Yes (separate flow) | Yes (separate flow) | Yes | UNIFIED - assignments + wishlists in one system |
| **Invite method** | Email, text, link | Email, text | Link | Email, WhatsApp | Link + QR code (email in v2.1) |
| **Status tracking** | Basic | Basic | Unknown | Basic | Explicit joined/pending with organizer view |
| **Mobile UX** | "Poor" (reviews) | Basic | Good | Basic | iOS-style 2026 patterns (differentiator) |
| **Price tracking** | No | No | No | No | No - anti-feature (scope creep) |
| **Real-time updates** | No | No | Yes (marketed) | Unknown | Yes - prevent claim conflicts |
| **Offline support** | No | No | No | No | Yes - extends existing localStorage pattern |
| **Assignment + wishlist integration** | Separate | Separate | Separate | Separate | INTEGRATED - see assignee's wishlist after reveal (differentiator) |

**Key differentiation:**
1. **Unified assignment + wishlist:** Competitors separate Secret Santa generators from wishlist apps. We combine: generate assignments, decipher codes, immediately see your assignee's wishlist. Single flow.
2. **Modern iOS-first mobile UX:** Reviews consistently cite competitors' poor mobile experience. We build mobile-first from ground up with 2026 iOS patterns.
3. **Offline-first architecture:** Existing localStorage fallback extends to wishlists. Edit on plane, sync when connected. Unique resilience.

## Sources

### Gift Exchange Platforms (2026)
- [Elfster: Secret Santa Website & Gift Exchange App](https://www.elfster.com/)
- [Giftster Group Wish List Maker](https://www.giftster.com)
- [Giftwhale: Easiest Way to Create & Share Wish Lists](https://giftwhale.com)
- [Drawnames: Wish Lists, Secret Santa, Gift Finder](https://www.drawnames.com/)

### Wishlist Privacy & Claiming
- [Favory Launches Privacy-First Wishlist Platform](https://www.openpr.com/news/4189488/favory-launches-privacy-first-wishlist-platform-with)
- [Are Amazon Wishlists Anonymous? - YouPay](https://youpay.co/uncategorized/are-amazon-wishlists-anonymous-real-risks-and-safer-alternatives/)
- [Giftster Privacy Policy](https://www.giftster.com/privacy/)

### Event Invites & QR Codes
- [QR Codes for Wedding Invitations 2026 - TLinky](https://tlinky.com/qr-codes-for-wedding-invitations/)
- [QR Codes for Gift Registries - QR Code Generator](https://www.qr-code-generator.com/blog/qr-codes-for-gift-registries/)
- [GiftsQR: Online surprise, Christmas, Birthday](https://giftsqr.com/en/love)

### Wishlist Best Practices
- [ECommerce Wishlist Best Practices - Yotpo](https://www.yotpo.com/ecommerce-product-page-guide/wishlists/)
- [Best Practices for Managing Wishlists Over Time - GiftList](https://giftlist.com/blog/best-practices-for-managing-wishlists-over-time)
- [Wishlist Templates for 2026 - ClickUp](https://clickup.com/blog/wishlist-templates/)

### Universal Wishlist Apps (Retailer-Agnostic)
- [Best Wishlist Apps and Tools (2026 Guide) - Moonsift](https://www.moonsift.com/guides/best-shopping-wishlist-app)
- [Universal Wishlist vs. Store Wishlists - GiftList](https://giftlist.com/blog/universal-wishlist-vs-store-wishlists-which-one-is-better)
- [Top Universal Wishlist Apps 2025 - Geekflare](https://geekflare.com/universal-wishlist-apps/)

### Duplicate Prevention
- [Secret Santa FAQ - Secret Santa Organizer](https://www.secretsantaorganizer.com/en/faq)
- [Secret Santa Gift Exchange Rules - Giftster](https://www.giftster.com/news/secret-santa-gift-exchange-rules/)

### Participant Status Tracking
- [Gift Exchange FAQ - Archive of Our Own](https://archiveofourown.org/faq/gift-exchange?language_id=en)
- [Gift Exchange Details - Gathering 4 Gardner](https://www.gathering4gardner.org/gift-exchange-details/)

### Mobile UX Patterns (2026 iOS)
- [9 Mobile App Design Trends for 2026 - UX Pilot](https://uxpilot.ai/blogs/mobile-app-design-trends)
- [7 Mobile UX/UI Design Patterns Dominating 2026 - Sanjay Dey](https://www.sanjaydey.com/mobile-ux-ui-design-patterns-2026-data-backed/)
- [Essential iOS App UI/UX Guidelines for 2026 - EITBIZ](https://www.eitbiz.com/blog/ios-app-ui-ux-design-guidelines-you-should-follow/)
- [iOS App Design in 2026 - Digicorns](https://digicorns.com/ios-ui-ux-guidelines/)

### Anti-Features & Common Mistakes
- [How to Choose the Right Wish List App in 2026 - Giftwhale](https://giftwhale.com/blog/how-to-choose-the-right-wish-list-app)
- [10 Best Universal Wishlist Apps 2025 - GiftList](https://giftlist.com/blog/10-best-universal-wishlist-apps-in-2025-ranked-and-reviewed)
- [Giftful Review 2025 - Listful](https://www.listful.com/blog/giftful-review-2025)

### Notification Issues (2026)
- [Gmail Spam Filter Broken: January 2026 Outage - Remio](https://www.remio.ai/post/gmail-spam-filter-broken-the-january-2026-outage-explained)
- [2026 Spam Report: Trust Erosion in Email - InfluencersWiki](https://influencerswiki.org/blog/the-2026-spam-report-trust-erosion-in-email-and-social-media-amidst-ai-challenges/)
- [Opting Out of Gift Purchased Alerts - MyRegistry](https://customercare.myregistry.com/en/support/solutions/articles/48000787674-i-do-not-want-to-know-which-of-my-gifts-were-purchased-what-can-i-do-)

---
*Feature research for: gatherly gift exchange app v2.0*
*Researched: 2026-02-06*
*Confidence: HIGH - verified with current 2026 platforms and UX research*
