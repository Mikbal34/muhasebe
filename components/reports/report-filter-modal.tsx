'use client'

import React, { useState, useEffect, useRef } from 'react'
import { X, FileText, Calendar, Filter, Search, Check } from 'lucide-react'

// Rapor turu tipi
type ReportType =
  | '' | 'project' | 'company'
  | 'income_excel' | 'expense_excel' | 'project_card' | 'personnel_excel'
  | 'payment_instructions' | 'financial_report' | 'personnel_project'

// Filtre tipleri
type FilterType =
  | 'project_id' | 'person_id' | 'person_type'
  | 'is_fsmh' | 'is_tto' | 'income_type' | 'expense_type'
  | 'collection_status' | 'payment_status' | 'project_status'
  | 'amount_range' | 'date_range'

// Rapor tanimi arayuzu
interface ReportDefinition {
  key: ReportType
  label: string
  description: string
  category: string
  filters: FilterType[]
}

// Tum rapor tanimlari
export const reportDefinitions: ReportDefinition[] = [
  // Gelir Raporlari
  {
    key: 'income_excel',
    label: 'Proje Bazli Gelir Tablosu',
    description: 'Tum projelerin gelirlerini ay ve yil bazinda gosteren detayli tablo. FSMH, TTO ve gelir tipine gore filtrelenebilir.',
    category: 'Gelir Raporlari',
    filters: ['date_range', 'project_id', 'is_fsmh', 'is_tto', 'income_type', 'collection_status', 'amount_range']
  },
  {
    key: 'financial_report',
    label: 'Finansal Rapor',
    description: 'Gelir ve giderleri bir arada gosteren kapsamli finansal ozet. Kar/zarar analizi icin kullanilir.',
    category: 'Gelir Raporlari',
    filters: ['date_range', 'project_id', 'is_fsmh', 'is_tto', 'collection_status']
  },
  {
    key: 'company',
    label: 'Sirket Ozet Raporu',
    description: 'Sirketin genel finansal durumunu gosteren ozet rapor. Toplam gelir, gider ve kar marjini icerir.',
    category: 'Gelir Raporlari',
    filters: ['date_range']
  },
  // Gider Raporlari
  {
    key: 'expense_excel',
    label: 'Proje Bazli Gider Tablosu',
    description: 'Tum projelerin giderlerini ay ve yil bazinda gosteren detayli tablo. Gider tipi ve TTO durumuna gore filtrelenebilir.',
    category: 'Gider Raporlari',
    filters: ['date_range', 'project_id', 'expense_type', 'is_tto', 'amount_range']
  },
  // Odeme Raporlari
  {
    key: 'payment_instructions',
    label: 'Odeme Talimati',
    description: 'Halkbank formatinda odeme talimati olusturur. Secilen tarihlerdeki onaylanmis odemeleri listeler.',
    category: 'Odeme Raporlari',
    filters: ['date_range', 'payment_status']
  },
  // Personel Raporlari
  {
    key: 'personnel_excel',
    label: 'Personel Listesi',
    description: 'Tum personelin temel bilgilerini iceren liste. TC No, iletisim bilgileri ve IBAN bilgilerini icerir.',
    category: 'Personel Raporlari',
    filters: ['person_type']
  },
  {
    key: 'personnel_project',
    label: 'Personel Bazli Proje Raporu',
    description: 'Secilen personellerin dahil oldugu projeleri ve bu projelerden elde ettikleri kazanclari gosteren detayli rapor.',
    category: 'Personel Raporlari',
    filters: ['person_id', 'date_range']
  },
  // Proje Raporlari
  {
    key: 'project_card',
    label: 'Proje Kunyesi',
    description: 'Projelerin detayli bilgilerini iceren kunye raporu. Sozlesme tarihleri, butce, ekip ve iletisim bilgilerini icerir.',
    category: 'Proje Raporlari',
    filters: ['project_id', 'project_status']
  },
  {
    key: 'project',
    label: 'Proje Ozet Raporu',
    description: 'Tum projelerin genel durumunu gosteren ozet rapor. Proje sayilari ve durum dagilimini icerir.',
    category: 'Proje Raporlari',
    filters: ['project_status']
  }
]

// Kategorilere gore gruplanmis raporlar
export const reportsByCategory = reportDefinitions.reduce((acc, report) => {
  if (!acc[report.category]) {
    acc[report.category] = []
  }
  acc[report.category].push(report)
  return acc
}, {} as Record<string, ReportDefinition[]>)

// Rapor tanimini key ile bul
export const getReportDefinition = (key: ReportType): ReportDefinition | undefined => {
  return reportDefinitions.find(r => r.key === key)
}

// Modal Props
interface ReportFilterModalProps {
  isOpen: boolean
  onClose: () => void
  onGenerate: (reportType: ReportType, filters: FilterOptions, dateRange: DateRange) => void
  reportType: ReportType
  projects: { id: string; code: string; name: string }[]
  people: { id: string; full_name: string; type: 'user' | 'personnel' }[]
  loading?: boolean
}

export interface FilterOptions {
  project_id?: string
  person_id?: string
  person_ids?: string[]
  person_type?: 'all' | 'user' | 'personnel'
  is_fsmh?: 'all' | 'yes' | 'no'
  is_tto?: 'all' | 'yes' | 'no'
  income_type?: 'all' | 'kamu' | 'ozel'
  expense_type?: 'all' | 'genel' | 'proje'
  collection_status?: 'all' | 'collected' | 'partial' | 'pending'
  payment_status?: 'all' | 'pending' | 'completed' | 'rejected'
  project_status?: 'all' | 'active' | 'completed' | 'cancelled'
  amount_min?: number
  amount_max?: number
}

export interface DateRange {
  start_date: string
  end_date: string
}

export function ReportFilterModal({
  isOpen,
  onClose,
  onGenerate,
  reportType,
  projects,
  people,
  loading = false
}: ReportFilterModalProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    person_type: 'all',
    person_ids: [],
    is_fsmh: 'all',
    is_tto: 'all',
    income_type: 'all',
    expense_type: 'all',
    collection_status: 'all',
    payment_status: 'all',
    project_status: 'all'
  })

  const [dateRange, setDateRange] = useState<DateRange>({
    start_date: '',
    end_date: ''
  })

  const [personSearch, setPersonSearch] = useState('')
  const [personDropdownOpen, setPersonDropdownOpen] = useState(false)
  const personDropdownRef = useRef<HTMLDivElement>(null)

  const reportDef = getReportDefinition(reportType)

  // Dropdown disina tiklandiginda kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (personDropdownRef.current && !personDropdownRef.current.contains(event.target as Node)) {
        setPersonDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Modal acildiginda filtreleri sifirla
  useEffect(() => {
    if (isOpen) {
      setFilters({
        person_type: 'all',
        person_ids: [],
        is_fsmh: 'all',
        is_tto: 'all',
        income_type: 'all',
        expense_type: 'all',
        collection_status: 'all',
        payment_status: 'all',
        project_status: 'all'
      })
      setDateRange({ start_date: '', end_date: '' })
      setPersonSearch('')
      setPersonDropdownOpen(false)
    }
  }, [isOpen, reportType])

  if (!isOpen || !reportDef) return null

  const handleGenerate = () => {
    onGenerate(reportType, filters, dateRange)
  }

  const hasFilter = (filter: FilterType) => reportDef.filters.includes(filter)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Background overlay - tiklaninca kapat */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0 pointer-events-none">
        {/* Modal panel */}
        <div
          className="inline-block align-bottom bg-white rounded-lg text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full border border-slate-200 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-navy px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <FileText className="h-6 w-6 text-white mr-3" />
                <h3 className="text-lg font-semibold text-white">
                  {reportDef.label}
                </h3>
              </div>
              <button
                onClick={onClose}
                disabled={loading}
                className="text-white/80 hover:text-white focus:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {/* Aciklama */}
            <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-sm text-slate-700 leading-relaxed">
                {reportDef.description}
              </p>
            </div>

            {/* Filtreler */}
            {reportDef.filters.length > 0 && (
              <div>
                <div className="flex items-center mb-4">
                  <Filter className="h-4 w-4 text-slate-500 mr-2" />
                  <h4 className="text-sm font-medium text-slate-700">Filtreler</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Tarih Araligi */}
                  {hasFilter('date_range') && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Baslangic Tarihi
                        </label>
                        <input
                          type="date"
                          value={dateRange.start_date}
                          onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy/30 text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Bitis Tarihi
                        </label>
                        <input
                          type="date"
                          value={dateRange.end_date}
                          onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy/30 text-slate-900"
                        />
                      </div>
                    </>
                  )}

                  {/* Proje Secimi */}
                  {hasFilter('project_id') && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Proje
                      </label>
                      <select
                        value={filters.project_id || ''}
                        onChange={(e) => setFilters(prev => ({ ...prev, project_id: e.target.value || undefined }))}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy/30 text-slate-900"
                      >
                        <option value="">Tum Projeler</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Kisi Secimi - Searchable Multi-Select Dropdown */}
                  {hasFilter('person_id') && (
                    <div className="sm:col-span-2" ref={personDropdownRef}>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Personel Secimi {(filters.person_ids?.length || 0) > 0 && (
                          <span className="text-navy">({filters.person_ids?.length} secili)</span>
                        )}
                      </label>

                      {/* Arama input ve dropdown */}
                      <div className="relative">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                            type="text"
                            value={personSearch}
                            onChange={(e) => setPersonSearch(e.target.value)}
                            onFocus={() => setPersonDropdownOpen(true)}
                            placeholder="Personel ara..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy/30 text-slate-900"
                          />
                          {personDropdownOpen && (
                            <button
                              type="button"
                              onClick={() => setPersonDropdownOpen(false)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-navy hover:text-navy font-medium"
                            >
                              Kapat
                            </button>
                          )}
                        </div>

                        {/* Dropdown listesi */}
                        {personDropdownOpen && (
                          <div className="mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-52 overflow-y-auto">
                            {/* Secili kisiler ust tarafta */}
                            {(filters.person_ids?.length || 0) > 0 && (
                              <div className="sticky top-0 bg-navy/5 border-b border-navy/20 px-3 py-2">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium text-navy">Secili Personeller</span>
                                  <button
                                    type="button"
                                    onClick={() => setFilters(prev => ({ ...prev, person_ids: [], person_id: undefined }))}
                                    className="text-xs text-navy hover:text-navy"
                                  >
                                    Tumunu Kaldir
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {filters.person_ids?.map(id => {
                                    const person = people.find(p => p.id === id)
                                    return person ? (
                                      <span key={id} className="inline-flex items-center px-2 py-0.5 text-xs bg-white text-navy rounded border border-navy/30">
                                        {person.full_name}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            const newIds = (filters.person_ids || []).filter(pid => pid !== id)
                                            setFilters(prev => ({ ...prev, person_ids: newIds, person_id: newIds[0] }))
                                          }}
                                          className="ml-1 hover:text-navy"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </span>
                                    ) : null
                                  })}
                                </div>
                              </div>
                            )}

                            {people.length === 0 ? (
                              <div className="px-3 py-3 text-sm text-slate-500">Personel bulunamadi</div>
                            ) : (
                              people
                                .filter(p => p.full_name.toLowerCase().includes(personSearch.toLowerCase()))
                                .map(p => {
                                  const isSelected = filters.person_ids?.includes(p.id) || false
                                  return (
                                    <button
                                      key={p.id}
                                      type="button"
                                      onClick={() => {
                                        const newIds = isSelected
                                          ? (filters.person_ids || []).filter(id => id !== p.id)
                                          : [...(filters.person_ids || []), p.id]
                                        setFilters(prev => ({ ...prev, person_ids: newIds, person_id: newIds[0] }))
                                      }}
                                      className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left hover:bg-slate-50 border-b border-slate-100 last:border-0 ${isSelected ? 'bg-navy/5' : ''}`}
                                    >
                                      <span className={isSelected ? 'text-navy font-medium' : 'text-slate-900'}>{p.full_name}</span>
                                      {isSelected && <Check className="h-4 w-4 text-navy flex-shrink-0" />}
                                    </button>
                                  )
                                })
                            )}
                            {people.filter(p => p.full_name.toLowerCase().includes(personSearch.toLowerCase())).length === 0 && people.length > 0 && (
                              <div className="px-3 py-3 text-sm text-slate-500">Sonuc bulunamadi</div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Secili personeller - dropdown kapali iken */}
                      {!personDropdownOpen && (filters.person_ids?.length || 0) > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {filters.person_ids?.slice(0, 5).map(id => {
                            const person = people.find(p => p.id === id)
                            return person ? (
                              <span key={id} className="inline-flex items-center px-2 py-1 text-xs bg-navy/10 text-navy rounded-full">
                                {person.full_name}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newIds = (filters.person_ids || []).filter(pid => pid !== id)
                                    setFilters(prev => ({ ...prev, person_ids: newIds, person_id: newIds[0] }))
                                  }}
                                  className="ml-1 hover:text-navy"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ) : null
                          })}
                          {(filters.person_ids?.length || 0) > 5 && (
                            <span className="inline-flex items-center px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded-full">
                              +{(filters.person_ids?.length || 0) - 5} daha
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}


                  {/* FSMH */}
                  {hasFilter('is_fsmh') && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        FSMH Geliri
                      </label>
                      <select
                        value={filters.is_fsmh}
                        onChange={(e) => setFilters(prev => ({ ...prev, is_fsmh: e.target.value as any }))}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy/30 text-slate-900"
                      >
                        <option value="all">Tumunu Goster</option>
                        <option value="yes">Sadece FSMH</option>
                        <option value="no">FSMH Haric</option>
                      </select>
                    </div>
                  )}

                  {/* TTO */}
                  {hasFilter('is_tto') && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        TTO
                      </label>
                      <select
                        value={filters.is_tto}
                        onChange={(e) => setFilters(prev => ({ ...prev, is_tto: e.target.value as any }))}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy/30 text-slate-900"
                      >
                        <option value="all">Tumunu Goster</option>
                        <option value="yes">Sadece TTO</option>
                        <option value="no">TTO Haric</option>
                      </select>
                    </div>
                  )}

                  {/* Gelir Tipi */}
                  {hasFilter('income_type') && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Gelir Tipi
                      </label>
                      <select
                        value={filters.income_type}
                        onChange={(e) => setFilters(prev => ({ ...prev, income_type: e.target.value as any }))}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy/30 text-slate-900"
                      >
                        <option value="all">Tumunu Goster</option>
                        <option value="kamu">Kamu</option>
                        <option value="ozel">Ozel</option>
                      </select>
                    </div>
                  )}

                  {/* Gider Tipi */}
                  {hasFilter('expense_type') && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Gider Tipi
                      </label>
                      <select
                        value={filters.expense_type}
                        onChange={(e) => setFilters(prev => ({ ...prev, expense_type: e.target.value as any }))}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy/30 text-slate-900"
                      >
                        <option value="all">Tumunu Goster</option>
                        <option value="genel">Genel Gider</option>
                        <option value="proje">Proje Gideri</option>
                      </select>
                    </div>
                  )}

                  {/* Tahsilat Durumu */}
                  {hasFilter('collection_status') && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Tahsilat Durumu
                      </label>
                      <select
                        value={filters.collection_status}
                        onChange={(e) => setFilters(prev => ({ ...prev, collection_status: e.target.value as any }))}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy/30 text-slate-900"
                      >
                        <option value="all">Tumunu Goster</option>
                        <option value="collected">Tahsil Edildi</option>
                        <option value="partial">Kismi Tahsilat</option>
                        <option value="pending">Bekliyor</option>
                      </select>
                    </div>
                  )}

                  {/* Odeme Durumu */}
                  {hasFilter('payment_status') && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Odeme Durumu
                      </label>
                      <select
                        value={filters.payment_status}
                        onChange={(e) => setFilters(prev => ({ ...prev, payment_status: e.target.value as any }))}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy/30 text-slate-900"
                      >
                        <option value="all">Tumunu Goster</option>
                        <option value="pending">Bekliyor</option>
                        <option value="completed">Tamamlandi</option>
                        <option value="rejected">Reddedildi</option>
                      </select>
                    </div>
                  )}

                  {/* Proje Durumu */}
                  {hasFilter('project_status') && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Proje Durumu
                      </label>
                      <select
                        value={filters.project_status}
                        onChange={(e) => setFilters(prev => ({ ...prev, project_status: e.target.value as any }))}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy/30 text-slate-900"
                      >
                        <option value="all">Tumunu Goster</option>
                        <option value="active">Aktif</option>
                        <option value="completed">Tamamlandi</option>
                        <option value="cancelled">Iptal</option>
                      </select>
                    </div>
                  )}

                  {/* Tutar Araligi */}
                  {hasFilter('amount_range') && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Min. Tutar
                        </label>
                        <input
                          type="number"
                          value={filters.amount_min || ''}
                          onChange={(e) => setFilters(prev => ({ ...prev, amount_min: e.target.value ? Number(e.target.value) : undefined }))}
                          placeholder="0"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy/30 text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Max. Tutar
                        </label>
                        <input
                          type="number"
                          value={filters.amount_max || ''}
                          onChange={(e) => setFilters(prev => ({ ...prev, amount_max: e.target.value ? Number(e.target.value) : undefined }))}
                          placeholder="Limit yok"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy/30 text-slate-900"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-navy/30 disabled:opacity-50"
              >
                Iptal
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="px-6 py-2 text-sm font-medium text-white bg-navy rounded-md hover:bg-navy/90 focus:outline-none focus:ring-2 focus:ring-navy/30 disabled:opacity-50 flex items-center"
              >
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                )}
                Rapor Olustur
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
