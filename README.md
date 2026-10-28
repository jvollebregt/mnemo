# Mnemo

A page that slowly forgets a poem, so that you learn it by heart.

You read a stanza and mark what you hear: its beats, its echoes and its pauses. Then the words fade while your marks stay, so you rebuild each line from its music. Then the marks fade too, and the page goes blank. The app teaches as you go, one short note in the margin at a time.

Mnemo will be a paid iOS and Android app with no accounts. Your poems, your marks and any recordings stay on your phone.

## Status

Everything up to M6 works in the browser build: add a poem, mark what you hear, fade the words and the marks, recite on the blank page (aloud or typed), and come back when the schedule says. M7 adds the settings page, an export file, keeping your latest recital, and the iOS and Android projects. The milestones are listed in [`docs/SPEC.md`](docs/SPEC.md#7-claude-code-build-path).

## Develop

Needs Node 22 or later.

```sh
npm ci
npm run dev        # open the printed URL; narrow the window to phone width
npm test
```

`CLAUDE.md` holds the design and method rules that every change follows. `docs/archive/2025-prep/` keeps the December 2025 planning documents for history.

## Build the phone apps

The web build is copied into the native projects in `ios/` and `android/`:

```sh
npm run build && npx cap sync
```

- **Android:** open `android/` in Android Studio (any computer) and run it on a phone with USB debugging, or build an APK from the Build menu. Listening needs Android 12 or later, where speech is recognised on the phone itself.
- **iPhone:** open `ios/App/App.xcodeproj` in Xcode on a Mac, choose your team under Signing, and run it on an iPhone. Listening needs a phone that recognises speech on the device.

Listening and recording go through the small plugin in `native/ear`. Signing keys and store passwords never go in this repository.

