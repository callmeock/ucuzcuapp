import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.ucuzcu.app',
  appName: 'Ucuzcu',
  webDir: 'public',
  server: {
    // Canlı site — web deploy'ları anında mobilde yansır
    url: 'https://ucuzcuapp.com',
    cleartext: false,
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#00B8D8',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#00B8D8',
    },
  },
  ios: {
    contentInset: 'automatic',
    scheme: 'Ucuzcu',
  },
}

export default config
