const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Admin = require('../models/Admin');
const Department = require('../models/Department');
const { sendAdminWelcomeEmail } = require('../services/emailService');

const sanitizeAdmin = (admin) => ({
  id: admin._id.toString(),
  name: admin.name,
  username: admin.username,
  email: admin.email,
  role: admin.role,
  department: admin.department,
  permissions: admin.permissions,
  avatar: admin.avatar,
  lastLogin: admin.lastLogin,
});

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

const loginAdmin = async (req, res) => {
  const identifier = String(req.body.identifier || req.body.email || req.body.username || '').trim().toLowerCase();
  const password = req.body.password;

  if (!identifier || typeof password !== 'string' || !password) {
    return res.status(400).json({ message: 'Username or email and password are required.' });
  }
  if (!process.env.JWT_SECRET) {
    return res.status(503).json({ message: 'Authentication is not configured on the server.' });
  }

  try {
    const admin = await Admin.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });

    if (!admin || admin.status !== 'active' || !(await admin.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials or inactive account.' });
    }

    admin.lastLogin = new Date();
    await admin.save();

    const token = jwt.sign(
      { sub: admin._id.toString(), ver: admin.tokenVersion },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.cookie('token', token, cookieOptions());
    return res.json({ admin: sanitizeAdmin(admin) });
  } catch (error) {
    console.error('[admin-login-failed]', {
      identifier,
      message: error?.message,
      stack: error?.stack,
      body: req.body,
    });
    return res.status(500).json({ message: 'Unable to authenticate at this time.' });
  }
};

const logoutAdmin = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  return res.json({ message: 'Signed out successfully.' });
};

const getAdminProfile = (req, res) => res.json({ admin: sanitizeAdmin(req.user) });

const changeAdminPassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 12) {
    return res.status(400).json({ message: 'Provide your current password and a new password of at least 12 characters.' });
  }

  try {
    if (!(await req.user.comparePassword(currentPassword))) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }
    req.user.password = newPassword;
    await req.user.save();
    return res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Admin password change failed:', error);
    return res.status(500).json({ message: 'Could not change password.' });
  }
};

const createAdmin = async (req, res) => {
  const { name, username, email, department, role = 'admin', permissions = [] } = req.body;
  if (!name || !username || !email) {
    return res.status(400).json({ message: 'Name, username and email are required.' });
  }
  if (!['admin', 'department_admin'].includes(role)) {
    return res.status(400).json({ message: 'Only admin and department_admin roles can be created here.' });
  }
  if (role === 'department_admin' && !department) {
    return res.status(400).json({ message: 'A department is required for department administrators.' });
  }
  if (!Array.isArray(permissions) || permissions.some((permission) => typeof permission !== 'string')) {
    return res.status(400).json({ message: 'Permissions must be a list of strings.' });
  }

  try {
    if (department) {
      const activeDepartment = await Department.exists({ _id: department, status: 'active' });
      if (!activeDepartment) return res.status(400).json({ message: 'Select an active department.' });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedUsername = String(username).trim().toLowerCase();
    const duplicate = await Admin.exists({ $or: [{ email: normalizedEmail }, { username: normalizedUsername }] });
    if (duplicate) return res.status(409).json({ message: 'That username or email is already in use.' });

    const temporaryPassword = crypto.randomBytes(24).toString('base64url');
    const admin = await Admin.create({
      name: String(name).trim(),
      username: normalizedUsername,
      email: normalizedEmail,
      password: temporaryPassword,
      department: department || null,
      role,
      permissions,
    });

    try {
      await sendAdminWelcomeEmail({
        name: admin.name,
        email: admin.email,
        username: admin.username,
        password: temporaryPassword,
      });
    } catch (error) {
      console.error('Administrator created but welcome email delivery failed:', error.message);
      return res.status(502).json({
        message: `Administrator was created, but the welcome email could not be sent: ${error.message}`,
      });
    }

    return res.status(201).json({ admin: sanitizeAdmin(admin) });
  } catch (error) {
    console.error('Admin creation failed:', error);
    return res.status(500).json({ message: 'Could not create administrator.' });
  }
};

const listAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select('-password').sort({ createdAt: -1 });
    return res.json(admins.map(sanitizeAdmin));
  } catch (error) {
    console.error('Admin listing failed:', error);
    return res.status(500).json({ message: 'Could not load administrators.' });
  }
};

const updateAdmin = async (req, res) => {
  const updates = {};
  for (const field of ['name', 'department', 'permissions', 'status']) {
    if (Object.hasOwn(req.body, field)) updates[field] = req.body[field];
  }
  if (Object.hasOwn(req.body, 'role')) {
    if (!['admin', 'department_admin'].includes(req.body.role)) {
      return res.status(400).json({ message: 'Only admin and department_admin roles can be assigned here.' });
    }
    if (updates.permissions && (!Array.isArray(updates.permissions) || updates.permissions.some((permission) => typeof permission !== 'string'))) {
      return res.status(400).json({ message: 'Permissions must be a list of strings.' });
    }
    if (updates.department) {
      if (!await Department.exists({ _id: updates.department, status: 'active' })) {
        return res.status(400).json({ message: 'Select an active department.' });
      }
    }
    updates.role = req.body.role;
  }
  if (updates.status && !['active', 'suspended'].includes(updates.status)) {
    return res.status(400).json({ message: 'Account status must be active or suspended.' });
  }

  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ message: 'Administrator not found.' });
    if ((updates.role || admin.role) === 'department_admin' && !(updates.department || admin.department)) {
      return res.status(400).json({ message: 'Department administrators must be assigned a department.' });
    }
    if (admin.role === 'super_admin' && updates.status === 'suspended') {
      const activeSuperAdmins = await Admin.countDocuments({ role: 'super_admin', status: 'active' });
      if (activeSuperAdmins <= 1) {
        return res.status(409).json({ message: 'The last active super administrator cannot be suspended.' });
      }
    }
    Object.assign(admin, updates);
    await admin.save();
    return res.json({ admin: sanitizeAdmin(admin) });
  } catch (error) {
    console.error('Admin update failed:', error);
    return res.status(500).json({ message: 'Could not update administrator.' });
  }
};

const deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ message: 'Administrator not found.' });
    if (admin.role === 'super_admin') {
      const activeSuperAdmins = await Admin.countDocuments({ role: 'super_admin', status: 'active' });
      if (admin.status === 'active' && activeSuperAdmins <= 1) {
        return res.status(409).json({ message: 'The last active super administrator cannot be deleted.' });
      }
    }
    await admin.deleteOne();
    return res.json({ message: 'Administrator deleted.' });
  } catch (error) {
    console.error('Admin deletion failed:', error);
    return res.status(500).json({ message: 'Could not delete administrator.' });
  }
};

module.exports = {
  loginAdmin,
  logoutAdmin,
  getAdminProfile,
  changeAdminPassword,
  createAdmin,
  listAdmins,
  updateAdmin,
  deleteAdmin,
};
