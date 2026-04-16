import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { apiResponse, withAuth } from '@/lib/middleware/auth'

interface ParsedRow {
  rowNumber: number
  project_code: string
  person_name: string
  amount: number
  description: string | null
  iban: string | null
  payment_date: string | null
}

interface ValidationError {
  row: number
  column: string
  message: string
}

interface ResolvedPerson {
  type: 'user' | 'personnel'
  id: string
  full_name: string
  iban: string | null
}

interface BalanceRecord {
  id: string
  user_id: string | null
  personnel_id: string | null
  project_id: string
  available_amount: number
  debt_amount: number
  reserved_amount: number
}

function parseDate(value: string | number | Date | undefined): string | null {
  if (!value) return null

  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value)
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
    }
    return null
  }

  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
  }

  const str = String(value).trim()

  const dotMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (dotMatch) {
    const [, day, month, year] = dotMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashMatch) {
    const [, day, month, year] = slashMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) return str

  return null
}

function parseAmount(value: string | number | undefined): number | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'number') return value
  const str = String(value).trim().replace(/\s/g, '').replace(',', '.')
  const num = parseFloat(str)
  return isNaN(num) ? null : num
}

function normalizeNameTr(name: string): string {
  return name.toLocaleLowerCase('tr-TR').trim().replace(/\s+/g, ' ')
}

// POST /api/payments/import
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    if (!['admin', 'manager'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Sadece yöneticiler toplu ödeme aktarabilir')
    }

    try {
      const formData = await request.formData()
      const file = formData.get('file') as File | null

      if (!file) {
        return apiResponse.error('Dosya bulunamadı', undefined, 400)
      }

      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ]
      if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        return apiResponse.error('Geçersiz dosya formatı. Lütfen Excel dosyası (.xlsx, .xls) yükleyin', undefined, 400)
      }

      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true })

      const sheetName = workbook.SheetNames[0]
      if (!sheetName) {
        return apiResponse.error('Excel dosyası boş', undefined, 400)
      }

      const sheet = workbook.Sheets[sheetName]
      const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

      if (rows.length === 0) {
        return apiResponse.error('Excel dosyasında veri bulunamadı', undefined, 400)
      }

      // Phase 2: Row-level validation (no DB)
      const errors: ValidationError[] = []
      const parsedRows: ParsedRow[] = []
      const uniqueProjectCodes = new Set<string>()
      const uniquePersonNames = new Set<string>()

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const rowNumber = i + 2

        const projectCode = row['Proje Kodu']?.toString().trim()
        if (!projectCode) {
          errors.push({ row: rowNumber, column: 'Proje Kodu', message: 'Proje kodu zorunlu' })
          continue
        }

        const personName = row['Alıcı Adı']?.toString().trim()
        if (!personName) {
          errors.push({ row: rowNumber, column: 'Alıcı Adı', message: 'Alıcı adı zorunlu' })
          continue
        }

        const amount = parseAmount(row['Tutar'])
        if (amount === null || amount <= 0) {
          errors.push({ row: rowNumber, column: 'Tutar', message: amount === null ? 'Tutar geçersiz' : "Tutar 0'dan büyük olmalı" })
          continue
        }

        const description = row['Açıklama']?.toString().trim() || null
        const iban = row['IBAN']?.toString().trim() || null
        const paymentDate = parseDate(row['Ödeme Tarihi'])

        uniqueProjectCodes.add(projectCode)
        uniquePersonNames.add(normalizeNameTr(personName))

        parsedRows.push({
          rowNumber,
          project_code: projectCode,
          person_name: personName,
          amount,
          description,
          iban,
          payment_date: paymentDate
        })
      }

      if (parsedRows.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Geçerli satır bulunamadı',
          data: { errors }
        }, { status: 400 })
      }

      // Phase 3: Batch DB lookups
      const projectCodes = Array.from(uniqueProjectCodes)
      const { data: projects, error: projectsError } = await ctx.supabase
        .from('projects')
        .select('id, code, status')
        .in('code', projectCodes)

      if (projectsError) {
        return apiResponse.error('Projeler yüklenemedi', projectsError.message, 500)
      }

      const projectMap = new Map<string, { id: string; status: string }>()
      for (const p of projects || []) {
        projectMap.set(p.code, { id: p.id, status: p.status })
      }

      // Fetch all users and personnel (small tables)
      const { data: allUsers } = await ctx.supabase
        .from('users')
        .select('id, full_name, iban, is_active')

      const { data: allPersonnel } = await ctx.supabase
        .from('personnel')
        .select('id, full_name, iban, is_active')

      // Build person lookup: normalized name → ResolvedPerson[]
      const personLookup = new Map<string, ResolvedPerson[]>()

      for (const u of allUsers || []) {
        const key = normalizeNameTr(u.full_name)
        const arr = personLookup.get(key) || []
        arr.push({ type: 'user', id: u.id, full_name: u.full_name, iban: u.iban })
        personLookup.set(key, arr)
      }

      for (const p of allPersonnel || []) {
        const key = normalizeNameTr(p.full_name)
        const arr = personLookup.get(key) || []
        arr.push({ type: 'personnel', id: p.id, full_name: p.full_name, iban: p.iban })
        personLookup.set(key, arr)
      }

      // Fetch balances for relevant projects
      const uniqueProjectIds = Array.from(new Set(
        parsedRows
          .map(r => projectMap.get(r.project_code)?.id)
          .filter((id): id is string => !!id)
      ))

      const balanceMap = new Map<string, BalanceRecord>()

      if (uniqueProjectIds.length > 0) {
        const { data: balances } = await (ctx.supabase as any)
          .from('balances')
          .select('id, user_id, personnel_id, project_id, available_amount, debt_amount, reserved_amount')
          .in('project_id', uniqueProjectIds)

        for (const b of balances || []) {
          if (b.user_id) {
            balanceMap.set(`user:${b.user_id}:${b.project_id}`, b)
          }
          if (b.personnel_id) {
            balanceMap.set(`personnel:${b.personnel_id}:${b.project_id}`, b)
          }
        }
      }

      // Phase 4: Second-pass validation with DB data
      interface ValidRow extends ParsedRow {
        person: ResolvedPerson
        projectId: string
        balanceId: string
      }
      const validRows: ValidRow[] = []
      const cumulativeReservations = new Map<string, number>()
      const liveBalances = new Map<string, { available_amount: number; reserved_amount: number }>()

      for (const row of parsedRows) {
        // Project check
        const project = projectMap.get(row.project_code)
        if (!project) {
          errors.push({ row: row.rowNumber, column: 'Proje Kodu', message: `Proje bulunamadı: ${row.project_code}` })
          continue
        }
        if (project.status === 'cancelled') {
          errors.push({ row: row.rowNumber, column: 'Proje Kodu', message: `Proje iptal edilmiş: ${row.project_code}` })
          continue
        }

        // Person check
        const nameKey = normalizeNameTr(row.person_name)
        const matches = personLookup.get(nameKey) || []

        if (matches.length === 0) {
          errors.push({ row: row.rowNumber, column: 'Alıcı Adı', message: `Kişi bulunamadı: ${row.person_name}` })
          continue
        }
        if (matches.length > 1) {
          errors.push({ row: row.rowNumber, column: 'Alıcı Adı', message: `Birden fazla kişi eşleşti: ${row.person_name} (${matches.length} sonuç)` })
          continue
        }

        const person = matches[0]

        // Balance check
        const balanceKey = `${person.type}:${person.id}:${project.id}`
        const balance = balanceMap.get(balanceKey)

        if (!balance) {
          errors.push({ row: row.rowNumber, column: 'Tutar', message: `Bu projede bakiye kaydı bulunamadı: ${row.person_name} - ${row.project_code}` })
          continue
        }

        if ((balance.debt_amount || 0) > 0) {
          errors.push({ row: row.rowNumber, column: 'Tutar', message: `Kişinin ₺${balance.debt_amount.toLocaleString('tr-TR')} borcu var` })
          continue
        }

        // Initialize live balance tracking
        if (!liveBalances.has(balanceKey)) {
          liveBalances.set(balanceKey, {
            available_amount: balance.available_amount || 0,
            reserved_amount: balance.reserved_amount || 0
          })
        }

        const live = liveBalances.get(balanceKey)!
        if (row.amount > live.available_amount) {
          const cumulative = cumulativeReservations.get(balanceKey) || 0
          errors.push({
            row: row.rowNumber,
            column: 'Tutar',
            message: `Yetersiz bakiye. Mevcut: ₺${live.available_amount.toLocaleString('tr-TR')}, İstenen: ₺${row.amount.toLocaleString('tr-TR')}${cumulative > 0 ? ` (diğer satırlardan ₺${cumulative.toLocaleString('tr-TR')} zaten ayrıldı)` : ''}`
          })
          continue
        }

        // Reserve in tracking
        live.available_amount -= row.amount
        live.reserved_amount += row.amount
        cumulativeReservations.set(balanceKey, (cumulativeReservations.get(balanceKey) || 0) + row.amount)

        validRows.push({
          ...row,
          person,
          projectId: project.id,
          balanceId: balance.id
        })
      }

      if (validRows.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Aktarılacak geçerli ödeme bulunamadı',
          data: { errors }
        }, { status: 400 })
      }

      // Phase 5: Row-by-row insert
      const insertedIds: string[] = []
      let importedTotal = 0
      // Track actual DB balance state per balanceId
      const dbBalances = new Map<string, { available_amount: number; reserved_amount: number }>()

      for (const row of validRows) {
        try {
          // Get current balance state
          if (!dbBalances.has(row.balanceId)) {
            const bal = balanceMap.get(`${row.person.type}:${row.person.id}:${row.projectId}`)!
            dbBalances.set(row.balanceId, {
              available_amount: bal.available_amount || 0,
              reserved_amount: bal.reserved_amount || 0
            })
          }
          const currentBal = dbBalances.get(row.balanceId)!

          // 1. Insert payment_instruction
          const { data: payment, error: paymentError } = await (ctx.supabase as any)
            .from('payment_instructions')
            .insert({
              user_id: row.person.type === 'user' ? row.person.id : null,
              personnel_id: row.person.type === 'personnel' ? row.person.id : null,
              recipient_personnel_id: row.person.type === 'personnel' ? row.person.id : null,
              project_id: row.projectId,
              total_amount: row.amount,
              status: 'pending',
              notes: row.description,
              created_by: ctx.user.id
            })
            .select('id, instruction_number')
            .single()

          if (paymentError) {
            console.error(`Payment insert error (row ${row.rowNumber}):`, paymentError)
            errors.push({ row: row.rowNumber, column: 'DB', message: paymentError.message || 'Ödeme talimatı oluşturulamadı' })
            continue
          }

          // 2. Insert payment_instruction_item
          const { error: itemError } = await (ctx.supabase as any)
            .from('payment_instruction_items')
            .insert({
              instruction_id: payment.id,
              amount: row.amount,
              description: row.description
            })

          if (itemError) {
            await ctx.supabase.from('payment_instructions').delete().eq('id', payment.id)
            console.error(`Payment item error (row ${row.rowNumber}):`, itemError)
            errors.push({ row: row.rowNumber, column: 'DB', message: itemError.message || 'Ödeme kalemi oluşturulamadı' })
            continue
          }

          // 3. Reserve balance
          const newAvailable = currentBal.available_amount - row.amount
          const newReserved = currentBal.reserved_amount + row.amount

          const { error: balanceError } = await ctx.supabase
            .from('balances')
            .update({
              available_amount: newAvailable,
              reserved_amount: newReserved,
              last_updated: new Date().toISOString()
            })
            .eq('id', row.balanceId)

          if (balanceError) {
            await (ctx.supabase as any).from('payment_instruction_items').delete().eq('instruction_id', payment.id)
            await ctx.supabase.from('payment_instructions').delete().eq('id', payment.id)
            console.error(`Balance update error (row ${row.rowNumber}):`, balanceError)
            errors.push({ row: row.rowNumber, column: 'DB', message: balanceError.message || 'Bakiye güncellenemedi' })
            continue
          }

          // Update tracked balance
          currentBal.available_amount = newAvailable
          currentBal.reserved_amount = newReserved

          insertedIds.push(payment.id)
          importedTotal += row.amount
        } catch (err: any) {
          console.error(`Payment import error (row ${row.rowNumber}):`, err)
          errors.push({ row: row.rowNumber, column: 'EXCEPTION', message: err?.message || 'Bilinmeyen hata' })
        }
      }

      if (insertedIds.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Ödeme talimatları oluşturulamadı',
          data: { errors }
        }, { status: 500 })
      }

      // Audit log (non-fatal)
      try {
        await (ctx.supabase as any).rpc('create_audit_log', {
          p_user_id: ctx.user.id,
          p_action: 'BULK_IMPORT',
          p_entity_type: 'payment_instruction',
          p_entity_id: insertedIds[0] || null,
          p_new_values: {
            imported_count: insertedIds.length,
            total_amount: importedTotal
          }
        })
      } catch (auditErr) {
        console.error('Audit log error (non-fatal):', auditErr)
      }

      return apiResponse.success(
        {
          imported: insertedIds.length,
          total_amount: importedTotal,
          errors: errors.length > 0 ? errors : undefined
        },
        `${insertedIds.length} ödeme talimatı başarıyla oluşturuldu (Toplam: ₺${importedTotal.toLocaleString('tr-TR')})`
      )
    } catch (error: any) {
      console.error('Payment import error:', error)
      return apiResponse.error('İçe aktarma başarısız', error.message, 500)
    }
  })
}
