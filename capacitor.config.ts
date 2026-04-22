import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.thcgroup.collection',
  appName: 'THC Group Finance',
  webDir: 'out',
  server: {
    url: 'https://thc-collection-system.vercel.app/',
    cleartext: true
  }
};

export default config;
