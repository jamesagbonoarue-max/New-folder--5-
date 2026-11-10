const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['super_admin', 'admin', 'department_admin'], default: 'admin' },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    permissions: [{ type: String }],
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    tokenVersion: { type: Number, default: 0 },
    lastLogin: { type: Date, default: null },
    avatar: { type: String, default: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=400&q=80' },
  },
  { timestamps: true }
);

adminSchema.pre('save', async function nextHook() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

adminSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);
module.exports = Admin;
