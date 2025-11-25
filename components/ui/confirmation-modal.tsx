import React from 'react'
import { AlertTriangle, X, Trash2, CheckCircle, Info } from 'lucide-react'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info' | 'success'
  loading?: boolean
  children?: React.ReactNode
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  loading = false,
  children
}: ConfirmationModalProps) {
  if (!isOpen) return null

  const getTypeConfig = () => {
    switch (type) {
      case 'danger':
        return {
          icon: Trash2,
          iconColor: 'text-red-600 bg-red-100',
          confirmButtonColor: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
        }
      case 'warning':
        return {
          icon: AlertTriangle,
          iconColor: 'text-yellow-600 bg-yellow-100',
          confirmButtonColor: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
        }
      case 'info':
        return {
          icon: Info,
          iconColor: 'text-teal-600 bg-teal-100',
          confirmButtonColor: 'bg-teal-600 hover:bg-teal-700 focus:ring-teal-500'
        }
      case 'success':
        return {
          icon: CheckCircle,
          iconColor: 'text-emerald-600 bg-emerald-100',
          confirmButtonColor: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500'
        }
      default:
        return {
          icon: AlertTriangle,
          iconColor: 'text-red-600 bg-red-100',
          confirmButtonColor: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
        }
    }
  }

  const config = getTypeConfig()
  const IconComponent = config.icon

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
        onClick={handleOverlayClick}
      >
        {/* Background overlay */}
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6 border border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center">
              <div className={`flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full ${config.iconColor}`}>
                <IconComponent className="h-6 w-6" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-slate-900">
                  {title}
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 rounded-full p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-6">
            <p className="text-sm text-slate-600 leading-relaxed">
              {message}
            </p>
            {children && (
              <div className="mt-4">
                {children}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row-reverse gap-3">
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`w-full inline-flex justify-center items-center rounded-md border border-transparent px-4 py-2 text-base font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed ${config.confirmButtonColor}`}
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
              )}
              {confirmText}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-full inline-flex justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-base font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Specialized delete confirmation modal
interface DeleteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  itemName: string
  description?: string
  loading?: boolean
  warningItems?: string[]
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  description,
  loading = false,
  warningItems = []
}: DeleteConfirmationModalProps) {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      message={`"${itemName}" öğesini silmek istediğinizden emin misiniz?`}
      confirmText={loading ? 'Siliniyor...' : 'Sil'}
      cancelText="İptal"
      type="danger"
      loading={loading}
    >
      {description && (
        <div className="mt-2">
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      )}

      {warningItems.length > 0 && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            <div className="ml-3">
              <h4 className="text-sm font-medium text-yellow-900">
                Dikkat: Bu işlem aşağıdaki öğeleri de etkileyecektir:
              </h4>
              <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                {warningItems.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
        <p className="text-sm text-red-700 font-medium">
          Bu işlem geri alınamaz!
        </p>
      </div>
    </ConfirmationModal>
  )
}

// Status change confirmation modal
interface StatusChangeModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  currentStatus: string
  newStatus: string
  loading?: boolean
  description?: string
}

export function StatusChangeModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  currentStatus,
  newStatus,
  loading = false,
  description
}: StatusChangeModalProps) {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      message={`Durumu "${currentStatus}" den "${newStatus}" ye değiştirmek istediğinizden emin misiniz?`}
      confirmText={loading ? 'Güncelleniyor...' : 'Değiştir'}
      cancelText="İptal"
      type="info"
      loading={loading}
    >
      {description && (
        <div className="mt-4 p-3 bg-teal-50 border border-teal-200 rounded-md">
          <p className="text-sm text-teal-700">{description}</p>
        </div>
      )}
    </ConfirmationModal>
  )
}

// Bulk action confirmation modal
interface BulkActionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  action: string
  selectedCount: number
  loading?: boolean
  type?: 'danger' | 'warning' | 'info' | 'success'
}

export function BulkActionModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  action,
  selectedCount,
  loading = false,
  type = 'warning'
}: BulkActionModalProps) {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      message={`Seçilen ${selectedCount} öğe için "${action}" işlemini gerçekleştirmek istediğinizden emin misiniz?`}
      confirmText={loading ? 'İşleniyor...' : 'Devam Et'}
      cancelText="İptal"
      type={type}
      loading={loading}
    >
      <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-md">
        <p className="text-sm text-slate-700">
          <strong>{selectedCount}</strong> öğe seçildi
        </p>
      </div>
    </ConfirmationModal>
  )
}
