import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.edu.usco.oidoplus',
  appName: 'Oído+',
  webDir: 'www',
  plugins: {
    SplashScreen: {
      backgroundColor: '#F3F9F9',
      launchShowDuration: 800,
      launchAutoHide: true,
      androidScaleType: 'CENTER_INSIDE',
    },
  },
};

export default config;
