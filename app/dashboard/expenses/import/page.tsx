'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import {
  Upload,
  ArrowLeft,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  Building2,
  Receipt
} from 'lucide-react'
import { useInvalidateExpenses } from '@/hooks/use-expenses'
import { useInvalidateDashboard } from '@/hooks/use-dashboard'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager'
}

interface PreviewRow {
  rowNumber: number
  giderTipi: string
  projeKodu: string
  tutar: string
  aciklama: string
  giderTarihi: string
  gideriOdeyen: string
  hasError: boolean
  errorMessage?: string
}

interface ValidationError {
  row: number
  column: string
  message: string
}

interface ImportResult {
  imported: number
  total_amount: number
  errors?: ValidationError[]
}

export default function ExpenseImportPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<PreviewRow[]>([])
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const router = useRouter()
  const invalidateExpenses = useInvalidateExpenses()
  const invalidateDashboard = useInvalidateDashboard()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    try {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)

      if (!['admin', 'manager'].includes(parsedUser.role)) {
        router.push('/dashboard')
        return
      }
      setLoading(false)
    } catch (err) {
      router.push('/login')
    }
  }, [router])

  const parseExcelFile = async (file: File) => {
    setParseError(null)
    setValidationErrors([])
    setImportResult(null)

    try {
      // Dynamically import xlsx
      const XLSX = await import('xlsx')

      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true })

      const sheetName = workbook.SheetNames[0]
      if (!sheetName) {
        setParseError('Excel dosyası boş')
        return
      }

      const sheet = workbook.Sheets[sheetName]
      const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

      if (rows.length === 0) {
        setParseError('Excel dosyasında veri bulunamadı')
        return
      }

      const preview: PreviewRow[] = rows.map((row, index) => {
        const errors: string[] = []

        // Gider Tipi validation
        const giderTipi = row['Gider Tipi']?.toString().trim() || ''
        if (!giderTipi || !['genel', 'proje'].includes(giderTipi.toLowerCase())) {
          errors.push("Gider tipi 'Genel' veya 'Proje' olmalı")
        }

        // Proje Kodu validation
        const projeKodu = row['Proje Kodu']?.toString().trim() || ''
        if (giderTipi.toLowerCase() === 'proje' && !projeKodu) {
          errors.push('Proje gideri için proje kodu zorunlu')
        }

        // Tutar validation
        let tutar = row['Tutar']
        if (typeof tutar === 'number') {
          tutar = tutar.toString()
        } else {
          tutar = tutar?.toString().trim() || ''
        }
        const tutarNum = parseFloat(tutar.replace(',', '.'))
        if (!tutar || isNaN(tutarNum)) {
          errors.push('Tutar geçersiz')
        } else if (tutarNum <= 0) {
          errors.push("Tutar 0'dan büyük olmalı")
        }

        // Açıklama validation
        const aciklama = row['Açıklama']?.toString().trim() || ''
        if (!aciklama) {
          errors.push('Açıklama zorunlu')
        }

        // Gider Tarihi
        let giderTarihi = ''
        const rawDate = row['Gider Tarihi']
        if (rawDate) {
          if (rawDate instanceof Date) {
            giderTarihi = rawDate.toLocaleDateString('tr-TR')
          } else if (typeof rawDate === 'number') {
            // Excel serial date
            const date = XLSX.SSF.parse_date_code(rawDate)
            if (date) {
              giderTarihi = `${String(date.d).padStart(2, '0')}.${String(date.m).padStart(2, '0')}.${date.y}`
            }
          } else {
            giderTarihi = rawDate.toString().trim()
          }
        }

        // Gideri Ödeyen
        const gideriOdeyen = row['Gideri Ödeyen']?.toString().trim() || 'TTO'

        return {
          rowNumber: index + 2,
          giderTipi: giderTipi || '-',
          projeKodu: projeKodu || '-',
          tutar: tutar || '-',
          aciklama: aciklama || '-',
          giderTarihi: giderTarihi || 'Bugün',
          gideriOdeyen: gideriOdeyen,
          hasError: errors.length > 0,
          errorMessage: errors.length > 0 ? errors.join(', ') : undefined
        }
      })

      setPreviewData(preview)

      // Set validation errors for display
      const allErrors: ValidationError[] = []
      preview.forEach((row) => {
        if (row.hasError && row.errorMessage) {
          row.errorMessage.split(', ').forEach((msg) => {
            allErrors.push({
              row: row.rowNumber,
              column: '',
              message: msg
            })
          })
        }
      })
      setValidationErrors(allErrors)
    } catch (error) {
      console.error('Excel parse error:', error)
      setParseError('Excel dosyası okunamadı. Lütfen geçerli bir Excel dosyası yükleyin.')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      parseExcelFile(selectedFile)
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ]
      if (validTypes.includes(droppedFile.type) || droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls')) {
        setFile(droppedFile)
        parseExcelFile(droppedFile)
      } else {
        setParseError('Lütfen Excel dosyası (.xlsx, .xls) yükleyin')
      }
    }
  }, [])

  const handleClearFile = () => {
    setFile(null)
    setPreviewData([])
    setValidationErrors([])
    setImportResult(null)
    setParseError(null)
  }

  const handleImport = async () => {
    if (!file) return

    setImporting(true)
    setImportResult(null)

    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/expenses/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setImportResult(data.data)
        invalidateExpenses()
        invalidateDashboard()

        // Clear preview if no errors in result
        if (!data.data.errors || data.data.errors.length === 0) {
          setPreviewData([])
          setFile(null)
        } else {
          // Update validation errors from server
          setValidationErrors(data.data.errors)
        }
      } else {
        if (data.data?.errors) {
          setValidationErrors(data.data.errors)
        }
        setParseError(data.error || 'İçe aktarma başarısız')
      }
    } catch (error) {
      console.error('Import error:', error)
      setParseError('İçe aktarma sırasında bir hata oluştu')
    } finally {
      setImporting(false)
    }
  }

  const validRowCount = previewData.filter(r => !r.hasError).length
  const errorRowCount = previewData.filter(r => r.hasError).length

  if (loading || !user) {
    return (
      <DashboardLayout user={user || { id: '', full_name: 'Yükleniyor...', email: '', role: 'manager' }}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy mx-auto"></div>
            <p className="mt-2 text-slate-600">Yükleniyor...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/expenses"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 hover:border-navy/30 transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Geri
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-navy flex items-center gap-2">
              <Upload className="w-6 h-6 text-gold" />
              Toplu Gider Aktarımı
            </h1>
            <p className="text-sm text-slate-500">Excel dosyasından birden fazla gider kaydı aktarın</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Upload & Preview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Success Result */}
            {importResult && importResult.imported > 0 && (
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-emerald-800">Aktarım Başarılı!</h3>
                    <p className="text-emerald-700 mt-1">
                      <span className="font-bold">{importResult.imported}</span> gider kaydı başarıyla aktarıldı.
                      <br />
                      Toplam tutar: <span className="font-bold">₺{importResult.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                    </p>
                    {importResult.errors && importResult.errors.length > 0 && (
                      <p className="text-amber-700 mt-2 text-sm">
                        {importResult.errors.length} satırda hata oluştu ve aktarılamadı.
                      </p>
                    )}
                    <div className="mt-4 flex gap-3">
                      <Link
                        href="/dashboard/expenses"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-all"
                      >
                        Giderleri Görüntüle
                      </Link>
                      <button
                        onClick={handleClearFile}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white text-emerald-700 font-semibold rounded-lg border border-emerald-300 hover:bg-emerald-50 transition-all"
                      >
                        Yeni Aktarım
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Area */}
            {!importResult?.imported && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-navy to-gold" />
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-navy flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5" />
                      Excel Dosyası Yükle
                    </h2>
                    <a
                      href="/templates/gider-import-sablonu.xlsx"
                      download
                      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gold hover:text-gold/80 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Örnek Şablon İndir
                    </a>
                  </div>

                  {!file ? (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                        isDragging
                          ? 'border-gold bg-gold/5'
                          : 'border-slate-200 hover:border-navy/30'
                      }`}
                    >
                      <div className="w-16 h-16 rounded-2xl bg-navy/10 flex items-center justify-center mx-auto mb-4">
                        <Upload className="w-8 h-8 text-navy" />
                      </div>
                      <p className="text-slate-700 font-semibold mb-2">
                        Excel dosyasını sürükleyip bırakın
                      </p>
                      <p className="text-sm text-slate-500 mb-4">veya</p>
                      <label className="inline-flex items-center gap-2 px-6 py-3 bg-navy text-white font-bold rounded-lg hover:bg-navy/90 transition-all cursor-pointer shadow-lg shadow-navy/20">
                        <FileSpreadsheet className="w-5 h-5" />
                        Dosya Seç
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                      <p className="text-xs text-slate-400 mt-4">
                        Desteklenen formatlar: .xlsx, .xls
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                          <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-700">{file.name}</p>
                          <p className="text-sm text-slate-500">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleClearFile}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Dosyayı Kaldır"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  )}

                  {parseError && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">{parseError}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Preview Table */}
            {previewData.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-navy to-gold" />
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-navy">Önizleme</h2>
                    <div className="flex items-center gap-3">
                      {validRowCount > 0 && (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                          {validRowCount} geçerli
                        </span>
                      )}
                      {errorRowCount > 0 && (
                        <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                          {errorRowCount} hatalı
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                        <tr>
                          <th className="px-4 py-3 text-left">Satır</th>
                          <th className="px-4 py-3 text-left">Gider Tipi</th>
                          <th className="px-4 py-3 text-left">Proje Kodu</th>
                          <th className="px-4 py-3 text-right">Tutar</th>
                          <th className="px-4 py-3 text-left">Açıklama</th>
                          <th className="px-4 py-3 text-left">Tarih</th>
                          <th className="px-4 py-3 text-left">Ödeyen</th>
                          <th className="px-4 py-3 text-center">Durum</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewData.map((row, idx) => (
                          <tr
                            key={idx}
                            className={row.hasError ? 'bg-red-50' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                          >
                            <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                              {row.rowNumber}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold ${
                                row.giderTipi.toLowerCase() === 'genel'
                                  ? 'bg-gold/20 text-gold'
                                  : row.giderTipi.toLowerCase() === 'proje'
                                  ? 'bg-navy/10 text-navy'
                                  : 'bg-slate-100 text-slate-500'
                              }`}>
                                {row.giderTipi.toLowerCase() === 'genel' ? (
                                  <Receipt className="w-3 h-3" />
                                ) : row.giderTipi.toLowerCase() === 'proje' ? (
                                  <Building2 className="w-3 h-3" />
                                ) : null}
                                {row.giderTipi}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-700">
                              {row.projeKodu}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-gold">
                              {row.tutar !== '-' ? `₺${parseFloat(row.tutar.replace(',', '.')).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-slate-700 max-w-[200px] truncate" title={row.aciklama}>
                              {row.aciklama}
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-xs">
                              {row.giderTarihi}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                                row.gideriOdeyen.toLowerCase() === 'tto'
                                  ? 'bg-navy/10 text-navy'
                                  : row.gideriOdeyen.toLowerCase() === 'ortak'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-gold/20 text-gold'
                              }`}>
                                {row.gideriOdeyen}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {row.hasError ? (
                                <div className="flex items-center justify-center" title={row.errorMessage}>
                                  <XCircle className="w-5 h-5 text-red-500" />
                                </div>
                              ) : (
                                <div className="flex items-center justify-center">
                                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Import Button */}
                  {validRowCount > 0 && (
                    <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-200">
                      <p className="text-sm text-slate-500">
                        <span className="font-bold text-navy">{validRowCount}</span> gider kaydı aktarılacak
                        {errorRowCount > 0 && (
                          <span className="text-red-500 ml-2">({errorRowCount} hatalı satır atlanacak)</span>
                        )}
                      </p>
                      <button
                        onClick={handleImport}
                        disabled={importing}
                        className="flex items-center gap-2 px-6 py-3 bg-gold text-white font-bold rounded-lg hover:bg-gold/90 disabled:opacity-50 transition-all shadow-lg shadow-gold/20"
                      >
                        {importing ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Aktarılıyor...
                          </>
                        ) : (
                          <>
                            <Upload className="w-5 h-5" />
                            Giderleri Aktar
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
                <div className="h-1 w-full bg-red-500" />
                <div className="p-6">
                  <h2 className="text-base font-bold text-red-700 flex items-center gap-2 mb-4">
                    <AlertCircle className="w-5 h-5" />
                    Hata Detayları ({validationErrors.length})
                  </h2>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {validationErrors.map((error, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 bg-red-50 rounded-lg"
                      >
                        <span className="px-2 py-1 bg-red-200 text-red-800 text-xs font-bold rounded">
                          Satır {error.row}
                        </span>
                        <p className="text-sm text-red-700">{error.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Info */}
          <div className="space-y-6">
            {/* File Format Info */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-navy to-gold" />
              <div className="p-5">
                <h3 className="text-base font-bold text-navy mb-4">Excel Dosya Formatı</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded bg-red-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-red-700">*</span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700">Gider Tipi</p>
                      <p className="text-xs text-slate-500">"Genel" veya "Proje"</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-amber-700">?</span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700">Proje Kodu</p>
                      <p className="text-xs text-slate-500">Proje gideri için zorunlu</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded bg-red-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-red-700">*</span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700">Tutar</p>
                      <p className="text-xs text-slate-500">Gider tutarı (TL)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded bg-red-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-red-700">*</span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700">Açıklama</p>
                      <p className="text-xs text-slate-500">Gider açıklaması</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-slate-500">-</span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700">Gider Tarihi</p>
                      <p className="text-xs text-slate-500">Varsayılan: bugün</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-slate-500">-</span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700">Gideri Ödeyen</p>
                      <p className="text-xs text-slate-500">TTO / Ortak / Karşı Taraf</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payer Type Info */}
            <div className="bg-navy/5 rounded-xl border border-navy/10 p-5">
              <h3 className="text-sm font-bold text-navy mb-4">"Gideri Ödeyen" Açıklaması</h3>
              <ul className="space-y-3 text-xs text-slate-600">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-navy/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-navy">T</span>
                  </div>
                  <div>
                    <span className="font-bold text-navy">TTO</span>
                    <p className="text-slate-500 mt-0.5">Sadece TTO bakiyesinden düşer</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-purple-700">O</span>
                  </div>
                  <div>
                    <span className="font-bold text-purple-700">Ortak</span>
                    <p className="text-slate-500 mt-0.5">TTO + Temsilciler oransal paylaşır</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-gold/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-gold">K</span>
                  </div>
                  <div>
                    <span className="font-bold text-gold">Karşı Taraf</span>
                    <p className="text-slate-500 mt-0.5">Dağıtılabilir tutardan düşer</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Download Template Button */}
            <a
              href="/templates/gider-import-sablonu.xlsx"
              download
              className="flex items-center justify-center gap-2 w-full px-6 py-4 bg-gold text-white font-bold rounded-xl hover:bg-gold/90 transition-all shadow-lg shadow-gold/20"
            >
              <Download className="w-5 h-5" />
              Örnek Şablon İndir
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
