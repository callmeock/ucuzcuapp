'use client'

import { useState, useEffect, useMemo } from 'react'
import { getProducts } from '@/lib/db'
import { Product } from '@/lib/types'
import Link from 'next/link'
import Header from '@/components/Header'
import CategoryFilter from '@/components/CategoryFilter'
import ProductCard from '@/components/ProductCard'
import ProductModal from '@/components/ProductModal'
import BasketPanel from '@/components/BasketPanel'
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

  // ── Lokasyon ──
  const [location, setLocation] = useState<UserLocation | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationDismissed, setLocationDismissed] = useState(false)

  useEffect(() => {
    // Kayıtlı konum varsa yükle
    const saved = getSavedLocation()
    if (saved) setLocation(saved)
    // Banner'ı daha önce kapattıysa gösterme
    if (typeof window !== 'undefined' && localStorage.getItem('ucuzcu_loc_dismissed')) {
      setLocationDismissed(true)
    }
  }, [])

  const handleRequestLocation = async () => {
    setLocationLoading(true)
    try {
      const loc = await requestLocation()
      setLocation(loc)
    } catch {
      // izin reddedildi — banner'ı kapat
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

  useEffect(() => {
    getProducts()
      .then((data) => {
        setProducts(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setError('Ürünler yüklenemedi. Firestore bağlantısını kontrol edin.')
        setLoading(false)
      })
  }, [])

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

  // Filtre değişince sayacı sıfırla
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

  const toggleBasket = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation()
    setBasket((prev) => {
      const next = { ...prev }
      if (next[product.id]) delete next[product.id]
      else next[product.id] = product
      return next
    })
  }

  return (
    <>
      <Header
        search={search}
        onSearch={setSearch}
        basketCount={Object.keys(basket).length}
        onBasketOpen={() => setBasketOpen(true)}
      />

      <main className="max-w-6xl mx-auto px-4 pb-8">

        {/* Lokasyon banner — konum yoksa göster */}
        {showLocationBanner && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mt-3 mb-1">
            <span className="text-xl shrink-0">📍</span>
            <div className="flex-1">
              <p className="font-bold text-sm text-blue-800">En yakın marketleri görelim</p>
              <p className="text-xs text-blue-500">Konumunu paylaşırsan sana özel market sıralaması yapalım</p>
            </div>
            <button
              onClick={handleRequestLocation}
              disabled={locationLoading}
              className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 shrink-0"
            >
              {locationLoading ? '...' : 'İzin Ver'}
            </button>
            <button
              onClick={handleDismissLocation}
              className="text-blue-300 hover:text-blue-500 text-lg shrink-0 transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        {/* Konum göstergesi — konum alındıysa */}
        {location && (
          <div className="flex items-center gap-2 mt-3 mb-1 px-1">
            <span className="text-sm">📍</span>
            <span className="text-sm text-gray-600 font-semibold">{location.label}</span>
            <button
              onClick={() => { clearLocation(); setLocation(null); setLocationDismissed(false); try { localStorage.removeItem('ucuzcu_loc_dismissed') } catch { /* ignore */ } }}
              className="text-xs text-gray-400 hover:text-gray-600 ml-1"
            >
              Değiştir
            </button>
          </div>
        )}

        {/* Broşür bandı */}
        <Link
          href="/brosurler"
          className="flex items-center gap-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl px-4 py-3 mt-2 mb-1 hover:opacity-90 transition-opacity"
        >
          <span className="text-xl">🔥</span>
          <div className="flex-1">
            <p className="font-bold text-sm">Bu Haftanın Fırsatları</p>
            <p className="text-xs text-orange-100">Migros, A101, Şok broşürleri burada</p>
          </div>
          <span className="text-white/70 text-sm">→</span>
        </Link>

        <CategoryFilter
          activeCategory={activeCategory}
          activeSubcategory={activeSubcategory}
          onCategoryChange={(cat) => { setActiveCategory(cat); setActiveSubcategory('Tümü') }}
          onSubcategoryChange={setActiveSubcategory}
          counts={categoryCounts}
          subcategoryCounts={subcategoryCounts}
        />

        {/* Stats bar */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="bg-white rounded-lg shadow-sm px-3 py-2 text-sm">
            <strong className="text-primary">{products.length}</strong> ürün karşılaştırılıyor
          </div>
          <div className="bg-white rounded-lg shadow-sm px-3 py-2 text-sm">
            <strong className="text-primary">4</strong> market
          </div>
          {search && (
            <div className="bg-white rounded-lg shadow-sm px-3 py-2 text-sm text-gray-600">
              {filtered.length} sonuç: &ldquo;{search}&rdquo;
              <button onClick={() => setSearch('')} className="ml-2 text-primary font-semibold">
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Ürünler yükleniyor...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-700">
            <div className="text-2xl mb-2">⚠️</div>
            <div className="font-semibold">{error}</div>
            <div className="text-sm mt-1 text-red-500">
              Firebase Console → Firestore Database → Kural olarak read:true yap
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-3">🔍</div>
            <div className="font-semibold text-lg">Ürün bulunamadı</div>
            <div className="text-sm mt-1">Farklı bir arama deneyin</div>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="mt-3 text-primary font-semibold text-sm hover:underline"
              >
                Aramayı temizle
              </button>
            )}
          </div>
        )}

        {/* Product Grid */}
        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setVisibleCount((n) => n + 50)}
                  className="bg-white border border-gray-200 shadow-sm text-gray-700 font-semibold px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Daha Fazla Göster ({filtered.length - visibleCount} ürün daha)
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Market Legend */}
      {!loading && products.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 pb-6 flex gap-3 flex-wrap">
          {[
            { name: 'Migros', color: '#f97316' },
            { name: 'A101', color: '#dc2626' },
            { name: 'BİM', color: '#2563eb' },
            { name: 'Şok', color: '#7c3aed' },
          ].map((m) => (
            <div key={m.name} className="flex items-center gap-1.5 bg-white rounded-lg px-3 py-1.5 shadow-sm text-sm font-semibold text-gray-700">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: m.color }} />
              {m.name}
            </div>
          ))}
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}

      {/* Basket Panel */}
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
