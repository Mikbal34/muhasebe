'use client'

import { useState } from 'react'
import { MoneyInput } from '@/components/ui/money-input'
import { Calendar, Calculator, Trash2, Check, Plus, AlertCircle, Sparkles } from 'lucide-react'

export interface PlannedInstallment {
  id?: string
  installment_number: number
  planned_amount: number
  planned_date: string
  description?: string | null
}

interface PaymentPlanSectionProps {
  budget: number
  startDate: string
  enabled: boolean
  installments: PlannedInstallment[]
  onEnabledChange: (enabled: boolean) => void
  onInstallmentsChange: (installments: PlannedInstallment[]) => void
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
  const [manualCount, setManualCount] = useState(1)
  const [manualAmount, setManualAmount] = useState(0)

  const generateEqualInstallments = () => {
    if (!budget || budget <= 0 || !startDate || installmentCount < 1) return

    const baseAmount = Math.floor((budget / installmentCount) * 100) / 100
    const remainder = Math.round((budget - baseAmount * installmentCount) * 100) / 100

    const newInstallments: PlannedInstallment[] = []
    const start = new Date(startDate)

    for (let i = 0; i < installmentCount; i++) {
      const date = new Date(start)
      date.setMonth(date.getMonth() + i)
      const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
      date.setDate(Math.min(paymentDay, lastDayOfMonth))

      const amount = i === installmentCount - 1
        ? Math.round((baseAmount + remainder) * 100) / 100
        : baseAmount

      newInstallments.push({
        installment_number: i + 1,
        planned_amount: amount,
        planned_date: date.toISOString().split('T')[0],
        description: `Taksit ${i + 1}/${installmentCount}`
      })
    }

    onInstallmentsChange(newInstallments)
  }

  const generateManualInstallments = () => {
    if (!startDate || manualCount < 1 || manualAmount <= 0) return

    const existingCount = installments.length
    const newTotalCount = existingCount + manualCount
    const start = existingCount > 0
      ? new Date(installments[existingCount - 1].planned_date)
      : new Date(startDate)

    const updatedExisting = installments.map((inst, i) => {
      let newDescription = inst.description
      if (inst.description?.match(/^Taksit \d+/)) {
        newDescription = `Taksit ${i + 1}/${newTotalCount}`
      }
      return { ...inst, description: newDescription }
    })

    const newInstallments: PlannedInstallment[] = []
    for (let i = 0; i < manualCount; i++) {
      const date = new Date(start)
      date.setMonth(date.getMonth() + i + 1)
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
      date.setDate(Math.min(paymentDay, lastDay))

      newInstallments.push({
        installment_number: existingCount + i + 1,
        planned_amount: manualAmount,
        planned_date: date.toISOString().split('T')[0],
        description: `Taksit ${existingCount + i + 1}/${newTotalCount}`
      })
    }

    onInstallmentsChange([...updatedExisting, ...newInstallments])
  }

  const updateInstallment = (index: number, field: keyof PlannedInstallment, value: string | number) => {
    const updated = [...installments]
    updated[index] = { ...updated[index], [field]: value }
    onInstallmentsChange(updated)
  }

  const removeInstallment = (index: number) => {
    const updated = installments.filter((_, i) => i !== index)
    const totalCount = updated.length
    const renumbered = updated.map((inst, i) => {
      const newNumber = i + 1
      let newDescription = inst.description
      if (inst.description?.match(/^Taksit \d+/)) {
        newDescription = `Taksit ${newNumber}/${totalCount}`
      }
      return {
        ...inst,
        installment_number: newNumber,
        description: newDescription
      }
    })
    onInstallmentsChange(renumbered)
  }

  const addInstallment = () => {
    const lastInstallment = installments[installments.length - 1]
    let newDate = startDate

    if (lastInstallment) {
      const lastDate = new Date(lastInstallment.planned_date)
      lastDate.setMonth(lastDate.getMonth() + 1)
      newDate = lastDate.toISOString().split('T')[0]
    }

    const newTotalCount = installments.length + 1
    const newInstallment: PlannedInstallment = {
      installment_number: newTotalCount,
      planned_amount: 0,
      planned_date: newDate,
      description: `Taksit ${newTotalCount}/${newTotalCount}`
    }

    const updatedInstallments = installments.map((inst, i) => {
      let newDescription = inst.description
      if (inst.description?.match(/^Taksit \d+/)) {
        newDescription = `Taksit ${i + 1}/${newTotalCount}`
      }
      return { ...inst, description: newDescription }
    })

    onInstallmentsChange([...updatedInstallments, newInstallment])
  }

  const total = installments.reduce((sum, inst) => sum + (inst.planned_amount || 0), 0)
  const difference = budget - total
  const isBalanced = Math.abs(difference) < 0.01
  const isUnder = difference > 0.01
  const isOver = difference < -0.01

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="h-1 w-full bg-gradient-to-r from-navy to-gold" />
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-navy flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Ödeme Planı
            <span className="text-xs font-normal text-slate-400">(Kontrol amaçlı)</span>
          </h2>
          {!readOnly && (
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={() => onEnabledChange(!enabled)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gold/30 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
              <span className="ms-2 text-sm font-medium text-slate-600">
                {enabled ? 'Aktif' : 'Pasif'}
              </span>
            </label>
          )}
        </div>

        {enabled && (
          <>
            {/* Otomatik Bölme */}
            {!readOnly && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 p-4 bg-gradient-to-br from-navy/5 to-gold/5 rounded-xl border border-navy/10">
                <div className="md:col-span-4 flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-gold" />
                  <span className="text-xs font-bold text-navy uppercase tracking-wider">Otomatik Taksitlendirme</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Taksit Sayısı</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={installmentCount}
                    onChange={(e) => setInstallmentCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold/30 focus:border-gold transition-all outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Ödeme Günü</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={paymentDay}
                    onChange={(e) => setPaymentDay(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold/30 focus:border-gold transition-all outline-none text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">&nbsp;</label>
                  <button
                    type="button"
                    onClick={generateEqualInstallments}
                    disabled={!budget || budget <= 0 || !startDate}
                    className="w-full px-4 py-2 bg-navy text-white rounded-lg hover:bg-navy/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-semibold transition-all shadow-sm"
                  >
                    <Calculator className="w-4 h-4" />
                    Eşit Taksitlere Böl
                  </button>
                </div>
              </div>
            )}

            {/* Manuel Ekleme */}
            {!readOnly && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="md:col-span-4 flex items-center gap-2 mb-1">
                  <Plus className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Manuel Taksit Ekle</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Adet</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={manualCount}
                    onChange={(e) => setManualCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold/30 focus:border-gold transition-all outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tutar (₺)</label>
                  <MoneyInput
                    value={manualAmount.toString()}
                    onChange={(val) => setManualAmount(parseFloat(val) || 0)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold/30 focus:border-gold transition-all outline-none text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">&nbsp;</label>
                  <button
                    type="button"
                    onClick={generateManualInstallments}
                    disabled={!startDate || manualCount < 1 || manualAmount <= 0}
                    className="w-full px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 hover:border-gold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-semibold transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Taksit Ekle
                  </button>
                </div>
              </div>
            )}

            {/* Taksit Listesi */}
            {installments.length > 0 && (
              <div className="space-y-2">
                {/* Başlık */}
                <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 py-2 bg-slate-50 rounded-lg">
                  <div className="col-span-1">#</div>
                  <div className="col-span-3">Tutar</div>
                  <div className="col-span-3">Tarih</div>
                  <div className="col-span-4">Açıklama</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Taksitler */}
                <div className="max-h-[300px] overflow-y-auto space-y-1">
                  {installments.map((inst, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-white border border-slate-100 hover:border-gold/30 transition-all"
                    >
                      <div className="col-span-1">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-navy/10 text-navy text-xs font-bold">
                          {inst.installment_number}
                        </span>
                      </div>
                      <div className="col-span-3">
                        <MoneyInput
                          value={inst.planned_amount.toString()}
                          onChange={(val) => updateInstallment(index, 'planned_amount', parseFloat(val) || 0)}
                          disabled={readOnly}
                          className={`w-full px-2 py-1.5 rounded-lg text-sm ${
                            !readOnly
                              ? 'bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white'
                              : 'bg-transparent border-transparent'
                          } transition-all outline-none`}
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="date"
                          value={inst.planned_date}
                          onChange={(e) => updateInstallment(index, 'planned_date', e.target.value)}
                          disabled={readOnly}
                          className={`w-full px-2 py-1.5 rounded-lg text-sm ${
                            !readOnly
                              ? 'bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white'
                              : 'bg-transparent border-transparent'
                          } transition-all outline-none`}
                        />
                      </div>
                      <div className="col-span-4">
                        <input
                          type="text"
                          value={inst.description || ''}
                          onChange={(e) => updateInstallment(index, 'description', e.target.value)}
                          disabled={readOnly}
                          placeholder="Açıklama..."
                          className={`w-full px-2 py-1.5 rounded-lg text-sm ${
                            !readOnly
                              ? 'bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white'
                              : 'bg-transparent border-transparent'
                          } transition-all outline-none`}
                        />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => removeInstallment(index)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Yeni Taksit Ekle */}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={addInstallment}
                    className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-gold hover:text-gold transition-all text-sm font-medium"
                  >
                    + Yeni Taksit Ekle
                  </button>
                )}

                {/* Toplam ve Uyarı */}
                <div className={`flex flex-wrap items-center justify-between p-4 rounded-xl mt-3 ${
                  isOver
                    ? 'bg-red-50 border border-red-200'
                    : isBalanced
                      ? 'bg-emerald-50 border border-emerald-200'
                      : 'bg-slate-50 border border-slate-200'
                }`}>
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">Toplam</span>
                      <p className="text-lg font-bold text-navy">
                        ₺{total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="h-8 w-px bg-slate-200"></div>
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">Bütçe</span>
                      <p className="text-lg font-bold text-slate-600">
                        ₺{budget.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {isOver && (
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-semibold">
                        Bütçe aşımı: ₺{Math.abs(difference).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  {isUnder && (
                    <div className="text-sm text-slate-500">
                      Kalan ₺{Math.abs(difference).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} sonradan eklenebilir
                    </div>
                  )}

                  {isBalanced && (
                    <div className="flex items-center gap-1.5 text-emerald-700">
                      <Check className="w-5 h-5" />
                      <span className="text-sm font-bold">Dengeli</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Taksit Yok */}
            {installments.length === 0 && (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-sm font-medium text-slate-500">Henüz taksit eklenmedi</p>
                <p className="text-xs text-slate-400 mt-1">
                  "Eşit Taksitlere Böl" veya "Manuel Taksit Ekle" butonlarını kullanın
                </p>
              </div>
            )}
          </>
        )}

        {/* Pasif Durumu */}
        {!enabled && (
          <div className="flex items-center gap-3 py-4 text-slate-400">
            <Calendar className="w-5 h-5" />
            <p className="text-sm">Ödeme planı oluşturmak için toggle'ı aktif hale getirin.</p>
          </div>
        )}
      </div>
    </section>
  )
}
