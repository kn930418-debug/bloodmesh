import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, RefreshCw, Save, ShieldCheck, Syringe } from 'lucide-react';
import api, { errMsg } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { BLOOD_GROUPS } from '../lib/compat.js';
import { getPosition } from '../lib/geo.js';
import { fmtDate } from '../lib/format.js';
import { cn } from '../lib/format.js';
import TypeBadge from '../components/TypeBadge.jsx';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState(user ? { lat: user.lat, lng: user.lng } : null);
  const [form, setForm] = useState({
    name: user?.name || '', phone: user?.phone || '', city: user?.city || '',
    address: user?.address || '', bio: user?.bio || '', bloodGroup: user?.bloodGroup || 'O+',
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setBusy(true);
    try {
      const { data } = await api.patch('/users/me', { ...form, lat: coords?.lat, lng: coords?.lng });
      setUser(data.user);
      toast.success('Profile saved to the mesh');
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const repin = async () => {
    setLocating(true);
    const pos = await getPosition();
    setCoords(pos);
    setLocating(false);
    toast(pos.source === 'gps' ? '📍 New position pinned from GPS' : 'GPS unavailable — using demo hub (Bengaluru)');
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="glass-strong rounded-3xl p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-blood-600 to-ink-700 font-display text-lg font-extrabold ring-1 ring-white/15">
              {user?.name?.split(' ').map((w) => w[0]).slice(0, 2).join('')}
            </div>
            <div>
              <h1 className="font-display text-xl font-extrabold">{user?.name}</h1>
              <p className="text-xs text-zinc-500">{user?.email} · member since {fmtDate(user?.createdAt)}</p>
            </div>
          </div>
          <TypeBadge group={user?.bloodGroup} />
        </div>

        <div className="mt-7 space-y-4">
          <div>
            <label className="label">Full name</label>
            <input className="input" value={form.name} onChange={set('name')} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={set('phone')} placeholder="+91 …" />
            </div>
            <div>
              <label className="label">City</label>
              <input className="input" value={form.city} onChange={set('city')} />
            </div>
          </div>
          <div>
            <label className="label">Address / landmark (shown on your card)</label>
            <input className="input" value={form.address} onChange={set('address')} placeholder="Koramangala 5th Block" />
          </div>
          <div>
            <label className="label">Blood group</label>
            <div className="flex flex-wrap gap-2">
              {BLOOD_GROUPS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, bloodGroup: g }))}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 font-display text-xs font-bold transition',
                    form.bloodGroup === g ? 'border-blood-500 bg-blood-500/20 text-blood-400' : 'border-white/10 bg-white/5 text-zinc-500 hover:text-zinc-200'
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Short bio (shown to nearby donors)</label>
            <textarea className="input min-h-20 resize-none" value={form.bio} onChange={set('bio')} maxLength={240} />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="text-sm">
              <p className="font-semibold text-zinc-200">Mesh position</p>
              <p className="text-xs text-zinc-500">{coords?.lat != null ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'not pinned'}</p>
            </div>
            <button onClick={repin} className="btn-ghost !px-3 !py-1.5 text-xs">
              <RefreshCw className={cn('h-3.5 w-3.5', locating && 'animate-spin')} /> Re-pin GPS
            </button>
          </div>

          <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 text-xs text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> {user?.donationCount || 0} donations recorded
            </span>
            <button
              onClick={async () => {
                await api.post('/users/me/donated');
                await api.get('/auth/me').then(({ data }) => setUser(data.user));
                toast.success('Donation logged 🎉');
              }}
              className="btn-ghost !px-3 !py-1.5 text-xs"
            >
              <Syringe className="h-3.5 w-3.5" /> Log a donation
            </button>
          </div>

          <button onClick={save} disabled={busy} className="btn-primary w-full !py-3">
            <Save className="h-4 w-4" /> {busy ? 'Saving…' : 'Save profile'}
          </button>
          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="btn-ghost w-full !text-zinc-500 hover:!text-blood-400"
          >
            <LogOut className="h-4 w-4" /> Sign out of the mesh
          </button>
        </div>
      </motion.div>
    </div>
  );
}
