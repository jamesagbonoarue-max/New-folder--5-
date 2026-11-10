const News = require('../models/News');
const Event = require('../models/Event');
const Club = require('../models/Club');
const Announcement = require('../models/Announcement');
const Admin = require('../models/Admin');
const ActivityLog = require('../models/ActivityLog');

const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const isDepartmentAdmin = req.user.role === 'department_admin';
    const departmentFilter = isDepartmentAdmin ? { department: req.user.department } : {};
    const activityFilter = isDepartmentAdmin ? { admin: req.user._id } : {};
    const [totalNews, publishedNews, draftNews, upcomingEvents, publishedAnnouncements, totalClubs, totalAdmins, recentActivity] = await Promise.all([
      News.countDocuments(departmentFilter),
      News.countDocuments({ ...departmentFilter, status: 'published' }),
      News.countDocuments({ ...departmentFilter, status: 'draft' }),
      Event.countDocuments({ ...departmentFilter, date: { $gte: now.toISOString().slice(0, 10) }, status: { $ne: 'cancelled' } }),
      Announcement.countDocuments({ ...departmentFilter, status: 'published' }),
      Club.countDocuments({ ...departmentFilter, status: 'active' }),
      Admin.countDocuments({ ...departmentFilter, status: 'active' }),
      ActivityLog.find(activityFilter).sort({ createdAt: -1 }).limit(8).populate('admin', 'name').lean(),
    ]);

    return res.json({
      totalNews,
      publishedNews,
      draftNews,
      upcomingEvents,
      publishedAnnouncements,
      totalClubs,
      totalAdmins,
      recentActivity,
    });
  } catch (error) {
    console.error('Dashboard stats failed:', error);
    return res.status(500).json({ message: 'Could not load dashboard statistics.' });
  }
};

module.exports = { getDashboardStats };
