import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  Calendar,
  CalendarDays,
  Check,
  Copy,
  MapPin,
  MessageSquare,
  Phone,
  ShieldCheck,
  Star,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import BookingModal from '../components/BookingModal'
import EnquiryModal from '../components/EnquiryModal'
import api, { getApiError } from '../services/api'
import { useToast } from '../context/useToast'
import {
  formatDisplayPhone,
  getTelLink,
  getWhatsAppLink,
  normalizeIndianPhone,
} from '../utils/contact.js'

export default function WorkerDetailPage() {
  const { id } = useParams()
  const { showToast } = useToast()
  const [worker, setWorker] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reviews, setReviews] = useState([])
  const [loadingReviews, setLoadingReviews] = useState(true)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [enquiryOpen, setEnquiryOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true
    api.get(`/profiles/workers/${id}/`)
      .then(({ data }) => { if (active) setWorker(data) })
      .catch((requestError) => { if (active) setError(getApiError(requestError)) })
      .finally(() => { if (active) setLoading(false) })

    api.get(`/reviews/?worker=${id}`)
      .then(({ data }) => {
        if (active) setReviews(data.results || data || [])
      })
      .catch(() => {})
      .finally(() => { if (active) setLoadingReviews(false) })

    return () => { active = false }
  }, [id])

  if (loading) return <div className="page-loading"><span className="spinner-border" aria-label="Loading profile" /></div>
  if (error || !worker) return <div className="container page-message"><h1>Profile unavailable</h1><p>{error || 'This professional could not be found.'}</p><Link className="button button-outline" to="/search"><ArrowLeft size={16} /> Back to search</Link></div>

  const user = worker.user || {}
  const phone = user.phone || ''
  const contactNumber = normalizeIndianPhone(phone)
  const displayPhone = formatDisplayPhone(phone)
  const location = worker.service_areas?.[0]
  const initials = (user.full_name || 'KC').split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()

  function copyPhone() {
    if (phone) {
      navigator.clipboard?.writeText(displayPhone)
      setCopied(true)
      showToast('Phone number copied to clipboard.')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const whatsappMessage = `Hello ${user.full_name}, I found your profile on KaamConnect and would like to discuss hiring your service.`

  return (
    <div className="worker-detail-page">
      <div className="container">
        <Link className="back-link" to="/search"><ArrowLeft size={16} /> Back to professionals</Link>
        <div className="worker-detail-grid">
          <section className="worker-detail-main">
            <div className="detail-profile-card">
              <div className="detail-avatar">
                {user.profile_picture ? <img src={user.profile_picture} alt="" /> : initials}
              </div>
              <div className="detail-title">
                <div className="worker-name-line">
                  <h1>{user.full_name}</h1>
                  {worker.verification_status === 'verified' && <BadgeCheck className="verified-icon" size={20} aria-label="Verified professional" />}
                </div>
                <p>{worker.worker_services?.map((service) => service.service_name || service.category_name).filter(Boolean).join(' · ') || 'Home services professional'}</p>
                {location && <span className="detail-location"><MapPin size={16} /> Serves {location.locality}, {location.city}</span>}
              </div>
              <div className="detail-rating">
                <Star size={16} fill="currentColor" />
                <strong>{Number(worker.average_rating || 0).toFixed(1)}</strong>
                <span>({worker.total_reviews} reviews)</span>
              </div>
            </div>

            <div className="detail-content-card">
              <h2>About</h2>
              <p className="detail-bio">{worker.bio || 'This professional has not added a bio yet.'}</p>
              <div className="detail-facts">
                <span><BriefcaseBusiness size={18} /><strong>{worker.experience_years} years</strong><small>Experience</small></span>
                <span><ShieldCheck size={18} /><strong>{worker.verification_status === 'verified' ? 'Verified' : 'Not verified'}</strong><small>Profile status</small></span>
                <span><CalendarDays size={18} /><strong>{worker.is_available ? 'Available' : 'Currently busy'}</strong><small>Availability</small></span>
              </div>
            </div>

            <div className="detail-content-card">
              <h2>Services offered</h2>
              {worker.worker_services?.length ? (
                <div className="detail-service-list">
                  {worker.worker_services.map((service) => (
                    <div className="detail-service" key={service.id}>
                      <span className="service-check">✓</span>
                      <div><strong>{service.service_name || service.category_name}</strong>{service.description && <p>{service.description}</p>}</div>
                      <span>{service.price ? `₹${Number(service.price).toLocaleString('en-IN')}` : 'Ask for price'}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="muted-copy">Services have not been listed yet. Contact this professional to discuss your requirement.</p>}
            </div>

            {worker.portfolio_items?.length > 0 && (
              <div className="detail-content-card">
                <h2>Recent work</h2>
                <div className="portfolio-grid">
                  {worker.portfolio_items.map((item) => (
                    <article className="portfolio-item" key={item.id}>
                      {item.image && <img src={item.image} alt={item.title} />}
                      <strong>{item.title}</strong>
                      {item.description && <p>{item.description}</p>}
                    </article>
                  ))}
                </div>
              </div>
            )}

            {/* Customer Reviews Section */}
            <div className="detail-content-card reviews-card">
              <div className="panel-heading">
                <div>
                  <h2>Customer Reviews ({reviews.length})</h2>
                  <p>Real feedback from customers who booked {user.full_name}.</p>
                </div>
                <div className="overall-rating-badge">
                  <Star size={18} fill="currentColor" />
                  <span>{Number(worker.average_rating || 0).toFixed(1)} / 5</span>
                </div>
              </div>

              {loadingReviews ? (
                <p className="muted-copy">Loading customer reviews…</p>
              ) : reviews.length > 0 ? (
                <div className="reviews-list">
                  {reviews.map((rev) => (
                    <article className="review-item" key={rev.id}>
                      <div className="review-header">
                        <div className="review-author">
                          <strong>{rev.customer?.full_name || 'Verified Customer'}</strong>
                          <span className="review-date">{new Date(rev.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <div className="review-stars">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} size={14} fill={rev.rating >= s ? '#F59E0B' : 'none'} color={rev.rating >= s ? '#F59E0B' : '#D1D5DB'} />
                          ))}
                        </div>
                      </div>
                      {rev.title && <h3 className="review-title">{rev.title}</h3>}
                      {rev.comment && <p className="review-body">{rev.comment}</p>}
                      {rev.worker_reply && (
                        <div className="worker-reply-box">
                          <strong>Reply from {user.full_name}:</strong>
                          <p>{rev.worker_reply}</p>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="muted-copy">No reviews yet for this professional. Be the first to book and share your feedback!</p>
              )}
            </div>
          </section>

          {/* Contact & Booking Sidebar */}
          <aside className="contact-card">
            <span className="section-kicker">Direct Contact & Booking</span>
            <h2>Get in touch with {user.full_name}</h2>
            <p>You can call directly, chat on WhatsApp, or send an official booking request.</p>

            {worker.starting_price && (
              <div className="contact-price">
                <span>Starting from</span>
                <strong>₹{Number(worker.starting_price).toLocaleString('en-IN')}</strong>
              </div>
            )}

            {/* Direct Phone & WhatsApp section */}
            <div className="direct-contact-box">
              <span className="contact-label">Verified Contact Number</span>
              <div className="phone-number-line">
                <span className="phone-digits"><Phone size={16} /> {displayPhone || 'Contact available'}</span>
                {phone && (
                  <button type="button" className="copy-btn" onClick={copyPhone} title="Copy phone number">
                    {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                  </button>
                )}
              </div>

              {contactNumber ? (
                <div className="contact-actions">
                  <a className="button button-primary contact-button call-btn" href={getTelLink(phone)}>
                    <Phone size={17} /> Call Now ({displayPhone})
                  </a>
                  <a
                    className="button button-whatsapp contact-button"
                    href={getWhatsAppLink(phone, whatsappMessage)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <i className="bi bi-whatsapp" /> Chat on WhatsApp
                  </a>
                </div>
              ) : (
                <p className="muted-copy">Phone contact is pending verification for this provider.</p>
              )}
            </div>

            <hr className="contact-divider" />

            {/* Booking & Enquiry Buttons */}
            <div className="booking-actions-box">
              <span className="contact-label">Platform Services</span>
              <button
                type="button"
                className="button button-accent contact-button full-width"
                onClick={() => setBookingOpen(true)}
              >
                <Calendar size={17} /> Book This Professional
              </button>
              <button
                type="button"
                className="button button-outline contact-button full-width"
                onClick={() => setEnquiryOpen(true)}
              >
                <MessageSquare size={17} /> Send Enquiry
              </button>
            </div>

            <div className="contact-note">
              <ShieldCheck size={17} />
              <span>Direct communication enabled. Agree on the service scope, timing, and price before work begins.</span>
            </div>
          </aside>
        </div>
      </div>

      <BookingModal
        worker={worker}
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
      />

      <EnquiryModal
        worker={worker}
        isOpen={enquiryOpen}
        onClose={() => setEnquiryOpen(false)}
      />
    </div>
  )
}
