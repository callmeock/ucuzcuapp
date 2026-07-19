'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'
import { getGuestPoints, clearGuestPoints } from './points'
import { needsRedirectAuth } from './capacitor'

interface AuthContextType {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithApple: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithApple: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signOut: async () => {},
})

function appleProvider() {
  const provider = new OAuthProvider('apple.com')
  provider.addScope('email')
  provider.addScope('name')
  return provider
}

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

async function oauthSignIn(provider: GoogleAuthProvider | OAuthProvider) {
  if (needsRedirectAuth()) {
    await signInWithRedirect(auth, provider)
    return
  }
  const result = await signInWithPopup(auth, provider)
  await syncUserProfile(result.user)
}

export function mapAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code || ''
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Bu e-posta zaten kayıtlı. Giriş yapmayı dene.'
    case 'auth/invalid-email':
      return 'Geçersiz e-posta adresi.'
    case 'auth/weak-password':
      return 'Şifre en az 6 karakter olmalı.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-posta veya şifre hatalı.'
    case 'auth/too-many-requests':
      return 'Çok fazla deneme. Biraz sonra tekrar dene.'
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Giriş iptal edildi.'
    case 'auth/operation-not-allowed':
      return 'Bu giriş yöntemi henüz aktif değil.'
    default:
      return (err as { message?: string })?.message || 'Giriş başarısız. Tekrar dene.'
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
    await oauthSignIn(new GoogleAuthProvider())
  }

  const signInWithApple = async () => {
    await oauthSignIn(appleProvider())
  }

  const signInWithEmail = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email.trim(), password)
    await syncUserProfile(result.user)
  }

  const signUpWithEmail = async (email: string, password: string, displayName?: string) => {
    const result = await createUserWithEmailAndPassword(auth, email.trim(), password)
    if (displayName?.trim()) {
      await updateProfile(result.user, { displayName: displayName.trim() })
    }
    await syncUserProfile(result.user)
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signInWithApple,
        signInWithEmail,
        signUpWithEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
