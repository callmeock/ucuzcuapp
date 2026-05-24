'use client'

import { useState } from 'react'
import { getProductByBarcode, searchProductsByName, submitPrice } from '@/lib/submissions'
import { addGuestPoints, getGuestPoints } from '@/lib/points'
import { POINTS, MarketName } from '@/lib/types'
import type { Product } from '@/lib/types'

interface Props {
  barcode: string
  onClose: () => void
  onSuccess: (points: number) => void
}

const MARKETS: MarketName[] = ['Migros', 'A101', 'Şok', 'BİM']

const MARKET_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Migros: { bg: 'bg-orange-50',  text: 'text-orange-700', border: 'border-orange-400' },
  A101:   { bg: 'bg-red-50',     text: 'text-red-700',    border: 'border-red-400' },
  'Şok':  { bg: 'bg-purple-50',  text: 'text-purple-700', border: 'border-purple-400' },
  'BİM':  { bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-400' },
}

export default function PriceSubmitModal({ barcode, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<'loading' | 'product' | 'price' | 'submitting' | 'done'>('loading')
  const [product, setProduct] = useState<Product | null>(null)
  const [productName, setProductName] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedMarket, setSelectedMarket] = useState<MarketName | ''>('')
  const [priceInput, setPriceInput] = useState('')
  const [error, setError] = useState('')

  // Barkod alındıktan sonra ürünü bul
  useState(() => {
    const init = async () => {
      try {
        const found = await getProductByBarcode(barcode)
        if (found) {
          setProduct(found)
          setProductName(found.name)
        }
      } catch { /* ignore */ }
      setStep('product')
    }
    init()
  })

  const handleSearch = async () => {
    if (productName.trim().length < 2) return
    setSearching(true)
    const results = await searchProductsByName(productName.trim())
    setSearchResults(results)
    setSearching(false)
  }

  const selectProduct = (p: Product) => {
    setProduct(p)
    setProductName(p.name)
    setSearchResults([])
  }

  const goToPrice = () => {
    if (!productName.trim()) { setError('Ürün adı gerekli'); return }
    setError('')
    setStep('price')
  }

  const handleSubmit = async () => {
    const price = parseFloat(priceInput.replace(',', '.'))
    if (!selectedMarket) { setError('Market seç'); return }
    if (isNaN(price) || price <= 0) { setError('Geçerli fiyat gir'); return }
    if (price > 99999) { setError('Fiyat çok yüksek'); return }

    setError('')
    setStep('submitting')

    try {
      await submitPrice({
        barcode,
        productId: product?.id ?? null,
        productName: productName.trim(),
        market: selectedMarket,
        price,
        submittedBy: null,      // misafir
        submittedByName: null,
      })

      const newPoints = addGuestPoints(POINTS.SUBMIT, `${selectedMarket} fiyat bildirimi`)
      setStep('done')
      setTimeout(() => onSuccess(newPoints), 1500)
    } catch (err: any) {
      setError('Gönderilemedi: ' + err.message)
      setStep('price')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="font-bold text-gray-900">Fiyat Bildir</h2>
            <p className="text-xs text-gray-500 font-mono mt-0.5">{barcode}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="px-5 py-5">

          {/* Loading */}
          {step === 'loading' && (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="w-10 h-10 border-4 border-green-400 border-t-transparent rounded-full animate-spin"/>
              <p className="text-sm text-gray-500">Ürün aranıyor...</p>
            </div>
          )}

          {/* Ürün seçimi */}
          {step === 'product' && (
            <div className="space-y-4">
              {product ? (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="text-sm font-semibold text-green-800">{product.name}</p>
                    <p className="text-xs text-green-600">{product.category}</p>
                  </div>
                  <button onClick={() => setProduct(null)} className="ml-auto text-xs text-gray-400 hover:text-gray-600">Değiştir</button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1.5">Ürün Adı</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={productName}
                        onChange={e => setProductName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        placeholder="Ürün adını yaz..."
                        className="flex-1 border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                      />
                      <button
                        onClick={handleSearch}
                        disabled={searching}
                        className="bg-gray-100 hover:bg-gray-200 px-3 rounded-xl text-sm font-medium transition-colors"
                      >
                        {searching ? '...' : 'Ara'}
                      </button>
                    </div>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="border rounded-xl overflow-hidden">
                      {searchResults.map(r => (
                        <button
                          key={r.id}
                          onClick={() => selectProduct(r)}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 border-b last:border-b-0 flex items-center justify-between"
                        >
                          <span className="font-medium">{r.name}</span>
                          <span className="text-xs text-gray-400">{r.category}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.length === 0 && productName.trim().length > 2 && !searching && (
                    <p className="text-xs text-gray-500 text-center py-1">
                      Sistemde yok — yeni ürün olarak eklenir.
                    </p>
                  )}
                </>
              )}

              {error && <p className="text-xs text-red-500">{error}</p>}

              <button
                onClick={goToPrice}
                disabled={!productName.trim()}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Devam →
              </button>
            </div>
          )}

          {/* Fiyat + Market girişi */}
          {step === 'price' && (
            <div className="space-y-4">
              {/* Seçilen ürün özeti */}
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-sm font-semibold text-gray-800 truncate">{productName}</p>
                <p className="text-xs text-gray-500 font-mono">{barcode}</p>
              </div>

              {/* Market seçimi */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Hangi markette?</label>
                <div className="grid grid-cols-2 gap-2">
                  {MARKETS.map(m => {
                    const style = MARKET_STYLES[m]
                    const selected = selectedMarket === m
                    return (
                      <button
                        key={m}
                        onClick={() => setSelectedMarket(m)}
                        className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                          selected
                            ? `${style.bg} ${style.text} ${style.border} scale-[1.02]`
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {m}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Fiyat */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Fiyat (₺)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₺</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={priceInput}
                    onChange={e => setPriceInput(e.target.value)}
                    placeholder="0,00"
                    step="0.01"
                    min="0"
                    className="w-full border rounded-xl pl-8 pr-4 py-3 text-lg font-bold text-gray-900 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Etiketten gördüğün fiyatı gir</p>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              {/* Puan bilgisi */}
              <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-xl">
                <span className="text-xl">⭐</span>
                <div>
                  <p className="text-sm font-semibold text-yellow-800">+{POINTS.SUBMIT} puan kazanırsın</p>
                  <p className="text-xs text-yellow-600">Şu anki puanın: {getGuestPoints()}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setStep('product')} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-colors text-sm">
                  ← Geri
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!selectedMarket || !priceInput}
                  className="flex-2 flex-grow bg-green-500 hover:bg-green-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  Gönder 🎉
                </button>
              </div>
            </div>
          )}

          {/* Gönderiliyor */}
          {step === 'submitting' && (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="w-10 h-10 border-4 border-green-400 border-t-transparent rounded-full animate-spin"/>
              <p className="text-sm text-gray-500">Gönderiliyor...</p>
            </div>
          )}

          {/* Başarı */}
          {step === 'done' && (
            <div className="flex flex-col items-center py-8 gap-4 text-center">
              <div className="text-6xl animate-bounce">🎉</div>
              <div>
                <p className="font-bold text-gray-900 text-lg">Teşekkürler!</p>
                <p className="text-sm text-gray-500 mt-1">Bildirim incelemeye alındı.</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-6 py-3">
                <p className="text-2xl font-bold text-yellow-700">+{POINTS.SUBMIT} ⭐</p>
                <p className="text-xs text-yellow-600">puan kazandın!</p>
              </div>
              <p className="text-xs text-gray-400">
                3 kişi onaylarsa fiyat sisteme işlenecek<br/>
                ve +{POINTS.SUBMISSION_VERIFIED} puan daha kazanacaksın.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
