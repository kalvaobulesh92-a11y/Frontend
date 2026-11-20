import { ArrowUpRight, BadgeCheck, MapPin, Phone, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDisplayPhone, getTelLink, getWhatsAppLink, normalizeIndianPhone } from '../utils/contact.js'

export default function WorkerCard({ result, compact = false }) {
  const worker = result.worker || result
  const user = worker.user || {}
  const phone = user.phone || ''
  const contactNumber = normalizeIndianPhone(phone)
  const displayPhone = formatDisplayPhone(phone)
  const service = worker.worker_services?.find((item) => item.is_primary) || worker.worker_services?.[0]
  const location = result.matched_service_area || worker.service_areas?.[0]
  const initials = (user.full_name || 'KaamConnect')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  const whatsappMessage = `Hi ${user.full_name || 'there'}, I found your profile on KaamConnect and would like to ask about your services.`

  return (
    <article className={`worker-card ${compact ? 'compact' : ''}`}>
      <div className="worker-card-top">
        <div className="worker-avatar" aria-hidden="true">
          {user.profile_picture ? <img src={user.profile_picture} alt="" /> : initials}
        </div>
        <div className="worker-identity">
          <div className="worker-name-line">
            <h3>{user.full_name || 'Local professional'}</h3>
            {worker.verification_status === 'verified' && (
              <BadgeCheck className="verified-icon" size={18} aria-label="Verified professional" />
            )}
          </div>
          <p>{service?.service_name || service?.category_name || 'Home services professional'}</p>
        </div>
        <span className="rating-pill"><Star size={14} fill="currentColor" /> {Number(worker.average_rating || 0).toFixed(1)}</span>
      </div>

      <div className="worker-card-meta">
        {location && (
          <span><MapPin size={15} /> {location.locality}{result.distance_km != null && ` · ${result.distance_km} km away`}</span>
        )}
        <span>{worker.experience_years || 0}+ years experience</span>
      </div>

      {!compact && worker.bio && <p className="worker-bio">{worker.bio}</p>}

      <div className="worker-card-bottom">
        <div className="worker-price">
          {worker.starting_price ? (
            <><strong>₹{Number(worker.starting_price).toLocaleString('en-IN')}</strong><span> onwards</span></>
          ) : <span>Price on request</span>}
        </div>
        <div className="worker-actions">
          <Link className="button button-outline button-small" to={`/workers/${worker.id}`}>
            View profile <ArrowUpRight size={15} />
          </Link>
          {contactNumber && (
            <a
              className="icon-action call-action"
              href={getTelLink(phone)}
              aria-label={`Call ${user.full_name}: ${displayPhone}`}
              title={`Call ${displayPhone}`}
            >
              <Phone size={17} />
            </a>
          )}
          {contactNumber && (
            <a
              className="icon-action whatsapp-action"
              href={getWhatsAppLink(phone, whatsappMessage)}
              target="_blank"
              rel="noreferrer"
              aria-label={`Message ${user.full_name} on WhatsApp`}
              title="Message on WhatsApp"
            >
              <i className="bi bi-whatsapp" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </article>
  )
}
