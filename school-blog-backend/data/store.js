const createId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const news = [];
const events = [];

const clubs = [
  {
    _id: 'club-stem',
    name: 'STEM Club',
    description: 'Students explore science, technology, engineering and mathematics through practical activities, creativity and problem-solving.',
    category: 'Science & technology',
    status: 'active',
  },
  {
    _id: 'club-cooking',
    name: 'Cooking Club',
    description: 'Students can develop practical skills through cooking activities.',
    category: 'Practical skills',
    status: 'active',
  },
];

const announcements = [];

module.exports = {
  news,
  events,
  clubs,
  announcements,
  createId,
};
