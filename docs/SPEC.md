# MNEMO: the next version, rethought

*2026-10-28. Replaces the earlier draft plan; updated with prosody as the fading scaffold. This version starts from the learning journey and the page, not from the Dec 2025 specs or the Bolt screens.*

## 1. The idea in one paragraph

MNEMO is a single sheet of paper that slowly forgets the poem, so that you have to remember it. You read a stanza and mark what you hear (beats, echoes and pauses). Then the words fade while your marks stay, so you rebuild each line from its rhythm. Finally the marks fade too, and you bring the stanza back from memory. The app teaches you how to do this in the margin, one short note at a time, at the moment you need it. There are no dashboards, cards, badges or settings screens to learn first. Everything happens on the page.

## 2. Design principles

1. **The page is the interface.** One column of text with real margins, the way a poem is printed in a good book. Controls are words in small caps at the foot of the page or notes in the margin, never buttons, pills, toggles or icons.
2. **Ink and pencil.** A light, near-white paper (not an old brown book). Two materials only: black ink for the poem, and a blue "pencil" for marks and anything you did (blue rather than red, so it never reads as a correction; Joos, 2026-10-29). Faded text is literally lighter ink. Nothing glows, slides or bounces.
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
| **Pencil** | Tap *mark what you hear*, choose *beats · echoes · pauses* and mark the stanza with your finger. The pencil snaps to the text: a tap or tick on a stressed syllable becomes a beat (tap again to remove). When you move on to the next line, tap empty paper, switch tool or leave the pencil, the line you just marked settles (and stays settled): its other syllables get a light mark (˘) automatically. Nothing is pre-marked while you're still listening, so the syllable count stays visible and a wrong syllable split shows up at once, a stroke under letters joins exactly those letters to an echo family (the s of *sings*, the *ou* of *soul*, the *eard* of *heard*: echoes live inside syllables, so marking is per letter; while drawing, the line appears enlarged at the top so the finger never hides it, and tapping an underline rubs it out), a tap on punctuation marks it as a pause. Whatever you don't mark never appears in the fading. While marking, the whole poem is on the page, the stanza in hand in ink and the others faint with their numerals in the margin; a tap on a faint stanza scrolls the pencil there, so you can mark the whole poem before anything fades (Joos, 2026-10-29); *fade the words* then fades the stanza in hand, and the app goes on with the first stanza not yet learned (Joos, 2026-10-29). | The first time you pick each tool, a short lesson opens from the bottom of the page (see `lessons-draft.md`). It can be reopened via *about beats/echoes/pauses*, and closes when you tap outside it. Each lesson ends with an optional *more about this* that goes deeper (names of feet, meter) and, later, a link to a trusted outside lesson. |
| **Words fade** | The words drop to first letters (the rest becomes a faint trace of the same length, so the line keeps its shape). Your marks stay, including the pauses you marked. Punctuation you didn't mark fades with the words, so marking pauses is what makes you notice them. | *"The words fade; your marks stay. First letters and rhythm are enough to pull a line back."* |
| **Marks only** | Only your marks (beats, echoes, pauses) remain over blank traces. | *"Rebuild each line from its beats, its sounds and its pauses."* |
| **Marks fade** | Only faint traces show the shape of the lines and words: a fine line through where the letters stood, never mistaken for an echo's underline. The other stanzas show as traces too, clearly enough to keep one's place (Joos, 2026-10-31). | *"Now the marks go too. Only the shape of the lines is left."* |
| **Peek** | On the three practice pages (*fade the words*, *marks only*, *fade the marks*), tap a faded word and the whole word comes back in pencil; draw a finger along a line and every word it passes comes back, and drawn again they fade. The other stanzas can be read the same way. Practice costs nothing: peeks don't count against the schedule (Joos, 2026-10-31). | First peek: *"Peeking is fine here. Tap a faded word, or draw a finger along a line, and the words come back in pencil."* |
| **Recite** | The last page, *recite*: nothing at all on it, no traces, no peeking, not even the other stanzas, only the numerals and, faint, the line just before where the recital starts. It is the real try, and the only page where the app listens (Joos, 2026-10-31). Say it (or type it). Each word comes back in ink in its place as soon as it is said; nothing is written out at the foot. A word gone past without being said shows in pencil at once, so the page never seems stuck, and punctuation comes back with its word. A word is placed only in the line being said or the next, or further on once three are said in a row there, so a stray word never lands far ahead; something said that doesn't fit turns the word due to pencil at once, and back to ink if it is then said (Joos, 2026-10-31). While listening the foot says *pause · done*; a tap anywhere pauses, the foot then says *go on · done*, and a tap on a line already said takes it again from there. *done* shows what you got, misses in pencil, then *How much of it did you know?* over *again · not yet · most of it · all of it*; *again* clears the page for another try, and nothing is saved until a rating (Joos, 2026-10-31). A tap on a word in pencil shows what the phone heard there, with *I said that* to count it (Joos, 2026-10-31). | *"Now recite it, as you would to someone: aloud, from memory, with nothing to look at."* Paused, once: *"Tap a line to take it again from there."* Done, once: *"Missing a word is useful: that is where memory is built."* |
| **Chain** | From the second part on, its recital takes in the parts learned before it, from the top (deep into a long poem, from two parts back), so every join is practised as the poem grows; there are no separate seam steps. Before it begins, a tap on a later numeral starts it there. Once some of the poem is learned, *recite* on the first page recites the whole poem, from any numeral. One rating covers the recital: the part in hand takes it, and every other part recited is graded by its misses, never better than the rating (Joos, 2026-10-31). | Once: *"From now on you recite all you have learned so far, so every join between the stanzas is practised too."* |
| **Stop** | After about 10 minutes: *"That's enough for today. Tomorrow it will feel half-gone. That's the point."* | Why spacing works, in one sentence. |
| **Return** | The contents page: titles with dotted leaders and one word each (*taking root*, *fading*, *by heart*). Opening a *fading* poem starts with recall, never rereading. Inside a poem, the stanza numerals in the margin show the same states in tone (pencil for a stanza that is due or that you last said you had only most of), so you can go straight to the stanzas that need you (Joos, 2026-10-28). | *"Try it before you look. Remembering is what makes it stick."* |
| **By heart** | A stanza that's recalled cleanly on several days is *by heart*. Its reviews spread out to weeks and months. | |

## 4. Long lines without false enjambment

On a phone, a Whitman line won't fit at a readable size. The rules:

1. **Fit first.** Per poem, choose the largest type size (down to about 15 px) at which the longest line fits the measure. Every line of the poem uses that same size.
2. **Then turn over, visibly.** If a line still doesn't fit, its continuation is set as a *turnover*: deeply indented with a hanging indent and a small pencil bracket, the way printed poetry has always done it, so it never reads as a new verse line. Line numbers count only real lines; they appear on the proof when adding a poem, not while learning, where the stanza numerals do that work (Joos, 2026-10-28).
3. **Landscape helps.** Turning the phone sideways widens the measure, and turnovers disappear when the line fits.
4. **Learning units follow the poet.** Fading, peeking and recall work on real lines and stanzas. A turnover is never treated as a separate line.
5. **Long stanzas are learned in passages.** A run of more than eight lines with no stanza break (verse drama, blank verse, a sonnet set as one block) is cut into passages of four to eight lines, where sentences end and near six lines where it can, so a sonnet falls into its octave and sestet. Each passage gets its own numeral and is learned as a stanza; the page keeps the poet's layout and adds no blank line (Joos, 2026-10-30).
6. **What is learned at a time is a part.** The mind holds about four to eight lines at once, and stanza breaks are about meaning, not memory. A short poem (up to twelve lines and about sixty words, like Crane's *In the Desert*) is learned whole; stanzas of one to three lines are joined to the next until a part has four lines or more, never past eight; long stanzas are cut into passages as above. Each part has one numeral and its own place in the schedule, and the page keeps the poet's blank lines inside it (`src/poem/parts.ts`; Joos, 2026-10-31).

## 4a. Syllables without a perfect detector

There is no perfect syllable detector, and the pencil must not depend on one.
- **English:** the CMU Pronouncing Dictionary (~130,000 words) gives syllables and dictionary stress. Hyphenation patterns cover the rest.
- **Dutch:** hyphenation patterns split syllables reliably. There's no stress dictionary, but Dutch stress is fairly regular.
- **When it's wrong** (names, rare or archaic words like *learn'd*): a tap snaps to the vowel sound under the finger, not to a precomputed syllable, so a stress mark can always land where the reader hears it. A long press on a word lets the reader split or join its syllables by hand, and the correction is stored with the poem.
- Suggested stresses are never shown before the reader marks. The marking is the learning.

## 4b. Sound families on paper

Rhyme is treated as part of *sound*, following Mary Oliver's handbooks: alliteration, assonance, consonance and rhyme are all echoes. One poem can hold several families, so instead of colour each family gets its own pencil underline for the whole poem, from ten: dotted, dashed, double, wavy, solid, dash-dot, and doubled dotted, dashed, wavy and dash-dot (thick and long dashes were too like solid and dashed). The bar shows a pen for each sound underlined so far plus one fresh pen, and above it the words the pen in hand has underlined (*Rome · foam · comb*), each spelling once, so you can tell your pens apart without the app ever writing out a sound. A poem with more than ten sounds lends a style again, from the sound marked furthest away (Joos, 2026-10-30). When you mark a sound that closes a line, its letter (a, b, c) appears in the right margin, but only once that same sound closes at least two lines, so poems without end rhyme never get letters. Unmarked lines get no letter, so the scheme is never filled in ahead of you; it builds up as you hear it. While you work on one family, the others go pale in the stanza in hand; the faint stanzas stay evenly faint, so faintness only ever means "not here" (Joos, 2026-10-30). A tap underlines one letter, and a thumb that rolls a little still counts as a tap. Colour stays out: about one man in twelve can't tell colours apart, and it would make the page look highlighted rather than printed (Joos, 2026-10-30).

While fading, a tap on an underlined word brings back the whole word, as any tap does: only its underlined letters would make a plural look singular (Joos, 2026-10-31; this replaces the echo-first tap of 2026-10-30).

## 5. Memory science underneath (now out of sight)

- **Prosody as the last scaffold.** Meter, rhyme, sound and punctuation narrow what can come next in a line (Rubin's work on oral traditions). Marking them yourself is deep encoding. Keeping the marks while the words fade turns them into retrieval cues. Joos's original annotation idea is the core of the method, not an extra.
- Fading cues: full text → marked → first letters + marks → marks only → traces → blank page.
- Retrieval first: every return starts with recall, not rereading.
- Cumulative chaining: each part's recital takes in the parts before it, so the joins are practised every time.
- Scheduling with FSRS per line and part, driven by what you actually recalled (misses and self-rating).
- Spoken recall hears the poem's own words: the phone is told the words of the lines being recited (on iPhone, `contextualStrings`), so a rare word like *bestial* isn't heard as *Bastille*. No accent setting (Joos, 2026-10-31).
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
7. **M6 Spoken recall:** speaking aloud becomes the default way to recite on the blank page. Typing always stays available as an option, so the app works fully for anyone who can't or would rather not speak (Joos, 2026-10-28).
8. **M7 Store build:** Capacitor iOS and Android projects, OS backup plus export/import file, the quiet settings page (interface language, reciting aloud or by typing, keeping the latest recital, space used by recordings, *clear recordings*, export and import), store listing. On the phone, speech is recognised on the device only (iPhones that support it, Android 12 and later); elsewhere the reader types. Keeping a recital works on iPhone first; on Android the recogniser holds the microphone, so that follows later.

Each milestone is one PR. The prompt can be as short as: *"Read CLAUDE.md and docs/SPEC.md, plan M2, then build it with tests and open a PR."*

## 8. Open questions

1. ~~Languages~~ Decided: English and Dutch. All app text (margin notes, lessons, actions) is bilingual from Step 0, with the interface language separate from each poem's own language. Dutch lessons use Dutch example poems (public domain, e.g. Gezelle, Gorter, Kloos), written fresh rather than translated. The English syllable and stress engine comes first, and Dutch syllabification follows in its own milestone.
2. ~~Speaking or typing~~ Decided: speaking aloud is the default, and typing always stays available (Joos, 2026-10-28).
3. ~~Step 0~~ Decided: started on a branch with a PR (2026-10-28).
