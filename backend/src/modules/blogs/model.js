const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 200 },
  author: { type: String, required: true, maxlength: 100 },
  content: { type: String, required: true, maxlength: 50000 },
  date: { type: Date, default: Date.now }
});

blogSchema.index({ date: -1, _id: -1 });

module.exports = mongoose.models.Blog || mongoose.model('Blog', blogSchema);
