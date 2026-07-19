import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.ock.ucuzcu',
  appName: 'Ucuzcu',
  webDir: 'public',
  server: {
    url: 'https://ucuzcuapp.com',
    cleartext: false,
    androidScheme: 'https',
    allowNavigation: [
      'ucuzcuapp.com',
      '*.ucuzcuapp.com',
      'accounts.google.com',
      '*.google.com',
      '*.googleapis.com',
      '*.firebaseapp.com',
      '*.firebase.com',
      'appleid.apple.com',
      '*.apple.com',
      'nominatim.openstreetmap.org',
    ],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#FFAC09',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_INSIDE',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#FFAC09',
    },
  },
  ios: {
    contentInset: 'automatic',
    scheme: 'Ucuzcu',
    appendUserAgent: ' UcuzcuNativeApp/1.0',
  },
}

export default config
