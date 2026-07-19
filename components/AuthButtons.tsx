'use client'

import { useState, FormEvent } from 'react'
import { useAuth, mapAuthError } from '@/lib/auth'

type Mode = 'signin' | 'signup'
type Busy = 'apple' | 'google' | 'email' | null

interface AuthButtonsProps {
  onSuccess?: () => void
  compact?: boolean
}

export default function AuthButtons({ onSuccess, compact }: AuthButtonsProps) {
  const { signInWithApple, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth()
  const [busy, setBusy] = useState<Busy>(null)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<Mode>('signin')
  const [showEmail, setShowEmail] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')

  const run = async (key: Busy, fn: () => Promise<void>) => {
    setBusy(key)
    setError('')
    try {
      await fn()
      onSuccess?.()
    } catch (err) {
      setError(mapAuthError(err))
    } finally {
      setBusy(null)
    }
  }

  const handleEmail = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('E-posta ve şifre gerekli.')
      return
    }
    if (mode === 'signup' && password.length < 6) {
      setError('Şifre en az 6 karakter olmalı.')
      return
    }
    await run('email', async () => {
      if (mode === 'signup') {
        await signUpWithEmail(email, password, displayName)
      } else {
        await signInWithEmail(email, password)
      }
    })
  }

  const btnBase =
    'w-full flex items-center justify-center gap-3 rounded-2xl py-3.5 font-semibold transition-all active:scale-[0.98] disabled:opacity-60'

  return (
    <div className="space-y-3">
      {/* Sign in with Apple — Guideline 4.8: Google ile aynı seviye */}
      <button
        type="button"
        onClick={() => run('apple', signInWithApple)}
        disabled={!!busy}
        className={`${btnBase} bg-black hover:bg-gray-900 text-white shadow-sm`}
      >
        {busy === 'apple' ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
        )}
        {busy === 'apple' ? 'Giriş yapılıyor...' : 'Apple ile Giriş Yap'}
      </button>

      <button
        type="button"
        onClick={() => run('google', signInWithGoogle)}
        disabled={!!busy}
        className={`${btnBase} bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 text-gray-700 shadow-sm`}
      >
        {busy === 'google' ? (
          <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        )}
        {busy === 'google' ? 'Giriş yapılıyor...' : 'Google ile Giriş Yap'}
      </button>

      {!compact && (
        <>
          <div className="flex items-center gap-3 py-1 text-xs text-gray-400">
            <div className="flex-1 h-px bg-gray-200" />
            veya
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {!showEmail ? (
            <button
              type="button"
              onClick={() => setShowEmail(true)}
              disabled={!!busy}
              className={`${btnBase} bg-white hover:bg-gray-50 border-2 border-dashed border-gray-200 hover:border-gray-300 text-gray-600`}
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              E-posta ile devam et
            </button>
          ) : (
            <form onSubmit={handleEmail} className="bg-white rounded-2xl border-2 border-gray-200 p-4 space-y-3">
              <div className="flex gap-2 text-sm font-semibold">
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError('') }}
                  className={`flex-1 py-2 rounded-xl transition-colors ${
                    mode === 'signin' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Giriş Yap
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError('') }}
                  className={`flex-1 py-2 rounded-xl transition-colors ${
                    mode === 'signup' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Kayıt Ol
                </button>
              </div>

              {mode === 'signup' && (
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Adın (isteğe bağlı)"
                  autoComplete="name"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                />
              )}

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-posta"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
              />

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'Şifre (min. 6 karakter)' : 'Şifre'}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
                minLength={6}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
              />

              <button
                type="submit"
                disabled={!!busy}
                className={`${btnBase} bg-green-600 hover:bg-green-700 text-white`}
              >
                {busy === 'email' ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : mode === 'signup' ? (
                  'Kayıt Ol'
                ) : (
                  'Giriş Yap'
                )}
              </button>
            </form>
          )}
        </>
      )}

      {error && (
        <p className="text-center text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
