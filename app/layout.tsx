import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { NotificationProvider } from '@/contexts/notification-context'
import { NotificationToast } from '@/components/ui/notification'
import { QueryProvider } from '@/providers/query-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Akademik Proje Gelir Dağıtım Sistemi',
  description: 'Akademik projelerden gelen gelirleri kaydedin, KDV ve şirket komisyonunu otomatik hesaplayın, net tutarları proje temsilcilerine dağıtın.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        <QueryProvider>
          <NotificationProvider>
            {children}
            <NotificationToast />
          </NotificationProvider>
        </QueryProvider>
      </body>
    </html>
  )
}