import { NextRequest } from 'next/server'
import { withManager, apiResponse } from '@/lib/middleware/auth'

// GET: Search all people (users + personnel)
export async function GET(request: NextRequest) {
  return withManager(request, async (req, ctx) => {
    try {
      const { searchParams } = new URL(request.url)
      const search = searchParams.get('search')
      const includeInactive = searchParams.get('include_inactive') === 'true'
      const personType = searchParams.get('person_type') // 'user' or 'personnel' or null
      const showBalance = searchParams.get('show_balance') === 'true'
      const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 100)

      const { supabase } = ctx

      // Fetch users
      let usersQuery = supabase
        .from('users')
        .select('id, full_name, email, phone, iban, role, is_active')
        .order('full_name', { ascending: true })

      if (!includeInactive) {
        usersQuery = usersQuery.eq('is_active', true)
      }

      // Fetch personnel
      let personnelQuery = supabase
        .from('personnel')
        .select('id, full_name, email, phone, iban, tc_no, notes, is_active')
        .order('full_name', { ascending: true })

      if (!includeInactive) {
        personnelQuery = personnelQuery.eq('is_active', true)
      }

      // Apply search filter
      if (search) {
        usersQuery = usersQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
        personnelQuery = personnelQuery.or(
          `full_name.ilike.%${search}%,email.ilike.%${search}%,tc_no.ilike.%${search}%`
        )
      }

      // Execute queries based on person_type filter
      const { data: users, error: usersError } =
        !personType || personType === 'user' ? await usersQuery : { data: [], error: null }

      const { data: personnel, error: personnelError } =
        !personType || personType === 'personnel'
          ? await personnelQuery
          : { data: [], error: null }

      if (usersError) {
        return apiResponse.error('Failed to fetch users', usersError.message, 500)
      }

      if (personnelError) {
        return apiResponse.error('Failed to fetch personnel', personnelError.message, 500)
      }

      // Get balances if requested
      let balancesMap = new Map<string, any>()

      if (showBalance) {
        const allUserIds = (users || []).map((u: any) => u.id)
        const allPersonnelIds = (personnel || []).map((p: any) => p.id)

        // Fetch all balances
        const { data: balances, error: balancesError } = await supabase
          .from('balances')
          .select('user_id, personnel_id, available_amount, debt_amount, total_income, total_payment')
          .or(
            `user_id.in.(${allUserIds.join(',')}),personnel_id.in.(${allPersonnelIds.join(',')})`
          )

        if (!balancesError && balances) {
          balances.forEach((balance: any) => {
            const key = balance.user_id || balance.personnel_id
            balancesMap.set(key, {
              available_amount: balance.available_amount,
              debt_amount: balance.debt_amount,
              total_income: balance.total_income,
              total_payment: balance.total_payment,
            })
          })
        }
      }

      // Transform users to unified format
      const transformedUsers = (users || []).map((user: any) => ({
        id: user.id,
        type: 'user' as const,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        iban: user.iban,
        user_role: user.role,
        tc_no: null,
        is_active: user.is_active,
        ...(showBalance && { balance: balancesMap.get(user.id) || null }),
      }))

      // Transform personnel to unified format
      const transformedPersonnel = (personnel || []).map((person: any) => ({
        id: person.id,
        type: 'personnel' as const,
        full_name: person.full_name,
        email: person.email,
        phone: person.phone,
        iban: person.iban,
        user_role: null,
        tc_no: person.tc_no,
        notes: person.notes,
        is_active: person.is_active,
        ...(showBalance && { balance: balancesMap.get(person.id) || null }),
      }))

      // Combine and sort by full_name
      const allPeople = [...transformedUsers, ...transformedPersonnel]
        .sort((a, b) => a.full_name.localeCompare(b.full_name, 'tr'))
        .slice(0, limit)

      return apiResponse.success({
        people: allPeople,
        total: allPeople.length,
        breakdown: {
          users: transformedUsers.length,
          personnel: transformedPersonnel.length,
        },
      })
    } catch (error: any) {
      console.error('GET /api/people/search error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}
