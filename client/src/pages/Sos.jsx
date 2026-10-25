import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, MapPin, Siren, Stethoscope, Users } from 'lucide-react';
import api, { errMsg } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { BLOOD_GROUPS, donorsFor, URGENCY_META } from '../lib/compat.js';
import { cn } from '../lib/format.js';
import MapPicker from '../components/MapPicker.jsx';
import TypeBadge from '../components/TypeBadge.jsx';
import toast from 'react-hot-toast';

const STEPS = ['Need', 'Location', 'Mission brief'];

export default function Sos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const me = { lat: user?.lat ?? 12.9352, lng: user?.lng ?? 77.6245 };

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({
    bloodGroup: 'O+', units: 1, urgency: 'urgent', radiusKm: 10,
    hospitalName: '', hospitalAddress: '', hospitalContact: user?.phone || '',
    site: null, patientNote: '',
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  if (result) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-strong relative mx-auto grid h-56 w-56 place-items-center overflow-visible rounded-full">
          <div className="radar-sweep" />
          <div className="absolute inset-6 rounded-full border border-blood-500/30" />
          <div className="absolute inset-12 rounded-full border border-blood-500/20" />
          <Siren className="relative h-16 w-16 text-blood-500 drop-shadow-[0_0_18px_rgba(255,51,85,0.9)]" />
        </motion.div>
        <h1 className="mt-8 font-display text-3xl font-extrabold">Broadcast complete</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          The mesh just pinged <b className="text-blood-400">{result.matchedDonors}</b> compatible donors within {form.radiusKm} km of{' '}
          <b className="text-zinc-200">{form.hospitalName}</b>. They can accept or decline in real time — watch pledges arrive live.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <button onClick={() => navigate(`/requests/${result.request._id}`)} className="btn-primary">
            Track this mission <ArrowRight className="h-4 w-4" />
          </button>
          <button onClick={() => navigate('/mesh')} className="btn-ghost">
            <MapPin className="h-4 w-4" /> See the map
          </button>
        </div>
      </div>
    );
  }

  const fire = async () => {
    if (!form.hospitalName) return toast.error('Hospital name is required');
    const site = form.site || me;
    setBusy(true);
    try {
      const { data } = await api.post('/requests', {
        bloodGroup: form.bloodGroup,
        units: form.units,
        urgency: form.urgency,
        radiusKm: form.radiusKm,
        patientNote: form.patientNote,
        hospital: {
          name: form.hospitalName,
          address: form.hospitalAddress,
          contact: form.hospitalContact,
          lat: site.lat,
          lng: site.lng,
        },
      });
      setResult(data);
    } catch (err) {
      toast.error(errMsg(err, 'Could not fire SOS'));
    } finally {
      setBusy(false);
    }
  };

  const compatible = donorsFor(form.bloodGroup);
  const canNext = step === 0 ? true : step === 1 ? !!form.hospitalName : true;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="text-center">
        <span className="chip mx-auto border-blood-500/40 bg-blood-500/10 text-blood-400">
          <Siren className="h-3 w-3" /> SOS broadcast console
        </span>
        <h1 className="mt-3 font-display text-3xl font-extrabold">Fire an SOS</h1>
        <p className="mt-2 text-sm text-zinc-500">Three steps, thirty seconds, one pinged mesh.</p>
      </div>

      {/* stepper */}
      <div className="mt-8 flex items-center justify-center gap-0">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <button onClick={() => i < step && setStep(i)} className="flex items-center gap-2">
              <span
                className={cn(
                  'grid h-8 w-8 place-items-center rounded-full font-display text-sm font-bold transition',
                  i < step ? 'bg-emerald-500/20 text-emerald-300' : i === step ? 'bg-gradient-to-br from-blood-600 to-blood-500 text-white shadow-glow' : 'bg-white/5 text-zinc-600'
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className={cn('hidden text-xs font-semibold sm:inline', i === step ? 'text-zinc-100' : 'text-zinc-600')}>{s}</span>
            </button>
            {i < 2 && <span className={cn('mx-2 h-px w-10 sm:w-16', i < step ? 'bg-emerald-500/50' : 'bg-white/10')} />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25 }}
          className="glass-strong mt-8 rounded-3xl p-6 sm:p-8"
        >
          {step === 0 && (
            <>
              <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                <Stethoscope className="h-5 w-5 text-blood-400" /> What does the patient need?
              </h2>
              <p className="label mt-5">Patient blood group</p>
              <div className="flex flex-wrap gap-2">
                {BLOOD_GROUPS.map((g) => (
                  <button
                    key={g}
                    onClick={() => set('bloodGroup', g)}
                    className={cn(
                      'rounded-xl border px-4 py-2.5 font-display text-sm font-bold transition',
                      form.bloodGroup === g ? 'border-blood-500 bg-blood-500/20 text-blood-400 shadow-glow' : 'border-white/10 bg-white/5 text-zinc-500 hover:text-zinc-200'
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <div className="glass mt-4 rounded-xl p-4 text-xs">
                <p className="text-zinc-400">The mesh will alert only these donor groups:</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {compatible.map((g) => (
                    <TypeBadge key={g} group={g} className="!px-2 !py-0.5 !text-[11px]" />
                  ))}
                </div>
              </div>
              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="label">Units required</p>
                  <div className="flex items-center gap-4">
                    <button onClick={() => set('units', Math.max(1, form.units - 1))} className="btn-ghost !px-3.5 !py-1.5">−</button>
                    <span className="font-display text-3xl font-extrabold text-gradient">{form.units}</span>
                    <button onClick={() => set('units', Math.min(10, form.units + 1))} className="btn-ghost !px-3.5 !py-1.5">+</button>
                  </div>
                </div>
                <div>
                  <p className="label">Urgency</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(URGENCY_META).map(([k, m]) => (
                      <button
                        key={k}
                        onClick={() => set('urgency', k)}
                        className={cn(
                          'rounded-lg border px-3.5 py-2 text-xs font-bold transition',
                          form.urgency === k ? m.chip : 'border-white/10 bg-white/5 text-zinc-500'
                        )}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                <MapPin className="h-5 w-5 text-blood-400" /> Where is the rescue happening?
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Hospital / blood bank</label>
                  <input className="input" value={form.hospitalName} onChange={(e) => set('hospitalName', e.target.value)} placeholder="e.g. Manipal Hospital" />
                </div>
                <div>
                  <label className="label">Ward / address detail</label>
                  <input className="input" value={form.hospitalAddress} onChange={(e) => set('hospitalAddress', e.target.value)} placeholder="Old Airport Rd" />
                </div>
              </div>
              <p className="label mt-5">Pin the exact spot <span className="normal-case text-zinc-600">(drag the pin or tap the map — defaults to your location)</span></p>
              <MapPicker
                center={me}
                value={form.site}
                radiusKm={form.radiusKm}
                onChange={(p) => set('site', p)}
                height="300px"
              />
              <div className="mt-5">
                <p className="label">Broadcast radius — <span className="text-blood-400">{form.radiusKm} km</span></p>
                <input type="range" min="1" max="50" value={form.radiusKm} onChange={(e) => set('radiusKm', Number(e.target.value))} className="h-1.5 w-full cursor-pointer accent-blood-500" />
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-zinc-500">
                  <Users className="h-3.5 w-3.5" /> compatible available donors inside this circle get pinged instantly
                </p>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="font-display text-lg font-bold">Mission brief</h2>
              <label className="label mt-5">Note for donors (optional)</label>
              <textarea className="input min-h-24 resize-none" value={form.patientNote} onChange={(e) => set('patientNote', e.target.value)} placeholder="e.g. Father, cardiac surgery Saturday 9 AM. Hospital contact at reception." />
              <div className="mt-4">
                <label className="label">On-ground contact</label>
                <input className="input" value={form.hospitalContact} onChange={(e) => set('hospitalContact', e.target.value)} />
              </div>
              <div className="glass mt-6 rounded-2xl p-4 text-sm">
                <p className="font-display text-xs font-bold uppercase tracking-widest text-zinc-500">Mission summary</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <TypeBadge group={form.bloodGroup} />
                  <span className="chip border-white/15 bg-white/5 text-zinc-300">{form.units} unit(s)</span>
                  <span className={cn('chip', URGENCY_META[form.urgency].chip)}>{URGENCY_META[form.urgency].label}</span>
                  <span className="chip border-white/15 bg-white/5 text-zinc-300">{form.hospitalName || '—'}</span>
                  <span className="chip border-white/15 bg-white/5 text-zinc-300">{form.radiusKm} km radius</span>
                </div>
              </div>
            </>
          )}

          <div className="mt-8 flex items-center justify-between">
            {step > 0 ? (
              <button onClick={() => setStep(step - 1)} className="btn-ghost">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            ) : (
              <span />
            )}
            {step < 2 ? (
              <button onClick={() => canNext && setStep(step + 1)} disabled={!canNext} className="btn-primary">
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={fire} disabled={busy} className="btn-primary !px-8 text-base" style={{ background: 'linear-gradient(90deg,#be123c,#ff3355)' }}>
                <Siren className={cn('h-5 w-5', busy && 'animate-pulse')} /> {busy ? 'Broadcasting…' : 'Fire the SOS'}
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
