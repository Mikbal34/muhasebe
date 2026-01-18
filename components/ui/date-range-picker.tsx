'use client'

import { useState, useEffect, useRef } from 'react'
import { Calendar, X, ChevronDown, ChevronLeft, ChevronRight, Clock, CalendarDays, CalendarRange, Sparkles } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subYears, addMonths, subDays, isToday, isSameMonth, isSameDay, startOfDay, endOfDay } from 'date-fns'
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

// Preset options with icons
const presets = [
  {
    label: 'Bugün',
    icon: Clock,
    getValue: () => ({
      startDate: format(startOfDay(new Date()), 'yyyy-MM-dd'),
      endDate: format(endOfDay(new Date()), 'yyyy-MM-dd')
    })
  },
  {
    label: 'Son 7 Gün',
    icon: CalendarDays,
    getValue: () => ({
      startDate: format(subDays(new Date(), 6), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd')
    })
  },
  {
    label: 'Bu Ay',
    icon: Calendar,
    getValue: () => ({
      startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    })
  },
  {
    label: 'Geçen Ay',
    icon: Calendar,
    getValue: () => ({
      startDate: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd')
    })
  },
  {
    label: 'Son 3 Ay',
    icon: CalendarRange,
    getValue: () => ({
      startDate: format(startOfMonth(subMonths(new Date(), 2)), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    })
  },
  {
    label: 'Son 6 Ay',
    icon: CalendarRange,
    getValue: () => ({
      startDate: format(startOfMonth(subMonths(new Date(), 5)), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    })
  },
  {
    label: 'Bu Yıl',
    icon: Sparkles,
    getValue: () => ({
      startDate: format(startOfYear(new Date()), 'yyyy-MM-dd'),
      endDate: format(endOfYear(new Date()), 'yyyy-MM-dd')
    })
  },
  {
    label: 'Geçen Yıl',
    icon: Sparkles,
    getValue: () => ({
      startDate: format(startOfYear(subYears(new Date(), 1)), 'yyyy-MM-dd'),
      endDate: format(endOfYear(subYears(new Date(), 1)), 'yyyy-MM-dd')
    })
  },
]

// Mini Calendar Component
function MiniCalendar({
  selectedDate,
  onSelect,
  currentMonth,
  onMonthChange,
  rangeStart,
  rangeEnd
}: {
  selectedDate: Date | null
  onSelect: (date: Date) => void
  currentMonth: Date
  onMonthChange: (date: Date) => void
  rangeStart?: Date | null
  rangeEnd?: Date | null
}) {
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()

  // Adjust for Monday start (0 = Monday, 6 = Sunday)
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1

  const days = []

  // Empty cells for days before the first day of month
  for (let i = 0; i < adjustedFirstDay; i++) {
    days.push(<div key={`empty-${i}`} className="w-8 h-8" />)
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    const isSelected = selectedDate && isSameDay(date, selectedDate)
    const isInRange = rangeStart && rangeEnd && date >= rangeStart && date <= rangeEnd
    const isRangeStart = rangeStart && isSameDay(date, rangeStart)
    const isRangeEnd = rangeEnd && isSameDay(date, rangeEnd)
    const isTodayDate = isToday(date)

    days.push(
      <button
        key={day}
        type="button"
        onClick={() => onSelect(date)}
        className={`
          w-8 h-8 text-sm font-medium rounded-lg transition-all
          ${isSelected || isRangeStart || isRangeEnd
            ? 'bg-navy text-white shadow-lg shadow-navy/20'
            : isInRange
              ? 'bg-navy/10 text-navy'
              : isTodayDate
                ? 'bg-gold/20 text-gold font-bold ring-1 ring-gold/30'
                : 'text-slate-700 hover:bg-slate-100'
          }
        `}
      >
        {day}
      </button>
    )
  }

  return (
    <div>
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => onMonthChange(subMonths(currentMonth, 1))}
          className="p-1.5 rounded-lg text-slate-500 hover:text-navy hover:bg-slate-100 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-bold text-navy">
          {format(currentMonth, 'MMMM yyyy', { locale: tr })}
        </h3>
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(currentMonth, 1))}
          className="p-1.5 rounded-lg text-slate-500 hover:text-navy hover:bg-slate-100 transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map((day) => (
          <div key={day} className="w-8 h-6 flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days}
      </div>
    </div>
  )
}

export function DateRangePicker({ value, onChange, className = '', align = 'left' }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [tempStart, setTempStart] = useState(value.startDate || '')
  const [tempEnd, setTempEnd] = useState(value.endDate || '')
  const [leftMonth, setLeftMonth] = useState(subMonths(new Date(), 1))
  const [rightMonth, setRightMonth] = useState(new Date())
  const [selectingStart, setSelectingStart] = useState(true)
  const [dropdownAlign, setDropdownAlign] = useState<'left' | 'right'>(align)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Check if dropdown would overflow and adjust alignment
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const dropdownWidth = 580 // min-width of dropdown
      const viewportWidth = window.innerWidth
      const spaceOnRight = viewportWidth - rect.left
      const spaceOnLeft = rect.right

      if (spaceOnRight < dropdownWidth && spaceOnLeft > spaceOnRight) {
        setDropdownAlign('right')
      } else {
        setDropdownAlign('left')
      }
    }
  }, [isOpen])

  useEffect(() => {
    setTempStart(value.startDate || '')
    setTempEnd(value.endDate || '')
  }, [value])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleApply = () => {
    onChange({
      startDate: tempStart || null,
      endDate: tempEnd || null
    })
    setIsOpen(false)
  }

  const handlePreset = (preset: typeof presets[0]) => {
    const newValue = preset.getValue()
    setActivePreset(preset.label)
    onChange(newValue)
    setTempStart(newValue.startDate || '')
    setTempEnd(newValue.endDate || '')
    setIsOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange({ startDate: null, endDate: null })
    setTempStart('')
    setTempEnd('')
    setActivePreset(null)
  }

  const handleDateSelect = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')

    if (selectingStart) {
      setTempStart(dateStr)
      setTempEnd('')
      setSelectingStart(false)
    } else {
      if (new Date(dateStr) < new Date(tempStart)) {
        setTempEnd(tempStart)
        setTempStart(dateStr)
      } else {
        setTempEnd(dateStr)
      }
      setSelectingStart(true)
    }
    setActivePreset(null)
  }

  const getDisplayText = () => {
    if (!value.startDate && !value.endDate) {
      return 'Tarih Seçin'
    }

    const start = value.startDate ? format(new Date(value.startDate), 'd MMM yyyy', { locale: tr }) : ''
    const end = value.endDate ? format(new Date(value.endDate), 'd MMM yyyy', { locale: tr }) : ''

    if (start && end) {
      if (start === end) return start
      return `${start} → ${end}`
    }
    return start || end
  }

  const hasValue = value.startDate || value.endDate

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 pl-10 pr-4 h-11 rounded-lg text-sm font-semibold transition-all
          ${hasValue
            ? 'bg-navy/5 text-navy border-2 border-navy/20 hover:border-navy/40'
            : 'bg-slate-50 text-slate-700 border-none hover:bg-slate-100'
          }
          ${isOpen ? 'ring-2 ring-navy/20' : ''}
        `}
      >
        <Calendar className={`absolute left-3 w-4 h-4 ${hasValue ? 'text-navy' : 'text-slate-400'}`} />
        <span className="whitespace-nowrap">{getDisplayText()}</span>
        {hasValue ? (
          <button
            type="button"
            onClick={handleClear}
            className="ml-1 p-0.5 rounded-full hover:bg-navy/10 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-navy/60" />
          </button>
        ) : (
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className={`
            absolute top-full mt-2 z-[100] bg-white rounded-2xl shadow-2xl border border-slate-200
            overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200
            ${dropdownAlign === 'right' ? 'right-0' : 'left-0'}
          `}
          style={{ minWidth: '580px', maxWidth: 'calc(100vw - 32px)' }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-navy to-navy/80 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <CalendarRange className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold">Tarih Aralığı Seçin</h3>
                <p className="text-white/70 text-sm">
                  {tempStart && tempEnd
                    ? `${format(new Date(tempStart), 'd MMMM yyyy', { locale: tr })} - ${format(new Date(tempEnd), 'd MMMM yyyy', { locale: tr })}`
                    : tempStart
                      ? `${format(new Date(tempStart), 'd MMMM yyyy', { locale: tr })} - Bitiş seçin`
                      : 'Hızlı seçim veya takvimden seçin'
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="flex">
            {/* Presets Sidebar */}
            <div className="w-44 bg-slate-50 border-r border-slate-100 p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Hızlı Seçim</p>
              <div className="space-y-1">
                {presets.map((preset) => {
                  const PresetIcon = preset.icon
                  const isActive = activePreset === preset.label
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handlePreset(preset)}
                      className={`
                        w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left
                        ${isActive
                          ? 'bg-navy text-white shadow-lg shadow-navy/20'
                          : 'text-slate-600 hover:bg-white hover:text-navy hover:shadow-sm'
                        }
                      `}
                    >
                      <PresetIcon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      {preset.label}
                    </button>
                  )
                })}
              </div>

              {/* Tüm Zamanlar */}
              <div className="mt-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    onChange({ startDate: null, endDate: null })
                    setTempStart('')
                    setTempEnd('')
                    setActivePreset('Tüm Zamanlar')
                    setIsOpen(false)
                  }}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left
                    ${activePreset === 'Tüm Zamanlar' || (!value.startDate && !value.endDate && !tempStart)
                      ? 'bg-gold/20 text-gold'
                      : 'text-slate-600 hover:bg-white hover:text-gold hover:shadow-sm'
                    }
                  `}
                >
                  <Sparkles className="w-4 h-4" />
                  Tüm Zamanlar
                </button>
              </div>
            </div>

            {/* Calendars */}
            <div className="flex-1 p-5">
              <div className="flex gap-6">
                {/* Left Calendar */}
                <div className="flex-1">
                  <MiniCalendar
                    selectedDate={tempStart ? new Date(tempStart) : null}
                    onSelect={handleDateSelect}
                    currentMonth={leftMonth}
                    onMonthChange={setLeftMonth}
                    rangeStart={tempStart ? new Date(tempStart) : null}
                    rangeEnd={tempEnd ? new Date(tempEnd) : null}
                  />
                </div>

                {/* Divider */}
                <div className="w-px bg-slate-200" />

                {/* Right Calendar */}
                <div className="flex-1">
                  <MiniCalendar
                    selectedDate={tempEnd ? new Date(tempEnd) : null}
                    onSelect={handleDateSelect}
                    currentMonth={rightMonth}
                    onMonthChange={setRightMonth}
                    rangeStart={tempStart ? new Date(tempStart) : null}
                    rangeEnd={tempEnd ? new Date(tempEnd) : null}
                  />
                </div>
              </div>

              {/* Custom Date Inputs */}
              <div className="mt-5 pt-5 border-t border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Başlangıç</label>
                    <input
                      type="date"
                      value={tempStart}
                      onChange={(e) => {
                        setTempStart(e.target.value)
                        setActivePreset(null)
                      }}
                      className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition-all"
                    />
                  </div>
                  <div className="text-slate-300 mt-5">→</div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Bitiş</label>
                    <input
                      type="date"
                      value={tempEnd}
                      onChange={(e) => {
                        setTempEnd(e.target.value)
                        setActivePreset(null)
                      }}
                      className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={!tempStart && !tempEnd}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-navy rounded-lg hover:bg-navy/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-navy/20"
                >
                  Uygula
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
