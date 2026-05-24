'use client'

import { CATEGORIES } from '@/lib/types'

interface CategoryFilterProps {
  active: string
  onChange: (cat: string) => void
  counts?: Record<string, number>
}

export default function CategoryFilter({ active, onChange, counts }: CategoryFilterProps) {
  const all = ['Tümü', ...CATEGORIES]

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-3">
      {all.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap border-2 transition-all ${
            active === cat
              ? 'bg-primary border-primary text-white shadow-sm'
              : 'bg-white border-gray-200 text-gray-700 hover:border-primary hover:text-primary'
          }`}
        >
          {cat}
          {counts && counts[cat] !== undefined && (
            <span className="ml-1 text-xs opacity-70">({counts[cat]})</span>
          )}
        </button>
      ))}
    </div>
  )
}
