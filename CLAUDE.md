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
- A stanza longer than eight lines (a speech from a play, blank verse, a sonnet set as one block) is learned in passages of four to eight lines, cut where sentences end (`src/poem/passages.ts`). Each passage is a stanza for numerals, marking, fading, chains and the schedule, but the page adds no blank line between them (Joos, 2026-10-30).
- What is learned at a time is a *part* (still called a stanza in the code): a short poem (up to twelve lines and about sixty words) is learned whole, and stanzas of one to three lines are joined to the next until a part has four lines or more, never past eight (`src/poem/parts.ts`). The page keeps the poet's blank lines inside a part (Joos, 2026-10-31).

## The method (in order, per stanza)

1. **Read.**
2. **Mark what you hear**, with three tools: *beats · echoes · pauses*.
3. **Fade the words** to first letters, with the rest a faint trace of the same length. Marks and *marked* pauses stay. Unmarked punctuation fades with the words, to a faint copy of itself rather than a trace line, so it isn't taken for a missing letter; on *fade the marks*, and in the faint stanzas, all punctuation, marked or not, is a trace line with the letters (Joos, 2026-10-31).
4. **Marks only.**
5. **Fade the marks**, leaving only traces of the line shapes.
6. **Recite**, the real try and the only page where the app listens: nothing on the page (no traces, no peeking, not even the other stanzas), only the numerals and, faint, the line before where the recital starts. Recite aloud (or type); each word comes back in ink in its place as it is said, with its punctuation, a word gone past without being said shows in pencil at once, and nothing is written out at the foot. A word is only placed in the line being said or the next, or further on once three are said in a row there; something said that doesn't fit turns the word due to pencil at once, and back to ink if it is said after all (Joos, 2026-10-31). While listening the foot says *pause · done*; a tap anywhere pauses (*go on · done*), and a tap on a line already said takes it again from there. *done* shows what you got, then the question *How much of it did you know?* over *not yet · most of it · all of it*, with *again* alone on a row below (*again* clears the page for another try; nothing is saved until a rating; Joos, 2026-10-31); a tap on a word in pencil shows what was heard there, with *I said that*. There is no separate check step (Joos, 2026-10-28; recite, 2026-10-31).

While marking, the whole poem is on the page: the stanza in hand in ink, the others faint, each with its numeral in the margin. Tapping a faint stanza moves the pencil there (no *next stanza* label; Joos, 2026-10-29), so the whole poem can be marked first (Joos, 2026-10-28). *fade the words* fades the stanza in hand, or the nearest marked one above (else below) if it has no marks yet; after it, the app goes on with the first stanza not yet learned (Joos, 2026-10-29). From the second part on, its recital takes in the parts learned before it, from the top (from part five on, from two parts back), so every join is practised; there are no separate seam or chain steps. Before a recital begins, a tap on a later numeral starts it there, and once some of the poem is learned, *recite* on the first page recites the whole poem. One rating: the part in hand takes it, every other part recited is graded by its misses (Joos, 2026-10-31). On the practice pages a tap brings back the whole word (underlined or not), a finger drawn along a line brings back every word it passes (or, starting on a word already back, lets them go; a stroke starting beside the words does what the first word it reaches needs; turning back by about a word without lifting the finger undoes what it passes over; a quick stroke misses nothing; punctuation comes and goes with its word), and the other stanzas can be read the same way; peeks there don't count against the schedule (Joos, 2026-10-31). Whatever the user didn't mark never appears during the fade. Once a later page has been reached with the stanza in hand, its name stays at the foot on going back, so the reader can return without going through every page again; on the first page, *recite* then returns to the recital left (Joos, 2026-10-31).

## The pencil

- **Beats:** one tap on a syllable marks it as stressed (ˊ), and a second tap removes it. While a line is being marked, nothing else is shown. When the user moves to another line, taps empty paper, switches tool or leaves the stage, that line *settles*: every unmarked syllable gets a light mark (˘), which keeps the syllable count visible. A settled line stays settled. Tapping a ˘ turns it into a beat, and tapping a beat turns it back. A tap that misses the letters goes to the nearest syllable: the space above a line, where its beats stand, belongs to that line (Joos, 2026-10-30).
- **Echoes:** marked per letter, not per syllable. The user draws under letters, the stroke snaps to letter edges, and a pale preview shows it live. While drawing, a magnifier strip at the top shows the line enlarged. Tapping an existing underline erases that whole echo. There's no eraser tool. A tap underlines a single letter, and a thumb that rolls a little as it taps still counts as a tap (Joos, 2026-10-30). Families are told apart by underline style, never by colour, and the other families dim while one is being worked on, in the stanza in hand only; faint stanzas stay evenly faint (Joos, 2026-10-30). Each sound keeps its style for the whole poem, from ten (dotted, dashed, double, wavy, solid, dash-dot, and doubled dotted, dashed, wavy and dash-dot; thick and long dashes were too like solid and dashed); past ten a style is lent again from the sound marked furthest away. The bar shows a pen per sound in use plus one fresh pen, and above it the words the pen in hand has underlined, so the reader can tell pens apart (Joos, 2026-10-30).
- **Rhyme letters** in the margin appear only when one echo family closes at least two lines, and only on lines the user marked. Never fill in a rhyme scheme ahead of the user. Free verse gets no letters.
- **Pauses:** tap punctuation to mark it. In the app, pauses can also go where there is no punctuation.
- **The app never judges sounds.** Accents and historical pronunciations differ, so the app only stores the user's own groupings. Pronunciation data is used for syllable splitting only (CMUdict for English, hyphenation patterns for Dutch). A tap snaps to the vowel under the finger, and a long press fixes a wrong split. Never show suggested stresses before the user marks: the marking is the learning.

## Teaching

- The app teaches along the way, never up front. There's no tutorial, manual or onboarding carousel.
- The first time a tool is picked, a short lesson opens in a bottom sheet, its *Try it* line first so what to do is above the fold. It closes on a tap outside and ends with an optional *more about this* (feet, meter by name) (Joos, 2026-10-30).
- Margin notes are shown once each, at the moment they're needed, and a "seen" record is kept.
- Core lessons avoid jargon: describe shapes as DUM-da and da-DUM, not "trochee" and "iamb". Names belong in *more about this*.
- Lessons draw on Mary Oliver's *A Poetry Handbook* and *Rules for the Dance*, but those are in copyright. Write in our own words, with short attributed quotes at most. Joos co-writes and approves the lesson texts, so don't invent final lesson copy in code; use the drafts and mark them as drafts. Lesson texts live in `src/i18n/lessons/` (`draft: true` until Joos approves them).

## Words in the interface

- The contents page shows one phrase per poem: *taking root* (learning), *fading* (due today, in pencil), or *by heart* (mastered). There are no numbers.
- Each stanza's numeral sits in the margin beside it (no row at the foot; Joos, 2026-10-29) and takes the same states in tone: faint before the first recital, grey while taking root, pencil when fading (due, or last rated *not yet* or *most of it*), ink when by heart. The stanza in hand is underlined (Joos, 2026-10-28). The first page shows the whole poem in ink, to scroll through; marking shows it with the other stanzas faint, opens on the stanza in hand, and the stanza in hand follows the scroll (it stays in hand while it crosses a band around the reading line; once it leaves the band, the one across the line turns to ink, so each stanza is passed in turn either way; a stanza just tapped is held until it reaches the band; Joos, 2026-10-31); a stanza moved to by a tap scrolls only as far as needed to bring it into view; from fading on, the other stanzas are only faint traces of their line shapes (no words, no marks), drawn as a fine line through where the letters stood so they are never taken for echoes, and the stanza's numeral leads back to the whole poem; at the recital the other stanzas aren't shown at all (Joos, 2026-10-29; traces and recital, 2026-10-31).
- Use the agreed labels: *add a poem*, *mark what you hear*, *fade the words*, *marks only*, *fade the marks*, *recite* (Dutch *voordragen*; it was *blank page*, Joos, 2026-10-31), *beats · echoes · pauses*, and *back* to leave the pencil (it was *put down*), set beside *fade the words* (Joos, 2026-10-30). A swipe in from the left edge goes back, as the word at the top left does (Joos, 2026-10-30). The empty contents page says the method in one line in those words: *Mark what you hear, fade the words, and say it by heart.* *remove this poem* lives on the page that corrects a poem, not on the reading page (Joos, 2026-10-30). An empty add-a-poem sheet offers only *paste*, which reads the clipboard in one tap; once there are words it gives way to *set the page* (Joos, 2026-10-30).
- English and Dutch from the start. Every string lives in `src/i18n/en.ts` and `src/i18n/nl.ts`, and a test checks they have the same keys. Never hard-code interface text in components.
- The interface language and a poem's own language are separate settings.
- Dutch lessons are rewritten with Dutch public-domain examples (Gezelle, Gorter, Kloos), not translated.

## Recite and recordings

- Recitation is checked with on-device speech recognition, aligned word by word to the text. The recogniser is told the words of the lines being recited, so rare words are heard as themselves; there is no accent setting (Joos, 2026-10-31). Misses show in pencil, and the user can tap one to see what was heard and say *I said that*. Speaking is the default; typing always stays available as an option, so the app works fully for someone who can't or would rather not speak.
- Audio is discarded after checking by default. Optionally, keep one latest recital per poem (compressed voice, about 150 KB a minute). Settings shows the space used, with *clear recordings*.

## Working here

- Work through the milestones in `docs/SPEC.md` §7. Plan first, then build with tests. Run typecheck, lint, test and build locally, and push only when a milestone (or a batch of fixes) is finished, so CI runs once rather than per fix. A new milestone can go on the PR that is still open instead of a new PR (Joos, 2026-10-28).
- Pure logic (parsing, syllables, marks, fading, scheduling) goes in plain TypeScript modules with unit tests, kept apart from React.
- Match the existing code: small modules, named exports, comments only where the why isn't obvious.
