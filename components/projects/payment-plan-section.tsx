'use client'

import { useState } from 'react'
import { MoneyInput } from '@/components/ui/money-input'
import { Calendar, Calculator, Trash2, Check } from 'lucide-react'

export interface Installment {
  id?: string
  installment_number: number
  gross_amount: number
  income_date: string
  description?: string | null
  collected_amount?: number
}

interface PaymentPlanSectionProps {
  budget: number
  startDate: string
  enabled: boolean
  installments: Installment[]
  onEnabledChange: (enabled: boolean) => void
  onInstallmentsChange: (installments: Installment[]) => void
  readOnly?: boolean
}

export function PaymentPlanSection({
  budget,
  startDate,
  enabled,
  installments,
  onEnabledChange,
  onInstallmentsChange,
  readOnly = false
}: PaymentPlanSectionProps) {
  const [installmentCount, setInstallmentCount] = useState(10)
  const [paymentDay, setPaymentDay] = useState(10)

  // Eşit taksitlere böl
  const generateEqualInstallments = () => {
    if (!budget || budget <= 0 || !startDate || installmentCount < 1) return

    const baseAmount = Math.floor((budget / installmentCount) * 100) / 100
    const remainder = Math.round((budget - baseAmount * installmentCount) * 100) / 100

    const newInstallments: Installment[] = []
    const start = new Date(startDate)

    for (let i = 0; i < installmentCount; i++) {
      const date = new Date(start)
      date.setMonth(date.getMonth() + i)

      // Ayın son gününü kontrol et
      const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
      date.setDate(Math.min(paymentDay, lastDayOfMonth))

      // Son taksitte kalan tutarı ekle
      const amount = i === installmentCount - 1
        ? Math.round((baseAmount + remainder) * 100) / 100
        : baseAmount

      newInstallments.push({
        installment_number: i + 1,
        gross_amount: amount,
        income_date: date.toISOString().split('T')[0],
        description: `Taksit ${i + 1}/${installmentCount}`
      })
    }

    onInstallmentsChange(newInstallments)
  }

  // Tek taksit güncelle
  const updateInstallment = (index: number, field: keyof Installment, value: string | number) => {
    const updated = [...installments]
    updated[index] = { ...updated[index], [field]: value }
    onInstallmentsChange(updated)
  }

  // Taksit sil
  const removeInstallment = (index: number) => {
    const updated = installments.filter((_, i) => i !== index)
    // Sıra numaralarını yeniden düzenle
    const renumbered = updated.map((inst, i) => ({
      ...inst,
      installment_number: i + 1
    }))
    onInstallmentsChange(renumbered)
  }

  // Yeni taksit ekle
  const addInstallment = () => {
    const lastInstallment = installments[installments.length - 1]
    let newDate = startDate

    if (lastInstallment) {
      const lastDate = new Date(lastInstallment.income_date)
      lastDate.setMonth(lastDate.getMonth() + 1)
      newDate = lastDate.toISOString().split('T')[0]
    }

    const newInstallment: Installment = {
      installment_number: installments.length + 1,
      gross_amount: 0,
      income_date: newDate,
      description: `Taksit ${installments.length + 1}`
    }

    onInstallmentsChange([...installments, newInstallment])
  }

  // Toplam hesapla
  const total = installments.reduce((sum, inst) => sum + (inst.gross_amount || 0), 0)
  const difference = budget - total
  const isBalanced = Math.abs(difference) < 0.01

  // Tahsil edilmiş toplam
  const collectedTotal = installments.reduce((sum, inst) => sum + (inst.collected_amount || 0), 0)

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-teal-600" />
          Ödeme Planı
        </h2>
        {!readOnly && (
          <button
            type="button"
            onClick={() => onEnabledChange(!enabled)}
            className="flex items-center cursor-pointer focus:outline-none"
          >
            <div className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-teal-600' : 'bg-gray-200'}`}>
              <div className={`absolute top-[2px] start-[2px] bg-white border-gray-300 border rounded-full h-5 w-5 transition-transform ${enabled ? 'translate-x-full border-white' : ''}`}></div>
            </div>
            <span className="ms-3 text-sm font-medium text-gray-700">
              {enabled ? 'Aktif' : 'Pasif'}
            </span>
          </button>
        )}
      </div>

      {enabled && (
        <>
          {/* Otomatik bölme ayarları */}
          {!readOnly && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Taksit Sayısı
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={installmentCount}
                  onChange={(e) => setInstallmentCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ödeme Günü
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={paymentDay}
                  onChange={(e) => setPaymentDay(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Her ayın {paymentDay}. günü</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  &nbsp;
                </label>
                <button
                  type="button"
                  onClick={generateEqualInstallments}
                  disabled={!budget || budget <= 0 || !startDate}
                  className="w-full px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                >
                  <Calculator className="h-4 w-4" />
                  Eşit Taksitlere Böl
                </button>
              </div>
            </div>
          )}

          {/* Taksit listesi */}
          {installments.length > 0 && (
            <div className="space-y-2">
              {/* Başlık */}
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-2 py-1 border-b">
                <div className="col-span-1">#</div>
                <div className="col-span-3">Tutar (₺)</div>
                <div className="col-span-3">Tarih</div>
                <div className="col-span-3">Açıklama</div>
                <div className="col-span-2 text-center">Durum</div>
              </div>

              {/* Taksitler */}
              <div className="max-h-[400px] overflow-y-auto space-y-1">
                {installments.map((inst, index) => {
                  const isCollected = (inst.collected_amount || 0) > 0
                  const isEditable = !readOnly && !isCollected

                  return (
                    <div
                      key={index}
                      className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg transition-colors ${
                        isCollected
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="col-span-1 text-sm font-medium text-gray-600">
                        {inst.installment_number}
                      </div>
                      <div className="col-span-3">
                        <MoneyInput
                          value={inst.gross_amount.toString()}
                          onChange={(val) => updateInstallment(index, 'gross_amount', parseFloat(val) || 0)}
                          disabled={!isEditable}
                          className={`w-full px-2 py-1.5 border rounded-md text-sm ${
                            isEditable
                              ? 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500'
                              : 'border-transparent bg-transparent'
                          }`}
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="date"
                          value={inst.income_date}
                          onChange={(e) => updateInstallment(index, 'income_date', e.target.value)}
                          disabled={!isEditable}
                          className={`w-full px-2 py-1.5 border rounded-md text-sm ${
                            isEditable
                              ? 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500'
                              : 'border-transparent bg-transparent'
                          }`}
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={inst.description || ''}
                          onChange={(e) => updateInstallment(index, 'description', e.target.value)}
                          disabled={!isEditable}
                          placeholder="Açıklama..."
                          className={`w-full px-2 py-1.5 border rounded-md text-sm ${
                            isEditable
                              ? 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500'
                              : 'border-transparent bg-transparent'
                          }`}
                        />
                      </div>
                      <div className="col-span-2 flex items-center justify-center gap-1">
                        {isCollected ? (
                          <span className="inline-flex items-center gap-1 text-green-700 text-xs font-medium">
                            <Check className="h-3.5 w-3.5" />
                            Tahsil
                          </span>
                        ) : isEditable ? (
                          <button
                            type="button"
                            onClick={() => removeInstallment(index)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Taksiti sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">Bekliyor</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Yeni taksit ekle butonu */}
              {!readOnly && (
                <button
                  type="button"
                  onClick={addInstallment}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-teal-500 hover:text-teal-600 transition-colors text-sm"
                >
                  + Yeni Taksit Ekle
                </button>
              )}

              {/* Toplam ve uyarı */}
              <div className={`flex flex-wrap items-center justify-between p-3 rounded-lg mt-4 ${
                isBalanced ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'
              }`}>
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Toplam: </span>
                    <span className="text-lg font-bold text-gray-900">
                      {total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </span>
                  </div>
                  <div className="text-gray-400">|</div>
                  <div>
                    <span className="text-sm text-gray-600">Bütçe: </span>
                    <span className="font-medium text-gray-700">
                      {budget.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </span>
                  </div>
                </div>

                {!isBalanced && (
                  <div className={`text-sm font-medium ${difference > 0 ? 'text-amber-700' : 'text-red-700'}`}>
                    {difference > 0 ? 'Eksik' : 'Fazla'}: {Math.abs(difference).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </div>
                )}

                {isBalanced && (
                  <div className="flex items-center gap-1 text-green-700 text-sm font-medium">
                    <Check className="h-4 w-4" />
                    Dengeli
                  </div>
                )}
              </div>

              {/* Tahsilat özeti (readOnly modda) */}
              {readOnly && collectedTotal > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-700">Tahsil Edilen:</span>
                    <span className="font-bold text-blue-900">
                      {collectedTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-blue-700">Kalan:</span>
                    <span className="font-medium text-blue-800">
                      {(total - collectedTotal).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Taksit yoksa bilgi mesajı */}
          {installments.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">Henüz taksit eklenmedi.</p>
              <p className="text-xs text-gray-400 mt-1">
                Yukarıdan "Eşit Taksitlere Böl" butonuna tıklayın veya manuel taksit ekleyin.
              </p>
            </div>
          )}
        </>
      )}

      {/* Kapalı durumda bilgi */}
      {!enabled && (
        <p className="text-sm text-gray-500">
          Ödeme planı oluşturmak için toggle'ı aktif hale getirin.
        </p>
      )}
    </div>
  )
}
