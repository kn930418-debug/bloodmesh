import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell, Menu, X, LogOut, User as UserIcon, LayoutDashboard, Radio, HeartHandshake,
  Map as MapIcon, ListOrdered, CalendarHeart, Siren, CheckCheck,
} from 'lucide-react';
import api from '../lib/api.js';
import { onSocket } from '../lib/socket.js';
import { useAuth } from '../context/AuthContext.jsx';
import { timeAgo, cn } from '../lib/format.js';
import toast from 'react-hot-toast';
import { useEffect, useRef } from 'react';

const NAV = [
  { to: '/mesh', label: 'Live Mesh', icon: MapIcon },
  { to: '/donors', label: 'Donors', icon: Users2Icon },
  { to: '/requests', label: 'SOS Board', icon: ListOrdered },
  { to: '/camps', label: 'Camps', icon: CalendarHeart },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

function Users2Icon(props) {
  return <HeartHandshake {...props} />;
}

export default function Navbar() {
  const { user, setUser: setUserSafe, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const [availBusy, setAvailBusy] = useState(false);
  const bellRef = useRef(null);

  const loadNotifs = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifs(data.notifications);
      setUnread(data.unread);
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    if (!user) {
      setNotifs([]);
      setUnread(0);
      return;
    }
    loadNotifs();
    const off = onSocket('notification:new', () => {
      loadNotifs();
      toast('🩸 New SOS ping on the mesh', { icon: '📡' });
    });
    return off;
  }, [user]);

  useEffect(() => {
    const close = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const toggleAvailability = async () => {
    setAvailBusy(true);
    try {
      const { data } = await api.patch('/users/me', { availability: !user.availability });
      setUserSafe(data.user);
      toast.success(data.user.availability ? 'You are live on the mesh' : 'Hidden from SOS matching');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed');
    } finally {
      setAvailBusy(false);
    }
  };

  const markAll = async () => {
    await api.post('/notifications/read-all');
    loadNotifs();
  };

  const linkCls = ({ isActive }) =>
    cn(
      'rounded-lg px-3 py-2 text-sm font-medium transition',
      isActive ? 'bg-blood-500/15 text-blood-400' : 'text-zinc-300 hover:bg-white/5 hover:text-white'
    );

  return (
    <header className="sticky top-0 z-[1100] border-b border-white/10 bg-ink-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
        <Link to="/" className="group flex items-center gap-2">
          <motion.span
            className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blood-600 to-blood-500 shadow-glow"
            whileHover={{ rotate: -8, scale: 1.06 }}
          >
            <Siren className="h-5 w-5 text-white" />
          </motion.span>
          <span className="font-display text-lg font-extrabold tracking-tight">
            Blood<span className="text-blood-500">Mesh</span>
          </span>
        </Link>

        {user && (
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={linkCls}>
                <span className="mr-1.5 inline-flex items-center gap-1.5">
                  <Icon className="h-4 w-4" /> {label}
                </span>
              </NavLink>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <button
                onClick={toggleAvailability}
                disabled={availBusy}
                className={cn(
                  'hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition sm:inline-flex',
                  user.availability
                    ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                    : 'border-white/15 bg-white/5 text-zinc-400'
                )}
                title="Toggle your presence on the mesh"
              >
                <span className={cn('h-2 w-2 rounded-full', user.availability ? 'animate-pulse bg-emerald-400' : 'bg-zinc-500')} />
                {user.availability ? 'Available' : 'Hidden'}
              </button>

              <div className="relative" ref={bellRef}>
                <button
                  onClick={() => setBellOpen((v) => !v)}
                  className="relative grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10"
                >
                  <Bell className="h-4 w-4" />
                  {unread > 0 && (
                    <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-blood-500 px-1 text-[10px] font-bold text-white">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </button>
                <AnimatePresence>
                  {bellOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.97 }}
                      className="glass-strong absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl"
                    >
                      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Pings</span>
                        <button onClick={markAll} className="inline-flex items-center gap-1 text-xs text-blood-400 hover:text-blood-500">
                          <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                        </button>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifs.length === 0 && (
                          <p className="px-4 py-6 text-center text-sm text-zinc-500">Quiet on the mesh… for now.</p>
                        )}
                        {notifs.map((n) => (
                          <button
                            key={n._id}
                            onClick={() => {
                              setBellOpen(false);
                              if (n.link) navigate(n.link);
                            }}
                            className={cn(
                              'block w-full border-b border-white/5 px-4 py-3 text-left transition hover:bg-white/5',
                              !n.read && 'bg-blood-500/[0.06]'
                            )}
                          >
                            <p className="text-sm font-semibold text-zinc-100">{n.title}</p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-zinc-400">{n.body}</p>
                            <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">{timeAgo(n.createdAt)}</p>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Link
                to="/sos"
                className="btn-primary hidden !px-4 !py-2 sm:inline-flex"
                style={{ background: 'linear-gradient(90deg,#e11d48,#ff3355)' }}
              >
                <Radio className="h-4 w-4" /> SOS
              </Link>

              <div className="ml-1 hidden items-center gap-2 lg:flex">
                <Link
                  to="/profile"
                  className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 text-xs font-bold ring-1 ring-white/15 transition hover:ring-blood-500/60"
                  title={user.name}
                >
                  {user.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                </Link>
                <button
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 transition hover:text-blood-400"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <Link to="/auth" className="btn-primary">
              <UserIcon className="h-4 w-4" /> Sign in / Join
            </Link>
          )}

          <button
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && user && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/10 bg-ink-900 lg:hidden"
          >
            <div className="space-y-1 px-4 py-3">
              {NAV.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} className={linkCls} onClick={() => setMobileOpen(false)}>
                  <span className="inline-flex items-center gap-2">
                    <Icon className="h-4 w-4" /> {label}
                  </span>
                </NavLink>
              ))}
              <NavLink to="/sos" className={linkCls} onClick={() => setMobileOpen(false)}>
                <span className="inline-flex items-center gap-2 text-blood-400">
                  <Radio className="h-4 w-4" /> Fire an SOS
                </span>
              </NavLink>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
