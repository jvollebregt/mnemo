# MNEMO: the next version, rethought

*2026-10-28. Replaces the earlier draft plan; updated with prosody as the fading scaffold. This version starts from the learning journey and the page, not from the Dec 2025 specs or the Bolt screens.*

## 1. The idea in one paragraph

MNEMO is a single sheet of paper that slowly forgets the poem, so that you have to remember it. You read a stanza and mark what you hear (beats, echoes and pauses). Then the words fade while your marks stay, so you rebuild each line from its rhythm. Finally the marks fade too, and you bring the stanza back from memory. The app teaches you how to do this in the margin, one short note at a time, at the moment you need it. There are no dashboards, cards, badges or settings screens to learn first. Everything happens on the page.

## 2. Design principles

1. **The page is the interface.** One column of text with real margins, the way a poem is printed in a good book. Controls are words in small caps at the foot of the page or notes in the margin, never buttons, pills, toggles or icons.
2. **Ink and pencil.** A light, near-white paper (not an old brown book). Two materials only: black ink for the poem, and a muted red "pencil" for corrections, marks and anything you did. Faded text is literally lighter ink. Nothing glows, slides or bounces.
3. **Teach in the margin, once.** Each technique is introduced by a single italic margin note the first time it matters ("The first letters stay. They're enough to pull a line back."). It never repeats once you've used the technique. No tutorial, no onboarding carousel.
4. **The poet's lines are sacred.** A line of verse is never broken into something that looks like two lines (see §4).
5. **Quiet about progress.** No streaks, percentages or progress rings. The contents page says one word or phrase per poem: *taking root* (learning), *fading* (due for review today), or *by heart* (mastered). The schedule does its work out of sight.
6. **Mobile first.** Designed for a phone held in one hand. The thumb reaches the foot-of-page actions, and the page scrolls like paper. On a tablet or desktop it's the same page with wider margins, not a different layout.
7. **Not an "AI app".** No gradients, rounded cards, drop shadows, emoji or sans-serif UI chrome. One book typeface (EB Garamond or similar) in roman, italic and small caps, and the paper colour.

## 3. The journey (what teaches what, and when)

| Moment | What you see | What it teaches, in the margin |
|---|---|---|
| **First open** | A blank page: *"Add a poem you want to know by heart."* Below it, three short poems from a small public-domain anthology, to try first. | Nothing yet. No account needed. |
| **Read** | The first stanza, in full ink. | *"Read it aloud, slowly, twice. Hearing yourself say it is half the work."* |
| **Pencil** | Tap *mark what you hear*, choose *beats · echoes · pauses* and mark the stanza with your finger. The pencil snaps to the text: a tap or tick on a stressed syllable becomes a beat (tap again to remove). When you move on to the next line, tap empty paper, switch tool or leave the pencil, the line you just marked settles (and stays settled): its other syllables get a light mark (˘) automatically. Nothing is pre-marked while you're still listening, so the syllable count stays visible and a wrong syllable split shows up at once, a stroke under letters joins exactly those letters to an echo family (the s of *sings*, the *ou* of *soul*, the *eard* of *heard*: echoes live inside syllables, so marking is per letter; while drawing, the line appears enlarged at the top so the finger never hides it, and tapping an underline rubs it out), a tap on punctuation marks it as a pause. Whatever you don't mark never appears in the fading. | The first time you pick each tool, a short lesson opens from the bottom of the page (see `lessons-draft.md`). It can be reopened via *about beats/echoes/pauses*, and closes when you tap outside it. Each lesson ends with an optional *more about this* that goes deeper (names of feet, meter) and, later, a link to a trusted outside lesson. |
| **Words fade** | The words drop to first letters (the rest becomes a faint trace of the same length, so the line keeps its shape). Your marks stay, including the pauses you marked. Punctuation you didn't mark fades with the words, so marking pauses is what makes you notice them. | *"The words fade; your marks stay. First letters and rhythm are enough to pull a line back."* |
| **Marks only** | Only your marks (beats, echoes, pauses) remain over blank traces. | *"Rebuild each line from its beats, its sounds and its pauses."* |
| **Marks fade** | Only faint traces show the shape of the lines and words. | *"Now the marks go too. Only the shape of the lines is left."* |
| **Blank page** | Nothing at all, not even the traces: the real condition of reciting to someone. | *"A blank page, as when you recite to someone."* |
| **Peek** | Tap a faded word and it comes back in pencil. | First peek: *"Peeking is fine. The words you peek at are the ones we'll come back to."* |
| **Recite** | A blank stanza. Say it (or type it). Words reappear in ink as you get them right, and missed ones appear in pencil. | First time: *"Missing a word is useful. That's where memory is built."* |
| **Chain** | After stanza 2, stanzas 1 and 2 together, then 1 to 3. The join between stanzas gets its own practice. | *"Now the two together. The seam between stanzas is where recitals usually break."* |
| **Stop** | After about 10 minutes: *"That's enough for today. Tomorrow it will feel half-gone. That's the point."* | Why spacing works, in one sentence. |
| **Return** | The contents page: titles with dotted leaders and one word each (*taking root*, *fading*, *by heart*). Opening a *fading* poem starts with recall, never rereading. | *"Try it before you look. Remembering is what makes it stick."* |
| **By heart** | A stanza that's recalled cleanly on several days is *by heart*. Its reviews spread out to weeks and months. | |

## 4. Long lines without false enjambment

On a phone, a Whitman line won't fit at a readable size. The rules:

1. **Fit first.** Per poem, choose the largest type size (down to about 15 px) at which the longest line fits the measure. Every line of the poem uses that same size.
2. **Then turn over, visibly.** If a line still doesn't fit, its continuation is set as a *turnover*: deeply indented with a hanging indent and a small pencil bracket, the way printed poetry has always done it, so it never reads as a new verse line. Line numbers in the margin count only real lines.
3. **Landscape helps.** Turning the phone sideways widens the measure, and turnovers disappear when the line fits.
4. **Learning units follow the poet.** Fading, peeking and recall work on real lines and stanzas. A turnover is never treated as a separate line.

## 4a. Syllables without a perfect detector

There is no perfect syllable detector, and the pencil must not depend on one.
- **English:** the CMU Pronouncing Dictionary (~130,000 words) gives syllables and dictionary stress. Hyphenation patterns cover the rest.
- **Dutch:** hyphenation patterns split syllables reliably. There's no stress dictionary, but Dutch stress is fairly regular.
- **When it's wrong** (names, rare or archaic words like *learn'd*): a tap snaps to the vowel sound under the finger, not to a precomputed syllable, so a stress mark can always land where the reader hears it. A long press on a word lets the reader split or join its syllables by hand, and the correction is stored with the poem.
- Suggested stresses are never shown before the reader marks. The marking is the learning.

## 4b. Sound families on paper

Rhyme is treated as part of *sound*, following Mary Oliver's handbooks: alliteration, assonance, consonance and rhyme are all echoes. One poem can hold several families, so instead of colour each family gets its own pencil underline: dotted, dashed, double, wavy or solid. When you mark a sound that closes a line, its letter (a, b, c) appears in the right margin, but only once that same sound closes at least two lines, so poems without end rhyme never get letters. Unmarked lines get no letter, so the scheme is never filled in ahead of you; it builds up as you hear it. While you work on one family, the others go pale. If five underline styles ever prove too few, a single second pencil colour (blue) is the limit.

## 5. Memory science underneath (now out of sight)

- **Prosody as the last scaffold.** Meter, rhyme, sound and punctuation narrow what can come next in a line (Rubin's work on oral traditions). Marking them yourself is deep encoding. Keeping the marks while the words fade turns them into retrieval cues. Joos's original annotation idea is the core of the method, not an extra.
- Fading cues: full text → marked → first letters + marks → marks only → traces → blank page.
- Retrieval first: every return starts with recall, not rereading.
- Cumulative chaining, plus extra practice at the joins between stanzas.
- Scheduling with FSRS per line and stanza, driven by what you actually recalled (peeks, misses, self-rating).
- Spoken recall: speech recognition aligns your words to the text and marks misses in pencil. Typing works as a fallback.
- Optional elaboration with Claude: a plain-language paraphrase or an image to hold onto, offered in the margin for a stanza that keeps slipping.

## 6. What happens to the existing work

- **Bolt app:** used only as a reference for the data model and the EN/NL translations. Its Supabase backend is dropped. Its screens and visual design are not carried over.
- **Dec 2025 docs:** archived in the repo as history. The annotation research (stress marking, rhyme letters, sound colouring) becomes the pencil stage.
- **Business model:** a paid app with no accounts. You hold no user data, the stores handle payment, tax and refunds, and the privacy policy is one line ("nothing leaves your phone"). Updates are free through the store. Later extras (e.g. deeper lesson packs) can be one-time in-app purchases, which the store remembers per Apple/Google ID, so they still need no accounts. Every update must migrate on-device data safely, and those migrations get their own tests.
- **Stack:** Vite + React + TypeScript, packaged with **Capacitor** as a real iOS and Android app sold through the stores. All data lives **on the phone**: SQLite for poems, marks and schedule, and audio files in the app's own storage. There's no server, no accounts and no Supabase. Backup goes through the phone's own backup (iCloud / Google), plus an export file, and later optionally sync through the user's own iCloud/Google storage. `ts-fsrs` for scheduling. Vitest and Playwright for tests.
- **Recording and checking (Recite):** speak the stanza, on-device speech recognition transcribes it, the transcript is aligned word by word to the original, and missed or swapped words appear in pencil. Recognition can mishear archaic or rare words, so any word flagged as missed can be tapped to say "I did say that". Optionally play your recital back to hear the rhythm.
- **Recordings don't pile up:** by default the audio is discarded once it has been checked, and only the result is kept. If you choose to keep recitals, it's one per poem (your latest full recital, replaced each time), compressed for voice (~150 KB a minute). A quiet line in settings shows the space used, with *clear recordings*.

## 7. Claude Code build path

1. **Step 0 (one PR):** a fresh app skeleton, `CLAUDE.md` with these design principles as rules, `docs/SPEC.md` (this document), the old docs moved to `docs/archive/`, and CI.
2. **M1 The page:** *add a poem* (paste, title, author, fix broken lines), on-device storage (SQLite through Capacitor, with a migration test harness), and the typesetting engine with fit-to-measure, turnovers and line numbers. Tested against long-line poems (Whitman), short-line poems (Dickinson) and Dutch poems.
3. **M2 Pencil:** snapping pencil for beats (with syllabification for English and Dutch), sound families and pauses; marks stored per syllable; bottom-sheet lessons.
4. **M3 Fade → peek:** the stages (fade the words, marks only, fade the marks, blank page), honouring which kinds the user marked, with margin notes and a "seen once" record.
5. **M4 Recite + chain:** typed recall first, then cumulative stanzas and seam practice.
6. **M5 Schedule + contents page:** FSRS per line and stanza, and the *taking root / fading / by heart* contents page. A stanza that comes back opens where the schedule thinks the reader still is: *blank page* when it is likely still known, then *fade the marks*, *marks only* or *fade the words* the longer it has been left (Joos, 2026-10-28).
7. **M6 Spoken recall:** speaking aloud becomes the default way to recite at the check. Typing always stays available as an option, so the app works fully for anyone who can't or would rather not speak (Joos, 2026-10-28).
8. **M7 Store build:** Capacitor iOS and Android projects, OS backup plus export/import file, the quiet settings page (default mark kinds, space used by recordings, *clear recordings*), store listing.

Each milestone is one PR. The prompt can be as short as: *"Read CLAUDE.md and docs/SPEC.md, plan M2, then build it with tests and open a PR."*

## 8. Open questions

1. ~~Languages~~ Decided: English and Dutch. All app text (margin notes, lessons, actions) is bilingual from Step 0, with the interface language separate from each poem's own language. Dutch lessons use Dutch example poems (public domain, e.g. Gezelle, Gorter, Kloos), written fresh rather than translated. The English syllable and stress engine comes first, and Dutch syllabification follows in its own milestone.
2. Is speaking aloud the main way you want to recite, or typing?
3. ~~Step 0~~ Decided: started on a branch with a PR (2026-10-28).
