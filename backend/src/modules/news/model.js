const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 200 },
  summary: { type: String, required: true, maxlength: 2000 },
  fullDetails: { type: String, required: true, maxlength: 20000 },
  type: { type: String, required: true, maxlength: 50 },
  imageUrl: { type: String, maxlength: 2048 },
  status: { type: String, default: 'pending', enum: ['pending', 'approved'] },
  date: { type: Date, default: Date.now }
});

newsSchema.index({ status: 1, date: -1, _id: -1 });
newsSchema.index({ date: -1, _id: -1 });

module.exports = mongoose.models.News || mongoose.model('News', newsSchema);
