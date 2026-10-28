import type { CapacitorConfig } from '@capacitor/cli';

// The native projects live in ios/ and android/; `npm run build && npx cap sync` copies the web build into them.
const config: CapacitorConfig = {
  appId: 'app.mnemo.poems',
  appName: 'Mnemo',
  webDir: 'dist',
};

export default config;
