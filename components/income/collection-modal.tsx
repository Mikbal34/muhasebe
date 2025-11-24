'use client'

import React, { useState, useEffect } from 'react'
import { X, Coins, Calendar as CalendarIcon } from 'lucide-react'
import { MoneyInput } from '@/components/ui/money-input'

interface CollectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  income: {
    id: string
    gross_amount: number
    collected_amount: number
    project: {
      code: string
      name: string
    }
  }
}

export function CollectionModal({ isOpen, onClose, onSuccess, income }: CollectionModalProps) {
  const [collectedAmount, setCollectedAmount] = useState('')
  const [collectionDate, setCollectionDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setCollectedAmount(income.collected_amount.toString())
      setCollectionDate('')
      setError(null)
    }
  }, [isOpen, income.collected_amount])

  const newCollectedAmount = parseFloat(collectedAmount) || 0
  const outstandingAmount = income.gross_amount - newCollectedAmount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newCollectedAmount < 0) {
      setError('Tahsil edilen tutar negatif olamaz')
      return
    }

    if (newCollectedAmount > income.gross_amount) {
      setError('Tahsil edilen tutar brut tutardan fazla olamaz')
      return
    }

    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Oturum bulunamadi')
        return
      }

      const payload: any = {
        collected_amount: newCollectedAmount,
      }

      if (collectionDate) {
        payload.collection_date = collectionDate
      }

      const response = await fetch(`/api/incomes/${income.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Tahsilat guncellenemedi')
        return
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Collection update error:', err)
      setError(err.message || 'Bir hata olustu')
    } finally {
      setLoading(false)
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
        onClick={handleOverlayClick}
      >
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />

        <div className="inline-block align-bottom bg-white rounded-lg p-4 text-left overflow-hidden shadow-md transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg bg-slate-100 text-slate-700">
                <Coins className="h-5 w-5" />
              </div>
              <div className="ml-3">
                <h3 className="text-base font-semibold text-gray-900">
                  Tahsilat Kaydı
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded-full p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">{income.project.name}</p>
              <p className="text-xs text-gray-500">{income.project.code}</p>
            </div>

            <div className="mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Brut Tutar:</span>
                <span className="font-semibold text-gray-900">
                  ₺{income.gross_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Mevcut Tahsilat:</span>
                <span className="font-semibold text-gray-900">
                  ₺{income.collected_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t">
                <span className="text-gray-600">Yeni Açık Bakiye:</span>
                <span className={`font-semibold ${outstandingAmount > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                  ₺{outstandingAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="collected_amount" className="block text-sm font-medium text-gray-700 mb-1">
                Tahsil Edilen Tutar
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">TL</span>
                </div>
                <MoneyInput
                  id="collected_amount"
                  value={collectedAmount}
                  onChange={setCollectedAmount}
                  className="pl-12 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                  disabled={loading}
                  required
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Maksimum: ₺{income.gross_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="mb-6">
              <label htmlFor="collection_date" className="block text-sm font-medium text-gray-700 mb-1">
                Tahsilat Tarihi (Opsiyonel)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CalendarIcon className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="date"
                  id="collection_date"
                  value={collectionDate}
                  onChange={(e) => setCollectionDate(e.target.value)}
                  className="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row-reverse gap-3">
              <button
                type="submit"
                disabled={loading || !collectedAmount}
                className="w-full inline-flex justify-center items-center rounded-md border border-transparent px-3 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                )}
                {loading ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="w-full inline-flex justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:w-auto disabled:opacity-50 transition-colors"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
