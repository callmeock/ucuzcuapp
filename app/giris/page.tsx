'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { getGuestPoints, getLevel } from '@/lib/points'

export default function GirisPage() {
  const { user, loading, signInWithGoogle } = useAuth()
  const router = useRouter()
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState('')
  const guestPoints = getGuestPoints()
  const level = getLevel(guestPoints)

  useEffect(() => {
    if (!loading && user) router.replace('/tara')
  }, [user, loading, router])

  const handleSignIn = async () => {
    setSigningIn(true)
    setError('')
    try {
      await signInWithGoogle()
      router.replace('/dogrula')
    } catch (err: any) {
      setError('Giriş başarısız: ' + (err.message || 'Tekrar dene'))
      setSigningIn(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-green-400 border-t-transparent rounded-full animate-spin"/>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex flex-col">
      {/* Header */}
      <div className="px-4 py-4">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <span className="text-2xl">🏷️</span>
          <span className="font-extrabold text-xl text-gray-800">Ucuzcu</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-5">

          {/* Logo + Başlık */}
          <div className="text-center">
            <div className="text-6xl mb-4">🔐</div>
            <h1 className="text-2xl font-black text-gray-900">Hoş geldin!</h1>
            <p className="text-gray-500 text-sm mt-1">
              Üye ol, daha fazla puan kazan.
            </p>
          </div>

          {/* Misafir puanları varsa vurgula */}
          {guestPoints > 0 && (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-4 text-center">
              <p className="text-3xl font-black text-yellow-600 mb-1">{guestPoints} ⭐</p>
              <p className="text-sm font-semibold text-yellow-800">puan kazandın!</p>
              <p className="text-xs text-yellow-600 mt-1">
                Giriş yapınca bu puanlar hesabına aktarılacak.
              </p>
            </div>
          )}

          {/* Avantajlar */}
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
            {[
              { icon: '⭐', title: 'Puanların kaybolmaz', desc: 'Cihazı değiştirsen bile' },
              { icon: '🔍', title: 'Fiyat doğrulama', desc: 'Her doğrulamada +2 puan kazan' },
              { icon: '📊', title: 'Katkı geçmişin', desc: 'Kaç fiyat girdin, gör' },
              { icon: '🏆', title: 'Liderlik tablosu', desc: 'En çok katkı yapanlar arasına gir' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xl w-8 text-center">{item.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Google Giriş */}
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 rounded-2xl py-4 font-semibold text-gray-700 shadow-sm transition-all active:scale-95 disabled:opacity-60"
          >
            {signingIn ? (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"/>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {signingIn ? 'Giriş yapılıyor...' : 'Google ile Giriş Yap'}
          </button>

          {error && (
            <p className="text-center text-xs text-red-500">{error}</p>
          )}

          <p className="text-center text-xs text-gray-400">
            Giriş yaparak{' '}
            <span className="underline cursor-pointer">Kullanım Koşulları</span>'nı kabul etmiş olursun.
          </p>

          <div className="text-center">
            <Link href="/tara" className="text-sm text-gray-400 hover:text-gray-600 underline">
              Misafir olarak devam et →
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
