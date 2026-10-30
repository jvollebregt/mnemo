# Mnemo

A page that slowly forgets a poem, so that you learn it by heart. The full concept, the learning journey and the build path are in `docs/SPEC.md`. Draft lessons are in `docs/lessons-draft.md`. Read both before planning a milestone.

The owner is Joos. Design decisions below are hers or agreed with her; don't overturn them in code. If a milestone seems to need a different decision, stop and ask.

## Commands

```sh
npm ci            # install
npm run dev       # local dev server
npm run typecheck
npm run lint
npm test          # Vitest
npm run build     # tsc + Vite build into dist/ (Capacitor's webDir)
```

CI runs typecheck, lint, test and build on every PR. Keep them green.

## Stack

- React + TypeScript + Vite, packaged with Capacitor as a paid iOS/Android store app. The native projects are in `ios/` and `android/`; after a web change run `npm run build && npx cap sync`. Listening and recording on the phone go through our own small plugin in `native/ear` (on-device recognition only).
- No accounts, no server, no Supabase. Everything lives on the phone: SQLite for poems, marks and schedule, and audio in the app's own storage. Backup is the OS backup plus an export file.
- Every change to stored data ships with a migration in `src/store/migrations.ts` and a test in `migrations.test.ts` that migrates real data from the version before. Migrations are only ever added, never edited.
- Storage goes through the small `Db` interface (`src/store/db.ts`): the Capacitor SQLite plugin on the phone, sql.js in the browser build and in tests.
- `ts-fsrs` for scheduling, per line and per stanza.
- Vitest for unit tests. Playwright later for flows.
- `docs/archive/` is history; don't build from it. The old Bolt app is a reference only and is not in this repo. Never commit a `.env` or any key.

## The page (look and feel)

- It should look like a printed page, not an app. Paper `--paper #FCFBF7` (light, near-white, never brown), ink `--ink #1E1B17`, one pencil colour, blue `--pencil #2E5A88` (Joos, 2026-10-29: red read as a correction), grey `--grey #6B6358`, traces `--trace #B9B1A3`. These tokens live in `src/styles/page.css`.
- Type is EB Garamond. Actions are lower-case words set in small capitals, with no boxes.
- No cards, icons, emoji, badges, pills, gradients, shadows, progress rings, streaks or percentages. If a screen needs one of these to make sense, rethink the screen.
- Mobile first: design at 390px wide, with 44px touch targets and safe-area insets. Larger screens just get more margin.
- Sheets and popups close with *put it away* at their foot (a word, never a ×), a tap outside them, or a swipe down.

## Long lines

- Never present a wrapped line as a new verse line. A poet's line is one unit for line numbers, fading, peeking, recall and scheduling.
- Fit to measure first: set the poem once at the largest size where most lines fit, down to about 15px. Lines that still don't fit turn over with a hanging indent, as a printed book does.
- Line numbers count only the poet's lines, and appear only on the proof when adding a poem. While learning, the reader goes by stanza numerals, so the page shows no line numbers (Joos, 2026-10-28).

## The method (in order, per stanza)

1. **Read.**
2. **Mark what you hear**, with three tools: *beats · echoes · pauses*.
3. **Fade the words** to first letters, with the rest a faint trace of the same length. Marks and *marked* pauses stay. Unmarked punctuation fades with the words.
4. **Marks only.**
5. **Fade the marks**, leaving only traces of the line shapes.
6. **Blank page**, which is also the check: recite aloud (or type), words come back in ink as you get them and misses in pencil, then rate *not yet · most of it · all of it*. There is no separate check step (Joos, 2026-10-28).

While marking, the whole poem is on the page: the stanza in hand in ink, the others faint, each with its numeral in the margin. Tapping a faint stanza moves the pencil there (no *next stanza* label; Joos, 2026-10-29), so the whole poem can be marked first (Joos, 2026-10-28). *fade the words* fades the stanza in hand, or the nearest marked one above (else below) if it has no marks yet; after it, the app goes on with the first stanza not yet learned, and seams and chains join only stanzas already learned (Joos, 2026-10-29). From stanza two on, the stanzas so far are chained, with extra practice on the seams. A peek is always possible and counts against the schedule. While the marks show, a first tap on an underlined word brings back only its underlined letters and lets the words sharing that sound stand out; the next tap brings the whole word (Joos, 2026-10-30). Whatever the user didn't mark never appears during the fade.

## The pencil

- **Beats:** one tap on a syllable marks it as stressed (ˊ), and a second tap removes it. While a line is being marked, nothing else is shown. When the user moves to another line, taps empty paper, switches tool or leaves the stage, that line *settles*: every unmarked syllable gets a light mark (˘), which keeps the syllable count visible. A settled line stays settled. Tapping a ˘ turns it into a beat, and tapping a beat turns it back.
- **Echoes:** marked per letter, not per syllable. The user draws under letters, the stroke snaps to letter edges, and a pale preview shows it live. While drawing, a magnifier strip at the top shows the line enlarged. Tapping an existing underline erases that whole echo. There's no eraser tool. Families are told apart by underline style, never by colour, and the other families dim while one is being worked on. Each sound keeps its style for the whole poem, from ten (dotted, dashed, double, wavy, solid, dash-dot, and doubled dotted, dashed, wavy and dash-dot; thick and long dashes were too like solid and dashed); past ten a style is lent again from the sound marked furthest away. The bar shows a pen per sound in use plus one fresh pen, and above it the words the pen in hand has underlined, so the reader can tell pens apart (Joos, 2026-10-30).
- **Rhyme letters** in the margin appear only when one echo family closes at least two lines, and only on lines the user marked. Never fill in a rhyme scheme ahead of the user. Free verse gets no letters.
- **Pauses:** tap punctuation to mark it. In the app, pauses can also go where there is no punctuation.
- **The app never judges sounds.** Accents and historical pronunciations differ, so the app only stores the user's own groupings. Pronunciation data is used for syllable splitting only (CMUdict for English, hyphenation patterns for Dutch). A tap snaps to the vowel under the finger, and a long press fixes a wrong split. Never show suggested stresses before the user marks: the marking is the learning.

## Teaching

- The app teaches along the way, never up front. There's no tutorial, manual or onboarding carousel.
- The first time a tool is picked, a short lesson opens in a bottom sheet. It closes on a tap outside and ends with an optional *more about this* (feet, meter by name).
- Margin notes are shown once each, at the moment they're needed, and a "seen" record is kept.
- Core lessons avoid jargon: describe shapes as DUM-da and da-DUM, not "trochee" and "iamb". Names belong in *more about this*.
- Lessons draw on Mary Oliver's *A Poetry Handbook* and *Rules for the Dance*, but those are in copyright. Write in our own words, with short attributed quotes at most. Joos co-writes and approves the lesson texts, so don't invent final lesson copy in code; use the drafts and mark them as drafts. Lesson texts live in `src/i18n/lessons/` (`draft: true` until Joos approves them).

## Words in the interface

- The contents page shows one phrase per poem: *taking root* (learning), *fading* (due today, in pencil), or *by heart* (mastered). There are no numbers.
- Each stanza's numeral sits in the margin beside it (no row at the foot; Joos, 2026-10-29) and takes the same states in tone: faint before the first recital, grey while taking root, pencil when fading (due, or last rated *not yet* or *most of it*), ink when by heart. The stanza in hand is underlined (Joos, 2026-10-28). The first page shows the whole poem in ink, to scroll through; marking shows it with the other stanzas faint, opens on the stanza in hand, and the stanza in hand follows the scroll (the one across the reading line turns to ink); a stanza moved to by a tap scrolls only as far as needed to bring it into view; from fading on, the other stanzas are only faint traces of their line shapes (no words, no marks), and the stanza's numeral leads back to the whole poem (Joos, 2026-10-29).
- Use the agreed labels: *add a poem*, *mark what you hear*, *fade the words*, *marks only*, *fade the marks*, *blank page*, *beats · echoes · pauses*, *put down*. An empty add-a-poem sheet offers only *paste*, which reads the clipboard in one tap; once there are words it gives way to *set the page* (Joos, 2026-10-30).
- English and Dutch from the start. Every string lives in `src/i18n/en.ts` and `src/i18n/nl.ts`, and a test checks they have the same keys. Never hard-code interface text in components.
- The interface language and a poem's own language are separate settings.
- Dutch lessons are rewritten with Dutch public-domain examples (Gezelle, Gorter, Kloos), not translated.

## Recite and recordings

- Recitation is checked with on-device speech recognition, aligned word by word to the text. Misses show in pencil, and the user can tap a word to say "I did say that". Speaking is the default; typing always stays available as an option, so the app works fully for someone who can't or would rather not speak.
- Audio is discarded after checking by default. Optionally, keep one latest recital per poem (compressed voice, about 150 KB a minute). Settings shows the space used, with *clear recordings*.

## Working here

- Work through the milestones in `docs/SPEC.md` §7. Plan first, then build with tests. Run typecheck, lint, test and build locally, and push only when a milestone (or a batch of fixes) is finished, so CI runs once rather than per fix. A new milestone can go on the PR that is still open instead of a new PR (Joos, 2026-10-28).
- Pure logic (parsing, syllables, marks, fading, scheduling) goes in plain TypeScript modules with unit tests, kept apart from React.
- Match the existing code: small modules, named exports, comments only where the why isn't obvious.
