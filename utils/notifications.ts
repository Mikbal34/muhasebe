// Utility to trigger notification refresh across the app
export const triggerNotificationRefresh = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('refreshNotifications'))
  }
}