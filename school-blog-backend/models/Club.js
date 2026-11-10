const mongoose = require('mongoose');

const clubSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    description: { type: String, required: true },
    image: { type: String },
    imagePublicId: { type: String, default: '' },
    category: { type: String, default: 'School Life' },
    coordinator: { type: String, default: '' },
    activities: [{ type: String }],
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Club || mongoose.model('Club', clubSchema);
