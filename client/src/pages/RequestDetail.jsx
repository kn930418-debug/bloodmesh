import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Flag, Hospital, Phone, Siren, UserRound, X } from 'lucide-react';
import api, { errMsg } from '../lib/api.js';
import { onSocket } from '../lib/socket.js';
import { useAuth } from '../context/AuthContext.jsx';
import { URGENCY_META } from '../lib/compat.js';
import { cn, timeAgo, initials } from '../lib/format.js';
import TypeBadge from '../components/TypeBadge.jsx';
import toast from 'react-hot-toast';

const sosIcon = L.divIcon({ className: '', html: '<span class="bm-pin bm-pin--sos bm-pulse"></span>', iconSize: [18, 18], iconAnchor: [9, 9] });

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [request, setRequest] = useState(null);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/requests/${id}`);
      setRequest(data.request);
    } catch (err) {
      toast.error(errMsg(err, 'Request not found'));
      navigate('/requests');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const off1 = onSocket('request:response', (p) => p.requestId === id && load());
    const off2 = onSocket('request:status', (p) => p.requestId === id && load());
    return () => {
      off1();
      off2();
    };
  }, [id, load]);

  if (!request) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-blood-500" />
      </div>
    );
  }

  const urgency = URGENCY_META[request.urgency] || URGENCY_META.normal;
  const accepted = (request.responses || []).filter((r) => r.status === 'accepted');
  const declined = (request.responses || []).filter((r) => r.status === 'declined');
  const isMine = String(request.requester?._id || request.requester) === String(user?._id);
  const myResponse = (request.responses || []).find((r) => String(r.donor?._id || r.donor) === String(user?._id));
  const active = ['open', 'acknowledged'].includes(request.status);
  const coords = request.hospital?.location?.coordinates;

  const respond = async (answer) => {
    setBusy(answer);
    try {
      await api.post(`/requests/${id}/respond`, { answer });
      toast.success(answer === 'accept' ? 'Pledged — contact details shared with the requester.' : 'Declined.');
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy('');
    }
  };

  const setStatus = async (status) => {
    setBusy(status);
    try {
      await api.patch(`/requests/${id}`, { status });
      toast.success('Mission updated.');
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <button onClick={() => navigate('/requests')} className="btn-ghost !px-3 !py-1.5 text-xs">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to board
      </button>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className={cn('glass relative overflow-hidden rounded-3xl p-6 pl-7', !active && 'opacity-70')}>
            <span className={cn('absolute inset-y-0 left-0 w-1.5', urgency.bar)} />
            <div className="flex flex-wrap items-center gap-2">
              <TypeBadge group={request.bloodGroup} className="!text-base !px-3 !py-1.5" />
              <span className={cn('chip', urgency.chip)}>
                <Siren className="h-3 w-3" /> {urgency.label}
              </span>
              <span className={cn(
                'chip',
                request.status === 'fulfilled' ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                  : request.status === 'cancelled' ? 'border-white/15 bg-white/5 text-zinc-500'
                  : 'border-amber-400/40 bg-amber-400/10 text-amber-300'
              )}>
                {request.status}
              </span>
              <span className="ml-auto text-xs text-zinc-500">fired {timeAgo(request.createdAt)}</span>
            </div>

            <h1 className="mt-4 font-display text-2xl font-extrabold">
              {request.units} unit{request.units > 1 ? 's' : ''} of <span className="text-blood-400">{request.bloodGroup}</span> needed
            </h1>
            {request.patientNote && <p className="mt-2 text-sm italic leading-relaxed text-zinc-400">“{request.patientNote}”</p>}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/5">
                <p className="label !mb-1 inline-flex items-center gap-1.5"><Hospital className="h-3.5 w-3.5" /> Where</p>
                <p className="text-sm font-semibold">{request.hospital?.name}</p>
                <p className="text-xs text-zinc-500">{request.hospital?.address || '—'}</p>
              </div>
              <div className="rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/5">
                <p className="label !mb-1 inline-flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" /> Requester</p>
                <p className="text-sm font-semibold">{request.requester?.name}</p>
                <p className="text-xs text-zinc-500">
                  {isMine || accepted.length > 0 || myResponse?.status === 'accepted'
                    ? request.requester?.phone || 'no phone on file'
                    : 'phone unlocks when you pledge'}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-display text-base font-extrabold text-emerald-300">{accepted.length}</span>/{request.units} pledged
                </span>
                <span>{request.matchedDonorCount || 0} donors were alerted</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-blood-600 to-emerald-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((accepted.length / request.units) * 100, 100)}%` }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2.5">
              {active && !isMine && !myResponse && (
                <>
                  <button onClick={() => respond('accept')} disabled={!!busy} className="btn-primary">
                    <Check className="h-4 w-4" /> I can donate
                  </button>
                  <button onClick={() => respond('decline')} disabled={!!busy} className="btn-ghost">
                    <X className="h-4 w-4" /> Can't this time
                  </button>
                </>
              )}
              {active && !isMine && myResponse && (
                <span className={cn('chip', myResponse.status === 'accepted' ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' : 'border-white/15 bg-white/5 text-zinc-500')}>
                  {myResponse.status === 'accepted' ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  You {myResponse.status === 'accepted' ? 'pledged — requester can see your phone' : 'declined'}
                </span>
              )}
              {isMine && active && (
                <>
                  <button onClick={() => setStatus('fulfilled')} disabled={!!busy} className="btn-primary">
                    <Flag className="h-4 w-4" /> Mark fulfilled
                  </button>
                  <button onClick={() => setStatus('cancelled')} disabled={!!busy} className="btn-ghost">
                    Cancel mission
                  </button>
                </>
              )}
            </div>
          </motion.div>

          {coords && (
            <div className="mt-5 overflow-hidden rounded-3xl border border-white/10">
              <MapContainer key={id} center={[coords[1], coords[0]]} zoom={13} style={{ height: '230px', width: '100%' }} scrollWheelZoom={false} dragging={false} zoomControl={false}>
                <TileLayer className="bm-tiles-dark" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[coords[1], coords[0]]} icon={sosIcon}>
                  <Popup>{request.hospital?.name}</Popup>
                </Marker>
              </MapContainer>
            </div>
          )}
        </div>

        <aside>
          <div className="glass rounded-3xl p-5">
            <p className="font-display text-sm font-bold uppercase tracking-widest text-zinc-400">Heroes who pledged</p>
            {accepted.length === 0 && <p className="mt-3 text-sm text-zinc-600">No pledges yet — the mesh is still humming.</p>}
            <div className="mt-3 space-y-3">
              {accepted.map((r) => {
                const d = r.donor || {};
                const canSeeContact = isMine || String(d._id) === String(user?._id);
                return (
                  <motion.div initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} key={String(d._id)} className="flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/5">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-600/70 to-ink-700 font-display text-xs font-bold ring-1 ring-white/15">
                      {initials(d.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{d.name}</p>
                      <p className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                        <TypeBadge group={d.bloodGroup} className="!px-1.5 !py-0 !text-[10px]" />
                        {canSeeContact && d.phone ? (
                          <span className="inline-flex items-center gap-1 text-emerald-300">
                            <Phone className="h-3 w-3" /> {d.phone}
                          </span>
                        ) : (
                          <span>contact locked until you pledge</span>
                        )}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            {declined.length > 0 && (
              <p className="mt-4 text-xs text-zinc-600">{declined.length} donor(s) saw the ping but couldn't make it.</p>
            )}
          </div>

          <div className="glass mt-5 rounded-3xl p-5">
            <p className="font-display text-sm font-bold uppercase tracking-widest text-zinc-400">Mission log</p>
            <ul className="mt-3 space-y-2.5 text-xs text-zinc-500">
              <li>• SOS fired {timeAgo(request.createdAt)}</li>
              <li>• {request.matchedDonorCount || 0} compatible donors within {request.radiusKm} km alerted in real time</li>
              <li>• {accepted.length} pledge(s) • {declined.length} decline(s)</li>
              <li>• Status: <b className="text-zinc-300">{request.status}</b></li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
