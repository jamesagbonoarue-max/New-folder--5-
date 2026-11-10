const express = require('express');
const { getAllClubs, getClubById, createClub, updateClub, deleteClub } = require('../controllers/clubController');
const Club = require('../models/Club');
const { protect, requirePermission, requireContentPermission } = require('../middleware/authMiddleware');
const { logAdminActivity } = require('../middleware/activityLogger');

const router = express.Router();

router.get('/', (req, res, next) => {
  if (req.query.status !== 'all') return next();
  return protect(req, res, () => requirePermission('clubs:write')(req, res, next));
}, getAllClubs);
router.get('/:id', getClubById);
router.post('/', protect, requireContentPermission('clubs:write', Club), logAdminActivity('clubs', 'Created club'), createClub);
router.put('/:id', protect, requireContentPermission('clubs:write', Club), logAdminActivity('clubs', 'Updated club'), updateClub);
router.delete('/:id', protect, requireContentPermission('clubs:delete', Club), logAdminActivity('clubs', 'Deleted club'), deleteClub);

module.exports = router;
