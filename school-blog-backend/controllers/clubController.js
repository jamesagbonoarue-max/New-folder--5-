const mongoose = require('mongoose');

const Club = require('../models/Club');
const { clubs, createId } = require('../data/store');

const getAllClubs = async (req, res) => {
  try {
    const filter = req.query.status === 'all' && req.user ? {} : { status: 'active' };
    if (req.user?.role === 'department_admin') filter.department = req.user.department;
    if (mongoose.connection.readyState === 1) {
      const items = await Club.find(filter).sort({ createdAt: -1 });
      return res.json(items);
    }

    return res.json(clubs.filter((club) =>
      (filter.status !== 'active' || club.status === 'active')
      && (req.user?.role !== 'department_admin' || String(club.department) === String(req.user.department))
    ));
  } catch (error) {
    return res.status(500).json({ message: 'Could not fetch clubs.' });
  }
};

const getClubById = async (req, res) => {
  const { id } = req.params;

  try {
    if (mongoose.connection.readyState === 1) {
      const item = await Club.findOne({
        _id: id,
        ...(req.user ? {} : { status: 'active' }),
        ...(req.user?.role === 'department_admin' ? { department: req.user.department } : {}),
      });
      if (!item) return res.status(404).json({ message: 'Club not found.' });
      return res.json(item);
    }

    const item = clubs.find((entry) =>
      entry._id === id
      && (req.user || entry.status === 'active')
      && (req.user?.role !== 'department_admin' || String(entry.department) === String(req.user.department))
    );
    if (!item) return res.status(404).json({ message: 'Club not found.' });
    return res.json(item);
  } catch (error) {
    return res.status(500).json({ message: 'Could not fetch club.' });
  }
};

const createClub = async (req, res) => {
  const payload = req.body;

  if (!payload.name || !payload.description) {
    return res.status(400).json({ message: 'Club name and description are required.' });
  }

  try {
    if (mongoose.connection.readyState === 1) {
      const item = await Club.create({
        ...payload,
      });
      return res.status(201).json(item);
    }

    const newEntry = {
      _id: createId('club'),
      name: payload.name,
      description: payload.description,
      image: payload.image || '',
      category: payload.category || 'School Life',
      status: payload.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    clubs.push(newEntry);
    return res.status(201).json(newEntry);
  } catch (error) {
    return res.status(500).json({ message: 'Could not create club.' });
  }
};

const updateClub = async (req, res) => {
  const { id } = req.params;

  try {
    if (mongoose.connection.readyState === 1) {
      const item = await Club.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
      if (!item) return res.status(404).json({ message: 'Club not found.' });
      return res.json(item);
    }

    const index = clubs.findIndex((entry) => entry._id === id);
    if (index === -1) return res.status(404).json({ message: 'Club not found.' });

    clubs[index] = { ...clubs[index], ...req.body, updatedAt: new Date().toISOString() };
    return res.json(clubs[index]);
  } catch (error) {
    return res.status(500).json({ message: 'Could not update club.' });
  }
};

const deleteClub = async (req, res) => {
  const { id } = req.params;

  try {
    if (mongoose.connection.readyState === 1) {
      const item = await Club.findByIdAndDelete(id);
      if (!item) return res.status(404).json({ message: 'Club not found.' });
      return res.json({ message: 'Club deleted successfully.' });
    }

    const index = clubs.findIndex((entry) => entry._id === id);
    if (index === -1) return res.status(404).json({ message: 'Club not found.' });
    clubs.splice(index, 1);
    return res.json({ message: 'Club deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Could not delete club.' });
  }
};

module.exports = { getAllClubs, getClubById, createClub, updateClub, deleteClub };
