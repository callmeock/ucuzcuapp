import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore'
import { db } from './firebase'
import { Product } from './types'

const COL = 'products'

// brand alanı Migros scraper'dan obje olarak gelebilir: {name, id, prettyName}
function normalizeBrand(brand: any): string {
  if (!brand) return ''
  if (typeof brand === 'string') return brand
  if (typeof brand === 'object') return brand.name || ''
  return String(brand)
}

function normalizeProduct(id: string, data: any): Product {
  return { ...data, id, brand: normalizeBrand(data.brand) } as Product
}

export async function getProducts(): Promise<Product[]> {
  const q = query(collection(db, COL), orderBy('name'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => normalizeProduct(d.id, d.data()))
}

export async function getProduct(id: string): Promise<Product | null> {
  const ref = doc(db, COL, id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return normalizeProduct(snap.id, snap.data())
}

export async function addProduct(product: Omit<Product, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...product,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateProduct(id: string, data: Partial<Omit<Product, 'id'>>): Promise<void> {
  const ref = doc(db, COL, id)
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() })
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id))
}
