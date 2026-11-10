const express = require('express');
const { uploadImage } = require('../controllers/uploadController');
const { protect, requirePermission } = require('../middleware/authMiddleware');
const { uploadImage: parseImage, validateImageSignature } = require('../middleware/uploadMiddleware');

const router = express.Router();
const permissionByCategory = {
  news: 'news:write',
  events: 'events:write',
  clubs: 'clubs:write',
};

router.post('/image', protect, (req, res, next) => {
  const permission = permissionByCategory[req.query.category];
  if (!permission) return res.status(400).json({ message: 'Choose a supported content category.' });
  return requirePermission(permission)(req, res, next);
}, parseImage.single('image'), validateImageSignature, uploadImage);

module.exports = router;
