const express = require('express');
const { getAllNews, getFeaturedNews, getNewsById, createNews, updateNews, deleteNews } = require('../controllers/newsController');
const News = require('../models/News');
const { protect, requirePermission, requireContentPermission } = require('../middleware/authMiddleware');
const { logAdminActivity } = require('../middleware/activityLogger');

const router = express.Router();

router.get('/', (req, res, next) => {
  if (req.query.status !== 'all') return next();
  return protect(req, res, () => requirePermission('news:write')(req, res, next));
}, getAllNews);
router.get('/featured', getFeaturedNews);
router.get('/:id', (req, res, next) => {
  if (req.query.preview !== 'true') return next();
  return protect(req, res, () => requirePermission('news:write')(req, res, next));
}, getNewsById);
router.post('/', protect, requireContentPermission('news:write', News), logAdminActivity('news', 'Created news article'), createNews);
router.put('/:id', protect, requireContentPermission('news:write', News), logAdminActivity('news', 'Updated news article'), updateNews);
router.delete('/:id', protect, requireContentPermission('news:delete', News), logAdminActivity('news', 'Deleted news article'), deleteNews);

module.exports = router;
