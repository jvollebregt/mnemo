import type { Messages } from './index';

// De interface in het Nederlands. Concept: de woorden liggen nog bij Joos ter keuring.
export const nl: Messages = {
  contents: 'inhoud',
  contentsEmpty: 'Voeg een gedicht toe dat je uit je hoofd wilt kennen.',
  addPoem: 'voeg een gedicht toe',

  stateTakingRoot: 'schiet wortel',
  stateFading: 'vervaagt',
  stateByHeart: 'uit het hoofd',

  stageMark: 'markeer wat je hoort',
  stageFadeWords: 'laat de woorden vervagen',
  stageMarksOnly: 'alleen de tekens',
  stageFadeMarks: 'laat de tekens vervagen',
  stageBlank: 'lege bladzijde',
  stageCheck: 'controleer',

  toolBeats: 'klemtonen',
  toolEchoes: "echo's",
  toolPauses: 'pauzes',
  putDown: 'potlood neer',
  moreAboutThis: 'meer hierover',

  rateNotYet: 'nog niet',
  rateMost: 'het meeste',
  rateAll: 'alles',

  back: 'terug',
  pastePlaceholder: 'Plak hier het gedicht, zoals het gedrukt staat.',
  pasteNote:
    'Plak het zoals het gedrukt staat, met titel en al. Witregels tussen strofen blijven staan. Op de volgende bladzijde kun je rechtzetten wat er bij het plakken misging.',
  setPage: 'zet de bladzijde',
  titlePlaceholder: 'titel',
  poetPlaceholder: 'dichter',
  writtenIn: 'geschreven in',
  brokenNoteOne:
    'Eén regel lijkt gebroken door de pagina waar hij vandaan kwam: hij staat gemarkeerd met ⁀ in de marge. Brak de dichter hem daar niet af, tik hem dan aan om hem aan de regel erboven te plakken. De app plakt nooit zelf regels aan elkaar.',
  brokenNoteMany:
    'Een paar regels lijken gebroken door de pagina waar ze vandaan kwamen: ze staan gemarkeerd met ⁀ in de marge. Brak de dichter ze daar niet af, tik er een aan om hem aan de regel erboven te plakken. De app plakt nooit zelf regels aan elkaar.',
  joinedNote:
    'Samengevoegd. De regel loopt nu door op een ingesprongen tweede regel, zoals een boek een lange regel zet, en telt als één regel. Tik hem nog eens aan om hem weer te splitsen.',
  doubleSpacedNote:
    'Na elke regel staat een witregel. Meestal komt dat door de opmaak van de webpagina, niet door de strofen van het gedicht.',
  closeUp: 'haal de witregels weg',
  keepIt: 'bewaar het',
  addedNote: 'Het staat nu op de bladzijde, en alleen op je telefoon. Open het wanneer je tien rustige minuten hebt.',
  openFailed: 'Je gedichten konden niet worden geopend. Sluit de app en open hem opnieuw.',
};
