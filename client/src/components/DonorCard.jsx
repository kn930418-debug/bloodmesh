import { motion } from 'framer-motion';
import { MapPin, Award, Zap, Moon } from 'lucide-react';
import TypeBadge from './TypeBadge.jsx';
import { daysToNextDonation } from '../lib/compat.js';
import { initials, cn } from '../lib/format.js';

export default function DonorCard({ donor, index = 0 }) {
  const eligibleIn = daysToNextDonation(donor.lastDonationDate);
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
      className="glass group rounded-2xl p-4 transition hover:border-blood-500/40 hover:shadow-glow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-blood-600/80 to-ink-700 font-display text-sm font-bold ring-1 ring-white/15">
              {initials(donor.name)}
            </div>
            <span
              className={cn(
                'absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-ink-900',
                donor.availability ? 'bg-emerald-400' : 'bg-zinc-600'
              )}
              title={donor.availability ? 'Available to donate' : 'Hidden / not donating now'}
            />
          </div>
          <div>
            <p className="font-semibold text-zinc-100">{donor.name}</p>
            <p className="flex items-center gap-1 text-xs text-zinc-500">
              <MapPin className="h-3 w-3" /> {donor.address || donor.city || '—'}
            </p>
          </div>
        </div>
        <TypeBadge group={donor.bloodGroup} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
        {typeof donor.distanceKm === 'number' && (
          <span className="chip border-sky-400/30 bg-sky-400/10 text-sky-300">{donor.distanceKm} km away</span>
        )}
        {donor.online && (
          <span className="chip border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
            <Zap className="h-3 w-3" /> online now
          </span>
        )}
        {donor.availability && eligibleIn > 0 && (
          <span className="chip border-white/15 bg-white/5 text-zinc-400">
            <Moon className="h-3 w-3" /> eligible in {eligibleIn}d
          </span>
        )}
        {!donor.availability && (
          <span className="chip border-white/15 bg-white/5 text-zinc-500">not donating right now</span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3 text-xs text-zinc-500">
        <span>
          <span className="font-display font-bold text-zinc-200">{donor.donationCount || 0}</span> donations
        </span>
        {(donor.badges || []).length > 0 && (
          <span className="inline-flex items-center gap-1 text-amber-300/80">
            <Award className="h-3.5 w-3.5" /> {donor.badges.length} badge{donor.badges.length > 1 ? 's' : ''}
          </span>
        )}
      </div>
      {donor.bio && <p className="mt-2 line-clamp-2 text-xs italic text-zinc-400">“{donor.bio}”</p>}
    </motion.div>
  );
}
