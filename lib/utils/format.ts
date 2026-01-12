/**
 * Merkezi para formatı utility'si
 * Tüm formatCurrency kullanımları bu dosyadan import edilmeli
 */

/**
 * Standart para formatı - Finansal hesaplamalar için
 * Çıktı: ₺1.234,56
 */
export function formatCurrencyStandard(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Chart için para formatı - Tam sayı gösterim
 * Çıktı: 1.234 ₺
 */
export function formatCurrencyChart(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value) + ' \u20BA'
}

/**
 * Excel export için para formatı
 * Çıktı: ₺1.234,56
 */
export function formatCurrencyExcel(amount: number | null | undefined): string {
  return `₺${(amount || 0).toLocaleString('tr-TR')}`
}

/**
 * Input alanları için para formatı - Sembol yok
 * Türk formatı: nokta binlik ayracı, virgül ondalık ayracı
 * Çıktı: 1.234,56
 */
export function formatCurrencyInput(val: string | number): string {
  if (!val && val !== 0) return ''
  let parts = val.toString().split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return parts.join(',')
}

/**
 * Input alanlarından gelen değeri parse et
 * Girdi: 1.234,56 -> Çıktı: 1234.56
 */
export function parseCurrencyInput(val: string): number {
  if (!val) return 0
  // Türk formatından JavaScript number formatına çevir
  const normalized = val.replace(/\./g, '').replace(',', '.')
  return parseFloat(normalized) || 0
}

/**
 * Kısa para formatı - Büyük sayılar için
 * Çıktı: ₺1,2M veya ₺150K
 */
export function formatCurrencyShort(amount: number): string {
  if (amount >= 1000000) {
    return `₺${(amount / 1000000).toFixed(1).replace('.', ',')}M`
  }
  if (amount >= 1000) {
    return `₺${(amount / 1000).toFixed(0)}K`
  }
  return `₺${amount.toFixed(0)}`
}

// Legacy uyumluluk - FinancialValidation objesi için
export const formatCurrency = {
  standard: formatCurrencyStandard,
  chart: formatCurrencyChart,
  excel: formatCurrencyExcel,
  input: formatCurrencyInput,
  short: formatCurrencyShort,
  parse: parseCurrencyInput
}

// Default export - en çok kullanılan format
export default formatCurrencyStandard
