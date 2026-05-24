// ── Misafir puan sistemi (localStorage) ──────────────────────────
// Üye olunca bu puanlar Firestore'a aktarılır.

const STORAGE_KEY = 'ucuzcu_guest_points'
const HISTORY_KEY = 'ucuzcu_point_history'

export interface PointEvent {
  amount: number
  reason: string
  date: string
}

function isBrowser() {
  return typeof window !== 'undefined'
}

export function getGuestPoints(): number {
  if (!isBrowser()) return 0
  return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10)
}

export function addGuestPoints(amount: number, reason: string): number {
  if (!isBrowser()) return 0
  const current = getGuestPoints()
  const next = Math.max(0, current + amount)
  localStorage.setItem(STORAGE_KEY, String(next))

  // Geçmiş
  const history = getPointHistory()
  history.unshift({ amount, reason, date: new Date().toISOString() })
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)))

  return next
}

export function getPointHistory(): PointEvent[] {
  if (!isBrowser()) return []
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

export function clearGuestPoints(): void {
  if (!isBrowser()) return
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(HISTORY_KEY)
}

// Puan seviyesi hesapla
export function getLevel(points: number): { level: number; title: string; next: number } {
  const levels = [
    { level: 1, title: 'Yeni Üye',    next: 50 },
    { level: 2, title: 'Kaşif',       next: 150 },
    { level: 3, title: 'Katkıcı',     next: 350 },
    { level: 4, title: 'Uzman',       next: 700 },
    { level: 5, title: 'Şampiyon',    next: Infinity },
  ]
  for (let i = levels.length - 1; i >= 0; i--) {
    if (i === 0 || points >= levels[i - 1].next) {
      return levels[i]
    }
  }
  return levels[0]
}
