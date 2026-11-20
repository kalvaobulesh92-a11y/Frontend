import assert from 'node:assert/strict'
import test from 'node:test'
import { dashboardPathForUser, hasRequiredRole } from './authRouting.js'

test('dashboard routes customer-only accounts to customer workspace', () => {
  assert.equal(dashboardPathForUser({ is_customer: true, is_worker: false }), '/customer/dashboard')
})

test('dashboard routes worker-only accounts to worker workspace', () => {
  assert.equal(dashboardPathForUser({ is_customer: false, is_worker: true }), '/worker/dashboard')
})

test('dashboard routes dual-role accounts to the workspace chooser dashboard', () => {
  assert.equal(dashboardPathForUser({ is_customer: true, is_worker: true }), '/dashboard')
})

test('dashboard routes admins to the separate admin workspace', () => {
  assert.equal(dashboardPathForUser({ is_admin: true, is_customer: false, is_worker: false }), '/admin/dashboard')
})

test('protected routes enforce roles and do not treat admins as customer or worker accounts', () => {
  assert.equal(hasRequiredRole(null, 'customer'), false)
  assert.equal(hasRequiredRole({ is_customer: true }, 'customer'), true)
  assert.equal(hasRequiredRole({ is_worker: true }, 'worker'), true)
  assert.equal(hasRequiredRole({ is_admin: true, is_customer: true }, 'customer'), false)
  assert.equal(hasRequiredRole({ is_admin: true }, 'admin'), true)
})
