'use client'

import Image from 'next/image'
import { Product, MARKET_COLORS, CATEGORY_CONFIG } from '@/lib/types'

interface ProductCardProps {
  product: Product
  inBasket: boolean
  onClick: () => void
  onAddToBasket: (e: React.MouseEvent) => void
}

export default function ProductCard({ product, inBasket, onClick, onAddToBasket }: ProductCardProps) {
  const available = product.prices.filter((p) => p.available)
  if (available.length === 0) return null

  const prices = available.map((p) => p.currentPrice)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const saving = (maxPrice - minPrice).toFixed(2)

  const catCfg = CATEGORY_CONFIG[product.category] ?? { emoji: '🛍️', bg: '#f3f4f6', color: '#374151' }

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer overflow-hidden border border-gray-100 flex flex-col"
    >
      {/* Görsel alanı */}
      <div
        className="relative h-36 flex items-center justify-center"
        style={{ background: catCfg.bg }}
      >
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-contain p-4"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <span className="text-6xl select-none">{catCfg.emoji}</span>
        )}

        {/* Kategori etiketi */}
        <span
          className="absolute bottom-2 left-3 text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: catCfg.color + '22', color: catCfg.color }}
        >
          {product.category}
        </span>

        {/* Sepette rozeti */}
        {inBasket && (
          <span className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            ✓ Sepette
          </span>
        )}
      </div>

      {/* Ürün bilgisi */}
      <div className="px-4 pt-3 pb-2 border-b border-gray-100">
        <div className="font-bold text-gray-900 text-base leading-tight">{product.name}</div>
        <div className="text-sm text-gray-500 mt-0.5">
          {product.brand} · {product.unit}
        </div>
      </div>

      {/* Fiyat satırları */}
      <div className="px-4 py-2 divide-y divide-gray-50 flex-1">
        {product.prices.map((pr) => {
          const color = MARKET_COLORS[pr.market] || '#888'
          const isCheapest = pr.available && pr.currentPrice === minPrice && available.length > 1
          const isPriciest = pr.available && pr.currentPrice === maxPrice && available.length > 1

          return (
            <div key={pr.market} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <div className="w-1 h-5 rounded-full shrink-0" style={{ background: color }} />
                {pr.market}
                {isCheapest && (
                  <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">
                    EN UCUZ
                  </span>
                )}
              </div>
              {pr.available ? (
                <span
                  className={`text-base font-bold ${
                    isCheapest ? 'text-green-600' : isPriciest ? 'text-red-500' : 'text-gray-800'
                  }`}
                >
                  {pr.currentPrice.toFixed(2)} ₺
                </span>
              ) : (
                <span className="text-sm text-gray-400 italic">Stokta yok</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Alt bar */}
      <div className="px-4 py-2.5 flex items-center justify-between bg-gray-50 border-t border-gray-100">
        <span className="text-sm text-green-600 font-semibold">
          {available.length > 1 ? `💰 ${saving} ₺ tasarruf` : ''}
        </span>
        <button
          onClick={onAddToBasket}
          className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
            inBasket
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-primary text-white hover:bg-primary-dark'
          }`}
        >
          {inBasket ? '✓ Sepette' : '+ Ekle'}
        </button>
      </div>
    </div>
  )
}
