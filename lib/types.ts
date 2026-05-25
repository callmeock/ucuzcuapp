export type MarketName = 'Migros' | 'A101' | 'BİM' | 'Şok'

export interface PriceHistory {
  date: string
  price: number
}

export type CampaignType = 'discount' | 'cashback'

export interface Campaign {
  type: CampaignType
  name: string            // "MoneyClub", "Win Para", "Axess" vb.
  // discount: kart sahibine özel düşük fiyat
  campaignPrice?: number
  // cashback: kazanılan tutar (₺) veya puan
  cashbackAmount?: number
  cashbackUnit?: string   // "₺" | "Win Para" | "puan"
}

export interface MarketPrice {
  market: MarketName
  currentPrice: number
  unit: string
  available: boolean
  updatedAt: string
  history: PriceHistory[]
  campaign?: Campaign | null
}

export interface Product {
  id: string
  name: string
  brand: string
  category: string
  unit: string
  barcode: string | null
  image?: string | null   // URL veya null (null ise kategori emojisi gösterilir)
  prices: MarketPrice[]
  createdAt?: Date
}

export const MARKET_COLORS: Record<string, string> = {
  Migros: '#f97316',
  A101: '#dc2626',
  'BİM': '#2563eb',
  'Şok': '#7c3aed',
}

export const CATEGORIES = [
  'Meyve & Sebze',
  'Et, Tavuk & Balık',
  'Süt & Kahvaltılık',
  'Temel Gıda',
  'Atıştırmalık',
  'İçecek',
]

export interface CategoryConfig {
  emoji: string
  bg: string
  color: string
}

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  'Meyve & Sebze':     { emoji: '🥦', bg: '#dcfce7', color: '#15803d' },
  'Et, Tavuk & Balık': { emoji: '🍗', bg: '#fee2e2', color: '#b91c1c' },
  'Süt & Kahvaltılık': { emoji: '🥛', bg: '#dbeafe', color: '#1d4ed8' },
  'Temel Gıda':        { emoji: '🛒', bg: '#fef9c3', color: '#a16207' },
  'Atıştırmalık':      { emoji: '🍿', bg: '#f3e8ff', color: '#7e22ce' },
  'İçecek':            { emoji: '🥤', bg: '#e0f2fe', color: '#0369a1' },
}

// ── Sprint 2: Kullanıcı katkısı ───────────────────────────────────

export interface PriceSubmission {
  id: string
  productId: string | null   // null → ürün henüz sistemde yok
  barcode: string
  productName: string
  market: MarketName
  price: number
  submittedBy: string | null // null = misafir, uid = üye
  submittedByName: string | null
  status: 'pending' | 'verified' | 'rejected'
  verifiedBy: string[]
  rejectedBy: string[]
  createdAt: any
}

export const POINTS = {
  SUBMIT:          10,  // fiyat gönderme
  SUBMISSION_VERIFIED: 5,   // gönderilen fiyat onaylandı
  VERIFY:           2,  // başkasını doğrulama (üye)
  WRONG_SUBMIT:    -5,  // gönderilen fiyat reddedildi
  WRONG_VERIFY:    -3,  // yanlış doğrulama
} as const

export const VERIFY_THRESHOLD = 3   // kaç onay → fiyat aktif
export const REJECT_THRESHOLD = 3   // kaç ret → bildirim reddedildi
