import {
  collection, addDoc, getDocs, getDoc, doc,
  updateDoc, query, where, orderBy, limit,
  serverTimestamp, arrayUnion, increment,
} from 'firebase/firestore'
import { db } from './firebase'
import { PriceSubmission, Product, VERIFY_THRESHOLD, REJECT_THRESHOLD } from './types'

const SUB_COL  = 'price_submissions'
const PROD_COL = 'products'
const USER_COL = 'users'

// ── Barkod ile ürün bul ───────────────────────────────────────────
export async function getProductByBarcode(barcode: string): Promise<Product | null> {
  const q = query(collection(db, PROD_COL), where('barcode', '==', barcode))
  const snap = await getDocs(q)
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Product
}

// ── Tüm ürünleri önbellekleme için getir (hafif — sadece arama alanları) ──
export async function getAllProducts(): Promise<Product[]> {
  const snap = await getDocs(collection(db, PROD_COL))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Product))
}

// ── İsme göre ürün ara (fuzzy olmayan, basit içerik araması) ──────
export async function searchProductsByName(term: string): Promise<Product[]> {
  // Firestore full-text search olmadığından client-side filtre
  const snap = await getDocs(collection(db, PROD_COL))
  const lower = term.toLowerCase()
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Product))
    .filter(p => p.name.toLowerCase().includes(lower))
    .slice(0, 8)
}

// ── Fiyat bildirimi gönder ────────────────────────────────────────
export async function submitPrice(data: {
  barcode: string
  productId: string | null
  productName: string
  market: string
  price: number
  submittedBy: string | null
  submittedByName: string | null
}): Promise<string> {
  const ref = await addDoc(collection(db, SUB_COL), {
    ...data,
    status: 'pending',
    verifiedBy: [],
    rejectedBy: [],
    createdAt: serverTimestamp(),
  })
  return ref.id
}

// ── Barkoda göre bekleyen bildirimleri getir ─────────────────────
export async function getPendingSubmissionsByBarcode(barcode: string): Promise<PriceSubmission[]> {
  const q = query(
    collection(db, SUB_COL),
    where('barcode', '==', barcode),
    limit(10)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as PriceSubmission))
    .filter(s => s.status === 'pending')
}

// ── Bekleyen bildirimleri getir ───────────────────────────────────
export async function getPendingSubmissions(limitN = 20): Promise<PriceSubmission[]> {
  const q = query(
    collection(db, SUB_COL),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc'),
    limit(limitN)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as PriceSubmission))
}

// ── Doğrulama / ret oyu (sadece üyeler) ──────────────────────────
export async function voteSubmission(
  submissionId: string,
  uid: string,
  vote: 'verify' | 'reject'
): Promise<{ newStatus: string }> {
  const ref = doc(db, SUB_COL, submissionId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Bildirim bulunamadı')

  const sub = { id: snap.id, ...snap.data() } as PriceSubmission

  // Daha önce oy vermiş mi?
  if (sub.verifiedBy.includes(uid) || sub.rejectedBy.includes(uid)) {
    throw new Error('Bu bildirim için zaten oy kullandınız')
  }
  // Kendi bildirimini oylayamaz
  if (sub.submittedBy === uid) {
    throw new Error('Kendi bildiriminizi oylayamazsınız')
  }

  const field = vote === 'verify' ? 'verifiedBy' : 'rejectedBy'
  await updateDoc(ref, { [field]: arrayUnion(uid) })

  // Eşik kontrolü
  const verifiedCount  = sub.verifiedBy.length  + (vote === 'verify' ? 1 : 0)
  const rejectedCount  = sub.rejectedBy.length   + (vote === 'reject' ? 1 : 0)

  if (verifiedCount >= VERIFY_THRESHOLD) {
    await updateDoc(ref, { status: 'verified' })
    await applyVerifiedPrice(sub)
    return { newStatus: 'verified' }
  }

  if (rejectedCount >= REJECT_THRESHOLD) {
    await updateDoc(ref, { status: 'rejected' })
    return { newStatus: 'rejected' }
  }

  return { newStatus: 'pending' }
}

// ── Doğrulanan fiyatı ürüne işle ─────────────────────────────────
async function applyVerifiedPrice(sub: PriceSubmission) {
  if (!sub.productId) return
  const prodRef = doc(db, PROD_COL, sub.productId)
  const prodSnap = await getDoc(prodRef)
  if (!prodSnap.exists()) return

  const product = { id: prodSnap.id, ...prodSnap.data() } as Product
  const today = new Date().toISOString().split('T')[0]

  const existing = product.prices.find(p => p.market === sub.market)
  if (existing) {
    // Fiyat güncelle + geçmişe ekle
    const updated = product.prices.map(p =>
      p.market === sub.market
        ? {
            ...p,
            currentPrice: sub.price,
            updatedAt: today,
            history: [...(p.history || []), { date: today, price: sub.price }].slice(-30),
          }
        : p
    )
    await updateDoc(prodRef, { prices: updated })
  } else {
    // Yeni market fiyatı ekle
    const newPrice = {
      market: sub.market,
      currentPrice: sub.price,
      unit: product.unit || 'adet',
      available: true,
      updatedAt: today,
      history: [{ date: today, price: sub.price }],
    }
    await updateDoc(prodRef, { prices: [...product.prices, newPrice] })
  }
}

// ── Kullanıcı puan güncelle (Firestore) ──────────────────────────
export async function updateUserPoints(uid: string, delta: number): Promise<void> {
  const ref = doc(db, USER_COL, uid)
  await updateDoc(ref, { points: increment(delta) }).catch(async () => {
    // Döküman yoksa oluştur
    await addDoc(collection(db, USER_COL), { uid, points: Math.max(0, delta) })
  })
}
