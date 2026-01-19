'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import {
  ArrowLeft,
  PiggyBank,
  Building2,
  TrendingUp,
  Search,
  Calendar,
  Receipt,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager'
}

// Mock Data - Kesilecek faturası olan projeler
const MOCK_REMAINING_DATA = {
  total: 12776576.50,
  projectCount: 12,
  projects: [
    {
      id: '1',
      code: 'TTO-2024-042',
      name: 'Yapay Zeka Destekli Kalite Kontrol Sistemi',
      company: 'ABC Teknoloji A.Ş.',
      budget: 2500000,
      invoiced: 1800000,
      remaining: 700000,
      progress: 72,
      plannedInvoices: [
        { description: 'Final Teslim Ödemesi', amount: 400000, plannedDate: '2025-03-31' },
        { description: 'Garanti Dönemi Başlangıç', amount: 300000, plannedDate: '2025-06-30' },
      ]
    },
    {
      id: '2',
      code: 'TTO-2024-038',
      name: 'Akıllı Şehir IoT Altyapısı Projesi',
      company: 'SmartCity Solutions',
      budget: 5000000,
      invoiced: 3500000,
      remaining: 1500000,
      progress: 70,
      plannedInvoices: [
        { description: 'Dashboard Geliştirme', amount: 750000, plannedDate: '2025-04-15' },
        { description: 'Final Entegrasyon', amount: 750000, plannedDate: '2025-07-30' },
      ]
    },
    {
      id: '3',
      code: 'TTO-2024-051',
      name: 'Biyomedikal Görüntüleme Cihazı Geliştirme',
      company: 'MedTech İnovasyon',
      budget: 8000000,
      invoiced: 6000000,
      remaining: 2000000,
      progress: 75,
      plannedInvoices: [
        { description: 'FDA Başvuru Süreci', amount: 1000000, plannedDate: '2025-05-20' },
        { description: 'Seri Üretim Hazırlık', amount: 1000000, plannedDate: '2025-09-15' },
      ]
    },
    {
      id: '4',
      code: 'TTO-2024-029',
      name: 'Enerji Verimliliği Optimizasyon Yazılımı',
      company: 'GreenEnergy Tech',
      budget: 1800000,
      invoiced: 1400000,
      remaining: 400000,
      progress: 78,
      plannedInvoices: [
        { description: 'Deployment ve Eğitim', amount: 400000, plannedDate: '2025-02-28' },
      ]
    },
    {
      id: '5',
      code: 'TTO-2025-003',
      name: 'Otonom Araç Simülasyon Platformu',
      company: 'AutoDrive Systems',
      budget: 12000000,
      invoiced: 8000000,
      remaining: 4000000,
      progress: 67,
      plannedInvoices: [
        { description: 'VR Entegrasyonu', amount: 1500000, plannedDate: '2025-08-10' },
        { description: 'Yapay Zeka Modülleri', amount: 1500000, plannedDate: '2025-11-20' },
        { description: 'Final Kabul', amount: 1000000, plannedDate: '2026-02-15' },
      ]
    },
    {
      id: '6',
      code: 'TTO-2024-067',
      name: 'Blockchain Tabanlı Tedarik Zinciri',
      company: 'ChainLogistics',
      budget: 3200000,
      invoiced: 2400000,
      remaining: 800000,
      progress: 75,
      plannedInvoices: [
        { description: 'Canlıya Geçiş', amount: 500000, plannedDate: '2025-03-15' },
        { description: 'Destek Paketi', amount: 300000, plannedDate: '2025-06-30' },
      ]
    },
    {
      id: '7',
      code: 'TTO-2024-055',
      name: 'Kuantum Hesaplama Araştırma Projesi',
      company: 'QuantumLab Türkiye',
      budget: 15000000,
      invoiced: 10000000,
      remaining: 5000000,
      progress: 67,
      plannedInvoices: [
        { description: 'Araştırma Faz 3', amount: 2500000, plannedDate: '2025-04-30' },
        { description: 'Prototip Geliştirme', amount: 2500000, plannedDate: '2025-10-15' },
      ]
    },
    {
      id: '8',
      code: 'TTO-2024-044',
      name: 'Tarımsal Drone Teknolojileri',
      company: 'AgroTech Innovations',
      budget: 2200000,
      invoiced: 1600000,
      remaining: 600000,
      progress: 73,
      plannedInvoices: [
        { description: 'Sertifikasyon', amount: 300000, plannedDate: '2025-02-15' },
        { description: 'Ticari Lansman', amount: 300000, plannedDate: '2025-05-01' },
      ]
    },
    {
      id: '9',
      code: 'TTO-2025-008',
      name: 'Nanoteknoloji Malzeme Araştırması',
      company: 'NanoMaterials Inc.',
      budget: 6500000,
      invoiced: 5723423.50,
      remaining: 776576.50,
      progress: 88,
      plannedInvoices: [
        { description: 'Patent Başvuruları', amount: 400000, plannedDate: '2025-03-20' },
        { description: 'Lisanslama', amount: 376576.50, plannedDate: '2025-06-15' },
      ]
    },
    {
      id: '10',
      code: 'TTO-2024-072',
      name: 'Siber Güvenlik Platformu',
      company: 'SecureNet Systems',
      budget: 4000000,
      invoiced: 3500000,
      remaining: 500000,
      progress: 87.5,
      plannedInvoices: [
        { description: 'Penetrasyon Testi', amount: 250000, plannedDate: '2025-02-28' },
        { description: 'Final Denetim', amount: 250000, plannedDate: '2025-04-15' },
      ]
    },
    {
      id: '11',
      code: 'TTO-2025-001',
      name: 'Yenilenebilir Enerji Depolama Sistemi',
      company: 'EnergyStore Tech',
      budget: 9000000,
      invoiced: 8500000,
      remaining: 500000,
      progress: 94,
      plannedInvoices: [
        { description: 'Performans Garantisi', amount: 500000, plannedDate: '2025-03-31' },
      ]
    },
    {
      id: '12',
      code: 'TTO-2024-060',
      name: 'Akıllı Fabrika Otomasyon Sistemi',
      company: 'Industry 4.0 Solutions',
      budget: 7500000,
      invoiced: 7500000,
      remaining: 0,
      progress: 100,
      plannedInvoices: []
    },
  ].filter(p => p.remaining > 0)
}

export default function RemainingPage() {
  const router = useRouter()
  const [user] = useState<User>({ id: '1', full_name: 'Demo Kullanıcı', email: 'demo@tto.com', role: 'admin' })
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects)
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId)
    } else {
      newExpanded.add(projectId)
    }
    setExpandedProjects(newExpanded)
  }

  const filteredProjects = MOCK_REMAINING_DATA.projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.company.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalPlannedCount = MOCK_REMAINING_DATA.projects.reduce(
    (sum, p) => sum + p.plannedInvoices.length, 0
  )

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-navy">Kesilecek Faturalar</h1>
            <p className="text-sm text-slate-500">Henüz faturalandırılmamış proje bütçeleri</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Toplam Kesilecek */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-slate-400 to-slate-300"></div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-3">
                <p className="text-slate-500 font-semibold text-sm">Toplam Kesilecek Fatura</p>
                <PiggyBank className="w-5 h-5 text-slate-500" />
              </div>
              <p className="text-2xl font-black text-slate-700">
                ₺{MOCK_REMAINING_DATA.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Proje Sayısı */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-navy to-navy/50"></div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-3">
                <p className="text-slate-500 font-semibold text-sm">Proje Sayısı</p>
                <Building2 className="w-5 h-5 text-navy" />
              </div>
              <p className="text-2xl font-black text-navy">{MOCK_REMAINING_DATA.projectCount}</p>
              <p className="text-xs text-slate-400 mt-1">Fatura bekleyen proje</p>
            </div>
          </div>

          {/* Planlanan Fatura Sayısı */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-500 to-emerald-300"></div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-3">
                <p className="text-slate-500 font-semibold text-sm">Planlanan Fatura</p>
                <Receipt className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-emerald-600">{totalPlannedCount}</p>
              <p className="text-xs text-slate-400 mt-1">Kesilecek fatura adedi</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Proje adı, kodu veya firma ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 bg-slate-50 border-none rounded-lg pl-10 pr-4 text-sm focus:ring-2 focus:ring-navy/20 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Projects List */}
        <div className="space-y-3">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${
                expandedProjects.has(project.id)
                  ? 'border-navy/30 shadow-navy/10'
                  : 'border-slate-100 hover:border-navy/20'
              }`}
            >
              {/* Card Header */}
              <button
                onClick={() => toggleProject(project.id)}
                className="w-full p-5 text-left hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-navy">{project.name}</h3>
                        <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {project.code}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">{project.company}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    {/* Progress */}
                    <div className="hidden md:block">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-navy rounded-full"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-500">{project.progress}%</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400 uppercase font-bold">Kesilecek</p>
                      <p className="text-lg font-black text-slate-600">
                        ₺{project.remaining.toLocaleString('tr-TR')}
                      </p>
                    </div>
                    {expandedProjects.has(project.id) ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded Content */}
              {expandedProjects.has(project.id) && (
                <div className="border-t border-slate-100 bg-slate-50/30">
                  {/* Summary */}
                  <div className="p-4 grid grid-cols-3 gap-4 border-b border-slate-100">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Toplam Bütçe</p>
                      <p className="text-sm font-bold text-slate-700">₺{project.budget.toLocaleString('tr-TR')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Kesilen Fatura</p>
                      <p className="text-sm font-bold text-navy">₺{project.invoiced.toLocaleString('tr-TR')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Kalan</p>
                      <p className="text-sm font-bold text-slate-600">₺{project.remaining.toLocaleString('tr-TR')}</p>
                    </div>
                  </div>

                  {/* Planned Invoices */}
                  {project.plannedInvoices.length > 0 ? (
                    <div className="p-4">
                      <p className="text-xs font-bold text-slate-500 uppercase mb-3">Planlanan Faturalar</p>
                      <div className="space-y-2">
                        {project.plannedInvoices.map((invoice, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-100"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                <Receipt className="w-4 h-4 text-emerald-500" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-700">{invoice.description}</p>
                                <div className="flex items-center gap-1 text-xs text-slate-400">
                                  <Calendar className="w-3 h-3" />
                                  <span>Planlanan: {new Date(invoice.plannedDate).toLocaleDateString('tr-TR')}</span>
                                </div>
                              </div>
                            </div>
                            <p className="text-sm font-bold text-navy">
                              ₺{invoice.amount.toLocaleString('tr-TR')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400">
                      <p className="text-sm">Henüz planlanan fatura bulunmuyor</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredProjects.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">Sonuç Bulunamadı</h3>
            <p className="text-slate-500">Arama kriterlerinize uygun proje bulunamadı.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
