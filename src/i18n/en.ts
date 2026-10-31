// The interface in English. Every key here must exist in nl.ts too.
// Words are lower case on purpose: actions are set in small capitals.
export const en = {
  // Contents page
  contents: 'contents',
  contentsEmpty: 'Add a poem you want to know by heart.',
  contentsHow: 'Mark what you hear, fade the words, and say it by heart.',
  interfaceLanguage: 'language of the app',
  addPoem: 'add a poem',
  settings: 'settings',

  // How a poem is doing
  stateTakingRoot: 'taking root',
  stateFading: 'fading',
  stateByHeart: 'by heart',

  // The stages of a stanza
  stageMark: 'mark what you hear',
  stageFadeWords: 'fade the words',
  stageMarksOnly: 'marks only',
  stageFadeMarks: 'fade the marks',
  stageBlank: 'recite',
  stanza: 'stanza',

  // Margin notes, each shown once, the first time its stage is reached
  noteRead: 'Read it aloud, slowly, twice. Hearing yourself say it is half the work.',
  noteFadeWords: 'The words fade; your marks stay. First letters and rhythm are enough to pull a line back. Tap a word if you need it.',
  noteMarksOnly: 'Only your marks now. Rebuild each line from its beats, its echoes and its pauses.',
  noteFadeMarks: 'Now the marks go too. Only the shape of the lines is left.',
  notePeek: 'Peeking is fine here. Tap a faded word, or draw a finger along a line, and the words come back in pencil.',
  noteBlank: 'Now recite it, as you would to someone: aloud, from memory, with nothing to look at. Each word comes back in ink as you say it.',
  noteBlankTyping: 'Now recite it, as you would to someone: from memory, with nothing to look at. Each word comes back in ink as you type it.',
  notePaused: 'Tap a line to take it again from there.',
  noteNoEar: 'I can’t listen here just now, so type it instead. You can try speaking again any time.',
  noteMissed: 'What you missed is in pencil. Missing a word is useful: that is where memory is built. Tap one to see what I heard there.',
  noteNextStanza: 'That stanza is taking root, and will come back when it starts to fade. Now the next one.',
  noteChain: 'From now on you recite all you have learned so far, so every join between the stanzas is practised too.',
  noteReturn: 'Try it before you look. Remembering is what makes it stick.',

  // The pencil
  toolBeats: 'beats',
  toolEchoes: 'echoes',
  toolPauses: 'pauses',
  moreAboutThis: 'more about this',
  pencil: 'pencil',
  aboutBeats: 'about beats',
  aboutEchoes: 'about echoes',
  aboutPauses: 'about pauses',
  underlines: 'underlines',
  echoDotted: 'dotted underline',
  echoDashed: 'dashed underline',
  echoDouble: 'double underline',
  echoWavy: 'wavy underline',
  echoSolid: 'solid underline',
  echoDashDot: 'dash-dot underline',
  echoDoubleDotted: 'double dotted underline',
  echoDoubleDashed: 'double dashed underline',
  echoDoubleWavy: 'double wavy underline',
  echoDoubleDashDot: 'double dash-dot underline',
  pencilNote:
    'Choose beats, echoes or pauses below, then tap the poem. Whatever you mark will outlast the words. If a word is split in the wrong place, press and hold it.',
  draftLesson: 'A draft lesson, still to be rewritten.',
  recutTitle: 'syllables',
  recutNote: 'Tap between two letters to split the word there. Tap a split to close it again.',
  splitHere: 'split here',

  // How it went
  rateQuestion: 'How much of it did you know?',
  rateNotYet: 'not yet',
  rateMost: 'most of it',
  rateAll: 'all of it',
  recite: 'recite',
  recitePlaceholder: 'type it from memory',
  reciteSay: 'say it',
  recitePause: 'pause',
  reciteGoOn: 'go on',
  heardThere: 'I heard “{words}”',
  heardNothing: 'I heard nothing here',
  saidThat: 'I said that',
  reciteByTyping: 'type instead',
  reciteBySpeaking: 'speak instead',
  reciteDone: 'done',
  reciteAgain: 'again',
  playBack: 'play it back',

  // Adding a poem
  back: 'back',
  pastePlaceholder: 'Paste the poem here, as it is printed.',
  nothingCopied: 'Nothing is copied yet.',
  pasteNote:
    'Title and all. Blank lines between stanzas are kept. On the next page you can set right anything the pasting got wrong.',
  paste: 'paste',
  setPage: 'set the page',
  titlePlaceholder: 'title',
  poetPlaceholder: 'poet',
  languageQuestion: 'Is this poem in English or Dutch?',
  brokenNoteOne:
    'One line looks broken by the page it came from: it is marked ⁀ in the margin. If the poet didn’t break it there, tap it to join it to the line above. The app never joins lines by itself.',
  brokenNoteMany:
    'Some lines look broken by the page they came from: they are marked ⁀ in the margin. If the poet didn’t break them there, tap one to join it to the line above. The app never joins lines by itself.',
  joinedNote:
    'Joined. The line now turns over, indented, the way a book sets a long line, and it counts as one line. Tap it again to split it.',
  doubleSpacedNote:
    'There is a blank line after every line. That is usually how the web page was spaced, not how the poem is divided.',
  closeUp: 'close up the spaces',
  keepIt: 'keep it',
  addedNote:
    'It is on the page now, and only on your phone. Open it whenever you have ten quiet minutes. It is taking root; it will say by heart once you know it.',
  putAway: 'put it away',
  longLinesTitle: 'long lines',
  longLines1:
    'Some lines in this poem are longer than the page is wide. Rather than break them where the poet didn’t, the page lets them turn over: the rest of the line carries on just below, indented, the way a printed book sets a long line.',
  longLines2: 'It is still one line: when the words fade, it fades as one.',
  longLines3: 'Turn your phone sideways and the page grows wider, so most long lines fit whole. Turn it back whenever you like.',
  // Settings
  settingsReciting: 'reciting',
  reciteAloud: 'aloud',
  reciteTyped: 'by typing',
  settingsRecitals: 'your recitals',
  recitalsLetGo: 'let them go',
  recitalsKeepLatest: 'keep the latest',
  recitalsNote:
    'Kept only on your phone: for each poem, your latest recital, so you can hear its rhythm again. A new one replaces the one before.',
  recitalsUsed: 'Your recitals take {size}.',
  recitalsUnavailable: 'Keeping recitals isn’t possible on this phone yet.',
  recitalsNone: 'No recitals are kept.',
  clearRecordings: 'clear recordings',
  clearRecordingsSure: 'yes, clear them',
  correctPoem: 'correct this poem',
  removePoem: 'remove this poem',
  removePoemSure: 'yes, remove it',
  settingsYourPoems: 'your poems',
  exportPoems: 'export',
  importPoems: 'import',
  exchangeNote:
    'One file with your poems, your marks and how each one is coming along, to keep somewhere safe or take to a new phone. Recitals are not in it.',
  version: 'version of {date}',
  importedNote: 'Poems read in from the file: {count}. A poem you already had now has the file’s marks and schedule.',
  importNotMnemo: 'That file is not a Mnemo export, so nothing was read in.',
  importNewer: 'That file comes from a newer version of Mnemo. Update the app first, then read it in.',
  importDamaged: 'That file is damaged, so nothing was read in.',
  openFailed: 'Your poems could not be opened. Close the app and open it again.',
} as const;
