'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  FileUp,
  Trash2,
  Info
} from 'lucide-react'
import { useInvalidateIncomes } from '@/hooks/use-incomes'
import { useInvalidateDashboard } from '@/hooks/use-dashboard'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager'
}

interface PreviewRow {
  rowNumber: number
  project_code: string
  project_id?: string
  gross_amount: number
  income_date: string
  description?: string
  vat_rate?: number
  collected_amount?: number
  collection_date?: string
  income_type?: 'ozel' | 'kamu'
  is_fsmh_income?: boolean
  is_tto_income?: boolean
}

interface ValidationError {
  row: number
  field: string
  message: string
}

interface PreviewData {
  totalRows: number
  validRows: number
  errorRows: number
  rows: PreviewRow[]
  errors: ValidationError[]
}

interface ImportResult {
  imported: number
  failed: number
  successIds: string[]
  failures: { row: number; error: string }[]
}

export default function ImportIncomesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const invalidateIncomes = useInvalidateIncomes()
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

      if (parsedUser.role !== 'admin' && parsedUser.role !== 'manager') {
        router.push('/dashboard')
        return
      }
    } catch (err) {
      router.push('/login')
    }
  }, [router])

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
      handleFileSelect(droppedFile)
    }
  }, [])

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFileSelect(selectedFile)
    }
  }

  const handleFileSelect = async (selectedFile: File) => {
    setError(null)
    setPreview(null)
    setImportResult(null)

    // Validate file type
    const fileName = selectedFile.name.toLowerCase()
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      setError('Sadece Excel dosyaları (.xlsx, .xls) kabul edilir')
      return
    }

    // Validate file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('Dosya boyutu 10MB\'dan küçük olmalı')
      return
    }

    setFile(selectedFile)
    await uploadForPreview(selectedFile)
  }

  const uploadForPreview = async (selectedFile: File) => {
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('preview', 'true')

      const response = await fetch('/api/incomes/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setPreview(data.data)
      } else {
        setError(data.error || 'Dosya işlenemedi')
      }
    } catch (err) {
      console.error('Preview error:', err)
      setError('Dosya yüklenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!file || !preview || preview.errorRows > 0) return

    setImporting(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/incomes/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setImportResult(data.data)
        invalidateIncomes()
        invalidateDashboard()
      } else {
        setError(data.error || 'Import işlemi başarısız')
      }
    } catch (err) {
      console.error('Import error:', err)
      setError('Import sırasında bir hata oluştu')
    } finally {
      setImporting(false)
    }
  }

  const clearFile = () => {
    setFile(null)
    setPreview(null)
    setImportResult(null)
    setError(null)
  }

  const downloadTemplate = () => {
    window.location.href = '/templates/gelir-import-sablonu.xlsx'
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy mx-auto"></div>
          <p className="mt-2 text-slate-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/incomes"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 hover:border-navy/30 transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Geri
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-navy flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-gold" />
              Toplu Gelir Ekle
            </h1>
            <p className="text-sm text-slate-500">Excel dosyasından toplu gelir kaydı oluşturun</p>
          </div>
        </div>

        {/* Import Result */}
        {importResult && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-gold" />
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-navy">Import Tamamlandı</h2>
                  <p className="text-sm text-slate-500">
                    {importResult.imported} kayıt başarıyla oluşturuldu
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-emerald-50 p-4 rounded-lg">
                  <p className="text-xs font-bold text-emerald-700 uppercase mb-1">Başarılı</p>
                  <p className="text-2xl font-black text-emerald-600">{importResult.imported}</p>
                </div>
                {importResult.failed > 0 && (
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-xs font-bold text-red-700 uppercase mb-1">Başarısız</p>
                    <p className="text-2xl font-black text-red-600">{importResult.failed}</p>
                  </div>
                )}
              </div>

              {importResult.failures.length > 0 && (
                <div className="bg-red-50 p-4 rounded-lg mb-4">
                  <p className="text-sm font-bold text-red-700 mb-2">Başarısız kayıtlar:</p>
                  <ul className="text-sm text-red-600 space-y-1">
                    {importResult.failures.map((f, i) => (
                      <li key={i}>Satır {f.row}: {f.error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-3">
                <Link
                  href="/dashboard/incomes"
                  className="flex-1 px-4 py-2.5 bg-navy text-white font-bold rounded-lg hover:bg-navy/90 transition-all text-center"
                >
                  Gelirlere Git
                </Link>
                <button
                  onClick={clearFile}
                  className="px-4 py-2.5 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-all"
                >
                  Yeni Import
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        {!importResult && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Upload Area */}
            <div className="lg:col-span-2 space-y-6">
              {/* Upload Section */}
              <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-navy to-gold" />
                <div className="p-6">
                  <h2 className="text-base font-bold text-navy mb-4 flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Excel Dosyası Yükle
                  </h2>

                  {!file ? (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                        isDragging
                          ? 'border-gold bg-gold/5'
                          : 'border-slate-200 hover:border-navy/30 hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                        <FileUp className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-slate-600 mb-2">
                        Excel dosyasını sürükleyip bırakın veya
                      </p>
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-navy text-white font-bold rounded-lg hover:bg-navy/90 cursor-pointer transition-all">
                        <Upload className="w-4 h-4" />
                        Dosya Seç
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleFileInputChange}
                          className="hidden"
                        />
                      </label>
                      <p className="text-xs text-slate-400 mt-3">
                        Desteklenen formatlar: .xlsx, .xls (max 10MB)
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-700">{file.name}</p>
                          <p className="text-xs text-slate-500">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={clearFile}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  )}

                  {error && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Preview Section */}
              {loading && (
                <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
                  <div className="flex items-center justify-center gap-3">
                    <Loader2 className="w-6 h-6 text-navy animate-spin" />
                    <p className="text-slate-600 font-medium">Dosya işleniyor...</p>
                  </div>
                </section>
              )}

              {preview && !loading && (
                <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="h-1 w-full bg-gradient-to-r from-navy to-gold" />
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-bold text-navy flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5" />
                        Önizleme
                      </h2>
                      <div className="flex gap-2">
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg">
                          {preview.validRows} Geçerli
                        </span>
                        {preview.errorRows > 0 && (
                          <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-lg">
                            {preview.errorRows} Hatalı
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Error List */}
                    {preview.errors.length > 0 && (
                      <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm font-bold text-red-700 mb-2 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Hatalı Satırlar
                        </p>
                        <ul className="text-sm text-red-600 space-y-1 max-h-40 overflow-y-auto">
                          {preview.errors.map((err, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="font-mono bg-red-100 px-1.5 py-0.5 rounded text-xs">
                                Satır {err.row}
                              </span>
                              <span className="font-semibold">{err.field}:</span>
                              {err.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Data Table */}
                    {preview.rows.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                            <tr>
                              <th className="px-3 py-3 text-left">Satır</th>
                              <th className="px-3 py-3 text-left">Proje Kodu</th>
                              <th className="px-3 py-3 text-left">Brüt Tutar</th>
                              <th className="px-3 py-3 text-left">Tarih</th>
                              <th className="px-3 py-3 text-left">Açıklama</th>
                              <th className="px-3 py-3 text-left">KDV %</th>
                              <th className="px-3 py-3 text-left">Tip</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {preview.rows.slice(0, 50).map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="px-3 py-2.5 text-slate-500">{row.rowNumber}</td>
                                <td className="px-3 py-2.5 font-semibold text-navy">{row.project_code}</td>
                                <td className="px-3 py-2.5 font-bold">
                                  ₺{row.gross_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-3 py-2.5 text-slate-600">
                                  {new Date(row.income_date).toLocaleDateString('tr-TR')}
                                </td>
                                <td className="px-3 py-2.5 text-slate-500 max-w-[150px] truncate">
                                  {row.description || '-'}
                                </td>
                                <td className="px-3 py-2.5 text-slate-600">%{row.vat_rate ?? '-'}</td>
                                <td className="px-3 py-2.5">
                                  <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                                    row.income_type === 'kamu'
                                      ? 'bg-gold/20 text-gold'
                                      : 'bg-navy/10 text-navy'
                                  }`}>
                                    {row.income_type === 'kamu' ? 'KAMU' : 'ÖZEL'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {preview.rows.length > 50 && (
                          <p className="text-center text-sm text-slate-500 py-3">
                            ... ve {preview.rows.length - 50} satır daha
                          </p>
                        )}
                      </div>
                    )}

                    {/* Import Button */}
                    <div className="mt-6 flex justify-end gap-3">
                      <button
                        onClick={clearFile}
                        className="px-4 py-2.5 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-all"
                      >
                        İptal
                      </button>
                      <button
                        onClick={handleImport}
                        disabled={importing || preview.errorRows > 0 || preview.validRows === 0}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gold text-white font-bold rounded-lg hover:bg-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-gold/20"
                      >
                        {importing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Import Ediliyor...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            {preview.validRows} Kaydı Import Et
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </section>
              )}
            </div>

            {/* Right Column - Instructions */}
            <div className="space-y-6">
              {/* Template Download */}
              <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-navy to-gold" />
                <div className="p-5">
                  <h2 className="text-base font-bold text-navy mb-4 flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Şablon İndir
                  </h2>
                  <p className="text-sm text-slate-500 mb-4">
                    Örnek Excel şablonunu indirerek başlayın. Şablon tüm gerekli sütunları ve örnek verileri içerir.
                  </p>
                  <button
                    onClick={downloadTemplate}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-navy text-white font-bold rounded-lg hover:bg-navy/90 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Şablonu İndir
                  </button>
                </div>
              </section>

              {/* Column Info */}
              <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-navy to-gold" />
                <div className="p-5">
                  <h2 className="text-base font-bold text-navy mb-4 flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    Kolon Bilgileri
                  </h2>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded">Zorunlu</span>
                      <div>
                        <p className="font-semibold text-slate-700">Proje Kodu</p>
                        <p className="text-slate-500 text-xs">Sistemdeki proje kodu</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded">Zorunlu</span>
                      <div>
                        <p className="font-semibold text-slate-700">Brüt Tutar</p>
                        <p className="text-slate-500 text-xs">KDV dahil tutar (TL)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded">Zorunlu</span>
                      <div>
                        <p className="font-semibold text-slate-700">Gelir Tarihi</p>
                        <p className="text-slate-500 text-xs">DD.MM.YYYY formatında</p>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3 mt-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Opsiyonel</p>
                    </div>

                    <div>
                      <p className="font-semibold text-slate-700">Açıklama</p>
                      <p className="text-slate-500 text-xs">Serbest metin</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700">KDV Oranı</p>
                      <p className="text-slate-500 text-xs">Varsayılan: projeden alınır</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700">Tahsil Edilen</p>
                      <p className="text-slate-500 text-xs">Tahsil edilen tutar</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700">Tahsil Tarihi</p>
                      <p className="text-slate-500 text-xs">Son tahsil tarihi</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700">Gelir Tipi</p>
                      <p className="text-slate-500 text-xs">Özel / Kamu (Varsayılan: Özel)</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700">FSMH Geliri</p>
                      <p className="text-slate-500 text-xs">Evet / Hayır (Varsayılan: Hayır)</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700">TTO Geliri</p>
                      <p className="text-slate-500 text-xs">Evet / Hayır (Varsayılan: Evet)</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Validation Info */}
              <section className="bg-amber-50 rounded-xl border border-amber-200 p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-700 mb-2">Dikkat Edilecekler</p>
                    <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                      <li>Proje aktif ve hakem onaylı olmalı</li>
                      <li>Toplam gelir proje bütçesini aşamaz</li>
                      <li>Tarih formatı: DD.MM.YYYY</li>
                      <li>Sayılar virgül veya nokta ayıraçlı olabilir</li>
                    </ul>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
