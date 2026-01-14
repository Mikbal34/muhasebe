'use client'

import { useState, useEffect } from 'react'
import { Calendar, X, ChevronDown } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subYears } from 'date-fns'
import { tr } from 'date-fns/locale'

export interface DateRange {
  startDate: string | null
  endDate: string | null
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  className?: string
  align?: 'left' | 'right'
}

// Preset options
const presets = [
  { label: 'Bu Ay', getValue: () => ({ startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'), endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd') }) },
  { label: 'Geçen Ay', getValue: () => ({ startDate: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'), endDate: format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd') }) },
  { label: 'Son 3 Ay', getValue: () => ({ startDate: format(startOfMonth(subMonths(new Date(), 2)), 'yyyy-MM-dd'), endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd') }) },
  { label: 'Son 6 Ay', getValue: () => ({ startDate: format(startOfMonth(subMonths(new Date(), 5)), 'yyyy-MM-dd'), endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd') }) },
  { label: 'Bu Yıl', getValue: () => ({ startDate: format(startOfYear(new Date()), 'yyyy-MM-dd'), endDate: format(endOfYear(new Date()), 'yyyy-MM-dd') }) },
  { label: 'Geçen Yıl', getValue: () => ({ startDate: format(startOfYear(subYears(new Date(), 1)), 'yyyy-MM-dd'), endDate: format(endOfYear(subYears(new Date(), 1)), 'yyyy-MM-dd') }) },
  { label: 'Tüm Zamanlar', getValue: () => ({ startDate: null, endDate: null }) },
]

export function DateRangePicker({ value, onChange, className = '', align = 'left' }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempStart, setTempStart] = useState(value.startDate || '')
  const [tempEnd, setTempEnd] = useState(value.endDate || '')

  useEffect(() => {
    setTempStart(value.startDate || '')
    setTempEnd(value.endDate || '')
  }, [value])

  const handleApply = () => {
    onChange({
      startDate: tempStart || null,
      endDate: tempEnd || null
    })
    setIsOpen(false)
  }

  const handlePreset = (preset: typeof presets[0]) => {
    const newValue = preset.getValue()
    onChange(newValue)
    setTempStart(newValue.startDate || '')
    setTempEnd(newValue.endDate || '')
    setIsOpen(false)
  }

  const handleClear = () => {
    onChange({ startDate: null, endDate: null })
    setTempStart('')
    setTempEnd('')
  }

  const getDisplayText = () => {
    if (!value.startDate && !value.endDate) {
      return 'Tüm Zamanlar'
    }

    const start = value.startDate ? format(new Date(value.startDate), 'd MMM yyyy', { locale: tr }) : ''
    const end = value.endDate ? format(new Date(value.endDate), 'd MMM yyyy', { locale: tr }) : ''

    if (start && end) {
      return `${start} - ${end}`
    }
    return start || end
  }

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
      >
        <Calendar className="h-4 w-4 text-slate-500" />
        <span>{getDisplayText()}</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Clear button */}
      {(value.startDate || value.endDate) && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute -right-2 -top-2 p-1 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
        >
          <X className="h-3 w-3 text-slate-500" />
        </button>
      )}

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Content */}
          <div className={`absolute top-full mt-2 z-50 bg-white rounded-lg shadow-xl border border-slate-200 p-4 min-w-[320px] ${align === 'right' ? 'right-0' : 'left-0'}`}>
            {/* Presets */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Hızlı Seçim</p>
              <div className="grid grid-cols-2 gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handlePreset(preset)}
                    className="px-3 py-1.5 text-sm text-slate-700 hover:bg-teal-50 hover:text-teal-700 rounded border border-slate-200 transition-colors text-left"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-200 my-4" />

            {/* Custom Date Range */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Özel Aralık</p>
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">Başlangıç</label>
                  <input
                    type="date"
                    value={tempStart}
                    onChange={(e) => setTempStart(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <span className="text-slate-400 mt-5">-</span>
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">Bitiş</label>
                  <input
                    type="date"
                    value={tempEnd}
                    onChange={(e) => setTempEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded hover:bg-teal-700 transition-colors"
              >
                Uygula
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
