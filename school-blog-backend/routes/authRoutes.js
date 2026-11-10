const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  loginAdmin,
  logoutAdmin,
  getAdminProfile,
  changeAdminPassword,
} = require('../controllers/authController');
const {
  requestResetCode,
  verifyResetCode,
  resetPassword,
} = require('../controllers/passwordResetController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again later.' },
});
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many password recovery requests. Please try again later.' },
});
const resendResetCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many verification code requests. Please try again later.' },
});
const verifyResetCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many verification attempts. Please try again later.' },
});

router.post('/login', loginLimiter, loginAdmin);
router.post('/forgot-password', forgotPasswordLimiter, requestResetCode);
router.post('/resend-reset-code', resendResetCodeLimiter, requestResetCode);
router.post('/verify-reset-code', verifyResetCodeLimiter, verifyResetCode);
router.post('/reset-password', resetPassword);
router.post('/logout', protect, logoutAdmin);
router.get('/me', protect, getAdminProfile);
router.patch('/change-password', protect, changeAdminPassword);

module.exports = router;
