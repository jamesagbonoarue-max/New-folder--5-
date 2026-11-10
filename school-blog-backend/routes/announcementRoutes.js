const express = require('express');
const { getAllAnnouncements, getAnnouncementById, createAnnouncement, updateAnnouncement, deleteAnnouncement } = require('../controllers/announcementController');
const Announcement = require('../models/Announcement');
const { protect, requirePermission, requireContentPermission } = require('../middleware/authMiddleware');
const { logAdminActivity } = require('../middleware/activityLogger');

const router = express.Router();

router.get('/', (req, res, next) => {
  if (req.query.status !== 'all') return next();
  return protect(req, res, () => requirePermission('announcements:write')(req, res, next));
}, getAllAnnouncements);
router.get('/:id', getAnnouncementById);
router.post('/', protect, requireContentPermission('announcements:write', Announcement), logAdminActivity('announcements', 'Created announcement'), createAnnouncement);
router.put('/:id', protect, requireContentPermission('announcements:write', Announcement), logAdminActivity('announcements', 'Updated announcement'), updateAnnouncement);
router.delete('/:id', protect, requireContentPermission('announcements:delete', Announcement), logAdminActivity('announcements', 'Deleted announcement'), deleteAnnouncement);

module.exports = router;
