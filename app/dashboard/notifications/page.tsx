'use client'

import React, { useState } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { useNotifications } from '@/contexts/notification-context'
import {
  Bell,
  Check,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Trash2,
  Filter,
  Calendar,
  Eye
} from 'lucide-react'
import { NotificationCardSkeleton, Skeleton } from '@/components/ui/skeleton'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager'
}

export default function NotificationsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest')

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll
  } = useNotifications()

  // Load user data from localStorage
  React.useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      try {
        setUser(JSON.parse(userData))
      } catch (err) {
        console.error('Failed to parse user data:', err)
      }
    }
  }, [])

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-emerald-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'info':
        return <Info className="h-5 w-5 text-teal-500" />
      default:
        return <Info className="h-5 w-5 text-slate-500" />
    }
  }

  const getBgColor = (type: string, read: boolean) => {
    if (read) {
      return 'bg-white'
    }

    switch (type) {
      case 'success':
        return 'bg-emerald-50'
      case 'error':
        return 'bg-red-50'
      case 'warning':
        return 'bg-yellow-50'
      case 'info':
        return 'bg-teal-50'
      default:
        return 'bg-slate-50'
    }
  }

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-l-emerald-500'
      case 'error':
        return 'border-l-red-500'
      case 'warning':
        return 'border-l-yellow-500'
      case 'info':
        return 'border-l-teal-500'
      default:
        return 'border-l-slate-500'
    }
  }

  const filteredNotifications = notifications
    .filter(notification => {
      if (filter === 'all') return true
      if (filter === 'unread') return !notification.read
      if (filter === 'read') return notification.read
      return notification.type === filter
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      }
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    })

  if (!user) {
    return (
      <DashboardLayout user={{ id: '', full_name: 'Yükleniyor...', email: '', role: 'manager' }}>
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-5 w-64" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>

          {/* Filters Skeleton */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div>
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="flex items-end">
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>

          {/* Notifications List Skeleton */}
          <NotificationCardSkeleton count={6} />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Bildirimler
              </h1>
              <p className="text-sm text-slate-600">
                {unreadCount > 0 ? `${unreadCount} okunmamış bildirim` : 'Tüm bildirimler okundu'}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {notifications.length > 0 && (
                <>
                  <button
                    onClick={markAllAsRead}
                    className="inline-flex items-center px-3 py-2 border border-slate-300 text-sm font-semibold rounded text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Tümünü Okundu İşaretle
                  </button>

                  <button
                    onClick={clearAll}
                    className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-semibold rounded text-red-700 bg-white hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Tümünü Temizle
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Filtre
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
              >
                <option value="all">Tüm Bildirimler</option>
                <option value="unread">Okunmamış</option>
                <option value="read">Okunmuş</option>
                <option value="success">Başarılı</option>
                <option value="info">Bilgi</option>
                <option value="warning">Uyarı</option>
                <option value="error">Hata</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Sıralama
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
              >
                <option value="newest">Yeniden Eskiye</option>
                <option value="oldest">Eskiden Yeniye</option>
              </select>
            </div>

            <div className="flex items-end">
              <div className="text-sm text-slate-500 flex items-center">
                <Filter className="h-4 w-4 mr-1" />
                {filteredNotifications.length} bildirim görüntüleniyor
              </div>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-slate-200">
              <Bell className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                {filter === 'all' ? 'Henüz bildirim yok' : 'Bu filtrede bildirim bulunamadı'}
              </h3>
              <p className="text-slate-600">
                {filter === 'all'
                  ? 'İlk bildirimleriniz burada görünecek'
                  : 'Farklı bir filtre seçmeyi deneyin'
                }
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`
                  border border-slate-200 rounded-lg p-6 border-l-4 transition-all duration-200 hover:shadow-md
                  ${getBgColor(notification.type, notification.read)}
                  ${getBorderColor(notification.type)}
                `}
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 mt-1">
                    {getIcon(notification.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className={`text-lg font-medium ${!notification.read ? 'text-slate-900' : 'text-slate-700'
                            }`}>
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-teal-600 rounded-full"></div>
                          )}
                        </div>

                        <p className="text-slate-600 mb-3">
                          {notification.message}
                        </p>

                        <div className="flex items-center text-sm text-slate-500 space-x-4">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {notification.timestamp.toLocaleString('tr-TR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>

                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${notification.type === 'success' ? 'bg-emerald-100 text-emerald-800' :
                              notification.type === 'error' ? 'bg-red-100 text-red-800' :
                                notification.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-teal-100 text-teal-800'
                            }`}>
                            {notification.type === 'success' ? 'Başarılı' :
                              notification.type === 'error' ? 'Hata' :
                                notification.type === 'warning' ? 'Uyarı' : 'Bilgi'}
                          </span>
                        </div>

                        {notification.action && (
                          <button
                            onClick={notification.action.onClick}
                            className="mt-3 text-sm text-teal-600 hover:text-teal-800 font-medium"
                          >
                            {notification.action.label}
                          </button>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors"
                            title="Okundu işaretle"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}

                        <button
                          onClick={() => removeNotification(notification.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
