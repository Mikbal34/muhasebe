'use client'

import { useState, useRef } from 'react'
import { X, Upload, FileText, Loader2, FilePlus } from 'lucide-react'
import { MoneyInput } from '@/components/ui/money-input'
import { supabase } from '@/lib/supabase/client'

interface SupplementaryContractModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  projectId: string
  currentEndDate: string | null
  currentBudget: number
  amendmentCount: number
}

export function SupplementaryContractModal({
  isOpen,
  onClose,
  onSuccess,
  projectId,
  currentEndDate,
  currentBudget,
  amendmentCount,
}: SupplementaryContractModalProps) {
  const [newEndDate, setNewEndDate] = useState('')
  const [budgetIncrease, setBudgetIncrease] = useState('')
  const [description, setDescription] = useState('')
  const [contractFile, setContractFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const nextAmendmentNumber = amendmentCount + 1
  const budgetIncreaseNum = parseFloat(budgetIncrease) || 0
  const newBudget = currentBudget + budgetIncreaseNum

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Sadece PDF dosyası yüklenebilir')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Dosya boyutu 10MB\'dan küçük olmalı')
        return
      }
      setContractFile(file)
      setError('')
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Sadece PDF dosyası yüklenebilir')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Dosya boyutu 10MB\'dan küçük olmalı')
        return
      }
      setContractFile(file)
      setError('')
    }
  }

  const uploadFile = async (): Promise<string | null> => {
    if (!contractFile) return null

    const fileName = `supplementary/${projectId}/${Date.now()}-${contractFile.name}`

    const { error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(fileName, contractFile)

    if (uploadError) {
      throw new Error('Dosya yüklenemedi: ' + uploadError.message)
    }

    return fileName
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate at least one change
    if (!newEndDate && budgetIncreaseNum <= 0) {
      setError('En az bir değişiklik (tarih veya bütçe) yapılmalıdır')
      return
    }

    // Validate new end date
    if (newEndDate && currentEndDate) {
      if (new Date(newEndDate) <= new Date(currentEndDate)) {
        setError('Yeni bitiş tarihi mevcut bitiş tarihinden sonra olmalıdır')
        return
      }
    }

    setSubmitting(true)

    try {
      // Upload file if exists
      let contractPath = null
      if (contractFile) {
        setUploading(true)
        contractPath = await uploadFile()
        setUploading(false)
      }

      // Create supplementary contract
      const response = await fetch(`/api/projects/${projectId}/supplementary-contracts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_end_date: newEndDate || null,
          budget_increase: budgetIncreaseNum,
          description: description || null,
          contract_document_path: contractPath,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Ek sözleşme oluşturulamadı')
      }

      // Reset form and close
      setNewEndDate('')
      setBudgetIncrease('')
      setDescription('')
      setContractFile(null)
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
      setUploading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('tr-TR')
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <FilePlus className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-slate-900">
                {nextAmendmentNumber}. Ek Sözleşme Ekle
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Current Values */}
            <div className="bg-slate-50 rounded-lg p-3 space-y-2">
              <h3 className="text-sm font-medium text-slate-700">Mevcut Değerler</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Bitiş Tarihi:</span>
                  <span className="ml-2 font-medium">{formatDate(currentEndDate)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Bütçe:</span>
                  <span className="ml-2 font-medium">₺{formatCurrency(currentBudget)}</span>
                </div>
              </div>
            </div>

            {/* New End Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Yeni Bitiş Tarihi
                <span className="text-slate-400 font-normal ml-1">(opsiyonel)</span>
              </label>
              <input
                type="date"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                min={currentEndDate || undefined}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            {/* Budget Increase */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Bütçe Artışı
                <span className="text-slate-400 font-normal ml-1">(opsiyonel)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₺</span>
                <MoneyInput
                  value={budgetIncrease}
                  onChange={setBudgetIncrease}
                  placeholder="0,00"
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              {budgetIncreaseNum > 0 && (
                <p className="mt-1 text-sm text-purple-600">
                  Yeni Bütçe: ₺{formatCurrency(newBudget)}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Açıklama
                <span className="text-slate-400 font-normal ml-1">(opsiyonel)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Ek sözleşme hakkında notlar..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Sözleşme Belgesi (PDF)
                <span className="text-slate-400 font-normal ml-1">(opsiyonel)</span>
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                  contractFile
                    ? 'border-purple-300 bg-purple-50'
                    : 'border-slate-300 hover:border-purple-400 hover:bg-purple-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {contractFile ? (
                  <div className="flex items-center justify-center gap-2 text-purple-700">
                    <FileText className="h-5 w-5" />
                    <span className="font-medium">{contractFile.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setContractFile(null)
                      }}
                      className="ml-2 text-slate-500 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="text-slate-500">
                    <Upload className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">PDF dosyasını sürükleyin veya tıklayarak seçin</p>
                  </div>
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={submitting || (!newEndDate && budgetIncreaseNum <= 0)}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {uploading ? 'Yükleniyor...' : 'Kaydediliyor...'}
                  </>
                ) : (
                  'Kaydet'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
