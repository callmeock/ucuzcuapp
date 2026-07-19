'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth, hasProvider, mapAuthError } from '@/lib/auth'
import { getGuestPoints, getPointHistory, getLevel, type PointEvent } from '@/lib/points'
import { POINTS } from '@/lib/types'
import {
  doc, getDoc, collection, query, where,
  orderBy, limit, getDocs,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface UserData {
  displayName: string
  photoURL: string
  email: string
  points: number
  submissionsCount: number
  verificationsCount: number
  createdAt: any
}

interface MySubmission {
  id: string
  productName: string
  market: string
  price: number
  status: 'pending' | 'verified' | 'rejected'
  createdAt: any
  verifiedBy: string[]
}

const STATUS_STYLE = {
  pending:  { label: 'Bekliyor',  bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  verified: { label: 'Onaylandı', bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-400' },
  rejected: { label: 'Reddedildi',bg: 'bg-red-50',    text: 'text-red-600',    dot: 'bg-red-400' },
}

const MARKET_COLOR: Record<string, string> = {
  Migros: 'text-orange-600',
  A101:   'text-red-600',
  'Şok':  'text-purple-600',
  'BİM':  'text-blue-600',
}

export default function ProfilPage() {
  const { user, loading, signOut, linkGoogle, linkEmailPassword, isAdmin } = useAuth()
  const router = useRouter()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [submissions, setSubmissions] = useState<MySubmission[]>([])
  const [fetching, setFetching] = useState(false)
  const [tab, setTab] = useState<'bildirimler' | 'puanlar'>('bildirimler')
  const [newPassword, setNewPassword] = useState('')
  const [linkBusy, setLinkBusy] = useState<'google' | 'password' | null>(null)
  const [linkMsg, setLinkMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Misafir puan bilgileri
  const guestPoints = !user ? getGuestPoints() : 0
  const guestHistory = !user ? getPointHistory() : []

  useEffect(() => {
    if (!loading && !user) return // misafir görünümü göster
    if (!user) return
    fetchUserData()
  }, [user, loading])

  const fetchUserData = async () => {
    if (!user) return
    setFetching(true)
    try {
      // Kullanıcı profili
      const snap = await getDoc(doc(db, 'users', user.uid))
      if (snap.exists()) {
        setUserData(snap.data() as UserData)
      }

      // Kullanıcının bildirimleri
      const q = query(
        collection(db, 'price_submissions'),
        where('submittedBy', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(20)
      )
      const subSnap = await getDocs(q)
      setSubmissions(subSnap.docs.map(d => ({ id: d.id, ...d.data() } as MySubmission)))
    } catch { /* ignore */ }
    setFetching(false)
  }

  const handleSignOut = async () => {
    await signOut()
    router.replace('/')
  }

  const points     = userData?.points ?? guestPoints
  const level      = getLevel(points)
  const levelPct   = level.next === Infinity ? 100 : Math.min(100, (points / level.next) * 100)
  const verifiedCount = submissions.filter(s => s.status === 'verified').length
  const pendingCount  = submissions.filter(s => s.status === 'pending').length

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
          <h1 className="font-bold text-gray-900 flex-1">Profilim</h1>
          {user && (
            <button
              onClick={handleSignOut}
              className="text-xs text-gray-400 hover:text-gray-600 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Çıkış
            </button>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* ── Kullanıcı kartı ── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-4 mb-5">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-16 h-16 rounded-full ring-2 ring-green-100"/>
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl">👤</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-lg truncate">
                {user?.displayName ?? 'Misafir'}
              </p>
              {user?.email && (
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-semibold text-green-600 bg-green-50 rounded-full px-2 py-0.5">
                  Seviye {level.level} · {level.title}
                </span>
              </div>
            </div>
          </div>

          {/* Puan + ilerleme çubuğu */}
          <div className="flex items-end justify-between mb-2">
            <div>
              <span className="text-4xl font-black text-yellow-500">{points.toLocaleString('tr-TR')}</span>
              <span className="text-sm text-gray-400 ml-1">puan</span>
            </div>
            {level.next !== Infinity && (
              <span className="text-xs text-gray-400">{level.next - points} puan sonra Seviye {level.level + 1}</span>
            )}
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full transition-all duration-700"
              style={{ width: `${levelPct}%` }}
            />
          </div>

          {/* İstatistikler */}
          {user && (
            <div className="grid grid-cols-3 gap-3 mt-5">
              {[
                { label: 'Bildirim',    value: userData?.submissionsCount ?? submissions.length, icon: '📝' },
                { label: 'Onaylanan',   value: verifiedCount,                                    icon: '✅' },
                { label: 'Doğrulama',  value: userData?.verificationsCount ?? 0,                icon: '🔍' },
              ].map((s) => (
                <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xl mb-1">{s.icon}</p>
                  <p className="text-xl font-black text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Giriş yöntemleri (bağlama) ── */}
        {user && (
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
            <h2 className="font-bold text-gray-900 text-sm">Giriş yöntemleri</h2>
            <p className="text-xs text-gray-500">
              Google ve e-posta/şifreyi aynı hesaba bağlarsan ikisiyle de giriş yapabilirsin.
            </p>

            <div className="flex flex-wrap gap-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                hasProvider(user, 'google.com') ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                Google {hasProvider(user, 'google.com') ? '✓' : '—'}
              </span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                hasProvider(user, 'password') ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                E-posta/şifre {hasProvider(user, 'password') ? '✓' : '—'}
              </span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                hasProvider(user, 'apple.com') ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                Apple {hasProvider(user, 'apple.com') ? '✓' : '—'}
              </span>
              {isAdmin && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-900 text-white">
                  Admin
                </span>
              )}
            </div>

            {!hasProvider(user, 'google.com') && (
              <button
                type="button"
                disabled={!!linkBusy}
                onClick={async () => {
                  setLinkBusy('google')
                  setLinkMsg(null)
                  try {
                    await linkGoogle()
                    setLinkMsg({ type: 'ok', text: 'Google hesabı bağlandı. Artık Google ile de giriş yapabilirsin.' })
                  } catch (err) {
                    setLinkMsg({ type: 'err', text: mapAuthError(err) })
                  } finally {
                    setLinkBusy(null)
                  }
                }}
                className="w-full flex items-center justify-center gap-2 border-2 border-gray-200 hover:border-gray-300 rounded-xl py-3 text-sm font-semibold text-gray-700 disabled:opacity-60"
              >
                {linkBusy === 'google' ? 'Bağlanıyor...' : 'Google hesabını bağla'}
              </button>
            )}

            {!hasProvider(user, 'password') && user.email && (
              <div className="space-y-2 pt-1">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Yeni şifre (min. 6 karakter)"
                  minLength={6}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                <button
                  type="button"
                  disabled={!!linkBusy || newPassword.length < 6}
                  onClick={async () => {
                    setLinkBusy('password')
                    setLinkMsg(null)
                    try {
                      await linkEmailPassword(newPassword)
                      setNewPassword('')
                      setLinkMsg({ type: 'ok', text: 'Şifre eklendi. Artık e-posta ile de giriş yapabilirsin.' })
                    } catch (err) {
                      setLinkMsg({ type: 'err', text: mapAuthError(err) })
                    } finally {
                      setLinkBusy(null)
                    }
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-xl py-3 text-sm font-semibold"
                >
                  {linkBusy === 'password' ? 'Kaydediliyor...' : 'E-posta şifresi ekle'}
                </button>
              </div>
            )}

            {linkMsg && (
              <p className={`text-xs text-center ${linkMsg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
                {linkMsg.text}
              </p>
            )}
          </div>
        )}

        {/* ── Misafir uyarısı ── */}
        {!user && guestPoints > 0 && (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-yellow-800">Puanların kaydedilmemiş!</p>
              <p className="text-xs text-yellow-600 mt-0.5">
                {guestPoints} puanın sadece bu cihazda duruyor. Tarayıcı temizlenirse kaybolur.
              </p>
              <Link
                href="/giris"
                className="inline-block mt-2 bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
              >
                Giriş Yap →
              </Link>
            </div>
          </div>
        )}

        {!user && guestPoints === 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm text-center space-y-3">
            <div className="text-4xl">🔐</div>
            <p className="font-semibold text-gray-800">Giriş yap, daha fazla kazan</p>
            <p className="text-xs text-gray-500">
              Fiyat doğrula, puanlarını kaydet, liderlik tablosunda yer al.
            </p>
            <Link
              href="/giris"
              className="inline-block bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm"
            >
              Üye Ol / Giriş Yap
            </Link>
          </div>
        )}

        {/* ── Sekmeler ── */}
        {(user || guestHistory.length > 0) && (
          <>
            <div className="flex bg-white rounded-xl p-1 shadow-sm">
              {(user ? ['bildirimler', 'puanlar'] : ['puanlar']).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t as any)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${
                    tab === t
                      ? 'bg-green-500 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t === 'bildirimler' ? `Bildirimlerim${pendingCount > 0 ? ` (${pendingCount})` : ''}` : 'Puan Geçmişi'}
                </button>
              ))}
            </div>

            {/* Bildirimler sekmesi */}
            {tab === 'bildirimler' && user && (
              <div className="space-y-3">
                {fetching && (
                  <div className="flex justify-center py-8">
                    <div className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin"/>
                  </div>
                )}

                {!fetching && submissions.length === 0 && (
                  <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
                    <p className="text-3xl mb-3">📭</p>
                    <p className="font-semibold text-gray-700">Henüz bildirim yok</p>
                    <p className="text-xs text-gray-400 mt-1 mb-4">Markette bir ürün gör, fiyatını bildir!</p>
                    <Link
                      href="/tara"
                      className="inline-block bg-green-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-green-600 transition-colors"
                    >
                      📷 Barkod Tara
                    </Link>
                  </div>
                )}

                {!fetching && submissions.map((sub) => {
                  const st = STATUS_STYLE[sub.status]
                  const mktColor = MARKET_COLOR[sub.market] ?? 'text-gray-600'
                  const verCount = sub.verifiedBy?.length ?? 0
                  return (
                    <div key={sub.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-4 py-3 flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{sub.productName}</p>
                          <p className={`text-xs font-medium ${mktColor}`}>{sub.market}</p>
                        </div>
                        <div className="text-right ml-3">
                          <p className="text-lg font-black text-gray-900">
                            ₺{sub.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </p>
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}/>
                            {st.label}
                          </span>
                        </div>
                      </div>
                      {sub.status === 'pending' && (
                        <div className="px-4 pb-3">
                          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                            <span>Onay durumu</span>
                            <span>{verCount}/{3}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-400 rounded-full"
                              style={{ width: `${(verCount / 3) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {sub.status === 'verified' && (
                        <div className="px-4 pb-3">
                          <p className="text-xs text-green-600 font-medium">
                            ✅ Onaylandı — +{POINTS.SUBMISSION_VERIFIED} puan kazandın!
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Puan geçmişi sekmesi */}
            {tab === 'puanlar' && (
              <div className="space-y-2">
                {/* Puan kazanma rehberi */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Nasıl puan kazanılır?</p>
                  {[
                    { icon: '📷', action: 'Fiyat bildir',         pts: `+${POINTS.SUBMIT}` },
                    { icon: '✅', action: 'Bildirin onaylanır',   pts: `+${POINTS.SUBMISSION_VERIFIED}` },
                    { icon: '🔍', action: 'Doğrulama yap (üye)', pts: `+${POINTS.VERIFY}` },
                  ].map(r => (
                    <div key={r.action} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <span>{r.icon}</span>
                        <span className="text-sm text-gray-700">{r.action}</span>
                      </div>
                      <span className="text-sm font-bold text-green-600">{r.pts}</span>
                    </div>
                  ))}
                </div>

                {/* Geçmiş listesi */}
                {(user ? [] : guestHistory).length === 0 && !user && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
                    <p className="text-sm text-gray-400">Henüz puan geçmişin yok.</p>
                  </div>
                )}

                {!user && guestHistory.map((e: PointEvent, i: number) => (
                  <div key={i} className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{e.reason}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(e.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className={`text-base font-black ${e.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {e.amount > 0 ? '+' : ''}{e.amount}⭐
                    </span>
                  </div>
                ))}

                {user && (
                  <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
                    <p className="text-sm text-gray-400">
                      Ayrıntılı puan geçmişi yakında geliyor.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Hızlı aksiyonlar ── */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/tara"
            className="bg-green-500 hover:bg-green-600 text-white rounded-2xl p-4 text-center shadow-sm transition-colors"
          >
            <p className="text-2xl mb-1">📷</p>
            <p className="text-sm font-bold">Fiyat Bildir</p>
            <p className="text-xs text-green-100">+{POINTS.SUBMIT} puan</p>
          </Link>
          <Link
            href="/dogrula"
            className={`rounded-2xl p-4 text-center shadow-sm transition-colors ${
              user
                ? 'bg-purple-500 hover:bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-400 pointer-events-none'
            }`}
          >
            <p className="text-2xl mb-1">🔍</p>
            <p className="text-sm font-bold">Doğrula</p>
            <p className={`text-xs ${user ? 'text-purple-100' : 'text-gray-400'}`}>
              {user ? `+${POINTS.VERIFY} puan` : 'Üye gerekli'}
            </p>
          </Link>
        </div>

      </div>
    </div>
  )
}
