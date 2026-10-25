import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Sparkles, SlidersHorizontal } from 'lucide-react';
import api from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { BLOOD_GROUPS } from '../lib/compat.js';
import { cn } from '../lib/format.js';
import DonorCard from '../components/DonorCard.jsx';
import toast from 'react-hot-toast';

export default function Donors() {
  const { user } = useAuth();
  const center = { lat: user?.lat ?? 12.9352, lng: user?.lng ?? 77.6245 };

  const [patientGroup, setPatientGroup] = useState(user?.bloodGroup || 'O+');
  const [radius, setRadius] = useState(15);
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [rareOnly, setRareOnly] = useState(false);
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        lat: center.lat,
        lng: center.lng,
        radiusKm: radius,
        onlyAvailable: String(onlyAvailable),
      };
      if (rareOnly) params.bloodGroup = 'O-';
      else params.neededFor = patientGroup;
      const { data } = await api.get('/users/nearby', { params });
      setDonors(data.users);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [center.lat, center.lng, radius, patientGroup, onlyAvailable, rareOnly]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="section-title">Donor finder</h1>
          <p className="mt-1 text-sm text-zinc-500">Immunologically compatible, available, and ranked by distance from you.</p>
        </div>
        <span className="chip border-blood-500/40 bg-blood-500/10 text-blood-400">
          <Search className="h-3 w-3" /> {donors.length} match{donors.length === 1 ? '' : 'es'}
        </span>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass mt-6 rounded-2xl p-5">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <div>
            <p className="label inline-flex items-center gap-1"><SlidersHorizontal className="h-3 w-3" /> Patient needs</p>
            <div className="flex flex-wrap gap-1.5">
              {BLOOD_GROUPS.map((g) => (
                <button
                  key={g}
                  onClick={() => {
                    setPatientGroup(g);
                    setRareOnly(false);
                  }}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 font-display text-xs font-bold transition',
                    !rareOnly && patientGroup === g
                      ? 'border-blood-500 bg-blood-500/20 text-blood-400'
                      : 'border-white/10 bg-white/5 text-zinc-500 hover:text-zinc-200'
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="label">Search radius</p>
            <div className="flex items-center gap-3">
              <input type="range" min="2" max="40" value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="h-1.5 w-44 cursor-pointer accent-blood-500" />
              <span className="font-display text-sm font-bold text-blood-400">{radius} km</span>
            </div>
          </div>
          <div>
            <p className="label">Filters</p>
            <div className="flex gap-2">
              <button
                onClick={() => setOnlyAvailable((v) => !v)}
                className={cn('chip transition', onlyAvailable ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-300' : 'border-white/15 bg-white/5 text-zinc-500')}
              >
                ● Available only
              </button>
              <button
                onClick={() => setRareOnly((v) => !v)}
                className={cn('chip transition', rareOnly ? 'border-amber-400/50 bg-amber-400/10 text-amber-300' : 'border-white/15 bg-white/5 text-zinc-500')}
              >
                <Sparkles className="h-3 w-3" /> Golden blood (O−)
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {loading ? (
        <div className="mt-10 flex justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-blood-500" />
        </div>
      ) : donors.length === 0 ? (
        <div className="glass mt-10 rounded-2xl p-10 text-center">
          <p className="font-display text-lg font-bold">Empty at this radius</p>
          <p className="mt-1 text-sm text-zinc-500">Widen the search, relax the filters, or fire an SOS so the mesh can wake people up.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {donors.map((d, i) => (
            <DonorCard key={d._id} donor={d} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
