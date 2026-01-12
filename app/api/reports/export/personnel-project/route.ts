import { NextRequest } from 'next/server'
import {
  generateExcelBuffer,
  createExcelResponse,
  ExcelColumn,
  NUMBER_FORMATS
} from '@/lib/utils/excel-factory'
import { apiResponse, withAuth } from '@/lib/middleware/auth'

// Satir tipi
interface PersonnelProjectRow {
  personnel_id: string
  personnel_name: string
  personnel_email: string
  project_id: string
  project_code: string
  project_name: string
  project_status: string
  role: string
  total_earnings: number
  allocation_count: number
}

// Kolon tanimlari
const columns: ExcelColumn<PersonnelProjectRow>[] = [
  { key: 'personnel_name', label: 'Personel Adi', width: 25, getValue: (r) => r.personnel_name },
  { key: 'project_code', label: 'Proje Kodu', width: 15, getValue: (r) => r.project_code },
  { key: 'project_name', label: 'Proje Adi', width: 30, getValue: (r) => r.project_name },
  { key: 'role', label: 'Rol', width: 18, getValue: (r) => {
    const roles: Record<string, string> = {
      'project_leader': 'Proje Yurutucusu',
      'manager': 'Proje Yurutucusu',
      'researcher': 'Arastirmaci',
      'consultant': 'Danisman'
    }
    return roles[r.role] || r.role
  }},
  { key: 'total_earnings', label: 'Toplam Kazanc', width: 18, getValue: (r) => r.total_earnings, numFmt: NUMBER_FORMATS.currency },
  { key: 'allocation_count', label: 'Dagitim Sayisi', width: 14, getValue: (r) => r.allocation_count },
  { key: 'project_status', label: 'Proje Durumu', width: 12, getValue: (r) => {
    const statuses: Record<string, string> = {
      'active': 'Aktif',
      'completed': 'Tamamlandi',
      'cancelled': 'Iptal'
    }
    return statuses[r.project_status] || r.project_status
  }},
]

const excelConfig = {
  title: 'PERSONEL BAZLI PROJE RAPORU',
  sheetName: 'Personel Projeleri',
  filename: 'personel_proje_raporu',
  columns
}

interface AllocationData {
  earnings: number
  count: number
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    if (!['admin', 'manager'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Only admins and managers can export reports')
    }

    try {
      const body = await request.json().catch(() => ({}))
      const { columns: selectedColumns, format = 'excel', filters = {} } = body
      const { person_ids = [], date_range = {} } = filters

      // Personel listesini cek (filtre varsa sadece secilenleri)
      let personnelQuery = ctx.supabase
        .from('personnel')
        .select('id, full_name, email')
        .eq('is_active', true)

      if (person_ids.length > 0) {
        personnelQuery = personnelQuery.in('id', person_ids)
      }

      const { data: personnelList, error: personnelError } = await personnelQuery.order('full_name')
      if (personnelError) throw personnelError

      if (!personnelList || personnelList.length === 0) {
        if (format === 'json') {
          return apiResponse.success({
            rows: [],
            summary: {
              totalPersonnel: 0,
              totalProjects: 0,
              totalEarnings: 0,
              uniqueProjects: 0
            }
          })
        }
        const buffer = await generateExcelBuffer([], excelConfig, selectedColumns)
        return createExcelResponse(buffer, excelConfig.filename)
      }

      const personnelIds = personnelList.map(p => p.id)

      // 1. project_representatives'den projeleri ve rolleri al
      const { data: representatives, error: repError } = await ctx.supabase
        .from('project_representatives')
        .select(`
          personnel_id,
          role,
          project:projects(id, code, name, status)
        `)
        .in('personnel_id', personnelIds)
        .not('project', 'is', null)

      if (repError) throw repError

      // 2. manual_balance_allocations'dan kazanclari al (ASIL VERI KAYNAGI)
      let allocationsQuery = ctx.supabase
        .from('manual_balance_allocations')
        .select(`
          personnel_id,
          amount,
          project_id,
          created_at
        `)
        .in('personnel_id', personnelIds)

      const { data: allocations, error: allocError } = await allocationsQuery
      if (allocError) throw allocError

      // Tarih filtresi uygula
      const filteredAllocations = (allocations || []).filter((a: any) => {
        if (!a.created_at) return true
        const allocDate = a.created_at.split('T')[0]
        if (date_range.start_date && allocDate < date_range.start_date) return false
        if (date_range.end_date && allocDate > date_range.end_date) return false
        return true
      })

      // Personel -> Proje -> Kazanc object olustur
      const personnelProjectMap: Record<string, Record<string, AllocationData>> = {}

      // Initialize from representatives (projelerde yer alan personeller)
      ;(representatives || []).forEach((rep: any) => {
        if (!rep.project) return
        const personnelId = rep.personnel_id
        const projectId = rep.project.id

        if (!personnelProjectMap[personnelId]) {
          personnelProjectMap[personnelId] = {}
        }
        if (!personnelProjectMap[personnelId][projectId]) {
          personnelProjectMap[personnelId][projectId] = { earnings: 0, count: 0 }
        }
      })

      // Add earnings from manual_balance_allocations
      filteredAllocations.forEach((alloc: any) => {
        const personnelId = alloc.personnel_id
        const projectId = alloc.project_id

        if (!personnelProjectMap[personnelId]) {
          personnelProjectMap[personnelId] = {}
        }
        if (!personnelProjectMap[personnelId][projectId]) {
          personnelProjectMap[personnelId][projectId] = { earnings: 0, count: 0 }
        }
        const data = personnelProjectMap[personnelId][projectId]
        data.earnings += alloc.amount || 0
        data.count += 1
      })

      // Proje bilgilerini al
      const allProjectIds: string[] = []
      Object.values(personnelProjectMap).forEach(projectMap => {
        Object.keys(projectMap).forEach(projectId => {
          if (!allProjectIds.includes(projectId)) {
            allProjectIds.push(projectId)
          }
        })
      })

      let projectsById: Record<string, any> = {}
      if (allProjectIds.length > 0) {
        const { data: projects, error: projectsError } = await ctx.supabase
          .from('projects')
          .select('id, code, name, status')
          .in('id', allProjectIds)

        if (projectsError) throw projectsError
        projectsById = (projects || []).reduce((acc: Record<string, any>, p: any) => {
          acc[p.id] = p
          return acc
        }, {})
      }

      // Representatives'den rol bilgisi al
      const roleMap: Record<string, string> = {}
      ;(representatives || []).forEach((rep: any) => {
        if (rep.project) {
          roleMap[`${rep.personnel_id}-${rep.project.id}`] = rep.role || 'researcher'
        }
      })

      // Sonuc satirlarini olustur
      const rows: PersonnelProjectRow[] = []
      const personnelById: Record<string, any> = personnelList.reduce((acc: Record<string, any>, p: any) => {
        acc[p.id] = p
        return acc
      }, {})

      Object.entries(personnelProjectMap).forEach(([personnelId, projectMap]) => {
        const personnel = personnelById[personnelId]
        if (!personnel) return

        Object.entries(projectMap).forEach(([projectId, data]) => {
          const project = projectsById[projectId]
          if (!project) return

          rows.push({
            personnel_id: personnelId,
            personnel_name: personnel.full_name,
            personnel_email: personnel.email,
            project_id: projectId,
            project_code: project.code,
            project_name: project.name,
            project_status: project.status,
            role: roleMap[`${personnelId}-${projectId}`] || 'researcher',
            total_earnings: data.earnings,
            allocation_count: data.count
          })
        })
      })

      // Personel adina gore sirala, sonra kazanca gore
      rows.sort((a, b) => {
        const nameCompare = a.personnel_name.localeCompare(b.personnel_name, 'tr')
        if (nameCompare !== 0) return nameCompare
        return b.total_earnings - a.total_earnings
      })

      // JSON preview format
      if (format === 'json') {
        // Personel bazli ozet hesapla
        const personnelSummary: Record<string, { name: string, totalEarnings: number, projectCount: number }> = {}
        rows.forEach(row => {
          if (!personnelSummary[row.personnel_id]) {
            personnelSummary[row.personnel_id] = {
              name: row.personnel_name,
              totalEarnings: 0,
              projectCount: 0
            }
          }
          personnelSummary[row.personnel_id].totalEarnings += row.total_earnings
          personnelSummary[row.personnel_id].projectCount += 1
        })

        const totalEarnings = rows.reduce((sum, r) => sum + r.total_earnings, 0)
        const uniqueProjects = Array.from(new Set(rows.map(r => r.project_id))).length
        const uniquePersonnel = Array.from(new Set(rows.map(r => r.personnel_id))).length

        return apiResponse.success({
          rows,
          personnelSummary: Object.values(personnelSummary),
          summary: {
            totalPersonnel: uniquePersonnel,
            totalProjects: uniqueProjects,
            totalEarnings,
            totalRows: rows.length,
            avgEarningsPerPersonnel: uniquePersonnel > 0 ? totalEarnings / uniquePersonnel : 0
          }
        })
      }

      // Generate Excel using factory
      const buffer = await generateExcelBuffer(rows, excelConfig, selectedColumns)
      return createExcelResponse(buffer, excelConfig.filename)

    } catch (error: any) {
      console.error('Personnel-project export error:', error)
      return apiResponse.error('Export failed', error.message, 500)
    }
  })
}
