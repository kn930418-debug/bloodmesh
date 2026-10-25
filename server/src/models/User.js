import mongoose from 'mongoose';
import { BLOOD_GROUPS } from '../utils/compat.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: '' },
    passwordHash: { type: String, required: true },
    bloodGroup: { type: String, enum: BLOOD_GROUPS, required: true },
    city: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    availability: { type: Boolean, default: true },
    lastDonationDate: { type: Date, default: null },
    donationCount: { type: Number, default: 0 },
    badges: [{ type: String }],
    bio: { type: String, maxlength: 240, default: '' },
  },
  { timestamps: true }
);

userSchema.index({ location: '2dsphere' }, { sparse: true });
userSchema.index({ bloodGroup: 1, availability: 1 });

userSchema.virtual('lng').get(function () {
  return this.location?.coordinates?.[0];
});
userSchema.virtual('lat').get(function () {
  return this.location?.coordinates?.[1];
});

userSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

export function pointFrom(lat, lng) {
  return { type: 'Point', coordinates: [Number(lng), Number(lat)] };
}

export default mongoose.model('User', userSchema);
