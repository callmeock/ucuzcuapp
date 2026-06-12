'use client'

import { ReactNode, useRef, useState, useCallback } from 'react'
import { isNativeApp } from '@/lib/capacitor'

interface Props {
  onRefresh: () => Promise<void>
  children: ReactNode
}

export default function PullToRefresh({ onRefresh, children }: Props) {
  const [pulling, setPulling] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(0)
  const pullDistance = useRef(0)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isNativeApp() || window.scrollY > 0) return
    startY.current = e.touches[0].clientY
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isNativeApp() || window.scrollY > 0 || refreshing) return
    const dy = e.touches[0].clientY - startY.current
    if (dy > 0 && dy < 120) {
      pullDistance.current = dy
      setPulling(dy > 60)
    }
  }, [refreshing])

  const onTouchEnd = useCallback(async () => {
    if (!isNativeApp() || !pulling || refreshing) {
      pullDistance.current = 0
      setPulling(false)
      return
    }
    setPulling(false)
    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setRefreshing(false)
      pullDistance.current = 0
    }
  }, [pulling, refreshing, onRefresh])

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {(pulling || refreshing) && isNativeApp() && (
        <div className="flex justify-center py-2 text-primary text-sm font-semibold">
          {refreshing ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Yenileniyor...
            </span>
          ) : (
            'Bırakınca yenile'
          )}
        </div>
      )}
      {children}
    </div>
  )
}
