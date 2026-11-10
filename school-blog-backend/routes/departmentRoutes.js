const express = require('express');
const mongoose = require('mongoose');
const Department = require('../models/Department');
const { protect, requireSuperAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect, requireSuperAdmin);

router.get('/', async (req, res) => {
  try {
    return res.json(await Department.find().sort({ name: 1 }));
  } catch (error) {
    console.error('Department listing failed:', error);
    return res.status(500).json({ message: 'Could not load departments.' });
  }
});

router.post('/', async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  if (!name) return res.status(400).json({ message: 'Department name is required.' });
  try {
    const department = await Department.create({ name, description: req.body.description || '' });
    return res.status(201).json(department);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Department already exists.' });
    console.error('Department creation failed:', error);
    return res.status(500).json({ message: 'Could not create department.' });
  }
});

router.patch('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid department ID.' });
  const updates = {};
  if (typeof req.body.name === 'string' && req.body.name.trim()) updates.name = req.body.name.trim();
  if (typeof req.body.description === 'string') updates.description = req.body.description;
  if (['active', 'inactive'].includes(req.body.status)) updates.status = req.body.status;
  try {
    const department = await Department.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!department) return res.status(404).json({ message: 'Department not found.' });
    return res.json(department);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Department already exists.' });
    console.error('Department update failed:', error);
    return res.status(500).json({ message: 'Could not update department.' });
  }
});

module.exports = router;
