import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const pinIcon = L.divIcon({
  className: '',
  html: '<span class="bm-pin bm-pin--sos bm-pulse"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function ClickToPlace({ onChange }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function FlyHere({ center }) {
  const map = useMapEvents({});
  useEffect(() => {
    if (center) map.flyTo([center.lat, center.lng], map.getZoom(), { duration: 0.8 });
  }, [center?.lat, center?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function MapPicker({ value, onChange, radiusKm = 0, height = '320px', center }) {
  const pos = value?.lat != null ? [value.lat, value.lng] : center ? [center.lat, center.lng] : [12.9352, 77.6245];
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10" style={{ height }}>
      <MapContainer center={pos} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer
          className="bm-tiles-dark"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickToPlace onChange={onChange} />
        <FlyHere center={center} />
        {radiusKm > 0 && value?.lat != null && (
          <Circle center={[value.lat, value.lng]} radius={radiusKm * 1000} pathOptions={{ color: '#ff3355', weight: 1.5, fillOpacity: 0.06, dashArray: '6 8' }} />
        )}
        {value?.lat != null && (
          <Marker position={[value.lat, value.lng]} icon={pinIcon} draggable eventHandlers={{ dragend: (e) => onChange({ lat: e.target.getLatLng().lat, lng: e.target.getLatLng().lng }) }}>
            <Popup>SOS target — drag or tap the map to move</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
