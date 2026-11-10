const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const protect = async (req, res, next) => {
  if (!process.env.JWT_SECRET) {
    return res.status(503).json({ message: 'Authentication is not configured on the server.' });
  }
  const authHeader = req.headers.authorization;
  const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = tokenFromHeader || req.cookies?.token;
  if (!token) return res.status(401).json({ message: 'Not authorized. Please sign in.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.sub);
    if (!admin || admin.status !== 'active' || (decoded.ver ?? 0) !== admin.tokenVersion) {
      return res.status(401).json({ message: 'Administrator account is unavailable.' });
    }
    req.user = admin;
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired or invalid.' });
    }
    console.error('Authentication middleware failed:', error);
    return res.status(500).json({ message: 'Could not verify administrator session.' });
  }
};

const requirePermission = (permission) => (req, res, next) => {
  if (req.user?.role === 'super_admin' || req.user?.permissions?.includes(permission)) return next();
  return res.status(403).json({ message: 'You do not have permission to perform this action.' });
};

const requireContentPermission = (permission, Model) => async (req, res, next) => {
  if (req.user?.role === 'super_admin') return next();
  if (!req.user?.permissions?.includes(permission)) {
    return res.status(403).json({ message: 'You do not have permission to perform this action.' });
  }
  if (req.user.role !== 'department_admin') return next();
  if (!req.user.department) {
    return res.status(403).json({ message: 'A department must be assigned before managing department content.' });
  }
  if (req.method === 'POST') {
    req.body.department = req.user.department;
    return next();
  }

  try {
    const item = await Model.findById(req.params.id).select('department');
    if (!item) return res.status(404).json({ message: 'Content not found.' });
    if (String(item.department) !== String(req.user.department)) {
      return res.status(403).json({ message: 'You cannot manage content outside your department.' });
    }
    if (req.method === 'PUT') req.body.department = req.user.department;
    return next();
  } catch (error) {
    console.error('Department content access check failed:', error);
    return res.status(500).json({ message: 'Could not verify department access.' });
  }
};

const requireSuperAdmin = (req, res, next) => {
  if (req.user?.role === 'super_admin') return next();
  return res.status(403).json({ message: 'Super administrator access is required.' });
};

module.exports = { protect, requirePermission, requireContentPermission, requireSuperAdmin };
