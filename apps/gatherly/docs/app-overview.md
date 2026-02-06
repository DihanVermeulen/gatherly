# gatherly Application - Detailed Specification

## 1. FEATURE LIST

### 1.1 Core Features

#### Event Management

- **Create Event** - Users can create new gatherly events with custom names
- **View All Events** - Dashboard displaying all created events with participant count
- **Edit Event** - Modify event settings, add/remove participants, change configurations
- **Delete Event** - Remove events permanently from the system
- **Save Event** - Persist all event data and configurations

#### Participant Management

- **Add Participants** - Input participant names one at a time
- **Remove Participants** - Delete individual participants from event
- **View Participant List** - See all participants in current event
- **Participant Tags** - Visual chips showing participant names with remove option

#### Couple Management

- **Mark as Couple** - Assign two participants as a couple
- **View Couples** - See all paired couples in current event
- **Remove Couple** - Unpair a couple and return them to available pool
- **Toggle Couple Crossing** - Allow/prevent couples from buying for each other
- **Dedicated Couple UI** - Two-step selection interface (click person 1, then person 2)

#### Gift Assignment & Distribution

- **Set Gifts Per Person** - Configure how many people each participant buys for (1-n)
- **Validate Constraints** - Ensure mathematically possible configurations
- **Generate Secret Codes** - Create hashed base64 codes for each participant
- **Regenerate Codes** - Create new assignments without losing event data
- **View All Codes** - See codes for all participants in secret format

#### Secret Code Features

- **Code Encoding** - Base64 encode person name + comma-separated receivers
- **Code Display** - Show masked codes (bullets) by default for security
- **Reveal Code** - Toggle visibility of individual codes
- **Copy Code** - One-click copy to clipboard with success feedback
- **Copied Feedback** - Visual indicator showing code was copied (2s timer)

#### Code Deciphering

- **Decipher Interface** - Dedicated page to decode secret codes
- **Paste Code** - Text area for pasting received codes
- **Decode Logic** - Parse base64 to extract person and receivers
- **Display Results** - Show who you are and who you're buying for
- **Error Handling** - Clear error message for invalid codes

#### Gift Registry/Wishlist

- **Add Gift** - Users can add items to their wishlist
- **Gift Details** - Name, description, and optional image upload
- **View Wishlist** - See all gifts added to event registry
- **Claim Gift** - Other users can mark gifts as "I'm buying this"
- **Track Claims** - Visual indicator of who claimed each gift

---

## 2. PAGES & ROUTES

### Page 1: Home Page (`/home`)

**Purpose:** Landing page introducing the application

**Elements:**

- Hero section with app description
- Call-to-action button ("Get Started")
- 3 feature cards highlighting core functionality
  - Create Events
  - Manage Couples
  - Secret Codes

**Navigation:**

- "Get Started" button navigates to Events page

---

### Page 2: Events Page (`/events`)

**Purpose:** Central hub for managing all gatherly events

**Elements:**

- Header with "Events" title
- Create Event Section
  - Text input for event name
  - Create button
- Events Grid (2 columns on desktop, 1 on mobile)
  - Event card per created event
  - Shows event name
  - Shows participant count
  - Shows delete button (trash icon)
  - "Manage Event" button (red)
  - "View Gifts" button (green, appears if codes generated)

**Empty State:**

- Message: "No events yet. Create one to get started!"

**Navigation:**

- "Manage Event" → Edit Event page
- "View Gifts" → Gift Registry page

---

### Page 3: Edit Event Page (`/events/edit/:id`)

**Purpose:** Configure event details, participants, couples, and generate codes

**Sections (in order):**

#### Section 3a: Participants Management

- Title: "Participants"
- Input field: "Add person..."
- Plus button to add
- List of participant tags with X to remove
- On Enter key: add participant
- Validation: No duplicates, no empty names

#### Section 3b: Gifts Per Person

- Title: "Gifts Per Person"
- Description: "How many people will each person buy gifts for?"
- Minus button (−)
- Large centered number display (current count)
- Plus button (+)
- Max constraint text below
- Valid range: 1 to (participants.length - 1)

#### Section 3c: Couples Management

- Title: "Couples"
- Checkbox: "Allow couples to buy for each other"
- Subsection: "Paired Couples" (if any exist)
  - List of couple pairs with remove buttons
  - Format: "Person A ↔ Person B"
- Subsection: "Create Couple"
  - Grid of unpaired participants (2 columns)
  - Click first person to select
  - Click second person to pair
  - Click same person again to deselect
  - First selected person highlighted in red
  - Helper text: "Person X is selected. Click another person to pair them."

#### Section 3d: Generate Button

- Full width button: "✨ Generate Secret Codes"
- Disabled if less than 2 participants
- Pulse animation on click (1s)
- Shows alert if impossible configuration

#### Section 3e: Assignments Display (if generated)

- Title: "Secret Codes"
- Card per participant showing:
  - Participant name in bold
  - Masked code (dots) by default
  - Eye icon to toggle visibility
  - Copy icon to copy code
  - Success feedback on copy (green color, 2s)
- "Regenerate Codes" button below list

#### Section 3f: Save Button

- Full width button: "Save Event"
- Persists all changes including couples and crossing setting

**Back Button:**

- Top left, returns to Events page

---

### Page 4: Decipher Code Page (`/decipher`)

**Purpose:** Allow users to decode their secret codes

**Elements:**

- Centered container (max-width: 2xl)
- Title: "🔐 Decipher Your Code"
- Description: "Paste your secret code below to reveal who you're buying gifts for"
- Large textarea for code input
- "Decipher Code" button

**Results Section (appears after decoding):**

- Green box: "You are: [Name]"
- Red box: "You're buying gifts for:"
  - List of receivers with 🎁 emoji
  - One per line

**Error State:**

- Red box: "Invalid code"
- Subtitle: "Please check that you've copied the code correctly"

---

### Page 5: Gift Registry Page (`/events/:id/gifts`)

**Purpose:** Manage wishlists and track claimed gifts

**Sections:**

#### Section 5a: Add Gift Form

- Title: "Add Your Gifts"
- Input: "Gift name..." (required)
- Textarea: "Description (optional)"
- File input: "Upload image (optional)"
- "Add Gift" button

#### Section 5b: Gift Display

- Grid of gift cards
- Each gift shows:
  - Gift image (if uploaded)
  - Gift name
  - Description
  - "Claimed by" indicator
  - Checkbox: "I'm buying this"
  - Claimed count / total count

**Back Button:**

- Returns to Events page

---

## 3. HEADER COMPONENT

**Desktop View (md and above):**

- Title: "🎅 gatherly"
- Tagline: "Organize and manage your gatherly events"
- Horizontal navigation buttons (right side):
  - 🏠 Home
  - 🎄 Events
  - 🔐 Decipher Code
- Active page highlighted in red

**Mobile View (below md):**

- Title: "🎅 gatherly"
- Tagline: "Organize and manage your gatherly events"
- Hamburger menu icon (right side)
- On click: reveal dropdown list
  - 🏠 Home
  - 🎄 Events
  - 🔐 Decipher Code
- Auto-closes menu on navigation

---

## 4. UX FLOW

### Flow 1: First-Time User Setup
