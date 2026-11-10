const mongoose = require('mongoose');

const Event = require('../models/Event');
const { events, createId } = require('../data/store');

const sortEvents = (items) =>
  [...items].sort((a, b) => new Date(a.date) - new Date(b.date));

const getAllEvents = async (req, res) => {
  try {
    const filter = req.query.status === 'all' && req.user
      ? {}
      : { status: { $ne: 'cancelled' } };
    if (req.user?.role === 'department_admin') filter.department = req.user.department;
    if (mongoose.connection.readyState === 1) {
      const items = await Event.find(filter).sort({ date: 1 });
      return res.json(items);
    }

    const items = events.filter((event) =>
      (filter.status?.$ne !== 'cancelled' || event.status !== 'cancelled')
      && (req.user?.role !== 'department_admin' || String(event.department) === String(req.user.department))
    );
    return res.json(sortEvents(items));
  } catch (error) {
    return res.status(500).json({ message: 'Could not fetch events.' });
  }
};

const getEventById = async (req, res) => {
  const { id } = req.params;

  try {
    if (mongoose.connection.readyState === 1) {
      const item = await Event.findOne({
        _id: id,
        ...(req.user ? {} : { status: { $ne: 'cancelled' } }),
        ...(req.user?.role === 'department_admin' ? { department: req.user.department } : {}),
      });
      if (!item) return res.status(404).json({ message: 'Event not found.' });
      return res.json(item);
    }

    const item = events.find((entry) =>
      entry._id === id
      && (req.user || entry.status !== 'cancelled')
      && (req.user?.role !== 'department_admin' || String(entry.department) === String(req.user.department))
    );
    if (!item) return res.status(404).json({ message: 'Event not found.' });
    return res.json(item);
  } catch (error) {
    return res.status(500).json({ message: 'Could not fetch event.' });
  }
};

const createEvent = async (req, res) => {
  const payload = req.body;

  if (!payload.title || !payload.description || !payload.date || !payload.location) {
    return res.status(400).json({ message: 'Title, description, date and location are required.' });
  }

  try {
    if (mongoose.connection.readyState === 1) {
      const item = await Event.create({
        ...payload,
        status: payload.status || 'upcoming',
      });
      return res.status(201).json(item);
    }

    const newEntry = {
      _id: createId('event'),
      title: payload.title,
      description: payload.description,
      date: payload.date,
      time: payload.time || '',
      location: payload.location,
      image: payload.image || '',
      registrationLink: payload.registrationLink || '',
      featured: Boolean(payload.featured),
      status: payload.status || 'upcoming',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    events.push(newEntry);
    return res.status(201).json(newEntry);
  } catch (error) {
    return res.status(500).json({ message: 'Could not create event.' });
  }
};

const updateEvent = async (req, res) => {
  const { id } = req.params;

  try {
    if (mongoose.connection.readyState === 1) {
      const item = await Event.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
      if (!item) return res.status(404).json({ message: 'Event not found.' });
      return res.json(item);
    }

    const index = events.findIndex((entry) => entry._id === id);
    if (index === -1) return res.status(404).json({ message: 'Event not found.' });

    events[index] = { ...events[index], ...req.body, updatedAt: new Date().toISOString() };
    return res.json(events[index]);
  } catch (error) {
    return res.status(500).json({ message: 'Could not update event.' });
  }
};

const deleteEvent = async (req, res) => {
  const { id } = req.params;

  try {
    if (mongoose.connection.readyState === 1) {
      const item = await Event.findByIdAndDelete(id);
      if (!item) return res.status(404).json({ message: 'Event not found.' });
      return res.json({ message: 'Event deleted successfully.' });
    }

    const index = events.findIndex((entry) => entry._id === id);
    if (index === -1) return res.status(404).json({ message: 'Event not found.' });
    events.splice(index, 1);
    return res.json({ message: 'Event deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Could not delete event.' });
  }
};

module.exports = { getAllEvents, getEventById, createEvent, updateEvent, deleteEvent };
