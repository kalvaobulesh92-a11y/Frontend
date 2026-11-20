import { useEffect, useState } from 'react'
import { ArrowRight, BadgeCheck, Brush, Fan, Hammer, MapPin, ShieldCheck, Sparkles, Wrench, Zap } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import api, { getApiError } from '../services/api'

const categoryIcons = [Zap, Wrench, Brush, Fan, Hammer, Sparkles]
const hyderabadCenter = { latitude: 17.4933, longitude: 78.3996 }

export default function HomePage() {
  const [categories, setCategories] = useState([])
  const [categoryError, setCategoryError] = useState('')
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('Kukatpally, Hyderabad')
  const [coordinates, setCoordinates] = useState(hyderabadCenter)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/categories/')
      .then(({ data }) => setCategories(data.results || data))
      .catch((error) => setCategoryError(getApiError(error)))
      .finally(() => setLoadingCategories(false))
  }, [])

  function searchServices(event) {
    event.preventDefault()
    const category = categories.find((item) => item.name.toLowerCase() === query.toLowerCase())
    const params = new URLSearchParams({
      latitude: String(hyderabadCenter.latitude),
      longitude: String(hyderabadCenter.longitude),
      radius_km: '5',
    })
    params.set('latitude', String(coordinates.latitude))
    params.set('longitude', String(coordinates.longitude))
    if (category) params.set('category', category.slug)
    if (query && !category) params.set('search', query)
    navigate(`/search?${params.toString()}`)
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocation('Kukatpally, Hyderabad · browser location unavailable')
      return
    }
    setLocation('Finding your location…')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCoordinates({ latitude: coords.latitude, longitude: coords.longitude })
        setLocation('Your current location')
      },
      () => setLocation('Kukatpally, Hyderabad · location permission not granted'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  return (
    <>
      <section className="hero-section">
        <div className="container hero-layout">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> Your neighbourhood, sorted</div>
            <h1>Good help.<br /><span>Right around</span> the corner.</h1>
            <p className="hero-description">
              Find trusted electricians, plumbers, cleaners and more — recommended by people in your neighbourhood.
            </p>
            <form className="hero-search" onSubmit={searchServices}>
              <label className="hero-search-field">
                <span>What do you need?</span>
                <input
                  aria-label="What service do you need?"
                  placeholder="Try “electrician”"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <span className="search-divider" />
              <label className="hero-search-field location-search-field">
                <span>Where?</span>
                <input aria-label="Your search location" value={location} readOnly />
              </label>
              <button className="button button-primary hero-search-button" type="submit">
                Find a pro <ArrowRight size={17} />
              </button>
            </form>
            <button type="button" className="hero-location-button" onClick={useMyLocation}><MapPin size={15} /> Use my current location</button>
            <div className="hero-trust">
              <span><ShieldCheck size={17} /> Local professionals</span>
              <span><BadgeCheck size={17} /> Verified profiles</span>
              <span><MapPin size={17} /> Hyderabad first</span>
            </div>
          </div>
          <div className="hero-visual" aria-label="Home service professionals at work">
            <div className="hero-photo">
              <img
                src="https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=1100&q=85"
                alt="Electrician carefully working on a home installation"
              />
            </div>
            <div className="hero-note">
              <span className="note-icon"><BadgeCheck size={19} /></span>
              <span><strong>Good work, close by</strong><small>Find someone for the job</small></span>
            </div>
            <div className="hero-location-chip"><MapPin size={15} /> Kukatpally · Hyderabad</div>
          </div>
        </div>
        <div className="hero-shape" aria-hidden="true" />
      </section>

      <section className="section-block categories-section">
        <div className="container">
          <div className="section-heading">
            <div><span className="section-kicker">How can we help?</span><h2>Find the right person for the job</h2></div>
            <Link className="text-link" to="/search">Explore all services <ArrowRight size={16} /></Link>
          </div>
          {loadingCategories ? (
            <div className="category-grid">{Array.from({ length: 6 }, (_, index) => <div className="skeleton category-skeleton" key={index} />)}</div>
          ) : categoryError ? (
            <div className="inline-error">{categoryError}</div>
          ) : categories.length ? (
            <div className="category-grid">
              {categories.slice(0, 8).map((category, index) => {
                const Icon = categoryIcons[index % categoryIcons.length]
                return (
                  <Link className="category-card" to={`/search?category=${encodeURIComponent(category.slug)}`} key={category.id}>
                    <span className={`category-icon tone-${index % 6}`}><Icon size={23} strokeWidth={1.8} /></span>
                    <strong>{category.name}</strong>
                    <span className="category-arrow"><ArrowRight size={16} /></span>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="empty-state compact-empty"><Sparkles size={24} /><strong>Services are being added</strong><span>Check back soon for local professionals.</span></div>
          )}
        </div>
      </section>

      <section className="trust-section">
        <div className="container trust-layout">
          <div>
            <span className="section-kicker light-kicker">Made for local work</span>
            <h2>Finding a good professional<br />should feel simple.</h2>
            <p>Discover nearby people, compare their work, and contact them directly. No guesswork. Just a better way to get things done.</p>
            <Link className="button button-light" to="/how-it-works">See how it works <ArrowRight size={16} /></Link>
          </div>
          <div className="trust-points">
            <div className="trust-point"><span>01</span><div><strong>Search close to you</strong><p>Browse professionals serving your area.</p></div></div>
            <div className="trust-point"><span>02</span><div><strong>Choose with confidence</strong><p>Review services, experience and ratings.</p></div></div>
            <div className="trust-point"><span>03</span><div><strong>Connect directly</strong><p>Call or WhatsApp to discuss your work.</p></div></div>
          </div>
        </div>
      </section>

      <section className="section-block worker-cta-section">
        <div className="container worker-cta">
          <div><span className="section-kicker">For local professionals</span><h2>Your skills deserve to be found.</h2><p>Build your profile and help more people in your area find the work you do best.</p></div>
          <Link className="button button-primary" to="/become-a-worker">Join as a professional <ArrowRight size={17} /></Link>
        </div>
      </section>
    </>
  )
}
