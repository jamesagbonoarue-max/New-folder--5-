const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    subtitle: { type: String },
    content: { type: String, required: true },
    category: { type: String, default: 'General' },
    author: { type: String, default: 'School Editorial Team' },
    image: { type: String, default: '' },
    imagePublicId: { type: String, default: '' },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    featured: { type: Boolean, default: false },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    publishedDate: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.models.News || mongoose.model('News', newsSchema);
