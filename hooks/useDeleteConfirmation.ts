import { useState, useCallback } from 'react'

// Simple authenticated delete helper
async function authenticatedDelete(url: string): Promise<boolean> {
  const token = localStorage.getItem('token')
  if (!token) return false

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    const data = await response.json()
    return data.success === true
  } catch {
    return false
  }
}

export interface DeleteItem {
  id: string
  name: string
  description?: string
  warningItems?: string[]
}

export interface UseDeleteConfirmationOptions {
  entityName: string
  apiEndpoint: string
  onSuccess?: () => void
  onError?: (error: string) => void
}

export function useDeleteConfirmation({
  entityName,
  apiEndpoint,
  onSuccess,
  onError
}: UseDeleteConfirmationOptions) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<DeleteItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const showDeleteModal = useCallback((item: DeleteItem) => {
    setItemToDelete(item)
    setIsModalOpen(true)
  }, [])

  const hideDeleteModal = useCallback(() => {
    if (!isDeleting) {
      setIsModalOpen(false)
      setItemToDelete(null)
    }
  }, [isDeleting])

  const confirmDelete = useCallback(async () => {
    if (!itemToDelete) return

    setIsDeleting(true)

    try {
      const result = await authenticatedDelete(`${apiEndpoint}/${itemToDelete.id}`)

      if (result) {
        setIsModalOpen(false)
        setItemToDelete(null)
        onSuccess?.()
      } else {
        onError?.(`${entityName} silinemedi. Lütfen tekrar deneyin.`)
      }
    } catch (error: any) {
      onError?.(`${entityName} silinirken hata oluştu: ${error.message || 'Bilinmeyen hata'}`)
    } finally {
      setIsDeleting(false)
    }
  }, [itemToDelete, apiEndpoint, entityName, onSuccess, onError])

  return {
    isModalOpen,
    itemToDelete,
    isDeleting,
    showDeleteModal,
    hideDeleteModal,
    confirmDelete
  }
}

// Specialized hook for bulk delete operations
export interface BulkDeleteItem {
  id: string
  name: string
}

export interface UseBulkDeleteOptions {
  entityName: string
  apiEndpoint: string
  onSuccess?: (deletedCount: number) => void
  onError?: (error: string, failedCount: number) => void
}

export function useBulkDelete({
  entityName,
  apiEndpoint,
  onSuccess,
  onError
}: UseBulkDeleteOptions) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [itemsToDelete, setItemsToDelete] = useState<BulkDeleteItem[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 })

  const showBulkDeleteModal = useCallback((items: BulkDeleteItem[]) => {
    setItemsToDelete(items)
    setIsModalOpen(true)
  }, [])

  const hideBulkDeleteModal = useCallback(() => {
    if (!isDeleting) {
      setIsModalOpen(false)
      setItemsToDelete([])
      setDeleteProgress({ current: 0, total: 0 })
    }
  }, [isDeleting])

  const confirmBulkDelete = useCallback(async () => {
    if (itemsToDelete.length === 0) return

    setIsDeleting(true)
    setDeleteProgress({ current: 0, total: itemsToDelete.length })

    let deletedCount = 0
    let failedCount = 0

    for (let i = 0; i < itemsToDelete.length; i++) {
      const item = itemsToDelete[i]
      setDeleteProgress({ current: i + 1, total: itemsToDelete.length })

      try {
        const result = await authenticatedDelete(`${apiEndpoint}/${item.id}`)
        if (result) {
          deletedCount++
        } else {
          failedCount++
        }
      } catch {
        failedCount++
      }

      // Add a small delay to prevent overwhelming the server
      if (i < itemsToDelete.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    setIsModalOpen(false)
    setItemsToDelete([])
    setDeleteProgress({ current: 0, total: 0 })
    setIsDeleting(false)

    if (failedCount === 0) {
      onSuccess?.(deletedCount)
    } else {
      onError?.(`${failedCount} ${entityName} silinemedi.`, failedCount)
    }
  }, [itemsToDelete, apiEndpoint, entityName, onSuccess, onError])

  return {
    isModalOpen,
    itemsToDelete,
    isDeleting,
    deleteProgress,
    showBulkDeleteModal,
    hideBulkDeleteModal,
    confirmBulkDelete
  }
}

// Hook for status change confirmations
export interface StatusChangeOptions {
  onConfirm: (newStatus: string) => Promise<void>
  onError?: (error: string) => void
}

export function useStatusChangeConfirmation({ onConfirm, onError }: StatusChangeOptions) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isChanging, setIsChanging] = useState(false)
  const [statusChange, setStatusChange] = useState<{
    currentStatus: string
    newStatus: string
    title: string
    description?: string
  } | null>(null)

  const showStatusChangeModal = useCallback((
    currentStatus: string,
    newStatus: string,
    title: string,
    description?: string
  ) => {
    setStatusChange({ currentStatus, newStatus, title, description })
    setIsModalOpen(true)
  }, [])

  const hideStatusChangeModal = useCallback(() => {
    if (!isChanging) {
      setIsModalOpen(false)
      setStatusChange(null)
    }
  }, [isChanging])

  const confirmStatusChange = useCallback(async () => {
    if (!statusChange) return

    setIsChanging(true)

    try {
      await onConfirm(statusChange.newStatus)
      setIsModalOpen(false)
      setStatusChange(null)
    } catch (error: any) {
      onError?.(`Durum değiştirilemedi: ${error.message || 'Bilinmeyen hata'}`)
    } finally {
      setIsChanging(false)
    }
  }, [statusChange, onConfirm, onError])

  return {
    isModalOpen,
    statusChange,
    isChanging,
    showStatusChangeModal,
    hideStatusChangeModal,
    confirmStatusChange
  }
}

// Hook for generic confirmation dialogs
export interface GenericConfirmationOptions {
  onConfirm: () => Promise<void> | void
  onError?: (error: string) => void
}

export function useGenericConfirmation({ onConfirm, onError }: GenericConfirmationOptions) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [confirmationData, setConfirmationData] = useState<{
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    type?: 'danger' | 'warning' | 'info' | 'success'
  } | null>(null)

  const showConfirmationModal = useCallback((data: {
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    type?: 'danger' | 'warning' | 'info' | 'success'
  }) => {
    setConfirmationData(data)
    setIsModalOpen(true)
  }, [])

  const hideConfirmationModal = useCallback(() => {
    if (!isProcessing) {
      setIsModalOpen(false)
      setConfirmationData(null)
    }
  }, [isProcessing])

  const confirmAction = useCallback(async () => {
    setIsProcessing(true)

    try {
      await onConfirm()
      setIsModalOpen(false)
      setConfirmationData(null)
    } catch (error: any) {
      onError?.(`İşlem tamamlanamadı: ${error.message || 'Bilinmeyen hata'}`)
    } finally {
      setIsProcessing(false)
    }
  }, [onConfirm, onError])

  return {
    isModalOpen,
    confirmationData,
    isProcessing,
    showConfirmationModal,
    hideConfirmationModal,
    confirmAction
  }
}
