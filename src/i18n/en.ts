// The interface in English. Every key here must exist in nl.ts too.
// Words are lower case on purpose: actions are set in small capitals.
export const en = {
  // Contents page
  contents: 'contents',
  contentsEmpty: 'Add a poem you want to know by heart.',
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
  stageBlank: 'blank page',
  stanza: 'stanza',

  // Margin notes, each shown once, the first time its stage is reached
  noteRead: 'Read it aloud, slowly, twice. Hearing yourself say it is half the work.',
  noteFadeWords: 'The words fade; your marks stay. First letters and rhythm are enough to pull a line back.',
  noteMarksOnly: 'Only your marks now. Rebuild each line from its beats, its echoes and its pauses.',
  noteFadeMarks: 'Now the marks go too. Only the shape of the lines is left.',
  notePeek: 'Peeking is fine. Tap a faded word and it comes back in pencil. The words you peek at are the ones to come back to.',
  noteBlank: 'A blank page, as when you recite to someone. Say it aloud from memory; each word comes back in ink as you get it.',
  noteBlankTyping: 'A blank page, as when you recite to someone. Type it from memory; each word comes back in ink as you get it.',
  noteNoEar: 'I can’t listen here just now, so type it instead. You can try speaking again any time.',
  noteMissed: 'What you missed is in pencil. Missing a word is useful: that is where memory is built. If you did have one, tap it.',
  noteSeam: 'The join between two stanzas is where a recital usually breaks, so it gets its own practice.',
  noteChain: 'Now the stanzas so far, together.',
  noteReturn: 'Try it before you look. Remembering is what makes it stick.',

  // The pencil
  toolBeats: 'beats',
  toolEchoes: 'echoes',
  toolPauses: 'pauses',
  putDown: 'put down',
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
  pencilNote:
    'Choose beats, echoes or pauses below, then tap the poem. Whatever you mark will outlast the words. If a word is split in the wrong place, press and hold it.',
  draftLesson: 'A draft lesson, still to be rewritten.',
  recutTitle: 'syllables',
  recutNote: 'Tap between two letters to split the word there. Tap a split to close it again.',
  splitHere: 'split here',

  // How it went
  rateNotYet: 'not yet',
  rateMost: 'most of it',
  rateAll: 'all of it',
  recite: 'recite',
  recitePlaceholder: 'type it from memory',
  reciteSay: 'say it',
  reciteListening: 'listening…',
  reciteSpeakPrompt: 'say it aloud from memory',
  reciteByTyping: 'type instead',
  reciteBySpeaking: 'speak instead',
  reciteDone: 'done',
  playBack: 'play it back',

  // Adding a poem
  back: 'back',
  pastePlaceholder: 'Paste the poem here, as it is printed.',
  pasteNote:
    'Paste it as it is printed, title and all. Blank lines between stanzas are kept. On the next page you can set right anything the pasting got wrong.',
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
  addedNote: 'It is on the page now, and only on your phone. Open it whenever you have ten quiet minutes.',
  putAway: 'put it away',
  longLinesTitle: 'long lines',
  longLines1:
    'Some lines in this poem are longer than the page is wide. Rather than break them where the poet didn’t, the page lets them turn over: the rest of the line carries on just below, indented, the way a printed book sets a long line.',
  longLines2: 'It is still one line. The margin counts it once, and when the words fade, it fades as one.',
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
  settingsYourPoems: 'your poems',
  exportPoems: 'export',
  importPoems: 'import',
  exchangeNote:
    'One file with your poems, your marks and how each one is coming along, to keep somewhere safe or take to a new phone. Recitals are not in it.',
  importedNote: 'Poems read in from the file: {count}. A poem you already had now has the file’s marks and schedule.',
  importNotMnemo: 'That file is not a Mnemo export, so nothing was read in.',
  importNewer: 'That file comes from a newer version of Mnemo. Update the app first, then read it in.',
  importDamaged: 'That file is damaged, so nothing was read in.',
  openFailed: 'Your poems could not be opened. Close the app and open it again.',
} as const;
