export default function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden skeleton-pulse">
      <div className="flex gap-3 p-3 md:hidden">
        <div className="w-20 h-20 rounded-xl bg-gray-200 shrink-0" />
        <div className="flex-1 space-y-2 py-1">
          <div className="h-4 bg-gray-200 rounded w-4/5" />
          <div className="h-3 bg-gray-100 rounded w-1/3" />
          <div className="h-5 bg-gray-200 rounded w-1/2 mt-2" />
        </div>
      </div>
      <div className="hidden md:block">
        <div className="h-36 bg-gray-200" />
        <div className="p-4 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
          <div className="h-8 bg-gray-100 rounded mt-2" />
          <div className="h-8 bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  )
}
