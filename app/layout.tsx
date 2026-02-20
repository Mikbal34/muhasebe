import './globals.css'
import type { Metadata } from 'next'
import { Inter, Montserrat } from 'next/font/google'
import { NotificationProvider } from '@/contexts/notification-context'
import { NotificationToast } from '@/components/ui/notification'
import { QueryProvider } from '@/providers/query-provider'
import { AuthProvider } from '@/contexts/auth-context'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  weight: ['500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Akademik Proje Gelir Dağıtım Sistemi',
  description: 'Akademik projelerden gelen gelirleri kaydedin, KDV ve şirket komisyonunu otomatik hesaplayın, net tutarları proje temsilcilerine dağıtın.',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body className={`${inter.variable} ${montserrat.variable} font-sans`}>
        <QueryProvider>
          <AuthProvider>
            <NotificationProvider>
              {children}
              <NotificationToast />
            </NotificationProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}