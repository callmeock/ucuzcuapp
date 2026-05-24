import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Ucuzcu – Market Fiyat Karşılaştırma',
  description:
    "Migros, A101, BİM, Şok'taki ürün fiyatlarını karşılaştır. En ucuz marketi bul, para tasarrufu yap.",
  keywords: ['market', 'fiyat', 'karşılaştırma', 'ucuz', 'migros', 'a101', 'bim', 'şok'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
