import { useEffect, useState } from 'react'
import { Wallet } from 'lucide-react'
import api, { getApiError } from '../services/api'
import { useToast } from '../context/useToast'

function formatAmount(amount, currency) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount))
}

export default function PayoutWorkspace() {
  const { showToast } = useToast()
  const [eligible, setEligible] = useState([])
  const [payouts, setPayouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(null)
  const [error, setError] = useState('')

  async function reload() {
    const [eligibleResponse, payoutResponse] = await Promise.all([
      api.get('/payments/payouts/eligible/'),
      api.get('/payments/payouts/'),
    ])
    setEligible(eligibleResponse.data)
    setPayouts(payoutResponse.data.results || payoutResponse.data)
  }

  useEffect(() => {
    let active = true
    Promise.all([
      api.get('/payments/payouts/eligible/'),
      api.get('/payments/payouts/'),
    ])
      .then(([eligibleResponse, payoutResponse]) => {
        if (!active) return
        setEligible(eligibleResponse.data)
        setPayouts(payoutResponse.data.results || payoutResponse.data)
      })
      .catch((requestError) => { if (active) setError(getApiError(requestError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  async function requestPayout(paymentId) {
    setRequesting(paymentId)
    setError('')
    try {
      await api.post('/payments/payouts/request/', { payment_id: paymentId })
      showToast('Payout request sent for staff review.')
      await reload()
    } catch (requestError) {
      const message = getApiError(requestError)
      setError(message)
      showToast(message, 'error')
    } finally {
      setRequesting(null)
    }
  }

  return (
    <section className="dashboard-panel">
      <div className="panel-heading">
        <div>
          <h2><Wallet size={19} /> Payouts</h2>
          <p>Request payment for customer-approved work. Every payout is reviewed by KaamConnect staff.</p>
        </div>
      </div>
      {error && <div className="form-alert" role="alert">{error}</div>}
      {loading ? <div className="skeleton dashboard-skeleton" /> : (
        <>
          {eligible.length > 0 && (
            <div className="booking-card-list">
              {eligible.map((item) => (
                <article className="booking-card" key={item.payment_id}>
                  <div className="booking-card-header">
                    <div>
                      <span className="booking-id">Payment #{item.payment_id}</span>
                      <h3>{item.work_title}</h3>
                    </div>
                    <strong>{formatAmount(item.amount, item.currency)}</strong>
                  </div>
                  {!item.can_request && (
                    <p className="muted-copy">Your payout account is being set up. Contact support before requesting a transfer.</p>
                  )}
                  <div className="booking-actions-right">
                    <button
                      type="button"
                      className="button button-primary button-small"
                      disabled={!item.can_request || requesting === item.payment_id}
                      onClick={() => requestPayout(item.payment_id)}
                    >
                      {requesting === item.payment_id ? 'Sending request…' : 'Request payout'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
          {payouts.length > 0 && (
            <div className="booking-card-list">
              {payouts.map((payout) => (
                <article className="booking-card" key={payout.id}>
                  <div className="booking-card-header">
                    <div>
                      <span className="booking-id">Payout #{payout.id} · Payment #{payout.payment}</span>
                      <h3>{formatAmount(payout.amount, payout.currency)}</h3>
                    </div>
                    <span className="booking-status-badge status-pending">{payout.status.replace('_', ' ')}</span>
                  </div>
                  {payout.provider_status && <p className="muted-copy">Provider status: {payout.provider_status}</p>}
                  {payout.utr && <p className="muted-copy">Bank reference: {payout.utr}</p>}
                  {payout.failure_reason && <p className="form-alert">{payout.failure_reason}</p>}
                </article>
              ))}
            </div>
          )}
          {eligible.length === 0 && payouts.length === 0 && (
            <div className="empty-state">
              <Wallet size={30} />
              <strong>No payouts available</strong>
              <span>Funds become eligible after payment capture and customer approval of completed work.</span>
            </div>
          )}
        </>
      )}
    </section>
  )
}
