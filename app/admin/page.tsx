'use client'

import { useState, useEffect, useRef } from 'react'
import { getProducts, addProduct, updateProduct, deleteProduct } from '@/lib/db'
import { Product, CATEGORIES, MARKET_COLORS, CATEGORY_CONFIG } from '@/lib/types'
import { uploadBrosur, getAllBrosurler, deleteBrosur, type Brosur } from '@/lib/brosurler'
import { useAuth } from '@/lib/auth'
import Link from 'next/link'

const ADMIN_EMAIL = 'eonurcankilic@gmail.com'

type MarketName = 'Migros' | 'A101' | 'BİM' | 'Şok'
const MARKETS: MarketName[] = ['Migros', 'A101', 'BİM', 'Şok']

const emptyForm = {
  name: '', brand: '', category: CATEGORIES[0], unit: '', barcode: '', image: '',
}
const emptyPrices: Record<MarketName, string> = { Migros: '', A101: '', 'BİM': '', 'Şok': '' }
const emptyAvail: Record<MarketName, boolean> = { Migros: true, A101: true, 'BİM': true, 'Şok': true }

export default function AdminPage() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth()

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-800 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="font-bold text-gray-900 text-xl mb-2">Yetkisiz Erişim</h1>
          <p className="text-gray-500 text-sm mb-6">
            Bu sayfaya erişmek için admin hesabıyla giriş yapman gerekiyor.
          </p>
          {!user ? (
            <button
              onClick={signInWithGoogle}
              className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors"
            >
              Google ile Giriş Yap
            </button>
          ) : (
            <p className="text-sm text-red-500 font-semibold">
              {user.email} bu panele erişemez.
            </p>
          )}
          <Link href="/" className="block mt-4 text-sm text-gray-400 hover:text-gray-600">
            ← Ana sayfaya dön
          </Link>
        </div>
      </div>
    )
  }

  return <AdminPanel />
}

function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'urunler' | 'brosurler'>('urunler')

  // ── Ürün state ──
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [marketPrices, setMarketPrices] = useState<Record<MarketName, string>>(emptyPrices)
  const [marketAvail, setMarketAvail] = useState<Record<MarketName, boolean>>(emptyAvail)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [search, setSearch] = useState('')

  // ── Broşür state ──
  const [brosurler, setBrosurler] = useState<Brosur[]>([])
  const [brosurLoading, setBrosurLoading] = useState(false)
  const [brosurForm, setBrosurForm] = useState({
    market: 'Migros', title: '', startDate: '', endDate: '',
  })
  const [brosurFile, setBrosurFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [brosurMsg, setBrosurMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    setProducts(await getProducts())
    setLoading(false)
  }
  const loadBrosurler = async () => {
    setBrosurLoading(true)
    setBrosurler(await getAllBrosurler())
    setBrosurLoading(false)
  }
  useEffect(() => { load(); loadBrosurler() }, [])

  const showBrosurMsg = (type: 'ok' | 'err', text: string) => {
    setBrosurMsg({ type, text })
    setTimeout(() => setBrosurMsg(null), 3500)
  }

  const handleBrosurUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!brosurFile) { showBrosurMsg('err', 'PDF dosyası seçin'); return }
    if (!brosurForm.title) { showBrosurMsg('err', 'Başlık girin'); return }
    if (!brosurForm.startDate || !brosurForm.endDate) { showBrosurMsg('err', 'Tarih aralığı girin'); return }
    setUploadProgress(0)
    try {
      await uploadBrosur(
        brosurFile, brosurForm.market, brosurForm.title,
        brosurForm.startDate, brosurForm.endDate,
        (pct) => setUploadProgress(pct)
      )
      showBrosurMsg('ok', 'Broşür yüklendi!')
      setBrosurForm({ market: 'Migros', title: '', startDate: '', endDate: '' })
      setBrosurFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      loadBrosurler()
    } catch (err: any) {
      showBrosurMsg('err', 'Yükleme başarısız: ' + err.message)
    }
    setUploadProgress(null)
  }

  const handleBrosurDelete = async (b: Brosur) => {
    if (!confirm(`"${b.title}" silinsin mi?`)) return
    await deleteBrosur(b)
    loadBrosurler()
  }

  const showMsg = (type: 'ok' | 'err', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3500)
  }

  // Ürünü forma yükle (düzenleme modu)
  const startEdit = (p: Product) => {
    setEditingId(p.id)
    setForm({
      name: p.name,
      brand: p.brand,
      category: p.category,
      unit: p.unit,
      barcode: p.barcode ?? '',
      image: p.image ?? '',
    })
    const prices = { ...emptyPrices }
    const avail = { ...emptyAvail }
    p.prices.forEach((pr) => {
      prices[pr.market as MarketName] = pr.currentPrice.toString()
      avail[pr.market as MarketName] = pr.available
    })
    setMarketPrices(prices)
    setMarketAvail(avail)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(emptyForm)
    setMarketPrices(emptyPrices)
    setMarketAvail(emptyAvail)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.brand || !form.unit) {
      showMsg('err', 'İsim, marka ve birim zorunlu')
      return
    }

    const today = new Date().toISOString().slice(0, 10)

    // Fiyat girilen marketleri topla
    const enteredMarkets = MARKETS.filter(
      (m) => marketPrices[m] !== '' && !isNaN(parseFloat(marketPrices[m]))
    )
    if (enteredMarkets.length === 0) {
      showMsg('err', 'En az bir market fiyatı giriniz')
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        // ── GÜNCELLEME MODU ──
        const existing = products.find((p) => p.id === editingId)!

        const prices = MARKETS
          .filter((m) => marketPrices[m] !== '' && !isNaN(parseFloat(marketPrices[m])))
          .map((m) => {
            const newPrice = parseFloat(marketPrices[m])
            const oldEntry = existing.prices.find((pr) => pr.market === m)
            // Fiyat değiştiyse geçmişe ekle
            const history = oldEntry
              ? oldEntry.currentPrice !== newPrice
                ? [...oldEntry.history, { date: today, price: newPrice }]
                : oldEntry.history
              : [{ date: today, price: newPrice }]
            return {
              market: m,
              currentPrice: newPrice,
              unit: oldEntry?.unit ?? '₺/adet',
              available: marketAvail[m],
              updatedAt: today,
              history,
            }
          })

        await updateProduct(editingId, {
          name: form.name,
          brand: form.brand,
          category: form.category,
          unit: form.unit,
          barcode: form.barcode || null,
          image: form.image || null,
          prices,
        })
        showMsg('ok', `"${form.name}" güncellendi!`)
        cancelEdit()
      } else {
        // ── YENİ ÜRÜN ──
        const prices = enteredMarkets.map((m) => ({
          market: m,
          currentPrice: parseFloat(marketPrices[m]),
          unit: '₺/adet',
          available: marketAvail[m],
          updatedAt: today,
          history: [{ date: today, price: parseFloat(marketPrices[m]) }],
        }))
        await addProduct({
          name: form.name, brand: form.brand, category: form.category,
          unit: form.unit, barcode: form.barcode || null, image: form.image || null, prices,
        })
        showMsg('ok', `"${form.name}" eklendi!`)
        setForm(emptyForm)
        setMarketPrices(emptyPrices)
        setMarketAvail(emptyAvail)
      }
      load()
    } catch (err) {
      console.error(err)
      showMsg('err', 'Kaydedilemedi. Firestore kurallarını kontrol edin.')
    }
    setSaving(false)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" kalıcı olarak silinsin mi?`)) return
    if (editingId === id) cancelEdit()
    await deleteProduct(id)
    showMsg('ok', `"${name}" silindi`)
    load()
  }

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.brand.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <div>
          <div className="font-bold text-lg">🏷️ Ucuzcu Admin</div>
          <div className="text-xs text-gray-400">Ürün & Fiyat Yönetimi</div>
        </div>
        <a href="/" className="text-sm text-gray-300 hover:text-white transition-colors">← Siteye dön</a>
      </header>

      {/* Sekme seçimi */}
      <div className="max-w-5xl mx-auto px-4 pt-5">
        <div className="flex bg-white rounded-xl p-1 shadow-sm w-fit gap-1">
          {[
            { key: 'urunler',   label: `📦 Ürünler (${products.length})` },
            { key: 'brosurler', label: `📄 Broşürler (${brosurler.length})` },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === t.key ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── BROŞÜRLER SEKMESİ ── */}
      {activeTab === 'brosurler' && (
        <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Yükleme formu */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-bold text-gray-900 text-lg mb-4">📄 Broşür Ekle</h2>

            {brosurMsg && (
              <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-semibold ${brosurMsg.type === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {brosurMsg.type === 'ok' ? '✅' : '❌'} {brosurMsg.text}
              </div>
            )}

            <form onSubmit={handleBrosurUpload} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Market</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400"
                  value={brosurForm.market}
                  onChange={e => setBrosurForm({ ...brosurForm, market: e.target.value })}
                >
                  {MARKETS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Başlık</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Migros Haftalık Fırsatlar 26 Mayıs"
                  value={brosurForm.title}
                  onChange={e => setBrosurForm({ ...brosurForm, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Başlangıç</label>
                  <input
                    type="date"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400"
                    value={brosurForm.startDate}
                    onChange={e => setBrosurForm({ ...brosurForm, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bitiş</label>
                  <input
                    type="date"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400"
                    value={brosurForm.endDate}
                    onChange={e => setBrosurForm({ ...brosurForm, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">PDF Dosyası</label>
                <div
                  className="mt-1 border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {brosurFile ? (
                    <div>
                      <p className="text-2xl mb-1">📄</p>
                      <p className="text-sm font-semibold text-gray-800">{brosurFile.name}</p>
                      <p className="text-xs text-gray-400">{(brosurFile.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-3xl mb-2">⬆️</p>
                      <p className="text-sm text-gray-500">PDF dosyasını buraya sürükle veya tıkla</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={e => setBrosurFile(e.target.files?.[0] ?? null)}
                  />
                </div>
              </div>

              {uploadProgress !== null && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Yükleniyor...</span><span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${uploadProgress}%` }}/>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={uploadProgress !== null}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl transition-colors"
              >
                {uploadProgress !== null ? `Yükleniyor ${uploadProgress}%...` : '📤 Broşürü Yükle'}
              </button>
            </form>
          </div>

          {/* Broşür listesi */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-bold text-gray-900 text-lg mb-4">Yüklü Broşürler</h2>
            {brosurLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-7 h-7 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"/>
              </div>
            ) : brosurler.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">
                <p className="text-3xl mb-2">📭</p>
                Henüz broşür yok
              </div>
            ) : (
              <div className="space-y-3">
                {brosurler.map(b => {
                  const today = new Date().toISOString().split('T')[0]
                  const isActive = b.startDate <= today && b.endDate >= today
                  return (
                    <div key={b.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="text-2xl">📄</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900 truncate">{b.title}</span>
                          {isActive && (
                            <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full shrink-0">● Aktif</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-bold" style={{ color: MARKET_COLORS[b.market] ?? '#374151' }}>{b.market}</span>
                          <span className="text-xs text-gray-400">{b.startDate} → {b.endDate}</span>
                        </div>
                        <a
                          href={b.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline mt-0.5 inline-block"
                        >
                          PDF'i aç →
                        </a>
                      </div>
                      <button
                        onClick={() => handleBrosurDelete(b)}
                        className="text-xs text-gray-400 hover:text-red-500 p-1 shrink-0 transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'urunler' && (
      <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* ── FORM ── */}
        <div className={`bg-white rounded-2xl shadow-sm p-6 border-2 transition-colors ${editingId ? 'border-blue-400' : 'border-transparent'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 text-lg">
              {editingId ? '✏️ Ürünü Düzenle' : '+ Yeni Ürün Ekle'}
            </h2>
            {editingId && (
              <button onClick={cancelEdit} className="text-sm text-gray-500 hover:text-red-500 font-semibold transition-colors">
                ✕ İptal
              </button>
            )}
          </div>

          {message && (
            <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-semibold ${message.type === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {message.type === 'ok' ? '✅' : '❌'} {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ürün adı *</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400"
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Süt 1L" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Marka *</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400"
                  value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Sek" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Birim *</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400"
                  value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="1L, 500g, 10 adet..." />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Barkod</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400"
                  value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="8690804007218" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Görsel URL</label>
              <div className="flex gap-2 mt-1">
                <input
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  placeholder="https://... (boş bırakırsan kategori emojisi)"
                />
                {form.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.image} alt="önizleme"
                    className="w-10 h-10 object-contain rounded-lg border border-gray-200 bg-gray-50 shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                ) : (
                  <div className="w-10 h-10 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-xl shrink-0">
                    {(CATEGORY_CONFIG[form.category] ?? { emoji: '🛍️' }).emoji}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kategori</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400"
                value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                Market Fiyatları (₺)
              </label>
              <div className="space-y-2">
                {MARKETS.map((m) => (
                  <div key={m} className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: MARKET_COLORS[m] }} />
                    <span className="text-sm font-semibold text-gray-700 w-14 shrink-0">{m}</span>
                    <input
                      type="number" step="0.01" min="0"
                      className="flex-1 text-sm outline-none"
                      placeholder="fiyat yok"
                      value={marketPrices[m]}
                      onChange={(e) => setMarketPrices({ ...marketPrices, [m]: e.target.value })}
                    />
                    <span className="text-xs text-gray-400 shrink-0">₺</span>
                    {/* Stok toggle */}
                    <button
                      type="button"
                      onClick={() => setMarketAvail({ ...marketAvail, [m]: !marketAvail[m] })}
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 transition-colors ${
                        marketAvail[m] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {marketAvail[m] ? 'Stokta' : 'Yok'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving}
                className={`flex-1 text-white rounded-xl py-2.5 font-bold text-sm transition-colors disabled:opacity-60 ${
                  editingId ? 'bg-blue-500 hover:bg-blue-600' : 'bg-primary hover:bg-primary-dark'
                }`}>
                {saving ? '⏳ Kaydediliyor...' : editingId ? '💾 Güncelle' : '+ Ürün Ekle'}
              </button>
              {editingId && (
                <button type="button" onClick={cancelEdit}
                  className="px-4 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:border-gray-300 transition-colors">
                  İptal
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ── ÜRÜN LİSTESİ ── */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 text-lg">
              Mevcut Ürünler
              <span className="ml-2 text-sm font-normal text-gray-400">({products.length})</span>
            </h2>
          </div>

          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-blue-400"
            placeholder="🔍 Ürün veya marka ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
              {filtered.map((p) => {
                const available = p.prices.filter((pr) => pr.available)
                const minPrice = available.length ? Math.min(...available.map((pr) => pr.currentPrice)) : null
                const catCfg = CATEGORY_CONFIG[p.category] ?? { emoji: '🛍️', bg: '#f3f4f6' }
                const isEditing = editingId === p.id

                return (
                  <div key={p.id}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-colors border-2 ${
                      isEditing ? 'border-blue-300 bg-blue-50' : 'border-transparent bg-gray-50 hover:bg-gray-100'
                    }`}>
                    {/* Ürün görseli */}
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0 overflow-hidden"
                      style={{ background: catCfg.bg }}>
                      {p.image
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={p.image} alt={p.name} className="w-full h-full object-contain p-0.5" />
                        : catCfg.emoji}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-900 truncate">{p.name}</div>
                      <div className="text-xs text-gray-500">{p.brand} · {p.unit}</div>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {p.prices.map((pr) => (
                          <span key={pr.market}
                            className={`text-xs px-1.5 py-0.5 rounded font-semibold ${pr.available ? 'text-white' : 'text-white opacity-50'}`}
                            style={{ background: MARKET_COLORS[pr.market] }}>
                            {pr.market}: {pr.available ? pr.currentPrice.toFixed(0) + '₺' : 'yok'}
                          </span>
                        ))}
                      </div>
                    </div>

                    {minPrice !== null && (
                      <div className="text-green-600 font-bold text-sm text-right shrink-0">
                        {minPrice.toFixed(0)}₺
                        <div className="text-xs text-gray-400 font-normal">en ucuz</div>
                      </div>
                    )}

                    <div className="flex flex-col gap-1 shrink-0">
                      <button onClick={() => startEdit(p)}
                        className={`text-xs px-2 py-1 rounded-lg font-semibold transition-colors ${
                          isEditing ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-blue-100 hover:text-blue-700'
                        }`}>
                        ✏️ Düzenle
                      </button>
                      <button onClick={() => handleDelete(p.id, p.name)}
                        className="text-xs px-2 py-1 rounded-lg font-semibold bg-gray-200 text-gray-700 hover:bg-red-100 hover:text-red-600 transition-colors">
                        🗑️ Sil
                      </button>
                    </div>
                  </div>
                )
              })}
              {filtered.length === 0 && (
                <div className="text-center py-10 text-gray-400 text-sm">
                  {search ? `"${search}" bulunamadı` : 'Henüz ürün yok'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  )
}
