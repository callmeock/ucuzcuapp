'use client'

import Image from 'next/image'
import { Product, MARKET_COLORS, CATEGORY_CONFIG } from '@/lib/types'

interface ProductCardProps {
  product: Product
  inBasket: boolean
  onClick: () => void
  onAddToBasket: (e: React.MouseEvent) => void
}

function getEffectivePrice(p: Product['prices'][0]) {
  if (p.campaign?.type === 'discount' && p.campaign.campaignPrice != null) {
    return p.campaign.campaignPrice
  }
  return p.currentPrice
}

export default function ProductCard({ product, inBasket, onClick, onAddToBasket }: ProductCardProps) {
  const available = product.prices.filter((p) => p.available)
  if (available.length === 0) return null

  const prices = available.map(getEffectivePrice)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const saving = (maxPrice - minPrice).toFixed(2)
  const cheapest = available.find((p) => getEffectivePrice(p) === minPrice)!
  const cheapestColor = MARKET_COLORS[cheapest.market] || '#888'
  const catCfg = CATEGORY_CONFIG[product.category] ?? { emoji: '🛍️', bg: '#f3f4f6', color: '#374151' }

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden border border-gray-100"
    >
      {/* ── Mobil: kompakt kart ── */}
      <div className="flex gap-3 p-3 lg:hidden">
        <div
          className="relative w-20 h-20 rounded-xl shrink-0 flex items-center justify-center overflow-hidden"
          style={{ background: catCfg.bg }}
        >
          {product.image ? (
            <Image src={product.image} alt="" fill className="object-contain p-1" sizes="80px" />
          ) : (
            <span className="text-3xl select-none">{catCfg.emoji}</span>
          )}
          {inBasket && (
            <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-green-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold">✓</span>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2">{product.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{product.brand}</p>
          </div>
          <div className="flex items-end justify-between gap-2 mt-1">
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-lg font-extrabold text-green-600">{minPrice.toFixed(2)} ₺</span>
                <span className="text-xs font-bold truncate" style={{ color: cheapestColor }}>
                  {cheapest.market}
                </span>
              </div>
              {available.length > 1 && (
                <p className="text-[10px] text-gray-400">
                  +{available.length - 1} market · {saving} ₺ fark
                </p>
              )}
            </div>
            <button
              onClick={onAddToBasket}
              className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                inBasket ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-primary-dark'
              }`}
            >
              {inBasket ? '✓' : '+'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Desktop: tam kart ── */}
      <div className="hidden lg:flex lg:flex-col">
        <div className="relative h-36 flex items-center justify-center" style={{ background: catCfg.bg }}>
          {product.image ? (
            <Image src={product.image} alt={product.name} fill className="object-contain p-4" sizes="33vw" />
          ) : (
            <span className="text-6xl select-none">{catCfg.emoji}</span>
          )}
          <span className="absolute bottom-2 left-3 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: catCfg.color + '22', color: catCfg.color }}>
            {product.category}
          </span>
          {inBasket && (
            <span className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              ✓ Sepette
            </span>
          )}
        </div>

        <div className="px-4 pt-3 pb-2 border-b border-gray-100">
          <div className="font-bold text-gray-900 text-base leading-tight">{product.name}</div>
          <div className="text-sm text-gray-500 mt-0.5">{product.brand} · {product.unit}</div>
        </div>

        <div className="px-4 py-2 divide-y divide-gray-50 flex-1">
          {product.prices.map((pr) => {
            const color = MARKET_COLORS[pr.market] || '#888'
            const effPrice = getEffectivePrice(pr)
            const isCheapest = pr.available && effPrice === minPrice && available.length > 1
            const campaign = pr.available ? pr.campaign : null
            const isDiscount = campaign?.type === 'discount'
            const isCashback = campaign?.type === 'cashback'

            return (
              <div key={pr.market} className="py-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 flex-wrap">
                    <div className="w-1 h-5 rounded-full shrink-0" style={{ background: color }} />
                    {pr.market}
                    {isCheapest && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">EN UCUZ</span>
                    )}
                    {isDiscount && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">
                        💳 {campaign.name}
                      </span>
                    )}
                  </div>
                  {pr.available ? (
                    <div className="text-right shrink-0">
                      {isDiscount && (
                        <div className="text-xs text-gray-400 line-through leading-none">
                          {pr.currentPrice.toFixed(2)} ₺
                        </div>
                      )}
                      <span className={`text-base font-bold ${isCheapest ? 'text-green-600' : 'text-gray-800'}`}>
                        {effPrice.toFixed(2)} ₺
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 italic">Stokta yok</span>
                  )}
                </div>
                {isCashback && campaign.cashbackAmount != null && (
                  <div className="flex items-center gap-1 mt-0.5 ml-3.5">
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                      +{campaign.cashbackAmount} {campaign.cashbackUnit ?? 'puan'} kazan 🎁
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="px-4 py-2.5 flex items-center justify-between bg-gray-50 border-t border-gray-100">
          <span className="text-sm text-green-600 font-semibold">
            {available.length > 1 ? `💰 ${saving} ₺ tasarruf` : ''}
          </span>
          <button
            onClick={onAddToBasket}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
              inBasket ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-primary-dark'
            }`}
          >
            {inBasket ? '✓ Sepette' : '+ Ekle'}
          </button>
        </div>
      </div>
    </div>
  )
}
