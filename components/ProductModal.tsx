'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Product, MarketPrice, MARKET_COLORS, CATEGORY_CONFIG } from '@/lib/types'

interface ProductModalProps {
  product: Product
  onClose: () => void
}

function PriceChart({ priceData }: { priceData: MarketPrice }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const history = priceData.history
    const color = MARKET_COLORS[priceData.market] || '#888'
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.parentElement!.getBoundingClientRect()
    const W = rect.width
    const H = 130

    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = W + 'px'
    canvas.style.height = H + 'px'
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, W, H)

    const prices = history.map((d) => d.price)
    const minP = Math.min(...prices) * 0.94
    const maxP = Math.max(...prices) * 1.06
    const pad = { l: 52, r: 12, t: 10, b: 28 }
    const cW = W - pad.l - pad.r
    const cH = H - pad.t - pad.b

    const toX = (i: number) => pad.l + (history.length > 1 ? (i / (history.length - 1)) * cW : cW / 2)
    const toY = (p: number) => pad.t + cH - ((p - minP) / (maxP - minP)) * cH

    // Grid lines
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (i / 4) * cH
      ctx.beginPath()
      ctx.moveTo(pad.l, y)
      ctx.lineTo(pad.l + cW, y)
      ctx.stroke()
      const val = maxP - (i / 4) * (maxP - minP)
      ctx.fillStyle = '#9ca3af'
      ctx.font = '9px system-ui'
      ctx.textAlign = 'right'
      ctx.fillText(val.toFixed(0) + '₺', pad.l - 5, y + 3)
    }

    // Fill area
    ctx.beginPath()
    ctx.moveTo(toX(0), toY(prices[0]))
    history.forEach((d, i) => { if (i > 0) ctx.lineTo(toX(i), toY(d.price)) })
    ctx.lineTo(toX(history.length - 1), H - pad.b)
    ctx.lineTo(toX(0), H - pad.b)
    ctx.closePath()
    ctx.fillStyle = color + '22'
    ctx.fill()

    // Line
    ctx.beginPath()
    ctx.moveTo(toX(0), toY(prices[0]))
    history.forEach((d, i) => { if (i > 0) ctx.lineTo(toX(i), toY(d.price)) })
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.stroke()

    // Dots + date labels
    history.forEach((d, i) => {
      ctx.beginPath()
      ctx.arc(toX(i), toY(d.price), 4, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()

      ctx.fillStyle = '#6b7280'
      ctx.font = '8px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText(d.date.slice(5), toX(i), H - pad.b + 12)
    })
  }, [priceData])

  return (
    <div className="relative bg-gray-50 rounded-lg border border-gray-200 overflow-hidden w-full">
      <canvas ref={canvasRef} />
    </div>
  )
}

export default function ProductModal({ product, onClose }: ProductModalProps) {
  const [activeMarket, setActiveMarket] = useState(product.prices[0]?.market)

  const available = product.prices.filter((p) => p.available)
  const effectivePrice = (p: typeof available[0]) =>
    p.campaign ? p.campaign.campaignPrice : p.currentPrice
  const prices = available.map(effectivePrice)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const activePriceData = product.prices.find((p) => p.market === activeMarket)

  // ESC tuşu ile kapat
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Scroll kilitle
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">

        {/* Görsel Banner */}
        {(() => {
          const catCfg = CATEGORY_CONFIG[product.category] ?? { emoji: '🛍️', bg: '#f3f4f6', color: '#374151' }
          return (
            <div className="relative h-40 flex items-center justify-center rounded-t-2xl overflow-hidden" style={{ background: catCfg.bg }}>
              {product.image ? (
                <Image src={product.image} alt={product.name} fill className="object-contain p-6" sizes="512px" />
              ) : (
                <span className="text-8xl select-none">{catCfg.emoji}</span>
              )}
              <button onClick={onClose} className="absolute top-3 right-3 bg-white/80 hover:bg-white text-gray-700 rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold shadow transition-colors">✕</button>
            </div>
          )
        })()}

        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-gray-100">
          <div className="text-xs text-gray-400 uppercase tracking-wide">{product.category}</div>
          <div className="font-bold text-gray-900 text-xl mt-0.5">
            {product.name} <span className="font-normal text-gray-400">· {product.unit}</span>
          </div>
          <div className="text-sm text-gray-500">{product.brand}</div>
        </div>

        <div className="p-5 space-y-5">
          {/* Price Cards */}
          <div className="grid grid-cols-2 gap-3">
            {product.prices.map((pr) => {
              const effPrice = effectivePrice(pr)
              const isCheapest = pr.available && effPrice === minPrice && available.length > 1
              const color = MARKET_COLORS[pr.market]
              const hasCampaign = pr.available && !!pr.campaign
              return (
                <div
                  key={pr.market}
                  className={`rounded-xl p-3.5 border-2 transition-all ${
                    isCheapest ? 'border-green-300 bg-green-50' : hasCampaign ? 'border-orange-200 bg-orange-50' : 'border-transparent bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-gray-800 mb-1 text-sm flex-wrap">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                    {pr.market}
                    {isCheapest && (
                      <span className="text-xs bg-green-600 text-white px-1 py-0.5 rounded font-bold">
                        EN UCUZ
                      </span>
                    )}
                  </div>
                  {pr.available ? (
                    <>
                      {hasCampaign && (
                        <div className="text-xs text-gray-400 line-through leading-none mb-0.5">
                          {pr.currentPrice.toFixed(2)} ₺
                        </div>
                      )}
                      <div className={`text-2xl font-extrabold ${isCheapest ? 'text-green-600' : hasCampaign ? 'text-orange-600' : 'text-gray-900'}`}>
                        {effPrice.toFixed(2)} ₺
                      </div>
                      {hasCampaign && (
                        <div className="text-xs font-bold text-orange-500 mt-0.5">
                          🏷️ {pr.campaign!.name}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-0.5">{pr.updatedAt}</div>
                    </>
                  ) : (
                    <div className="text-gray-400 italic text-sm mt-1">Stokta yok</div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Savings Banner */}
          {available.length > 1 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm font-semibold text-amber-800">
              💰 En pahalı ile en ucuz arasındaki fark:{' '}
              <strong>{(maxPrice - minPrice).toFixed(2)} ₺</strong>
            </div>
          )}

          {/* Price History Chart */}
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
              Fiyat Geçmişi
            </div>

            {/* Market tabs */}
            <div className="flex gap-2 mb-3 flex-wrap">
              {product.prices.map((pr) => {
                const color = MARKET_COLORS[pr.market]
                const isActive = activeMarket === pr.market
                return (
                  <button
                    key={pr.market}
                    onClick={() => setActiveMarket(pr.market)}
                    className="px-3 py-1 rounded-lg text-sm font-semibold border-2 transition-all"
                    style={
                      isActive
                        ? { background: color, borderColor: color, color: 'white' }
                        : { background: 'white', borderColor: '#e5e7eb', color: '#374151' }
                    }
                  >
                    {pr.market}
                  </button>
                )
              })}
            </div>

            {activePriceData && <PriceChart priceData={activePriceData} />}
          </div>

          {product.barcode && (
            <div className="text-xs text-gray-400">
              Barkod: <span className="font-mono">{product.barcode}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
