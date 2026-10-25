import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Hospital, Radio, Users, Check, X, Flag, Loader2 } from 'lucide-react';
import api, { errMsg } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { URGENCY_META } from '../lib/compat.js';
import { timeAgo, cn } from '../lib/format.js';
import TypeBadge from './TypeBadge.jsx';
import toast from 'react-hot-toast';

export default function RequestCard({ request, variant = 'nearby', onChanged }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState('');

  const urgency = URGENCY_META[request.urgency] || URGENCY_META.normal;
  const accepted = (request.responses || []).filter((r) => r.status === 'accepted');
  const myResponse = (request.responses || []).find((r) => String(r.donor) === String(user?._id));
  const isMine = String(request.requester?._id || request.requester) === String(user?._id);
  const active = ['open', 'acknowledged'].includes(request.status);

  const respond = async (answer) => {
    setBusy(answer);
    try {
      await api.post(`/requests/${request._id}/respond`, { answer });
      toast.success(answer === 'accept' ? 'Pledged! The requester has been notified.' : 'Declined.');
      onChanged?.();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy('');
    }
  };

  const setStatus = async (status) => {
    setBusy(status);
    try {
      await api.patch(`/requests/${request._id}`, { status });
      toast.success(status === 'fulfilled' ? 'Marked fulfilled — heroes notified 🎉' : 'Request closed.');
      onChanged?.();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy('');
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('glass relative overflow-hidden rounded-2xl p-4 pl-5', !active && 'opacity-60')}
    >
      <span className={cn('absolute inset-y-0 left-0 w-1', urgency.bar)} />

      <div className="flex flex-wrap items-center gap-2">
        <TypeBadge group={request.bloodGroup} />
        <span className={cn('chip', urgency.chip)}>{urgency.label}</span>
        {request.distanceKm !== undefined && (
          <span className="chip border-white/10 bg-white/5 text-zinc-400">{request.distanceKm} km</span>
        )}
        <span className="ml-auto text-[11px] text-zinc-500">{timeAgo(request.createdAt)}</span>
      </div>

      <p className="mt-2.5 font-semibold text-zinc-100">
        {request.units} unit{request.units > 1 ? 's' : ''} needed
        {request.status === 'fulfilled' && ' — fulfilled ✓'}
        {request.status === 'cancelled' && ' — cancelled'}
      </p>
      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-zinc-400">
        <Hospital className="h-3.5 w-3.5 shrink-0 text-blood-400" />
        {request.hospital?.name}
        {request.hospital?.address && <span className="hidden text-zinc-600 sm:inline">· {request.hospital.address}</span>}
      </p>
      {request.patientNote && <p className="mt-1.5 line-clamp-2 text-xs italic text-zinc-500">“{request.patientNote}”</p>}

      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] text-zinc-500">
          <span className="inline-flex items-center gap-1">
            <Check className="h-3 w-3 text-emerald-400" /> {accepted.length}/{request.units} pledged
          </span>
          <span className="inline-flex items-center gap-1">
            <Radio className="h-3 w-3" /> {request.matchedDonorCount || 0} donors alerted
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blood-600 to-emerald-400 transition-all"
            style={{ width: `${Math.min((accepted.length / request.units) * 100, 100)}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={() => navigate(`/requests/${request._id}`)} className="btn-ghost !px-3 !py-1.5 text-xs">
          <Users className="h-3.5 w-3.5" /> Details
        </button>

        {variant === 'nearby' && active && !isMine && !myResponse && (
          <>
            <button onClick={() => respond('accept')} disabled={!!busy} className="btn-primary !px-3 !py-1.5 text-xs">
              {busy === 'accept' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} I can donate
            </button>
            <button onClick={() => respond('decline')} disabled={!!busy} className="btn-ghost !px-3 !py-1.5 text-xs !text-zinc-500">
              <X className="h-3.5 w-3.5" /> Can't
            </button>
          </>
        )}
        {variant === 'nearby' && active && !isMine && myResponse?.status === 'accepted' && (
          <span className="chip border-emerald-400/40 bg-emerald-400/10 text-emerald-300">
            <Check className="h-3 w-3" /> You pledged
          </span>
        )}

        {isMine && active && (
          <>
            <button onClick={() => setStatus('fulfilled')} disabled={!!busy} className="btn-primary !px-3 !py-1.5 text-xs">
              <Flag className="h-3.5 w-3.5" /> Mark fulfilled
            </button>
            <button onClick={() => setStatus('cancelled')} disabled={!!busy} className="btn-ghost !px-3 !py-1.5 text-xs !text-zinc-500">
              Cancel
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}
