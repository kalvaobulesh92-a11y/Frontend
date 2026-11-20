import { useState } from 'react'
import { Calendar, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import api, { getApiError } from '../services/api'
import { useAuth } from '../context/useAuth'
import { useToast } from '../context/useToast'

const todayStr = new Date().toISOString().split('T')[0]

export default function EnquiryModal({ worker, isOpen, onClose }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const primaryService = worker?.worker_services?.[0]

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      category_id: primaryService?.category || '',
      service_id: primaryService?.service || '',
      subject: '',
      message: '',
      contact_preference: 'call',
      preferred_date: '',
    },
  })

  if (!isOpen) return null

  async function onSubmit(values) {
    if (!user) {
      showToast('Please log in to send an enquiry.', 'error')
      navigate('/login')
      return
    }

    if (!user.is_customer) {
      showToast('Only customers can submit service enquiries.', 'error')
      return
    }

    setSubmitting(true)
    setFormError('')
    try {
      const payload = {
        worker_id: worker.id,
        category_id: values.category_id ? Number(values.category_id) : primaryService?.category,
        service_id: values.service_id ? Number(values.service_id) : primaryService?.service || null,
        subject: values.subject,
        message: values.message,
        contact_preference: values.contact_preference,
        preferred_date: values.preferred_date || null,
      }
      await api.post('/enquiries/', payload)
      showToast('Enquiry sent successfully! The professional will contact you soon.', 'success')
      onClose()
      navigate('/customer/dashboard')
    } catch (err) {
      setFormError(getApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Enquire with {worker?.user?.full_name || 'Professional'}</h2>
            <p>Ask questions or discuss requirements before booking.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {formError && <div className="form-alert" role="alert">{formError}</div>}

        <form onSubmit={handleSubmit(onSubmit)} className="dashboard-form modal-form">
          <label className="form-field">
            <span>Subject</span>
            <input
              placeholder="e.g. Switchboard repair inquiry or bathroom leakage"
              {...register('subject', { required: 'Please enter a subject.' })}
            />
            {errors.subject && <span className="field-error">{errors.subject.message}</span>}
          </label>

          <label className="form-field">
            <span>Message / Requirement details</span>
            <textarea
              rows="4"
              placeholder="Explain the work you need done, timeline, or ask any question."
              {...register('message', { required: 'Please provide details in your message.' })}
            />
            {errors.message && <span className="field-error">{errors.message.message}</span>}
          </label>

          <div className="form-grid two-columns">
            <label className="form-field">
              <span><Calendar size={15} /> Preferred inspection date <small>(optional)</small></span>
              <input
                type="date"
                min={todayStr}
                {...register('preferred_date')}
              />
            </label>

            <label className="form-field">
              <span>How would you like to be contacted?</span>
              <select {...register('contact_preference')}>
                <option value="call">Phone call</option>
                <option value="whatsapp">WhatsApp message</option>
                <option value="chat">In-app chat</option>
              </select>
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="button button-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button button-primary" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send Enquiry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
