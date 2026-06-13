import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth'
import NativeShell from '@/components/NativeShell'
import AppShell from '@/components/AppShell'
import Analytics from '@/components/Analytics'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#FFAC09',
}

export const metadata: Metadata = {
  title: 'Ucuzcu – Market Fiyat Karşılaştırma',
  description:
    "Migros, A101, BİM, Şok'taki ürün fiyatlarını karşılaştır. En ucuz marketi bul, para tasarrufu yap.",
  keywords: ['market', 'fiyat', 'karşılaştırma', 'ucuz', 'migros', 'a101', 'bim', 'şok'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Ucuzcu',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        <AuthProvider>
          <NativeShell>
            <AppShell>{children}</AppShell>
          </NativeShell>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
