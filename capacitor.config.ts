import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.visionairy.app',
  appName: 'visionary-ui-mock',
  webDir: 'dist',
  server: {
    url: 'http://localhost:8080',
    cleartext: true
  },
  plugins: {
    Haptics: {
      enable: true
    }
  }
};

export default config;