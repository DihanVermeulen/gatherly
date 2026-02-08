# SECRET SANTA APP

## Complete Design System & Style Guide

_Building Modern Collaborative Financial Apps_

**Version 1.0 • January 2026**

---

## 1. Design Philosophy

This design system powers collaborative financial applications where groups coordinate expenses, budgets, gifts, and events. The style emphasizes clarity, trust, and optimism through a clean, modern aesthetic centered on a vibrant green color (#00D26A).

### Core Principles

- **Clarity First:** Financial information must be immediately understandable with clear hierarchy, generous whitespace, and strong visual contrast.

- **Collaborative by Nature:** Design for groups. Show participant avatars, shared budgets, and group activities prominently.

- **Optimistic & Approachable:** Use vibrant green to convey growth, positivity, and action. Avoid sterile banking aesthetics.

- **Mobile-First:** Design for mobile screens first. All interactive elements must meet 44×44px minimum touch targets.

- **Card-Based Layout:** Present information through cards with rounded corners, subtle shadows, and clear visual hierarchies.

---

## 2. Color System

The color palette is intentionally limited to maintain clarity and consistency. Every color serves a specific purpose.

### Primary Colors

| Color             | Value                        | Usage                                                                                 |
| ----------------- | ---------------------------- | ------------------------------------------------------------------------------------- |
| **Primary Green** | #00D26A • RGB(0, 210, 106)   | Primary CTAs, active states, success indicators, key highlights, confirmation buttons |
| **Light Green**   | #E8FFF4 • RGB(232, 255, 244) | Subtle backgrounds, hover states, success message backgrounds                         |

### Neutral Colors

| Color           | Value                        | Usage                                                 |
| --------------- | ---------------------------- | ----------------------------------------------------- |
| **Dark Gray**   | #1A1A1A • RGB(26, 26, 26)    | Primary text, headings, high-emphasis content         |
| **Medium Gray** | #666666 • RGB(102, 102, 102) | Secondary text, labels, descriptions, timestamps      |
| **Light Gray**  | #F5F5F5 • RGB(245, 245, 245) | Card backgrounds, container fills, subtle separations |
| **Border Gray** | #E0E0E0 • RGB(224, 224, 224) | Borders, dividers, input outlines, separators         |

### Accent Colors

Use sparingly for specific interactions.

| Color            | Value                        | Usage                                                 |
| ---------------- | ---------------------------- | ----------------------------------------------------- |
| **Blue Accent**  | #4A90E2 • RGB(74, 144, 226)  | Information indicators, hyperlinks, info badges       |
| **Coral Accent** | #FF6B6B • RGB(255, 107, 107) | Edit actions, warnings, error states (use cautiously) |

### Color Usage Rules

**DO**

- Use Primary Green for all primary actions and confirmation buttons
- Maintain 60-70% white space with green as accents
- Ensure text meets WCAG AA contrast (4.5:1 minimum for body, 3:1 for large text)

**DON'T**

- Never use Primary Green for body text or long-form content
- Avoid using multiple accent colors in the same view
- Never create gradients with brand colors

---

## 3. Typography

Typography establishes hierarchy and guides users through the interface. This system uses clean, universally-supported system fonts.

### Font Stack

```
-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
```

- **iOS/macOS:** SF Pro (system font)
- **Android:** Roboto
- **Windows:** Segoe UI
- **Fallback:** Arial

### Type Scale

| Element             | Size | Weight         | Line Height |
| ------------------- | ---- | -------------- | ----------- |
| H1 - Screen Title   | 28px | 700 (Bold)     | 1.2 (34px)  |
| H2 - Section Header | 22px | 600 (Semibold) | 1.3 (29px)  |
| H3 - Card Title     | 18px | 600 (Semibold) | 1.4 (25px)  |
| Body Large          | 16px | 400 (Regular)  | 1.5 (24px)  |
| Body Regular        | 14px | 400 (Regular)  | 1.5 (21px)  |
| Caption / Label     | 12px | 500 (Medium)   | 1.3 (16px)  |
| Button Text         | 16px | 600 (Semibold) | Inherit     |

### Typography Best Practices

- **Minimum body text:** 14px (never smaller)
- **Line height:** 1.5× minimum for body text readability
- **Letter spacing:** Keep at default (0) for body. Use -0.3px to -0.5px only for large headings
- **Alignment:** Left-align body text. Center-align titles only
- **Case:** Use sentence case. Avoid ALL CAPS except for small labels (≤12px)
- **Mobile scaling:** Reduce heading sizes by 15-20%. Body text stays at 14px minimum

---

## 4. Layout & Spacing

Consistent spacing creates visual rhythm and helps users scan efficiently.

### Spacing System (4px Base Unit)

| Token | Size | Usage                               |
| ----- | ---- | ----------------------------------- |
| xs    | 4px  | Icon padding, tight spacing         |
| sm    | 8px  | Small gaps between related elements |
| md    | 12px | List item spacing, moderate gaps    |
| lg    | 16px | Container padding, card padding     |
| xl    | 20px | Screen padding (mobile)             |
| 2xl   | 24px | Section spacing                     |
| 3xl   | 32px | Large section breaks                |

### Border Radius & Elevation

#### Border Radius

- **Small (4px):** Input fields, small buttons
- **Medium (8px):** Cards, standard buttons, containers
- **Large (12px):** Modals, large cards
- **Extra Large (16px):** Feature cards, hero images
- **Round (50%):** Avatars, icon buttons, pills

#### Shadows (Elevation)

- **Level 1 (Subtle):** `0 1px 3px rgba(0,0,0,0.08)` — Cards, inputs
- **Level 2 (Medium):** `0 4px 12px rgba(0,0,0,0.1)` — Elevated cards, dropdowns
- **Level 3 (High):** `0 8px 24px rgba(0,0,0,0.12)` — Modals, popovers
- **Level 4 (Highest):** `0 16px 48px rgba(0,0,0,0.15)` — Dialogs, overlays

---

## 5. Component Library

### Primary Button

- **Background:** #00D26A
- **Text:** #FFFFFF (16px, 600 weight)
- **Padding:** 12px × 24px
- **Border Radius:** 8px
- **Min Height:** 48px
- **Hover:** #00BA5E
- **Active:** #00A850
- **Disabled:** #E0E0E0

### Input Fields

- **Background:** #FFFFFF
- **Border:** 1px solid #E0E0E0
- **Radius:** 8px
- **Padding:** 12px × 16px
- **Min Height:** 48px
- **Text:** 14px #1A1A1A
- **Focus:** Border #00D26A, Shadow: `0 0 0 3px rgba(0,210,106,0.1)`

### Cards

- **Background:** #FFFFFF
- **Border Radius:** 12px
- **Padding:** 16px
- **Shadow:** Level 1
- **Hover:** Level 2 + translateY(-2px)

### Avatars

- **Sizes:** 32px (small), 40px (medium), 56px (large), 80px (XL)
- **Border Radius:** 50%
- **Border:** 2px solid #FFFFFF (when overlapping)

### Status Badges

- **Padding:** 4px × 12px
- **Border Radius:** 999px
- **Text:** 12px 500 weight
- **Success:** Bg #E8FFF4, Text #00D26A
- **Warning:** Bg #FFF4E6, Text #FFA726

---

## 6. Implementation Guidelines

### Mobile-First Approach

- Design for 375px width first (iPhone SE), then scale up
- All touch targets: 44×44px minimum
- Screen padding: 16px horizontal minimum
- Bottom navigation: 64px height with safe area support

### Responsive Breakpoints

| Breakpoint | Width      | Device   |
| ---------- | ---------- | -------- |
| Mobile     | 0-767px    | Phones   |
| Tablet     | 768-1023px | Tablets  |
| Desktop    | 1024px+    | Desktops |

### Accessibility Requirements

- **WCAG AA compliance:** 4.5:1 contrast for body text, 3:1 for large text
- **Focus indicators:** 2px solid #00D26A outline with 2px offset
- **Screen reader support:** Proper ARIA labels on all interactive elements
- **Keyboard navigation:** Full support with logical tab order

### Animation & Transitions

- **Fast (150ms):** Hover states, icon changes
- **Normal (250ms):** Default transitions, fades
- **Slow (350ms):** Modals, page transitions
- **Easing:** `cubic-bezier(0.25, 0.46, 0.45, 0.94)` for most transitions

---

## 7. Common Use Cases

### Event Management Screen

- Screen title (28px bold) at top with 16px padding
- Event cards in vertical list with 12px spacing
- Each card shows: event name (18px semibold), date, participant avatars, budget
- Primary green CTA button fixed at bottom

### Create Event Modal

- Centered modal, max-width 400px, 24px padding
- Modal title (22px semibold) with 16px margin below
- Form fields stacked vertically with 16px spacing
- Primary button for submit, secondary for cancel

### Participant List

- Each participant: 40px circular avatar, name (14px), role/status badge
- List items: 56px min height, 12px vertical spacing
- Hover state: light gray background (#F5F5F5)

---

## 8. Quick Reference Summary

### Essential Design Elements

- **Primary Color:** #00D26A (vibrant green) for all CTAs and success states
- **Typography:** System fonts, 14px minimum, 1.5× line height for body
- **Spacing:** 4px base unit, 16px container padding, 8px increments
- **Borders:** 8px radius for cards/buttons, 50% for avatars
- **Shadows:** Subtle (Level 1) for cards, higher for modals
- **Touch Targets:** 44×44px minimum for all interactive elements
- **Contrast:** 4.5:1 minimum for body text (WCAG AA)

### Design Checklist

- ✅ All buttons use Primary Green (#00D26A) for primary actions
- ✅ Body text is 14px minimum with 1.5× line height
- ✅ Cards have 12px border radius and subtle shadows
- ✅ All touch targets are 44×44px or larger
- ✅ Spacing uses 4px increments (4, 8, 12, 16, 24, 32)
- ✅ Text contrast meets WCAG AA standards
- ✅ Participant avatars are circular (50% border radius)
- ✅ Whitespace dominates (60-70% of screen)

---

**End of Style Guide**
