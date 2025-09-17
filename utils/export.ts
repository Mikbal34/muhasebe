// Data export utilities for Excel and PDF generation

export interface ExportColumn {
  key: string
  header: string
  width?: number
  format?: 'text' | 'number' | 'currency' | 'date' | 'percentage'
}

export interface ExportOptions {
  filename: string
  title?: string
  subtitle?: string
  columns: ExportColumn[]
  data: any[]
  summary?: Record<string, any>
}

// Format data based on column type
export function formatCellData(value: any, format: ExportColumn['format'] = 'text'): string {
  if (value === null || value === undefined) return ''

  switch (format) {
    case 'currency':
      return typeof value === 'number'
        ? `₺${value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : value.toString()

    case 'number':
      return typeof value === 'number'
        ? value.toLocaleString('tr-TR')
        : value.toString()

    case 'percentage':
      return typeof value === 'number'
        ? `%${value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : value.toString()

    case 'date':
      if (value instanceof Date) {
        return value.toLocaleDateString('tr-TR')
      } else if (typeof value === 'string') {
        return new Date(value).toLocaleDateString('tr-TR')
      }
      return value.toString()

    case 'text':
    default:
      return value.toString()
  }
}

// Generate CSV data
export function generateCSV(options: ExportOptions): string {
  const { columns, data, title, subtitle } = options

  let csv = ''

  // Add title and subtitle if provided
  if (title) {
    csv += `"${title}"\n`
  }
  if (subtitle) {
    csv += `"${subtitle}"\n`
  }
  if (title || subtitle) {
    csv += '\n'
  }

  // Add headers
  csv += columns.map(col => `"${col.header}"`).join(',') + '\n'

  // Add data rows
  data.forEach(row => {
    const values = columns.map(col => {
      const value = getNestedValue(row, col.key)
      const formatted = formatCellData(value, col.format)
      return `"${formatted.replace(/"/g, '""')}"` // Escape quotes
    })
    csv += values.join(',') + '\n'
  })

  return csv
}

// Get nested object value by key path (e.g., 'user.name')
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}

// Download file
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

// Export to CSV
export function exportToCSV(options: ExportOptions): void {
  const csv = generateCSV(options)
  downloadFile(csv, `${options.filename}.csv`, 'text/csv;charset=utf-8;')
}

// Export to Excel - DEPRECATED: Use server-side API instead
export function exportToExcel(options: ExportOptions): void {
  alert('Excel export fonksiyonu güncellendi. Lütfen raporlar sayfasından Excel indirin.')
  throw new Error('Excel export deprecated. Use server-side API endpoint instead.')
}

// Project export configurations
export const ProjectExportConfig: ExportColumn[] = [
  { key: 'code', header: 'Proje Kodu', width: 150 },
  { key: 'name', header: 'Proje Adı', width: 250 },
  { key: 'budget', header: 'Bütçe', format: 'currency', width: 150 },
  { key: 'start_date', header: 'Başlangıç Tarihi', format: 'date', width: 120 },
  { key: 'end_date', header: 'Bitiş Tarihi', format: 'date', width: 120 },
  { key: 'company_rate', header: 'Şirket Komisyonu', format: 'percentage', width: 120 },
  { key: 'status', header: 'Durum', width: 100 },
  { key: 'created_by_user.full_name', header: 'Oluşturan', width: 150 }
]

// Income export configurations
export const IncomeExportConfig: ExportColumn[] = [
  { key: 'project.code', header: 'Proje Kodu', width: 120 },
  { key: 'project.name', header: 'Proje Adı', width: 200 },
  { key: 'gross_amount', header: 'Brüt Tutar', format: 'currency', width: 120 },
  { key: 'vat_rate', header: 'KDV Oranı', format: 'percentage', width: 100 },
  { key: 'vat_amount', header: 'KDV Tutarı', format: 'currency', width: 120 },
  { key: 'net_amount', header: 'Net Tutar', format: 'currency', width: 120 },
  { key: 'income_date', header: 'Gelir Tarihi', format: 'date', width: 120 },
  { key: 'description', header: 'Açıklama', width: 200 },
  { key: 'created_by_user.full_name', header: 'Kaydeden', width: 150 }
]

// Payment export configurations
export const PaymentExportConfig: ExportColumn[] = [
  { key: 'instruction_number', header: 'Talimat No', width: 150 },
  { key: 'user.full_name', header: 'Alıcı', width: 150 },
  { key: 'user.email', header: 'Email', width: 200 },
  { key: 'user.iban', header: 'IBAN', width: 200 },
  { key: 'total_amount', header: 'Toplam Tutar', format: 'currency', width: 120 },
  { key: 'status', header: 'Durum', width: 100 },
  { key: 'created_at', header: 'Oluşturma Tarihi', format: 'date', width: 120 },
  { key: 'approved_at', header: 'Onay Tarihi', format: 'date', width: 120 },
  { key: 'notes', header: 'Notlar', width: 200 }
]

// Balance export configurations
export const BalanceExportConfig: ExportColumn[] = [
  { key: 'user.full_name', header: 'Kullanıcı', width: 150 },
  { key: 'user.email', header: 'Email', width: 200 },
  { key: 'user.role', header: 'Rol', width: 120 },
  { key: 'balance', header: 'Bakiye', format: 'currency', width: 120 },
  { key: 'user.iban', header: 'IBAN', width: 200 },
  { key: 'user.phone', header: 'Telefon', width: 150 }
]

// User export configurations
export const UserExportConfig: ExportColumn[] = [
  { key: 'full_name', header: 'Ad Soyad', width: 150 },
  { key: 'email', header: 'Email', width: 200 },
  { key: 'role', header: 'Rol', width: 120 },
  { key: 'phone', header: 'Telefon', width: 150 },
  { key: 'iban', header: 'IBAN', width: 200 },
  { key: 'is_active', header: 'Durum', width: 100 },
  { key: 'created_at', header: 'Kayıt Tarihi', format: 'date', width: 120 }
]

// Helper function to prepare data for export
export function prepareExportData(data: any[], transformers?: Record<string, (value: any) => any>): any[] {
  if (!transformers) return data

  return data.map(item => {
    const transformed = { ...item }

    Object.keys(transformers).forEach(key => {
      const value = getNestedValue(item, key)
      if (value !== undefined) {
        setNestedValue(transformed, key, transformers[key](value))
      }
    })

    return transformed
  })
}

// Set nested object value by key path
function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.')
  const lastKey = keys.pop()!
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {}
    return current[key]
  }, obj)
  target[lastKey] = value
}

// Data transformers for common use cases
export const DataTransformers = {
  // Transform boolean to Turkish text
  booleanToTurkish: (value: boolean) => value ? 'Aktif' : 'Pasif',

  // Transform role to Turkish
  roleToTurkish: (role: string) => {
    const roles: Record<string, string> = {
      'admin': 'Yönetici',
      'finance_officer': 'Mali İşler Uzmanı',
      'academician': 'Akademisyen'
    }
    return roles[role] || role
  },

  // Transform status to Turkish
  statusToTurkish: (status: string) => {
    const statuses: Record<string, string> = {
      'active': 'Aktif',
      'completed': 'Tamamlandı',
      'cancelled': 'İptal Edildi',
      'pending': 'Bekliyor',
      'approved': 'Onaylandı',
      'processing': 'İşleniyor',
      'rejected': 'Reddedildi'
    }
    return statuses[status] || status
  }
}