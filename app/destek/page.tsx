import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Destek – Ucuzcu',
  description: 'Ucuzcu uygulama desteği, iletişim ve sık sorulan sorular.',
}

const SUPPORT_EMAIL = 'eonurcankilic@gmail.com'

const FAQ = [
  {
    q: 'Fiyatlar nasıl güncelleniyor?',
    a: 'Market fiyatları düzenli olarak toplanır. Ayrıca kullanıcılar barkod tarayarak güncel fiyat bildirebilir; bildirimler doğrulandıktan sonra listede görünür.',
  },
  {
    q: 'Hesabımı nasıl silebilirim?',
    a: `Hesap silme talebi için ${SUPPORT_EMAIL} adresine, kayıtlı e-posta adresinizle yazın. Talebinizi mümkün olan en kısa sürede işleme alırız.`,
  },
  {
    q: 'Giriş yapamıyorum',
    a: 'Apple, Google veya e-posta ile giriş deneyin. Sorun sürerse kullandığınız giriş yöntemini ve hata mesajını destek e-postasına iletin.',
  },
  {
    q: 'Yanlış fiyat görüyorum',
    a: 'Uygulama içinden barkod tarayarak doğru fiyatı bildirebilirsiniz. Acil düzeltme için destek e-postasına ürün adı, market ve doğru fiyatı yazın.',
  },
]

export default function DestekPage() {
  return (
    <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/" className="text-primary font-semibold text-sm hover:underline">
          ← Ana sayfa
        </Link>

        <h1 className="text-2xl font-black text-gray-900 mt-6 mb-2">Destek</h1>
        <p className="text-sm text-gray-500 mb-8">
          Sorularınız, geri bildirimleriniz veya hesap talepleriniz için buradayız.
        </p>

        <div className="space-y-6">
          {/* Birincil iletişim — App Store 1.5 için net destek kanalı */}
          <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Bize ulaşın</h2>
            <p className="text-sm text-gray-600 mb-4">
              Destek taleplerinizi e-posta ile gönderebilirsiniz. Genellikle 1–2 iş günü içinde yanıtlıyoruz.
            </p>

            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Ucuzcu%20Destek`}
              className="flex items-center justify-center gap-2 w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3.5 rounded-xl transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              E-posta gönder
            </a>

            <p className="text-center text-sm text-gray-500 mt-3">
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary font-medium underline underline-offset-2">
                {SUPPORT_EMAIL}
              </a>
            </p>
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Sık sorulan sorular</h2>
            {FAQ.map((item) => (
              <div key={item.q}>
                <h3 className="text-sm font-semibold text-gray-900">{item.q}</h3>
                <p className="text-sm text-gray-600 mt-1">{item.a}</p>
              </div>
            ))}
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Geliştirici bilgisi</h2>
            <p className="text-sm text-gray-600">
              Ucuzcu, Onurcan Kılıç tarafından geliştirilmektedir.
              Gizlilik ve veri kullanımı için{' '}
              <Link href="/gizlilik" className="text-primary font-medium underline underline-offset-2">
                Gizlilik Politikası
              </Link>
              &apos;na bakabilirsiniz.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
