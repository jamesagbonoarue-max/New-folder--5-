require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const createSuperAdmin = async () => {
  const resetPassword = process.argv.includes('--reset-password');
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  const { SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, SUPER_ADMIN_USERNAME, SUPER_ADMIN_PASSWORD, JWT_SECRET } = process.env;
  if (!uri || !JWT_SECRET || !SUPER_ADMIN_NAME || !SUPER_ADMIN_EMAIL || !SUPER_ADMIN_USERNAME || !SUPER_ADMIN_PASSWORD) {
    throw new Error('Set MongoDB, JWT_SECRET and all SUPER_ADMIN_* variables before running the setup script.');
  }
  if (SUPER_ADMIN_PASSWORD.length < 12) {
    throw new Error('SUPER_ADMIN_PASSWORD must be at least 12 characters.');
  }

  await mongoose.connect(uri);
  if (resetPassword) {
    const admin = await Admin.findOne({
      $or: [
        { email: SUPER_ADMIN_EMAIL.trim().toLowerCase() },
        { username: SUPER_ADMIN_USERNAME.trim().toLowerCase() },
      ],
    });
    if (!admin || admin.role !== 'super_admin') {
      throw new Error('No matching super administrator was found; run create-super-admin first if needed.');
    }

    admin.password = SUPER_ADMIN_PASSWORD;
    await admin.save();
    console.log('Super administrator password updated.');
    return;
  }

  const existing = await Admin.findOne({
    $or: [{ role: 'super_admin' }, { email: SUPER_ADMIN_EMAIL.toLowerCase() }, { username: SUPER_ADMIN_USERNAME.toLowerCase() }],
  });
  if (existing) throw new Error('A matching administrator already exists; no account was changed.');

  await Admin.create({
    name: SUPER_ADMIN_NAME.trim(),
    email: SUPER_ADMIN_EMAIL.trim().toLowerCase(),
    username: SUPER_ADMIN_USERNAME.trim().toLowerCase(),
    password: SUPER_ADMIN_PASSWORD,
    role: 'super_admin',
    status: 'active',
  });
  console.log('Super administrator created.');
};

createSuperAdmin()
  .catch((error) => {
    console.error('Super administrator setup failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState) await mongoose.disconnect();
  });
