const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const PasswordReset = require('../models/PasswordReset');
const ActivityLog = require('../models/ActivityLog');
const { sendPasswordResetEmail, isEmailConfigured } = require('../services/emailService');

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;
const accountRoles = ['admin', 'department_admin', 'super_admin'];
const genericRequestMessage = 'If an active administrator account matches that email, a verification code will be sent.';

const isValidResetPassword = (password) =>
  typeof password === 'string' &&
  password.length >= 8 &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /\d/.test(password) &&
  /[^A-Za-z0-9\s]/.test(password);

const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const generateVerificationCode = () => crypto.randomInt(0, 1000000).toString().padStart(6, '0');

const requestResetCode = async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Enter a valid email address.' });
  }

  try {
    if (!isEmailConfigured()) {
      return res.status(503).json({ message: 'Password recovery is temporarily unavailable. Please try again later.' });
    }

    const admin = await Admin.findOne({ email, status: 'active', role: { $in: accountRoles } });
    if (!admin) return res.json({ message: genericRequestMessage });

    const now = new Date();
    const existingReset = await PasswordReset.findOne({ admin: admin._id });
    if (existingReset && now - existingReset.lastSentAt < RESEND_COOLDOWN_MS) {
      return res.json({ message: genericRequestMessage });
    }

    const code = generateVerificationCode();
    const codeHash = await bcrypt.hash(code, 10);
    const reset = await PasswordReset.findOneAndUpdate(
      { admin: admin._id },
      {
        $set: {
          codeHash,
          expiresAt: new Date(now.getTime() + CODE_TTL_MS),
          attempts: 0,
          verifiedAt: null,
          resetTokenHash: null,
          resetTokenExpiresAt: null,
          usedAt: null,
          lastSentAt: now,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    try {
      await sendPasswordResetEmail(admin.email, code);
    } catch (error) {
      await PasswordReset.deleteOne({ _id: reset._id, codeHash });
      console.error('Password recovery email delivery failed:', error.message);
      return res.status(503).json({ message: 'Password recovery is temporarily unavailable. Please try again later.' });
    }

    return res.json({ message: genericRequestMessage });
  } catch (error) {
    console.error('Password recovery request failed:', error.message);
    return res.status(500).json({ message: 'Could not process the password recovery request.' });
  }
};

const verifyResetCode = async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const code = req.body.code;
  if (!email || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ message: 'Enter the email address and six-digit verification code.' });
  }

  try {
    const admin = await Admin.findOne({ email, status: 'active', role: { $in: accountRoles } });
    if (!admin) return res.status(400).json({ message: 'The verification code is invalid or expired.' });

    const now = new Date();
    const reset = await PasswordReset.findOneAndUpdate(
      {
        admin: admin._id,
        expiresAt: { $gt: now },
        verifiedAt: null,
        usedAt: null,
        attempts: { $lt: MAX_CODE_ATTEMPTS },
      },
      { $inc: { attempts: 1 } },
      { new: true }
    );
    if (!reset || !(await bcrypt.compare(code, reset.codeHash))) {
      return res.status(400).json({ message: 'The verification code is invalid or expired.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const verification = await PasswordReset.updateOne(
      {
        _id: reset._id,
        codeHash: reset.codeHash,
        verifiedAt: null,
        usedAt: null,
        expiresAt: { $gt: now },
      },
      {
        $set: {
          verifiedAt: now,
          resetTokenHash: hashResetToken(resetToken),
          resetTokenExpiresAt: new Date(now.getTime() + CODE_TTL_MS),
          expiresAt: new Date(now.getTime() + CODE_TTL_MS),
        },
      }
    );
    if (!verification.modifiedCount) {
      return res.status(400).json({ message: 'The verification code is invalid or expired.' });
    }

    return res.json({ resetToken });
  } catch (error) {
    console.error('Password recovery code verification failed:', error.message);
    return res.status(500).json({ message: 'Could not verify the password recovery code.' });
  }
};

const resetPassword = async (req, res) => {
  const { resetToken, newPassword } = req.body;
  if (typeof resetToken !== 'string' || resetToken.length !== 64 || !isValidResetPassword(newPassword)) {
    return res.status(400).json({
      message: 'Use a password with at least eight characters, including uppercase, lowercase, a number, and a special character.',
    });
  }

  try {
    const now = new Date();
    const reset = await PasswordReset.findOneAndUpdate(
      {
        resetTokenHash: hashResetToken(resetToken),
        resetTokenExpiresAt: { $gt: now },
        verifiedAt: { $ne: null },
        usedAt: null,
      },
      { $set: { usedAt: now } },
      { new: true }
    );
    if (!reset) {
      return res.status(400).json({ message: 'The password reset session is invalid or expired. Request a new code.' });
    }

    const admin = await Admin.findOne({ _id: reset.admin, status: 'active', role: { $in: accountRoles } });
    if (!admin) {
      return res.status(400).json({ message: 'The password reset session is invalid or expired. Request a new code.' });
    }

    admin.password = newPassword;
    admin.tokenVersion = (admin.tokenVersion || 0) + 1;
    await admin.save();

    await PasswordReset.deleteMany({ admin: admin._id });
    await ActivityLog.create({
      admin: admin._id,
      action: 'Reset administrator password',
      targetType: 'administrator',
      targetId: admin._id.toString(),
      details: 'Password reset completed after email verification.',
    });

    return res.json({ message: 'Password reset successfully. Sign in with your new password.' });
  } catch (error) {
    console.error('Administrator password reset failed:', error.message);
    return res.status(500).json({ message: 'Could not reset the password. Please start the recovery process again.' });
  }
};

module.exports = {
  requestResetCode,
  verifyResetCode,
  resetPassword,
  isValidResetPassword,
  hashResetToken,
  generateVerificationCode,
};
