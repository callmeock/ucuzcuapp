'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'

interface SearchBarProps {
  search: string
  onSearch: (v: string) => void
}

/** Sabit üst şerit — input YOK (iOS keyboard viewport kaydırmasını önler) */
export function FixedLogoBar({ productCount }: { productCount?: number }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-brand shadow-md safe-top">
      <div className="max-w-6xl mx-auto px-3 h-12 flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2 shrink-0 min-w-0">
          <img src="/logo.png" alt="Ucuzcu" className="w-8 h-8 rounded-lg object-cover shrink-0" />
          <div className="min-w-0">
            <span className="text-white font-extrabold text-base tracking-tight leading-none block">
              Ucuzcu
            </span>
            {productCount != null && productCount > 0 && (
              <span className="text-white/75 text-[10px] font-medium leading-tight">
                {productCount.toLocaleString('tr-TR')} ürün · 4 market
              </span>
            )}
          </div>
        </Link>
      </div>
    </header>
  )
}

/** Scroll alanı içinde — klavye açılınca fixed header etkilenmez */
export function SearchBar({ search, onSearch }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const focus = () => {
      inputRef.current?.focus({ preventScroll: true })
    }
    window.addEventListener('ucuzcu:focus-search', focus)

    const params = new URLSearchParams(window.location.search)
    if (params.get('focus') === 'search') {
      focus()
      window.history.replaceState({}, '', '/')
    }

    return () => window.removeEventListener('ucuzcu:focus-search', focus)
  }, [])

  const handleFocus = () => {
    // iOS viewport sıçramasını sıfırla
    window.scrollTo(0, 0)
    const scroll = document.querySelector('.content-scroll') as HTMLElement | null
    if (scroll) scroll.scrollTop = 0
  }

  return (
    <div className="sticky top-0 z-40 bg-brand px-3 pb-2 pt-1">
      <div className="max-w-6xl mx-auto flex bg-white rounded-full overflow-hidden shadow-md min-w-0">
        <input
          ref={inputRef}
          id="main-search"
          type="search"
          enterKeyHint="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          onFocus={handleFocus}
          placeholder="Ürün ara..."
          className="flex-1 min-w-0 px-3 py-2.5 text-base text-gray-800 outline-none"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.focus({ preventScroll: true })}
          className="bg-primary text-white px-3.5 shrink-0 hover:bg-primary-dark transition-colors"
          aria-label="Ara"
        >
          🔍
        </button>
      </div>
    </div>
  )
}

/** Geriye uyumluluk */
export default function Header(props: SearchBarProps & { productCount?: number }) {
  return (
    <>
      <FixedLogoBar productCount={props.productCount} />
      <SearchBar search={props.search} onSearch={props.onSearch} />
    </>
  )
}
