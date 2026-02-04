'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import {
  ArrowLeft,
  Upload,
  FolderOpen,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  Eye,
  RefreshCw,
  FileCheck,
  FileX,
  Loader2,
  BarChart3
} from 'lucide-react'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager'
}

interface FileToImport {
  fileName: string
  folderName: string
  file: File
  category?: string
  projectCode?: string
}

interface ImportResult {
  fileName: string
  projectCode: string | null
  category: string
  storagePath: string | null
  status: 'success' | 'error' | 'skipped'
  error?: string
}

interface ImportSummary {
  total: number
  success: number
  error: number
  skipped: number
  byCategory: Record<string, number>
}

interface DocumentStats {
  totalProjects: number
  withContract: number
  withAssignment: number
  withRefereeApproval: number
  withSupplementary: number
  missingContract: number
  missingAssignment: number
  missingRefereeApproval: number
}

const categoryLabels: Record<string, string> = {
  sozlesme: 'Sözleşme',
  ek_sozlesme: 'Ek Sözleşme',
  gorevlendirme: 'Görevlendirme',
  hakem_onay: 'Hakem Onay'
}

const categoryColors: Record<string, string> = {
  sozlesme: 'bg-blue-100 text-blue-700',
  ek_sozlesme: 'bg-purple-100 text-purple-700',
  gorevlendirme: 'bg-amber-100 text-amber-700',
  hakem_onay: 'bg-emerald-100 text-emerald-700'
}

export default function DocumentImportPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DocumentStats | null>(null)
  const [files, setFiles] = useState<FileToImport[]>([])
  const [importing, setImporting] = useState(false)
  const [dryRunResults, setDryRunResults] = useState<ImportResult[] | null>(null)
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const router = useRouter()

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

      if (parsedUser.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      fetchStats(token)
    } catch (err) {
      router.push('/login')
    }
  }, [router])

  const fetchStats = async (token: string) => {
    try {
      const response = await fetch('/api/projects/documents/import', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (data.success) {
        setStats(data.data)
      }
    } catch (err) {
      console.error('Stats fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFolderSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles) return

    const fileList: FileToImport[] = []

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]
      // webkitRelativePath formatı: "folder/subfolder/file.pdf"
      const relativePath = (file as any).webkitRelativePath || file.name
      const pathParts = relativePath.split('/')

      // Ana klasör adı (YTÜTTO kodu içermeli)
      // Yapı: "Ana Klasör/Proje Klasör/dosya.pdf" veya "Proje Klasör/dosya.pdf"
      let folderName = pathParts.length > 1 ? pathParts[pathParts.length - 2] : ''

      // Eğer proje kodu bulunamazsa bir üst klasöre bak
      if (folderName && !folderName.match(/YT[ÜU]TTO/i) && pathParts.length > 2) {
        folderName = pathParts[pathParts.length - 3]
      }

      // Sadece PDF dosyaları
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        fileList.push({
          fileName: file.name,
          folderName,
          file
        })
      }
    }

    setFiles(fileList)
    setDryRunResults(null)
    setImportResults(null)
    setSummary(null)
  }, [])

  const runDryRun = async () => {
    if (files.length === 0) return

    setImporting(true)
    setDryRunResults(null)

    try {
      const token = localStorage.getItem('token')

      // Dosyaları base64'e çevir (batch işlem için max 100)
      const batchFiles = files.slice(0, 100)
      const filesData = await Promise.all(
        batchFiles.map(async (f) => {
          const buffer = await f.file.arrayBuffer()
          const base64 = btoa(
            new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          )
          return {
            fileName: f.fileName,
            folderName: f.folderName,
            fileBase64: base64,
            mimeType: f.file.type || 'application/pdf'
          }
        })
      )

      const response = await fetch('/api/projects/documents/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          files: filesData,
          dryRun: true
        })
      })

      const data = await response.json()

      if (data.success) {
        setDryRunResults(data.data.results)
        setSummary(data.data.summary)
      } else {
        alert('Hata: ' + (data.error || 'Bilinmeyen hata'))
      }
    } catch (err) {
      console.error('Dry run error:', err)
      alert('Dry run sırasında hata oluştu')
    } finally {
      setImporting(false)
    }
  }

  const runImport = async () => {
    if (files.length === 0) return

    if (!confirm(`${files.length} dosya import edilecek. Devam etmek istiyor musunuz?`)) {
      return
    }

    setImporting(true)
    setImportResults(null)

    try {
      const token = localStorage.getItem('token')

      // Dosyaları batch'ler halinde işle (100'lük gruplar)
      const allResults: ImportResult[] = []
      const batchSize = 50

      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize)

        const filesData = await Promise.all(
          batch.map(async (f) => {
            const buffer = await f.file.arrayBuffer()
            const base64 = btoa(
              new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
            )
            return {
              fileName: f.fileName,
              folderName: f.folderName,
              fileBase64: base64,
              mimeType: f.file.type || 'application/pdf'
            }
          })
        )

        const response = await fetch('/api/projects/documents/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            files: filesData,
            dryRun: false
          })
        })

        const data = await response.json()

        if (data.success) {
          allResults.push(...data.data.results)
        }
      }

      setImportResults(allResults)

      // Özet hesapla
      const finalSummary: ImportSummary = {
        total: allResults.length,
        success: allResults.filter(r => r.status === 'success').length,
        error: allResults.filter(r => r.status === 'error').length,
        skipped: allResults.filter(r => r.status === 'skipped').length,
        byCategory: {}
      }

      for (const r of allResults) {
        if (r.status === 'success') {
          finalSummary.byCategory[r.category] = (finalSummary.byCategory[r.category] || 0) + 1
        }
      }

      setSummary(finalSummary)

      // Stats yenile
      fetchStats(token!)
    } catch (err) {
      console.error('Import error:', err)
      alert('Import sırasında hata oluştu')
    } finally {
      setImporting(false)
    }
  }

  if (loading || !user) {
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/projects"
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-all shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Geri
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-navy flex items-center gap-2">
                <Upload className="w-6 h-6 text-gold" />
                Toplu Belge Import
              </h1>
              <p className="text-sm text-slate-500">Proje belgelerini toplu olarak import edin</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <BarChart3 className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Toplam Proje</span>
              </div>
              <p className="text-2xl font-bold text-navy">{stats.totalProjects}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-blue-500 mb-1">
                <FileCheck className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Sözleşmeli</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{stats.withContract}</p>
              <p className="text-xs text-slate-400">{stats.missingContract} eksik</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-amber-500 mb-1">
                <FileCheck className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Görevlendirmeli</span>
              </div>
              <p className="text-2xl font-bold text-amber-600">{stats.withAssignment}</p>
              <p className="text-xs text-slate-400">{stats.missingAssignment} eksik</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-emerald-500 mb-1">
                <FileCheck className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Hakem Onaylı</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{stats.withRefereeApproval}</p>
              <p className="text-xs text-slate-400">{stats.missingRefereeApproval} eksik</p>
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-navy to-gold" />
          <div className="p-6">
            <h2 className="text-lg font-bold text-navy mb-4 flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              Klasör Seçimi
            </h2>

            <div className="space-y-4">
              <div
                className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-gold hover:bg-gold/5 transition-all cursor-pointer"
                onClick={() => document.getElementById('folder-input')?.click()}
              >
                <input
                  id="folder-input"
                  type="file"
                  className="hidden"
                  {...{ webkitdirectory: '', directory: '' } as any}
                  multiple
                  onChange={handleFolderSelect}
                />
                <Upload className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-600 font-medium">Klasör seçmek için tıklayın</p>
                <p className="text-xs text-slate-400 mt-1">
                  YTÜTTO kodlu proje klasörlerini içeren ana klasörü seçin
                </p>
              </div>

              {files.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-slate-700">
                      <span className="text-navy font-bold">{files.length}</span> PDF dosyası seçildi
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={runDryRun}
                        disabled={importing}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-all text-sm"
                      >
                        {importing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                        Önizleme
                      </button>
                      <button
                        onClick={runImport}
                        disabled={importing || !dryRunResults}
                        className="flex items-center gap-2 px-4 py-2 bg-gold text-white font-medium rounded-lg hover:bg-gold/90 disabled:opacity-50 transition-all text-sm"
                      >
                        {importing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                        Import Başlat
                      </button>
                    </div>
                  </div>

                  {/* İlk 10 dosya önizleme */}
                  <div className="max-h-40 overflow-y-auto">
                    {files.slice(0, 10).map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-500 py-1">
                        <FileText className="w-3 h-3" />
                        <span className="truncate">{f.folderName}/{f.fileName}</span>
                      </div>
                    ))}
                    {files.length > 10 && (
                      <p className="text-xs text-slate-400 mt-2">
                        ... ve {files.length - 10} dosya daha
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results Section */}
        {(dryRunResults || importResults) && summary && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-navy to-gold" />
            <div className="p-6">
              <h2 className="text-lg font-bold text-navy mb-4 flex items-center gap-2">
                {importResults ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    Import Sonuçları
                  </>
                ) : (
                  <>
                    <Eye className="w-5 h-5 text-blue-500" />
                    Önizleme Sonuçları
                  </>
                )}
              </h2>

              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 uppercase font-medium">Toplam</p>
                  <p className="text-xl font-bold text-navy">{summary.total}</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3">
                  <p className="text-xs text-emerald-600 uppercase font-medium">Başarılı</p>
                  <p className="text-xl font-bold text-emerald-600">{summary.success}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-xs text-red-600 uppercase font-medium">Hata</p>
                  <p className="text-xl font-bold text-red-600">{summary.error}</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3">
                  <p className="text-xs text-amber-600 uppercase font-medium">Atlandı</p>
                  <p className="text-xl font-bold text-amber-600">{summary.skipped}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 uppercase font-medium">Kategoriler</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(summary.byCategory).map(([cat, count]) => (
                      <span key={cat} className={`text-xs px-1.5 py-0.5 rounded ${categoryColors[cat] || 'bg-slate-100 text-slate-600'}`}>
                        {categoryLabels[cat] || cat}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Result List */}
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">Durum</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">Dosya</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">Proje</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">Kategori</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">Detay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(importResults || dryRunResults || []).map((result, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2">
                          {result.status === 'success' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                          {result.status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                          {result.status === 'skipped' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                        </td>
                        <td className="px-3 py-2 max-w-[200px] truncate" title={result.fileName}>
                          {result.fileName}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {result.projectCode || '-'}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${categoryColors[result.category] || 'bg-slate-100 text-slate-600'}`}>
                            {categoryLabels[result.category] || result.category}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-500 max-w-[200px] truncate" title={result.error || result.storagePath || ''}>
                          {result.error || result.storagePath || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-semibold text-blue-800 mb-2">Kullanım Kılavuzu</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>1. YTÜTTO kodlu proje klasörlerini içeren ana klasörü seçin</li>
            <li>2. "Önizleme" ile hangi dosyaların hangi kategoriye gideceğini görün</li>
            <li>3. "Import Başlat" ile dosyaları yükleyin</li>
            <li>4. Dosyalar otomatik olarak kategorilere ayrılır:
              <ul className="ml-4 mt-1">
                <li>- <strong>Sözleşme:</strong> sözleşme, sozlesme, contract, şartname, sonlandırma</li>
                <li>- <strong>Ek Sözleşme:</strong> ek sözleşme, ek_sözleşme</li>
                <li>- <strong>Görevlendirme:</strong> görev, gorev, izin</li>
                <li>- <strong>Hakem Onay:</strong> karar, onay, UYK, kişi isimleri</li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  )
}
