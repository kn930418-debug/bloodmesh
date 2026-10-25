import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../db.js';
import User, { pointFrom } from '../models/User.js';
import BloodRequest from '../models/BloodRequest.js';
import Notification from '../models/Notification.js';
import Camp from '../models/Camp.js';
import { BLOOD_GROUPS } from '../utils/compat.js';

const ANCHORS = [
  { area: 'Koramangala', lat: 12.9352, lng: 77.6245 },
  { area: 'Indiranagar', lat: 12.9784, lng: 77.6408 },
  { area: 'HSR Layout', lat: 12.9121, lng: 77.6451 },
  { area: 'Whitefield', lat: 12.9698, lng: 77.75 },
  { area: 'Jayanagar', lat: 12.9299, lng: 77.5826 },
  { area: 'Malleshwaram', lat: 13.0037, lng: 77.5717 },
  { area: 'Electronic City', lat: 12.8452, lng: 77.6602 },
  { area: 'Hebbal', lat: 13.0369, lng: 77.5976 },
];

const FIRST = ['Aarav', 'Diya', 'Rohan', 'Ananya', 'Karthik', 'Meera', 'Siddharth', 'Ishita', 'Arjun', 'Nisha', 'Varun', 'Tara', 'Aditya', 'Kavya', 'Rahul', 'Sneha', 'Nikhil', 'Priya', 'Manav', 'Zoya', 'Cyrus', 'Fatima', 'Gowri', 'Harsha', 'Lakshmi', 'Omar', 'Ritika', 'Sameer'];
const LAST = ['Mehta', 'Sharma', 'Iyer', 'Reddy', 'Khan', 'Nair', 'Gupta', 'Joshi', 'Rao', 'Menon', 'Bhat', 'Verma', 'Pillai', 'Das', 'Sethi'];

const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];
const jitter = (v, km = 3) => v + (Math.random() - 0.5) * (km / 111);

// weighted so rare groups exist but aren't dominant
const GROUP_WEIGHTS = ['O+', 'O+', 'O+', 'A+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'];

async function run() {
  await connectDB();
  await Promise.all([User.init(), BloodRequest.init(), Camp.init()]);
  await Promise.all([
    User.deleteMany({}),
    BloodRequest.deleteMany({}),
    Notification.deleteMany({}),
    Camp.deleteMany({}),
  ]);

  const hash = await bcrypt.hash('demo1234', 10);
  const now = Date.now();
  const users = [];

  users.push({
    name: 'Aarav Mehta', email: 'demo@bloodmesh.app', phone: '+91 98100 11223', passwordHash: hash,
    bloodGroup: 'B+', city: 'Bengaluru', address: '80 Ft Rd, Koramangala',
    location: pointFrom(12.9352, 77.6245), availability: true,
    lastDonationDate: new Date(now - 120 * 864e5), donationCount: 2, badges: ['1-donation-club'],
  });

  users.push({
    name: 'Diya Sharma', email: 'donor@bloodmesh.app', phone: '+91 99001 23456', passwordHash: hash,
    bloodGroup: 'O-', city: 'Bengaluru', address: '100 Ft Rd, Indiranagar',
    location: pointFrom(12.966, 77.638), availability: true,
    lastDonationDate: new Date(now - 200 * 864e5), donationCount: 6, badges: ['1-donation-club', '5-donation-club', 'rare-guardian'],
    bio: 'Universal donor. If the mesh pings, I answer.',
  });

  for (let i = 0; i < 48; i++) {
    const anchor = ANCHORS[i % ANCHORS.length];
    const donated = Math.random() < 0.25;
    users.push({
      name: `${pick(FIRST)} ${pick(LAST)}`,
      email: `donor${String(i + 1).padStart(2, '0')}@mesh.blood`,
      phone: `+91 9${rand(9)}${String(10000000 + rand(89999999))}`,
      passwordHash: hash,
      bloodGroup: pick(GROUP_WEIGHTS),
      city: 'Bengaluru',
      address: anchor.area,
      location: pointFrom(jitter(anchor.lat, 4), jitter(anchor.lng, 4)),
      availability: Math.random() < 0.72,
      lastDonationDate: donated ? new Date(now - rand(160) * 864e5) : null,
      donationCount: donated ? 1 + rand(9) : 0,
      badges: [],
    });
  }
  const created = await User.insertMany(users);

  const byEmail = Object.fromEntries(created.map((u) => [u.email, u]));
  const aarav = byEmail['demo@bloodmesh.app'];
  const diya = byEmail['donor@bloodmesh.app'];

  const hospitals = [
    { name: 'Manipal Hospital', address: 'Old Airport Rd, Hal ASR Thown', lat: 12.9569, lng: 77.6512 },
    { name: 'Victoria Hospital', address: 'Palace Rd, Kalasipalem', lat: 12.9674, lng: 77.6078 },
    { name: 'Fortis Hospital', address: 'Bannerghatta Rd, BTM Layout', lat: 12.9145, lng: 77.5948 },
  ];

  await BloodRequest.create([
    {
      requester: aarav._id, patientNote: 'My father is scheduled for cardiac surgery Saturday morning.',
      bloodGroup: 'O-', units: 2, urgency: 'critical', radiusKm: 12,
      hospital: { name: hospitals[0].name, address: hospitals[0].address, contact: '+91 80 2502 4444', location: pointFrom(hospitals[0].lat, hospitals[0].lng) },
      status: 'open', matchedDonorCount: 14,
    },
    {
      requester: created[5]._id, patientNote: 'Accident at Silk Board — ER needs plasma-grade donors.',
      bloodGroup: 'AB+', units: 1, urgency: 'urgent', radiusKm: 8,
      hospital: { name: hospitals[1].name, address: hospitals[1].address, contact: '+91 80 3312 2222', location: pointFrom(hospitals[1].lat, hospitals[1].lng) },
      status: 'acknowledged', matchedDonorCount: 6,
      responses: [{ donor: diya._id, status: 'accepted' }],
    },
    {
      requester: created[9]._id, patientNote: 'Thalassemia patient — recurring monthly need.',
      bloodGroup: 'B-', units: 1, urgency: 'normal', radiusKm: 15,
      hospital: { name: hospitals[2].name, address: hospitals[2].address, contact: '+91 80 6185 3000', location: pointFrom(hospitals[2].lat, hospitals[2].lng) },
      status: 'open', matchedDonorCount: 9,
    },
  ]);

  const in7 = new Date(now + 7 * 864e5);
  const in14 = new Date(now + 14 * 864e5);
  await Camp.create([
    {
      title: 'Mesh Mela — Mega Donation Drive', organizer: 'BloodMesh Foundation', venue: 'Community Hall, Koramangala 5th Block',
      city: 'Bengaluru', date: in7, time: '09:00', bloodGroups: BLOOD_GROUPS, slots: 120, joined: 43, createdBy: aarav._id,
    },
    {
      title: 'Rare Type Meetup (O- / AB-)', organizer: 'City Blood Bank', venue: 'Town Hall, Malleshwaram',
      city: 'Bengaluru', date: in14, time: '10:30', bloodGroups: ['O-', 'AB-', 'A-', 'B-'], slots: 60, joined: 18, createdBy: diya._id,
    },
  ]);

  await Notification.create([
    { user: aarav._id, type: 'system', title: 'Welcome to BloodMesh', body: 'You are live on the donor network. Keep availability ON to receive SOS pings.' },
    { user: diya._id, type: 'sos', title: 'SOS: O- needed at Manipal Hospital', body: '2 unit(s) • CRITICAL • within 12 km of you', link: '/requests' },
  ]);

  console.log('\n🩸 BloodMesh seeded.');
  console.log('   Requester login: demo@bloodmesh.app  /  demo1234');
  console.log('   Donor login:     donor@bloodmesh.app /  demo1234');
  console.log(`   ${created.length} donors • 3 live SOS requests • 2 camps\n`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
