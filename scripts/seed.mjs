/**
 * Firestore Seed Script
 * Kullanım: web/ klasöründeyken → node scripts/seed.mjs
 *
 * ÖNEMLİ: Firebase Console'da Firestore Database kurulu olmalı.
 * Güvenlik kuralı (geçici): allow read, write: if true;
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, getDocs, deleteDoc } from 'firebase/firestore'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const firebaseConfig = {
  apiKey: 'AIzaSyD-fFi2Rpzc0u2S4c8nxU6xtRpFzlOrsmQ',
  authDomain: 'ucuzcu-98374.firebaseapp.com',
  projectId: 'ucuzcu-98374',
  storageBucket: 'ucuzcu-98374.firebasestorage.app',
  messagingSenderId: '245886804192',
  appId: '1:245886804192:web:0b85319a38e353d0373085',
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function seed() {
  console.log('🌱 Ucuzcu Firestore seed başlıyor...\n')

  // Veri dosyasını oku
  const dataPath = join(__dirname, '../../data/products.json')
  const raw = readFileSync(dataPath, 'utf-8')
  const { products } = JSON.parse(raw)

  console.log(`📦 ${products.length} ürün bulundu\n`)

  // Mevcut ürünleri temizle
  const existing = await getDocs(collection(db, 'products'))
  if (existing.docs.length > 0) {
    console.log(`🧹 Mevcut ${existing.docs.length} ürün siliniyor...`)
    for (const d of existing.docs) {
      await deleteDoc(d.ref)
    }
    console.log('✅ Temizlendi\n')
  }

  // Yeni ürünleri ekle
  let i = 0
  for (const product of products) {
    const { id, ...data } = product // Firestore kendi ID'sini atar
    await addDoc(collection(db, 'products'), {
      ...data,
      createdAt: new Date().toISOString(),
    })
    i++
    process.stdout.write(`\r📤 ${i}/${products.length} yüklendi: ${product.name}`)
  }

  console.log('\n\n✅ Seed tamamlandı! Firestore\'da', products.length, 'ürün var.')
  console.log('🔗 Firebase Console: https://console.firebase.google.com/project/ucuzcu-98374/firestore')
  process.exit(0)
}

seed().catch((err) => {
  console.error('\n❌ Hata:', err.message)
  if (err.message.includes('permission')) {
    console.log('\n💡 Çözüm: Firebase Console → Firestore → Rules:')
    console.log('   rules_version = \'2\';')
    console.log('   service cloud.firestore {')
    console.log('     match /databases/{database}/documents {')
    console.log('       match /{document=**} {')
    console.log('         allow read, write: if true;')
    console.log('       }')
    console.log('     }')
    console.log('   }')
  }
  process.exit(1)
})
