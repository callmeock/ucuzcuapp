'use client'

import { useEffect, ReactNode } from 'react'
import { isNativeApp } from '@/lib/capacitor'
import { BRAND_COLOR } from '@/lib/brand'

export default function NativeShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!isNativeApp()) return

    document.documentElement.classList.add('native-app')
    document.body.classList.add('native-app')

    const init = async () => {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar')
        await StatusBar.setOverlaysWebView({ overlay: false })
        await StatusBar.setStyle({ style: Style.Dark })
        await StatusBar.setBackgroundColor({ color: BRAND_COLOR })
      } catch { /* web'de yok */ }

      try {
        const { SplashScreen } = await import('@capacitor/splash-screen')
        await SplashScreen.hide()
      } catch { /* web'de yok */ }

      // Harici linkler Safari'ye düşmesin — uygulama içinde kal
      const onClick = (e: MouseEvent) => {
        const anchor = (e.target as HTMLElement).closest('a')
        if (!anchor?.href) return
        const url = new URL(anchor.href, window.location.origin)
        const host = url.hostname
        const allowed =
          host === 'ucuzcuapp.com' ||
          host.endsWith('.ucuzcuapp.com') ||
          host === window.location.hostname
        if (!allowed) {
          e.preventDefault()
        }
      }
      document.addEventListener('click', onClick, true)

      return () => document.removeEventListener('click', onClick, true)
    }

    let cleanup: (() => void) | void
    init().then((fn) => { cleanup = fn })

    return () => {
      document.documentElement.classList.remove('native-app')
      document.body.classList.remove('native-app')
      cleanup?.()
    }
  }, [])

  return <>{children}</>
}
