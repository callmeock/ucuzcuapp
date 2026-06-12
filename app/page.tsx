'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { getProducts } from '@/lib/db'
import { Product } from '@/lib/types'
import Link from 'next/link'
import Header from '@/components/Header'
import CategoryFilter from '@/components/CategoryFilter'
import ProductCard from '@/components/ProductCard'
import ProductCardSkeleton from '@/components/ProductCardSkeleton'
import ProductModal from '@/components/ProductModal'
import BasketPanel from '@/components/BasketPanel'
import PullToRefresh from '@/components/PullToRefresh'
import { getSavedLocation, requestLocation, clearLocation, type UserLocation } from '@/lib/location'

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('Tümü')
  const [activeSubcategory, setActiveSubcategory] = useState('Tümü')
  const [basket, setBasket] = useState<Record<string, Product>>({})
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [basketOpen, setBasketOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(50)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const [location, setLocation] = useState<UserLocation | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationDismissed, setLocationDismissed] = useState(false)

  const loadProducts = useCallback(async () => {
    const data = await getProducts()
    setProducts(data)
    setError(null)
    return data
  }, [])

  useEffect(() => {
    const saved = getSavedLocation()
    if (saved) setLocation(saved)
    if (typeof window !== 'undefined' && localStorage.getItem('ucuzcu_loc_dismissed')) {
      setLocationDismissed(true)
    }
  }, [])

  useEffect(() => {
    loadProducts()
      .then(() => setLoading(false))
      .catch((err) => {
        console.error(err)
        setError('Ürünler yüklenemedi. Firestore bağlantısını kontrol edin.')
        setLoading(false)
      })
  }, [loadProducts])

  const handleRefresh = useCallback(async () => {
    setLoading(true)
    try {
      await loadProducts()
    } catch {
      setError('Yenileme başarısız.')
    } finally {
      setLoading(false)
    }
  }, [loadProducts])

  const handleRequestLocation = async () => {
    setLocationLoading(true)
    try {
      const loc = await requestLocation()
      setLocation(loc)
    } catch {
      setLocationDismissed(true)
      try { localStorage.setItem('ucuzcu_loc_dismissed', '1') } catch { /* private mode */ }
    } finally {
      setLocationLoading(false)
    }
  }

  const handleDismissLocation = () => {
    setLocationDismissed(true)
    try { localStorage.setItem('ucuzcu_loc_dismissed', '1') } catch { /* private mode */ }
  }

  const showLocationBanner = !location && !locationDismissed

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return products.filter((p) => {
      const matchCat = activeCategory === 'Tümü' || p.category === activeCategory
      const matchSub = activeSubcategory === 'Tümü' || p.subcategory === activeSubcategory
      const matchQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      return matchCat && matchSub && matchQ
    })
  }, [products, search, activeCategory, activeSubcategory])

  useEffect(() => { setVisibleCount(50) }, [search, activeCategory, activeSubcategory])

  const visibleProducts = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 'Tümü': products.length }
    products.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1
    })
    return counts
  }, [products])

  const subcategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    products
      .filter((p) => activeCategory === 'Tümü' || p.category === activeCategory)
      .forEach((p) => {
        if (p.subcategory) counts[p.subcategory] = (counts[p.subcategory] || 0) + 1
      })
    return counts
  }, [products, activeCategory])

  // Infinite scroll — scroll container içinde
  useEffect(() => {
    const root = scrollRef.current
    const el = sentinelRef.current
    if (!el || !root || loading) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((n) => Math.min(n + 50, filtered.length))
        }
      },
      { root, rootMargin: '300px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [filtered.length, loading])

  const toggleBasket = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation()
    setBasket((prev) => {
      const next = { ...prev }
      if (next[product.id]) delete next[product.id]
      else next[product.id] = product
      return next
    })
  }

  const basketCount = Object.keys(basket).length

  return (
    <>
      <Header search={search} onSearch={setSearch} productCount={products.length} />

      <div ref={scrollRef} className="content-scroll">
        <PullToRefresh onRefresh={handleRefresh} scrollRef={scrollRef}>
          <main className="max-w-6xl mx-auto px-4 pb-4">
          {showLocationBanner && (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mt-3 mb-1">
              <span className="text-xl shrink-0">📍</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-blue-800">En yakın marketleri görelim</p>
                <p className="text-xs text-blue-500">Konumunu paylaşırsan sana özel sıralama yapalım</p>
              </div>
              <button
                onClick={handleRequestLocation}
                disabled={locationLoading}
                className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 shrink-0"
              >
                {locationLoading ? '...' : 'İzin Ver'}
              </button>
              <button onClick={handleDismissLocation} className="text-blue-300 hover:text-blue-500 text-lg shrink-0">✕</button>
            </div>
          )}

          {location && (
            <div className="flex items-center gap-2 mt-3 mb-1 px-1">
              <span className="text-sm">📍</span>
              <span className="text-sm text-gray-600 font-semibold truncate">{location.label}</span>
              <button
                onClick={() => { clearLocation(); setLocation(null); setLocationDismissed(false); try { localStorage.removeItem('ucuzcu_loc_dismissed') } catch { /* ignore */ } }}
                className="text-xs text-gray-400 hover:text-gray-600 shrink-0"
              >
                Değiştir
              </button>
            </div>
          )}

          <Link
            href="/brosurler"
            className="flex items-center gap-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl px-4 py-3 mt-2 mb-1 hover:opacity-90 transition-opacity"
          >
            <span className="text-xl">🔥</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">Bu Haftanın Fırsatları</p>
              <p className="text-xs text-orange-100 truncate">Migros, A101, Şok broşürleri burada</p>
            </div>
            <span className="text-white/70 text-sm shrink-0">→</span>
          </Link>

          <CategoryFilter
            activeCategory={activeCategory}
            activeSubcategory={activeSubcategory}
            onCategoryChange={(cat) => { setActiveCategory(cat); setActiveSubcategory('Tümü') }}
            onSubcategoryChange={setActiveSubcategory}
            counts={categoryCounts}
            subcategoryCounts={subcategoryCounts}
          />

          {search && !loading && (
            <div className="mb-3 text-sm text-gray-500">
              {filtered.length} sonuç: &ldquo;{search}&rdquo;
              <button onClick={() => setSearch('')} className="ml-2 text-primary font-semibold">✕</button>
            </div>
          )}

          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-700">
              <div className="text-2xl mb-2">⚠️</div>
              <div className="font-semibold">{error}</div>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-3">🔍</div>
              <div className="font-semibold text-lg">Ürün bulunamadı</div>
              {search && (
                <button onClick={() => setSearch('')} className="mt-3 text-primary font-semibold text-sm hover:underline">
                  Aramayı temizle
                </button>
              )}
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {visibleProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    inBasket={!!basket[p.id]}
                    onClick={() => setSelectedProduct(p)}
                    onAddToBasket={(e) => toggleBasket(p, e)}
                  />
                ))}
              </div>
              {visibleCount < filtered.length && (
                <div ref={sentinelRef} className="flex justify-center py-6">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </>
          )}
          </main>
        </PullToRefresh>
      </div>

      {/* Sepet FAB */}
      {basketCount > 0 && (
        <button
          onClick={() => setBasketOpen(true)}
          className="fixed right-4 z-40 bg-primary text-white rounded-full shadow-lg flex items-center gap-2 px-4 py-3 font-bold text-sm hover:bg-primary-dark transition-colors"
          style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom) + 0.75rem)' }}
        >
          🛒 Sepet
          <span className="bg-white text-primary rounded-full w-6 h-6 flex items-center justify-center text-xs font-extrabold">
            {basketCount}
          </span>
        </button>
      )}

      {selectedProduct && (
        <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}

      <BasketPanel
        open={basketOpen}
        onClose={() => setBasketOpen(false)}
        basket={basket}
        onRemove={(id) =>
          setBasket((prev) => {
            const next = { ...prev }
            delete next[id]
            return next
          })
        }
      />
    </>
  )
}
