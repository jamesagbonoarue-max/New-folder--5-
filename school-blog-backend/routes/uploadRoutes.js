const express = require('express');
const rateLimit = require('express-rate-limit');
const { uploadImage } = require('../controllers/uploadController');
const { protect, requirePermission } = require('../middleware/authMiddleware');
const { limitConcurrentUploads } = require('../middleware/uploadConcurrency');
const { uploadImage: parseImage, validateImageSignature } = require('../middleware/uploadMiddleware');

const router = express.Router();
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many image uploads. Please try again later.' },
});
const permissionByCategory = {
  news: 'news:write',
  events: 'events:write',
  clubs: 'clubs:write',
};

router.post('/image', protect, (req, res, next) => {
  const permission = permissionByCategory[req.query.category];
  if (!permission) return res.status(400).json({ message: 'Choose a supported content category.' });
  return requirePermission(permission)(req, res, next);
}, uploadLimiter, limitConcurrentUploads, parseImage.single('image'), validateImageSignature, uploadImage);

module.exports = router;
