import { useEffect, useState } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Calendar,
  Check,
  CheckCircle2,
  Clock3,
  ImagePlus,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Save,
  ShieldCheck,
  Star,
  Trash2,
  UserRound,
  Wallet,
  XCircle,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import ReviewModal from '../components/ReviewModal'
import PayoutWorkspace from '../components/PayoutWorkspace'
import WorkspaceSwitcher from '../components/WorkspaceSwitcher'
import api, { getApiError } from '../services/api'
import { useAuth } from '../context/useAuth'
import { useToast } from '../context/useToast'
import {
  formatDisplayPhone,
  getTelLink,
  getWhatsAppLink,
  normalizeIndianPhone,
} from '../utils/contact.js'

function DashboardHeader({ icon: Icon, eyebrow, title, description }) {
  return (
    <div className="dashboard-header">
      <span className="dashboard-icon"><Icon size={22} /></span>
      <div>
        <span className="section-kicker">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    pending: { label: 'Pending', className: 'status-pending' },
    confirmed: { label: 'Confirmed', className: 'status-confirmed' },
    in_progress: { label: 'In Progress', className: 'status-progress' },
    completed: { label: 'Completed', className: 'status-completed' },
    cancelled: { label: 'Cancelled', className: 'status-cancelled' },
    accepted: { label: 'Accepted', className: 'status-confirmed' },
    declined: { label: 'Declined', className: 'status-cancelled' },
    closed: { label: 'Closed', className: 'status-cancelled' },
  }
  const config = map[status] || { label: status, className: 'status-pending' }
  return <span className={`booking-status-badge ${config.className}`}>{config.label}</span>
}

function AddressFields({ register, errors }) {
  return (
    <>
      <div className="form-grid two-columns">
        <label className="form-field">
          <span>Address label</span>
          <input placeholder="Home, Office…" {...register('label', { required: 'Add a label.' })} />
          {errors.label && <span className="field-error">{errors.label.message}</span>}
        </label>
        <label className="form-field">
          <span>PIN code</span>
          <input inputMode="numeric" {...register('pincode', { required: 'Enter the PIN code.' })} />
          {errors.pincode && <span className="field-error">{errors.pincode.message}</span>}
        </label>
      </div>
      <label className="form-field">
        <span>Address line 1</span>
        <input autoComplete="address-line1" {...register('address_line1', { required: 'Enter the street or building.' })} />
        {errors.address_line1 && <span className="field-error">{errors.address_line1.message}</span>}
      </label>
      <label className="form-field">
        <span>Address line 2 <small>(optional)</small></span>
        <input autoComplete="address-line2" {...register('address_line2')} />
      </label>
      <div className="form-grid three-columns">
        <label className="form-field">
          <span>Locality</span>
          <input {...register('locality', { required: 'Enter your locality.' })} />
          {errors.locality && <span className="field-error">{errors.locality.message}</span>}
        </label>
        <label className="form-field">
          <span>City</span>
          <input defaultValue="Hyderabad" {...register('city', { required: 'Enter the city.' })} />
        </label>
        <label className="form-field">
          <span>State</span>
          <input defaultValue="Telangana" {...register('state', { required: 'Enter the state.' })} />
        </label>
      </div>
      <div className="form-grid two-columns">
        <label className="form-field">
          <span>Latitude <small>(optional)</small></span>
          <input type="number" step="any" min="-90" max="90" {...register('latitude')} />
        </label>
        <label className="form-field">
          <span>Longitude <small>(optional)</small></span>
          <input type="number" step="any" min="-180" max="180" {...register('longitude')} />
        </label>
      </div>
      <label className="checkbox-field">
        <input type="checkbox" {...register('is_default')} />
        <span>Make this my default address</span>
      </label>
    </>
  )
}

/* -------------------------------------------------------------
   CUSTOMER DASHBOARD
------------------------------------------------------------- */
export function CustomerDashboard() {
  const { user, setUser } = useAuth()
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState('bookings') // 'bookings', 'enquiries', 'addresses', 'profile'
  const [addresses, setAddresses] = useState([])
  const [editingAddress, setEditingAddress] = useState(null)
  const [addressOpen, setAddressOpen] = useState(false)
  const [bookings, setBookings] = useState([])
  const [enquiries, setEnquiries] = useState([])
  const [bookingFilter, setBookingFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [reviewBooking, setReviewBooking] = useState(null)

  const profileForm = useForm({
    defaultValues: { full_name: user?.full_name || '', phone: user?.phone || '', email: user?.email || '' },
  })
  const { reset: resetProfile } = profileForm
  const addressForm = useForm()

  useEffect(() => {
    let active = true
    Promise.all([
      api.get('/accounts/profile/'),
      api.get('/profiles/addresses/'),
      api.get('/bookings/?role=customer'),
      api.get('/enquiries/?role=customer'),
    ])
      .then(([accountResponse, addressResponse, bookingsResponse, enquiriesResponse]) => {
        if (!active) return
        setUser(accountResponse.data)
        resetProfile({
          full_name: accountResponse.data.full_name,
          phone: accountResponse.data.phone,
          email: accountResponse.data.email,
        })
        setAddresses(addressResponse.data.results || addressResponse.data || [])
        setBookings(bookingsResponse.data.results || bookingsResponse.data || [])
        setEnquiries(enquiriesResponse.data.results || enquiriesResponse.data || [])
      })
      .catch((requestError) => { if (active) setError(getApiError(requestError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [setUser, resetProfile])

  async function reloadBookings() {
    try {
      const { data } = await api.get('/bookings/?role=customer')
      setBookings(data.results || data || [])
    } catch {
      // quiet fail
    }
  }

  async function reloadEnquiries() {
    try {
      const { data } = await api.get('/enquiries/?role=customer')
      setEnquiries(data.results || data || [])
    } catch {
      // quiet fail
    }
  }

  async function cancelEnquiry(enquiryId) {
    if (!window.confirm('Cancel this enquiry?')) return
    try {
      await api.post(`/enquiries/${enquiryId}/status/`, { status: 'cancelled' })
      showToast('Enquiry cancelled.')
      await reloadEnquiries()
    } catch (err) {
      showToast(getApiError(err), 'error')
    }
  }

  async function saveProfile(values) {
    setSavingProfile(true)
    setError('')
    try {
      const { data } = await api.patch('/accounts/profile/', values)
      setUser(data)
      showToast('Your profile has been updated.')
    } catch (requestError) {
      setError(getApiError(requestError))
    } finally {
      setSavingProfile(false)
    }
  }

  function openAddress(address = null) {
    setEditingAddress(address)
    addressForm.reset(address || {
      label: 'Home',
      city: 'Hyderabad',
      state: 'Telangana',
      is_default: addresses.length === 0,
    })
    setAddressOpen(true)
  }

  async function saveAddress(values) {
    const payload = { ...values }
    for (const field of ['latitude', 'longitude']) {
      if (payload[field] === '' || payload[field] == null) delete payload[field]
      else payload[field] = Number(payload[field])
    }
    try {
      if (editingAddress) {
        await api.patch(`/profiles/addresses/${editingAddress.id}/`, payload)
        showToast('Address updated.')
      } else {
        await api.post('/profiles/addresses/', payload)
        showToast('Address added.')
      }
      const { data } = await api.get('/profiles/addresses/')
      setAddresses(data.results || data || [])
      setAddressOpen(false)
    } catch (requestError) {
      addressForm.setError('root', { message: getApiError(requestError) })
    }
  }

  async function deleteAddress(address) {
    if (!window.confirm(`Remove the ${address.label.toLowerCase()} address?`)) return
    try {
      await api.delete(`/profiles/addresses/${address.id}/`)
      setAddresses((items) => items.filter((item) => item.id !== address.id))
      showToast('Address removed.')
    } catch (requestError) {
      showToast(getApiError(requestError), 'error')
    }
  }

  async function cancelBooking(booking) {
    const reason = window.prompt('Please enter a cancellation reason:', 'Schedule conflict')
    if (reason === null) return
    try {
      await api.post(`/bookings/${booking.id}/status/`, {
        status: 'cancelled',
        cancellation_reason: reason || 'Cancelled by customer',
      })
      showToast('Booking cancelled.')
      await reloadBookings()
    } catch (err) {
      showToast(getApiError(err), 'error')
    }
  }

  async function approveBookingCompletion(booking) {
    try {
      await api.post(`/bookings/${booking.id}/approve-completion/`, {})
      showToast('Completed work approved. The worker may request a payout for staff review.')
      await reloadBookings()
    } catch (requestError) {
      showToast(getApiError(requestError), 'error')
    }
  }

  const filteredBookings = bookings.filter((b) => {
    if (bookingFilter === 'all') return true
    return b.status === bookingFilter
  })

  return (
    <div className="dashboard-page">
      <div className="container dashboard-container">
        <DashboardHeader
          icon={UserRound}
          eyebrow="Customer Workspace"
          title={`Hello, ${user?.full_name?.split(' ')[0] || 'there'}`}
          description="Manage your bookings, enquiries, direct contact with professionals, and saved addresses."
        />
        {user?.is_worker && <WorkspaceSwitcher active="customer" />}
        <Link className="button button-outline" to="/customer/quotations">
          <BriefcaseBusiness size={16} /> Job Requests & Quotations
        </Link>
        <Link className="button button-outline" to="/customer/projects">
          <BriefcaseBusiness size={16} /> My Projects
        </Link>
        {error && <div className="form-alert dashboard-alert" role="alert">{error}</div>}

        {/* Dashboard Navigation Tabs */}
        <div className="dashboard-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            <Calendar size={17} /> My Bookings ({bookings.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'enquiries' ? 'active' : ''}`}
            onClick={() => setActiveTab('enquiries')}
          >
            <MessageSquare size={17} /> My Enquiries ({enquiries.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'addresses' ? 'active' : ''}`}
            onClick={() => setActiveTab('addresses')}
          >
            <MapPin size={17} /> Addresses ({addresses.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <UserRound size={17} /> Profile Details
          </button>
        </div>

        {loading ? (
          <div className="skeleton dashboard-skeleton" />
        ) : (
          <>
            {/* BOOKINGS TAB */}
            {activeTab === 'bookings' && (
              <section className="dashboard-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Service Bookings</h2>
                    <p>Track your scheduled visits and contact assigned workers directly through phone or WhatsApp.</p>
                  </div>
                  <div className="filter-pills">
                    {['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map((st) => (
                      <button
                        key={st}
                        type="button"
                        className={`filter-pill ${bookingFilter === st ? 'active' : ''}`}
                        onClick={() => setBookingFilter(st)}
                      >
                        {st.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredBookings.length > 0 ? (
                  <div className="booking-card-list">
                    {filteredBookings.map((b) => {
                      const workerUser = b.worker?.user || {}
                      const workerPhone = workerUser.phone || ''
                      const contactDigits = normalizeIndianPhone(workerPhone)
                      const displayPhone = formatDisplayPhone(workerPhone)
                      const waMsg = `Hi ${workerUser.full_name}, I am following up on Booking #${b.id} for ${b.service?.name || 'service'} on KaamConnect.`

                      return (
                        <article className="booking-card" key={b.id}>
                          <div className="booking-card-header">
                            <div>
                              <span className="booking-id">Booking #{b.id}</span>
                              <h3>{b.service?.name || 'General Service Request'}</h3>
                              <p className="booking-worker-name">
                                Professional: <strong>{workerUser.full_name || 'Assigned Worker'}</strong>
                              </p>
                            </div>
                            <StatusBadge status={b.status} />
                          </div>

                          <div className="booking-meta-grid">
                            <div>
                              <span className="meta-label"><Calendar size={14} /> Scheduled Date</span>
                              <strong>{b.scheduled_date} {b.scheduled_time && `at ${b.scheduled_time.slice(0, 5)}`}</strong>
                            </div>
                            <div>
                              <span className="meta-label"><MapPin size={14} /> Address</span>
                              <strong>{b.address?.locality || 'Hyderabad'}, {b.address?.city || ''}</strong>
                            </div>
                            <div>
                              <span className="meta-label">Amount</span>
                              <strong>₹{Number(b.final_amount || b.estimated_amount || 0).toLocaleString('en-IN')}</strong>
                            </div>
                          </div>

                          {b.customer_notes && (
                            <p className="booking-notes">
                              <strong>Your notes:</strong> {b.customer_notes}
                            </p>
                          )}

                          {/* DIRECT CONTACT BUTTONS */}
                          <div className="booking-contact-bar">
                            <span className="contact-prompt">
                              Contact Professional:
                            </span>
                            {contactDigits ? (
                              <div className="contact-pill-group">
                                <a
                                  className="button button-outline button-small contact-pill call-pill"
                                  href={getTelLink(workerPhone)}
                                  title={`Call ${displayPhone}`}
                                >
                                  <Phone size={14} /> Call ({displayPhone})
                                </a>
                                <a
                                  className="button button-whatsapp button-small contact-pill"
                                  href={getWhatsAppLink(workerPhone, waMsg)}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <i className="bi bi-whatsapp" /> WhatsApp
                                </a>
                              </div>
                            ) : (
                              <span className="muted-copy">Contact number will be available upon confirmation.</span>
                            )}

                            <div className="booking-actions-right">
                              {['pending', 'confirmed'].includes(b.status) && (
                                <button
                                  type="button"
                                  className="button button-outline danger-outline button-small"
                                  onClick={() => cancelBooking(b)}
                                >
                                  Cancel Booking
                                </button>
                              )}
                              {b.status === 'completed' && !b.has_review && (
                                <button
                                  type="button"
                                  className="button button-primary button-small"
                                  onClick={() => setReviewBooking(b)}
                                >
                                  <Star size={14} /> Leave Review
                                </button>
                              )}
                              {b.status === 'completed' && !b.customer_approved_completed_at && (
                                <button
                                  type="button"
                                  className="button button-primary button-small"
                                  onClick={() => approveBookingCompletion(b)}
                                >
                                  <CheckCircle2 size={14} /> Approve completed work
                                </button>
                              )}
                              {b.customer_approved_completed_at && (
                                <span className="reviewed-badge"><Check size={14} /> Completion approved</span>
                              )}
                              {b.has_review && (
                                <span className="reviewed-badge"><Check size={14} /> Reviewed</span>
                              )}
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Calendar size={32} />
                    <strong>No bookings found</strong>
                    <span>You haven&apos;t scheduled any service visits with this filter yet.</span>
                    <Link className="button button-primary button-small" to="/search">Find a professional</Link>
                  </div>
                )}
              </section>
            )}

            {/* ENQUIRIES TAB */}
            {activeTab === 'enquiries' && (
              <section className="dashboard-panel">
                <div className="panel-heading">
                  <div>
                    <h2>My Inquiries</h2>
                    <p>Questions sent to local service providers.</p>
                  </div>
                </div>

                {enquiries.length > 0 ? (
                  <div className="booking-card-list">
                    {enquiries.map((enq) => {
                      const workerUser = enq.worker?.user || {}
                      const workerPhone = workerUser.phone || ''
                      const contactDigits = normalizeIndianPhone(workerPhone)
                      const displayPhone = formatDisplayPhone(workerPhone)
                      const waMsg = `Hello ${workerUser.full_name}, I am following up on my enquiry "${enq.subject}" on KaamConnect.`

                      return (
                        <article className="booking-card" key={enq.id}>
                          <div className="booking-card-header">
                            <div>
                              <span className="booking-id">Enquiry #{enq.id}</span>
                              <h3>{enq.subject}</h3>
                              <p className="booking-worker-name">
                                Professional: <strong>{workerUser.full_name || 'Professional'}</strong> ({enq.category_name})
                              </p>
                            </div>
                            <StatusBadge status={enq.status} />
                          </div>

                          <p className="booking-notes">
                            <strong>Message:</strong> {enq.message}
                          </p>

                          <div className="booking-meta-grid">
                            <div>
                              <span className="meta-label">Preferred Date</span>
                              <strong>{enq.preferred_date || 'Flexible'}</strong>
                            </div>
                            <div>
                              <span className="meta-label">Contact Preference</span>
                              <strong>{enq.contact_preference_display || enq.contact_preference}</strong>
                            </div>
                            <div>
                              <span className="meta-label">Submitted On</span>
                              <strong>{new Date(enq.created_at).toLocaleDateString('en-IN')}</strong>
                            </div>
                          </div>

                          <div className="booking-contact-bar">
                            <span className="contact-prompt">Direct Reachout:</span>
                            {contactDigits && (
                              <div className="contact-pill-group">
                                <a
                                  className="button button-outline button-small contact-pill call-pill"
                                  href={getTelLink(workerPhone)}
                                >
                                  <Phone size={14} /> Call ({displayPhone})
                                </a>
                                <a
                                  className="button button-whatsapp button-small contact-pill"
                                  href={getWhatsAppLink(workerPhone, waMsg)}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <i className="bi bi-whatsapp" /> WhatsApp
                                </a>
                              </div>
                            )}

                            {enq.status === 'pending' && (
                              <div className="booking-actions-right">
                                <button
                                  type="button"
                                  className="button button-outline danger-outline button-small"
                                  onClick={() => cancelEnquiry(enq.id)}
                                >
                                  Cancel Enquiry
                                </button>
                              </div>
                            )}
                          </div>
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  <div className="empty-state">
                    <MessageSquare size={32} />
                    <strong>No enquiries sent yet</strong>
                    <span>Browse professionals and ask questions before booking.</span>
                    <Link className="button button-primary button-small" to="/search">Find a professional</Link>
                  </div>
                )}
              </section>
            )}

            {/* SAVED ADDRESSES TAB */}
            {activeTab === 'addresses' && (
              <section className="dashboard-panel addresses-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Service Addresses</h2>
                    <p>These addresses are private to your account and used for service bookings.</p>
                  </div>
                  {!addressOpen && (
                    <button className="button button-outline button-small" type="button" onClick={() => openAddress()}>
                      <Plus size={16} /> Add address
                    </button>
                  )}
                </div>

                {addressOpen && (
                  <form className="dashboard-form address-form" onSubmit={addressForm.handleSubmit(saveAddress)}>
                    <div className="panel-heading form-panel-heading">
                      <h3>{editingAddress ? 'Edit address' : 'Add an address'}</h3>
                      <button className="text-button" type="button" onClick={() => setAddressOpen(false)}>Cancel</button>
                    </div>
                    {addressForm.formState.errors.root && (
                      <div className="form-alert">{addressForm.formState.errors.root.message}</div>
                    )}
                    <AddressFields register={addressForm.register} errors={addressForm.formState.errors} />
                    <button className="button button-primary" type="submit"><Save size={16} /> Save address</button>
                  </form>
                )}

                {addresses.length ? (
                  <div className="address-list">
                    {addresses.map((address) => (
                      <article className="address-card" key={address.id}>
                        <span className="address-icon"><MapPin size={18} /></span>
                        <div className="address-copy">
                          <div>
                            <strong>{address.label}</strong>
                            {address.is_default && <span className="default-badge">Default</span>}
                          </div>
                          <p>
                            {address.address_line1}{address.address_line2 && `, ${address.address_line2}`}
                            <br />
                            {address.locality}, {address.city} {address.pincode}
                          </p>
                        </div>
                        <div className="address-actions">
                          <button type="button" className="text-button" onClick={() => openAddress(address)}>Edit</button>
                          <button type="button" className="icon-action danger-action" aria-label="Remove address" onClick={() => deleteAddress(address)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : !addressOpen && (
                  <div className="empty-state compact-empty">
                    <MapPin size={22} />
                    <strong>No saved addresses yet</strong>
                    <span>Add one to keep your service details handy.</span>
                    <button type="button" className="text-button" onClick={() => openAddress()}>
                      <Plus size={16} /> Add an address
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <section className="dashboard-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Personal Details</h2>
                    <p>Keep your contact details up to date so service professionals can reach you.</p>
                  </div>
                </div>
                <form className="dashboard-form" onSubmit={profileForm.handleSubmit(saveProfile)}>
                  <label className="form-field">
                    <span>Full name</span>
                    <input autoComplete="name" {...profileForm.register('full_name', { required: 'Your name is required.' })} />
                    {profileForm.formState.errors.full_name && <span className="field-error">{profileForm.formState.errors.full_name.message}</span>}
                  </label>
                  <label className="form-field">
                    <span>Email address</span>
                    <input type="email" autoComplete="email" {...profileForm.register('email', { required: 'Your email is required.' })} />
                    {profileForm.formState.errors.email && <span className="field-error">{profileForm.formState.errors.email.message}</span>}
                  </label>
                  <label className="form-field">
                    <span>Phone number (for calls and WhatsApp)</span>
                    <input type="tel" autoComplete="tel" {...profileForm.register('phone', { required: 'Your phone is required.' })} />
                    {profileForm.formState.errors.phone && <span className="field-error">{profileForm.formState.errors.phone.message}</span>}
                  </label>
                  <button className="button button-primary" type="submit" disabled={savingProfile}>
                    <Save size={16} /> {savingProfile ? 'Saving…' : 'Save changes'}
                  </button>
                </form>
              </section>
            )}
          </>
        )}
      </div>

      <ReviewModal
        booking={reviewBooking}
        isOpen={Boolean(reviewBooking)}
        onClose={() => setReviewBooking(null)}
        onReviewSubmitted={reloadBookings}
      />
    </div>
  )
}

/* -------------------------------------------------------------
   WORKER DASHBOARD
------------------------------------------------------------- */
function WorkerProfileForm({ profile, onSave, submitting }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ defaultValues: profile })
  useEffect(() => { reset(profile) }, [profile, reset])

  return (
    <form className="dashboard-form" onSubmit={handleSubmit(onSave)}>
      <label className="form-field">
        <span>About your work / Bio</span>
        <textarea rows="5" maxLength="2000" placeholder="Tell customers about your experience, expertise, and working style." {...register('bio')} />
      </label>
      <div className="form-grid two-columns">
        <label className="form-field">
          <span>Years of experience</span>
          <input type="number" min="0" max="80" {...register('experience_years', { valueAsNumber: true, min: { value: 0, message: 'Experience cannot be negative.' } })} />
          {errors.experience_years && <span className="field-error">{errors.experience_years.message}</span>}
        </label>
        <label className="form-field">
          <span>Starting price (₹)</span>
          <input type="number" min="0" step="0.01" {...register('starting_price', { setValueAs: (value) => value === '' ? null : Number(value) })} />
        </label>
      </div>
      <div className="form-grid two-columns">
        <label className="form-field">
          <span>Pricing style</span>
          <select {...register('pricing_type')}>
            <option value="starting_from">Starting from</option>
            <option value="fixed">Fixed</option>
            <option value="hourly">Hourly</option>
            <option value="negotiable">Negotiable</option>
          </select>
        </label>
        <label className="checkbox-field available-field">
          <input type="checkbox" {...register('is_available')} />
          <span>Available for new customer work</span>
        </label>
      </div>
      <button className="button button-primary" type="submit" disabled={submitting}>
        <Save size={16} /> {submitting ? 'Saving…' : 'Save professional profile'}
      </button>
    </form>
  )
}

export function WorkerDashboard() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState('bookings') // 'bookings', 'enquiries', 'payouts', 'services', 'profile', 'reviews'
  const [profile, setProfile] = useState(null)
  const [categories, setCategories] = useState([])
  const [bookings, setBookings] = useState([])
  const [enquiries, setEnquiries] = useState([])
  const [reviews, setReviews] = useState([])
  const [bookingFilter, setBookingFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [savingService, setSavingService] = useState(false)
  const [savingArea, setSavingArea] = useState(false)
  const [savingAvailability, setSavingAvailability] = useState(false)
  const [savingPortfolio, setSavingPortfolio] = useState(false)
  const [error, setError] = useState('')

  const serviceForm = useForm({
    defaultValues: { category: '', service: '', description: '', price: '', is_primary: false },
  })
  const areaForm = useForm({
    defaultValues: {
      locality: '', city: 'Hyderabad', state: 'Telangana', pincode: '',
      latitude: '', longitude: '', radius_km: 5,
    },
  })
  const availabilityForm = useForm({
    defaultValues: { day_of_week: '0', start_time: '09:00', end_time: '17:00', is_available: true },
  })
  const portfolioForm = useForm({
    defaultValues: { title: '', description: '', is_before_after: false },
  })
  const selectedCategory = useWatch({ control: serviceForm.control, name: 'category' })
  const availableServices = categories.find((category) => String(category.id) === String(selectedCategory))?.services || []
  const categoryRegistration = serviceForm.register('category', { required: 'Choose a category.' })

  useEffect(() => {
    let active = true
    Promise.all([
      api.get('/profiles/workers/me/'),
      api.get('/categories/'),
      api.get('/bookings/?role=worker'),
      api.get('/enquiries/?role=worker'),
      api.get('/reviews/'),
    ])
      .then(([profileResponse, categoriesResponse, bookingsResponse, enquiriesResponse, reviewsResponse]) => {
        if (!active) return
        setProfile(profileResponse.data)
        setCategories(categoriesResponse.data.results || categoriesResponse.data || [])
        setBookings(bookingsResponse.data.results || bookingsResponse.data || [])
        setEnquiries(enquiriesResponse.data.results || enquiriesResponse.data || [])
        setReviews(reviewsResponse.data.results || reviewsResponse.data || [])
      })
      .catch((requestError) => { if (active) setError(getApiError(requestError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  async function reloadProfile() {
    const { data } = await api.get('/profiles/workers/me/')
    setProfile(data)
  }

  async function reloadBookings() {
    try {
      const { data } = await api.get('/bookings/?role=worker')
      setBookings(data.results || data || [])
    } catch {
      // quiet fail
    }
  }

  async function reloadEnquiries() {
    try {
      const { data } = await api.get('/enquiries/?role=worker')
      setEnquiries(data.results || data || [])
    } catch {
      // quiet fail
    }
  }

  async function reloadReviews() {
    try {
      const { data } = await api.get('/reviews/')
      setReviews(data.results || data || [])
    } catch {
      // quiet fail
    }
  }

  async function updateBookingStatus(bookingId, newStatus) {
    let payload = { status: newStatus }
    if (newStatus === 'completed') {
      const finalAmt = window.prompt('Enter final amount received (₹):', '300')
      if (finalAmt === null) return
      const notes = window.prompt('Optional completion notes:', 'Work completed successfully')
      payload.final_amount = Number(finalAmt) || null
      payload.worker_notes = notes || ''
    } else if (newStatus === 'cancelled') {
      const reason = window.prompt('Reason for declining/cancelling:', 'Unavailable at this time')
      if (reason === null) return
      payload.cancellation_reason = reason || 'Declined by professional'
    }

    try {
      await api.post(`/bookings/${bookingId}/status/`, payload)
      showToast(`Booking marked as ${newStatus}.`)
      await reloadBookings()
      await reloadProfile()
    } catch (err) {
      showToast(getApiError(err), 'error')
    }
  }

  async function updateEnquiryStatus(enquiryId, newStatus) {
    try {
      await api.post(`/enquiries/${enquiryId}/status/`, { status: newStatus })
      showToast(`Enquiry ${newStatus}.`)
      await reloadEnquiries()
    } catch (err) {
      showToast(getApiError(err), 'error')
    }
  }

  async function replyToReview(reviewId) {
    const replyText = window.prompt('Write your response to this customer review:')
    if (!replyText) return
    try {
      await api.post(`/reviews/${reviewId}/reply/`, { worker_reply: replyText })
      showToast('Reply published.')
      await reloadReviews()
    } catch (err) {
      showToast(getApiError(err), 'error')
    }
  }

  async function saveProfile(values) {
    setSubmitting(true)
    setError('')
    try {
      const { data } = await api.patch('/profiles/workers/me/', values)
      setProfile(data)
      showToast('Professional profile updated.')
    } catch (requestError) {
      setError(getApiError(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  async function saveWorkerService(values) {
    setSavingService(true)
    serviceForm.clearErrors('root')
    try {
      await api.post('/profiles/workers/me/services/', {
        ...values,
        category: Number(values.category),
        service: Number(values.service),
        price: values.price === '' ? null : Number(values.price),
      })
      await reloadProfile()
      serviceForm.reset({ category: '', service: '', description: '', price: '', is_primary: false })
      showToast('Service added to your profile.')
    } catch (requestError) {
      serviceForm.setError('root', { message: getApiError(requestError) })
    } finally {
      setSavingService(false)
    }
  }

  async function removeWorkerService(service) {
    if (!window.confirm(`Remove ${service.service_name || service.category_name} from your profile?`)) return
    try {
      await api.delete(`/profiles/workers/me/services/${service.id}/`)
      await reloadProfile()
      showToast('Service removed.')
    } catch (requestError) {
      showToast(getApiError(requestError), 'error')
    }
  }

  async function saveServiceArea(values) {
    setSavingArea(true)
    areaForm.clearErrors('root')
    try {
      await api.post('/profiles/workers/me/service-areas/', {
        ...values,
        latitude: Number(values.latitude),
        longitude: Number(values.longitude),
        radius_km: Number(values.radius_km),
      })
      await reloadProfile()
      areaForm.reset({
        locality: '', city: 'Hyderabad', state: 'Telangana', pincode: '',
        latitude: '', longitude: '', radius_km: 5,
      })
      showToast('Service area added.')
    } catch (requestError) {
      areaForm.setError('root', { message: getApiError(requestError) })
    } finally {
      setSavingArea(false)
    }
  }

  async function removeServiceArea(area) {
    if (!window.confirm(`Stop serving ${area.locality}, ${area.city}?`)) return
    try {
      await api.delete(`/profiles/workers/me/service-areas/${area.id}/`)
      await reloadProfile()
      showToast('Service area removed.')
    } catch (requestError) {
      showToast(getApiError(requestError), 'error')
    }
  }

  async function saveAvailability(values) {
    setSavingAvailability(true)
    availabilityForm.clearErrors('root')
    try {
      await api.post('/profiles/workers/me/availability/', {
        ...values,
        day_of_week: Number(values.day_of_week),
      })
      await reloadProfile()
      availabilityForm.reset({
        day_of_week: values.day_of_week,
        start_time: '09:00',
        end_time: '17:00',
        is_available: true,
      })
      showToast('Availability added.')
    } catch (requestError) {
      availabilityForm.setError('root', { message: getApiError(requestError) })
    } finally {
      setSavingAvailability(false)
    }
  }

  async function removeAvailability(slot) {
    if (!window.confirm(`Remove your ${slot.day_name} ${slot.start_time.slice(0, 5)}–${slot.end_time.slice(0, 5)} availability?`)) return
    try {
      await api.delete(`/profiles/workers/me/availability/${slot.id}/`)
      await reloadProfile()
      showToast('Availability removed.')
    } catch (requestError) {
      showToast(getApiError(requestError), 'error')
    }
  }

  async function savePortfolioItem(values) {
    setSavingPortfolio(true)
    portfolioForm.clearErrors('root')
    try {
      const formData = new FormData()
      formData.append('title', values.title)
      formData.append('description', values.description || '')
      formData.append('is_before_after', String(Boolean(values.is_before_after)))
      formData.append('image', values.image[0])
      await api.post('/profiles/workers/me/portfolio/', formData)
      await reloadProfile()
      portfolioForm.reset({ title: '', description: '', is_before_after: false })
      showToast('Portfolio project added.')
    } catch (requestError) {
      portfolioForm.setError('root', { message: getApiError(requestError) })
    } finally {
      setSavingPortfolio(false)
    }
  }

  async function removePortfolioItem(item) {
    if (!window.confirm(`Remove "${item.title}" from your portfolio?`)) return
    try {
      await api.delete(`/profiles/workers/me/portfolio/${item.id}/`)
      await reloadProfile()
      showToast('Portfolio project removed.')
    } catch (requestError) {
      showToast(getApiError(requestError), 'error')
    }
  }

  const filteredBookings = bookings.filter((b) => {
    if (bookingFilter === 'all') return true
    return b.status === bookingFilter
  })

  return (
    <div className="dashboard-page">
      <div className="container dashboard-container">
        <DashboardHeader
          icon={BriefcaseBusiness}
          eyebrow="Professional Workspace"
          title={`Welcome, ${user?.full_name?.split(' ')[0] || 'Partner'}`}
          description="Manage incoming customer bookings, customer enquiries, services, and coverage areas."
        />
        {user?.is_customer && <WorkspaceSwitcher active="worker" />}
        <Link className="button button-outline" to="/worker/quotations">
          <BriefcaseBusiness size={16} /> Find Work & Quotations
        </Link>
        <Link className="button button-outline" to="/worker/projects">
          <BriefcaseBusiness size={16} /> Assigned Projects
        </Link>
        {error && <div className="form-alert dashboard-alert" role="alert">{error}</div>}

        {profile && (
          <div className="worker-stats-grid">
            <div className="worker-stat">
              <span className="stat-icon"><Star size={18} fill="currentColor" /></span>
              <strong>{Number(profile.average_rating || 0).toFixed(1)}</strong>
              <small>Average Rating</small>
            </div>
            <div className="worker-stat">
              <span className="stat-icon"><BadgeCheck size={18} /></span>
              <strong>{profile.total_reviews || 0}</strong>
              <small>Reviews</small>
            </div>
            <div className="worker-stat">
              <span className="stat-icon"><BriefcaseBusiness size={18} /></span>
              <strong>{profile.total_bookings || 0}</strong>
              <small>Completed Jobs</small>
            </div>
            <div className="worker-stat">
              <span className="stat-icon"><ShieldCheck size={18} /></span>
              <strong className="status-text">{profile.verification_status}</strong>
              <small>Verification Status</small>
            </div>
          </div>
        )}

        {/* Dashboard Tabs */}
        <div className="dashboard-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            <Calendar size={17} /> Customer Bookings ({bookings.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'enquiries' ? 'active' : ''}`}
            onClick={() => setActiveTab('enquiries')}
          >
            <MessageSquare size={17} /> Inquiries ({enquiries.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'payouts' ? 'active' : ''}`}
            onClick={() => setActiveTab('payouts')}
          >
            <Wallet size={17} /> Payouts
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'services' ? 'active' : ''}`}
            onClick={() => setActiveTab('services')}
          >
            <BriefcaseBusiness size={17} /> Services & Coverage
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'availability' ? 'active' : ''}`}
            onClick={() => setActiveTab('availability')}
          >
            <Clock3 size={17} /> Availability
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'portfolio' ? 'active' : ''}`}
            onClick={() => setActiveTab('portfolio')}
          >
            <ImagePlus size={17} /> Portfolio
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            <Star size={17} /> Customer Reviews ({reviews.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <UserRound size={17} /> Profile Details
          </button>
        </div>

        {loading ? (
          <div className="skeleton dashboard-skeleton" />
        ) : profile && (
          <>
            {/* BOOKINGS TAB */}
            {activeTab === 'bookings' && (
              <section className="dashboard-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Job Requests & Scheduled Visits</h2>
                    <p>Review customer requests, confirm appointments, and contact customers directly via Phone or WhatsApp.</p>
                  </div>
                  <div className="filter-pills">
                    {['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map((st) => (
                      <button
                        key={st}
                        type="button"
                        className={`filter-pill ${bookingFilter === st ? 'active' : ''}`}
                        onClick={() => setBookingFilter(st)}
                      >
                        {st.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredBookings.length > 0 ? (
                  <div className="booking-card-list">
                    {filteredBookings.map((b) => {
                      const cust = b.customer || {}
                      const custPhone = cust.phone || ''
                      const contactDigits = normalizeIndianPhone(custPhone)
                      const displayPhone = formatDisplayPhone(custPhone)
                      const waMsg = `Hello ${cust.full_name}, I am your service professional for Booking #${b.id} on KaamConnect. I would like to confirm your service details.`

                      return (
                        <article className="booking-card" key={b.id}>
                          <div className="booking-card-header">
                            <div>
                              <span className="booking-id">Booking #{b.id}</span>
                              <h3>{b.service?.name || 'General Service Request'}</h3>
                              <p className="booking-worker-name">
                                Customer: <strong>{cust.full_name || 'Customer'}</strong>
                              </p>
                            </div>
                            <StatusBadge status={b.status} />
                          </div>

                          <div className="booking-meta-grid">
                            <div>
                              <span className="meta-label"><Calendar size={14} /> Scheduled Date</span>
                              <strong>{b.scheduled_date} {b.scheduled_time && `at ${b.scheduled_time.slice(0, 5)}`}</strong>
                            </div>
                            <div>
                              <span className="meta-label"><MapPin size={14} /> Address</span>
                              <strong>{b.address?.address_line1}, {b.address?.locality} ({b.address?.pincode})</strong>
                            </div>
                            <div>
                              <span className="meta-label">Estimated Budget</span>
                              <strong>₹{Number(b.final_amount || b.estimated_amount || 0).toLocaleString('en-IN')}</strong>
                            </div>
                          </div>

                          {b.customer_notes && (
                            <p className="booking-notes">
                              <strong>Customer notes:</strong> {b.customer_notes}
                            </p>
                          )}

                          {/* DIRECT CALL AND WHATSAPP BAR */}
                          <div className="booking-contact-bar">
                            <span className="contact-prompt">Customer Contact:</span>
                            {contactDigits ? (
                              <div className="contact-pill-group">
                                <a
                                  className="button button-outline button-small contact-pill call-pill"
                                  href={getTelLink(custPhone)}
                                  title={`Call ${displayPhone}`}
                                >
                                  <Phone size={14} /> Call ({displayPhone})
                                </a>
                                <a
                                  className="button button-whatsapp button-small contact-pill"
                                  href={getWhatsAppLink(custPhone, waMsg)}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <i className="bi bi-whatsapp" /> WhatsApp
                                </a>
                              </div>
                            ) : (
                              <span className="muted-copy">{custPhone || 'No contact phone provided'}</span>
                            )}

                            {/* WORKER STATUS ACTIONS */}
                            <div className="booking-actions-right">
                              {b.status === 'pending' && (
                                <>
                                  <button
                                    type="button"
                                    className="button button-primary button-small"
                                    onClick={() => updateBookingStatus(b.id, 'confirmed')}
                                  >
                                    <CheckCircle2 size={14} /> Accept & Confirm
                                  </button>
                                  <button
                                    type="button"
                                    className="button button-outline danger-outline button-small"
                                    onClick={() => updateBookingStatus(b.id, 'cancelled')}
                                  >
                                    <XCircle size={14} /> Decline
                                  </button>
                                </>
                              )}
                              {b.status === 'confirmed' && (
                                <>
                                  <button
                                    type="button"
                                    className="button button-accent button-small"
                                    onClick={() => updateBookingStatus(b.id, 'in_progress')}
                                  >
                                    Start Job
                                  </button>
                                  <button
                                    type="button"
                                    className="button button-primary button-small"
                                    onClick={() => updateBookingStatus(b.id, 'completed')}
                                  >
                                    Mark Completed
                                  </button>
                                </>
                              )}
                              {b.status === 'in_progress' && (
                                <button
                                  type="button"
                                  className="button button-primary button-small"
                                  onClick={() => updateBookingStatus(b.id, 'completed')}
                                >
                                  Mark Completed
                                </button>
                              )}
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Calendar size={32} />
                    <strong>No bookings found</strong>
                    <span>No customer bookings currently match this status filter.</span>
                  </div>
                )}
              </section>
            )}

            {activeTab === 'payouts' && <PayoutWorkspace />}

            {/* ENQUIRIES TAB */}
            {activeTab === 'enquiries' && (
              <section className="dashboard-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Customer Inquiries</h2>
                    <p>Inquiries sent directly to your profile from customers.</p>
                  </div>
                </div>

                {enquiries.length > 0 ? (
                  <div className="booking-card-list">
                    {enquiries.map((enq) => {
                      const cust = enq.customer || {}
                      const custPhone = cust.phone || ''
                      const contactDigits = normalizeIndianPhone(custPhone)
                      const displayPhone = formatDisplayPhone(custPhone)
                      const waMsg = `Hello ${cust.full_name}, I received your enquiry "${enq.subject}" on KaamConnect.`

                      return (
                        <article className="booking-card" key={enq.id}>
                          <div className="booking-card-header">
                            <div>
                              <span className="booking-id">Inquiry #{enq.id}</span>
                              <h3>{enq.subject}</h3>
                              <p className="booking-worker-name">
                                From: <strong>{cust.full_name || 'Customer'}</strong>
                              </p>
                            </div>
                            <StatusBadge status={enq.status} />
                          </div>

                          <p className="booking-notes">
                            <strong>Message:</strong> {enq.message}
                          </p>

                          <div className="booking-meta-grid">
                            <div>
                              <span className="meta-label">Preferred Date</span>
                              <strong>{enq.preferred_date || 'Flexible'}</strong>
                            </div>
                            <div>
                              <span className="meta-label">Customer Preference</span>
                              <strong>{enq.contact_preference_display || enq.contact_preference}</strong>
                            </div>
                            <div>
                              <span className="meta-label">Received</span>
                              <strong>{new Date(enq.created_at).toLocaleDateString('en-IN')}</strong>
                            </div>
                          </div>

                          <div className="booking-contact-bar">
                            <span className="contact-prompt">Customer Contact:</span>
                            {contactDigits && (
                              <div className="contact-pill-group">
                                <a
                                  className="button button-outline button-small contact-pill call-pill"
                                  href={getTelLink(custPhone)}
                                >
                                  <Phone size={14} /> Call ({displayPhone})
                                </a>
                                <a
                                  className="button button-whatsapp button-small contact-pill"
                                  href={getWhatsAppLink(custPhone, waMsg)}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <i className="bi bi-whatsapp" /> WhatsApp
                                </a>
                              </div>
                            )}

                            {enq.status === 'pending' && (
                              <div className="booking-actions-right">
                                <button
                                  type="button"
                                  className="button button-primary button-small"
                                  onClick={() => updateEnquiryStatus(enq.id, 'accepted')}
                                >
                                  Accept Inquiry
                                </button>
                                <button
                                  type="button"
                                  className="button button-outline danger-outline button-small"
                                  onClick={() => updateEnquiryStatus(enq.id, 'declined')}
                                >
                                  Decline
                                </button>
                              </div>
                            )}
                          </div>
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  <div className="empty-state">
                    <MessageSquare size={32} />
                    <strong>No inquiries received yet</strong>
                    <span>New inquiries from customers browsing your profile will appear here.</span>
                  </div>
                )}
              </section>
            )}

            {/* SERVICES & COVERAGE TAB */}
            {activeTab === 'services' && (
              <>
                <section className="dashboard-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Your Services</h2>
                      <p>Add services customers can book from your public profile.</p>
                    </div>
                  </div>
                  <form className="dashboard-form" onSubmit={serviceForm.handleSubmit(saveWorkerService)}>
                    {serviceForm.formState.errors.root && (
                      <div className="form-alert">{serviceForm.formState.errors.root.message}</div>
                    )}
                    <div className="form-grid two-columns">
                      <label className="form-field">
                        <span>Category</span>
                        <select
                          {...categoryRegistration}
                          onChange={(event) => {
                            categoryRegistration.onChange(event)
                            serviceForm.setValue('service', '')
                          }}
                        >
                          <option value="">Choose category</option>
                          {categories.map((category) => (
                            <option value={category.id} key={category.id}>{category.name}</option>
                          ))}
                        </select>
                        {serviceForm.formState.errors.category && (
                          <span className="field-error">{serviceForm.formState.errors.category.message}</span>
                        )}
                      </label>
                      <label className="form-field">
                        <span>Service</span>
                        <select disabled={!selectedCategory} {...serviceForm.register('service', { required: 'Choose a service.' })}>
                          <option value="">Choose service</option>
                          {availableServices.map((service) => (
                            <option value={service.id} key={service.id}>{service.name}</option>
                          ))}
                        </select>
                        {serviceForm.formState.errors.service && (
                          <span className="field-error">{serviceForm.formState.errors.service.message}</span>
                        )}
                      </label>
                    </div>
                    <div className="form-grid two-columns">
                      <label className="form-field">
                        <span>Price (₹, optional)</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          {...serviceForm.register('price', { setValueAs: (value) => value === '' ? null : Number(value) })}
                        />
                      </label>
                      <label className="checkbox-field available-field">
                        <input type="checkbox" {...serviceForm.register('is_primary')} />
                        <span>Show as my primary service</span>
                      </label>
                    </div>
                    <label className="form-field">
                      <span>Service details <small>(optional)</small></span>
                      <textarea rows="3" maxLength="2000" {...serviceForm.register('description')} />
                    </label>
                    <button className="button button-primary" type="submit" disabled={savingService}>
                      {savingService ? 'Adding…' : 'Add service'}
                    </button>
                  </form>
                  {profile.worker_services?.length ? (
                    <div className="address-list">
                      {profile.worker_services.map((service) => (
                        <article className="address-card" key={service.id}>
                          <span className="address-icon"><BriefcaseBusiness size={18} /></span>
                          <div className="address-copy">
                            <strong>{service.service_name || service.category_name}</strong>
                            <p>
                              {service.category_name}
                              {service.price != null ? ` · ₹${Number(service.price).toLocaleString('en-IN')}` : ''}
                              {service.is_primary ? ' · Primary service' : ''}
                            </p>
                          </div>
                          <div className="address-actions">
                            <button type="button" className="text-button" onClick={() => removeWorkerService(service)}>Remove</button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state compact-empty">
                      <BriefcaseBusiness size={22} />
                      <strong>No services listed yet</strong>
                      <span>Add a service to appear in relevant searches.</span>
                    </div>
                  )}
                </section>

                <section className="dashboard-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Service Areas</h2>
                      <p>Set the localities and map coordinates where you accept work.</p>
                    </div>
                  </div>
                  <form className="dashboard-form" onSubmit={areaForm.handleSubmit(saveServiceArea)}>
                    {areaForm.formState.errors.root && (
                      <div className="form-alert">{areaForm.formState.errors.root.message}</div>
                    )}
                    <div className="form-grid three-columns">
                      <label className="form-field">
                        <span>Locality</span>
                        <input {...areaForm.register('locality', { required: 'Enter a locality.' })} />
                        {areaForm.formState.errors.locality && <span className="field-error">{areaForm.formState.errors.locality.message}</span>}
                      </label>
                      <label className="form-field">
                        <span>City</span>
                        <input {...areaForm.register('city', { required: 'Enter a city.' })} />
                      </label>
                      <label className="form-field">
                        <span>PIN code <small>(optional)</small></span>
                        <input inputMode="numeric" {...areaForm.register('pincode')} />
                      </label>
                    </div>
                    <div className="form-grid three-columns">
                      <label className="form-field">
                        <span>Latitude</span>
                        <input type="number" step="any" min="-90" max="90" {...areaForm.register('latitude', { valueAsNumber: true, required: 'Enter latitude.', min: -90, max: 90 })} />
                        {areaForm.formState.errors.latitude && <span className="field-error">Enter a valid latitude.</span>}
                      </label>
                      <label className="form-field">
                        <span>Longitude</span>
                        <input type="number" step="any" min="-180" max="180" {...areaForm.register('longitude', { valueAsNumber: true, required: 'Enter longitude.', min: -180, max: 180 })} />
                        {areaForm.formState.errors.longitude && <span className="field-error">Enter a valid longitude.</span>}
                      </label>
                      <label className="form-field">
                        <span>Coverage radius</span>
                        <select {...areaForm.register('radius_km', { valueAsNumber: true })}>
                          {[1, 3, 5, 10, 20].map((radius) => (
                            <option value={radius} key={radius}>{radius} km</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label className="form-field">
                      <span>State</span>
                      <input {...areaForm.register('state', { required: 'Enter a state.' })} />
                    </label>
                    <button className="button button-primary" type="submit" disabled={savingArea}>
                      {savingArea ? 'Adding…' : 'Add service area'}
                    </button>
                  </form>
                  {profile.service_areas?.length ? (
                    <div className="address-list">
                      {profile.service_areas.map((area) => (
                        <article className="address-card" key={area.id}>
                          <span className="address-icon"><MapPin size={18} /></span>
                          <div className="address-copy">
                            <strong>{area.locality}, {area.city}</strong>
                            <p>
                              {area.latitude != null && area.longitude != null ? `${area.latitude}, ${area.longitude} · ` : ''}
                              {area.radius_km} km coverage
                            </p>
                          </div>
                          <div className="address-actions">
                            <button type="button" className="text-button" onClick={() => removeServiceArea(area)}>Remove</button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state compact-empty">
                      <MapPin size={22} />
                      <strong>No service areas listed yet</strong>
                      <span>Add mapped service areas to appear in nearby search.</span>
                    </div>
                  )}
                </section>
              </>
            )}

            {activeTab === 'availability' && (
              <section className="dashboard-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Weekly Availability</h2>
                    <p>Add the recurring time slots when customers can request your services. Slots on the same day cannot overlap.</p>
                  </div>
                </div>
                <form className="dashboard-form" onSubmit={availabilityForm.handleSubmit(saveAvailability)}>
                  {availabilityForm.formState.errors.root && (
                    <div className="form-alert" role="alert">{availabilityForm.formState.errors.root.message}</div>
                  )}
                  <div className="form-grid three-columns">
                    <label className="form-field">
                      <span>Day</span>
                      <select {...availabilityForm.register('day_of_week')}>
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => (
                          <option value={index} key={day}>{day}</option>
                        ))}
                      </select>
                    </label>
                    <label className="form-field">
                      <span>Starts at</span>
                      <input type="time" {...availabilityForm.register('start_time', { required: 'Choose a start time.' })} />
                    </label>
                    <label className="form-field">
                      <span>Ends at</span>
                      <input type="time" {...availabilityForm.register('end_time', {
                        required: 'Choose an end time.',
                        validate: (value) => value > availabilityForm.getValues('start_time') || 'End time must be later than start time.',
                      })} />
                      {availabilityForm.formState.errors.end_time && (
                        <span className="field-error">{availabilityForm.formState.errors.end_time.message}</span>
                      )}
                    </label>
                  </div>
                  <label className="checkbox-field">
                    <input type="checkbox" {...availabilityForm.register('is_available')} />
                    <span>Currently accepting requests during this slot</span>
                  </label>
                  <button className="button button-primary" type="submit" disabled={savingAvailability}>
                    {savingAvailability ? 'Adding…' : 'Add availability'}
                  </button>
                </form>
                {profile.availability_slots?.length ? (
                  <div className="address-list">
                    {profile.availability_slots.map((slot) => (
                      <article className="address-card" key={slot.id}>
                        <span className="address-icon"><Clock3 size={18} /></span>
                        <div className="address-copy">
                          <strong>{slot.day_name}</strong>
                          <p>{slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)} · {slot.is_available ? 'Accepting requests' : 'Not accepting requests'}</p>
                        </div>
                        <div className="address-actions">
                          <button type="button" className="text-button" onClick={() => removeAvailability(slot)}>Remove</button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state compact-empty">
                    <Clock3 size={22} />
                    <strong>No availability set</strong>
                    <span>Add weekly time slots so customers know when to request your services.</span>
                  </div>
                )}
              </section>
            )}

            {activeTab === 'portfolio' && (
              <section className="dashboard-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Work Portfolio</h2>
                    <p>Show customers examples of completed work. Upload an image up to 10 MB.</p>
                  </div>
                </div>
                <form className="dashboard-form" onSubmit={portfolioForm.handleSubmit(savePortfolioItem)}>
                  {portfolioForm.formState.errors.root && (
                    <div className="form-alert" role="alert">{portfolioForm.formState.errors.root.message}</div>
                  )}
                  <div className="form-grid two-columns">
                    <label className="form-field">
                      <span>Project title</span>
                      <input maxLength="200" {...portfolioForm.register('title', { required: 'Add a project title.' })} />
                      {portfolioForm.formState.errors.title && <span className="field-error">{portfolioForm.formState.errors.title.message}</span>}
                    </label>
                    <label className="form-field">
                      <span>Project image</span>
                      <input type="file" accept="image/*" {...portfolioForm.register('image', { required: 'Choose an image.' })} />
                      {portfolioForm.formState.errors.image && <span className="field-error">{portfolioForm.formState.errors.image.message}</span>}
                    </label>
                  </div>
                  <label className="form-field">
                    <span>Description <small>(optional)</small></span>
                    <textarea rows="3" {...portfolioForm.register('description')} />
                  </label>
                  <label className="checkbox-field">
                    <input type="checkbox" {...portfolioForm.register('is_before_after')} />
                    <span>This image represents before-and-after work</span>
                  </label>
                  <button className="button button-primary" type="submit" disabled={savingPortfolio}>
                    {savingPortfolio ? 'Uploading…' : 'Add portfolio project'}
                  </button>
                </form>
                {profile.portfolio_items?.length ? (
                  <div className="address-list">
                    {profile.portfolio_items.map((item) => (
                      <article className="address-card" key={item.id}>
                        <span className="address-icon">
                          {item.image && <img src={item.image} alt="" width="44" height="44" />}
                        </span>
                        <div className="address-copy">
                          <strong>{item.title}</strong>
                          <p>{item.description || (item.is_before_after ? 'Before-and-after project' : 'Portfolio project')}</p>
                        </div>
                        <div className="address-actions">
                          <button type="button" className="text-button" onClick={() => removePortfolioItem(item)}>Remove</button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state compact-empty">
                    <ImagePlus size={22} />
                    <strong>No portfolio projects yet</strong>
                    <span>Add completed-work photos to build confidence in your profile.</span>
                  </div>
                )}
              </section>
            )}

            {/* REVIEWS TAB */}
            {activeTab === 'reviews' && (
              <section className="dashboard-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Customer Reviews ({reviews.length})</h2>
                    <p>Ratings and comments from customers who completed jobs with you.</p>
                  </div>
                </div>

                {reviews.length > 0 ? (
                  <div className="reviews-list">
                    {reviews.map((rev) => (
                      <article className="review-item" key={rev.id}>
                        <div className="review-header">
                          <div className="review-author">
                            <strong>{rev.customer?.full_name || 'Customer'}</strong>
                            <span className="review-date">
                              {new Date(rev.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          <div className="review-stars">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} size={15} fill={rev.rating >= s ? '#F59E0B' : 'none'} color={rev.rating >= s ? '#F59E0B' : '#D1D5DB'} />
                            ))}
                          </div>
                        </div>
                        {rev.title && <h3 className="review-title">{rev.title}</h3>}
                        {rev.comment && <p className="review-body">{rev.comment}</p>}

                        {rev.worker_reply ? (
                          <div className="worker-reply-box">
                            <strong>Your Reply:</strong>
                            <p>{rev.worker_reply}</p>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="button button-outline button-small mt-2"
                            onClick={() => replyToReview(rev.id)}
                          >
                            Reply to customer
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Star size={32} />
                    <strong>No reviews received yet</strong>
                    <span>Completed bookings will allow customers to rate and review your service.</span>
                  </div>
                )}
              </section>
            )}

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <section className="dashboard-panel worker-profile-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Public Profile</h2>
                    <p>This information is visible to customers browsing nearby professionals.</p>
                  </div>
                </div>
                <WorkerProfileForm
                  profile={{
                    bio: profile.bio || '',
                    experience_years: profile.experience_years || 0,
                    starting_price: profile.starting_price || '',
                    pricing_type: profile.pricing_type || 'starting_from',
                    is_available: profile.is_available,
                  }}
                  onSave={saveProfile}
                  submitting={submitting}
                />
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------
   BECOME A WORKER PAGE
------------------------------------------------------------- */
export function BecomeWorkerPage() {
  const { user, activateWorker } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { register, handleSubmit } = useForm({
    defaultValues: { bio: '', experience_years: 0, pricing_type: 'starting_from', starting_price: '' },
  })

  async function join(values) {
    setSubmitting(true)
    setError('')
    const payload = {
      ...values,
      experience_years: Number(values.experience_years || 0),
      starting_price: values.starting_price === '' ? null : Number(values.starting_price),
    }
    try {
      await activateWorker()
      await api.patch('/profiles/workers/me/', payload)
      showToast('Your professional profile is ready to set up.')
      navigate('/worker/dashboard')
    } catch (requestError) {
      setError(getApiError(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="join-page">
      <div className="container join-layout">
        <div className="join-copy">
          <span className="section-kicker">For skilled professionals</span>
          <h1>Let your next customer find <span>you.</span></h1>
          <p>Showcase your skills, share your experience and connect with people looking for help in your area.</p>
          <div className="join-benefit"><Check size={17} /><span>Get discovered by people searching nearby</span></div>
          <div className="join-benefit"><Check size={17} /><span>Show your services, work and experience</span></div>
          <div className="join-benefit"><Check size={17} /><span>Talk directly with potential customers via Phone and WhatsApp</span></div>
        </div>
        <section className="join-form-card">
          <span className="section-kicker">Get started</span>
          <h2>Start your professional profile</h2>
          <p>{user ? 'You can add your full service details from your dashboard.' : 'Create one account for both customer and professional access.'}</p>
          {error && <div className="form-alert" role="alert">{error}</div>}
          {user ? (
            <form className="dashboard-form" onSubmit={handleSubmit(join)}>
              <label className="form-field">
                <span>Short introduction</span>
                <textarea rows="4" placeholder="What kind of work do you do?" {...register('bio')} />
              </label>
              <div className="form-grid two-columns">
                <label className="form-field">
                  <span>Experience (years)</span>
                  <input type="number" min="0" max="80" {...register('experience_years')} />
                </label>
                <label className="form-field">
                  <span>Starting price (₹)</span>
                  <input type="number" min="0" step="0.01" {...register('starting_price')} />
                </label>
              </div>
              <label className="form-field">
                <span>Pricing style</span>
                <select {...register('pricing_type')}>
                  <option value="starting_from">Starting from</option>
                  <option value="fixed">Fixed</option>
                  <option value="hourly">Hourly</option>
                  <option value="negotiable">Negotiable</option>
                </select>
              </label>
              <button type="submit" className="button button-primary join-submit" disabled={submitting}>
                {submitting ? 'Setting up…' : 'Create my profile'} <ArrowRight size={17} />
              </button>
            </form>
          ) : (
            <div className="join-signup-prompt">
              <p>Start by creating a KaamConnect account with the professional role. You can add your profile details right after signup.</p>
              <Link className="button button-primary join-submit" to="/register?worker=true">
                Create a professional account <ArrowRight size={17} />
              </Link>
              <small>Already have an account? <Link to="/login">Log in</Link> to join with your existing profile.</small>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
