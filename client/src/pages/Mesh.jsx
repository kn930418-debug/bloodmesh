import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { AnimatePresence, motion } from 'framer-motion';
import { Radar, RefreshCw, Siren, Waves } from 'lucide-react';
import api from '../lib/api.js';
import { onSocket } from '../lib/socket.js';
import { useAuth } from '../context/AuthContext.jsx';
import { BLOOD_GROUPS, isRare } from '../lib/compat.js';
import { cn, timeAgo } from '../lib/format.js';
import TypeBadge from '../components/TypeBadge.jsx';
import toast from 'react-hot-toast';

const donorIcon = (d) =>
  L.divIcon({
    className: '',
    html: `<span class="bm-pin ${d.availability ? (isRare(d.bloodGroup) ? 'bm-pin--rare' : 'bm-pin--donor') : 'bm-pin--busy'}"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

const sosIcon = L.divIcon({
  className: '',
  html: '<span class="bm-pin bm-pin--sos bm-pulse"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const meIcon = L.divIcon({
  className: '',
  html: '<span class="bm-pin bm-pin--me"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function Recenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView([center.lat, center.lng], 12);
  }, [center?.lat, center?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function Mesh() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const center = useMemo(() => ({ lat: user?.lat ?? 12.9352, lng: user?.lng ?? 77.6245 }), [user]);

  const [donors, setDonors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [radius, setRadius] = useState(10);
  const [group, setGroup] = useState('');
  const [online, setOnline] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const toastSeen = useRef(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, r] = await Promise.all([
        api.get('/users/nearby', { params: { lat: center.lat, lng: center.lng, radiusKm: radius, bloodGroup: group || undefined } }),
        api.get('/requests/nearby', { params: { lat: center.lat, lng: center.lng, radiusKm: Math.max(radius * 3, 30) } }),
      ]);
      setDonors(d.data.users);
      setRequests(r.data.requests);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load mesh');
    } finally {
      setLoading(false);
    }
  }, [center.lat, center.lng, radius, group]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const off1 = onSocket('request:new', (req) => {
      setRequests((prev) => [req, ...prev.filter((r) => r._id !== req._id)]);
      if (!toastSeen.current.has(req._id)) {
        toastSeen.current.add(req._id);
        toast(`🚨 New SOS: ${req.bloodGroup} at ${req.hospital?.name}`);
      }
    });
    const off2 = onSocket('presence', ({ userId, online: on }) => {
      setOnline((prev) => {
        const s = new Set(prev);
        if (on) s.add(String(userId));
        else s.delete(String(userId));
        return s;
      });
    });
    const off3 = onSocket('donor:status', ({ userId, availability }) => {
      setDonors((prev) => prev.map((d) => (String(d._id) === String(userId) ? { ...d, availability } : d)));
    });
    return () => {
      off1();
      off2();
      off3();
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <div className="relative h-[calc(100vh-4rem)]">
      <MapContainer center={[center.lat, center.lng]} zoom={12} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <TileLayer
          className="bm-tiles-dark"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter center={center} />
        <Circle center={[center.lat, center.lng]} radius={radius * 1000} pathOptions={{ color: '#ff3355', weight: 1.2, opacity: 0.5, fillColor: '#ff3355', fillOpacity: 0.05, dashArray: '6 10' }} />
        <Marker position={[center.lat, center.lng]} icon={meIcon}>
          <Popup><b>This is you.</b><br />You are a node in the mesh.</Popup>
        </Marker>
        {requests.map((r) => (
          <Marker key={r._id} position={[r.hospital.location.coordinates[1], r.hospital.location.coordinates[0]]} icon={sosIcon}>
            <Popup>
              <div className="min-w-52">
                <p className="font-bold text-blood-400">SOS · {r.bloodGroup} · {r.units}u · {r.urgency}</p>
                <p className="mt-1 text-sm">{r.hospital.name}</p>
                <p className="text-xs opacity-70">{timeAgo(r.createdAt)} · {r.distanceKm} km · {r.matchedDonorCount || 0} donors alerted</p>
                <button onClick={() => navigate(`/requests/${r._id}`)} className="mt-2 rounded-lg bg-blood-600 px-3 py-1 text-xs font-bold text-white">
                  Open mission
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
        {donors.map((d) => (
          <Marker key={d._id} position={[d.location.coordinates[1], d.location.coordinates[0]]} icon={donorIcon(d)}>
            <Popup>
              <div className="min-w-48">
                <p className="font-bold">{d.name}</p>
                <p className="text-xs opacity-75">{d.bloodGroup}{isRare(d.bloodGroup) ? ' · rare type' : ''} · {d.distanceKm} km</p>
                <p className="mt-1 text-xs">{d.availability ? '🟢 Available to donate' : '⚪ Not donating now'}</p>
                <p className="text-xs">{d.donationCount || 0} past donations</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* control panel */}
      <div className="pointer-events-none absolute inset-x-0 top-4 z-[1000] mx-auto flex max-w-3xl flex-col gap-3 px-4">
        <div className="glass-strong pointer-events-auto mx-auto flex w-full flex-wrap items-center gap-3 rounded-2xl px-4 py-3">
          <span className="inline-flex items-center gap-2 font-display text-sm font-bold">
            <Waves className="h-4 w-4 text-blood-400" /> Live Mesh
          </span>
          <span className="chip border-emerald-400/40 bg-emerald-400/10 text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            {online.size + 1} online
          </span>
          <span className="text-xs text-zinc-400">{donors.length} donors in radius</span>
          <button onClick={load} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-white/10">
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Re-scan
          </button>
        </div>

        <div className="glass-strong pointer-events-auto mx-auto flex w-full flex-wrap items-center gap-3 rounded-2xl px-4 py-3 text-xs">
          <span className="font-semibold uppercase tracking-wider text-zinc-500">Radius</span>
          <input
            type="range" min="2" max="30" step="1" value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="h-1.5 w-36 cursor-pointer accent-blood-500"
          />
          <span className="font-display font-bold text-blood-400">{radius} km</span>
          <span className="mx-2 h-4 w-px bg-white/10" />
          <span className="font-semibold uppercase tracking-wider text-zinc-500">Group</span>
          <div className="flex flex-wrap gap-1">
            {['', ...BLOOD_GROUPS].map((g) => (
              <button
                key={g || 'all'}
                onClick={() => setGroup(g)}
                className={cn(
                  'rounded-md px-2 py-1 font-display text-[11px] font-bold transition',
                  group === g ? 'bg-blood-500/25 text-blood-400 ring-1 ring-blood-500/50' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-200'
                )}
              >
                {g || 'ALL'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SOS fab */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate('/sos')}
        className="absolute bottom-6 right-6 z-[1000] flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blood-600 to-blood-500 px-5 py-3.5 font-display text-sm font-bold text-white shadow-glow-lg"
      >
        <Siren className="h-5 w-5" /> Fire an SOS
      </motion.button>

      {/* legend */}
      <div className="glass absolute bottom-6 left-4 z-[1000] hidden rounded-xl px-4 py-3 text-[11px] text-zinc-300 sm:block">
        <div className="flex items-center gap-2"><span className="bm-pin bm-pin--donor" /> available donor</div>
        <div className="mt-1.5 flex items-center gap-2"><span className="bm-pin bm-pin--rare" /> rare-type donor</div>
        <div className="mt-1.5 flex items-center gap-2"><span className="bm-pin bm-pin--busy" /> not donating</div>
        <div className="mt-1.5 flex items-center gap-2"><span className="bm-pin bm-pin--sos bm-pulse" /> active SOS</div>
      </div>

      {/* live ticker */}
      <AnimatePresence>
        {requests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="glass-strong absolute left-4 top-44 z-[1000] hidden w-72 rounded-2xl p-3 lg:block"
          >
            <p className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-blood-400">
              <Radar className="h-3 w-3" /> nearest SOS
            </p>
            {requests.slice(0, 3).map((r) => (
              <button key={r._id} onClick={() => navigate(`/requests/${r._id}`)} className="mb-2 w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-left transition hover:border-blood-500/50">
                <div className="flex items-center justify-between">
                  <TypeBadge group={r.bloodGroup} />
                  <span className="text-[10px] text-zinc-500">{r.distanceKm} km</span>
                </div>
                <p className="mt-1.5 text-xs font-semibold text-zinc-200">{r.hospital.name}</p>
                <p className="text-[10px] text-zinc-500">{r.units}u · {r.urgency} · {timeAgo(r.createdAt)}</p>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
