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
    <div className="py-2 space-y-1.5">
      {/* Ana kategoriler */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {['Tümü', ...CATEGORIES].map((cat) => {
          const cfg = cat !== 'Tümü' ? (CATEGORY_CONFIG[cat] ?? null) : null
          const isActive = activeCategory === cat
          return (
            <button
              key={cat}
              onClick={() => { onCategoryChange(cat); onSubcategoryChange('Tümü') }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap border-2 transition-all ${
                isActive
                  ? 'bg-primary border-primary text-white shadow-sm'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-primary hover:text-primary'
              }`}
            >
              {cfg && <span className="text-base leading-none">{cfg.emoji}</span>}
              {cat}
              {counts && counts[cat] !== undefined && (
                <span className={`text-xs ${isActive ? 'opacity-80' : 'opacity-50'}`}>
                  {counts[cat]}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Alt kategoriler — sadece bir ana kategori seçiliyse */}
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
  )
}
