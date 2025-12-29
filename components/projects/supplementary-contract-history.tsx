'use client'

import { useState, useEffect } from 'react'
import { FileText, Download, Trash2, Calendar, Banknote, ArrowRight, Loader2, AlertTriangle } from 'lucide-react'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'

interface SupplementaryContract {
  id: string
  amendment_number: number
  amendment_date: string
  previous_end_date: string | null
  new_end_date: string | null
  previous_budget: number
  budget_increase: number
  new_budget: number
  description: string | null
  contract_document_path: string | null
  created_at: string
  created_by_user?: {
    full_name: string
    email: string
  }
}

interface SupplementaryContractHistoryProps {
  projectId: string
  onContractDeleted?: () => void
}

export function SupplementaryContractHistory({
  projectId,
  onContractDeleted,
}: SupplementaryContractHistoryProps) {
  const [contracts, setContracts] = useState<SupplementaryContract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; contract: SupplementaryContract | null }>({
    isOpen: false,
    contract: null,
  })
  const [deleting, setDeleting] = useState(false)

  const fetchContracts = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/supplementary-contracts`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Ek sözleşmeler yüklenemedi')
      }

      setContracts(result.data.contracts || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContracts()
  }, [projectId])

  const handleDelete = async () => {
    if (!deleteModal.contract) return

    setDeleting(true)
    try {
      const response = await fetch(
        `/api/projects/${projectId}/supplementary-contracts/${deleteModal.contract.id}`,
        { method: 'DELETE' }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Ek sözleşme silinemedi')
      }

      setDeleteModal({ isOpen: false, contract: null })
      fetchContracts()
      onContractDeleted?.()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('tr-TR')
  }

  const getDocumentUrl = (path: string) => {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/contracts/${path}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 text-sm p-4 rounded-lg flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        {error}
      </div>
    )
  }

  if (contracts.length === 0) {
    return null
  }

  const latestContractId = contracts[contracts.length - 1]?.id

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
        <FileText className="h-5 w-5 text-purple-600" />
        Ek Sözleşme Geçmişi
        <span className="text-sm font-normal text-slate-500">({contracts.length} adet)</span>
      </h3>

      <div className="space-y-3">
        {contracts.map((contract) => (
          <div
            key={contract.id}
            className="bg-white border border-slate-200 rounded-lg p-4 hover:border-purple-200 transition-colors"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold bg-purple-100 text-purple-800">
                  {contract.amendment_number}. Ek Sözleşme
                </span>
                <span className="text-sm text-slate-500">
                  {formatDate(contract.amendment_date)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {contract.contract_document_path && (
                  <a
                    href={getDocumentUrl(contract.contract_document_path)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 text-sm text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Belge
                  </a>
                )}
                {contract.id === latestContractId && (
                  <button
                    onClick={() => setDeleteModal({ isOpen: true, contract })}
                    className="inline-flex items-center gap-1 px-2 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Changes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date Change */}
              {contract.new_end_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-500">Tarih:</span>
                  <span className="text-slate-700">{formatDate(contract.previous_end_date)}</span>
                  <ArrowRight className="h-4 w-4 text-purple-500" />
                  <span className="font-medium text-purple-700">{formatDate(contract.new_end_date)}</span>
                </div>
              )}

              {/* Budget Change */}
              {contract.budget_increase > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Banknote className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-500">Bütçe:</span>
                  <span className="text-slate-700">₺{formatCurrency(contract.previous_budget)}</span>
                  <ArrowRight className="h-4 w-4 text-purple-500" />
                  <span className="font-medium text-purple-700">₺{formatCurrency(contract.new_budget)}</span>
                  <span className="text-green-600 text-xs">(+₺{formatCurrency(contract.budget_increase)})</span>
                </div>
              )}
            </div>

            {/* Description */}
            {contract.description && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-sm text-slate-600">{contract.description}</p>
              </div>
            )}

            {/* Created By */}
            {contract.created_by_user && (
              <div className="mt-2 text-xs text-slate-400">
                {contract.created_by_user.full_name} tarafından eklendi
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Delete Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, contract: null })}
        onConfirm={handleDelete}
        title="Ek Sözleşmeyi Sil"
        message={`${deleteModal.contract?.amendment_number}. Ek Sözleşmeyi silmek istediğinizden emin misiniz? Proje değerleri bir önceki duruma geri alınacaktır.`}
        confirmText={deleting ? 'Siliniyor...' : 'Sil'}
        cancelText="İptal"
        type="danger"
        loading={deleting}
      />
    </div>
  )
}
