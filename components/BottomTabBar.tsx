'use client'

import { useEffect, useState, useTransition, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'

type TabItem =
  | { label: string; icon: string; action: 'search' }
  | { href: string; label: string; icon: string; match: (p: string) => boolean }

const TABS: TabItem[] = [
  { href: '/', label: 'Keşfet', icon: '🏠', match: (p) => p === '/' },
  { label: 'Ara', icon: '🔍', action: 'search' },
  { href: '/tara', label: 'Tara', icon: '📷', match: (p) => p === '/tara' },
  { href: '/brosurler', label: 'Broşürler', icon: '📄', match: (p) => p === '/brosurler' },
  { href: '/profil', label: 'Profil', icon: '👤', match: (p) => p === '/profil' },
]

const TAB_HREFS = TABS.filter((t): t is Extract<TabItem, { href: string }> => 'href' in t).map((t) => t.href)

export default function BottomTabBar() {
  const pathname = usePathname()
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [pressed, setPressed] = useState<string | null>(null)

  // Tüm sekmeleri önceden yükle — geçişler anında hissetsin
  useEffect(() => {
    TAB_HREFS.forEach((href) => router.prefetch(href))
  }, [router])

  const navigate = (href: string) => {
    if (pathname === href) return
    setPressed(href)
    startTransition(() => {
      router.push(href, { scroll: false })
    })
  }

  const handleSearch = () => {
    if (pathname === '/') {
      window.dispatchEvent(new CustomEvent('ucuzcu:focus-search'))
    } else {
      startTransition(() => router.push('/?focus=search', { scroll: false }))
    }
  }

  const tabBtn = (active: boolean, children: ReactNode, onClick: () => void, key: string) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      onPointerDown={() => setPressed(key)}
      onPointerUp={() => setPressed(null)}
      onPointerLeave={() => setPressed(null)}
      className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 rounded-xl mx-0.5 transition-colors duration-100 select-none ${
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
    <nav
      className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-100 shadow-[0_-2px_16px_rgba(0,0,0,0.05)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch h-14 max-w-lg mx-auto px-1">
        {TABS.map((tab) => {
          if ('action' in tab && tab.action === 'search') {
            return tabBtn(
              false,
              <>
                <span className="text-[22px] leading-none">{tab.icon}</span>
                <span className="text-[10px] font-semibold">{tab.label}</span>
              </>,
              handleSearch,
              'search'
            )
          }

          if (!('href' in tab)) return null

          const isActive = tab.match(pathname)

          return tabBtn(
            isActive,
            <>
              <span className="text-[22px] leading-none">{tab.icon}</span>
              <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-semibold'}`}>{tab.label}</span>
            </>,
            () => navigate(tab.href),
            tab.href
          )
        })}
      </div>
    </nav>
  )
}
