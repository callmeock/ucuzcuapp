'use client'

import Link from 'next/link'
import { useEffect, useRef, type RefObject } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'

interface SearchBarProps {
  search: string
  onSearch: (v: string) => void
}

const DESKTOP_NAV = [
  { href: '/', label: 'Keşfet', match: (p: string) => p === '/' },
  { href: '/brosurler', label: 'Broşürler', match: (p: string) => p === '/brosurler' },
  { href: '/tara', label: 'Tara', match: (p: string) => p === '/tara' },
  { href: '/profil', label: 'Profil', match: (p: string) => p === '/profil' },
]

function SearchInput({
  search,
  onSearch,
  inputRef,
  onFocus,
  compact,
}: SearchBarProps & {
  inputRef: RefObject<HTMLInputElement>
  onFocus?: () => void
  compact?: boolean
}) {
  return (
    <div className={`flex bg-white rounded-full overflow-hidden shadow-md min-w-0 ${compact ? 'max-w-xs' : 'w-full'}`}>
      <input
        ref={inputRef}
        id={compact ? 'header-search' : 'main-search'}
        type="search"
        enterKeyHint="search"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        onFocus={onFocus}
        placeholder="Ürün ara..."
        className="flex-1 min-w-0 px-3 py-2 text-sm lg:text-base text-gray-800 outline-none"
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
  )
}

function HeaderAuthButton() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="w-24 h-9 rounded-full bg-white/20 animate-pulse shrink-0" />
  }

  if (user) {
    return (
      <Link
        href="/profil"
        className="flex items-center gap-2 bg-white/15 hover:bg-white/25 rounded-full pl-1 pr-3 py-1 transition-colors shrink-0"
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <span className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center text-sm">👤</span>
        )}
        <span className="text-white text-sm font-semibold truncate max-w-[100px]">
          {user.displayName?.split(' ')[0] ?? 'Profil'}
        </span>
      </Link>
    )
  }

  return (
    <Link
      href="/giris"
      className="bg-white text-primary px-4 py-2 rounded-full text-sm font-bold hover:bg-white/90 transition-colors shrink-0"
    >
      Giriş Yap
    </Link>
  )
}

/** Sabit üst şerit (mobil) / tam navbar (masaüstü) */
export function FixedLogoBar({
  productCount,
  search,
  onSearch,
}: { productCount?: number } & Partial<SearchBarProps>) {
  const pathname = usePathname()
  const desktopSearchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const focus = () => desktopSearchRef.current?.focus({ preventScroll: true })
    window.addEventListener('ucuzcu:focus-search', focus)
    return () => window.removeEventListener('ucuzcu:focus-search', focus)
  }, [])

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-brand shadow-md safe-top lg:static lg:shadow-sm">
      {/* ── Mobil: logo şeridi ── */}
      <div className="lg:hidden max-w-6xl mx-auto px-3 h-12 flex items-center gap-2">
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

      {/* ── Masaüstü: logo + nav + arama + giriş ── */}
      <div className="hidden lg:block border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-5">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <img src="/logo.png" alt="Ucuzcu" className="w-9 h-9 rounded-lg object-cover" />
            <div>
              <span className="text-white font-extrabold text-lg tracking-tight leading-none block">
                Ucuzcu
              </span>
              {productCount != null && productCount > 0 && (
                <span className="text-white/70 text-[11px] font-medium">
                  {productCount.toLocaleString('tr-TR')} ürün · 4 market
                </span>
              )}
            </div>
          </Link>

          <nav className="flex items-center gap-1 shrink-0">
            {DESKTOP_NAV.map((item) => {
              const isActive = item.match(pathname)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'text-white/85 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {search != null && onSearch && (
            <div className="flex-1 max-w-md mx-auto">
              <SearchInput
                search={search}
                onSearch={onSearch}
                inputRef={desktopSearchRef}
              />
            </div>
          )}

          <HeaderAuthButton />
        </div>
      </div>
    </header>
  )
}

/** Scroll alanı içinde — klavye açılınca fixed header etkilenmez (mobil only) */
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
    window.scrollTo(0, 0)
    const scroll = document.querySelector('.content-scroll') as HTMLElement | null
    if (scroll) scroll.scrollTop = 0
  }

  return (
    <div className="sticky top-0 z-40 bg-brand px-3 pb-2 pt-1 lg:hidden">
      <div className="max-w-6xl mx-auto">
        <SearchInput search={search} onSearch={onSearch} inputRef={inputRef} onFocus={handleFocus} />
      </div>
    </div>
  )
}

/** Geriye uyumluluk */
export default function Header(props: SearchBarProps & { productCount?: number }) {
  return (
    <>
      <FixedLogoBar productCount={props.productCount} search={props.search} onSearch={props.onSearch} />
      <SearchBar search={props.search} onSearch={props.onSearch} />
    </>
  )
}
