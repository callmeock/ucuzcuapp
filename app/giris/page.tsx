'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { getGuestPoints } from '@/lib/points'
import AuthButtons from '@/components/AuthButtons'

export default function GirisPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const guestPoints = getGuestPoints()

  useEffect(() => {
    if (!loading && user) router.replace('/tara')
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-green-400 border-t-transparent rounded-full animate-spin"/>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex flex-col">
      <div className="px-4 py-4">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <img src="/logo-v2.png" alt="Ucuzcu" className="w-8 h-8 rounded-lg object-cover" />
          <span className="font-extrabold text-xl text-gray-800">Ucuzcu</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        <div className="w-full max-w-sm space-y-5">

          <div className="text-center">
            <div className="text-6xl mb-4">🔐</div>
            <h1 className="text-2xl font-black text-gray-900">Hoş geldin!</h1>
            <p className="text-gray-500 text-sm mt-1">
              Üye ol, daha fazla puan kazan.
            </p>
          </div>

          {guestPoints > 0 && (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-4 text-center">
              <p className="text-3xl font-black text-yellow-600 mb-1">{guestPoints} ⭐</p>
              <p className="text-sm font-semibold text-yellow-800">puan kazandın!</p>
              <p className="text-xs text-yellow-600 mt-1">
                Giriş yapınca bu puanlar hesabına aktarılacak.
              </p>
            </div>
          )}

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

          <AuthButtons onSuccess={() => router.replace('/dogrula')} />

          <p className="text-center text-xs text-gray-400">
            Giriş yaparak{' '}
            <Link href="/gizlilik" className="underline">Gizlilik Politikası</Link>'nı kabul etmiş olursun.
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
