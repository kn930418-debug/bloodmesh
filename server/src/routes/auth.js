import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User, { pointFrom } from '../models/User.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { BLOOD_GROUPS } from '../utils/compat.js';

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, phone, password, bloodGroup, lat, lng, city, address, availability } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
    if (!BLOOD_GROUPS.includes(bloodGroup)) return res.status(400).json({ message: 'Choose a valid blood group' });
    if (String(password).length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return res.status(400).json({ message: 'Invalid coordinates' });
    } else {
      return res.status(400).json({ message: 'Location (lat/lng) is required to join the mesh' });
    }

    const exists = await User.findOne({ email: String(email).toLowerCase() });
    if (exists) return res.status(409).json({ message: 'An account with this email already exists' });

    const user = await User.create({
      name,
      email,
      phone: phone || '',
      passwordHash: await bcrypt.hash(password, 10),
      bloodGroup,
      city: city || '',
      address: address || '',
      location: pointFrom(lat, lng),
      availability: availability !== false,
    });

    res.status(201).json({ token: signToken(user), user: user.toJSON() });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    res.json({ token: signToken(user), user: user.toJSON() });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user.toJSON() });
});

export default router;
