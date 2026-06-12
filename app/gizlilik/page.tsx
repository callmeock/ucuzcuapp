import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Gizlilik Politikası – Ucuzcu',
  description: 'Ucuzcu uygulaması gizlilik politikası ve veri kullanımı.',
}

export default function GizlilikPage() {
  return (
    <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/" className="text-primary font-semibold text-sm hover:underline">
          ← Ana sayfa
        </Link>

        <h1 className="text-2xl font-black text-gray-900 mt-6 mb-2">Gizlilik Politikası</h1>
        <p className="text-sm text-gray-500 mb-8">Son güncelleme: 10 Haziran 2026</p>

        <div className="prose prose-sm text-gray-700 space-y-6">
          <section>
            <h2 className="text-lg font-bold text-gray-900">1. Veri Sorumlusu</h2>
            <p>
              Ucuzcu uygulaması Onurcan Kılıç tarafından işletilmektedir.
              İletişim: <a href="mailto:eonurcankilic@gmail.com" className="text-primary">eonurcankilic@gmail.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">2. Toplanan Veriler</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Hesap bilgileri:</strong> Google ile giriş yaptığınızda ad, e-posta ve profil fotoğrafı</li>
              <li><strong>Konum:</strong> İzin verirseniz yaklaşık ilçe/şehir bilgisi (koordinatlar cihazda saklanır)</li>
              <li><strong>Kamera:</strong> Barkod tarama için yalnızca cihazınızda işlenir, görüntü sunucuya gönderilmez</li>
              <li><strong>Katkılar:</strong> Bildirdiğiniz fiyatlar ve doğrulama oyları</li>
              <li><strong>Kullanım:</strong> Uygulama performansı için anonim analitik veriler</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">3. Verilerin Kullanımı</h2>
            <p>
              Verileriniz yalnızca fiyat karşılaştırma hizmeti sunmak, katkılarınızı kaydetmek
              ve uygulamayı geliştirmek için kullanılır. Verileriniz üçüncü taraflara satılmaz.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">4. Saklama ve Güvenlik</h2>
            <p>
              Veriler Google Firebase altyapısında (Firestore, Authentication) güvenli şekilde saklanır.
              Konum bilgisi yalnızca cihazınızın yerel depolamasında tutulur (3 gün).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">5. Haklarınız</h2>
            <p>
              Hesabınızı silmek veya verilerinize erişmek için{' '}
              <a href="mailto:eonurcankilic@gmail.com" className="text-primary">eonurcankilic@gmail.com</a>{' '}
              adresine yazabilirsiniz.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">6. Çocukların Gizliliği</h2>
            <p>
              Ucuzcu 13 yaş altı çocuklara yönelik değildir ve bilerek bu yaş grubundan veri toplamaz.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
