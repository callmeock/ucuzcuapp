'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth'
import {
  getProductByBarcode, getAllProducts, submitPrice,
  getPendingSubmissionsByBarcode, voteSubmission,
} from '@/lib/submissions'
import { addGuestPoints, getGuestPoints } from '@/lib/points'
import { POINTS, MarketName } from '@/lib/types'
import type { Product, PriceSubmission } from '@/lib/types'
import { doc, updateDoc, increment } from 'firebase/firestore'
import { db } from '@/lib/firebase'

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

// Fiyatlar %5 tolerans içinde aynı sayılır
function isSamePrice(a: number, b: number) {
  return Math.abs(a - b) / Math.max(a, b) <= 0.05
}

export default function PriceSubmitModal({ barcode, onClose, onSuccess }: Props) {
  const { user } = useAuth()
  const [step, setStep] = useState<'loading' | 'product' | 'price' | 'submitting' | 'done'>('loading')
  const [product, setProduct] = useState<Product | null>(null)
  const [productName, setProductName] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [searching, setSearching] = useState(false)
  const allProductsRef = useRef<Product[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [selectedMarket, setSelectedMarket] = useState<MarketName | ''>('')
  const [priceInput, setPriceInput] = useState('')
  const [error, setError] = useState('')

  // Barkod için bekleyen bildirimler
  const [pendingByMarket, setPendingByMarket] = useState<Record<string, PriceSubmission>>({})
  // Seçilen markete ait bekleyen bildirim
  const [marketPending, setMarketPending] = useState<PriceSubmission | null>(null)
  // Submit sonucu oluşan doğrulama mesajı
  const [verifyMsg, setVerifyMsg] = useState('')
  // Kazanılan toplam puan (submit + verify)
  const [earnedPoints, setEarnedPoints] = useState<number>(POINTS.SUBMIT)

  // İlk yükleme: ürün + bekleyen bildirimler + ürün önbelleği
  useState(() => {
    const init = async () => {
      try {
        const [found, pending, allProducts] = await Promise.all([
          getProductByBarcode(barcode),
          getPendingSubmissionsByBarcode(barcode),
          getAllProducts(),
        ])
        allProductsRef.current = allProducts
        if (found) {
          setProduct(found)
          setProductName(found.name)
        }
        // market → en son pending submission map'i
        const byMarket: Record<string, PriceSubmission> = {}
        for (const sub of pending) {
          // Kendi bildirimimiz varsa gösterme
          if (user && sub.submittedBy === user.uid) continue
          if (!byMarket[sub.market]) byMarket[sub.market] = sub
        }
        setPendingByMarket(byMarket)
      } catch { /* ignore */ }
      setStep('product')
    }
    init()
  })

  // Market seçimi değişince ilgili pending'i güncelle
  useEffect(() => {
    setMarketPending(selectedMarket ? (pendingByMarket[selectedMarket] ?? null) : null)
  }, [selectedMarket, pendingByMarket])

  // Yazarken otomatik filtrele (debounce 300ms)
  useEffect(() => {
    if (product) return
    const term = productName.trim()
    if (term.length < 2) {
      setSearchResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const lower = term.toLowerCase()
      const results = allProductsRef.current
        .filter(p =>
          p.name.toLowerCase().includes(lower) ||
          (p.brand && typeof p.brand === 'string' && p.brand.toLowerCase().includes(lower))
        )
        .slice(0, 8)
      setSearchResults(results)
      setSearching(false)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [productName, product])

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
      // 1. Fiyat bildirimi gönder
      await submitPrice({
        barcode,
        productId: product?.id ?? null,
        productName: productName.trim(),
        market: selectedMarket,
        price,
        submittedBy: user?.uid ?? null,
        submittedByName: user?.displayName ?? null,
      })

      let totalPoints = POINTS.SUBMIT
      let msg = ''

      // 2. Bekleyen bildirime otomatik oy at (sadece üyeler)
      if (marketPending && user) {
        try {
          const same = isSamePrice(price, marketPending.price)
          const vote = same ? 'verify' : 'reject'
          await voteSubmission(marketPending.id, user.uid, vote)

          if (same) {
            // Doğrulama puanı
            totalPoints += POINTS.VERIFY
            await updateDoc(doc(db, 'users', user.uid), {
              points: increment(POINTS.VERIFY),
              verificationsCount: increment(1),
            })
            msg = `✅ Aynı fiyatı doğruladın! Ekstra +${POINTS.VERIFY}⭐`
          } else {
            msg = `⚠️ Farklı fiyat — eski bildirim reddedildi`
          }
        } catch {
          // Oy atamazsa (zaten oy verilmiş vb.) sessizce geç
        }
      }

      setVerifyMsg(msg)
      setEarnedPoints(totalPoints)

      // 3. Guest puan (localStorage)
      const newPoints = addGuestPoints(POINTS.SUBMIT, `${selectedMarket} fiyat bildirimi`)
      setStep('done')
      setTimeout(() => onSuccess(newPoints), 1800)
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
                    <div className="relative">
                      <input
                        type="text"
                        value={productName}
                        onChange={e => setProductName(e.target.value)}
                        placeholder="Ürün adını yaz, otomatik aranır..."
                        className="w-full border rounded-xl px-4 py-2.5 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 pr-8"
                        style={{ fontSize: '16px' }}
                      />
                      {searching && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2">
                          <span className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin block"/>
                        </span>
                      )}
                    </div>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="border rounded-xl overflow-hidden shadow-sm">
                      {searchResults.map(r => (
                        <button
                          key={r.id}
                          onClick={() => selectProduct(r)}
                          className="w-full text-left px-4 py-3 text-sm hover:bg-green-50 border-b last:border-b-0 flex items-center justify-between gap-2 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{r.name}</p>
                            {r.brand && <p className="text-xs text-gray-400 truncate">{typeof r.brand === 'string' ? r.brand : (r.brand as any).name}</p>}
                          </div>
                          <span className="text-xs text-gray-400 shrink-0">{r.category}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.length === 0 && productName.trim().length >= 2 && !searching && (
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
                    const hasPending = !!pendingByMarket[m]
                    return (
                      <button
                        key={m}
                        onClick={() => setSelectedMarket(m)}
                        className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all relative ${
                          selected
                            ? `${style.bg} ${style.text} ${style.border} scale-[1.02]`
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {m}
                        {hasPending && (
                          <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-yellow-400 rounded-full border border-white" title="Bekleyen bildirim var"/>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Bekleyen bildirim banner */}
              {marketPending && (
                <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <span className="text-lg">👀</span>
                  <div>
                    <p className="text-xs font-semibold text-yellow-800">
                      Bu markette ₺{marketPending.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} bildirilmiş
                    </p>
                    <p className="text-xs text-yellow-600 mt-0.5">
                      {user
                        ? `Aynı fiyatı görüyorsan otomatik doğrulama yapılır ve +${POINTS.VERIFY}⭐ kazanırsın!`
                        : 'Giriş yaparsan aynı fiyatı doğrulayarak ekstra puan kazanabilirsin.'}
                    </p>
                  </div>
                </div>
              )}

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
                  <p className="text-sm font-semibold text-yellow-800">
                    +{POINTS.SUBMIT} puan{marketPending && user ? ` (+ ${POINTS.VERIFY} doğrulama bonusu)` : ''} kazanırsın
                  </p>
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
                <p className="text-2xl font-bold text-yellow-700">+{earnedPoints} ⭐</p>
                <p className="text-xs text-yellow-600">puan kazandın!</p>
              </div>
              {verifyMsg && (
                <p className="text-sm font-medium text-gray-700 bg-gray-50 rounded-xl px-4 py-2">
                  {verifyMsg}
                </p>
              )}
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
