/** Capacitor native shell içinde mi çalışıyoruz? */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
  return cap?.isNativePlatform?.() === true
}

/** iOS WKWebView — popup auth çalışmaz, redirect gerekir */
export function needsRedirectAuth(): boolean {
  if (typeof window === 'undefined') return false
  if (isNativeApp()) return true
  // iOS Safari (standalone PWA dahil)
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return isIOS
}
