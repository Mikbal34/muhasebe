import { useState, useCallback } from 'react'
import {
  exportToCSV,
  exportToExcel,
  ExportOptions,
  ExportColumn,
  prepareExportData,
  DataTransformers
} from '@/utils/export'

export type ExportFormat = 'csv' | 'excel'

export interface UseExportOptions {
  baseFilename: string
  title?: string
  subtitle?: string
  columns: ExportColumn[]
  dataTransformers?: Record<string, (value: any) => any>
}

export function useExport({
  baseFilename,
  title,
  subtitle,
  columns,
  dataTransformers
}: UseExportOptions) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const exportData = useCallback(async (
    data: any[],
    format: ExportFormat,
    customFilename?: string
  ) => {
    setIsExporting(true)
    setExportError(null)

    try {
      if (!data || data.length === 0) {
        throw new Error('Dışa aktarılacak veri bulunamadı')
      }

      // Prepare data with transformers
      const preparedData = prepareExportData(data, dataTransformers)

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_')
      const filename = customFilename || `${baseFilename}_${timestamp}`

      const exportOptions: ExportOptions = {
        filename,
        title,
        subtitle: subtitle || `Dışa Aktarma Tarihi: ${new Date().toLocaleDateString('tr-TR')}`,
        columns,
        data: preparedData
      }

      switch (format) {
        case 'csv':
          exportToCSV(exportOptions)
          break
        case 'excel':
          exportToExcel(exportOptions)
          break
        default:
          throw new Error('Desteklenmeyen dışa aktarma formatı')
      }
    } catch (error: any) {
      console.error('Export error:', error)
      setExportError(error.message || 'Dışa aktarma sırasında hata oluştu')
    } finally {
      setIsExporting(false)
    }
  }, [baseFilename, title, subtitle, columns, dataTransformers])

  const clearError = useCallback(() => {
    setExportError(null)
  }, [])

  return {
    exportData,
    isExporting,
    exportError,
    clearError
  }
}

// Pre-configured export hooks for common entities

// Projects export hook
export function useProjectsExport() {
  return useExport({
    baseFilename: 'projeler',
    title: 'Proje Listesi',
    columns: [
      { key: 'code', header: 'Proje Kodu' },
      { key: 'name', header: 'Proje Adı' },
      { key: 'budget', header: 'Bütçe', format: 'currency' },
      { key: 'start_date', header: 'Başlangıç Tarihi', format: 'date' },
      { key: 'end_date', header: 'Bitiş Tarihi', format: 'date' },
      { key: 'company_rate', header: 'Şirket Komisyonu', format: 'percentage' },
      { key: 'status', header: 'Durum' },
      { key: 'created_by_user.full_name', header: 'Oluşturan' }
    ],
    dataTransformers: {
      'status': DataTransformers.statusToTurkish
    }
  })
}

// Incomes export hook
export function useIncomesExport() {
  return useExport({
    baseFilename: 'gelirler',
    title: 'Gelir Listesi',
    columns: [
      { key: 'project.code', header: 'Proje Kodu' },
      { key: 'project.name', header: 'Proje Adı' },
      { key: 'gross_amount', header: 'Brüt Tutar', format: 'currency' },
      { key: 'vat_rate', header: 'KDV Oranı', format: 'percentage' },
      { key: 'vat_amount', header: 'KDV Tutarı', format: 'currency' },
      { key: 'net_amount', header: 'Net Tutar', format: 'currency' },
      { key: 'income_date', header: 'Gelir Tarihi', format: 'date' },
      { key: 'description', header: 'Açıklama' },
      { key: 'created_by_user.full_name', header: 'Kaydeden' }
    ]
  })
}

// Payments export hook
export function usePaymentsExport() {
  return useExport({
    baseFilename: 'odemeler',
    title: 'Ödeme Talimatları',
    columns: [
      { key: 'instruction_number', header: 'Talimat No' },
      { key: 'user.full_name', header: 'Alıcı' },
      { key: 'user.email', header: 'Email' },
      { key: 'user.iban', header: 'IBAN' },
      { key: 'total_amount', header: 'Toplam Tutar', format: 'currency' },
      { key: 'status', header: 'Durum' },
      { key: 'created_at', header: 'Oluşturma Tarihi', format: 'date' },
      { key: 'approved_at', header: 'Onay Tarihi', format: 'date' },
      { key: 'notes', header: 'Notlar' }
    ],
    dataTransformers: {
      'status': DataTransformers.statusToTurkish
    }
  })
}

// Balances export hook
export function useBalancesExport() {
  return useExport({
    baseFilename: 'bakiyeler',
    title: 'Bakiye Listesi',
    columns: [
      { key: 'user.full_name', header: 'Kullanıcı' },
      { key: 'user.email', header: 'Email' },
      { key: 'user.role', header: 'Rol' },
      { key: 'balance', header: 'Bakiye', format: 'currency' },
      { key: 'user.iban', header: 'IBAN' },
      { key: 'user.phone', header: 'Telefon' }
    ],
    dataTransformers: {
      'user.role': DataTransformers.roleToTurkish
    }
  })
}

// Users export hook
export function useUsersExport() {
  return useExport({
    baseFilename: 'kullanicilar',
    title: 'Kullanıcı Listesi',
    columns: [
      { key: 'full_name', header: 'Ad Soyad' },
      { key: 'email', header: 'Email' },
      { key: 'role', header: 'Rol' },
      { key: 'phone', header: 'Telefon' },
      { key: 'iban', header: 'IBAN' },
      { key: 'is_active', header: 'Durum' },
      { key: 'created_at', header: 'Kayıt Tarihi', format: 'date' }
    ],
    dataTransformers: {
      'role': DataTransformers.roleToTurkish,
      'is_active': DataTransformers.booleanToTurkish
    }
  })
}

// Generic export hook for custom configurations
export function useCustomExport(options: UseExportOptions) {
  return useExport(options)
}

// Export with filtering hook
export interface UseFilteredExportOptions extends UseExportOptions {
  filterFn?: (item: any) => boolean
}

export function useFilteredExport({
  filterFn,
  ...exportOptions
}: UseFilteredExportOptions) {
  const { exportData: baseExportData, ...rest } = useExport(exportOptions)

  const exportData = useCallback(async (
    data: any[],
    format: ExportFormat,
    customFilename?: string
  ) => {
    const filteredData = filterFn ? data.filter(filterFn) : data
    return baseExportData(filteredData, format, customFilename)
  }, [baseExportData, filterFn])

  return {
    exportData,
    ...rest
  }
}

// Bulk export hook for multiple sheets/files
export interface BulkExportItem {
  data: any[]
  filename: string
  title?: string
  columns: ExportColumn[]
  dataTransformers?: Record<string, (value: any) => any>
}

export function useBulkExport() {
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const exportMultiple = useCallback(async (
    items: BulkExportItem[],
    format: ExportFormat
  ) => {
    setIsExporting(true)
    setExportError(null)
    setProgress({ current: 0, total: items.length })

    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        setProgress({ current: i + 1, total: items.length })

        const preparedData = prepareExportData(item.data, item.dataTransformers)
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_')

        const exportOptions: ExportOptions = {
          filename: `${item.filename}_${timestamp}`,
          title: item.title,
          subtitle: `Dışa Aktarma Tarihi: ${new Date().toLocaleDateString('tr-TR')}`,
          columns: item.columns,
          data: preparedData
        }

        switch (format) {
          case 'csv':
            exportToCSV(exportOptions)
            break
          case 'excel':
            exportToExcel(exportOptions)
            break
        }

        // Add delay between exports to prevent browser overwhelm
        if (i < items.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
    } catch (error: any) {
      console.error('Bulk export error:', error)
      setExportError(error.message || 'Toplu dışa aktarma sırasında hata oluştu')
    } finally {
      setIsExporting(false)
      setProgress({ current: 0, total: 0 })
    }
  }, [])

  const clearError = useCallback(() => {
    setExportError(null)
  }, [])

  return {
    exportMultiple,
    isExporting,
    exportError,
    progress,
    clearError
  }
}