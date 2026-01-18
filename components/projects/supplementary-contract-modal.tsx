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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Gradient Top Border */}
        <div className="h-1 w-full bg-gradient-to-r from-navy via-gold to-navy" />

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gold/10 rounded-lg flex items-center justify-center">
                <FilePlus className="h-5 w-5 text-gold" />
              </div>
              <div>
                <h2 className="text-base font-bold text-navy">
                  {nextAmendmentNumber}. Ek Sözleşme
                </h2>
                <p className="text-xs text-slate-500">Süre veya bütçe değişikliği</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Current Values Card */}
          <div className="bg-gradient-to-br from-navy/5 to-gold/5 rounded-lg p-3 border border-navy/10">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-2.5 border border-slate-100">
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Mevcut Bitiş</span>
                <p className="text-sm font-bold text-navy">{formatDate(currentEndDate)}</p>
              </div>
              <div className="bg-white rounded-lg p-2.5 border border-slate-100">
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Mevcut Bütçe</span>
                <p className="text-sm font-bold text-navy">₺{formatCurrency(currentBudget)}</p>
              </div>
            </div>
          </div>

          {/* New End Date & Budget in row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-navy/80 mb-1.5 block">
                Yeni Bitiş Tarihi
              </label>
              <input
                type="date"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                min={currentEndDate || undefined}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white transition-all outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-navy/80 mb-1.5 block">
                Bütçe Artışı
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₺</span>
                <MoneyInput
                  value={budgetIncrease}
                  onChange={setBudgetIncrease}
                  placeholder="0,00"
                  className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white transition-all outline-none text-sm"
                />
              </div>
            </div>
          </div>

          {budgetIncreaseNum > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-200">
              <span className="text-xs text-emerald-700">Yeni Bütçe:</span>
              <span className="text-xs font-bold text-emerald-700">₺{formatCurrency(newBudget)}</span>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-navy/80 mb-1.5 block">
              Açıklama <span className="text-slate-400 font-normal">(opsiyonel)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="Ek sözleşme hakkında notlar..."
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white transition-all outline-none resize-none text-sm"
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="text-xs font-semibold text-navy/80 mb-1.5 block">
              Sözleşme Belgesi <span className="text-slate-400 font-normal">(opsiyonel)</span>
            </label>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-all ${
                contractFile
                  ? 'border-gold bg-gold/5'
                  : 'border-slate-300 hover:border-gold hover:bg-gold/5'
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
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-4 w-4 text-red-600" />
                  <span className="font-medium text-navy text-sm truncate max-w-[180px]">{contractFile.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setContractFile(null)
                    }}
                    className="text-slate-400 hover:text-red-600 transition-all"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-slate-500">
                  <Upload className="h-4 w-4" />
                  <span className="text-sm">PDF yükle (maks. 10MB)</span>
                </div>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-200 font-medium">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-all disabled:opacity-50 text-sm"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={submitting || (!newEndDate && budgetIncreaseNum <= 0)}
              className="flex-1 px-4 py-2.5 bg-navy text-white font-semibold rounded-lg hover:bg-navy/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-navy/20 text-sm"
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
  )
}
