const express = require('express');
const {
  createAdmin,
  listAdmins,
  updateAdmin,
  deleteAdmin,
} = require('../controllers/authController');
const { getDashboardStats } = require('../controllers/adminController');
const { protect, requireSuperAdmin } = require('../middleware/authMiddleware');
const { logAdminActivity } = require('../middleware/activityLogger');

const router = express.Router();

router.get('/dashboard', protect, getDashboardStats);
router.use(protect, requireSuperAdmin);
router.get('/', listAdmins);
router.post('/', logAdminActivity('administrators', 'Created administrator'), createAdmin);
router.patch('/:id', logAdminActivity('administrators', 'Updated administrator'), updateAdmin);
router.delete('/:id', logAdminActivity('administrators', 'Deleted administrator'), deleteAdmin);

module.exports = router;
