import {
  collection, addDoc, getDocs, deleteDoc, doc,
  query, orderBy, where, serverTimestamp,
} from 'firebase/firestore'
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject,
} from 'firebase/storage'
import { db, storage } from './firebase'

export interface Brosur {
  id: string
  market: string
  title: string
  pdfUrl: string
  storagePath: string
  startDate: string   // YYYY-MM-DD
  endDate: string     // YYYY-MM-DD
  createdAt: any
}

const COL = 'brosurler'

// ── PDF yükle + Firestore'a kaydet ────────────────────────────────
export async function uploadBrosur(
  file: File,
  market: string,
  title: string,
  startDate: string,
  endDate: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  const path = `brosurler/${market}/${Date.now()}_${file.name}`
  const storageRef = ref(storage, path)

  await new Promise<void>((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, { contentType: 'application/pdf' })
    task.on(
      'state_changed',
      snap => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      () => resolve()
    )
  })

  const pdfUrl = await getDownloadURL(storageRef)

  await addDoc(collection(db, COL), {
    market,
    title,
    pdfUrl,
    storagePath: path,
    startDate,
    endDate,
    createdAt: serverTimestamp(),
  })

  return pdfUrl
}

// ── Tüm broşürleri getir (admin) ──────────────────────────────────
export async function getAllBrosurler(): Promise<Brosur[]> {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Brosur))
}

// ── Aktif broşürleri getir (bu hafta geçerli olanlar) ─────────────
export async function getActiveBrosurler(): Promise<Brosur[]> {
  const today = new Date().toISOString().split('T')[0]
  const snap = await getDocs(collection(db, COL))
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Brosur))
    .filter(b => b.startDate <= today && b.endDate >= today)
    .sort((a, b) => a.market.localeCompare(b.market))
}

// ── Broşür sil ────────────────────────────────────────────────────
export async function deleteBrosur(brosur: Brosur): Promise<void> {
  // Storage'dan sil
  try {
    await deleteObject(ref(storage, brosur.storagePath))
  } catch { /* storage dosyası yoksa devam et */ }
  // Firestore'dan sil
  await deleteDoc(doc(db, COL, brosur.id))
}
