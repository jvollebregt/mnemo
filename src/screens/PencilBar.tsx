import { Fragment } from 'react';
import { useI18n } from '../i18n/context';
import type { MessageKey } from '../i18n';
import { ECHO_FAMILIES, type EchoFamily } from '../pencil/marks';

const TOOLS = ['beats', 'echoes', 'pauses'] as const;
export type Tool = (typeof TOOLS)[number];

const TOOL_LABEL: Record<Tool, MessageKey> = { beats: 'toolBeats', echoes: 'toolEchoes', pauses: 'toolPauses' };
const ABOUT_LABEL: Record<Tool, MessageKey> = { beats: 'aboutBeats', echoes: 'aboutEchoes', pauses: 'aboutPauses' };
const FAMILY_LABEL: Record<EchoFamily, MessageKey> = {
  1: 'echoDotted',
  2: 'echoDashed',
  3: 'echoDouble',
  4: 'echoWavy',
  5: 'echoSolid',
};

/** The pencil's tools, set at the foot of the page: beats · echoes · pauses, and put down. */
export function PencilBar({
  tool,
  family,
  onTool,
  onFamily,
  beckon,
  onAbout,
  onPutDown,
}: {
  tool: Tool;
  family: EchoFamily;
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
          {ECHO_FAMILIES.map((f) => (
            <button
              type="button"
              key={f}
              className={beckon === f ? 'family beckon' : 'family'}
              aria-label={m[FAMILY_LABEL[f]]}
              aria-pressed={family === f}
              onClick={() => onFamily(f)}
            >
              {/* The underline alone, drawn under blank space. */}
              <span className={`echo echo-${f}`} aria-hidden="true">
                {'\u00a0'.repeat(5)}
              </span>
            </button>
          ))}
        </div>
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
