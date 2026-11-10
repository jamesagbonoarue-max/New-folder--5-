const mongoose = require('mongoose');

const Announcement = require('../models/Announcement');
const { announcements, createId } = require('../data/store');

const sortAnnouncements = (items) =>
  [...items].sort((a, b) => new Date(b.date) - new Date(a.date));

const getAllAnnouncements = async (req, res) => {
  try {
    const filter = req.query.status === 'all' && req.user
      ? {}
      : { status: 'published' };
    if (req.user?.role === 'department_admin') filter.department = req.user.department;
    if (mongoose.connection.readyState === 1) {
      const items = await Announcement.find(filter).sort({ date: -1 });
      return res.json(items);
    }

    const items = announcements.filter((announcement) =>
      (filter.status !== 'published' || announcement.status === 'published')
      && (req.user?.role !== 'department_admin' || String(announcement.department) === String(req.user.department))
    );
    return res.json(sortAnnouncements(items));
  } catch (error) {
    return res.status(500).json({ message: 'Could not fetch announcements.' });
  }
};

const getAnnouncementById = async (req, res) => {
  const { id } = req.params;

  try {
    if (mongoose.connection.readyState === 1) {
      const item = await Announcement.findOne({
        _id: id,
        ...(req.user ? {} : { status: 'published' }),
        ...(req.user?.role === 'department_admin' ? { department: req.user.department } : {}),
      });
      if (!item) return res.status(404).json({ message: 'Announcement not found.' });
      return res.json(item);
    }

    const item = announcements.find((entry) =>
      entry._id === id
      && (req.user || entry.status === 'published')
      && (req.user?.role !== 'department_admin' || String(entry.department) === String(req.user.department))
    );
    if (!item) return res.status(404).json({ message: 'Announcement not found.' });
    return res.json(item);
  } catch (error) {
    return res.status(500).json({ message: 'Could not fetch announcement details.' });
  }
};

const createAnnouncement = async (req, res) => {
  const payload = req.body;

  if (!payload.title || !payload.message) {
    return res.status(400).json({ message: 'Title and message are required.' });
  }

  try {
    if (mongoose.connection.readyState === 1) {
      const item = await Announcement.create({
        ...payload,
        date: payload.date || new Date(),
      });
      return res.status(201).json(item);
    }

    const newEntry = {
      _id: createId('announcement'),
      title: payload.title,
      message: payload.message,
      date: payload.date || new Date().toISOString(),
      status: payload.status || 'published',
      featured: Boolean(payload.featured),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    announcements.push(newEntry);
    return res.status(201).json(newEntry);
  } catch (error) {
    return res.status(500).json({ message: 'Could not create announcement.' });
  }
};

const updateAnnouncement = async (req, res) => {
  const { id } = req.params;

  try {
    if (mongoose.connection.readyState === 1) {
      const item = await Announcement.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
      if (!item) return res.status(404).json({ message: 'Announcement not found.' });
      return res.json(item);
    }

    const index = announcements.findIndex((entry) => entry._id === id);
    if (index === -1) return res.status(404).json({ message: 'Announcement not found.' });

    announcements[index] = { ...announcements[index], ...req.body, updatedAt: new Date().toISOString() };
    return res.json(announcements[index]);
  } catch (error) {
    return res.status(500).json({ message: 'Could not update announcement.' });
  }
};

const deleteAnnouncement = async (req, res) => {
  const { id } = req.params;

  try {
    if (mongoose.connection.readyState === 1) {
      const item = await Announcement.findByIdAndDelete(id);
      if (!item) return res.status(404).json({ message: 'Announcement not found.' });
      return res.json({ message: 'Announcement deleted successfully.' });
    }

    const index = announcements.findIndex((entry) => entry._id === id);
    if (index === -1) return res.status(404).json({ message: 'Announcement not found.' });
    announcements.splice(index, 1);
    return res.json({ message: 'Announcement deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Could not delete announcement.' });
  }
};

module.exports = {
  getAllAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
};
