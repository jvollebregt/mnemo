# MNEMO: MOBILE-FIRST UX SPECIFICATION
## Complete Navigation, Dashboard, and Practice Flow (December 20, 2025)

**Status:** Production-Ready  
**Platform:** Mobile-First (iOS/Android) + Responsive Web  
**Replaces:** MNEMO-Research-to-Design.md  
**Scope:** All user-facing screens, navigation, interactions, and touch patterns  

---

## PART 1: PHILOSOPHY & APPROACH

### Why Mobile-First for MNEMO?

**The phone is dual-purpose:**
1. **Visual aid:** Poem text, annotations (meter dots, rhyme letters, sound highlights)
2. **Dictaphone:** Record recitation, capture audio for later playback & evaluation (Phase 2)

**Mobile-first design principles:**
- Touch targets: 48px minimum (standard iOS/Android)
- Stacked vertical layout (no sidebars, columns adapt to screen width)
- Bottom fixed bar for frequent actions (practice modes, layer toggles)
- Minimal cognitive load per screen (one poem, one task at a time)
- Fast transitions (quick navigation back to menu or next poem)

### Design System (Refined for Mobile)

**Typography:**
- Poem text: EB Garamond, 18–20px, 1.6 line-height (readability on small screens)
- UI chrome (buttons, labels): Inter, 16px (accessible touch targets)
- Headings: Inter Bold, 18–20px

**Color Palette:**
- Background: Warm cream (#FDF8EC)
- Poem card: Slightly off-white (#FFFBF7) with subtle shadow
- Accents: Deep teal (#207E8A) for interactive elements
- Error/warning: Muted red (#D64045)
- Success: Muted green (#2D8B5C)
- Layer colors (sound patterns): Harmonized pastels (4–6 muted hues)

**Spacing:**
- Vertical rhythm: 16px base unit
- Safe area padding: 16px on sides (account for notch, home bar)
- Bottom safe area: +20px extra for iPhone home bar

**Touch Feedback:**
- Haptic feedback: Light tap on annotation (if available)
- Visual feedback: Color change + scale animation on tap
- No hover states (desktop), use active states (mobile)

---

## PART 2: NAVIGATION ARCHITECTURE

### Navigation State Diagram

```
App Launch
    ↓
[Popup: Continue vs Challenge vs Menu?]
    ├→ "Continue [Last Poem]" → Practice Screen
    ├→ "Challenge: [First Poem]" → Practice Screen
    └→ "Go to Menu" → Menu Screen
         ↓
    Menu Screen
    ├→ "My Poems" → List
    │   └→ [Click poem] → Dashboard
    │       └→ "Practice This Poem" → Practice Popup → Practice Screen
    ├→ Account → Account Settings
    ├→ About → Info Screen
    ├→ FAQ → FAQ Screen
    └→ Contact → Contact Screen

Practice Screen
    ├→ Back button → Menu (or confirm?)
    ├→ Layer toggles (in-place)
    ├→ Mode switcher (in-place)
    └→ Submit answer → Next item
```

### State Management

**User Preferences (stored in `localStorage` or backend):**
- Last poem ID + position
- Preferred practice mode (meter / rhyme / sound / mixed)
- Layer toggle state (which layers to show by default)
- "Don't ask me at launch" toggle (if checked, skip popup, go to continue)

**Session State:**
- Current poem ID
- Current line index
- Current mode
- Current layer visibility
- User's answers (meter marks, rhyme letters, sound selections)

---

## PART 3: FIVE CORE SCREENS

### Screen 1: Launch Popup

**Trigger:** App starts (if user not logged in, see login first; after login, show this)

**Layout (Mobile):**
```
┌─────────────────────────────────────────┐
│                                         │
│     MNEMO                               │
│     Your Poetry Memory Companion         │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  CONTINUE YOUR WORK               │  │
│  │  "The Love Song of J. Alfred..."   │  │
│  │  Last studied: 2 days ago          │  │
│  │  [Full-width button, teal]         │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  CHALLENGE MODE                    │  │
│  │  "Ozymandias" (first in library)   │  │
│  │  Start from scratch               │  │
│  │  [Full-width button, outlined]     │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [Go to Menu] ← small link text        │
│                                         │
│  ☐ Don't ask me again                 │  ← Checkbox
│                                         │
└─────────────────────────────────────────┘
```

**Interaction:**
- Tap "Continue [Title]" → Launch practice with last session state
- Tap "Challenge" → Launch practice with fresh state (all layers off)
- Tap "Go to Menu" → Dismiss popup, show Menu Screen
- Check box → Set preference to always continue on next launch

**Responsive Notes:**
- On tablets: same layout (centered card in middle of screen)
- Dialog: Modal with rounded corners, shadow, 16px padding

---

### Screen 2: Menu

**Trigger:** User taps "Go to Menu" or back button from other screens

**Layout (Mobile):**
```
┌─────────────────────────────────────────┐
│ ☰  MNEMO              [Search icon]     │  ← Top bar (sticky)
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 👤 Jane Doe                     │   │  ← User profile card
│  │ Premium Member                  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🔍 [Search poems, forms, poets] │   │  ← Search bar
│  └─────────────────────────────────┘   │
│                                         │
│  MY POEMS                               │  ← Section header
│  ┌─────────────────────────────────┐   │
│  │ "The Love Song of J. Alfred..." │   │  ← Last studied: 2d
│  │ T.S. Eliot                      │   │  ├─ Progress: 78% ●●●●●
│  │ ●●●●○                          │   │  │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ "Ozymandias"                     │   │
│  │ Percy Bysshe Shelley            │   │  ← Last studied: 1m
│  │ ●●●○○                          │   │  ├─ Progress: 56% ●●●
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ "Do Not Go Gentle..."            │   │
│  │ Dylan Thomas                     │   │  ← Last studied: never
│  │ ○○○○○                          │   │  ├─ Progress: 0% —
│  └─────────────────────────────────┘   │
│                                         │
│  [+ Add Poem / Paste Text]              │  ← Action button
│                                         │
├─────────────────────────────────────────┤
│ Account  |  About  |  FAQ  |  Contact   │  ← Footer links (sticky)
│                                         │
└─────────────────────────────────────────┘
```

**Components:**

**Top Bar (Sticky):**
- Left: Hamburger icon (if side menu) or title "MNEMO"
- Center: Title "My Poems"
- Right: Search icon (toggles search bar) or profile icon

**User Profile Card:**
- Avatar circle
- Name + tier badge (Free / Premium)
- Tap to go to Account Settings

**Search Bar (Appears on top when icon tapped):**
- Placeholder: "Search poems, forms, poets..."
- Real-time filter on My Poems list

**Poems List (Scrollable):**
- Each row = one poem
  - Left: Thumbnail / icon (book symbol or 1st line faded text)
  - Middle: Title (bold), Author (lighter), 5-dot progress ring
  - Right: Last studied date badge + progress %
  - Tap row → Dashboard

**Add Poem Button (Floating or inline):**
- Icon: + or pencil
- Tap → Upload/paste poem text (not detailed here; assume Phase 1 includes this)

**Footer Links:**
- Account, About, FAQ, Contact
- Scrolled into view on long lists

**Mobile Responsive:**
- Single column on phone
- Two columns on tablet (poems list + detail pane)

---

### Screen 3: Poem Dashboard

**Trigger:** User taps a poem in the Menu list

**Layout (Mobile):**
```
┌─────────────────────────────────────────┐
│ < My Poems                    [⋮]       │  ← Top bar (back + menu)
├─────────────────────────────────────────┤
│                                         │
│  POEM METADATA CARD (Collapsible)      │
│  ┌─────────────────────────────────┐   │
│  │ "The Love Song of J. Alfred..."  │   │
│  │ T.S. Eliot                       │   │
│  │ Form: Dramatic Monologue         │   │
│  │ Written: 1915 | Length: 131 lines│   │
│  │ [▼ More details...]              │   │  ← Expandable
│  └─────────────────────────────────┘   │
│                                         │
│  MASTERY METRICS                        │  ← Section header
│  ┌─────────────────────────────────┐   │
│  │ Meter Mastery        78%         │   │  ← Circular progress
│  │ [████████──] ⭐ Strong           │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ Rhyme Accuracy       92%         │   │
│  │ [██████████] ⭐ Excellent        │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ Sound Patterns       45%         │   │
│  │ [█████─────] ⭐ Learning...      │   │
│  └─────────────────────────────────┘   │
│                                         │
│  SCHEDULING & STREAK                    │
│  ┌─────────────────────────────────┐   │
│  │ 🔥 7-day streak                  │   │
│  │ ⏱ Next review: in 3 days        │   │
│  │ 📈 Interval: 14 days (SM-2)      │   │
│  │ Repetitions: 8                   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ERROR PATTERNS (Last 7 days)           │
│  ┌─────────────────────────────────┐   │
│  │ Meter: ▓▓░░░░░░░░ (3 errors)    │   │
│  │ Rhyme: ▓░░░░░░░░░ (1 error)     │   │
│  │ Sound: ▓▓▓▓░░░░░░ (4 errors)    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │   PRACTICE THIS POEM             │   │
│  │   [Full-width button, teal]      │   │  ← Primary action
│  └─────────────────────────────────┘   │
│                                         │
│  Last practiced: Yesterday at 3:22 PM   │
│                                         │
└─────────────────────────────────────────┘
```

**Components:**

**Metadata Card (Collapsible):**
- Visible: Title, Author, Form, Written year, Line count
- Hidden (expand on tap): Full text, difficulty rating, notes, source URL
- Icon: Chevron down (indicates expand)

**Mastery Metrics (3 cards, one per layer):**
- Each card has:
  - Layer name + percentage
  - Horizontal progress bar (color-coded: red <40%, yellow 40–70%, green >70%)
  - Emoji badge (Learning / Good / Excellent)
- Tap card → Drill that layer only

**Scheduling & Streak Card:**
- Streak badge (🔥 + number)
- SM-2 info:
  - Next review date (relative: "in 3 days")
  - Interval (spacing between reviews)
  - Repetitions count
- Visual: "Due today" label if overdue

**Error Patterns (Mini heatmap):**
- Rows: Meter, Rhyme, Sound
- Visualization: Small bar per layer, filled by error count
- Interactive: Tap a row → drill that layer in next practice

**Primary Button:**
- Text: "Practice This Poem"
- Tap → Practice Entry Popup (Screen 4)

**Last Practiced Timestamp:**
- Shows when user last opened this poem
- Contextual: "Yesterday at 3:22 PM" or "1 month ago"

**Mobile Responsive:**
- Single column on phone (all cards stack)
- On tablet: Metadata + Metrics on left, Error patterns + button on right

---

### Screen 4: Practice Entry Popup

**Trigger:** User taps "Practice This Poem" on Dashboard

**Layout (Mobile - Modal Dialog):**
```
┌─────────────────────────────────────────┐
│ HOW DO YOU WANT TO PRACTICE?             │  ← Modal title
│                                         │
│ ┌─────────────────────────────────┐   │
│ │ ◉ Continue from where I left off │   │  ← Radio button (default)
│ │   Restore your previous toggles: │   │
│ │                                  │   │
│ │   Meter    [☑] Show stress dots  │   │
│ │   Rhyme    [☑] Show letters      │   │
│ │   Sound    [☐] Hide highlights   │   │
│ │   Text     [☑] Show poem text    │   │
│ │                                  │   │
│ └─────────────────────────────────┘   │
│                                         │
│ ┌─────────────────────────────────┐   │
│ │ ◉ Fresh Start                     │   │  ← Radio button
│ │   All aids off (full challenge):  │   │
│ │                                  │   │
│ │   Meter    [☐]                   │   │  ← All unchecked
│ │   Rhyme    [☐]                   │   │
│ │   Sound    [☐]                   │   │
│ │   Text     [☑] (always on)       │   │
│ │                                  │   │
│ └─────────────────────────────────┘   │
│                                         │
│ ┌─────────────────────────────────┐   │
│ │ ◉ Custom                          │   │  ← Radio button
│ │   Choose your own:                │   │
│ │                                  │   │
│ │   Meter    [☑]                   │   │  ← Editable toggles
│ │   Rhyme    [☐]                   │   │
│ │   Sound    [☑]                   │   │
│ │   Text     [☑]                   │   │
│ │                                  │   │
│ └─────────────────────────────────┘   │
│                                         │
│  ┌────────────────────────────────┐   │
│  │  START PRACTICE                 │   │  ← Full-width button
│  └────────────────────────────────┘   │
│                                         │
│  [Cancel]                               │  ← Dismiss
│                                         │
└─────────────────────────────────────────┘
```

**Components:**

**Three Radio Button Groups:**

1. **Continue from where I left off (Default):**
   - Shows current state of toggles
   - Editable: User can tap checkboxes to modify

2. **Fresh Start:**
   - All toggles off except Text (always on)
   - Non-editable in this view

3. **Custom:**
   - All toggles editable
   - Start from fresh state or last used

**Toggles:**
- Checkbox + label pairs
- Meter, Rhyme, Sound, Text
- Text is always available (never disabled)

**Primary Button:**
- Text: "Start Practice"
- Tap → Launch Practice Screen with chosen config

**Secondary Action:**
- [Cancel] → Dismiss, return to Dashboard

**Mobile Responsive:**
- Modal covers 90% of screen height (portrait)
- Dismiss with back button or [Cancel]

---

### Screen 5: Practice Screen (Main Annotation View)

**The core interaction screen.** This is where annotation and practice happen.

**Layout (Mobile Portrait):**
```
┌─────────────────────────────────────────┐
│ < "The Love Song..."     [⋮]            │  ← Top bar (back + menu)
├─────────────────────────────────────────┤
│                                         │
│  LINE 3 OF 12 ●●●○○○○○○○○○             │  ← Progress indicator (dots)
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 1.  We have lingered in the       │   │  ← Poem display
│  │     chambers of the sea           │   │
│  │                                  │   │
│  │     Meter:  ● ○ ● ○ ● ○ ●       │   │  ← Annotation dots
│  │     Rhyme:  A                     │   │  ← Rhyme letter
│  │                                  │   │
│  │ 2.  By sea-girls wreathed with   │   │
│  │     seaweed red and brown         │   │
│  │                                  │   │
│  │     Meter:  ○ ○ ● ○ ● ○ ●       │   │
│  │     Rhyme:  A                     │   │
│  │                                  │   │
│  │ 3.  Till human voices wake us,   │   │
│  │     and we drown.                 │   │
│  │                                  │   │
│  │     Meter:  ○ ○ ○ ○ ○ ○ ○       │   │  ← Current: highlight row
│  │     Rhyme:  [B____]               │   │  ← Input active
│  │                                  │   │
│  │ [Sound highlights in teal if visible] │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  PRACTICE MODE                   │   │  ← Bottom fixed bar
│  │  [Meter] [Rhyme] [Sound] [Mixed] │   │
│  │                                  │   │
│  │  TOGGLE LAYERS (While Practicing)│   │
│  │  [☑ Meter] [☑ Rhyme] [☐ Sound]  │   │
│  │                                  │   │
│  │  [NEXT] or [CHECK ANSWER]        │   │  ← Action button
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

**Components:**

**Top Bar (Fixed):**
- Back arrow → Confirm exit ("Unsaved progress. Leave?")
- Poem title (small, truncated)
- Menu icon (⋮) → Pause options

**Progress Indicator:**
- Dots: Line 3 of 12 = 12 small dots, 3 filled
- Visual: "●●●○○○○○○○○○"

**Poem Display (Main Content):**
- **Layout:** Lines numbered on left margin (subtle gray)
- **Text:** EB Garamond, 18px, 1.6 line-height
- **Annotations:**
  - **Meter:** Row of small circles (● filled = stress, ○ hollow = unstressed)
    - Tap any circle to toggle
    - Show/hide via toggle in bottom bar
  - **Rhyme:** Single letter per line (A, B, A, B, etc.)
    - Inline editable: Tap to focus input, type letter, move to next
    - Show/hide via toggle
  - **Sound patterns:** Colored background highlights on words/syllables
    - Show/hide via toggle
    - Tap to reveal palette for user to add/edit patterns
- **Current line:** Highlight row with light teal background
- **Spacing:** 16px vertical gap between stanzas

**Interaction for Meter (Primary):**
- Tap a stress dot (●/○) to toggle
- Visual feedback: Color change + haptic tick
- Feedback: "✓ Correct!" or "✗ Try again" after answer submitted

**Interaction for Rhyme:**
- Tap the rhyme letter position → Input field appears
- User types A–Z
- Tab/swipe right to next line
- Or [Next] button to advance

**Interaction for Sound:**
- Tap [+] icon near word → Color palette pops up
- User selects color → Word highlights in that color
- Tap highlighted word again → Color options appear (edit or clear)

**Bottom Fixed Bar (Sticky):**
- **Section 1: Mode Selector**
  - Pills: [Meter] [Rhyme] [Sound] [Mixed]
  - Tapped mode determines what exercise is active
  - Visual: Active mode highlighted (teal, bold)

- **Section 2: Layer Toggles**
  - Inline checkboxes: [☑ Meter] [☑ Rhyme] [☐ Sound]
  - User can toggle any layer on/off at any time
  - Decoupled from "mode" (you can be in Meter mode but show all layers)

- **Section 3: Action Button**
  - If mode = Cloze: "[NEXT]" (submit answer, move to next line)
  - If mode = Annotation: "[CHECK ANSWER]" or "[NEXT]"
  - Hover/active: Color change + scale
  - Feedback: Inline toast or banner ("Great! 8/10 correct")

**Mobile Responsive:**
- Poem text scales for smaller screens (16px on <320px width)
- Bottom bar wraps on very small screens (mode on line 1, toggles on line 2)
- Tablet: Poem on left, toggles + info panel on right

**Accessibility:**
- Color-coding for meter/rhyme/sound should not be sole differentiator
- Add icons (♪ for meter, 🔤 for rhyme, 🎨 for sound)
- High contrast for all interactive elements (4.5:1 WCAG AA)

---

## PART 4: VISUAL DESIGN (Mobile-Specific)

### Color Palette (Finalized)

```css
/* Primary brand colors */
--color-primary: #207E8A;        /* Deep teal – buttons, active states */
--color-primary-light: #32B8C6;  /* Bright teal – hover/focus */
--color-accent: #D4A574;          /* Warm brown – secondary actions */

/* Neutral palette */
--color-bg-primary: #FDF8EC;      /* Warm cream – app background */
--color-bg-secondary: #FFFBF7;    /* Off-white – card background */
--color-text-primary: #1F2121;    /* Dark charcoal – body text */
--color-text-secondary: #627C7C;  /* Muted gray – secondary text */
--color-border: #E8DFD6;          /* Subtle beige – borders, dividers */

/* Status colors */
--color-success: #2D8B5C;         /* Muted green */
--color-error: #D64045;           /* Muted red */
--color-warning: #C16F3B;         /* Muted orange */

/* Sound pattern colors (harmonized pastels) */
--sound-1: #E3C8D0;               /* Muted rose */
--sound-2: #D9E0C8;               /* Muted sage */
--sound-3: #C8DFE3;               /* Muted blue */
--sound-4: #E3D0C8;               /* Muted tan */
--sound-5: #DCC8E3;               /* Muted lavender */
--sound-6: #E3E0C8;               /* Muted gold */
```

### Typography (Mobile)

```css
/* Display / Headings */
--font-display: 'EB Garamond', Georgia, serif;
--size-h1: 24px;   /* Poem titles */
--size-h2: 20px;   /* Section headers */
--size-h3: 18px;   /* Card titles */

/* Poem text (serif for readability) */
--font-poem: 'EB Garamond', Georgia, serif;
--size-poem: 18px; /* Main poem */
--line-poem: 1.6;

/* UI text (sans for clarity) */
--font-ui: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--size-ui-lg: 16px;    /* Buttons, labels */
--size-ui-md: 14px;    /* Body text, list items */
--size-ui-sm: 12px;    /* Captions, hints */

/* Font weights */
--weight-regular: 400;
--weight-medium: 500;
--weight-semibold: 600;
--weight-bold: 700;
```

### Components (Mobile)

**Buttons:**
```css
/* Primary button */
.btn-primary {
  background: var(--color-primary);
  color: white;
  padding: 16px 24px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  min-height: 48px; /* Touch target */
  transition: background 200ms ease;
}

.btn-primary:active {
  background: var(--color-primary-light);
  transform: scale(0.98); /* Subtle press */
}

/* Secondary button (outlined) */
.btn-secondary {
  background: transparent;
  border: 2px solid var(--color-border);
  color: var(--color-text-primary);
  padding: 14px 22px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
}

.btn-secondary:active {
  background: var(--color-bg-secondary);
  border-color: var(--color-primary);
}
```

**Cards:**
```css
.card {
  background: var(--color-bg-secondary);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid var(--color-border);
}
```

**Toggles/Checkboxes:**
```css
.checkbox {
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 150ms ease;
}

.checkbox:checked {
  background: var(--color-primary);
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary), 0.2); /* Focus ring */
}
```

**Progress Bars:**
```css
.progress-bar {
  height: 8px;
  background: var(--color-border);
  border-radius: 4px;
  overflow: hidden;
  margin: 8px 0;
}

.progress-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width 300ms ease;
}

.progress-fill.success {
  background: var(--color-success);
}

.progress-fill.warning {
  background: var(--color-warning);
}
```

**Annotation Dots (Meter):**
```css
.stress-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid var(--color-border);
  cursor: pointer;
  transition: all 150ms ease;
  margin: 0 4px;
}

.stress-dot.filled {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.stress-dot.hollow {
  background: transparent;
}

.stress-dot:active {
  box-shadow: 0 0 0 6px var(--color-primary), 0.2);
  transform: scale(1.1);
}
```

---

## PART 5: INTERACTION & GESTURE PATTERNS

### Touch Gestures (Mobile)

**Tap:**
- Annotation dots: Toggle stress
- Rhyme letters: Edit
- Layer toggles: Switch on/off
- Buttons: Activate action
- Cards: Expand/collapse
- Feedback: Haptic tick + color flash

**Long Press (500ms):**
- Poem text: Show contextual help (hint for line)
- Annotation: Show explanation of pattern
- Feedback: Vibration + tooltip popover

**Swipe Right:**
- In practice: Go to previous line (if available)
- From left edge: Open side menu (if implemented)

**Swipe Left:**
- In practice: Go to next line
- Feedback: Smooth transition animation

**Swipe Down (Pull-to-Refresh):**
- In menu: Refresh poem list / sync with server
- In practice: Dismiss bottom sheet (if expanded)

**Pinch (Zoom):**
- Poem text: Scale up/down for readability
- Persist in settings: Remember user's preferred zoom

### Haptic Feedback (iOS/Android)

**Light Tap:**
- Annotation dots on toggle
- Rhyme letter input
- Layer toggle on/off

**Medium Impact:**
- Correct answer submitted
- Error in answer (if enabled)

**Heavy Impact:**
- Streak milestone reached (e.g., 7 days)

**Selection (if available):**
- When user selects text for sound pattern

### Animations

**Transitions (200–300ms ease):**
- Screen change: Fade + slide (left/right depending on direction)
- Card expand/collapse: Ease-out
- Button press: Scale 0.98
- Toggle: Color change

**Loading States:**
- Skeleton placeholders for poem list
- Spinner for data fetch
- Progress indicator for practice session

**Success Feedback:**
- Checkmark icon with bounce animation
- Green flash / highlight of correct answer
- Toast notification: "Great! Correct."

---

## PART 6: DICTAPHONE INTEGRATION (Phase 2 Preview)

**Mobile phone as audio recorder:**

**In Practice Screen (Future):**
- Add microphone icon in bottom bar (right side, next to "NEXT" button)
- Tap to start recording → red indicator + timer
- User recites the poem
- Tap to stop → audio saved to session
- Playback: Listen to your recitation, compare to expected meter/rhythm

**Data Model:**
- `practice_sessions.audio_url` → S3/Cloud Storage path
- `practice_sessions.audio_metadata` → Duration, timestamp, quality metrics

**Not in Phase 1 (defer to Phase 2):**
- Audio playback UI
- Comparison overlay (speech-to-text, prosody analysis)
- Feedback on recitation timing

---

## PART 7: RESPONSIVE DESIGN BREAKPOINTS

### Mobile First (Phone: 320–480px)
- Single column layout
- Bottom fixed bar (full width)
- Stacked cards
- Larger touch targets (48px)
- Simplified navigation (hamburger menu)

### Small Tablet (481–768px)
- Poem text on left, toggles on right
- Two-column layout in menu (poems list + detail)
- Bottom bar remains fixed
- Sidebar for navigation (if space allows)

### Tablet / Desktop (769px+)
- Three-column layout (optional):
  - Left: Poem list / navigation
  - Center: Poem display
  - Right: Controls + analytics
- Full horizontal layout for dashboard
- Sidebar sticky navigation

**CSS Media Queries:**
```css
/* Mobile first (no media query for base styles) */

@media (min-width: 481px) {
  /* Small tablet */
  .poem-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }
}

@media (min-width: 769px) {
  /* Tablet / desktop */
  .poem-layout {
    grid-template-columns: 1fr 1fr 1fr;
  }
  .sidebar {
    position: sticky;
    top: 0;
  }
}
```

---

## PART 8: CODE SKETCHES (React Components)

### 1. Launch Popup Component

```jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function LaunchPopup({ lastPoem, firstPoem, onUserChoice }) {
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const navigate = useNavigate();

  const handleContinue = () => {
    if (dontAskAgain) {
      localStorage.setItem('skipLaunchPopup', 'true');
    }
    onUserChoice('continue');
    navigate(`/practice/${lastPoem.id}`);
  };

  const handleChallenge = () => {
    onUserChoice('challenge');
    navigate(`/practice/${firstPoem.id}?mode=fresh`);
  };

  const handleMenu = () => {
    onUserChoice('menu');
    navigate('/menu');
  };

  return (
    <div className="launch-popup">
      <div className="popup-content">
        <h1>MNEMO</h1>
        <p>Your Poetry Memory Companion</p>

        <button className="btn-primary" onClick={handleContinue}>
          CONTINUE YOUR WORK
          <br />
          <small>{lastPoem.title}</small>
          <br />
          <small>Last studied: {formatDate(lastPoem.lastStudied)}</small>
        </button>

        <button className="btn-secondary" onClick={handleChallenge}>
          CHALLENGE MODE
          <br />
          <small>{firstPoem.title} (first in library)</small>
          <br />
          <small>Start from scratch</small>
        </button>

        <a href="#menu" onClick={handleMenu}>Go to Menu</a>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={dontAskAgain}
            onChange={(e) => setDontAskAgain(e.target.checked)}
          />
          Don't ask me again
        </label>
      </div>
    </div>
  );
}
```

### 2. Menu Component (My Poems List)

```jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function Menu() {
  const [poems, setPoems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch user's poems from backend
    fetch('/api/poems')
      .then((res) => res.json())
      .then((data) => setPoems(data));
  }, []);

  const filteredPoems = poems.filter((p) =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="menu-container">
      <div className="top-bar sticky">
        <h1>MNEMO</h1>
        <input
          type="text"
          placeholder="Search poems, forms, poets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-bar"
        />
      </div>

      <div className="user-profile-card">
        <div className="avatar" />
        <h2>Jane Doe</h2>
        <p>Premium Member</p>
      </div>

      <h3>MY POEMS</h3>
      <div className="poems-list">
        {filteredPoems.map((poem) => (
          <div
            key={poem.id}
            className="poem-row"
            onClick={() => navigate(`/dashboard/${poem.id}`)}
          >
            <div className="poem-info">
              <h4>{poem.title}</h4>
              <p>{poem.author}</p>
              <div className="progress-ring">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className={`dot ${i < Math.round(poem.progress / 20) ? 'filled' : ''}`}
                  />
                ))}
              </div>
            </div>
            <div className="poem-meta">
              <p className="last-studied">{formatDate(poem.lastStudied)}</p>
              <p className="progress">{Math.round(poem.progress)}%</p>
            </div>
          </div>
        ))}
      </div>

      <button className="btn-primary add-poem-btn">+ Add Poem</button>

      <div className="footer-links sticky">
        <a href="/account">Account</a>
        <a href="/about">About</a>
        <a href="/faq">FAQ</a>
        <a href="/contact">Contact</a>
      </div>
    </div>
  );
}
```

### 3. Poem Dashboard Component

```jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export function PoemDashboard() {
  const { poemId } = useParams();
  const [poem, setPoemData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`/api/poems/${poemId}`)
      .then((res) => res.json())
      .then((data) => setPoemData(data));
  }, [poemId]);

  if (!poem) return <div>Loading...</div>;

  const handlePractice = () => {
    navigate(`/practice-entry/${poemId}`);
  };

  return (
    <div className="dashboard-container">
      <div className="top-bar">
        <button onClick={() => navigate('/menu')}>← My Poems</button>
        <h1>{poem.title}</h1>
      </div>

      <div className="metadata-card">
        <h2>{poem.title}</h2>
        <p className="author">{poem.author}</p>
        <p className="form">Form: {poem.form}</p>
        <p className="year">Written: {poem.year}</p>
        <p className="length">Length: {poem.lineCount} lines</p>
        <a href="#more">More details...</a>
      </div>

      <h3>MASTERY METRICS</h3>
      <div className="mastery-card">
        <h4>Meter Mastery: {poem.meterProgress}%</h4>
        <div className="progress-bar">
          <div className="fill" style={{ width: `${poem.meterProgress}%` }} />
        </div>
        <p className="badge">⭐ {getMasteryLabel(poem.meterProgress)}</p>
      </div>

      <div className="mastery-card">
        <h4>Rhyme Accuracy: {poem.rhymeProgress}%</h4>
        <div className="progress-bar">
          <div className="fill" style={{ width: `${poem.rhymeProgress}%` }} />
        </div>
        <p className="badge">⭐ {getMasteryLabel(poem.rhymeProgress)}</p>
      </div>

      <div className="mastery-card">
        <h4>Sound Patterns: {poem.soundProgress}%</h4>
        <div className="progress-bar">
          <div className="fill" style={{ width: `${poem.soundProgress}%` }} />
        </div>
        <p className="badge">⭐ {getMasteryLabel(poem.soundProgress)}</p>
      </div>

      <h3>SCHEDULING & STREAK</h3>
      <div className="scheduling-card">
        <p>🔥 {poem.streak}-day streak</p>
        <p>⏱ Next review: in {poem.daysUntilReview} days</p>
        <p>📈 Interval: {poem.sm2Interval} days (SM-2)</p>
        <p>Repetitions: {poem.repetitions}</p>
      </div>

      <h3>ERROR PATTERNS (Last 7 days)</h3>
      <div className="error-patterns">
        <p>Meter: {renderErrorBar(poem.meterErrors)} ({poem.meterErrors} errors)</p>
        <p>Rhyme: {renderErrorBar(poem.rhymeErrors)} ({poem.rhymeErrors} errors)</p>
        <p>Sound: {renderErrorBar(poem.soundErrors)} ({poem.soundErrors} errors)</p>
      </div>

      <button className="btn-primary" onClick={handlePractice}>
        PRACTICE THIS POEM
      </button>

      <p className="last-practiced">
        Last practiced: {formatDate(poem.lastPracticed)}
      </p>
    </div>
  );
}

function getMasteryLabel(progress) {
  if (progress >= 80) return 'Excellent';
  if (progress >= 60) return 'Strong';
  if (progress >= 40) return 'Learning...';
  return 'Getting Started';
}

function renderErrorBar(count) {
  const max = 10;
  return [...Array(max)]
    .map((_, i) => (i < count ? '▓' : '░'))
    .join('');
}
```

### 4. Practice Entry Popup

```jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export function PracticeEntryPopup() {
  const { poemId } = useParams();
  const [choice, setChoice] = useState('continue');
  const [toggles, setToggles] = useState({
    meter: true,
    rhyme: true,
    sound: false,
    text: true,
  });
  const [lastSession, setLastSession] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch user's last session state for this poem
    fetch(`/api/sessions/${poemId}/last`)
      .then((res) => res.json())
      .then((data) => setLastSession(data));
  }, [poemId]);

  const handleStart = () => {
    const config = {
      poemId,
      choice,
      toggles: choice === 'fresh' ? { meter: false, rhyme: false, sound: false, text: true } : toggles,
    };
    navigate(`/practice/${poemId}`, { state: config });
  };

  const handleToggleChange = (layer) => {
    if (layer === 'text') return; // Text always on
    setToggles({
      ...toggles,
      [layer]: !toggles[layer],
    });
  };

  return (
    <div className="practice-entry-modal">
      <h2>HOW DO YOU WANT TO PRACTICE?</h2>

      <div className="option-group">
        <input
          type="radio"
          id="continue"
          name="choice"
          value="continue"
          checked={choice === 'continue'}
          onChange={(e) => setChoice(e.target.value)}
        />
        <label htmlFor="continue">
          <strong>Continue from where I left off</strong>
          <p>Restore your previous toggles:</p>
          {lastSession && (
            <div className="toggles">
              {['meter', 'rhyme', 'sound', 'text'].map((layer) => (
                <label key={layer} className="inline-toggle">
                  <input
                    type="checkbox"
                    checked={toggles[layer] || (layer === 'text')}
                    onChange={() => handleToggleChange(layer)}
                    disabled={layer === 'text' || choice !== 'continue'}
                  />
                  {layer.charAt(0).toUpperCase() + layer.slice(1)}
                </label>
              ))}
            </div>
          )}
        </label>
      </div>

      <div className="option-group">
        <input
          type="radio"
          id="fresh"
          name="choice"
          value="fresh"
          checked={choice === 'fresh'}
          onChange={(e) => setChoice(e.target.value)}
        />
        <label htmlFor="fresh">
          <strong>Fresh Start</strong>
          <p>All aids off (full challenge):</p>
          <div className="toggles">
            <label className="inline-toggle">
              <input type="checkbox" checked={false} disabled />
              Meter
            </label>
            <label className="inline-toggle">
              <input type="checkbox" checked={false} disabled />
              Rhyme
            </label>
            <label className="inline-toggle">
              <input type="checkbox" checked={false} disabled />
              Sound
            </label>
            <label className="inline-toggle">
              <input type="checkbox" checked={true} disabled />
              Text
            </label>
          </div>
        </label>
      </div>

      <div className="option-group">
        <input
          type="radio"
          id="custom"
          name="choice"
          value="custom"
          checked={choice === 'custom'}
          onChange={(e) => setChoice(e.target.value)}
        />
        <label htmlFor="custom">
          <strong>Custom</strong>
          <p>Choose your own:</p>
          {choice === 'custom' && (
            <div className="toggles">
              {['meter', 'rhyme', 'sound', 'text'].map((layer) => (
                <label key={layer} className="inline-toggle">
                  <input
                    type="checkbox"
                    checked={toggles[layer] || (layer === 'text')}
                    onChange={() => handleToggleChange(layer)}
                    disabled={layer === 'text'}
                  />
                  {layer.charAt(0).toUpperCase() + layer.slice(1)}
                </label>
              ))}
            </div>
          )}
        </label>
      </div>

      <button className="btn-primary" onClick={handleStart}>
        START PRACTICE
      </button>
      <button className="btn-secondary" onClick={() => navigate(-1)}>
        Cancel
      </button>
    </div>
  );
}
```

### 5. Practice Screen (Annotation View)

```jsx
import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';

export function PracticeScreen() {
  const { poemId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const config = location.state || {};

  const [poem, setPoem] = useState(null);
  const [currentLineIdx, setCurrentLineIdx] = useState(0);
  const [mode, setMode] = useState('meter'); // meter, rhyme, sound, mixed
  const [layers, setLayers] = useState({
    meter: config.toggles?.meter || true,
    rhyme: config.toggles?.rhyme || true,
    sound: config.toggles?.sound || false,
    text: config.toggles?.text || true,
  });
  const [answers, setAnswers] = useState({});
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    fetch(`/api/poems/${poemId}`)
      .then((res) => res.json())
      .then((data) => setPoem(data));
  }, [poemId]);

  if (!poem) return <div>Loading...</div>;

  const line = poem.lines[currentLineIdx];
  const progress = currentLineIdx + 1;

  const handleStressDotToggle = (syllableIdx) => {
    if (mode !== 'meter') return;
    const key = `meter-${currentLineIdx}`;
    const current = answers[key] || [];
    const updated = [...current];
    updated[syllableIdx] = !updated[syllableIdx];
    setAnswers({ ...answers, [key]: updated });
  };

  const handleRhymeInput = (letter) => {
    const key = `rhyme-${currentLineIdx}`;
    setAnswers({ ...answers, [key]: letter });
  };

  const handleLayerToggle = (layer) => {
    if (layer === 'text') return;
    setLayers({ ...layers, [layer]: !layers[layer] });
  };

  const handleNext = () => {
    // Validate answer, give feedback
    const correct = validateAnswer(currentLineIdx, mode, answers);
    setFeedback(correct ? '✓ Correct!' : '✗ Try again');

    setTimeout(() => {
      if (currentLineIdx < poem.lines.length - 1) {
        setCurrentLineIdx(currentLineIdx + 1);
        setFeedback('');
      } else {
        // End of session
        navigate(`/session-summary/${poemId}`, { state: { answers } });
      }
    }, 1000);
  };

  return (
    <div className="practice-screen">
      <div className="top-bar sticky">
        <button onClick={() => navigate('/menu')}>← {poem.title}</button>
        <div className="progress-dots">
          {[...Array(poem.lines.length)].map((_, i) => (
            <span
              key={i}
              className={`dot ${i <= currentLineIdx ? 'filled' : ''}`}
            />
          ))}
        </div>
      </div>

      <div className="poem-display">
        <p className="line-counter">
          LINE {progress} OF {poem.lines.length}
        </p>

        <div className="poem-content">
          {poem.lines.map((poemLine, idx) => (
            <div
              key={idx}
              className={`line ${idx === currentLineIdx ? 'current' : ''}`}
            >
              <span className="line-number">{idx + 1}.</span>
              <span className="text">{poemLine.text}</span>

              {layers.meter && (
                <div className="meter-dots">
                  {poemLine.syllables.map((syl, sIdx) => (
                    <button
                      key={sIdx}
                      className={`stress-dot ${
                        answers[`meter-${idx}`]?.[sIdx] ? 'filled' : 'hollow'
                      }`}
                      onClick={() => {
                        if (idx === currentLineIdx) {
                          handleStressDotToggle(sIdx);
                        }
                      }}
                    >
                      {answers[`meter-${idx}`]?.[sIdx] ? '●' : '○'}
                    </button>
                  ))}
                </div>
              )}

              {layers.rhyme && (
                <div className="rhyme-letter">
                  {idx === currentLineIdx ? (
                    <input
                      type="text"
                      maxLength="1"
                      value={answers[`rhyme-${idx}`] || ''}
                      onChange={(e) => handleRhymeInput(e.target.value.toUpperCase())}
                      autoFocus
                      placeholder="?"
                    />
                  ) : (
                    <span>{answers[`rhyme-${idx}`] || '—'}</span>
                  )}
                </div>
              )}

              {layers.sound && poemLine.soundPatterns && (
                <div className="sound-highlights">
                  {poemLine.soundPatterns.map((pattern, pIdx) => (
                    <span
                      key={pIdx}
                      className="sound-highlight"
                      style={{ backgroundColor: pattern.color }}
                    >
                      {pattern.text}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {feedback && <p className="feedback">{feedback}</p>}
      </div>

      <div className="bottom-fixed-bar sticky">
        <div className="mode-selector">
          {['Meter', 'Rhyme', 'Sound', 'Mixed'].map((m) => (
            <button
              key={m}
              className={`mode-btn ${mode === m.toLowerCase() ? 'active' : ''}`}
              onClick={() => setMode(m.toLowerCase())}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="layer-toggles">
          {['meter', 'rhyme', 'sound'].map((layer) => (
            <label key={layer} className="toggle-label">
              <input
                type="checkbox"
                checked={layers[layer]}
                onChange={() => handleLayerToggle(layer)}
              />
              {layer.charAt(0).toUpperCase() + layer.slice(1)}
            </label>
          ))}
        </div>

        <button className="btn-primary" onClick={handleNext}>
          {currentLineIdx === poem.lines.length - 1 ? 'FINISH' : 'NEXT'}
        </button>
      </div>
    </div>
  );
}

function validateAnswer(lineIdx, mode, answers) {
  // Simple validation; expand per your grading logic
  if (mode === 'meter') {
    const key = `meter-${lineIdx}`;
    // Compare to poem.lines[lineIdx].expectedMetrics
    return true; // Placeholder
  }
  return true;
}
```

---

## PART 9: ACCESSIBILITY (Mobile)

**WCAG 2.1 AA Compliance:**

1. **Color Contrast:**
   - All text: 4.5:1 for normal, 3:1 for large text
   - Interactive elements: Visible focus indicators

2. **Touch Targets:**
   - Minimum 48×48 px
   - Spacing between targets: 8px

3. **Keyboard Navigation:**
   - All interactive elements reachable via Tab
   - Escape to close modals
   - Enter to submit forms

4. **Screen Readers:**
   - Semantic HTML (`<button>`, `<label>`)
   - ARIA labels for icons
   - Form fields have associated `<label>` tags

5. **Motion/Animation:**
   - Respect `prefers-reduced-motion` media query
   - No autoplay, no flashing

---

## PART 10: IMPLEMENTATION CHECKLIST FOR DEVELOPERS

**React Components to Build:**
- [ ] `LaunchPopup.jsx` — Entry point
- [ ] `Menu.jsx` — My Poems list + nav
- [ ] `PoemDashboard.jsx` — Progress + metadata
- [ ] `PracticeEntryPopup.jsx` — Layer selection
- [ ] `PracticeScreen.jsx` — Main annotation view
- [ ] `PoemDisplay.jsx` — Reusable poem renderer
- [ ] `ProgressRing.jsx` — Circular progress (Meter, Rhyme, Sound)
- [ ] `AnnotationDots.jsx` — Stress marking UI
- [ ] `RhymeInput.jsx` — Rhyme letter editor
- [ ] `SoundPalette.jsx` — Color picker for sound patterns

**State Management:**
- [ ] Redux or Context API for user prefs + session state
- [ ] localStorage for "Don't ask me again" + zoom level
- [ ] API calls for poems, sessions, progress

**Styling:**
- [ ] CSS-in-JS (styled-components) or Tailwind for mobile-first
- [ ] Design tokens (colors, spacing, typography)
- [ ] Responsive breakpoints (320px, 480px, 768px, 1024px)

**Testing:**
- [ ] Unit tests for annotation logic
- [ ] E2E tests for navigation flow
- [ ] Mobile device testing (iPhone SE, Pixel 4, iPad Air)
- [ ] Accessibility audit (axe DevTools, WAVE)

---

## PART 11: PHASED ROLLOUT

**Phase 1 (MVP, 2 weeks with Cursor):**
- ✅ Launch popup → Menu → Dashboard → Practice Entry → Practice Screen
- ✅ Meter annotation (stress dots)
- ✅ Rhyme annotation (letter input)
- ✅ Sound patterns (UI structure, not full feature)
- ✅ Layer toggles + Mode selector
- ✅ Mobile-responsive layout
- ✅ SM-2 scheduling (backend)

**Phase 1.5 (Polish, Week 3):**
- ✅ Animations + transitions
- ✅ Haptic feedback
- ✅ Accessibility audit + fixes
- ✅ Error handling + edge cases

**Phase 2 (Dictaphone + Advanced):**
- Microphone icon + audio recording
- Playback + recitation feedback
- Gesture support (swipe to next line)
- Offline mode (if needed)
- Dark mode support

---

## SUMMARY: FROM SKETCH TO CODE

You now have:

✅ **Complete navigation architecture** (launch → menu → dashboard → practice)  
✅ **5 core screens** fully specified (layouts, components, interactions)  
✅ **Mobile-first design system** (colors, typography, spacing)  
✅ **Touch gestures & haptics** (tap, long-press, swipe, haptic feedback)  
✅ **5 React component skeletons** ready for Cursor to expand  
✅ **Accessibility standards** (WCAG AA compliance)  
✅ **Responsive design** (mobile, tablet, desktop)  
✅ **Implementation checklist** for dev team  

**Hand this to your dev team with your 8 existing documents. Cursor can now generate the full React app from these specs + the component sketches.**

**Timeline: 1.5–2 weeks (50–70 hours with Cursor + human review).**

Ready to ship. 🚀
