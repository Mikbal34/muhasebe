import { NextRequest } from 'next/server'
import { apiResponse, withAuth } from '@/lib/middleware/auth'

// GET /api/notifications - Get user's notifications
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread_only') === 'true'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    try {
      // Get notifications that are not hidden by the current user
      let query = ctx.supabase
        .from('notifications')
        .select(`
          *,
          user_settings:notification_user_settings!left(hidden)
        `)
        .eq('user_id', ctx.user.id)
        .order('created_at', { ascending: false })

      if (unreadOnly) {
        query = query.eq('read', false)
      }

      query = query.range(offset, offset + limit - 1)

      const { data: rawNotifications, error, count } = await query

      // Filter out notifications that have user_settings.hidden = true
      const notifications = rawNotifications?.filter(n => {
        // If user_settings exists and has a hidden entry, filter it out
        if ((n as any).user_settings && Array.isArray((n as any).user_settings)) {
          return !(n as any).user_settings.some((setting: any) => setting.hidden === true)
        }
        // If user_settings is a single object (left join result)
        if ((n as any).user_settings && !Array.isArray((n as any).user_settings)) {
          return (n as any).user_settings.hidden !== true
        }
        // No settings means not hidden
        return true
      }) || []

      if (error) {
        console.error('Notifications fetch error:', error)
        return apiResponse.error('Failed to fetch notifications', error.message, 500)
      }

      // Get unread count
      const { count: unreadCount, error: countError } = await ctx.supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', ctx.user.id)
        .eq('read', false)

      if (countError) {
        console.error('Unread count error:', countError)
      }

      return apiResponse.success({
        notifications: notifications || [],
        unreadCount: unreadCount || 0,
        total: count || 0
      })
    } catch (error: any) {
      console.error('Notifications API error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}

// POST /api/notifications - Create a new notification (admin only)
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    // Only admins can create notifications manually
    if (ctx.user.role !== 'admin') {
      return apiResponse.forbidden('Only admins can create notifications')
    }

    try {
      const body = await request.json()
      const {
        user_id,
        type,
        title,
        message,
        auto_hide = true,
        duration = 5000,
        action_label,
        action_url,
        reference_type,
        reference_id
      } = body

      // Validate required fields
      if (!user_id || !type || !title || !message) {
        return apiResponse.error('Missing required fields', undefined, 400)
      }

      const { data: notification, error } = await (ctx.supabase as any)
        .from('notifications')
        .insert({
          user_id,
          type,
          title,
          message,
          auto_hide,
          duration,
          action_label,
          action_url,
          reference_type,
          reference_id
        })
        .select()
        .single()

      if (error) {
        console.error('Notification creation error:', error)
        return apiResponse.error('Failed to create notification', error.message, 500)
      }

      return apiResponse.success({ notification }, 'Notification created successfully')
    } catch (error: any) {
      console.error('Notifications POST error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}

// PATCH /api/notifications - Mark notifications as read or hide for user
export async function PATCH(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    try {
      const body = await request.json()
      const { notification_ids, mark_all = false, hide_for_user = false } = body

      if (hide_for_user) {
        // Hide notifications for current user (don't delete from DB)
        if (!notification_ids || !Array.isArray(notification_ids)) {
          return apiResponse.error('notification_ids required for hiding', undefined, 400)
        }

        // Insert or update notification_user_settings to hide
        for (const notificationId of notification_ids) {
          const { error } = await (ctx.supabase as any)
            .from('notification_user_settings')
            .upsert({
              notification_id: notificationId,
              user_id: ctx.user.id,
              hidden: true
            })

          if (error) {
            console.error('Hide notification error:', error)
            return apiResponse.error('Failed to hide notification', error.message, 500)
          }
        }

        return apiResponse.success({}, 'Notifications hidden for user')
      } else {
        // Mark as read (original functionality)
        let updateData = {
          read: true,
          read_at: new Date().toISOString()
        }

        let query = (ctx.supabase as any)
          .from('notifications')
          .update(updateData)
          .eq('user_id', ctx.user.id)

        if (mark_all) {
          // Mark all notifications as read
          query = query.eq('read', false)
        } else if (notification_ids && Array.isArray(notification_ids)) {
          // Mark specific notifications as read
          query = query.in('id', notification_ids)
        } else {
          return apiResponse.error('Either provide notification_ids or set mark_all to true', undefined, 400)
        }

        const { error } = await query

        if (error) {
          console.error('Mark as read error:', error)
          return apiResponse.error('Failed to mark notifications as read', error.message, 500)
        }

        return apiResponse.success({}, 'Notifications marked as read')
      }
    } catch (error: any) {
      console.error('Notifications PATCH error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}

// DELETE /api/notifications - Delete notifications
export async function DELETE(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    try {
      const { searchParams } = new URL(request.url)
      const notificationId = searchParams.get('id')
      const deleteAll = searchParams.get('all') === 'true'

      let query = ctx.supabase
        .from('notifications')
        .delete()
        .eq('user_id', ctx.user.id)

      if (deleteAll) {
        // Delete all notifications for the user
      } else if (notificationId) {
        // Delete specific notification
        query = query.eq('id', notificationId)
      } else {
        return apiResponse.error('Either provide notification id or set all=true', undefined, 400)
      }

      const { error } = await query

      if (error) {
        console.error('Delete notifications error:', error)
        return apiResponse.error('Failed to delete notifications', error.message, 500)
      }

      return apiResponse.success({}, 'Notifications deleted successfully')
    } catch (error: any) {
      console.error('Notifications DELETE error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}