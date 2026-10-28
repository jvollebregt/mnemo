import { Capacitor } from '@capacitor/core';
import { webEar } from './ear';
import { phoneEar, phoneRecorder } from './phoneEar';
import { webRecorder } from './recorder';

/** How this device listens and records: the phone's own plugin in the app, the browser's APIs elsewhere. */
const onPhone = Capacitor.isNativePlatform();
export const deviceEar = onPhone ? phoneEar() : webEar();
export const deviceRecorder = onPhone ? phoneRecorder() : webRecorder();
