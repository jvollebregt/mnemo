import { Clipboard } from '@capacitor/clipboard';

/**
 * The text on the clipboard, read in one tap. Pressing and holding for the
 * phone's own Paste works too, but is easy to miss; most readers arrive with
 * a poem already copied. Anything that isn't text reads as nothing.
 */
export async function readClipboard(): Promise<string> {
  try {
    const { type, value } = await Clipboard.read();
    return type.startsWith('text') || type === 'string' ? value : '';
  } catch {
    // Refused, or nothing there.
    return '';
  }
}
