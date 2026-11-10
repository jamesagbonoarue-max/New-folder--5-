const ActivityLog = require('../models/ActivityLog');

const logAdminActivity = (targetType, action) => (req, res, next) => {
  res.once('finish', () => {
    if (res.statusCode < 200 || res.statusCode >= 300 || !req.user?._id) return;

    ActivityLog.create({
      admin: req.user._id,
      action,
      targetType,
      targetId: req.params.id || '',
      details: `${req.method} ${req.originalUrl}`,
    }).catch((error) => {
      console.error('Could not write administrator activity log:', error);
    });
  });
  return next();
};

module.exports = { logAdminActivity };
