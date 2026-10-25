import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, Award, CalendarHeart, HeartPulse, Map as MapIcon, Radio, Siren, Syringe, Users } from 'lucide-react';
import api from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { COOLDOWN_DAYS, isRare } from '../lib/compat.js';
import { cn, fmtDate, timeAgo } from '../lib/format.js';
import TypeBadge from '../components/TypeBadge.jsx';
import toast from 'react-hot-toast';

function EligibilityRing({ daysLeft }) {
  const pct = daysLeft === 0 ? 1 : 1 - daysLeft / COOLDOWN_DAYS;
  const R = 52;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative grid h-36 w-36 place-items-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
        <motion.circle
          cx="60" cy="60" r={R} fill="none"
          stroke={daysLeft === 0 ? '#22c55e' : '#ff3355'}
          strokeWidth="8" strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - pct) }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="text-center">
        {daysLeft === 0 ? (
          <>
            <p className="font-display text-xl font-extrabold text-emerald-300">Ready</p>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">to donate</p>
          </>
        ) : (
          <>
            <p className="font-display text-2xl font-extrabold text-gradient">{daysLeft}</p>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">days to go</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, setUser, refreshUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [mesh, setMesh] = useState(null);
  const [busy, setBusy] = useState(false);
  const daysLeft = user?.lastDonationDate
    ? Math.max(COOLDOWN_DAYS - Math.floor((Date.now() - new Date(user.lastDonationDate).getTime()) / 864e5), 0)
    : 0;

  const load = useCallback(async () => {
    try {
      const [me, m] = await Promise.all([api.get('/users/me/stats'), api.get('/users/stats')]);
      setStats(me.data);
      setMesh(m.data);
    } catch {
      /* silent */
    }
  }, [user?._id]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async () => {
    const { data } = await api.patch('/users/me', { availability: !user.availability });
    setUser(data.user);
    toast.success(data.user.availability ? 'Live on the mesh 🟢' : 'Stealth mode 🌙');
  };

  const recordDonation = async () => {
    setBusy(true);
    try {
      await api.post('/users/me/donated');
      await Promise.all([refreshUser(), load()]);
      toast.success('Donation recorded. New badge incoming soon! 🎉');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const cards = [
    { icon: HeartPulse, label: 'Donations', value: stats?.user?.donationCount ?? user?.donationCount ?? 0, tint: 'text-blood-400' },
    { icon: Radio, label: 'SOS you pledged', value: stats?.responsesGiven ?? 0, tint: 'text-emerald-300' },
    { icon: Siren, label: 'Missions you fired', value: stats?.requestsPosted ?? 0, tint: 'text-amber-300' },
    { icon: Users, label: 'Lives impacted', value: stats?.livesImpacted ?? 0, tint: 'text-sky-300' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="section-title">
        Hey, <span className="text-gradient">{user?.name?.split(' ')[0]}</span>.
      </h1>
      <p className="mt-1 text-sm text-zinc-500">Your node status on the BloodMesh network.</p>

      {/* hero row */}
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="glass-strong relative overflow-hidden rounded-3xl p-6 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <TypeBadge group={user?.bloodGroup} className="!text-base !px-3 !py-1.5" />
                {isRare(user?.bloodGroup) && <span className="chip border-amber-400/50 bg-amber-400/10 text-amber-300"><Award className="h-3 w-3" /> golden blood</span>}
              </div>
              <h2 className="mt-4 font-display text-2xl font-extrabold">
                {user?.availability ? 'You are live on the mesh' : 'You are in stealth mode'}
              </h2>
              <p className="mt-1.5 max-w-md text-sm text-zinc-400">
                {user?.availability
                  ? 'Compatible donors nearby can see you, and SOS pings inside your radius hit your notifications in real time.'
                  : 'SOS matching is paused. Flip back on when you are ready to answer the network.'}
              </p>
              <button
                onClick={toggle}
                className={cn(
                  'mt-5 inline-flex items-center gap-3 rounded-2xl px-5 py-3 font-display text-sm font-bold transition',
                  user?.availability
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-[0_0_24px_rgba(34,197,94,0.35)]'
                    : 'border border-white/15 bg-white/5 text-zinc-300 hover:bg-white/10'
                )}
              >
                <span className={cn('h-2.5 w-2.5 rounded-full', user?.availability ? 'animate-pulse bg-white' : 'bg-zinc-600')} />
                {user?.availability ? 'Turned ON — receiving pings' : 'Turn yourself ON'}
              </button>
              {(user?.badges || []).length > 0 && (
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {user.badges.map((b) => (
                    <span key={b} className="chip border-amber-400/30 bg-amber-400/[0.07] text-[10px] uppercase tracking-wider text-amber-200/90">
                      <Award className="h-3 w-3" /> {b.replace(/-/g, ' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col items-center gap-3">
              <EligibilityRing daysLeft={daysLeft} />
              <button onClick={recordDonation} disabled={busy} className="btn-ghost !px-4 !py-2 text-xs">
                <Syringe className="h-3.5 w-3.5" /> I donated today
              </button>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-4">
          {cards.map(({ icon: Icon, label, value, tint }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i }}
              className="glass flex flex-col justify-between rounded-3xl p-5"
            >
              <Icon className={cn('h-6 w-6', tint)} />
              <p className="mt-4 font-display text-3xl font-extrabold text-gradient">{value}</p>
              <p className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* quick actions + mesh vitals */}
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { to: '/mesh', icon: MapIcon, title: 'Live map', body: 'See donors and SOS around you' },
            { to: '/sos', icon: Siren, title: 'Fire an SOS', body: 'Ping every compatible donor in range' },
            { to: '/camps', icon: CalendarHeart, title: 'Camps', body: 'Join or host a donation drive' },
          ].map(({ to, icon: Icon, title, body }) => (
            <Link key={to} to={to} className="glass group rounded-3xl p-5 transition hover:border-blood-500/40 hover:shadow-glow">
              <Icon className="h-6 w-6 text-blood-400 transition group-hover:scale-110" />
              <p className="mt-3 font-display text-sm font-bold">{title}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{body}</p>
            </Link>
          ))}
        </div>

        <div className="glass rounded-3xl p-5">
          <p className="inline-flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest text-zinc-400">
            <Activity className="h-4 w-4 text-emerald-400" /> Mesh vitals
          </p>
          {mesh && (
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {[
                ['Donors mapped', mesh.donors],
                ['Available now', mesh.available],
                ['Online this second', mesh.online],
                ['Open SOS', mesh.openRequests],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-white/[0.04] px-4 py-3 ring-1 ring-white/5">
                  <p className="font-display text-xl font-extrabold text-gradient">{value}</p>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
                </div>
              ))}
            </div>
          )}
          <p className="mt-4 text-[11px] text-zinc-600">Member since {user?.createdAt ? fmtDate(user.createdAt) : '—'}</p>
        </div>
      </div>
    </div>
  );
}
