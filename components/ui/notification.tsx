'use client'

import React, { useState } from 'react'
import {
  Bell,
  X,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Check,
  Trash2
} from 'lucide-react'
import { useNotifications, Notification } from '@/contexts/notification-context'

export function NotificationBell() {
  const { unreadCount, notifications } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && <NotificationDropdown onClose={() => setIsOpen(false)} />}
    </div>
  )
}

interface NotificationDropdownProps {
  onClose: () => void
}

function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const { notifications, markAllAsRead, clearAll } = useNotifications()

  // Mark all notifications as read when dropdown opens
  React.useEffect(() => {
    const unreadNotifications = notifications.filter(n => !n.read)
    if (unreadNotifications.length > 0) {
      markAllAsRead()
    }
  }, []) // Only run once when dropdown opens

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Dropdown */}
      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Bildirimler
            </h3>
            <div className="flex items-center space-x-2">
              {notifications.length > 0 && (
                <>
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-600 hover:text-blue-800"
                    title="Tümünü okundu işaretle"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={clearAll}
                    className="text-xs text-red-600 hover:text-red-800"
                    title="Tümünü temizle"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Notification List */}
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Henüz bildirim yok</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

interface NotificationItemProps {
  notification: Notification
}

function NotificationItem({ notification }: NotificationItemProps) {
  const { markAsRead, removeNotification } = useNotifications()

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />
      default:
        return <Info className="h-5 w-5 text-gray-500" />
    }
  }

  const getBgColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50'
      case 'error':
        return 'bg-red-50'
      case 'warning':
        return 'bg-yellow-50'
      case 'info':
        return 'bg-blue-50'
      default:
        return 'bg-gray-50'
    }
  }

  const handleClick = () => {
    if (!notification.read) {
      markAsRead(notification.id)
    }
    if (notification.action) {
      notification.action.onClick()
    }
  }

  return (
    <div
      className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
        !notification.read ? 'bg-blue-50' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon(notification.type)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                !notification.read ? 'text-gray-900' : 'text-gray-700'
              }`}>
                {notification.title}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {notification.message}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {notification.timestamp.toLocaleString('tr-TR')}
              </p>
            </div>

            <div className="flex items-center space-x-1 ml-2">
              {!notification.read && (
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeNotification(notification.id, true) // Hide for user when removed from dropdown
                }}
                className="text-gray-400 hover:text-gray-600"
                title="Bu bildirimimi gizle"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {notification.action && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                notification.action!.onClick()
              }}
              className="text-xs text-blue-600 hover:text-blue-800 mt-2"
            >
              {notification.action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function NotificationToast() {
  const { notifications } = useNotifications()
  const [shownNotifications, setShownNotifications] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('shownNotifications')
      return stored ? new Set(JSON.parse(stored)) : new Set()
    }
    return new Set()
  })

  const visibleNotifications = notifications
    .filter(n => {
      const shouldShow = n.autoHide === true && !shownNotifications.has(n.id)
      return shouldShow
    })
    .slice(0, 3)

  // Don't auto-mark as shown, let each toast handle it individually

  if (visibleNotifications.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {visibleNotifications.map((notification) => (
        <ToastNotification
          key={notification.id}
          notification={notification}
          onClose={(id: string) => {
            setShownNotifications(prev => {
              const newSet = new Set(prev)
              newSet.add(id)
              localStorage.setItem('shownNotifications', JSON.stringify(Array.from(newSet)))
              return newSet
            })
          }}
        />
      ))}
    </div>
  )
}

interface ToastNotificationProps {
  notification: Notification
  onClose: (id: string) => void
}

function ToastNotification({ notification, onClose }: ToastNotificationProps) {
  const [isVisible, setIsVisible] = useState(true)

  const handleClose = () => {
    // Mark as shown via parent component
    onClose(notification.id)

    // Hide the toast
    setIsVisible(false)
  }

  // Auto-hide after duration
  React.useEffect(() => {
    if (notification.autoHide !== false) {
      const duration = notification.duration || 5000
      const timer = setTimeout(() => {
        handleClose()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [notification.id, notification.duration, notification.autoHide])

  if (!isVisible) return null

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />
      default:
        return <Info className="h-5 w-5 text-gray-500" />
    }
  }

  const getBorderColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'border-l-green-500'
      case 'error':
        return 'border-l-red-500'
      case 'warning':
        return 'border-l-yellow-500'
      case 'info':
        return 'border-l-blue-500'
      default:
        return 'border-l-gray-500'
    }
  }

  return (
    <div className={`
      bg-white border-l-4 rounded-lg shadow-lg border border-gray-200 p-4 w-80
      ${getBorderColor(notification.type)}
      animate-in slide-in-from-right duration-300
    `}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {getIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">
            {notification.title}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {notification.message}
          </p>
        </div>
        <button
          onClick={handleClose}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}