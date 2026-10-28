# Mnemo

A page that slowly forgets a poem, so that you learn it by heart.

You read a stanza and mark what you hear: its beats, its echoes and its pauses. Then the words fade while your marks stay, so you rebuild each line from its music. Then the marks fade too, and the page goes blank. The app teaches as you go, one short note in the margin at a time.

Mnemo will be a paid iOS and Android app with no accounts. Your poems, your marks and any recordings stay on your phone.

## Status

M1: you can add a poem by pasting it, check its title and poet, mend lines the source page broke, and read it set on the page. Poems are stored in SQLite on the device (in the browser build, in IndexedDB). The milestones are listed in [`docs/SPEC.md`](docs/SPEC.md#7-claude-code-build-path).

## Develop

Needs Node 22 or later.

```sh
npm ci
npm run dev        # open the printed URL; narrow the window to phone width
npm test
```

`CLAUDE.md` holds the design and method rules that every change follows. `docs/archive/2025-prep/` keeps the December 2025 planning documents for history.
