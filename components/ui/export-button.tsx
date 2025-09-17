import React, { useState } from 'react'
import { Download, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react'
import { ExportFormat } from '@/hooks/useExport'

interface ExportButtonProps {
  onExport: (format: ExportFormat) => void
  isExporting?: boolean
  disabled?: boolean
  data?: any[]
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'outline'
}

export function ExportButton({
  onExport,
  isExporting = false,
  disabled = false,
  data = [],
  className = '',
  size = 'md',
  variant = 'outline'
}: ExportButtonProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm'
      case 'md':
        return 'px-4 py-2 text-sm'
      case 'lg':
        return 'px-6 py-3 text-base'
      default:
        return 'px-4 py-2 text-sm'
    }
  }

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600'
      case 'secondary':
        return 'bg-gray-600 text-white hover:bg-gray-700 border-gray-600'
      case 'outline':
        return 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
      default:
        return 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
    }
  }

  const buttonClasses = `
    inline-flex items-center justify-center font-medium rounded-md border
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
    transition-colors duration-200 relative
    disabled:opacity-50 disabled:cursor-not-allowed
    ${getSizeClasses()}
    ${getVariantClasses()}
    ${className}
  `

  const handleExport = (format: ExportFormat) => {
    setIsDropdownOpen(false)
    onExport(format)
  }

  const isDisabled = disabled || isExporting || data.length === 0

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        disabled={isDisabled}
        className={buttonClasses}
      >
        {isExporting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
            Dışa Aktarılıyor...
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" />
            Dışa Aktar
            <ChevronDown className="h-4 w-4 ml-1" />
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && !isDisabled && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
          <div className="py-1">
            <button
              onClick={() => handleExport('excel')}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4 mr-3 text-green-600" />
              Excel (.xls)
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <FileText className="h-4 w-4 mr-3 text-blue-600" />
              CSV (.csv)
            </button>
          </div>
        </div>
      )}

      {/* Overlay to close dropdown */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  )
}

// Simple export button without dropdown
interface SimpleExportButtonProps {
  onExport: () => void
  isExporting?: boolean
  disabled?: boolean
  label?: string
  icon?: React.ReactNode
  className?: string
}

export function SimpleExportButton({
  onExport,
  isExporting = false,
  disabled = false,
  label = 'Dışa Aktar',
  icon,
  className = ''
}: SimpleExportButtonProps) {
  return (
    <button
      type="button"
      onClick={onExport}
      disabled={disabled || isExporting}
      className={`
        inline-flex items-center px-4 py-2 text-sm font-medium rounded-md
        bg-white text-gray-700 border border-gray-300 hover:bg-gray-50
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors duration-200
        ${className}
      `}
    >
      {isExporting ? (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-600 border-t-transparent mr-2" />
      ) : (
        icon || <Download className="h-4 w-4 mr-2" />
      )}
      {isExporting ? 'Dışa Aktarılıyor...' : label}
    </button>
  )
}

// Export modal for bulk exports
interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function ExportModal({ isOpen, onClose, title, children }: ExportModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <span className="sr-only">Kapat</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

// Export progress component
interface ExportProgressProps {
  current: number
  total: number
  label?: string
}

export function ExportProgress({ current, total, label = 'Dışa aktarılıyor' }: ExportProgressProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-500">{current} / {total}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-gray-500 text-center">{percentage}%</div>
    </div>
  )
}

// Quick export actions component
interface QuickExportActionsProps {
  onExportAll: (format: ExportFormat) => void
  onExportFiltered: (format: ExportFormat) => void
  isExporting: boolean
  totalCount: number
  filteredCount: number
  className?: string
}

export function QuickExportActions({
  onExportAll,
  onExportFiltered,
  isExporting,
  totalCount,
  filteredCount,
  className = ''
}: QuickExportActionsProps) {
  return (
    <div className={`flex flex-col sm:flex-row gap-2 ${className}`}>
      {filteredCount < totalCount && (
        <ExportButton
          onExport={onExportFiltered}
          isExporting={isExporting}
          data={Array(filteredCount)}
          size="sm"
        />
      )}
      <ExportButton
        onExport={onExportAll}
        isExporting={isExporting}
        data={Array(totalCount)}
        size="sm"
        variant="primary"
      />
    </div>
  )
}