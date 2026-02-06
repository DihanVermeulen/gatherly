# gatherly Design System - AI Implementation Skill

## Skill Definition

**Name:** gatherly Design System Compliance  
**Purpose:** Ensure all UI code, components, and specifications follow the gatherly Design System guidelines  
**Scope:** HTML/CSS, React/TailwindCSS, Figma specifications, wireframes, and design documentation  
**Version:** 1.0

---

## When to Use This Skill

Apply this skill whenever you are:

- Creating UI components or code
- Generating React components with TailwindCSS
- Designing HTML/CSS layouts
- Writing Figma/design specifications
- Generating wireframe descriptions
- Building interactive prototypes
- Creating visual mockups

---

## Core Design System Values (Always Reference)

### Color System

**Primary Brand Color:**

- Name: Primary Green
- Hex: #00D26A
- RGB: 0, 210, 106
- Usage: ALL primary buttons, CTAs, success indicators, active states, confirmations
- Rule: Use for positive actions and confirmations only

**Secondary Green:**

- Name: Light Green
- Hex: #E8FFF4
- RGB: 232, 255, 244
- Usage: Subtle backgrounds, hover states, success message containers

**Neutral Grays:**

- Dark Gray (#1A1A1A): Body text, headings, primary content
- Medium Gray (#666666): Secondary text, labels, descriptions
- Light Gray (#F5F5F5): Card backgrounds, container fills, subtle backgrounds
- Border Gray (#E0E0E0): Borders, dividers, input strokes

**Accent Colors (Use Sparingly):**

- Blue Accent (#4A90E2): Information, links, badges
- Coral Accent (#FF6B6B): Warnings, edits, errors (use with caution)

**Critical Rules:**

- Never use Primary Green for body text
- Never use color alone to convey information (always add icons/text)
- Maintain 60-70% whitespace, 30-40% content
- All text must meet WCAG AA contrast (4.5:1 minimum)

### Typography System

**Font Stack:**

```
-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
```

**Type Scale:**

| Element    | Size | Weight | Line Height | Usage                        |
| ---------- | ---- | ------ | ----------- | ---------------------------- |
| H1         | 28px | 700    | 1.2         | Screen titles, main headings |
| H2         | 22px | 600    | 1.3         | Section headers              |
| H3         | 18px | 600    | 1.4         | Card titles, subsections     |
| Body Large | 16px | 400    | 1.5         | Large body text, buttons     |
| Body       | 14px | 400    | 1.5         | Primary body text            |
| Caption    | 12px | 500    | 1.3         | Labels, helper text          |

**Critical Rules:**

- Minimum body text size: 14px (NEVER smaller)
- Line height for body: 1.5× (at least 21px total height)
- Use sentence case (not ALL CAPS)
- Left-align body text
- Center-align titles/headings only

### Spacing System (4px Base Unit)

```
4px (xs)   → Icon padding, tight spacing
8px (sm)   → Small gaps between elements
12px (md)  → List items, moderate gaps
16px (lg)  → Container padding, card padding
20px (xl)  → Screen edge padding (mobile)
24px (2xl) → Section spacing
32px (3xl) → Large section breaks
```

**Critical Rules:**

- Always use multiples of 4px
- Never use arbitrary spacing values
- Padding inside containers: 16px minimum
- Gaps between sections: 24px minimum
- Mobile screen padding: 16px horizontal

### Border Radius

```
4px   → Input fields, small buttons, small interactive elements
8px   → Cards, standard buttons, containers
12px  → Modals, large cards, larger containers
16px  → Feature cards, hero images
50%   → Avatars, icon buttons, pill badges
```

### Elevation & Shadows

```
Level 1 (Subtle):  0 1px 3px rgba(0,0,0,0.08)    [Cards, inputs]
Level 2 (Medium):  0 4px 12px rgba(0,0,0,0.1)    [Hover state, elevated cards]
Level 3 (High):    0 8px 24px rgba(0,0,0,0.12)   [Modals, popovers]
Level 4 (Highest): 0 16px 48px rgba(0,0,0,0.15)  [Dialogs, overlays]
```

---

## Component Library Specifications

### 1. Primary Button

**Usage:** Main actions, confirmations, form submissions, CTAs

**Specification:**

```
Background:     #00D26A (Primary Green)
Text:          #FFFFFF, 16px, 600 weight
Padding:       12px × 24px
Border Radius: 8px
Min Height:    48px
Min Width:     120px
Shadow:        Level 1
States:
  - Default:   #00D26A
  - Hover:     #00BA5E (darker)
  - Active:    #00A850 (even darker)
  - Disabled:  #E0E0E0 (light gray), text #999999
```

**TailwindCSS Classes:**

```
bg-green-500 hover:bg-green-600 active:bg-green-700 disabled:bg-gray-300
text-white font-semibold py-3 px-6 rounded-lg min-h-12 transition-colors
shadow-sm hover:shadow-md
```

**Usage Example:**

```
[✨ Generate Secret Codes]
[Save Event]
[Add Gift]
[Create Event]
```

### 2. Secondary Button

**Usage:** Alternative actions, cancel, go back, secondary CTAs

**Specification:**

```
Background:     #FFFFFF
Border:        1px solid #E0E0E0 (Border Gray)
Text:          #1A1A1A (Dark Gray), 16px, 600 weight
Padding:       12px × 24px
Border Radius: 8px
Min Height:    48px
Shadow:        None
States:
  - Default:   White with gray border
  - Hover:     #F5F5F5 (Light Gray background)
  - Active:    #E0E0E0 (darker border)
  - Disabled:  #F5F5F5 background, #999999 text
```

**TailwindCSS Classes:**

```
bg-white border border-gray-300 text-gray-900 font-semibold py-3 px-6
rounded-lg min-h-12 hover:bg-gray-50 transition-colors
```

### 3. Card Component

**Usage:** Group related information, event listings, gift items, participant info

**Specification:**

```
Background:     #FFFFFF
Border Radius:  12px
Padding:        16px
Shadow:         Level 1 (0 1px 3px rgba(0,0,0,0.08))
Border:         None (or 1px #E0E0E0 optional)
Hover State:    Level 2 shadow, translateY(-2px)
Transition:     250ms cubic-bezier(0.25, 0.46, 0.45, 0.94)
```

**TailwindCSS Classes:**

```
bg-white rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5
transition-all duration-250
```

**Content Inside Card:**

```
- Title:       18px, 600 weight, #1A1A1A
- Description: 14px, 400 weight, #666666
- Metadata:    12px, 500 weight, #999999
- Spacing:     12px between title and content
```

### 4. Input Field

**Usage:** Text entry, search, form fields

**Specification:**

```
Background:     #FFFFFF
Border:        1px solid #E0E0E0
Border Radius: 8px
Padding:       12px × 16px
Min Height:    48px
Text:          14px, 400 weight, #1A1A1A
Placeholder:   #999999
States:
  - Default:   #E0E0E0 border
  - Focus:     #00D26A border, shadow 0 0 0 3px rgba(0,210,106,0.1)
  - Disabled:  #F5F5F5 background, #CCCCCC border
  - Error:     #FF6B6B border, red shadow
```

**TailwindCSS Classes:**

```
bg-white border border-gray-300 rounded-lg px-4 py-3 min-h-12
text-sm focus:border-green-500 focus:ring-2 focus:ring-green-100
placeholder-gray-400 transition-colors disabled:bg-gray-100
```

### 5. Avatar Component

**Usage:** Show participants, user profiles, group members

**Specification:**

```
Sizes:
  - Small:  32px
  - Medium: 40px
  - Large:  56px
  - XL:     80px
Border Radius: 50% (perfect circle)
Border:       2px solid #FFFFFF (when overlapping multiple)
Background:   Use initials or user image
Text:         Light color on colored background
```

**TailwindCSS Classes:**

```
Sizes:
  - sm: w-8 h-8 rounded-full
  - md: w-10 h-10 rounded-full
  - lg: w-14 h-14 rounded-full
  - xl: w-20 h-20 rounded-full

With image: object-cover
With initials: flex items-center justify-center text-white font-semibold
```

### 6. Status Badge

**Usage:** Show status, tags, labels, state indicators

**Specification:**

```
Padding:       4px × 12px
Border Radius: 999px (fully rounded)
Text:          12px, 500 weight
States:
  - Success:   Bg #E8FFF4, Text #00D26A
  - Warning:   Bg #FFF4E6, Text #FFA726
  - Info:      Bg #E3F2FD, Text #4A90E2
  - Neutral:   Bg #F5F5F5, Text #666666
```

**TailwindCSS Classes:**

```
Success:  bg-green-50 text-green-700 text-xs font-medium px-3 py-1 rounded-full
Warning:  bg-orange-50 text-orange-700 text-xs font-medium px-3 py-1 rounded-full
Info:     bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1 rounded-full
```

### 7. Modal/Dialog

**Usage:** Forms, confirmations, alerts, overlays

**Specification:**

```
Background:    #FFFFFF
Border Radius: 12px
Padding:       24px
Shadow:        Level 4 (0 16px 48px rgba(0,0,0,0.15))
Max Width:     600px (or 400px for small modals)
Overlay:       rgba(0,0,0,0.5) (50% opacity black backdrop)
Title:         22px, 600 weight, 16px margin-bottom
Close Button:  Top right, 24px from edges, Level 1 shadow
Buttons:       Primary at bottom, full width on mobile
```

---

## Layout Guidelines

### Mobile-First Approach

**Design Process:**

1. Start with 375px width (iPhone SE minimum)
2. Design for single column layout
3. Scale up to 768px (tablet)
4. Scale up to 1024px+ (desktop)

**Mobile Specifications:**

- Screen padding: 16px horizontal minimum
- Cards stack vertically (1 column)
- Buttons: Full width
- Touch targets: 44×44px absolute minimum
- Bottom navigation: 64px height
- Safe area: Account for notches, home indicators

**Responsive Breakpoints:**

```
Mobile:  0-767px   (phones)
Tablet:  768-1023px (tablets)
Desktop: 1024px+   (desktop)
```

### Whitespace Management

- **Principle:** 60-70% whitespace, 30-40% content
- **Card spacing:** 12px between cards (vertically), 16px (horizontally)
- **Section padding:** 24px top and bottom
- **Content margin:** Never less than 16px from edge (mobile)
- **Line length:** Max 600px for body text

---

## Accessibility Requirements

**Must Always Implement:**

1. **Color Contrast:**
   - Body text: 4.5:1 ratio (WCAG AA)
   - Large text (18px+): 3:1 ratio (WCAG AA)
   - Use tools to verify (WebAIM, Contrast Ratio)

2. **Touch Targets:**
   - All interactive elements: 44×44px minimum
   - Padding around small elements: 8px minimum
   - Not required for decorative elements

3. **Focus Indicators:**
   - Visible focus state on all interactive elements
   - Style: 2px solid #00D26A outline with 2px offset
   - Never use outline: none; always provide visible focus

4. **Semantic HTML:**
   - Use proper heading hierarchy (h1, h2, h3)
   - Use semantic tags (button, nav, section, article)
   - Use label elements for form inputs
   - Use aria-label for icon-only buttons

5. **Screen Reader Support:**
   - All buttons have descriptive text or aria-label
   - Form inputs have associated labels
   - Images have alt text
   - Icons have aria-hidden="true" if decorative

---

## Animation & Transition Guidelines

**Duration Standards:**

- **Fast (150ms):** Hover state changes, icon transitions
- **Normal (250ms):** Button clicks, card hover, modal fades
- **Slow (350ms):** Page transitions, full-screen overlays, complex animations

**Easing Function:**

```
cubic-bezier(0.25, 0.46, 0.45, 0.94)
```

**TailwindCSS Implementation:**

```
transition-all duration-150    [fast]
transition-all duration-250    [normal, default]
transition-all duration-350    [slow]
```

**Common Animations:**

- Card hover: Shadow increase + 2px lift (translateY -2px)
- Button hover: Background color change + subtle lift
- Modal appear: Fade in + scale from 95%
- Form submission: Loading spinner + button disable

**Rules:**

- No animation for functional changes only
- Never animate on page load (feels slow)
- Use animation to guide attention, not distract
- Respect prefers-reduced-motion setting

---

## Implementation Checklist

When creating any UI component or layout, verify:

### Colors

- [ ] Primary green (#00D26A) used for main CTAs only
- [ ] All text has 4.5:1+ contrast ratio
- [ ] Neutral grays used for secondary text
- [ ] Accents used sparingly (only when needed)
- [ ] No color conveys meaning alone

### Typography

- [ ] Body text is 14px minimum
- [ ] Line height is 1.5× for body text
- [ ] Headings follow type scale (28/22/18px)
- [ ] Font weights match specification (400/500/600/700)
- [ ] Case follows rules (sentence case, not ALL CAPS)

### Spacing

- [ ] All spacing uses 4px multiples
- [ ] Card padding is 16px
- [ ] Section gaps are 24px+
- [ ] Mobile edges have 16px padding
- [ ] 60-70% whitespace maintained

### Components

- [ ] Primary buttons are green (#00D26A)
- [ ] Cards use 12px border radius + Level 1 shadow
- [ ] Buttons have 48px minimum height
- [ ] All interactive elements 44×44px minimum
- [ ] Avatars are circular (50% border radius)

### Accessibility

- [ ] All text contrast meets WCAG AA
- [ ] Focus indicators visible on all buttons
- [ ] Touch targets are 44×44px+
- [ ] Semantic HTML used
- [ ] ARIA labels where needed

### Responsiveness

- [ ] Designed for 375px width (mobile first)
- [ ] Scales to 768px (tablet)
- [ ] Scales to 1024px+ (desktop)
- [ ] No horizontal scroll on mobile
- [ ] Touch-friendly on all sizes

---

## Common Patterns

### Event Card Pattern

```
[Image if available]
Title: 18px bold, #1A1A1A
Date: 12px, #666666
Participant count: 12px, #999999
Status badge: Success green or neutral gray
Action buttons: Primary green + secondary outline
Card padding: 16px
Card spacing: 12px between cards
```

### Form Pattern

```
Section title: 22px, 600 weight
Labels: 14px, 500 weight, above inputs
Input fields: 48px height, 8px border radius
Helper text: 12px, #666666 below input
Error text: 12px, #FF6B6B
Spacing between fields: 16px
Button: Full width on mobile, primary green
```

### List Item Pattern

```
Avatar: 40px circular, left side
Name: 14px, 600 weight, #1A1A1A
Status/role: 12px, #666666
Action button: Right side (if applicable)
Item padding: 12px vertical, 16px horizontal
Item spacing: 8px between items
Hover: #F5F5F5 background
```

### Modal Pattern

```
Overlay: 50% opacity black backdrop
Container: Max 600px width, 24px padding
Title: 22px, 600 weight, 16px bottom margin
Content: Standard body text (14px)
Buttons: Primary on right, secondary on left
Close button: Top right corner
Shadow: Level 4 (highest elevation)
```

---

## Key Reminders

1. **Green is Positive:** Use #00D26A only for positive actions (submit, confirm, create)
2. **Whitespace is Content:** 60-70% of screen should be empty
3. **Mobile First:** Always design for 375px width first
4. **Touch Friendly:** 44×44px minimum for all clickable elements
5. **Accessibility:** Test contrast, keyboard nav, screen readers
6. **Consistency:** Use the same spacing, colors, and components throughout
7. **Cards Rule:** Group information in cards with 12px radius + shadow
8. **Text Sizes:** Never go below 14px for body text
9. **Animations:** Keep them quick (150-350ms max)
10. **Hierarchy:** Clear visual hierarchy guides users through interface

---

## Questions to Ask Before Creating UI

1. Does this use Primary Green (#00D26A) for main CTAs?
2. Is body text 14px minimum with 1.5× line height?
3. Are cards using 12px border radius and Level 1 shadow?
4. Are all touch targets 44×44px or larger?
5. Is there 60-70% whitespace on the screen?
6. Does all text meet 4.5:1 contrast ratio?
7. Is spacing using 4px increments?
8. Does this work on 375px mobile screens?
9. Are participant avatars circular (50% radius)?
10. Is the layout card-based with proper grouping?

**If you answer NO to any question, revise the design before implementation.**

---

**End of AI Design System Skill**
