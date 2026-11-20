import { useMemo } from 'react'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import { Link } from 'react-router-dom'

const workerMarker = L.divIcon({
  className: 'worker-marker-wrap',
  html: '<span class="worker-marker"></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

export default function WorkerMap({ results, center }) {
  const points = useMemo(() => results.map((item) => ({
    ...item,
    position: [
      Number(item.matched_service_area?.latitude ?? item.worker.service_areas?.[0]?.latitude),
      Number(item.matched_service_area?.longitude ?? item.worker.service_areas?.[0]?.longitude),
    ],
  })).filter((item) => item.position.every(Number.isFinite)), [results])

  return (
    <div className="worker-map" aria-label="Map of nearby professionals">
      <MapContainer center={center} zoom={13} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((item) => (
          <Marker key={item.worker.id} position={item.position} icon={workerMarker}>
            <Popup>
              <div className="map-popup">
                <strong>{item.worker.user.full_name}</strong>
                <span>{item.distance_km} km away</span>
                <Link to={`/workers/${item.worker.id}`}>View profile</Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
