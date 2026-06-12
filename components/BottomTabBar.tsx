'use client'

import Link from 'next/link'
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

export default function BottomTabBar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleSearch = () => {
    if (pathname === '/') {
      window.dispatchEvent(new CustomEvent('ucuzcu:focus-search'))
    } else {
      router.push('/?focus=search')
    }
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] safe-bottom">
      <div className="flex items-stretch h-14 max-w-lg mx-auto">
        {TABS.map((tab) => {
          if ('action' in tab && tab.action === 'search') {
            return (
              <button
                key={tab.label}
                type="button"
                onClick={handleSearch}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-500 hover:text-primary transition-colors min-w-0"
              >
                <span className="text-xl leading-none">{tab.icon}</span>
                <span className="text-[10px] font-semibold">{tab.label}</span>
              </button>
            )
          }

          if (!('href' in tab)) return null

          const isActive = tab.match(pathname)

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors min-w-0 ${
                isActive ? 'text-primary' : 'text-gray-500 hover:text-primary'
              }`}
            >
              <span className="text-xl leading-none">{tab.icon}</span>
              <span className={`text-[10px] font-semibold ${isActive ? 'font-bold' : ''}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-[calc(env(safe-area-inset-bottom)+2px)] w-8 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
