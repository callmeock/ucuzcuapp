'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getActiveBrosurler, type Brosur } from '@/lib/brosurler'

const MARKET_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Migros: { bg: 'bg-orange-50',  text: 'text-orange-700', border: 'border-orange-200' },
  A101:   { bg: 'bg-red-50',     text: 'text-red-700',    border: 'border-red-200' },
  'Şok':  { bg: 'bg-purple-50',  text: 'text-purple-700', border: 'border-purple-200' },
  'BİM':  { bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200' },
}

const MARKET_EMOJI: Record<string, string> = {
  Migros: '🟠', A101: '🔴', 'Şok': '🟣', 'BİM': '🔵',
}

export default function BrosurlerPage() {
  const [brosurler, setBrosurler] = useState<Brosur[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Brosur | null>(null)

  useEffect(() => {
    getActiveBrosurler().then(data => {
      setBrosurler(data)
      setLoading(false)
    })
  }, [])

  // Markete göre grupla
  const byMarket: Record<string, Brosur[]> = {}
  brosurler.forEach(b => {
    if (!byMarket[b.market]) byMarket[b.market] = []
    byMarket[b.market].push(b)
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl md:max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="font-bold text-gray-900">Bu Haftanın Fırsatları</h1>
            <p className="text-xs text-gray-400">
              {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl md:max-w-4xl mx-auto px-4 py-5 space-y-5">

        {loading && (
          <div className="flex flex-col items-center py-16 gap-3">
            <div className="w-10 h-10 border-4 border-orange-400 border-t-transparent rounded-full animate-spin"/>
            <p className="text-sm text-gray-400">Broşürler yükleniyor...</p>
          </div>
        )}

        {!loading && brosurler.length === 0 && (
          <div className="bg-white rounded-2xl p-10 shadow-sm text-center space-y-3">
            <p className="text-5xl">📭</p>
            <p className="font-semibold text-gray-700">Bu hafta broşür eklenmemiş</p>
            <p className="text-sm text-gray-400">Yeni broşürler eklenince burada görünecek.</p>
          </div>
        )}

        {!loading && Object.entries(byMarket).map(([market, list]) => {
          const style = MARKET_COLORS[market] ?? MARKET_COLORS['Migros']
          return (
            <div key={market}>
              {/* Market başlığı */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{MARKET_EMOJI[market] ?? '🏪'}</span>
                <h2 className={`font-bold text-base ${style.text}`}>{market}</h2>
                <span className="text-xs text-gray-400">{list.length} broşür</span>
              </div>

              <div className="space-y-3">
                {list.map(b => (
                  <div
                    key={b.id}
                    className={`bg-white rounded-2xl shadow-sm border ${style.border} overflow-hidden`}
                  >
                    <div className={`px-4 py-3 ${style.bg} flex items-center justify-between`}>
                      <div>
                        <p className={`font-semibold text-sm ${style.text}`}>{b.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(b.startDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                          {' – '}
                          {new Date(b.endDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-1 rounded-full">
                        Aktif
                      </span>
                    </div>

                    <div className="px-4 py-4 flex items-center gap-3">
                      {/* PDF önizleme ikonu */}
                      <div className="w-14 h-18 bg-gray-100 rounded-lg flex flex-col items-center justify-center shrink-0 py-3 gap-1">
                        <span className="text-2xl">📄</span>
                        <span className="text-xs text-gray-400 font-mono">PDF</span>
                      </div>

                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-3">
                          Bu haftanın fırsatlarını incele, en ucuz ürünleri bul.
                        </p>
                        <div className="flex gap-2">
                          <a
                            href={b.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex-1 text-center text-sm font-bold py-2.5 rounded-xl ${style.bg} ${style.text} border ${style.border} hover:opacity-80 transition-opacity`}
                          >
                            📖 Broşürü Aç
                          </a>
                          <button
                            onClick={() => setSelected(selected?.id === b.id ? null : b)}
                            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold rounded-xl transition-colors"
                          >
                            {selected?.id === b.id ? '▲' : '▼'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* PDF gömülü görüntüleyici (expand) */}
                    {selected?.id === b.id && (
                      <div className="border-t border-gray-100">
                        <iframe
                          src={`${b.pdfUrl}#toolbar=0`}
                          className="w-full"
                          style={{ height: '70vh' }}
                          title={b.title}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* Geçmiş broşürler CTA */}
        {!loading && brosurler.length > 0 && (
          <p className="text-center text-xs text-gray-400 py-2">
            Geçmiş haftaların broşürlerine şu an ulaşılamıyor.
          </p>
        )}
      </div>
    </div>
  )
}
