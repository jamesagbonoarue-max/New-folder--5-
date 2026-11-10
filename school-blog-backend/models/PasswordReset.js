const mongoose = require('mongoose');

const passwordResetSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true, unique: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, expires: 0 },
    attempts: { type: Number, default: 0 },
    verifiedAt: { type: Date, default: null },
    resetTokenHash: { type: String, default: null },
    resetTokenExpiresAt: { type: Date, default: null },
    usedAt: { type: Date, default: null },
    lastSentAt: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.PasswordReset || mongoose.model('PasswordReset', passwordResetSchema);
