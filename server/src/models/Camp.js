import mongoose from 'mongoose';
import { BLOOD_GROUPS } from '../utils/compat.js';

const campSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    organizer: { type: String, required: true, trim: true },
    venue: { type: String, required: true, trim: true },
    city: { type: String, default: '' },
    date: { type: Date, required: true },
    time: { type: String, default: '09:00' },
    bloodGroups: [{ type: String, enum: BLOOD_GROUPS }],
    slots: { type: Number, default: 50 },
    joined: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Camp', campSchema);
