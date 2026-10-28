import { Directory, Filesystem } from '@capacitor/filesystem';
import { fromBase64, toBase64 } from './base64';
import type { Files } from './files';

/** Files in the app's own data folder on the phone. */
export function phoneFiles(): Files {
  return {
    async write(name, data) {
      await Filesystem.writeFile({ path: name, data: toBase64(data), directory: Directory.Data, recursive: true });
    },
    async read(name) {
      try {
        const { data } = await Filesystem.readFile({ path: name, directory: Directory.Data });
        return typeof data === 'string' ? fromBase64(data) : new Uint8Array(await data.arrayBuffer());
      } catch {
        return undefined;
      }
    },
    async remove(name) {
      try {
        await Filesystem.deleteFile({ path: name, directory: Directory.Data });
      } catch {
        // Already gone.
      }
    },
  };
}
