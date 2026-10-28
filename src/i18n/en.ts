// The interface in English. Every key here must exist in nl.ts too.
// Words are lower case on purpose: actions are set in small capitals.
export const en = {
  // Contents page
  contents: 'contents',
  contentsEmpty: 'Add a poem you want to know by heart.',
  addPoem: 'add a poem',

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
  stageCheck: 'check',

  // The pencil
  toolBeats: 'beats',
  toolEchoes: 'echoes',
  toolPauses: 'pauses',
  putDown: 'put down',
  moreAboutThis: 'more about this',

  // How it went
  rateNotYet: 'not yet',
  rateMost: 'most of it',
  rateAll: 'all of it',

  // Adding a poem
  back: 'back',
  pastePlaceholder: 'Paste the poem here, as it is printed.',
  pasteNote:
    'Paste it as it is printed, title and all. Blank lines between stanzas are kept. On the next page you can set right anything the pasting got wrong.',
  setPage: 'set the page',
  titlePlaceholder: 'title',
  poetPlaceholder: 'poet',
  writtenIn: 'written in',
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
  openFailed: 'Your poems could not be opened. Close the app and open it again.',
} as const;
