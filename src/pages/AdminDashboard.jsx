import { useEffect, useState } from 'react'
import {
  Calendar,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  Star,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import api, { getApiError } from '../services/api'
import { useAuth } from '../context/useAuth'
import { useToast } from '../context/useToast'
import { formatDisplayPhone } from '../utils/contact.js'

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const { showToast } = useToast()
  const [analytics, setAnalytics] = useState(null)
  const [payouts, setPayouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [payoutError, setPayoutError] = useState('')
  const [payoutActionId, setPayoutActionId] = useState(null)

  async function loadPayouts() {
    const { data } = await api.get('/payments/payouts/')
    setPayouts(data.results || data)
  }

  useEffect(() => {
    let active = true
    api.get('/analytics/summary/')
      .then(({ data }) => { if (active) setAnalytics(data) })
      .catch((err) => { if (active) setError(getApiError(err)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    api.get('/payments/payouts/')
      .then(({ data }) => { if (active) setPayouts(data.results || data) })
      .catch((err) => { if (active) setPayoutError(getApiError(err)) })
    return () => { active = false }
  }, [])

  async function reviewPayout(payout, decision) {
    let reason
    if (decision === 'reject') {
      reason = window.prompt('Reason for rejecting this payout request:')
      if (reason === null) return
      if (!reason.trim()) {
        setPayoutError('Enter a reason before rejecting a payout.')
        return
      }
    }

    setPayoutActionId(payout.id)
    setPayoutError('')
    try {
      await api.post(`/payments/payouts/${payout.id}/review/`, { decision, reason })
      showToast(decision === 'approve' ? 'Payout submitted to RazorpayX.' : 'Payout request rejected.')
      await loadPayouts()
    } catch (requestError) {
      setPayoutError(getApiError(requestError))
    } finally {
      setPayoutActionId(null)
    }
  }

  async function reconcilePayout(payout) {
    setPayoutActionId(payout.id)
    setPayoutError('')
    try {
      if (payout.provider_payout_id) {
        await api.post(`/payments/payouts/${payout.id}/reconcile/`)
        showToast('Payout status refreshed from RazorpayX.')
      } else {
        await api.post(`/payments/payouts/${payout.id}/review/`, { decision: 'approve' })
        showToast('Payout resubmitted with its original idempotency key.')
      }
      await loadPayouts()
    } catch (requestError) {
      setPayoutError(getApiError(requestError))
    } finally {
      setPayoutActionId(null)
    }
  }

  async function signOut() {
    try {
      await logout()
    } catch {
      showToast('The server could not confirm logout. Your local session was cleared.', 'error')
    }
  }

  const overview = analytics?.overview || {}
  const statusCounts = analytics?.bookings_by_status || {}

  return (
    <main className="dashboard-page">
      <div className="container dashboard-container">
        <header className="dashboard-header">
          <span className="dashboard-icon"><ShieldCheck size={22} /></span>
          <div>
            <span className="section-kicker">Administration</span>
            <h1>Operations & Administration</h1>
            <p>Signed in as <strong>{user?.full_name}</strong> ({user?.email}) with administrative privileges.</p>
          </div>
        </header>

        {error && <div className="form-alert dashboard-alert" role="alert">{error}</div>}

        {loading ? (
          <div className="skeleton dashboard-skeleton" />
        ) : (
          <>
            {/* KPI Overview Cards */}
            <div className="admin-kpi-grid">
              <div className="kpi-card">
                <span className="kpi-icon"><Users size={20} /></span>
                <div>
                  <small>Total Users</small>
                  <strong>{overview.total_users || 0}</strong>
                  <span>{overview.total_customers || 0} customers · {overview.total_workers || 0} workers</span>
                </div>
              </div>
              <div className="kpi-card">
                <span className="kpi-icon"><Calendar size={20} /></span>
                <div>
                  <small>Total Bookings</small>
                  <strong>{overview.total_bookings || 0}</strong>
                  <span>{statusCounts.completed || 0} completed · {statusCounts.pending || 0} pending</span>
                </div>
              </div>
              <div className="kpi-card">
                <span className="kpi-icon"><MessageSquare size={20} /></span>
                <div>
                  <small>Total Inquiries</small>
                  <strong>{overview.total_enquiries || 0}</strong>
                  <span>Customer pre-booking requests</span>
                </div>
              </div>
              <div className="kpi-card">
                <span className="kpi-icon"><Star size={20} /></span>
                <div>
                  <small>Reviews & Ratings</small>
                  <strong>{overview.total_reviews || 0}</strong>
                  <span>{overview.total_services || 0} catalog services</span>
                </div>
              </div>
            </div>

            {/* Booking Status Pipeline */}
            <section className="dashboard-panel">
              <div className="panel-heading">
                <div>
                  <h2>Booking Pipeline Status</h2>
                  <p>Real-time lifecycle of all bookings created across Hyderabad localities.</p>
                </div>
              </div>
              <div className="pipeline-grid">
                <div className="pipeline-item pending">
                  <small>Pending</small>
                  <strong>{statusCounts.pending || 0}</strong>
                </div>
                <div className="pipeline-item confirmed">
                  <small>Confirmed</small>
                  <strong>{statusCounts.confirmed || 0}</strong>
                </div>
                <div className="pipeline-item progress">
                  <small>In Progress</small>
                  <strong>{statusCounts.in_progress || 0}</strong>
                </div>
                <div className="pipeline-item completed">
                  <small>Completed</small>
                  <strong>{statusCounts.completed || 0}</strong>
                </div>
                <div className="pipeline-item cancelled">
                  <small>Cancelled</small>
                  <strong>{statusCounts.cancelled || 0}</strong>
                </div>
              </div>
            </section>

            {/* Recent Bookings Table */}
            <section className="dashboard-panel">
              <div className="panel-heading">
                <div>
                  <h2>Recent Bookings</h2>
                  <p>Latest customer service requests.</p>
                </div>
              </div>
              {analytics?.recent_bookings?.length ? (
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Service</th>
                        <th>Customer</th>
                        <th>Worker</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.recent_bookings.map((b) => (
                        <tr key={b.id}>
                          <td><strong>#{b.id}</strong></td>
                          <td>{b.service_name}</td>
                          <td>
                            {b.customer_name}
                            <br />
                            <small className="muted-copy">{formatDisplayPhone(b.customer_phone)}</small>
                          </td>
                          <td>
                            {b.worker_name}
                            <br />
                            <small className="muted-copy">{formatDisplayPhone(b.worker_phone)}</small>
                          </td>
                          <td>{b.scheduled_date}</td>
                          <td><span className={`booking-status-badge status-${b.status}`}>{b.status}</span></td>
                          <td>{b.estimated_amount ? `₹${Number(b.estimated_amount).toLocaleString('en-IN')}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted-copy">No bookings in the system yet.</p>
              )}
            </section>

            <section className="dashboard-panel">
              <div className="panel-heading">
                <div>
                  <h2>Worker payout review</h2>
                  <p>Review customer-approved payout requests before funds are sent through RazorpayX.</p>
                </div>
              </div>
              {payoutError && <div className="form-alert" role="alert">{payoutError}</div>}
              {payouts.length ? (
                <div className="booking-card-list">
                  {payouts.map((payout) => (
                    <article className="booking-card" key={payout.id}>
                      <div className="booking-card-header">
                        <div>
                          <span className="booking-id">Payout #{payout.id} · Payment #{payout.payment}</span>
                          <h3>{payout.worker_name} · {Number(payout.amount).toLocaleString('en-IN', {
                            style: 'currency',
                            currency: payout.currency,
                          })}</h3>
                          <p>{payout.status.replace('_', ' ')}{payout.provider_status ? ` · Provider: ${payout.provider_status}` : ''}</p>
                        </div>
                      </div>
                      {payout.failure_reason && <p className="form-alert">{payout.failure_reason}</p>}
                      <div className="booking-actions-right">
                        {payout.status === 'requested' && (
                          <>
                            <button
                              type="button"
                              className="button button-primary button-small"
                              disabled={payoutActionId === payout.id}
                              onClick={() => reviewPayout(payout, 'approve')}
                            >
                              Approve & submit
                            </button>
                            <button
                              type="button"
                              className="button button-outline danger-outline button-small"
                              disabled={payoutActionId === payout.id}
                              onClick={() => reviewPayout(payout, 'reject')}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {payout.status === 'processing' && (
                          <button
                            type="button"
                            className="button button-outline button-small"
                            disabled={payoutActionId === payout.id}
                            onClick={() => reconcilePayout(payout)}
                          >
                            {payout.provider_payout_id ? 'Refresh provider status' : 'Retry safely'}
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="muted-copy">No payout requests have been submitted.</p>
              )}
            </section>

            {/* Recent Users Table */}
            <section className="dashboard-panel">
              <div className="panel-heading">
                <div>
                  <h2>Recently Joined Users</h2>
                  <p>Registered accounts across both customer and professional roles.</p>
                </div>
              </div>
              {analytics?.recent_users?.length ? (
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Roles</th>
                        <th>Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.recent_users.map((u) => (
                        <tr key={u.id}>
                          <td><strong>{u.full_name}</strong></td>
                          <td>{u.email}</td>
                          <td>{formatDisplayPhone(u.phone)}</td>
                          <td>
                            <div className="role-tags">
                              {u.is_customer && <span className="role-tag customer">Customer</span>}
                              {u.is_worker && <span className="role-tag worker">Worker</span>}
                              {u.is_admin && <span className="role-tag admin">Admin</span>}
                            </div>
                          </td>
                          <td>{new Date(u.date_joined).toLocaleDateString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted-copy">No users found.</p>
              )}
            </section>

            {/* Quick Actions Panel */}
            <section className="dashboard-panel">
              <div className="panel-heading">
                <div>
                  <h2>Database & Advanced Settings</h2>
                  <p>Access the core Django management system for full table editing and model management.</p>
                </div>
              </div>
              <div className="admin-actions-bar">
                <a className="button button-primary" href="/django-admin/" target="_blank" rel="noreferrer">
                  Open Django Administration <ExternalLink size={16} />
                </a>
                <Link className="button button-outline" to="/search">
                  Browse Marketplace as Customer
                </Link>
                <button type="button" className="button button-outline danger-outline" onClick={signOut}>
                  Log Out
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
