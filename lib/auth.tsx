'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'
import { addGuestPoints, getGuestPoints, clearGuestPoints } from './points'

interface AuthContextType {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      setLoading(false)
    })
    return unsub
  }, [])

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)
    const u = result.user

    // Kullanıcı dökümanı oluştur / güncelle
    const ref = doc(db, 'users', u.uid)
    const snap = await getDoc(ref)

    const guestPoints = getGuestPoints()

    if (!snap.exists()) {
      // Yeni üye — misafir puanlarını aktar
      await setDoc(ref, {
        uid: u.uid,
        displayName: u.displayName,
        photoURL: u.photoURL,
        email: u.email,
        points: guestPoints,
        submissionsCount: 0,
        verificationsCount: 0,
        createdAt: serverTimestamp(),
      })
    } else if (guestPoints > 0) {
      // Misafir puanlarını mevcut hesaba ekle
      const existing = snap.data()
      await setDoc(ref, {
        ...existing,
        points: (existing.points || 0) + guestPoints,
      }, { merge: true })
    }

    // Misafir puanlarını temizle (artık Firestore'da)
    if (guestPoints > 0) clearGuestPoints()
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
