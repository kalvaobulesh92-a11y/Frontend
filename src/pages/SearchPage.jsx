import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { LocateFixed, Map, MapPinned, Search, SlidersHorizontal } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import api, { getApiError } from '../services/api'
import WorkerCard from '../components/WorkerCard'

const DEFAULT_LOCATION = { latitude: 17.4933, longitude: 78.3996 }
const RADII = [1, 3, 5, 10, 20]
const WorkerMap = lazy(() => import('../components/WorkerMap'))

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [categories, setCategories] = useState([])
  const [services, setServices] = useState([])
  const [filters, setFilters] = useState(() => ({
    latitude: searchParams.get('latitude') || String(DEFAULT_LOCATION.latitude),
    longitude: searchParams.get('longitude') || String(DEFAULT_LOCATION.longitude),
    radius_km: searchParams.get('radius_km') || '5',
    category: searchParams.get('category') || '',
    service: searchParams.get('service') || '',
    search: searchParams.get('search') || '',
    min_rating: searchParams.get('min_rating') || '',
    verified: searchParams.get('verified') === 'true',
    available: searchParams.get('available') !== 'false',
  }))
  const [submitted, setSubmitted] = useState(filters)
  const [results, setResults] = useState([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(Number(searchParams.get('page') || 1))
  const [hasNextPage, setHasNextPage] = useState(false)
  const [hasPreviousPage, setHasPreviousPage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState('list')
  const [locationMessage, setLocationMessage] = useState('Searching near Kukatpally, Hyderabad')

  useEffect(() => {
    api.get('/categories/')
      .then(({ data }) => setCategories(data.results || data))
      .catch((requestError) => setError(getApiError(requestError)))
  }, [])

  useEffect(() => {
    if (!filters.category) {
      return
    }
    api.get(`/categories/${encodeURIComponent(filters.category)}/services/`)
      .then(({ data }) => setServices(data.results || data))
      .catch((requestError) => setError(getApiError(requestError)))
  }, [filters.category])

  useEffect(() => {
    let active = true
    const params = {
      latitude: submitted.latitude,
      longitude: submitted.longitude,
      radius_km: submitted.radius_km,
      page: submitted.page || 1,
      available: submitted.available,
    }
    for (const key of ['category', 'service', 'search', 'min_rating']) {
      if (submitted[key]) params[key] = submitted[key]
    }
    if (submitted.verified) params.verified = true
    api.get('/locations/nearby-workers/', { params })
      .then(({ data }) => {
        if (!active) return
        setResults(data.results || [])
        setCount(data.count || 0)
        setHasNextPage(Boolean(data.next))
        setHasPreviousPage(Boolean(data.previous))
      })
      .catch((requestError) => { if (active) setError(getApiError(requestError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [submitted])

  const mapCenter = useMemo(
    () => [Number(submitted.latitude), Number(submitted.longitude)],
    [submitted.latitude, submitted.longitude],
  )

  function changeFilter(event) {
    const { name } = event.target
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    if (name === 'category') setServices([])
    setFilters((current) => ({ ...current, [name]: value, ...(name === 'category' ? { service: '' } : {}) }))
  }

  function beginSearch(next) {
    setPage(1)
    setLoading(true)
    setError('')
    const search = { ...next, page: 1 }
    setSubmitted(search)
    const query = new URLSearchParams()
    Object.entries(search).forEach(([key, value]) => {
      if (value !== '' && value !== false && value != null) query.set(key, String(value))
      else if (key === 'available') query.set(key, 'false')
    })
    setSearchParams(query)
  }

  function runSearch(event) {
    event.preventDefault()
    beginSearch({ ...filters })
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocationMessage('Location is not available in this browser. You can enter coordinates below.')
      return
    }
    setLocationMessage('Finding your location…')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const next = { ...filters, latitude: coords.latitude.toFixed(6), longitude: coords.longitude.toFixed(6) }
        setFilters(next)
        beginSearch(next)
        setLocationMessage('Using your current location')
      },
      () => setLocationMessage('Location permission was not granted. Showing Kukatpally results.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  function changePage(nextPage) {
    setPage(nextPage)
    setLoading(true)
    setError('')
    setSubmitted((current) => ({ ...current, page: nextPage }))
    const query = new URLSearchParams(searchParams)
    query.set('page', String(nextPage))
    setSearchParams(query)
  }

  return (
    <div className="search-page">
      <div className="search-page-head">
        <div className="container">
          <span className="section-kicker">Local professionals</span>
          <h1>Find help near you</h1>
          <p>Compare trusted professionals serving your neighbourhood.</p>
        </div>
      </div>
      <div className="container search-layout">
        <aside className="search-filters">
          <div className="filter-title"><SlidersHorizontal size={19} /><h2>Filters</h2></div>
          <form onSubmit={runSearch}>
            <label className="form-field">
              <span>Service or professional</span>
              <div className="input-with-icon"><Search size={17} /><input name="search" value={filters.search} onChange={changeFilter} placeholder="e.g. electrician" /></div>
            </label>
            <label className="form-field">
              <span>Category</span>
              <select name="category" value={filters.category} onChange={changeFilter}>
                <option value="">All categories</option>
                {categories.map((category) => <option value={category.slug} key={category.id}>{category.name}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>Service</span>
              <select name="service" value={filters.service} onChange={changeFilter} disabled={!filters.category}>
                <option value="">All services</option>
                {services.map((service) => <option value={service.slug} key={service.id}>{service.name}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>Distance</span>
              <select name="radius_km" value={filters.radius_km} onChange={changeFilter}>
                {RADII.map((radius) => <option key={radius} value={radius}>Within {radius} km</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>Minimum rating</span>
              <select name="min_rating" value={filters.min_rating} onChange={changeFilter}>
                <option value="">Any rating</option>
                <option value="3">3+ stars</option>
                <option value="4">4+ stars</option>
                <option value="4.5">4.5+ stars</option>
              </select>
            </label>
            <div className="search-check-filters">
              <label className="checkbox-field"><input type="checkbox" name="verified" checked={filters.verified} onChange={changeFilter} /><span>Verified only</span></label>
              <label className="checkbox-field"><input type="checkbox" name="available" checked={filters.available} onChange={changeFilter} /><span>Available now</span></label>
            </div>
            <div className="location-controls">
              <div className="filter-location-label"><MapPinned size={16} /><span>{locationMessage}</span></div>
              <button type="button" className="text-button" onClick={useMyLocation}><LocateFixed size={16} /> Use my location</button>
            </div>
            <details className="coordinate-fields">
              <summary>Enter coordinates manually</summary>
              <div className="coordinate-inputs">
                <label className="form-field"><span>Latitude</span><input name="latitude" type="number" step="any" min="-90" max="90" value={filters.latitude} onChange={changeFilter} required /></label>
                <label className="form-field"><span>Longitude</span><input name="longitude" type="number" step="any" min="-180" max="180" value={filters.longitude} onChange={changeFilter} required /></label>
              </div>
            </details>
            <button type="submit" className="button button-primary filter-submit">Show professionals</button>
          </form>
        </aside>

        <section className="search-results">
          <div className="results-toolbar">
            <div>
              <h2>{loading ? 'Finding professionals…' : `${count} professional${count === 1 ? '' : 's'} nearby`}</h2>
              <p>Sorted by distance from your search location</p>
            </div>
            <div className="view-switch" role="group" aria-label="Search results view">
              <button type="button" className={view === 'list' ? 'selected' : ''} onClick={() => setView('list')}><Map size={16} /> List</button>
              <button type="button" className={view === 'map' ? 'selected' : ''} onClick={() => setView('map')}><MapPinned size={16} /> Map</button>
            </div>
          </div>

          {error ? (
            <div className="error-panel"><strong>We couldn’t load nearby professionals.</strong><p>{error}</p><button className="button button-outline" onClick={runSearch}>Try again</button></div>
          ) : loading ? (
            <div className="result-list">{Array.from({ length: 3 }, (_, index) => <div className="skeleton worker-skeleton" key={index} />)}</div>
          ) : view === 'map' ? (
            <div className="map-results">
              <Suspense fallback={<div className="skeleton worker-map" aria-label="Loading map" />}>
                <WorkerMap results={results} center={mapCenter} />
              </Suspense>
              {!results.length && (
                <div className="map-empty-note"><MapPinned size={17} /> No professionals found in this area yet.</div>
              )}
            </div>
          ) : !results.length ? (
            <div className="empty-state results-empty">
              <span className="empty-icon"><MapPinned size={25} /></span>
              <h3>No professionals found in this area yet</h3>
              <p>Try a wider radius, another category, or use your current location.</p>
              <button type="button" className="button button-outline" onClick={() => { const next = { ...filters, radius_km: '10' }; setFilters(next); beginSearch(next) }}>Search within 10 km</button>
            </div>
          ) : (
            <>
              <div className="result-list">
                {results.map((result) => <WorkerCard key={result.worker.id} result={result} />)}
              </div>
              {(hasPreviousPage || hasNextPage) && (
                <div className="pagination-controls">
                  <button type="button" className="button button-outline button-small" disabled={!hasPreviousPage} onClick={() => changePage(page - 1)}>Previous</button>
                  <span>Page {page}</span>
                  <button type="button" className="button button-outline button-small" disabled={!hasNextPage} onClick={() => changePage(page + 1)}>Next</button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
