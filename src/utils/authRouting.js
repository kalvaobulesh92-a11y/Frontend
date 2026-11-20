export function dashboardPathForUser(user) {
  if (user?.is_admin) return '/admin/dashboard'
  if (user?.is_worker && !user?.is_customer) return '/worker/dashboard'
  if (user?.is_customer && user?.is_worker) return '/dashboard'
  return '/customer/dashboard'
}

export function hasRequiredRole(user, role) {
  if (!user) return false
  if (!role) return true
  if (role === 'admin') return Boolean(user.is_admin)
  if (user.is_admin) return false
  if (role === 'customer') return Boolean(user.is_customer)
  if (role === 'worker') return Boolean(user.is_worker)
  return false
}
