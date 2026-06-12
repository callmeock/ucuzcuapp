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
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-2 sm:gap-3">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <img src="/logo.png" alt="Ucuzcu" className="w-8 h-8 rounded-lg object-cover" />
          <span className="text-white font-extrabold text-xl tracking-tight">Ucuzcu</span>
          <span className="text-white/60 text-xs hidden sm:inline ml-1">market karşılaştırma</span>
        </div>

        {/* Search */}
        <div className="flex-1 flex bg-white rounded-full overflow-hidden shadow-md max-w-lg">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Ürün ara... (süt, ekmek, yumurta...)"
            className="flex-1 px-4 py-2 text-sm text-gray-800 outline-none"
          />
          <button className="bg-primary-dark text-white px-4 text-base hover:bg-red-800 transition-colors">
            🔍
          </button>
        </div>

        {/* Tara butonu */}
        <Link
          href="/tara"
          className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 rounded-lg px-3 py-1.5 text-white font-semibold text-sm transition-colors shrink-0"
        >
          <span>📷</span>
          <span className="hidden sm:inline">Tara</span>
          {points > 0 && (
            <span className="bg-yellow-400 text-yellow-900 rounded-full px-1.5 text-xs font-extrabold">
              {points}⭐
            </span>
          )}
        </Link>

        {/* Profil */}
        <Link href="/profil" className="shrink-0">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full ring-2 ring-white/40 hover:ring-white transition-all"/>
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-base transition-colors">
              👤
            </div>
          )}
        </Link>

        {/* Basket */}
        <button
          onClick={onBasketOpen}
          className="flex items-center gap-2 bg-white/20 hover:bg-white/30 border-2 border-white/40 rounded-lg px-3 py-1.5 text-white font-semibold text-sm transition-colors shrink-0"
        >
          🛒
          <span className="hidden sm:inline">Sepet</span>
          {basketCount > 0 && (
            <span className="bg-white text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-extrabold">
              {basketCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
