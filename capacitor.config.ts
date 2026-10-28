import type { CapacitorConfig } from '@capacitor/cli';

// Native iOS and Android projects are added in M7 (`npx cap add ios|android`).
const config: CapacitorConfig = {
  appId: 'app.mnemo.poems',
  appName: 'Mnemo',
  webDir: 'dist',
};

export default config;
