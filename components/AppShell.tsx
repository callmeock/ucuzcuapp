'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import BottomTabBar from './BottomTabBar'

const HIDE_TAB_PATHS = ['/admin', '/giris', '/gizlilik', '/dogrula']

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const showTabBar = !HIDE_TAB_PATHS.some((p) => pathname.startsWith(p))

  return (
    <>
      <div key={pathname} className={`${showTabBar ? 'pb-tab-safe' : ''} page-enter`}>
        {children}
      </div>
      {showTabBar && <BottomTabBar />}
    </>
  )
}
