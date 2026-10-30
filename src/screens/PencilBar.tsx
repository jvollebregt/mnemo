import { Fragment } from 'react';
import { useI18n } from '../i18n/context';
import type { MessageKey } from '../i18n';
import { Underlined } from '../page/MarkedLine';
import type { EchoFamily, EchoStyle } from '../pencil/marks';

const TOOLS = ['beats', 'echoes', 'pauses'] as const;
export type Tool = (typeof TOOLS)[number];

const TOOL_LABEL: Record<Tool, MessageKey> = { beats: 'toolBeats', echoes: 'toolEchoes', pauses: 'toolPauses' };
const ABOUT_LABEL: Record<Tool, MessageKey> = { beats: 'aboutBeats', echoes: 'aboutEchoes', pauses: 'aboutPauses' };
const STYLE_LABEL: Record<EchoStyle, MessageKey> = {
  1: 'echoDotted',
  2: 'echoDashed',
  3: 'echoDouble',
  4: 'echoWavy',
  5: 'echoSolid',
  6: 'echoThick',
  7: 'echoDashDot',
  8: 'echoLongDash',
  9: 'echoDoubleDotted',
  10: 'echoDoubleDashed',
  11: 'echoDoubleWavy',
  12: 'echoDoubleDashDot',
};

/** The pencil's tools, set at the foot of the page: beats · echoes · pauses, and put down. */
export function PencilBar({
  tool,
  family,
  families,
  styleOf,
  words,
  wordsLang,
  onTool,
  onFamily,
  beckon,
  onAbout,
  onPutDown,
}: {
  tool: Tool;
  family: EchoFamily;
  /** The sounds already underlined, and a fresh pen for the next. */
  families: readonly EchoFamily[];
  styleOf: (family: EchoFamily) => EchoStyle;
  /** The words the pen in hand has underlined, so the reader can tell which sound it holds. */
  words: readonly string[];
  wordsLang: string;
  /** Draws the eye once to a fresh underline, or to *about …* where a lesson lives. */
  beckon?: EchoFamily | 'about';
  onTool: (tool: Tool) => void;
  onFamily: (family: EchoFamily) => void;
  onAbout: () => void;
  onPutDown: () => void;
}) {
  const { m } = useI18n();
  return (
    <div className="pencil-bar">
      <div className="tools" role="group" aria-label={m.pencil}>
        {TOOLS.map((t, i) => (
          <Fragment key={t}>
            {i > 0 && <span aria-hidden="true">·</span>}
            <button type="button" className="action" aria-pressed={tool === t} onClick={() => onTool(t)}>
              {m[TOOL_LABEL[t]]}
            </button>
          </Fragment>
        ))}
      </div>
      {/* The underlines' row keeps its place for every tool, so the bar never jumps. */}
      {tool !== 'echoes' && <div className="families" aria-hidden="true" />}
      {tool === 'echoes' && (
        <div className="families" role="group" aria-label={m.underlines}>
          {families.map((f) => (
            <button
              type="button"
              key={f}
              className={beckon === f ? 'family beckon' : 'family'}
              aria-label={m[STYLE_LABEL[styleOf(f)]]}
              aria-pressed={family === f}
              onClick={() => onFamily(f)}
            >
              {/* The underline alone, drawn under blank space. */}
              <span className={`echo echo-${styleOf(f)}`} aria-hidden="true">
                <Underlined style={styleOf(f)}>{'\u00a0'.repeat(5)}</Underlined>
              </span>
            </button>
          ))}
        </div>
      )}
      {tool === 'echoes' && words.length > 0 && (
        // Set above the bar, over the foot of the page, so the bar keeps its height.
        <p className="echo-words" lang={wordsLang}>
          {words.join(' · ')}
        </p>
      )}
      <div className="minor">
        <button type="button" className={beckon === 'about' ? 'action beckon' : 'action'} onClick={onAbout}>
          {m[ABOUT_LABEL[tool]]}
        </button>
        <button type="button" className="action" onClick={onPutDown}>
          {m.putDown}
        </button>
      </div>
    </div>
  );
}
