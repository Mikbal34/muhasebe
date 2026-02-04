/**
 * Proje belge kategorisi tespit ve yardımcı fonksiyonlar
 * Toplu belge import işlemi için kullanılır
 */

export type DocumentCategory = 'sozlesme' | 'ek_sozlesme' | 'gorevlendirme' | 'hakem_onay'

/**
 * Dosya adından belge kategorisini tespit eder
 * @param fileName - Dosya adı
 * @returns Tespit edilen kategori
 */
export function detectCategory(fileName: string): DocumentCategory {
  const lower = fileName.toLowerCase()
  const original = fileName

  // 1. Ek sözleşme (önce kontrol - daha spesifik)
  if (/ek.?sözleşme|ek.?sozlesme|ek_sozlesme|ek sozlesme/i.test(lower)) {
    return 'ek_sozlesme'
  }

  // 2. Sözleşme (şartname, sonlandırma, fesih dahil)
  if (/sözleşme|sozlesme|contract|şartname|sartname|sonlandır|sonlandir|fesih/i.test(lower)) {
    return 'sozlesme'
  }

  // 3. Görevlendirme (izin dahil)
  if (/görev|gorev|izin/i.test(lower)) {
    return 'gorevlendirme'
  }

  // 4. Hakem onay - açık anahtar kelimeler
  if (/karar|onay|uyk|hakem/i.test(lower)) {
    return 'hakem_onay'
  }

  // 5. Hakem onay - akademik unvan ile başlayan (Prof, Doç, Dr., Arş)
  if (/^(Prof|Doç|Doc|Dr\.|Arş|Ars)/i.test(original)) {
    return 'hakem_onay'
  }

  // 6. Hakem onay - kişi ismi formatı (Büyük harfle başlayan ad_soyad veya ad soyad)
  // Türkçe karakterler dahil: Ç, Ğ, İ, Ö, Ş, Ü
  if (/^[A-ZÇĞİÖŞÜ][a-zçğıöşü]+[\s_][A-ZÇĞİÖŞÜ][a-zçğıöşü]+/.test(original)) {
    return 'hakem_onay'
  }

  // 7. Varsayılan: hakem onay (kişi belgeleri çoğunlukla bu kategoride)
  return 'hakem_onay'
}

/**
 * Klasör adından YTÜTTO proje kodunu parse eder
 * @param folderName - Klasör adı
 * @returns Proje kodu (YTÜTTO123 formatında) veya null
 */
export function parseProjectCode(folderName: string): string | null {
  // YTÜTTO veya YTUTTO formatlarını yakala (büyük/küçük harf duyarsız)
  const match = folderName.match(/YT[ÜU]TTO?[\s_-]?(\d+)/i)
  if (match) {
    return `YTÜTTO${match[1]}`
  }
  return null
}

/**
 * Dosya adını storage için uygun formata dönüştürür
 * @param originalName - Orijinal dosya adı
 * @returns Timestamp ile birlikte formatlanmış dosya adı
 */
export function formatStorageFileName(originalName: string): string {
  const timestamp = Date.now()
  // Dosya uzantısını ayır
  const lastDot = originalName.lastIndexOf('.')
  const ext = lastDot > -1 ? originalName.substring(lastDot) : ''
  const baseName = lastDot > -1 ? originalName.substring(0, lastDot) : originalName

  // Özel karakterleri temizle ve lowercase yap
  const cleanName = baseName
    .toLowerCase()
    .replace(/[^a-z0-9çğıöşü_-]/gi, '_')
    .replace(/_+/g, '_')
    .substring(0, 50) // Max 50 karakter

  return `${timestamp}_${cleanName}${ext.toLowerCase()}`
}

/**
 * Storage bucket path oluşturur
 * @param projectId - Proje UUID
 * @param category - Belge kategorisi
 * @param fileName - Dosya adı
 * @returns Storage path
 */
export function buildStoragePath(
  projectId: string,
  category: DocumentCategory,
  fileName: string
): string {
  const categoryFolder = getCategoryFolderName(category)
  return `${projectId}/${categoryFolder}/${fileName}`
}

/**
 * Kategori için klasör adını döndürür
 */
export function getCategoryFolderName(category: DocumentCategory): string {
  switch (category) {
    case 'sozlesme':
      return 'sozlesme'
    case 'ek_sozlesme':
      return 'ek_sozlesme'
    case 'gorevlendirme':
      return 'gorevlendirme'
    case 'hakem_onay':
      return 'hakem_onay'
    default:
      return 'diger'
  }
}

/**
 * Kategori için Türkçe label döndürür
 */
export function getCategoryLabel(category: DocumentCategory): string {
  switch (category) {
    case 'sozlesme':
      return 'Sözleşme'
    case 'ek_sozlesme':
      return 'Ek Sözleşme'
    case 'gorevlendirme':
      return 'Görevlendirme Yazısı'
    case 'hakem_onay':
      return 'Hakem Onay Belgesi'
    default:
      return 'Diğer'
  }
}

/**
 * Kategori için veritabanı alanını döndürür
 */
export function getCategoryDbField(category: DocumentCategory): string | null {
  switch (category) {
    case 'sozlesme':
      return 'contract_path'
    case 'gorevlendirme':
      return 'assignment_document_path'
    case 'hakem_onay':
      return 'referee_approval_document_path'
    case 'ek_sozlesme':
      return null // supplementary_contracts tablosunda
    default:
      return null
  }
}

export interface DocumentImportResult {
  fileName: string
  projectCode: string | null
  category: DocumentCategory
  storagePath: string | null
  status: 'success' | 'error' | 'skipped'
  error?: string
}

export interface DocumentImportSummary {
  total: number
  success: number
  error: number
  skipped: number
  byCategory: Record<DocumentCategory, number>
}

/**
 * Import sonuçlarını özetler
 */
export function summarizeImportResults(results: DocumentImportResult[]): DocumentImportSummary {
  const summary: DocumentImportSummary = {
    total: results.length,
    success: 0,
    error: 0,
    skipped: 0,
    byCategory: {
      sozlesme: 0,
      ek_sozlesme: 0,
      gorevlendirme: 0,
      hakem_onay: 0
    }
  }

  for (const result of results) {
    if (result.status === 'success') {
      summary.success++
      summary.byCategory[result.category]++
    } else if (result.status === 'error') {
      summary.error++
    } else {
      summary.skipped++
    }
  }

  return summary
}
