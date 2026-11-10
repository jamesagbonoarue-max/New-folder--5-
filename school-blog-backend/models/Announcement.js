const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    message: { type: String, required: true },
    status: { type: String, enum: ['draft', 'published'], default: 'published' },
    category: { type: String, default: 'General' },
    priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
    date: { type: Date, default: Date.now },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Announcement || mongoose.model('Announcement', announcementSchema);
