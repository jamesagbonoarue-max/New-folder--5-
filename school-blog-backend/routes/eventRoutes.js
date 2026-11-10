const express = require('express');
const { getAllEvents, getEventById, createEvent, updateEvent, deleteEvent } = require('../controllers/eventController');
const Event = require('../models/Event');
const { protect, requirePermission, requireContentPermission } = require('../middleware/authMiddleware');
const { logAdminActivity } = require('../middleware/activityLogger');

const router = express.Router();

router.get('/', (req, res, next) => {
  if (req.query.status !== 'all') return next();
  return protect(req, res, () => requirePermission('events:write')(req, res, next));
}, getAllEvents);
router.get('/:id', getEventById);
router.post('/', protect, requireContentPermission('events:write', Event), logAdminActivity('events', 'Created event'), createEvent);
router.put('/:id', protect, requireContentPermission('events:write', Event), logAdminActivity('events', 'Updated event'), updateEvent);
router.delete('/:id', protect, requireContentPermission('events:delete', Event), logAdminActivity('events', 'Deleted event'), deleteEvent);

module.exports = router;
