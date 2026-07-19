'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { getGuestPoints, getPointHistory, getLevel } from '@/lib/points'

const BarcodeScanner = dynamic(() => import('@/components/BarcodeScanner'), { ssr: false })
const PriceSubmitModal = dynamic(() => import('@/components/PriceSubmitModal'), { ssr: false })

export default function TaraPage() {
  const [mode, setMode] = useState<'idle' | 'scanning' | 'submitting'>('idle')
  const [scannedCode, setScannedCode] = useState('')
  const [points, setPoints] = useState(0)
  const [toast, setToast] = useState('')
  const history = getPointHistory().slice(0, 5)

  useEffect(() => {
    setPoints(getGuestPoints())
  }, [])

  const handleDetected = (code: string) => {
    setScannedCode(code)
    setMode('submitting')
  }

  const handleSuccess = (newPoints: number) => {
    setPoints(newPoints)
    setMode('idle')
    showToast('Bildirim gönderildi! +10 ⭐')
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const level = getLevel(points)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-gray-700 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
          </Link>
          <h1 className="font-bold text-gray-900 flex-1">Fiyat Bildir</h1>
          {points > 0 && (
            <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1">
              <span className="text-sm">⭐</span>
              <span className="text-sm font-bold text-yellow-700">{points}</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Ana aksiyon */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white text-center shadow-lg">
          <div className="text-5xl mb-3">📷</div>
          <h2 className="text-xl font-bold mb-1">Markette misin?</h2>
          <p className="text-green-100 text-sm mb-5">
            Ürünün barkodunu tara, fiyatı gir,<br/>puan kazan.
          </p>
          <button
            onClick={() => setMode('scanning')}
            className="bg-white text-green-600 font-bold px-8 py-3.5 rounded-xl text-base shadow hover:shadow-md active:scale-95 transition-all"
          >
            Barkod Tara
          </button>
        </div>

        {/* Nasıl çalışır */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 text-sm">Nasıl çalışır?</h3>
          <div className="space-y-3">
            {[
              { icon: '📷', title: 'Barkodu tara', desc: 'Ürünün barkodunu kameraya göster' },
              { icon: '💰', title: 'Fiyatı gir', desc: 'Etiketten gördüğün fiyatı yaz' },
              { icon: '⭐', title: '+10 puan kazan', desc: 'Her bildirim için puan kazanırsın' },
              { icon: '✅', title: 'Onaylanınca +5 daha', desc: '3 kişi doğrularsa ekstra puan' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-xl w-8 text-center shrink-0">{item.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Puan durumu */}
        {points > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 text-sm">Puanların</h3>
              <span className="text-xs text-gray-400">{level.title}</span>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-4xl font-black text-yellow-500">{points}</div>
              <div className="flex-1">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Seviye {level.level}</span>
                  {level.next !== Infinity && <span>{level.next} puana kadar</span>}
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all"
                    style={{ width: level.next === Infinity ? '100%' : `${Math.min(100, (points / level.next) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {history.length > 0 && (
              <div className="space-y-1.5">
                {history.map((e, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 truncate">{e.reason}</span>
                    <span className={`font-bold ml-2 ${e.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {e.amount > 0 ? '+' : ''}{e.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Hesap bağlama teşviki */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
              <p className="text-xs text-blue-700 font-medium">
                💡 Puanların kaybolmasın — üye ol ve doğrulama yaparak daha fazla kazan!
              </p>
              <Link
                href="/giris"
                className="mt-2 block text-center text-xs font-bold text-blue-600 bg-blue-100 hover:bg-blue-200 rounded-lg py-2 transition-colors"
              >
                Giriş Yap →
              </Link>
            </div>
          </div>
        )}

        {/* Doğrulama CTA (üyeler için) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-dashed border-purple-200">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔍</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">Fiyatları doğrula</p>
              <p className="text-xs text-gray-500">Üye ol, başkalarının fiyatlarını onayla, +2 puan kazan</p>
            </div>
            <Link
              href="/dogrula"
              className="bg-purple-500 text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-purple-600 transition-colors shrink-0"
            >
              Doğrula
            </Link>
          </div>
        </div>

      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-full shadow-lg animate-bounce">
            {toast}
          </div>
        </div>
      )}

      {/* Barkod tarayıcı */}
      {mode === 'scanning' && (
        <BarcodeScanner
          onDetected={handleDetected}
          onClose={() => setMode('idle')}
        />
      )}

      {/* Fiyat gönderme modalı */}
      {mode === 'submitting' && scannedCode && (
        <PriceSubmitModal
          barcode={scannedCode}
          onClose={() => setMode('idle')}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
