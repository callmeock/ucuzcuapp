'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getGuestPoints } from '@/lib/points'
import { useAuth } from '@/lib/auth'

interface HeaderProps {
  search: string
  onSearch: (v: string) => void
  basketCount: number
  onBasketOpen: () => void
}

export default function Header({ search, onSearch, basketCount, onBasketOpen }: HeaderProps) {
  const [points, setPoints] = useState(0)
  const { user } = useAuth()

  useEffect(() => {
    setPoints(getGuestPoints())
    const handler = () => setPoints(getGuestPoints())
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  return (
    <header className="bg-primary sticky top-0 z-50 shadow-md safe-top">
      {/* Üst: logo + aksiyonlar */}
      <div className="max-w-6xl mx-auto px-3 pt-2 flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2 shrink-0 min-w-0">
          <img src="/logo.png" alt="Ucuzcu" className="w-9 h-9 rounded-lg object-cover shrink-0" />
          <span className="text-white font-extrabold text-lg tracking-tight hidden min-[400px]:inline">
            Ucuzcu
          </span>
        </Link>

        <div className="flex items-center gap-1.5 shrink-0">
          <Link
            href="/tara"
            className="flex items-center gap-1 bg-green-500 hover:bg-green-600 rounded-lg px-2.5 py-1.5 text-white font-semibold text-sm transition-colors"
          >
            <span>📷</span>
            <span className="hidden sm:inline">Tara</span>
            {points > 0 && (
              <span className="bg-yellow-400 text-yellow-900 rounded-full px-1.5 text-xs font-extrabold">
                {points}⭐
              </span>
            )}
          </Link>

          <Link href="/profil" className="shrink-0">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full ring-2 ring-white/40 hover:ring-white transition-all"/>
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-base transition-colors">
                👤
              </div>
            )}
          </Link>

          <button
            onClick={onBasketOpen}
            className="relative flex items-center justify-center bg-white/20 hover:bg-white/30 border-2 border-white/40 rounded-lg w-9 h-9 text-white transition-colors shrink-0"
          >
            🛒
            {basketCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-white text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-extrabold">
                {basketCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Alt: tam genişlik arama */}
      <div className="max-w-6xl mx-auto px-3 py-2">
        <div className="flex bg-white rounded-full overflow-hidden shadow-md">
          <input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Ürün ara..."
            className="flex-1 min-w-0 px-4 py-2.5 text-sm text-gray-800 outline-none"
          />
          <button
            type="button"
            className="bg-primary-dark text-white px-4 shrink-0 hover:opacity-90 transition-opacity"
            aria-label="Ara"
          >
            🔍
          </button>
        </div>
      </div>
    </header>
  )
}
