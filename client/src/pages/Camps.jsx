import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, Clock, MapPin, Plus, Ticket, Users, X } from 'lucide-react';
import api, { errMsg } from '../lib/api.js';
import { BLOOD_GROUPS } from '../lib/compat.js';
import { cn, fmtDate } from '../lib/format.js';
import TypeBadge from '../components/TypeBadge.jsx';
import toast from 'react-hot-toast';

const EMPTY = { title: '', organizer: '', venue: '', city: 'Bengaluru', date: '', time: '09:00', slots: 50, bloodGroups: [] };

export default function Camps() {
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/camps');
      setCamps(data.camps);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/camps', { ...form, date: new Date(form.date).toISOString() });
      toast.success('Camp is live on the board');
      setOpen(false);
      setForm(EMPTY);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const join = async (camp) => {
    try {
      await api.post(`/camps/${camp._id}/join`);
      toast.success(`Slot booked for ${camp.title} 🎟️`);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const toggleGroup = (g) =>
    setForm((f) => ({
      ...f,
      bloodGroups: f.bloodGroups.includes(g) ? f.bloodGroups.filter((x) => x !== g) : [...f.bloodGroups, g],
    }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="section-title">Donation camps</h1>
          <p className="mt-1 text-sm text-zinc-500">Community drives near you — book a slot or host your own.</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Host a camp
        </button>
      </div>

      {loading ? (
        <div className="mt-16 flex justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-blood-500" />
        </div>
      ) : camps.length === 0 ? (
        <div className="glass mt-10 rounded-3xl p-12 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-zinc-600" />
          <p className="mt-3 font-display text-lg font-bold">No upcoming camps</p>
          <p className="mt-1 text-sm text-zinc-500">Host the first one — a single drive can fill a hospital's week.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {camps.map((c, i) => {
            const left = c.slots - c.joined;
            return (
              <motion.div
                key={c._id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="glass group flex flex-col rounded-3xl p-6 transition hover:border-blood-500/40 hover:shadow-glow"
              >
                <p className="inline-flex items-center gap-2 text-xs font-bold text-blood-400">
                  <CalendarDays className="h-4 w-4" /> {fmtDate(c.date)} · <Clock className="h-3 w-3" /> {c.time}
                </p>
                <h2 className="mt-2 font-display text-lg font-bold leading-snug">{c.title}</h2>
                <p className="mt-1 text-xs text-zinc-500">by {c.organizer}</p>
                <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-zinc-300">
                  <MapPin className="h-4 w-4 shrink-0 text-zinc-500" /> {c.venue}{c.city ? `, ${c.city}` : ''}
                </p>
                {c.bloodGroups?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {c.bloodGroups.slice(0, 6).map((g) => (
                      <TypeBadge key={g} group={g} className="!px-2 !py-0.5 !text-[10px]" />
                    ))}
                  </div>
                )}
                <div className="mt-auto pt-4">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {c.joined} joined</span>
                    <span className={cn('font-display font-bold', left < 10 ? 'text-blood-400' : 'text-emerald-300')}>{left} slots left</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-gradient-to-r from-blood-600 to-blood-400" style={{ width: `${(c.joined / c.slots) * 100}%` }} />
                  </div>
                  <button
                    onClick={() => join(c)}
                    disabled={left <= 0}
                    className="btn-ghost mt-4 w-full text-sm group-hover:border-blood-500/40"
                  >
                    <Ticket className="h-4 w-4" /> {left > 0 ? 'Book my slot' : 'Slots full'}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1200] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.form
              initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
              onSubmit={create}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong w-full max-w-lg rounded-3xl p-6 sm:p-7"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-extrabold">Host a camp</h2>
                <button type="button" onClick={() => setOpen(false)} className="text-zinc-500 hover:text-white"><X className="h-5 w-5" /></button>
              </div>
              <div className="mt-5 space-y-4">
                <input required className="input" placeholder="Camp title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <input required className="input" placeholder="Organizer" value={form.organizer} onChange={(e) => setForm({ ...form, organizer: e.target.value })} />
                  <input className="input" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <input required className="input" placeholder="Venue / address" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="label">Date</label>
                    <input type="date" required className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Time</label>
                    <input type="time" className="input" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Slots</label>
                    <input type="number" min="1" max="500" className="input" value={form.slots} onChange={(e) => setForm({ ...form, slots: Number(e.target.value) })} />
                  </div>
                </div>
                <div>
                  <label className="label">Groups in demand (optional)</label>
                  <div className="flex flex-wrap gap-1.5">
                    {BLOOD_GROUPS.map((g) => (
                      <button
                        type="button" key={g} onClick={() => toggleGroup(g)}
                        className={cn(
                          'rounded-lg border px-2.5 py-1 font-display text-xs font-bold transition',
                          form.bloodGroups.includes(g) ? 'border-blood-500 bg-blood-500/20 text-blood-400' : 'border-white/10 bg-white/5 text-zinc-500'
                        )}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button type="submit" disabled={busy} className="btn-primary mt-6 w-full !py-3">
                {busy ? 'Publishing…' : 'Put it on the board'}
              </button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
