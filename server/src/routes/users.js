import { Router } from 'express';
import User, { pointFrom } from '../models/User.js';
import BloodRequest from '../models/BloodRequest.js';
import { requireAuth } from '../middleware/auth.js';
import { emitToMesh } from '../sockets.js';
import { onlineCount, isOnline } from '../sockets.js';
import { donorsFor, RARE_GROUPS } from '../utils/compat.js';

const router = Router();

// Public mesh vitals for the landing page + dashboard.
router.get('/stats', async (_req, res, next) => {
  try {
    const [donors, available, rare, openRequests] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ availability: true }),
      User.countDocuments({ bloodGroup: { $in: RARE_GROUPS } }),
      BloodRequest.countDocuments({ status: { $in: ['open', 'acknowledged'] } }),
    ]);
    res.json({ donors, available, rare, openRequests, online: onlineCount() });
  } catch (err) {
    next(err);
  }
});

// Nearby donor search — the heart of the location engine.
router.get('/nearby', requireAuth, async (req, res, next) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ message: 'lat and lng query params are required' });
    }
    const radiusKm = Math.min(Math.max(Number(req.query.radiusKm) || 10, 1), 50);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 40, 100);

    const query = {};
    if (req.query.onlyAvailable === undefined || req.query.onlyAvailable === 'true') query.availability = true;
    if (req.query.neededFor && donorsFor(String(req.query.neededFor)).length) {
      query.bloodGroup = { $in: donorsFor(String(req.query.neededFor)) };
    } else if (req.query.bloodGroup) {
      query.bloodGroup = String(req.query.bloodGroup);
    }

    const [users, total] = await Promise.all([
      User.aggregate([
        {
          $geoNear: {
            near: pointFrom(lat, lng),
            key: 'location',
            distanceField: 'distanceMeters',
            spherical: true,
            maxDistance: radiusKm * 1000,
            query,
          },
        },
        { $sort: { distanceMeters: 1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        {
          $project: {
            _id: 1, name: 1, bloodGroup: 1, city: 1, address: 1, availability: 1,
            location: 1, lastDonationDate: 1, donationCount: 1, badges: 1, bio: 1, distanceMeters: 1,
            online: 1,
          },
        },
      ]).then((rows) =>
        rows.map(({ distanceMeters, ...u }) => ({
          ...u,
          online: isOnline(u._id),
          distanceKm: Math.round((distanceMeters / 1000) * 10) / 10,
        }))
      ),
      User.countDocuments(query),
    ]);

    res.json({ users, total });
  } catch (err) {
    next(err);
  }
});

router.get('/me/stats', requireAuth, async (req, res, next) => {
  try {
    const uid = req.user._id;
    const [accepted, posted, fulfilled] = await Promise.all([
      BloodRequest.countDocuments({ 'responses.donor': uid, 'responses.status': 'accepted' }),
      BloodRequest.countDocuments({ requester: uid }),
      BloodRequest.countDocuments({ requester: uid, status: 'fulfilled' }),
    ]);
    res.json({
      user: req.user.toJSON(),
      responsesGiven: accepted,
      requestsPosted: posted,
      requestsFulfilled: fulfilled,
      livesImpacted: req.user.donationCount * 3,
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const { name, phone, city, address, bloodGroup, bio, lat, lng, availability } = req.body || {};
    const u = req.user;
    if (name) u.name = name;
    if (phone !== undefined) u.phone = phone;
    if (city !== undefined) u.city = city;
    if (address !== undefined) u.address = address;
    if (bio !== undefined) u.bio = bio;
    if (bloodGroup) u.bloodGroup = bloodGroup;
    if (availability !== undefined) u.availability = Boolean(availability);
    if (Number.isFinite(lat) && Number.isFinite(lng)) u.location = pointFrom(lat, lng);
    await u.save();
    emitToMesh('donor:status', { userId: u._id, availability: u.availability });
    res.json({ user: u.toJSON() });
  } catch (err) {
    next(err);
  }
});

router.post('/me/donated', requireAuth, async (req, res, next) => {
  try {
    const u = req.user;
    u.lastDonationDate = new Date();
    u.donationCount += 1;
    const milestones = [1, 5, 10, 25, 50];
    for (const m of milestones) {
      const badge = `${m}-donation-club`;
      if (u.donationCount >= m && !u.badges.includes(badge)) u.badges.push(badge);
    }
    if (['O-', 'AB-'].includes(u.bloodGroup) && !u.badges.includes('rare-guardian')) u.badges.push('rare-guardian');
    await u.save();
    res.json({ user: u.toJSON() });
  } catch (err) {
    next(err);
  }
});

export default router;
