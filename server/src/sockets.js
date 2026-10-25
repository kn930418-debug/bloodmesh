import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from './models/User.js';
import { JWT_SECRET } from './middleware/auth.js';

let io = null;
const onlineSockets = new Map(); // userId(String) -> Set<socketId>

export function initSockets(server) {
  io = new Server(server, {
    cors: { origin: process.env.CLIENT_ORIGIN || '*', credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        socket.data.uid = jwt.verify(token, JWT_SECRET).uid;
      } catch {
        /* anonymous viewer */
      }
    }
    next();
  });

  io.on('connection', async (socket) => {
    socket.join('mesh');
    const uid = socket.data.uid;
    if (!uid) return;

    socket.join(`u:${uid}`);
    if (!onlineSockets.has(uid)) onlineSockets.set(uid, new Set());
    const wasOffline = onlineSockets.get(uid).size === 0;
    onlineSockets.get(uid).add(socket.id);

    const user = await User.findById(uid).select('name bloodGroup availability');
    if (user && wasOffline) {
      io.to('mesh').emit('presence', { userId: uid, online: true, name: user.name, availability: user.availability });
    }

    socket.on('disconnect', () => {
      const set = onlineSockets.get(uid);
      if (!set) return;
      set.delete(socket.id);
      if (set.size === 0) {
        onlineSockets.delete(uid);
        io.to('mesh').emit('presence', { userId: uid, online: false });
      }
    });
  });

  return io;
}

export function getIo() {
  return io;
}

export function onlineCount() {
  return onlineSockets.size;
}

export function isOnline(userId) {
  return onlineSockets.has(String(userId));
}

export function emitToUser(userId, event, payload) {
  if (io) io.to(`u:${userId}`).emit(event, payload);
}

export function emitToMesh(event, payload) {
  if (io) io.to('mesh').emit(event, payload);
}
