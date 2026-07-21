'use client'

import { useState, useEffect } from 'react'
import { Basket, BasketEntry, MARKET_COLORS } from '@/lib/types'

const MARKETS = ['Migros', 'A101', 'Şok', 'Getir', 'Yemeksepeti'] as const
type MarketName = typeof MARKETS[number]
type ViewMode = 'cheapest' | MarketName

interface BasketPanelProps {
  open: boolean
  onClose: () => void
  basket: Basket
  onUpdateQuantity: (id: string, delta: number) => void
}

// Efektif fiyat: discount kampanyasında kart fiyatı, cashback'te normal fiyat
function effectivePrice(pr: { currentPrice: number; campaign?: { type: string; campaignPrice?: number } | null }) {
  if (pr.campaign?.type === 'discount' && pr.campaign.campaignPrice != null) {
    return pr.campaign.campaignPrice
  }
  return pr.currentPrice
}

// En ucuz kombinasyonu hesapla (her ürün için ayrı market)
function calcCheapest(items: BasketEntry[]) {
  let total = 0
  const rows = items.map(({ product: p, quantity }) => {
    const available = p.prices.filter((pr) => pr.available)
    if (available.length === 0) return { product: p, quantity, market: null, price: null, lineTotal: null, hasCampaign: false }
    const cheapest = available.reduce((a, b) =>
      effectivePrice(a) < effectivePrice(b) ? a : b
    )
    const price = effectivePrice(cheapest)
    const lineTotal = price * quantity
    total += lineTotal
    return { product: p, quantity, market: cheapest.market, price, lineTotal, hasCampaign: !!cheapest.campaign }
  })
  return { rows, total }
}

// Belirli bir marketteki sepeti hesapla
function calcMarket(items: BasketEntry[], market: MarketName) {
  let total = 0
  let unavailableCount = 0
  const rows = items.map(({ product: p, quantity }) => {
    const entry = p.prices.find((pr) => pr.market === market)
    if (!entry || !entry.available) {
      unavailableCount++
      return { product: p, quantity, price: null, lineTotal: null, available: false, hasCampaign: false }
    }
    const price = effectivePrice(entry)
    const lineTotal = price * quantity
    total += lineTotal
    return { product: p, quantity, price, lineTotal, available: true, hasCampaign: !!entry.campaign }
  })
  return { rows, total, unavailableCount }
}

export default function BasketPanel({ open, onClose, basket, onUpdateQuantity }: BasketPanelProps) {
  const [view, setView] = useState<ViewMode>('cheapest')
  const items = Object.values(basket)
  const totalQuantity = items.reduce((sum, e) => sum + e.quantity, 0)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const cheapest = calcCheapest(items)

  // Her market için toplam (tab labelları için)
  const marketTotals = MARKETS.map((m) => {
    const { total, unavailableCount } = calcMarket(items, m)
    return { market: m, total, unavailableCount }
  }).filter(({ total }) => total > 0 || items.length === 0)

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />}

      <div className={`fixed top-14 md:top-0 right-0 bottom-0 w-full max-w-md md:w-96 bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Başlık */}
        <div className="bg-primary text-white px-4 py-3 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-base">🛒 Sepetim
            {totalQuantity > 0 && <span className="ml-2 bg-white/20 text-sm px-2 py-0.5 rounded-full">{totalQuantity} adet</span>}
          </h3>
          <button onClick={onClose} className="text-white/80 hover:text-white text-xl leading-none">✕</button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
            <span className="text-6xl">🛒</span>
            <div className="font-semibold">Sepetiniz boş</div>
            <div className="text-sm">Ürün kartlarından ekleyin</div>
          </div>
        ) : (
          <>
            {/* Ürün listesi */}
            <div className="border-b border-gray-100 divide-y divide-gray-50 overflow-y-auto shrink-0 max-h-52">
              {items.map(({ product: p, quantity }) => {
                const available = p.prices.filter((pr) => pr.available)
                const minPrice = available.length ? Math.min(...available.map(effectivePrice)) : null
                return (
                  <div key={p.id} className="flex items-center gap-2 px-4 py-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-900 truncate">{p.name}</div>
                      <div className="text-xs text-gray-400">{p.brand} · {p.unit}</div>
                    </div>
                    {minPrice && (
                      <span className="text-xs font-bold text-green-600 shrink-0">
                        {(minPrice * quantity).toFixed(2)} ₺
                      </span>
                    )}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onUpdateQuantity(p.id, -1)}
                        className="w-7 h-7 rounded-lg bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors"
                        aria-label="Azalt"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-bold text-gray-800">{quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(p.id, 1)}
                        className="w-7 h-7 rounded-lg bg-primary text-white font-bold hover:bg-primary-dark transition-colors"
                        aria-label="Artır"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Toggle — hangi görünüm */}
            <div className="px-3 pt-3 pb-2 shrink-0">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Sepet karşılaştırması</div>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {/* En ucuz tab */}
                <button
                  onClick={() => setView('cheapest')}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                    view === 'cheapest'
                      ? 'bg-amber-400 border-amber-400 text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-amber-300'
                  }`}
                >
                  🏆 En Ucuz
                </button>

                {/* Market tabları */}
                {MARKETS.map((m) => {
                  const info = marketTotals.find((mt) => mt.market === m)
                  const isActive = view === m
                  const color = MARKET_COLORS[m]
                  return (
                    <button
                      key={m}
                      onClick={() => setView(m)}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all`}
                      style={
                        isActive
                          ? { background: color, borderColor: color, color: 'white' }
                          : { background: 'white', borderColor: '#e5e7eb', color: '#374151' }
                      }
                    >
                      {m}
                      {info && info.unavailableCount > 0 && (
                        <span className={`ml-1 text-xs ${isActive ? 'text-white/70' : 'text-red-400'}`}>
                          ⚠️
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* İçerik alanı */}
            <div className="flex-1 overflow-y-auto px-3 pb-3">

              {/* ── EN UCUZ KOMBİNASYON ── */}
              {view === 'cheapest' && (
                <div className="space-y-1">
                  <div className="text-xs text-gray-400 px-1 mb-2">
                    Her ürün için en ucuz market seçildi
                  </div>

                  {cheapest.rows.map(({ product, quantity, market, price, lineTotal }) => (
                    <div key={product.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-900 truncate">
                          {product.name}
                          {quantity > 1 && <span className="text-gray-400 font-medium"> ×{quantity}</span>}
                        </div>
                        {market ? (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: MARKET_COLORS[market] }} />
                            <span className="text-xs text-gray-500">{market}&apos;tan al</span>
                            {quantity > 1 && price != null && (
                              <span className="text-xs text-gray-400">· {price.toFixed(2)} ₺/adet</span>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-red-400 mt-0.5">⚠️ Hiçbir markette yok</div>
                        )}
                      </div>
                      <span className={`font-bold text-sm shrink-0 ${lineTotal ? 'text-green-600' : 'text-gray-300'}`}>
                        {lineTotal != null ? lineTotal.toFixed(2) + ' ₺' : '—'}
                      </span>
                    </div>
                  ))}

                  {/* Toplam */}
                  <div className="mt-3 bg-amber-50 border-2 border-amber-200 rounded-xl px-4 py-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-bold text-gray-900">En Ucuz Toplam</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {[...new Set(cheapest.rows.filter(r => r.market).map(r => r.market))].length} marketten alışveriş
                        </div>
                      </div>
                      <div className="text-2xl font-extrabold text-amber-600">
                        {cheapest.total.toFixed(2)} ₺
                      </div>
                    </div>

                    {/* Market bazında kırılım */}
                    {(() => {
                      const byMarket: Record<string, number> = {}
                      cheapest.rows.forEach(({ market, lineTotal }) => {
                        if (market && lineTotal != null) byMarket[market] = (byMarket[market] || 0) + lineTotal
                      })
                      const entries = Object.entries(byMarket).sort((a, b) => a[1] - b[1])
                      if (entries.length <= 1) return null
                      return (
                        <div className="mt-2 pt-2 border-t border-amber-200 space-y-1">
                          {entries.map(([market, subtotal]) => (
                            <div key={market} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ background: MARKET_COLORS[market] }} />
                                <span className="text-gray-600">{market}</span>
                              </div>
                              <span className="font-semibold text-gray-700">{subtotal.toFixed(2)} ₺</span>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}

              {/* ── MARKET GÖRÜNÜMÜ ── */}
              {MARKETS.includes(view as MarketName) && (() => {
                const market = view as MarketName
                const { rows, total, unavailableCount } = calcMarket(items, market)
                const color = MARKET_COLORS[market]

                // Bu marketin en ucuz mı karşılaştırması
                const cheapestTotal = cheapest.total
                const diff = total - cheapestTotal

                return (
                  <div className="space-y-1">
                    {unavailableCount > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700 font-semibold mb-2">
                        ⚠️ {unavailableCount} ürün {market}&apos;ta bulunmuyor
                      </div>
                    )}

                    {rows.map(({ product, quantity, price, lineTotal, available: avail }) => (
                      <div key={product.id}
                        className={`flex items-center gap-2 rounded-xl px-3 py-2.5 ${avail ? 'bg-gray-50' : 'bg-red-50'}`}>
                        <div className="flex-1 min-w-0">
                          <div className={`font-semibold text-sm truncate ${avail ? 'text-gray-900' : 'text-red-400'}`}>
                            {product.name}
                            {quantity > 1 && <span className={avail ? 'text-gray-400 font-medium' : ''}> ×{quantity}</span>}
                          </div>
                          {!avail && <div className="text-xs text-red-400 mt-0.5">Bu markette yok</div>}
                          {avail && quantity > 1 && price != null && (
                            <div className="text-xs text-gray-400 mt-0.5">{price.toFixed(2)} ₺/adet</div>
                          )}
                        </div>
                        <span className={`font-bold text-sm shrink-0 ${avail ? 'text-gray-800' : 'text-red-300'}`}>
                          {lineTotal != null ? lineTotal.toFixed(2) + ' ₺' : '—'}
                        </span>
                      </div>
                    ))}

                    {/* Toplam kutusu */}
                    <div className="mt-3 rounded-xl px-4 py-3 border-2" style={{ borderColor: color + '66', background: color + '11' }}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-gray-900">
                            Hepsi {market}&apos;tan
                          </div>
                          {unavailableCount > 0
                            ? <div className="text-xs text-red-500 mt-0.5">{items.length - unavailableCount}/{items.length} çeşit mevcut</div>
                            : <div className="text-xs text-green-600 mt-0.5">Tüm ürünler mevcut ✓</div>
                          }
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-extrabold" style={{ color }}>
                            {total.toFixed(2)} ₺
                          </div>
                          {diff > 0.01 && (
                            <div className="text-xs text-red-500 font-semibold">
                              +{diff.toFixed(2)} ₺ fazla
                            </div>
                          )}
                          {diff < -0.01 && (
                            <div className="text-xs text-green-600 font-semibold">
                              {diff.toFixed(2)} ₺ az
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </>
        )}
      </div>
    </>
  )
}
