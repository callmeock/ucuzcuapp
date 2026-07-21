'use client'

import { CATEGORIES, SUBCATEGORIES, CATEGORY_CONFIG, MARKET_COLORS } from '@/lib/types'

const MARKETS = ['Migros', 'A101', 'Şok', 'Getir', 'Yemeksepeti'] as const

interface CategoryFilterProps {
  activeCategory: string
  activeSubcategory: string
  activeMarket: string
  onCategoryChange: (cat: string) => void
  onSubcategoryChange: (sub: string) => void
  onMarketChange: (market: string) => void
  counts?: Record<string, number>
  subcategoryCounts?: Record<string, number>
  marketCounts?: Record<string, number>
}

export default function CategoryFilter({
  activeCategory,
  activeSubcategory,
  activeMarket,
  onCategoryChange,
  onSubcategoryChange,
  onMarketChange,
  counts,
  subcategoryCounts,
  marketCounts,
}: CategoryFilterProps) {
  const subcategories = activeCategory !== 'Tümü' ? SUBCATEGORIES[activeCategory] ?? [] : []

  return (
    <>
      {/* ── Telefon: yatay pill şeridi ── */}
      <div className="py-2 space-y-1.5 md:hidden">
        {/* Market filtresi */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
          {['Tümü', ...MARKETS].map((m) => {
            const isActive = activeMarket === m
            const color = m !== 'Tümü' ? MARKET_COLORS[m] : undefined
            return (
              <button
                key={m}
                onClick={() => onMarketChange(m)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full whitespace-nowrap border-2 transition-all ${
                  isActive
                    ? 'text-white shadow-sm'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'
                }`}
                style={isActive ? { background: color ?? '#374151', borderColor: color ?? '#374151' } : {}}
              >
                <span className="text-xs font-semibold">{m}</span>
                {marketCounts && m !== 'Tümü' && marketCounts[m] !== undefined && (
                  <span className={`text-[10px] font-medium ${isActive ? 'opacity-80' : 'opacity-50'}`}>
                    {marketCounts[m]}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {['Tümü', ...CATEGORIES].map((cat) => {
            const cfg = cat !== 'Tümü' ? (CATEGORY_CONFIG[cat] ?? null) : null
            const isActive = activeCategory === cat
            return (
              <button
                key={cat}
                onClick={() => { onCategoryChange(cat); onSubcategoryChange('Tümü') }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full whitespace-nowrap border-2 transition-all ${
                  isActive
                    ? 'bg-primary border-primary text-white shadow-sm'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-primary hover:text-primary'
                }`}
              >
                {cfg && <span className="text-xl leading-none">{cfg.emoji}</span>}
                <span className="text-xs font-semibold">{cat}</span>
                {counts && counts[cat] !== undefined && (
                  <span className={`text-[10px] font-medium ${isActive ? 'opacity-80' : 'opacity-50'}`}>
                    {counts[cat]}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {subcategories.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            <button
              onClick={() => onSubcategoryChange('Tümü')}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${
                activeSubcategory === 'Tümü'
                  ? 'bg-gray-800 border-gray-800 text-white'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
              }`}
            >
              Tümü
            </button>
            {subcategories.map((sub) => {
              const isActive = activeSubcategory === sub
              return (
                <button
                  key={sub}
                  onClick={() => onSubcategoryChange(sub)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${
                    isActive
                      ? 'bg-gray-800 border-gray-800 text-white'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                  }`}
                >
                  {sub}
                  {subcategoryCounts && subcategoryCounts[sub] !== undefined && (
                    <span className={`ml-1 ${isActive ? 'opacity-80' : 'opacity-50'}`}>
                      {subcategoryCounts[sub]}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Tablet / masaüstü: sol sidebar ── */}
      <nav className="hidden md:block w-[200px] lg:w-[220px] shrink-0 sticky top-4 self-start">

        {/* Market filtresi */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 space-y-0.5 mb-3">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2 pb-2">
            Marketler
          </p>
          {['Tümü', ...MARKETS].map((m) => {
            const isActive = activeMarket === m
            const color = m !== 'Tümü' ? MARKET_COLORS[m] : undefined
            return (
              <button
                key={m}
                onClick={() => onMarketChange(m)}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-all"
                style={isActive
                  ? { background: color ? color + '18' : '#f3f4f6', color: color ?? '#374151', fontWeight: 700 }
                  : {}}
              >
                {color && (
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: isActive ? color : '#d1d5db' }} />
                )}
                <span className={`text-sm flex-1 truncate ${isActive ? 'font-bold' : 'font-semibold text-gray-700'}`}>
                  {m}
                </span>
                {marketCounts && m !== 'Tümü' && marketCounts[m] !== undefined && (
                  <span className={`text-xs shrink-0 ${isActive ? 'font-bold' : 'text-gray-400'}`}>
                    {marketCounts[m]}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 space-y-0.5">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2 pb-2">
            Kategoriler
          </p>
          {['Tümü', ...CATEGORIES].map((cat) => {
            const cfg = cat !== 'Tümü' ? (CATEGORY_CONFIG[cat] ?? null) : null
            const isActive = activeCategory === cat
            return (
              <button
                key={cat}
                onClick={() => { onCategoryChange(cat); onSubcategoryChange('Tümü') }}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {cfg && <span className="text-lg leading-none shrink-0">{cfg.emoji}</span>}
                <span className="text-sm font-semibold flex-1 truncate">{cat}</span>
                {counts && counts[cat] !== undefined && (
                  <span className={`text-xs font-medium shrink-0 ${isActive ? 'opacity-80' : 'text-gray-400'}`}>
                    {counts[cat]}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {subcategories.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 mt-3 space-y-0.5">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2 pb-2">
              Alt Kategori
            </p>
            <button
              onClick={() => onSubcategoryChange('Tümü')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-sm font-semibold transition-all ${
                activeSubcategory === 'Tümü'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              Tümü
            </button>
            {subcategories.map((sub) => {
              const isActive = activeSubcategory === sub
              return (
                <button
                  key={sub}
                  onClick={() => onSubcategoryChange(sub)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span className="truncate">{sub}</span>
                  {subcategoryCounts && subcategoryCounts[sub] !== undefined && (
                    <span className={`text-xs ml-2 shrink-0 ${isActive ? 'opacity-80' : 'text-gray-400'}`}>
                      {subcategoryCounts[sub]}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </nav>
    </>
  )
}
