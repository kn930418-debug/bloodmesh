import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { Activity, ArrowRight, Radar, ShieldHalf, Sparkles, Users2, Zap } from 'lucide-react';
import api from '../lib/api.js';
import DropCanvas from '../components/DropCanvas.jsx';
import TypeBadge from '../components/TypeBadge.jsx';
import { BLOOD_GROUPS, donorsFor } from '../lib/compat.js';
import { cn } from '../lib/format.js';

function Counter({ value, label, suffix = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start = null;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min((t - start) / 1200, 1);
      setN(Math.floor(p * value));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, value]);
  return (
    <div ref={ref} className="text-center">
      <p className="font-display text-3xl font-extrabold text-gradient sm:text-4xl">
        {n}
        {suffix}
      </p>
      <p className="mt-1 text-xs uppercase tracking-widest text-zinc-500">{label}</p>
    </div>
  );
}

const LIVE_FEED = [
  'Diya (O−) pledged at Manipal Hospital · 2.1 km away',
  'SOS cleared in 34 minutes · HSR Layout',
  'Rahul (B+) came online · Whitefield',
  'New camp scheduled · Jayanagar Town Hall',
  'AB− rare-type match found · 5 km radius',
  'Meera completed her 10th donation 🎉',
];

export default function Landing() {
  const [stats, setStats] = useState({ donors: 0, available: 0, rare: 0, openRequests: 0, online: 0 });
  const [feedIdx, setFeedIdx] = useState(0);
  const [patient, setPatient] = useState('O-');

  useEffect(() => {
    api.get('/users/stats').then(({ data }) => setStats(data)).catch(() => {});
    const t = setInterval(() => setFeedIdx((i) => (i + 1) % LIVE_FEED.length), 2600);
    return () => clearInterval(t);
  }, []);

  const compatible = useMemo(() => donorsFor(patient), [patient]);

  return (
    <div className="relative">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <DropCanvas className="absolute inset-0 -z-0 opacity-70" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink-950" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-20 pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:pt-24">
          <div>
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <span className="chip border-blood-500/40 bg-blood-500/10 text-blood-400">
                <Activity className="h-3 w-3" /> {stats.online} donors online right now
              </span>
              <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl">
                The living mesh of
                <br />
                <span className="text-gradient">blood heroes.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
                Fire an SOS and BloodMesh pings every <span className="text-zinc-200">compatible donor within your radius</span> —
                in real time, on a live map. No phone trees. No Facebook groups. Just a network that answers.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/auth" className="btn-primary text-base !px-7 !py-3">
                  Join the mesh <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/auth?mode=login" className="btn-ghost text-base !px-7 !py-3">
                  <Radar className="h-4 w-4" /> Open live map
                </Link>
              </div>
              <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
                <Counter value={stats.donors} label="donors mapped" />
                <Counter value={stats.available} label="available now" />
                <Counter value={stats.rare} label="rare types" />
                <Counter value={stats.openRequests} label="live SOS" />
              </div>
            </motion.div>
          </div>

          {/* live feed panel */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="glass-strong absolute right-6 top-4 animate-float rounded-2xl px-4 py-3 text-xs shadow-glow-lg">
              <p className="font-display font-bold text-emerald-300">● MESH STATUS: LIVE</p>
              <p className="mt-1 text-zinc-400">Geo-matching every 30s</p>
            </div>
            <div className="glass-strong mt-14 rounded-3xl p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Live activity</p>
              <div className="mt-4 space-y-3">
                {[...Array(4)].map((_, i) => {
                  const idx = (feedIdx + i) % LIVE_FEED.length;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1 - i * 0.28, x: 0 }}
                      className={cn(
                        'rounded-xl border px-4 py-3 text-sm',
                        i === 0 ? 'border-blood-500/40 bg-blood-500/10 text-zinc-100' : 'border-white/5 bg-white/[0.03] text-zinc-400'
                      )}
                    >
                      {LIVE_FEED[idx]}
                    </motion.div>
                  );
                })}
              </div>
              <div className="mt-5 flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-3">
                <span className="inline-flex items-center gap-2 text-xs text-zinc-400">
                  <Zap className="h-3.5 w-3.5 text-amber-300" /> Avg. SOS response time
                </span>
                <span className="font-display text-sm font-bold text-emerald-300">27 min</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="section-title text-center">How a drop becomes a rescue</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-zinc-500">Three moves. One living network.</p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            { icon: Radar, title: 'Fire an SOS', body: 'Blood group, units, hospital, radius. Thirty seconds, on a map — with a live preview of who gets alerted.' },
            { icon: Users2, title: 'The mesh pings', body: 'MongoDB geo-matching finds every available, immunologically compatible donor in range. They get a real-time socket ping — accept or decline.' },
            { icon: ShieldHalf, title: 'Coordinates the rescue', body: 'Pledges, contact details and the hospital lock in one thread. Mark it fulfilled and every hero gets notified.' },
          ].map(({ icon: Icon, title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="glass rounded-3xl p-6"
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-blood-600 to-blood-500 shadow-glow">
                <Icon className="h-6 w-6 text-white" />
              </div>
              <p className="mt-4 font-display text-xs font-bold uppercase tracking-widest text-blood-400">Step {i + 1}</p>
              <h3 className="mt-1 font-display text-xl font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* COMPATIBILITY EXPLORER */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="glass-strong overflow-hidden rounded-3xl">
          <div className="grid gap-8 p-8 lg:grid-cols-[1fr_1.2fr] lg:p-10">
            <div>
              <span className="chip border-amber-400/40 bg-amber-400/10 text-amber-300">
                <Sparkles className="h-3 w-3" /> Compatibility engine
              </span>
              <h2 className="section-title mt-4">Who can save your patient?</h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                BloodMesh only alerts immunologically safe donors. Tap a patient group and see exactly which donor groups the mesh will wake up.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {BLOOD_GROUPS.map((g) => (
                  <button
                    key={g}
                    onClick={() => setPatient(g)}
                    className={cn(
                      'rounded-xl border px-4 py-2 font-display text-sm font-bold transition',
                      patient === g
                        ? 'border-blood-500 bg-blood-500/20 text-blood-400 shadow-glow'
                        : 'border-white/10 bg-white/5 text-zinc-400 hover:border-white/25'
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-ink-900/60 p-6 ring-1 ring-white/5">
              <p className="text-xs uppercase tracking-widest text-zinc-500">Patient needs</p>
              <div className="mt-2 flex items-center gap-3">
                <TypeBadge group={patient} className="!text-lg !px-4 !py-2" />
                <ArrowRight className="h-5 w-5 text-zinc-600" />
                <p className="text-sm text-zinc-300">
                  <span className="font-display font-extrabold text-emerald-300">{compatible.length}</span> donor groups alerted
                </p>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {BLOOD_GROUPS.map((g) => (
                  <TypeBadge key={g} group={g} className={cn(!compatible.includes(g) && 'opacity-25 grayscale')} />
                ))}
              </div>
              <p className="mt-5 text-[11px] leading-relaxed text-zinc-600">
                O− is the universal donor — the mesh treats it as a national treasure. AB+ patients can only receive from AB+ donors.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blood-700 via-blood-600 to-ink-800 px-8 py-14 text-center shadow-glow-lg"
        >
          <div className="pointer-events-none absolute inset-0 opacity-20">
            <DropCanvas density={0.00012} linkDist={90} className="h-full w-full" />
          </div>
          <h2 className="relative font-display text-3xl font-extrabold sm:text-4xl">Somewhere, someone with your blood type</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-sm text-rose-100/80">
            is 4 km away and willing to help. The only problem is that neither of you knows it yet. BloodMesh fixes that in 30 seconds.
          </p>
          <Link to="/auth" className="relative mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3 font-display text-sm font-bold text-blood-700 transition hover:scale-[1.03]">
            Become a node in the mesh <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
