import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Inbox, ListOrdered, Pin, Radio, Siren } from 'lucide-react';
import api from '../lib/api.js';
import { onSocket } from '../lib/socket.js';
import { useAuth } from '../context/AuthContext.jsx';
import { cn } from '../lib/format.js';
import RequestCard from '../components/RequestCard.jsx';
import toast from 'react-hot-toast';

const TABS = [
  { key: 'nearby', label: 'Nearby SOS', icon: Pin },
  { key: 'posted', label: 'My missions', icon: ListOrdered },
  { key: 'responded', label: 'My pledges', icon: Inbox },
];

export default function Requests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('nearby');
  const [data, setData] = useState({ nearby: [], posted: [], responded: [] });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const me = { lat: user?.lat ?? 12.9352, lng: user?.lng ?? 77.6245 };
      const [nearby, mine] = await Promise.all([
        api.get('/requests/nearby', { params: { ...me, radiusKm: 50 } }),
        api.get('/requests/mine'),
      ]);
      setData({ nearby: nearby.data.requests, posted: mine.data.posted, responded: mine.data.responded });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load board');
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const off1 = onSocket('request:new', () => load());
    const off2 = onSocket('request:response', () => load());
    const off3 = onSocket('request:status', () => load());
    return () => {
      off1();
      off2();
      off3();
    };
  }, [load]);

  const lists = { nearby: data.nearby, posted: data.posted, responded: data.responded };
  const list = lists[tab];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="section-title">SOS board</h1>
          <p className="mt-1 text-sm text-zinc-500">Every open mission, updated live as the mesh answers.</p>
        </div>
        <button onClick={() => navigate('/sos')} className="btn-primary">
          <Siren className="h-4 w-4" /> New SOS
        </button>
      </div>

      <div className="glass mt-6 inline-flex gap-1 rounded-xl p-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition',
              tab === key ? 'bg-gradient-to-r from-blood-600 to-blood-500 text-white shadow-glow' : 'text-zinc-400 hover:text-white'
            )}
          >
            <Icon className="h-4 w-4" /> {label}
            <span className={cn('rounded-full px-1.5 text-[10px] font-bold', tab === key ? 'bg-white/20' : 'bg-white/5 text-zinc-500')}>
              {lists[key].length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-12 flex justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-blood-500" />
        </div>
      ) : list.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass mt-8 rounded-3xl p-12 text-center">
          <Radio className="mx-auto h-8 w-8 text-zinc-600" />
          <p className="mt-3 font-display text-lg font-bold">Nothing on this board</p>
          <p className="mt-1 text-sm text-zinc-500">
            {tab === 'nearby' && 'No open SOS within 50 km. The quietest board is the best one.'}
            {tab === 'posted' && 'You have not fired any SOS yet.'}
            {tab === 'responded' && 'Pledge on a nearby SOS and it will show up here.'}
          </p>
        </motion.div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {list.map((r) => (
            <RequestCard key={r._id} request={r} variant={tab} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}
