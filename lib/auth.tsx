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
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
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
  resetPassword: (email: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithApple: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  resetPassword: async () => {},
  signOut: async () => {},
})

function providerHint(methods: string[]): string | null {
  const hasPassword = methods.includes('password')
  const oauth = methods.filter((m) => m === 'google.com' || m === 'apple.com')
  if (!hasPassword && oauth.length > 0) {
    const labels = oauth.map((m) => (m === 'google.com' ? 'Google' : 'Apple')).join(' / ')
    return `Bu e-posta ${labels} ile kayıtlı. Lütfen o yöntemle giriş yap.`
  }
  return null
}

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
  const msg = (err as { message?: string })?.message || ''
  // Bizim özel Türkçe mesajlarımız Firebase prefix'i taşımaz
  if (msg && !msg.startsWith('Firebase:') && !msg.startsWith('auth/')) return msg

  const code = (err as { code?: string })?.code || ''
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Bu e-posta zaten kayıtlı. Giriş Yap sekmesini dene veya Google / Apple kullan.'
    case 'auth/invalid-email':
      return 'Geçersiz e-posta adresi.'
    case 'auth/weak-password':
      return 'Şifre en az 6 karakter olmalı.'
    case 'auth/user-not-found':
      return 'Bu e-posta ile hesap bulunamadı. Önce Kayıt Ol.'
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-posta veya şifre hatalı. Hesabın yoksa Kayıt Ol sekmesini kullan.'
    case 'auth/too-many-requests':
      return 'Çok fazla deneme. Biraz sonra tekrar dene.'
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Giriş iptal edildi.'
    case 'auth/operation-not-allowed':
      return 'E-posta ile giriş Firebase’de henüz açık değil.'
    case 'auth/missing-email':
      return 'Önce e-posta adresini yaz.'
    case 'auth/oauth-only':
      return (err as { message?: string })?.message || 'Bu e-posta Google veya Apple ile kayıtlı.'
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
    const cleaned = email.trim().toLowerCase()
    try {
      const result = await signInWithEmailAndPassword(auth, cleaned, password)
      await syncUserProfile(result.user)
    } catch (err) {
      const code = (err as { code?: string })?.code
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        try {
          const methods = await fetchSignInMethodsForEmail(auth, cleaned)
          const hint = providerHint(methods)
          if (hint) throw Object.assign(new Error(hint), { code: 'auth/oauth-only', message: hint })
          if (methods.length === 0) {
            throw Object.assign(new Error('Bu e-posta ile hesap yok. Kayıt Ol sekmesinden üye ol.'), {
              code: 'auth/user-not-found',
              message: 'Bu e-posta ile hesap yok. Kayıt Ol sekmesinden üye ol.',
            })
          }
        } catch (inner) {
          if ((inner as { code?: string })?.code === 'auth/oauth-only' || (inner as { code?: string })?.code === 'auth/user-not-found') {
            throw inner
          }
          // enumeration protection: methods boş dönebilir — orijinal hatayı kullan
        }
      }
      throw err
    }
  }

  const signUpWithEmail = async (email: string, password: string, displayName?: string) => {
    const cleaned = email.trim().toLowerCase()
    try {
      const result = await createUserWithEmailAndPassword(auth, cleaned, password)
      if (displayName?.trim()) {
        await updateProfile(result.user, { displayName: displayName.trim() })
      }
      await syncUserProfile(result.user)
    } catch (err) {
      if ((err as { code?: string })?.code === 'auth/email-already-in-use') {
        try {
          const methods = await fetchSignInMethodsForEmail(auth, cleaned)
          const hint = providerHint(methods)
          if (hint) throw Object.assign(new Error(hint), { code: 'auth/oauth-only', message: hint })
        } catch (inner) {
          if ((inner as { code?: string })?.code === 'auth/oauth-only') throw inner
        }
      }
      throw err
    }
  }

  const resetPassword = async (email: string) => {
    const cleaned = email.trim().toLowerCase()
    if (!cleaned) {
      throw Object.assign(new Error('Önce e-posta adresini yaz.'), { code: 'auth/missing-email' })
    }
    await sendPasswordResetEmail(auth, cleaned)
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
        resetPassword,
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
