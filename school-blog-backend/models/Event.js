const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    description: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String },
    location: { type: String, required: true },
    image: { type: String },
    imagePublicId: { type: String, default: '' },
    registrationLink: { type: String },
    category: { type: String, default: 'School event' },
    featured: { type: Boolean, default: false },
    status: { type: String, enum: ['upcoming', 'past', 'cancelled'], default: 'upcoming' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Event || mongoose.model('Event', eventSchema);
