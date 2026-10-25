import { Router } from 'express';
import User, { pointFrom } from '../models/User.js';
import BloodRequest from '../models/BloodRequest.js';
import Notification from '../models/Notification.js';
import { requireAuth } from '../middleware/auth.js';
import { emitToUser, emitToMesh, getIo } from '../sockets.js';
import { donorsFor } from '../utils/compat.js';

const router = Router();

function sanitizeRequest(doc) {
  const r = doc.toJSON ? doc.toJSON() : doc;
  return r;
}

// Requests near a point (live SOS board).
router.get('/nearby', requireAuth, async (req, res, next) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ message: 'lat and lng query params are required' });
    }
    const radiusKm = Math.min(Math.max(Number(req.query.radiusKm) || 30, 1), 100);
    const query = { status: { $in: ['open', 'acknowledged'] } };
    if (req.query.bloodGroup) query.bloodGroup = String(req.query.bloodGroup);
    if (req.query.urgency) query.urgency = String(req.query.urgency);

    const requests = await BloodRequest.aggregate([
      {
        $geoNear: {
          near: pointFrom(lat, lng),
          key: 'hospital.location',
          distanceField: 'distanceMeters',
          spherical: true,
          maxDistance: radiusKm * 1000,
          query,
        },
      },
      { $sort: { distanceMeters: 1 } },
      { $limit: Math.min(Number(req.query.limit) || 50, 100) },
      { $lookup: { from: 'users', localField: 'requester', foreignField: '_id', as: 'requester' } },
      { $unwind: '$requester' },
      {
        $project: {
          patientNote: 1, bloodGroup: 1, units: 1, urgency: 1, status: 1, radiusKm: 1,
          hospital: 1, responses: 1, matchedDonorCount: 1, createdAt: 1, distanceMeters: 1,
          'requester._id': 1, 'requester.name': 1, 'requester.bloodGroup': 1, 'requester.phone': 1,
        },
      },
    ]);

    res.json({
      requests: requests.map((r) => ({
        ...r,
        distanceKm: Math.round((r.distanceMeters / 1000) * 10) / 10,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const uid = req.user._id;
    const [posted, responded] = await Promise.all([
      BloodRequest.find({ requester: uid }).sort({ createdAt: -1 }).limit(50),
      BloodRequest.find({ 'responses.donor': uid }).sort({ createdAt: -1 }).limit(50).populate('requester', 'name phone bloodGroup'),
    ]);
    res.json({ posted: posted.map(sanitizeRequest), responded: responded.map(sanitizeRequest) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const request = await BloodRequest.findById(req.params.id)
      .populate('requester', 'name phone bloodGroup email city')
      .populate({ path: 'responses.donor', select: 'name bloodGroup phone city availability' });
    if (!request) return res.status(404).json({ message: 'Request not found' });
    res.json({ request: sanitizeRequest(request) });
  } catch (err) {
    next(err);
  }
});

// Fire an SOS — broadcasts to every compatible, available donor inside the radius.
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { bloodGroup, units, urgency, radiusKm, hospital, patientNote } = req.body || {};
    if (!bloodGroup || !hospital?.name) return res.status(400).json({ message: 'Blood group and hospital name are required' });
    const lat = Number(hospital.lat ?? hospital.location?.coordinates?.[1]);
    const lng = Number(hospital.lng ?? hospital.location?.coordinates?.[0]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ message: 'Hospital location (lat/lng) is required' });
    }
    const radius = Math.min(Math.max(Number(radiusKm) || 10, 1), 50);

    const request = await BloodRequest.create({
      requester: req.user._id,
      patientNote: patientNote || '',
      bloodGroup,
      units: Math.min(Math.max(Number(units) || 1, 1), 10),
      urgency: ['normal', 'urgent', 'critical'].includes(urgency) ? urgency : 'normal',
      radiusKm: radius,
      hospital: {
        name: hospital.name,
        address: hospital.address || '',
        contact: hospital.contact || req.user.phone || '',
        location: pointFrom(lat, lng),
      },
    });

    const matched = await User.aggregate([
      {
        $geoNear: {
          near: pointFrom(lat, lng),
          key: 'location',
          distanceField: 'distanceMeters',
          spherical: true,
          maxDistance: radius * 1000,
          query: { availability: true, bloodGroup: { $in: donorsFor(bloodGroup) }, _id: { $ne: req.user._id } },
        },
      },
      { $limit: 300 },
      { $project: { _id: 1, name: 1, bloodGroup: 1, distanceMeters: 1 } },
    ]);

    request.matchedDonorCount = matched.length;
    await request.save();

    if (matched.length) {
      const io = getIo();
      await Notification.insertMany(
        matched.map((d) => ({
          user: d._id,
          type: 'sos',
          title: `SOS: ${request.bloodGroup} needed at ${request.hospital.name}`,
          body: `${request.units} unit(s) • ${request.urgency.toUpperCase()} • within ${radius} km of you`,
          link: `/requests/${request._id}`,
          meta: { requestId: String(request._id) },
        }))
      );
      for (const d of matched) emitToUser(d._id, 'notification:new', { requestId: String(request._id) });
    }

    emitToMesh('request:new', sanitizeRequest(request));
    res.status(201).json({ request: sanitizeRequest(request), matchedDonors: matched.length });
  } catch (err) {
    next(err);
  }
});

// Donor accepts or declines an SOS.
router.post('/:id/respond', requireAuth, async (req, res, next) => {
  try {
    const { answer } = req.body || {};
    if (!['accept', 'decline'].includes(answer)) return res.status(400).json({ message: "answer must be 'accept' or 'decline'" });
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (String(request.requester) === String(req.user._id)) return res.status(400).json({ message: 'You cannot respond to your own request' });
    if (!['open', 'acknowledged'].includes(request.status)) return res.status(410).json({ message: 'This request is no longer active' });

    const donorId = String(req.user._id);
    request.responses = request.responses.filter((r) => String(r.donor) !== donorId);
    request.responses.push({ donor: req.user._id, status: answer === 'accept' ? 'accepted' : 'declined' });
    if (answer === 'accept' && request.status === 'open') request.status = 'acknowledged';
    await request.save();

    const donorPublic = { _id: req.user._id, name: req.user.name, bloodGroup: req.user.bloodGroup, phone: req.user.phone };
    emitToUser(request.requester, 'request:response', { requestId: String(request._id), answer, donor: donorPublic });
    await Notification.create({
      user: request.requester,
      type: 'response',
      title: answer === 'accept' ? `${req.user.name} pledged a donation` : `${req.user.name} declined the SOS`,
      body: answer === 'accept' ? `They will head to ${request.hospital.name}. Contact: ${req.user.phone || 'via app'}` : 'Look for another donor in the mesh.',
      link: `/requests/${request._id}`,
      meta: { requestId: String(request._id), donorId },
    });

    res.json({ request: sanitizeRequest(request) });
  } catch (err) {
    next(err);
  }
});

// Requester closes the loop.
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (String(request.requester) !== String(req.user._id)) return res.status(403).json({ message: 'Only the requester can update this' });
    const { status } = req.body || {};
    if (!['fulfilled', 'cancelled', 'open'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
    request.status = status;
    await request.save();

    const message = status === 'fulfilled' ? 'Blood arranged — thank you, heroes!' : 'Request closed by the requester.';
    for (const r of request.responses.filter((x) => x.status === 'accepted')) {
      emitToUser(r.donor, 'request:status', { requestId: String(request._id), status });
      await Notification.create({
        user: r.donor,
        type: 'status',
        title: `SOS update: ${request.hospital.name}`,
        body: message,
        link: `/requests/${request._id}`,
        meta: { requestId: String(request._id) },
      });
    }
    emitToMesh('request:status', { requestId: String(request._id), status });
    res.json({ request: sanitizeRequest(request) });
  } catch (err) {
    next(err);
  }
});

export default router;
