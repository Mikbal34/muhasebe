'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 5 dakika stale time - veri bu süre boyunca "taze" kabul edilir
            staleTime: 5 * 60 * 1000,
            // 30 dakika cache time - cache'te bu süre tutulur
            gcTime: 30 * 60 * 1000,
            // Hata durumunda 1 kez retry
            retry: 1,
            // Window focus'ta yeniden fetch etme (performans için)
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
