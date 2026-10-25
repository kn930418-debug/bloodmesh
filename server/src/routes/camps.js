import { Router } from 'express';
import Camp from '../models/Camp.js';
import Notification from '../models/Notification.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const query = { date: { $gte: new Date() } };
    if (req.query.city) query.city = new RegExp(String(req.query.city), 'i');
    const camps = await Camp.find(query).sort({ date: 1 }).limit(50);
    res.json({ camps });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { title, organizer, venue, city, date, time, bloodGroups, slots } = req.body || {};
    if (!title || !organizer || !venue || !date) {
      return res.status(400).json({ message: 'title, organizer, venue and date are required' });
    }
    const camp = await Camp.create({
      title,
      organizer,
      venue,
      city: city || '',
      date: new Date(date),
      time: time || '09:00',
      bloodGroups: Array.isArray(bloodGroups) ? bloodGroups : [],
      slots: Math.min(Math.max(Number(slots) || 50, 1), 500),
      createdBy: req.user._id,
    });
    res.status(201).json({ camp });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/join', requireAuth, async (req, res, next) => {
  try {
    const camp = await Camp.findById(req.params.id);
    if (!camp) return res.status(404).json({ message: 'Camp not found' });
    if (camp.joined >= camp.slots) return res.status(409).json({ message: 'All slots are filled' });
    camp.joined += 1;
    await camp.save();
    await Notification.create({
      user: req.user._id,
      type: 'camp',
      title: `Registered for ${camp.title}`,
      body: `${camp.venue} • ${camp.date.toDateString()} at ${camp.time}`,
      link: '/camps',
    });
    res.json({ camp });
  } catch (err) {
    next(err);
  }
});

export default router;
