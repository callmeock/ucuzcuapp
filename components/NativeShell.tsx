'use client'

import { useEffect, ReactNode } from 'react'
import { isNativeApp } from '@/lib/capacitor'

export default function NativeShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!isNativeApp()) return

    const init = async () => {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar')
        await StatusBar.setStyle({ style: Style.Light })
        await StatusBar.setBackgroundColor({ color: '#e63946' })
      } catch { /* web'de yok */ }

      try {
        const { SplashScreen } = await import('@capacitor/splash-screen')
        await SplashScreen.hide()
      } catch { /* web'de yok */ }
    }

    init()
  }, [])

  return <>{children}</>
}
