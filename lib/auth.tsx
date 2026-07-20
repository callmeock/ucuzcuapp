'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signInWithCredential,
  getRedirectResult,
  GoogleAuthProvider,
  OAuthProvider,
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
  linkWithPopup,
  linkWithRedirect,
  linkWithCredential,
  updateProfile,
  signOut as firebaseSignOut,
  User,
  AuthCredential,
  OAuthCredential,
} from 'firebase/auth'
import { SignInWithApple } from '@capacitor-community/apple-sign-in'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'
import { getGuestPoints, clearGuestPoints } from './points'
import { isNativeApp, needsRedirectAuth } from './capacitor'

/** Native iOS bundle id — Sign in with Apple Services ID / App ID */
const APPLE_CLIENT_ID = 'com.ock.ucuzcu'

function randomNonce(length = 32): string {
  const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => charset[b % charset.length]).join('')
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

function isAppleCancelError(err: unknown): boolean {
  const code = String((err as { code?: string | number })?.code ?? '')
  const msg = String((err as { message?: string })?.message ?? '').toLowerCase()
  return (
    code === '1001' ||
    code === 'ERR_CANCELED' ||
    msg.includes('canceled') ||
    msg.includes('cancelled') ||
    msg.includes('abort')
  )
}

/** Tek admin hesabı — Google veya e-posta ile aynı adres */
export const ADMIN_EMAIL = 'eonurcankilic@gmail.com'

export function isAdminEmail(email: string | null | undefined): boolean {
  return (email || '').trim().toLowerCase() === ADMIN_EMAIL
}

export function hasProvider(user: User | null | undefined, providerId: string): boolean {
  return !!user?.providerData.some((p) => p.providerId === providerId)
}

interface AuthContextType {
  user: User | null
  loading: boolean
  isAdmin: boolean
  signInWithGoogle: () => Promise<void>
  signInWithApple: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  linkGoogle: () => Promise<void>
  linkEmailPassword: (password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  signInWithGoogle: async () => {},
  signInWithApple: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  resetPassword: async () => {},
  linkGoogle: async () => {},
  linkEmailPassword: async () => {},
  signOut: async () => {},
})

const PENDING_GOOGLE_KEY = 'ucuzcu_pending_google_cred'

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
      email: u.email || existing.email,
      displayName: u.displayName || existing.displayName,
      photoURL: u.photoURL || existing.photoURL,
    }, { merge: true })
  } else {
    await setDoc(ref, {
      email: u.email,
      displayName: u.displayName,
      photoURL: u.photoURL,
    }, { merge: true })
  }

  if (guestPoints > 0) clearGuestPoints()
}

function savePendingGoogleCred(cred: AuthCredential) {
  try {
    const oauth = cred as OAuthCredential
    sessionStorage.setItem(PENDING_GOOGLE_KEY, JSON.stringify({
      idToken: oauth.idToken ?? null,
      accessToken: oauth.accessToken ?? null,
    }))
  } catch { /* ignore */ }
}

function loadPendingGoogleCred(): AuthCredential | null {
  try {
    const raw = sessionStorage.getItem(PENDING_GOOGLE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as { idToken?: string | null; accessToken?: string | null }
    if (data.idToken || data.accessToken) {
      return GoogleAuthProvider.credential(data.idToken ?? undefined, data.accessToken ?? undefined)
    }
  } catch { /* ignore */ }
  return null
}

function clearPendingGoogleCred() {
  try { sessionStorage.removeItem(PENDING_GOOGLE_KEY) } catch { /* ignore */ }
}

export function mapAuthError(err: unknown): string {
  const msg = (err as { message?: string })?.message || ''
  if (msg && !msg.startsWith('Firebase:') && !msg.startsWith('auth/')) return msg

  const code = (err as { code?: string })?.code || ''
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Bu e-posta zaten kayıtlı. Giriş Yap veya Google / Apple ile devam et.'
    case 'auth/invalid-email':
      return 'Geçersiz e-posta adresi.'
    case 'auth/weak-password':
      return 'Şifre en az 6 karakter olmalı.'
    case 'auth/user-not-found':
      return 'Bu e-posta ile hesap bulunamadı. Önce Kayıt Ol.'
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-posta veya şifre hatalı. Hesabın yoksa Kayıt Ol; Google ile kayıtlıysa Google kullan.'
    case 'auth/too-many-requests':
      return 'Çok fazla deneme. Biraz sonra tekrar dene.'
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
    case 'auth/user-cancelled':
      return 'Giriş iptal edildi.'
    case 'auth/missing-or-invalid-nonce':
      return 'Apple girişi doğrulanamadı. Tekrar dene.'
    case 'auth/operation-not-allowed':
      return 'Bu giriş yöntemi henüz aktif değil.'
    case 'auth/missing-email':
      return 'Önce e-posta adresini yaz.'
    case 'auth/credential-already-in-use':
      return 'Bu Google hesabı başka bir kullanıcıya bağlı.'
    case 'auth/provider-already-linked':
      return 'Bu giriş yöntemi zaten bağlı.'
    case 'auth/requires-recent-login':
      return 'Güvenlik için tekrar giriş yap, sonra bağla.'
    case 'auth/account-exists-with-different-credential':
      return 'Bu e-posta başka bir yöntemle kayıtlı. E-posta/şifre ile giriş yap; Google otomatik bağlanır.'
    default:
      return msg || 'Giriş başarısız. Tekrar dene.'
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload()
      setUser(auth.currentUser)
    }
  }

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

  const oauthSignIn = async (provider: GoogleAuthProvider | OAuthProvider) => {
    try {
      if (needsRedirectAuth()) {
        await signInWithRedirect(auth, provider)
        return
      }
      const result = await signInWithPopup(auth, provider)
      await syncUserProfile(result.user)
    } catch (err) {
      const code = (err as { code?: string })?.code
      // E-posta/şifre hesabı varken Google denenince: credential sakla, şifre ile giriş sonrası bağla
      if (code === 'auth/account-exists-with-different-credential' && provider instanceof GoogleAuthProvider) {
        const cred = GoogleAuthProvider.credentialFromError(err as Parameters<typeof GoogleAuthProvider.credentialFromError>[0])
        const email = (err as { customData?: { email?: string } })?.customData?.email
        if (cred) savePendingGoogleCred(cred)
        throw Object.assign(
          new Error(
            email
              ? `${email} e-posta/şifre ile kayıtlı. Şifrenle giriş yap — Google hesabın otomatik bağlanır.`
              : 'Bu e-posta şifre ile kayıtlı. E-posta ile giriş yap; Google otomatik bağlanır.'
          ),
          { code }
        )
      }
      throw err
    }
  }

  const maybeLinkPendingGoogle = async (u: User) => {
    const pending = loadPendingGoogleCred()
    if (!pending) return
    try {
      await linkWithCredential(u, pending)
      clearPendingGoogleCred()
      await refreshUser()
    } catch (err) {
      const code = (err as { code?: string })?.code
      if (code === 'auth/provider-already-linked') clearPendingGoogleCred()
      // diğer hatalarda pending kalsın; kullanıcı tekrar deneyebilir
    }
  }

  const signInWithGoogle = async () => {
    await oauthSignIn(new GoogleAuthProvider())
  }

  /**
   * Native iOS: AuthenticationServices sheet via Capacitor plugin, then Firebase credential.
   * Web/PWA: Firebase OAuth popup/redirect (WKWebView redirect often shows "no action" on iPad).
   */
  const signInWithApple = async () => {
    if (isNativeApp()) {
      try {
        const rawNonce = randomNonce()
        const hashedNonce = await sha256Hex(rawNonce)
        const { response } = await SignInWithApple.authorize({
          clientId: APPLE_CLIENT_ID,
          redirectURI: 'https://ucuzcuapp.com/',
          scopes: 'email name',
          nonce: hashedNonce,
        })
        if (!response.identityToken) {
          throw Object.assign(new Error('Apple kimlik doğrulaması başarısız.'), {
            code: 'auth/invalid-credential',
          })
        }
        const provider = appleProvider()
        const credential = provider.credential({
          idToken: response.identityToken,
          rawNonce,
        })
        const result = await signInWithCredential(auth, credential)
        const fullName = [response.givenName, response.familyName].filter(Boolean).join(' ').trim()
        if (fullName && !result.user.displayName) {
          await updateProfile(result.user, { displayName: fullName })
        }
        await syncUserProfile(result.user)
        return
      } catch (err) {
        if (isAppleCancelError(err)) {
          throw Object.assign(new Error('Giriş iptal edildi.'), { code: 'auth/user-cancelled' })
        }
        throw err
      }
    }
    await oauthSignIn(appleProvider())
  }

  const signInWithEmail = async (email: string, password: string) => {
    const cleaned = email.trim().toLowerCase()
    try {
      const result = await signInWithEmailAndPassword(auth, cleaned, password)
      await syncUserProfile(result.user)
      await maybeLinkPendingGoogle(result.user)
    } catch (err) {
      const code = (err as { code?: string })?.code
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        try {
          const methods = await fetchSignInMethodsForEmail(auth, cleaned)
          if (methods.includes('google.com') && !methods.includes('password')) {
            throw Object.assign(
              new Error('Bu e-posta Google ile kayıtlı. Google ile giriş yap, sonra Profil’den şifre ekleyebilirsin.'),
              { code: 'auth/oauth-only' }
            )
          }
          if (methods.includes('apple.com') && !methods.includes('password')) {
            throw Object.assign(
              new Error('Bu e-posta Apple ile kayıtlı. Apple ile giriş yap, sonra Profil’den şifre ekleyebilirsin.'),
              { code: 'auth/oauth-only' }
            )
          }
          if (methods.length === 0) {
            throw Object.assign(
              new Error('Bu e-posta ile hesap yok. Kayıt Ol sekmesinden üye ol.'),
              { code: 'auth/user-not-found' }
            )
          }
        } catch (inner) {
          if ((inner as { code?: string })?.code === 'auth/oauth-only' || (inner as { code?: string })?.code === 'auth/user-not-found') {
            throw inner
          }
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
      await maybeLinkPendingGoogle(result.user)
    } catch (err) {
      if ((err as { code?: string })?.code === 'auth/email-already-in-use') {
        try {
          const methods = await fetchSignInMethodsForEmail(auth, cleaned)
          if (methods.includes('google.com')) {
            throw Object.assign(
              new Error('Bu e-posta Google ile kayıtlı. Google ile giriş yap, sonra Profil’den şifre ekle — ikisi de çalışır.'),
              { code: 'auth/oauth-only' }
            )
          }
          if (methods.includes('apple.com')) {
            throw Object.assign(
              new Error('Bu e-posta Apple ile kayıtlı. Apple ile giriş yap, sonra Profil’den şifre ekle.'),
              { code: 'auth/oauth-only' }
            )
          }
          if (methods.includes('password')) {
            throw Object.assign(
              new Error('Bu e-posta zaten kayıtlı. Giriş Yap sekmesini kullan.'),
              { code: 'auth/email-already-in-use' }
            )
          }
        } catch (inner) {
          if ((inner as { code?: string })?.code) throw inner
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

  /** Oturum açıkken Google hesabını bağla */
  const linkGoogle = async () => {
    const u = auth.currentUser
    if (!u) throw Object.assign(new Error('Önce giriş yap.'), { code: 'auth/requires-recent-login' })
    if (hasProvider(u, 'google.com')) {
      throw Object.assign(new Error('Google zaten bağlı.'), { code: 'auth/provider-already-linked' })
    }
    const provider = new GoogleAuthProvider()
    if (needsRedirectAuth()) {
      await linkWithRedirect(u, provider)
      return
    }
    await linkWithPopup(u, provider)
    await refreshUser()
    if (auth.currentUser) await syncUserProfile(auth.currentUser)
  }

  /** Oturum açıkken e-posta/şifre ekle (aynı e-posta ile her iki yöntem çalışır) */
  const linkEmailPassword = async (password: string) => {
    const u = auth.currentUser
    if (!u?.email) throw Object.assign(new Error('Hesapta e-posta yok.'), { code: 'auth/missing-email' })
    if (password.length < 6) {
      throw Object.assign(new Error('Şifre en az 6 karakter olmalı.'), { code: 'auth/weak-password' })
    }
    if (hasProvider(u, 'password')) {
      throw Object.assign(new Error('Şifre zaten tanımlı. Unuttuysan giriş ekranından sıfırla.'), {
        code: 'auth/provider-already-linked',
      })
    }
    const cred = EmailAuthProvider.credential(u.email, password)
    await linkWithCredential(u, cred)
    await refreshUser()
    if (auth.currentUser) await syncUserProfile(auth.currentUser)
  }

  const signOut = async () => {
    clearPendingGoogleCred()
    await firebaseSignOut(auth)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin: isAdminEmail(user?.email),
        signInWithGoogle,
        signInWithApple,
        signInWithEmail,
        signUpWithEmail,
        resetPassword,
        linkGoogle,
        linkEmailPassword,
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
