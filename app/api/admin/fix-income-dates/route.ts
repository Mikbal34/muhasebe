import { NextRequest } from 'next/server'
import { apiResponse, withAuth } from '@/lib/middleware/auth'

// POST /api/admin/fix-income-dates
// Gelir tarihlerini projelerin start_date'ine göre düzenler
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    // Sadece admin çalıştırabilir
    if (ctx.user.role !== 'admin') {
      return apiResponse.error('Unauthorized', 'Only admins can run this', 403)
    }

    try {
      const body = await req.json().catch(() => ({}))
      const dryRun = body.dryRun !== false // Default: true (sadece preview)

      console.log(`\n${'='.repeat(50)}`)
      console.log(`Gelir Tarihi Düzeltme - ${dryRun ? 'PREVIEW MODE' : 'UYGULAMA MODE'}`)
      console.log('='.repeat(50) + '\n')

      // 1. Tüm gelirleri projelerle birlikte çek
      const { data: incomes, error: fetchError } = await ctx.supabase
        .from('incomes')
        .select(`
          id,
          income_date,
          collection_date,
          collected_amount,
          gross_amount,
          description,
          project_id,
          projects (
            id,
            code,
            name,
            start_date
          )
        `)
        .order('created_at')

      if (fetchError) {
        console.error('Gelirler çekilemedi:', fetchError)
        return apiResponse.error('Failed to fetch incomes', fetchError.message, 500)
      }

      console.log(`Toplam ${incomes?.length || 0} gelir kaydı bulundu.\n`)

      // 2. Projelere göre grupla ve her proje için sıralı tarihler ata
      const projectIncomes: Record<string, any[]> = {}

      incomes?.forEach((income: any) => {
        const projectId = income.project_id
        if (!projectIncomes[projectId]) {
          projectIncomes[projectId] = []
        }
        projectIncomes[projectId].push(income)
      })

      // 3. Her gelir için tarih ayarlaması yap
      const updates: any[] = []

      Object.keys(projectIncomes).forEach(projectId => {
        const projectIncomeList = projectIncomes[projectId]
        const project = projectIncomeList[0]?.projects

        if (!project) {
          console.log(`⚠️  Proje bulunamadı: ${projectId}`)
          return
        }

        const projectStartDate = new Date(project.start_date)

        // Her gelir için projenin başlangıcından itibaren aylık sıralı tarihler ver
        projectIncomeList.forEach((income: any, index: number) => {
          // Projenin başlangıç tarihinden itibaren her ay için bir gelir
          const newIncomeDate = new Date(projectStartDate)
          newIncomeDate.setMonth(newIncomeDate.getMonth() + index)
          const formattedIncomeDate = newIncomeDate.toISOString().split('T')[0]

          // Eğer tahsil edilmişse, collection_date'i income_date ile aynı yap
          const newCollectionDate = income.collected_amount > 0 ? formattedIncomeDate : null

          updates.push({
            id: income.id,
            income_date: formattedIncomeDate,
            collection_date: newCollectionDate,
            project_code: project.code,
            project_name: project.name,
            old_income_date: income.income_date,
            old_collection_date: income.collection_date,
            gross_amount: income.gross_amount,
            collected_amount: income.collected_amount,
            description: income.description
          })
        })
      })

      // 4. Preview göster
      const preview = updates.map(u => ({
        proje: `${u.project_code} - ${u.project_name}`,
        tutar: `₺${u.gross_amount?.toLocaleString('tr-TR')}`,
        tahsilat: u.collected_amount > 0 ? `₺${u.collected_amount?.toLocaleString('tr-TR')}` : '-',
        eski_tarih: u.old_income_date,
        yeni_tarih: u.income_date,
        yeni_tahsilat_tarihi: u.collection_date || '-'
      }))

      console.log('Preview:')
      console.table(preview)

      // 5. Eğer dryRun değilse, güncellemeleri uygula
      if (!dryRun) {
        console.log('\nGüncellemeler uygulanıyor...\n')

        let successCount = 0
        let errorCount = 0

        for (const update of updates) {
          const { error: updateError } = await ctx.supabase
            .from('incomes')
            .update({
              income_date: update.income_date,
              collection_date: update.collection_date
            })
            .eq('id', update.id)

          if (updateError) {
            console.error(`❌ Hata (${update.project_code}):`, updateError.message)
            errorCount++
          } else {
            console.log(`✅ ${update.project_code} - ₺${update.gross_amount?.toLocaleString('tr-TR')} - ${update.income_date}`)
            successCount++
          }
        }

        console.log(`\n✅ Tamamlandı: ${successCount} başarılı, ${errorCount} hatalı`)

        return apiResponse.success({
          message: 'Güncellemeler tamamlandı',
          total: updates.length,
          success: successCount,
          errors: errorCount,
          preview
        })
      }

      return apiResponse.success({
        message: 'Preview mode - güncellemeler uygulanmadı',
        dryRun: true,
        total: updates.length,
        preview
      })

    } catch (error: any) {
      console.error('Fix income dates error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}

// GET - Mevcut durumu göster
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    if (ctx.user.role !== 'admin') {
      return apiResponse.error('Unauthorized', 'Only admins can access this', 403)
    }

    try {
      const { data: incomes, error } = await ctx.supabase
        .from('incomes')
        .select(`
          id,
          income_date,
          collection_date,
          collected_amount,
          gross_amount,
          projects (code, name, start_date)
        `)
        .order('income_date')

      if (error) {
        return apiResponse.error('Failed to fetch', error.message, 500)
      }

      const summary = incomes?.map((i: any) => ({
        proje: i.projects?.code || 'N/A',
        tutar: `₺${i.gross_amount?.toLocaleString('tr-TR')}`,
        income_date: i.income_date,
        collection_date: i.collection_date || '-',
        proje_start: i.projects?.start_date || 'N/A'
      }))

      return apiResponse.success({
        total: incomes?.length || 0,
        incomes: summary
      })
    } catch (error: any) {
      return apiResponse.error('Error', error.message, 500)
    }
  })
}
