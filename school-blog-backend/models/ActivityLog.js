const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    action: { type: String, required: true },
    targetType: { type: String, default: '' },
    targetId: { type: String, default: '' },
    details: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.ActivityLog || mongoose.model('ActivityLog', activityLogSchema);
