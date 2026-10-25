import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-white/10 py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-zinc-500 sm:flex-row">
        <p className="inline-flex items-center gap-1.5">
          Built with <Heart className="h-3.5 w-3.5 fill-blood-500 text-blood-500" /> for every drop that matters —{' '}
          <span className="font-display font-semibold text-zinc-300">BloodMesh</span>
        </p>
        <div className="flex gap-5">
          <Link className="transition hover:text-blood-400" to="/mesh">Live Mesh</Link>
          <Link className="transition hover:text-blood-400" to="/donors">Find Donors</Link>
          <Link className="transition hover:text-blood-400" to="/camps">Camps</Link>
        </div>
        <p>MERN • MongoDB Geo • Socket.IO real-time</p>
      </div>
    </footer>
  );
}
