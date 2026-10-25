import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, RefreshCw, LogIn, UserPlus, Siren } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { BLOOD_GROUPS } from '../lib/compat.js';
import { getPosition, DEFAULT_CENTER } from '../lib/geo.js';
import { errMsg } from '../lib/api.js';
import { cn } from '../lib/format.js';
import toast from 'react-hot-toast';

export default function Auth() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, login, register } = useAuth();
  const [mode, setMode] = useState(params.get('mode') === 'login' ? 'login' : 'register');
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState(null);

  const [form, setForm] = useState({
    name: '', email: 'demo@bloodmesh.app', phone: '', password: 'demo1234',
    bloodGroup: 'O+', city: 'Bengaluru', address: '', availability: true,
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value ?? e.target.checked : e }));

  useEffect(() => {
    if (user) navigate(location.state?.from || '/mesh', { replace: true });
  }, [user]);

  const fetchLocation = async (showToast = true) => {
    setLocating(true);
    const pos = await getPosition();
    setCoords(pos);
    setLocating(false);
    if (showToast) {
      toast(pos.source === 'gps' ? '📍 Location locked from GPS' : `Using demo hub: ${DEFAULT_CENTER.label}`, { icon: '🛰️' });
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
        toast.success('Welcome back to the mesh');
      } else {
        if (!form.name) throw { message: 'Name is required' };
        if (!coords) await fetchLocation(false);
        const pos = coords || (await getPosition());
        const c = coords || pos;
        await register({
          name: form.name, email: form.email, phone: form.phone, password: form.password,
          bloodGroup: form.bloodGroup, city: form.city, address: form.address,
          lat: c.lat, lng: c.lng, availability: form.availability,
        });
        toast.success('You are live. The mesh has your back.');
      }
    } catch (err) {
      toast.error(errMsg(err, 'Failed, try again'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-2">
      <div className="hidden lg:block">
        <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}>
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-blood-600 to-blood-500 shadow-glow">
            <Siren className="h-7 w-7 text-white" />
          </span>
          <h1 className="mt-6 font-display text-4xl font-extrabold leading-tight">
            One ping can find
            <br />
            <span className="text-gradient">a matching heartbeat.</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-400">
            50 donors are already mapped around Bengaluru in this demo. Sign in with the demo account or join with your own blood type —
            the live map, SOS broadcast and compatibility engine unlock instantly.
          </p>
          <div className="glass mt-8 max-w-sm rounded-2xl p-4 text-sm">
            <p className="font-display text-xs font-bold uppercase tracking-widest text-blood-400">Demo accounts</p>
            <p className="mt-2 text-zinc-300">Requester · <span className="font-mono text-xs">demo@bloodmesh.app</span></p>
            <p className="text-zinc-300">Rare donor · <span className="font-mono text-xs">donor@bloodmesh.app</span></p>
            <p className="mt-1 text-zinc-500">password: <span className="font-mono text-xs">demo1234</span></p>
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="glass-strong rounded-3xl p-7 sm:p-8">
        <div className="flex rounded-xl bg-white/5 p-1">
          {[['register', 'Join the mesh'], ['login', 'Sign in']].map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                'flex-1 rounded-lg py-2 text-sm font-semibold transition',
                mode === m ? 'bg-gradient-to-r from-blood-600 to-blood-500 text-white shadow-glow' : 'text-zinc-400 hover:text-white'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="label">Full name</label>
                <input className="input" value={form.name} onChange={set('name')} placeholder="e.g. Meera Iyer" required={mode === 'register'} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Phone</label>
                  <input className="input" value={form.phone} onChange={set('phone')} placeholder="+91 …" />
                </div>
                <div>
                  <label className="label">City</label>
                  <input className="input" value={form.city} onChange={set('city')} placeholder="Bengaluru" />
                </div>
              </div>
              <div>
                <label className="label">Your blood group</label>
                <div className="flex flex-wrap gap-2">
                  {BLOOD_GROUPS.map((g) => (
                    <button
                      type="button"
                      key={g}
                      onClick={() => setForm((f) => ({ ...f, bloodGroup: g }))}
                      className={cn(
                        'rounded-lg border px-3.5 py-2 font-display text-sm font-bold transition',
                        form.bloodGroup === g
                          ? 'border-blood-500 bg-blood-500/20 text-blood-400 shadow-glow'
                          : 'border-white/10 bg-white/5 text-zinc-400 hover:border-white/25'
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={form.email} onChange={set('email')} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" className="input" value={form.password} onChange={set('password')} required minLength={6} />
          </div>

          {mode === 'register' && (
            <>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-sm">
                  <p className="font-semibold text-zinc-200">Location on the mesh</p>
                  <p className="text-xs text-zinc-500">
                    {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}${coords.source === 'fallback' ? ' (demo hub)' : ''}` : 'GPS pin for radius matching'}
                  </p>
                </div>
                <button type="button" onClick={fetchLocation} className="btn-ghost !px-3 !py-1.5 text-xs">
                  <RefreshCw className={cn('h-3.5 w-3.5', locating && 'animate-spin')} /> {locating ? 'Locating…' : 'Use my GPS'}
                </button>
              </div>
              <label className="flex cursor-pointer items-center gap-3 text-sm text-zinc-300">
                <input type="checkbox" checked={form.availability} onChange={set('availability')} className="h-4 w-4 accent-blood-500" />
                <MapPin className="h-4 w-4 text-blood-400" /> Start <b>available</b> — receive SOS pings nearby
              </label>
            </>
          )}

          <button type="submit" disabled={busy} className="btn-primary w-full !py-3 text-sm">
            {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : mode === 'login' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {mode === 'login' ? 'Enter the mesh' : 'Create my node'}
          </button>
          <p className="text-center text-xs text-zinc-500">
            New here? The demo accounts above log you straight into a seeded Bengaluru mesh.
          </p>
        </form>
      </motion.div>
    </div>
  );
}
