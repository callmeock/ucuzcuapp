'use client'

import { CATEGORIES, SUBCATEGORIES, CATEGORY_CONFIG } from '@/lib/types'

interface CategoryFilterProps {
  activeCategory: string
  activeSubcategory: string
  onCategoryChange: (cat: string) => void
  onSubcategoryChange: (sub: string) => void
  counts?: Record<string, number>
  subcategoryCounts?: Record<string, number>
}

export default function CategoryFilter({
  activeCategory,
  activeSubcategory,
  onCategoryChange,
  onSubcategoryChange,
  counts,
  subcategoryCounts,
}: CategoryFilterProps) {
  const subcategories = activeCategory !== 'Tümü' ? SUBCATEGORIES[activeCategory] ?? [] : []

  return (
    <>
      {/* ── Mobil: yatay pill şeridi ── */}
      <div className="py-2 space-y-1.5 lg:hidden">
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

      {/* ── Masaüstü: sol sidebar ── */}
      <nav className="hidden lg:block w-[220px] shrink-0 sticky top-4 self-start">
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
