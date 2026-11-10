const mongoose = require('mongoose');

const News = require('../models/News');
const { news, createId } = require('../data/store');

const resolvePublishedDate = (currentItem, payload = {}) => {
  const currentStatus = currentItem?.status || 'draft';
  const incomingStatus = payload.status || currentStatus;

  if (Object.prototype.hasOwnProperty.call(payload, 'publishedDate')) {
    return payload.publishedDate || null;
  }

  if (incomingStatus === 'published') {
    return currentItem?.publishedDate || payload.publishedDate || new Date().toISOString();
  }

  return null;
};

const sortByNewest = (items) =>
  [...items].sort((a, b) => new Date(b.publishedDate || b.createdAt || b.updatedAt || 0) - new Date(a.publishedDate || a.createdAt || a.updatedAt || 0));

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getAllNews = async (req, res) => {
  try {
    const paginated = ['page', 'limit', 'search', 'category'].some((key) => req.query[key] !== undefined);
    const page = Number.parseInt(req.query.page || '1', 10);
    const limit = Number.parseInt(req.query.limit || '12', 10);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';

    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50) {
      return res.status(400).json({ message: 'Page must be positive and limit must be between 1 and 50.' });
    }
    if (search.length > 100 || category.length > 80) {
      return res.status(400).json({ message: 'Search and category filters are too long.' });
    }

    const baseFilter = req.query.status === 'all' && req.user ? {} : { status: 'published' };
    if (req.user?.role === 'department_admin') baseFilter.department = req.user.department;
    if (category) baseFilter.category = category;
    if (search) {
      baseFilter.$or = [
        { title: { $regex: escapeRegex(search), $options: 'i' } },
        { content: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    if (mongoose.connection.readyState === 1) {
      if (!paginated) {
        const items = await News.find(baseFilter).sort({ publishedDate: -1, createdAt: -1 });
        return res.json(items);
      }
      const [items, total, categories] = await Promise.all([
        News.find(baseFilter).sort({ publishedDate: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit),
        News.countDocuments(baseFilter),
        News.distinct('category', {
          status: 'published',
          ...(req.user?.role === 'department_admin' ? { department: req.user.department } : {}),
        }),
      ]);
      return res.json({ items, total, page, pages: Math.ceil(total / limit), categories });
    }

    let items = req.query.status === 'all' && req.user ? news : news.filter((item) => item.status === 'published');
    if (req.user?.role === 'department_admin') {
      items = items.filter((item) => String(item.department) === String(req.user.department));
    }
    if (category) items = items.filter((item) => item.category === category);
    if (search) {
      const searchPattern = new RegExp(escapeRegex(search), 'i');
      items = items.filter((item) => searchPattern.test(item.title) || searchPattern.test(item.content));
    }
    items = sortByNewest(items);
    if (paginated) {
      const total = items.length;
      const categories = [...new Set(news.filter((item) => item.status === 'published').map((item) => item.category))];
      items = items.slice((page - 1) * limit, page * limit);
      return res.json({ items, total, page, pages: Math.ceil(total / limit), categories });
    }
    return res.json(items);
  } catch (error) {
    return res.status(500).json({ message: 'Could not fetch news.' });
  }
};

const getFeaturedNews = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const items = await News.find({ featured: true, status: 'published' }).sort({ publishedDate: -1 });
      return res.json(items);
    }

    return res.json(sortByNewest(news.filter((item) => item.featured && item.status === 'published')));
  } catch (error) {
    return res.status(500).json({ message: 'Could not fetch featured news.' });
  }
};

const getNewsById = async (req, res) => {
  const { id } = req.params;

  try {
    if (mongoose.connection.readyState === 1) {
      const item = await News.findOne({
        _id: id,
        ...(req.user ? {} : { status: 'published' }),
        ...(req.user?.role === 'department_admin' ? { department: req.user.department } : {}),
      });
      if (!item) return res.status(404).json({ message: 'News article not found.' });
      return res.json(item);
    }

    const item = news.find((entry) =>
      entry._id === id
      && (req.user || entry.status === 'published')
      && (req.user?.role !== 'department_admin' || String(entry.department) === String(req.user.department))
    );
    if (!item) return res.status(404).json({ message: 'News article not found.' });
    return res.json(item);
  } catch (error) {
    return res.status(500).json({ message: 'Could not fetch article details.' });
  }
};

const createNews = async (req, res) => {
  const payload = req.body;

  if (!payload.title || !payload.content) {
    return res.status(400).json({ message: 'Title and content are required.' });
  }

  try {
    if (mongoose.connection.readyState === 1) {
      const item = await News.create({
        ...payload,
        author: req.user.name,
        authorId: req.user._id,
        status: payload.status || 'draft',
        publishedDate: payload.status === 'published' ? payload.publishedDate || new Date() : null,
      });
      return res.status(201).json(item);
    }

    const newEntry = {
      _id: createId('news'),
      title: payload.title,
      subtitle: payload.subtitle || '',
      content: payload.content,
      category: payload.category || 'General',
      author: payload.author || 'School Editorial Team',
      image: payload.image || '',
      featured: Boolean(payload.featured),
      status: payload.status || 'draft',
      publishedDate: payload.status === 'published' ? payload.publishedDate || new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    news.unshift(newEntry);
    return res.status(201).json(newEntry);
  } catch (error) {
    return res.status(500).json({ message: 'Could not create news article.' });
  }
};

const updateNews = async (req, res) => {
  const { id } = req.params;
  const payload = req.body;

  try {
    if (mongoose.connection.readyState === 1) {
      const currentItem = await News.findById(id);
      if (!currentItem) return res.status(404).json({ message: 'News article not found.' });

      const nextPayload = {
        ...payload,
        publishedDate: resolvePublishedDate(currentItem.toObject ? currentItem.toObject() : currentItem, payload),
      };

      const item = await News.findByIdAndUpdate(id, nextPayload, { new: true, runValidators: true });
      return res.json(item);
    }

    const index = news.findIndex((entry) => entry._id === id);
    if (index === -1) return res.status(404).json({ message: 'News article not found.' });

    const updatedItem = {
      ...news[index],
      ...payload,
      publishedDate: resolvePublishedDate(news[index], payload),
      updatedAt: new Date().toISOString(),
    };

    news[index] = updatedItem;
    return res.json(updatedItem);
  } catch (error) {
    return res.status(500).json({ message: 'Could not update news article.' });
  }
};

const deleteNews = async (req, res) => {
  const { id } = req.params;

  try {
    if (mongoose.connection.readyState === 1) {
      const item = await News.findByIdAndDelete(id);
      if (!item) return res.status(404).json({ message: 'News article not found.' });
      return res.json({ message: 'News article deleted successfully.' });
    }

    const index = news.findIndex((entry) => entry._id === id);
    if (index === -1) return res.status(404).json({ message: 'News article not found.' });
    news.splice(index, 1);
    return res.json({ message: 'News article deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Could not delete news article.' });
  }
};

module.exports = { getAllNews, getFeaturedNews, getNewsById, createNews, updateNews, deleteNews };
