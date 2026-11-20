import { useEffect, useState } from 'react'
import { Calendar, Clock, MapPin, X } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import api, { getApiError } from '../services/api'
import { useAuth } from '../context/useAuth'
import { useToast } from '../context/useToast'

const todayStr = new Date().toISOString().split('T')[0]

export default function BookingModal({ worker, isOpen, onClose }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [addresses, setAddresses] = useState([])
  const [loadingAddresses, setLoadingAddresses] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm({
    defaultValues: {
      service_id: worker?.worker_services?.[0]?.service || '',
      scheduled_date: todayStr,
      scheduled_time: '10:00',
      address_id: '',
      customer_notes: '',
      estimated_amount: worker?.starting_price || '',
    },
  })

  const selectedServiceId = useWatch({ control, name: 'service_id' })

  useEffect(() => {
    if (isOpen && user) {
      api.get('/profiles/addresses/')
        .then(({ data }) => {
          const list = data.results || data || []
          setAddresses(list)
          const defaultAddr = list.find((a) => a.is_default) || list[0]
          reset({
            service_id: worker?.worker_services?.[0]?.service || '',
            scheduled_date: new Date().toISOString().split('T')[0],
            scheduled_time: '10:00',
            address_id: defaultAddr ? defaultAddr.id : '',
            customer_notes: '',
            estimated_amount: worker?.starting_price || '',
          })
        })
        .catch(() => {})
        .finally(() => setLoadingAddresses(false))
    }
  }, [isOpen, user, worker, reset])

  if (!isOpen) return null

  async function onSubmit(values) {
    if (!user) {
      showToast('Please log in to book a professional.', 'error')
      navigate('/login')
      return
    }

    if (!user.is_customer) {
      showToast('Only customers can request a booking.', 'error')
      return
    }

    if (!values.address_id && addresses.length === 0) {
      showToast('Please add a service address in your customer dashboard first.', 'error')
      navigate('/customer/dashboard')
      return
    }

    setSubmitting(true)
    setFormError('')
    try {
      const payload = {
        worker_id: worker.id,
        service_id: values.service_id ? Number(values.service_id) : null,
        address_id: values.address_id ? Number(values.address_id) : null,
        scheduled_date: values.scheduled_date,
        scheduled_time: values.scheduled_time || null,
        customer_notes: values.customer_notes || '',
        estimated_amount: values.estimated_amount ? Number(values.estimated_amount) : null,
      }
      await api.post('/bookings/', payload)
      showToast('Booking request sent successfully! The professional will review it.', 'success')
      onClose()
      navigate('/customer/dashboard')
    } catch (err) {
      setFormError(getApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const selectedWorkerService = worker?.worker_services?.find(
    (ws) => String(ws.service || ws.service_id) === String(selectedServiceId)
  )

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Book {worker?.user?.full_name || 'Professional'}</h2>
            <p>Schedule a service visit at your preferred date and time.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {formError && <div className="form-alert" role="alert">{formError}</div>}

        <form onSubmit={handleSubmit(onSubmit)} className="dashboard-form modal-form">
          <label className="form-field">
            <span>Select service</span>
            <select {...register('service_id')}>
              {worker?.worker_services?.length ? (
                worker.worker_services.map((ws) => (
                  <option key={ws.id} value={ws.service || ws.id}>
                    {ws.service_name || ws.category_name} {ws.price ? `(₹${Number(ws.price).toLocaleString('en-IN')})` : ''}
                  </option>
                ))
              ) : (
                <option value="">General service requirement</option>
              )}
            </select>
          </label>

          <div className="form-grid two-columns">
            <label className="form-field">
              <span><Calendar size={15} /> Scheduled date</span>
              <input
                type="date"
                min={todayStr}
                {...register('scheduled_date', { required: 'Please choose a date.' })}
              />
              {errors.scheduled_date && <span className="field-error">{errors.scheduled_date.message}</span>}
            </label>

            <label className="form-field">
              <span><Clock size={15} /> Preferred time</span>
              <input type="time" {...register('scheduled_time')} />
            </label>
          </div>

          <label className="form-field">
            <span><MapPin size={15} /> Service address</span>
            {loadingAddresses ? (
              <span className="muted-copy">Loading your saved addresses…</span>
            ) : addresses.length > 0 ? (
              <select {...register('address_id', { required: 'Please select an address.' })}>
                {addresses.map((addr) => (
                  <option key={addr.id} value={addr.id}>
                    {addr.label}: {addr.address_line1}, {addr.locality} ({addr.pincode})
                  </option>
                ))}
              </select>
            ) : (
              <div className="address-missing-alert">
                <p>You have no saved addresses yet.</p>
                <button
                  type="button"
                  className="button button-outline button-small"
                  onClick={() => navigate('/customer/dashboard')}
                >
                  Add address in Dashboard
                </button>
              </div>
            )}
            {errors.address_id && <span className="field-error">{errors.address_id.message}</span>}
          </label>

          <label className="form-field">
            <span>Estimated budget (₹, optional)</span>
            <input
              type="number"
              step="any"
              min="0"
              placeholder={selectedWorkerService?.price || worker?.starting_price || '250'}
              {...register('estimated_amount')}
            />
          </label>

          <label className="form-field">
            <span>Notes for the professional</span>
            <textarea
              rows="3"
              placeholder="Describe the issue, work scope, or specific instructions."
              {...register('customer_notes')}
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="button button-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button button-primary" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Confirm Booking Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
