import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { connectDB } from './db.js';
import { initSockets } from './sockets.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import requestRoutes from './routes/requests.js';
import notificationRoutes from './routes/notifications.js';
import campRoutes from './routes/camps.js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'bloodmesh-api' }));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/camps', campRoutes);

app.use((req, res) => res.status(404).json({ message: `No route: ${req.method} ${req.path}` }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[api] error:', err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

const server = http.createServer(app);
initSockets(server);

const PORT = process.env.PORT || 5000;
connectDB()
  .then(() => server.listen(PORT, () => console.log(`[api] BloodMesh server listening on :${PORT}`)))
  .catch((err) => {
    console.error('[api] failed to start:', err.message);
    process.exit(1);
  });
