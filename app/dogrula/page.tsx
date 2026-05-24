'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { getPendingSubmissions, voteSubmission } from '@/lib/submissions'
import { POINTS, VERIFY_THRESHOLD, type PriceSubmission } from '@/lib/types'
import { doc, updateDoc, increment } from 'firebase/firestore'
import { db } from '@/lib/firebase'

const MARKET_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Migros: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-400' },
  A101:   { bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-400' },
  'Şok':  { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-400' },
  'BİM':  { bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-400' },
}

export default function DogrulaPage() {
  const { user, loading, signInWithGoogle } = useAuth()
  const [submissions, setSubmissions] = useState<PriceSubmission[]>([])
  const [fetching, setFetching] = useState(false)
  const [voted, setVoted] = useState<Record<string, 'verify' | 'reject'>>({})
  const [voting, setVoting] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [userPoints, setUserPoints] = useState<number | null>(null)
  const [signingIn, setSigningIn] = useState(false)

  const fetchSubmissions = useCallback(async () => {
    setFetching(true)
    try {
      const list = await getPendingSubmissions(30)
      // Kendi gönderimlerini filtrele
      setSubmissions(list.filter(s => s.submittedBy !== user?.uid))
    } catch { /* ignore */ }
    setFetching(false)
  }, [user])

  useEffect(() => {
    if (user) fetchSubmissions()
  }, [user, fetchSubmissions])

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleVote = async (sub: PriceSubmission, vote: 'verify' | 'reject') => {
    if (!user) return
    setVoting(sub.id)
    try {
      const result = await voteSubmission(sub.id, user.uid, vote)

      // Kullanıcı puanını güncelle
      const pointDelta = vote === 'verify' ? POINTS.VERIFY : 0
      if (pointDelta > 0) {
        await updateDoc(doc(db, 'users', user.uid), {
          points: increment(pointDelta),
          verificationsCount: increment(1),
        })
        setUserPoints(prev => (prev ?? 0) + pointDelta)
      }

      setVoted(prev => ({ ...prev, [sub.id]: vote }))

      if (result.newStatus === 'verified') {
        showToast(`✅ Fiyat onaylandı! Artık sitede görünecek. +${POINTS.VERIFY}⭐`)
      } else if (result.newStatus === 'rejected') {
        showToast('❌ Fiyat reddedildi.')
      } else {
        showToast(vote === 'verify' ? `Onaylandı! +${POINTS.VERIFY}⭐` : 'Reddedildi.')
      }

      // Listedeki öğeyi 1 sn sonra kaldır
      setTimeout(() => {
        setSubmissions(prev => prev.filter(s => s.id !== sub.id))
      }, 1000)
    } catch (err: any) {
      showToast(err.message, 'err')
    }
    setVoting(null)
  }

  const handleSignIn = async () => {
    setSigningIn(true)
    try {
      await signInWithGoogle()
    } catch { /* ignore */ }
    setSigningIn(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"/>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
          </Link>
          <h1 className="font-bold text-gray-900 flex-1">Fiyat Doğrula</h1>
          {user && (
            <div className="flex items-center gap-2">
              <img src={user.photoURL || ''} alt="" className="w-7 h-7 rounded-full"/>
              {userPoints !== null && (
                <span className="text-xs font-bold text-yellow-600 bg-yellow-50 border border-yellow-200 rounded-full px-2 py-0.5">
                  +{userPoints}⭐
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* Giriş yapılmamış */}
        {!user && (
          <div className="bg-white rounded-2xl p-6 shadow-sm text-center space-y-4">
            <div className="text-5xl">🔒</div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg">Üyelere Özel</h2>
              <p className="text-sm text-gray-500 mt-1">
                Fiyat doğrulamak için giriş yapman gerekiyor.<br/>
                Her doğrulamada <strong>+{POINTS.VERIFY} puan</strong> kazanırsın.
              </p>
            </div>
            <button
              onClick={handleSignIn}
              disabled={signingIn}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 border-2 border-gray-200 rounded-xl py-3.5 font-semibold text-gray-700 transition-all disabled:opacity-60"
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
            <Link href="/tara" className="block text-xs text-gray-400 hover:text-gray-500 underline">
              Önce fiyat bildirmek istiyorum →
            </Link>
          </div>
        )}

        {/* Giriş yapıldı */}
        {user && (
          <>
            {/* Bilgi banner */}
            <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 flex items-start gap-3">
              <span className="text-xl">💡</span>
              <div>
                <p className="text-sm font-semibold text-purple-900">Nasıl doğrularsın?</p>
                <p className="text-xs text-purple-600 mt-0.5">
                  Listedeki fiyatı tanıyor musun? <strong>Doğru</strong> veya <strong>Yanlış</strong> işaretle.
                  {VERIFY_THRESHOLD} kişi onaylarsa fiyat sisteme işlenir.
                  Her doğrulama <strong>+{POINTS.VERIFY} puan</strong>.
                </p>
              </div>
            </div>

            {/* Yükleniyor */}
            {fetching && (
              <div className="flex flex-col items-center py-12 gap-3">
                <div className="w-10 h-10 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"/>
                <p className="text-sm text-gray-500">Bildirimler yükleniyor...</p>
              </div>
            )}

            {/* Boş durum */}
            {!fetching && submissions.length === 0 && (
              <div className="bg-white rounded-2xl p-8 shadow-sm text-center space-y-3">
                <div className="text-5xl">🎉</div>
                <p className="font-semibold text-gray-800">Harika!</p>
                <p className="text-sm text-gray-500">
                  Doğrulanmayı bekleyen fiyat yok.<br/>
                  Siz de fiyat bildirerek katkıda bulunun!
                </p>
                <Link
                  href="/tara"
                  className="inline-block bg-green-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-green-600 transition-colors"
                >
                  📷 Fiyat Bildir
                </Link>
              </div>
            )}

            {/* Bildirim kartları */}
            {!fetching && submissions.map(sub => {
              const mkStyle = MARKET_COLORS[sub.market] || MARKET_COLORS['Migros']
              const myVote = voted[sub.id]
              const verifyCount = sub.verifiedBy?.length ?? 0
              const rejectCount = sub.rejectedBy?.length ?? 0
              const isVoting = voting === sub.id

              return (
                <div
                  key={sub.id}
                  className={`bg-white rounded-2xl shadow-sm overflow-hidden transition-all ${
                    myVote ? 'opacity-60 scale-[0.98]' : ''
                  }`}
                >
                  {/* Market badge */}
                  <div className={`px-4 py-2 flex items-center gap-2 ${mkStyle.bg}`}>
                    <span className={`w-2 h-2 rounded-full ${mkStyle.dot}`}/>
                    <span className={`text-xs font-bold ${mkStyle.text}`}>{sub.market}</span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {sub.createdAt?.toDate?.()
                        ? new Date(sub.createdAt.toDate()).toLocaleDateString('tr-TR')
                        : 'Az önce'}
                    </span>
                  </div>

                  <div className="px-4 py-4">
                    {/* Ürün */}
                    <p className="font-semibold text-gray-900 text-sm leading-snug mb-0.5">
                      {sub.productName}
                    </p>
                    <p className="text-xs text-gray-400 font-mono mb-3">{sub.barcode}</p>

                    {/* Fiyat */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-3xl font-black text-gray-900">
                          ₺{sub.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-gray-400">
                          {sub.submittedByName || 'Misafir kullanıcı'} tarafından bildirildi
                        </p>
                      </div>

                      {/* Mevcut oy durumu */}
                      <div className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-xs text-green-600 font-medium">✓ {verifyCount}</span>
                          <span className="text-gray-300">|</span>
                          <span className="text-xs text-red-500 font-medium">✗ {rejectCount}</span>
                        </div>
                        <p className="text-xs text-gray-400">{VERIFY_THRESHOLD - verifyCount > 0 ? `${VERIFY_THRESHOLD - verifyCount} onay daha` : 'Yeterli onay'}</p>
                      </div>
                    </div>

                    {/* Aksiyon butonları */}
                    {myVote ? (
                      <div className={`text-center text-sm font-semibold py-2 rounded-xl ${
                        myVote === 'verify'
                          ? 'bg-green-50 text-green-600'
                          : 'bg-red-50 text-red-500'
                      }`}>
                        {myVote === 'verify' ? '✓ Doğru işaretledin' : '✗ Yanlış işaretledin'}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVote(sub, 'verify')}
                          disabled={!!isVoting}
                          className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-200 text-white font-bold py-3 rounded-xl transition-colors active:scale-95"
                        >
                          {isVoting ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                          ) : (
                            <>✓ Doğru<span className="text-green-200 text-xs">+{POINTS.VERIFY}⭐</span></>
                          )}
                        </button>
                        <button
                          onClick={() => handleVote(sub, 'reject')}
                          disabled={!!isVoting}
                          className="flex-1 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 disabled:bg-gray-100 text-red-600 font-bold py-3 rounded-xl border border-red-200 transition-colors active:scale-95"
                        >
                          ✗ Yanlış
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Daha fazla yükle */}
            {!fetching && submissions.length >= 20 && (
              <button
                onClick={fetchSubmissions}
                className="w-full py-3 text-sm text-purple-600 font-semibold bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
              >
                Daha fazla yükle
              </button>
            )}
          </>
        )}

      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-xs w-full px-4">
          <div className={`text-white text-sm font-medium px-5 py-3 rounded-full shadow-lg text-center ${
            toast.type === 'ok' ? 'bg-gray-900' : 'bg-red-600'
          }`}>
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  )
}
