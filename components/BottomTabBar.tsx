'use client'

import { useEffect, useState, useTransition, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'

type TabItem = { href: string; label: string; icon: string; match: (p: string) => boolean }

const TABS: TabItem[] = [
  { href: '/', label: 'Keşfet', icon: '🏠', match: (p) => p === '/' },
  { href: '/tara', label: 'Tara', icon: '📷', match: (p) => p === '/tara' },
  { href: '/brosurler', label: 'Broşürler', icon: '📄', match: (p) => p === '/brosurler' },
  { href: '/profil', label: 'Profil', icon: '👤', match: (p) => p === '/profil' },
]

export default function BottomTabBar() {
  const pathname = usePathname()
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [pressed, setPressed] = useState<string | null>(null)

  useEffect(() => {
    TABS.forEach((tab) => router.prefetch(tab.href))
  }, [router])

  const navigate = (href: string) => {
    if (pathname === href) return
    setPressed(href)
    startTransition(() => {
      router.push(href, { scroll: false })
    })
  }

  const tabBtn = (active: boolean, children: ReactNode, onClick: () => void, key: string) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      onPointerDown={() => setPressed(key)}
      onPointerUp={() => setPressed(null)}
      onPointerLeave={() => setPressed(null)}
      className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 h-full py-1 rounded-xl mx-0.5 transition-colors duration-100 select-none ${
        active
          ? 'text-primary bg-primary/10'
          : pressed === key
            ? 'text-primary bg-gray-100'
            : 'text-gray-500 active:bg-gray-100'
      }`}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {children}
    </button>
  )

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-100 shadow-[0_-2px_16px_rgba(0,0,0,0.05)] lg:hidden">
      {/* Tab satırı — safe area'nın hemen üstünde */}
      <div className="flex items-center h-14 max-w-lg mx-auto px-2">
        {TABS.map((tab) => {
          const isActive = tab.match(pathname)
          return tabBtn(
            isActive,
            <>
              <span className="flex h-6 items-center justify-center text-[22px] leading-none">{tab.icon}</span>
              <span className={`text-[10px] leading-tight ${isActive ? 'font-bold' : 'font-semibold'}`}>{tab.label}</span>
            </>,
            () => navigate(tab.href),
            tab.href
          )
        })}
      </div>
      {/* Home indicator alanı — içerik buraya taşmaz */}
      <div aria-hidden className="h-[env(safe-area-inset-bottom,0px)]" />
    </nav>
  )
}
