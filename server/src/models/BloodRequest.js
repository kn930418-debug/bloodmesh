import mongoose from 'mongoose';
import { BLOOD_GROUPS } from '../utils/compat.js';

const responseSchema = new mongoose.Schema(
  {
    donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['accepted', 'declined'], required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const requestSchema = new mongoose.Schema(
  {
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    patientNote: { type: String, maxlength: 240, default: '' },
    bloodGroup: { type: String, enum: BLOOD_GROUPS, required: true },
    units: { type: Number, min: 1, max: 10, default: 1 },
    urgency: { type: String, enum: ['normal', 'urgent', 'critical'], default: 'normal' },
    hospital: {
      name: { type: String, required: true, trim: true },
      address: { type: String, default: '' },
      contact: { type: String, default: '' },
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true }, // [lng, lat]
      },
    },
    radiusKm: { type: Number, min: 1, max: 50, default: 10 },
    status: { type: String, enum: ['open', 'acknowledged', 'fulfilled', 'cancelled'], default: 'open' },
    responses: [responseSchema],
    matchedDonorCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

requestSchema.index({ 'hospital.location': '2dsphere' }, { sparse: true });
requestSchema.index({ status: 1, createdAt: -1 });

requestSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('BloodRequest', requestSchema);
