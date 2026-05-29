export interface UserLocation {
  lat: number
  lng: number
  district: string   // ilçe — "Kadıköy"
  city: string       // şehir — "İstanbul"
  label: string      // birleşik — "Kadıköy, İstanbul"
  savedAt: number    // timestamp
}

const STORAGE_KEY = 'ucuzcu_location'
const CACHE_TTL = 1000 * 60 * 60 * 24 * 3  // 3 gün

export function getSavedLocation(): UserLocation | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const loc: UserLocation = JSON.parse(raw)
    if (Date.now() - loc.savedAt > CACHE_TTL) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return loc
  } catch {
    return null
  }
}

export function clearLocation() {
  if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY)
}

async function reverseGeocode(lat: number, lng: number): Promise<{ district: string; city: string }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=tr`,
      { headers: { 'User-Agent': 'UcuzcuApp/1.0' } }
    )
    const data = await res.json()
    const addr = data.address ?? {}
    const district =
      addr.suburb ?? addr.neighbourhood ?? addr.quarter ??
      addr.district ?? addr.county ?? addr.town ?? addr.city ?? ''
    const city = addr.province ?? addr.state ?? addr.city ?? ''
    return { district, city }
  } catch {
    return { district: '', city: '' }
  }
}

export async function requestLocation(): Promise<UserLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Tarayıcınız konum desteklemiyor'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        const { district, city } = await reverseGeocode(lat, lng)
        const label = [district, city].filter(Boolean).join(', ') || 'Konumunuz'
        const loc: UserLocation = { lat, lng, district, city, label, savedAt: Date.now() }
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(loc)) } catch { /* private mode */ }
        resolve(loc)
      },
      (err) => {
        if (err.code === 1) reject(new Error('Konum izni reddedildi'))
        else reject(new Error('Konum alınamadı'))
      },
      { timeout: 10000, maximumAge: 0 }
    )
  })
}
