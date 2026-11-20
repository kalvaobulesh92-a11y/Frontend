import { useState } from 'react'
import { Star, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import api, { getApiError } from '../services/api'
import { useToast } from '../context/useToast'

export default function ReviewModal({ booking, isOpen, onClose, onReviewSubmitted }) {
  const { showToast } = useToast()
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { title: '', comment: '' },
  })

  if (!isOpen || !booking) return null

  async function onSubmit(values) {
    setSubmitting(true)
    setFormError('')
    try {
      await api.post('/reviews/', {
        booking_id: booking.id,
        rating,
        title: values.title || '',
        comment: values.comment || '',
      })
      showToast('Thank you! Your review has been published.', 'success')
      reset()
      onClose()
      if (onReviewSubmitted) onReviewSubmitted()
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
            <h2>Review {booking.worker?.user?.full_name || 'Professional'}</h2>
            <p>Share your experience for job #{booking.id}.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {formError && <div className="form-alert" role="alert">{formError}</div>}

        <form onSubmit={handleSubmit(onSubmit)} className="dashboard-form modal-form">
          <div className="star-rating-select">
            <span>Your rating</span>
            <div className="star-group">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  className={`star-button ${(hoverRating || rating) >= star ? 'active' : ''}`}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  aria-label={`${star} star`}
                >
                  <Star size={26} fill={(hoverRating || rating) >= star ? 'currentColor' : 'none'} />
                </button>
              ))}
              <strong className="star-rating-label">{rating} of 5 stars</strong>
            </div>
          </div>

          <label className="form-field">
            <span>Review headline <small>(optional)</small></span>
            <input placeholder="e.g. Prompt, skilled and courteous" {...register('title')} />
          </label>

          <label className="form-field">
            <span>Your comments</span>
            <textarea
              rows="4"
              placeholder="Tell others about the quality of service, punctuality, and professionalism."
              {...register('comment')}
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="button button-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button button-primary" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
