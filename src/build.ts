declare const __BUILD__: { date: string; commit: string } | undefined;

/** Which build of the app this is: the day it was built and its commit, set by vite.config.ts. */
export const build = typeof __BUILD__ === 'undefined' ? { date: '', commit: '' } : __BUILD__;
