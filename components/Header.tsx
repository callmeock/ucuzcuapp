'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'

interface HeaderProps {
  search: string
  onSearch: (v: string) => void
  productCount?: number
}

export default function Header({ search, onSearch, productCount }: HeaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const focus = () => {
      inputRef.current?.focus()
    }
    window.addEventListener('ucuzcu:focus-search', focus)

    const params = new URLSearchParams(window.location.search)
    if (params.get('focus') === 'search') {
      focus()
      window.history.replaceState({}, '', '/')
    }

    return () => window.removeEventListener('ucuzcu:focus-search', focus)
  }, [])

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-brand shadow-md safe-top">
      <div className="max-w-6xl mx-auto px-3 h-14 flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2 shrink-0 min-w-0">
          <img src="/logo.png" alt="Ucuzcu" className="w-9 h-9 rounded-lg object-cover shrink-0" />
          <div className="min-w-0 hidden min-[360px]:block">
            <span className="text-white font-extrabold text-lg tracking-tight leading-none block">
              Ucuzcu
            </span>
            {productCount != null && productCount > 0 && (
              <span className="text-white/75 text-[10px] font-medium leading-tight">
                {productCount.toLocaleString('tr-TR')} ürün · 4 market
              </span>
            )}
          </div>
        </Link>

        <div className="flex-1 flex bg-white rounded-full overflow-hidden shadow-md min-w-0">
          <input
            ref={inputRef}
            id="main-search"
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Ürün ara..."
            className="flex-1 min-w-0 px-3 py-2.5 text-sm text-gray-800 outline-none"
          />
          <button
            type="button"
            className="bg-primary text-white px-3.5 shrink-0 hover:bg-primary-dark transition-colors"
            aria-label="Ara"
          >
            🔍
          </button>
        </div>
      </div>
    </header>
  )
}
