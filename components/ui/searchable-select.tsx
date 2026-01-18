'use client'

import { useState, useRef, useEffect } from 'react'

interface Option {
  id: string
  code?: string
  name?: string
  full_name?: string
  [key: string]: any
}

interface SearchableSelectProps {
  options: Option[]
  value: string
  onChange: (value: string, option: Option | null) => void
  placeholder?: string
  disabled?: boolean
  error?: boolean
  className?: string
  // Custom display function
  getOptionLabel?: (option: Option) => string
  // Custom search keys (default: ['code', 'name', 'full_name'])
  searchKeys?: string[]
  // Search placeholder
  searchPlaceholder?: string
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Seçiniz...',
  disabled = false,
  error = false,
  className = '',
  getOptionLabel,
  searchKeys = ['code', 'name', 'full_name'],
  searchPlaceholder = 'Ara...'
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Find selected option
  const selectedOption = options.find(o => o.id === value)

  // Default label function
  const defaultGetLabel = (option: Option): string => {
    if (option.code && option.name) {
      return `${option.code} - ${option.name}`
    }
    if (option.full_name) {
      return option.full_name
    }
    if (option.name) {
      return option.name
    }
    return option.id
  }

  const getLabelFn = getOptionLabel || defaultGetLabel

  // Filter options based on search
  const filteredOptions = options.filter(option => {
    if (!search) return true
    const searchLower = search.toLowerCase()

    // Search in specified keys
    for (const key of searchKeys) {
      const value = option[key]
      if (value && String(value).toLowerCase().includes(searchLower)) {
        return true
      }
    }
    return false
  })

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSelect = (option: Option) => {
    onChange(option.id, option)
    setIsOpen(false)
    setSearch('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('', null)
    setSearch('')
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Selected value display / trigger */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          w-full px-3 py-2 border-2 rounded-lg cursor-pointer flex items-center justify-between
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-navy/50'}
          ${error ? 'border-red-500' : 'border-slate-200'}
          ${isOpen ? 'ring-2 ring-navy/20 border-navy' : ''}
          text-sm
        `}
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
          {selectedOption ? getLabelFn(selectedOption) : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-72 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-slate-100">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
            />
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                Sonuç bulunamadı
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.id}
                  onClick={() => handleSelect(option)}
                  className={`
                    px-3 py-2.5 cursor-pointer text-sm
                    ${option.id === value ? 'bg-navy/10 text-navy font-semibold' : 'hover:bg-slate-50'}
                  `}
                >
                  {getLabelFn(option)}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
