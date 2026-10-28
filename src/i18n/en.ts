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
} as const;
