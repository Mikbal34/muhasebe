'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { usePathname } from 'next/navigation'

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  autoHide?: boolean
  duration?: number
  timestamp: Date
  read: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  removeNotification: (id: string, hideFromUser?: boolean) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearAll: () => void
  refreshNotifications: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

interface NotificationProviderProps {
  children: React.ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const pathname = usePathname()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)

  // Don't fetch notifications on auth pages
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/'

  const addNotification = useCallback((notificationData: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const notification: Notification = {
      ...notificationData,
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false
    }

    setNotifications(prev => [notification, ...prev])

    // Temporarily disable autoHide to prevent re-render issues
    // if (notification.autoHide !== false) {
    //   const duration = notification.duration || 5000
    //   setTimeout(() => {
    //     removeNotification(notification.id)
    //   }, duration)
    // }
  }, [])

  const removeNotification = useCallback(async (id: string, hideFromUser = false) => {
    if (hideFromUser) {
      // Hide from current user (don't delete from DB)
      try {
        const token = localStorage.getItem('token')
        if (!token) return

        const response = await fetch('/api/notifications', {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ notification_ids: [id], hide_for_user: true })
        })

        if (response.ok) {
          // Remove from local state
          setNotifications(prev => prev.filter(n => n.id !== id))
        }
      } catch (err) {
        console.error('Failed to hide notification:', err)
      }
    }
    // Don't remove from local state when just closing toast
    // The notification should remain in dropdown
  }, [])

  const markAsRead = useCallback(async (id: string) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notification_ids: [id] })
      })

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, read: true } : n)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }, [])


  const markAllAsRead = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mark_all: true })
      })

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
      }
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err)
    }
  }, [])

  const clearAll = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/notifications?all=true', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        setNotifications([])
        setUnreadCount(0)
      }
    } catch (err) {
      console.error('Failed to clear all notifications:', err)
    }
  }, [])

  // Load notifications from database on mount
  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      // No token, don't attempt to fetch and don't log errors
      return
    }

    try {
      const response = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      // If unauthorized, silently return (user might be logged out)
      if (!response.ok) {
        if (response.status === 401) {
          // Token might be invalid, silently return
          return
        }
        console.error('Failed to fetch notifications:', response.statusText)
        return
      }

      const data = await response.json()

      if (data.success) {
        const dbNotifications = data.data.notifications.map((n: any) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          autoHide: n.auto_hide,
          duration: n.duration,
          timestamp: new Date(n.created_at),
          read: n.read,
          action: n.action_label && n.action_url ? {
            label: n.action_label,
            onClick: () => window.location.href = n.action_url
          } : undefined
        }))

        // Use functional updates to avoid race conditions
        setNotifications(dbNotifications)
        setUnreadCount(data.data.unreadCount)
        setIsLoaded(true)
      }
    } catch (err) {
      // Network errors or other issues - silently ignore
      // This prevents console spam on login page
    }
  }, []) // Empty dependency array is correct

  useEffect(() => {
    // Don't fetch notifications on auth pages
    if (isAuthPage) {
      return
    }

    // Clear localStorage notifications to avoid confusion
    localStorage.removeItem('notifications')

    // Only fetch if token exists
    const token = localStorage.getItem('token')
    if (token && !isLoaded) {
      fetchNotifications()
    }
  }, [isLoaded, isAuthPage])

  // Periodic refresh for new notifications (every 30 seconds)
  // Only run if user is authenticated and not on auth pages
  useEffect(() => {
    // Don't run on auth pages
    if (isAuthPage) {
      return
    }

    const token = localStorage.getItem('token')
    if (!token) return // Don't start interval if no token

    const interval = setInterval(() => {
      const currentToken = localStorage.getItem('token')
      if (currentToken) {
        fetchNotifications()
      }
    }, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [isAuthPage])

  // Listen for custom refresh events (triggered by API success)
  useEffect(() => {
    // Don't listen on auth pages
    if (isAuthPage) {
      return
    }

    const handleRefresh = () => {
      fetchNotifications()
    }

    window.addEventListener('refreshNotifications', handleRefresh)
    return () => window.removeEventListener('refreshNotifications', handleRefresh)
  }, [isAuthPage, fetchNotifications])

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      removeNotification,
      markAsRead,
      markAllAsRead,
      clearAll,
      refreshNotifications: fetchNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

// Helper hooks for specific notification types
export function usePaymentNotifications() {
  const { addNotification } = useNotifications()

  const notifyPaymentStatusChange = useCallback((
    paymentCode: string,
    oldStatus: string,
    newStatus: string,
    amount: number
  ) => {
    const getStatusText = (status: string) => {
      switch (status) {
        case 'pending': return 'Beklemede'
        case 'approved': return 'Onaylandı'
        case 'completed': return 'Tamamlandı'
        case 'rejected': return 'Reddedildi'
        default: return status
      }
    }

    const getNotificationType = (status: string): Notification['type'] => {
      switch (status) {
        case 'approved': return 'success'
        case 'completed': return 'success'
        case 'rejected': return 'error'
        default: return 'info'
      }
    }

    addNotification({
      type: getNotificationType(newStatus),
      title: 'Ödeme Durumu Güncellendi',
      message: `${paymentCode} kodlu ₺${amount.toLocaleString('tr-TR')} tutarındaki ödeme talimatı "${getStatusText(oldStatus)}" durumundan "${getStatusText(newStatus)}" durumuna güncellendi.`,
      autoHide: false
    })
  }, [addNotification])

  const notifyPaymentCreated = useCallback((paymentCode: string, amount: number) => {
    addNotification({
      type: 'info',
      title: 'Yeni Ödeme Talimatı',
      message: `${paymentCode} kodlu ₺${amount.toLocaleString('tr-TR')} tutarında yeni ödeme talimatı oluşturuldu.`,
      autoHide: true,
      duration: 8000
    })
  }, [addNotification])

  const notifyPaymentDeleted = useCallback((paymentCode: string) => {
    addNotification({
      type: 'warning',
      title: 'Ödeme Talimatı Silindi',
      message: `${paymentCode} kodlu ödeme talimatı silindi.`,
      autoHide: true,
      duration: 5000
    })
  }, [addNotification])

  return {
    notifyPaymentStatusChange,
    notifyPaymentCreated,
    notifyPaymentDeleted
  }
}

export function useProjectNotifications() {
  const { addNotification } = useNotifications()

  const notifyProjectCreated = useCallback((projectName: string, projectCode: string) => {
    addNotification({
      type: 'success',
      title: 'Yeni Proje Oluşturuldu',
      message: `${projectCode} - ${projectName} projesi başarıyla oluşturuldu.`,
      autoHide: true,
      duration: 5000
    })
  }, [addNotification])

  const notifyProjectUpdated = useCallback((projectName: string, projectCode: string) => {
    addNotification({
      type: 'info',
      title: 'Proje Güncellendi',
      message: `${projectCode} - ${projectName} projesi güncellendi.`,
      autoHide: true,
      duration: 5000
    })
  }, [addNotification])

  const notifyProjectDeleted = useCallback((projectName: string, projectCode: string) => {
    addNotification({
      type: 'warning',
      title: 'Proje Silindi',
      message: `${projectCode} - ${projectName} projesi silindi.`,
      autoHide: true,
      duration: 5000
    })
  }, [addNotification])

  return {
    notifyProjectCreated,
    notifyProjectUpdated,
    notifyProjectDeleted
  }
}

export function useIncomeNotifications() {
  const { addNotification } = useNotifications()

  const notifyIncomeCreated = useCallback((projectName: string, amount: number) => {
    addNotification({
      type: 'success',
      title: 'Yeni Gelir Kaydı',
      message: `${projectName} projesi için ₺${amount.toLocaleString('tr-TR')} tutarında gelir kaydı oluşturuldu.`,
      autoHide: true,
      duration: 5000
    })
  }, [addNotification])

  const notifyIncomeUpdated = useCallback((projectName: string, amount: number) => {
    addNotification({
      type: 'info',
      title: 'Gelir Kaydı Güncellendi',
      message: `${projectName} projesi için ₺${amount.toLocaleString('tr-TR')} tutarındaki gelir kaydı güncellendi.`,
      autoHide: true,
      duration: 5000
    })
  }, [addNotification])

  const notifyIncomeDeleted = useCallback((projectName: string) => {
    addNotification({
      type: 'warning',
      title: 'Gelir Kaydı Silindi',
      message: `${projectName} projesi için gelir kaydı silindi.`,
      autoHide: true,
      duration: 5000
    })
  }, [addNotification])

  return {
    notifyIncomeCreated,
    notifyIncomeUpdated,
    notifyIncomeDeleted
  }
}