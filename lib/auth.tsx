'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'
import { addGuestPoints, getGuestPoints, clearGuestPoints } from './points'
import { needsRedirectAuth } from './capacitor'

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

async function syncUserProfile(u: User) {
  const ref = doc(db, 'users', u.uid)
  const snap = await getDoc(ref)
  const guestPoints = getGuestPoints()

  if (!snap.exists()) {
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
    const existing = snap.data()
    await setDoc(ref, {
      ...existing,
      points: (existing.points || 0) + guestPoints,
    }, { merge: true })
  }

  if (guestPoints > 0) clearGuestPoints()
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // OAuth redirect dönüşü (Capacitor / iOS Safari)
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) await syncUserProfile(result.user)
      })
      .catch((err) => console.error('Redirect auth hatası:', err))

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return unsub
  }, [])

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    if (needsRedirectAuth()) {
      await signInWithRedirect(auth, provider)
      return
    }
    const result = await signInWithPopup(auth, provider)
    await syncUserProfile(result.user)
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
