const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sender: { type: String, required: true, default: 'Anonymous' },
  message: { type: String, maxlength: 2000, required: true },
  timestamp: { type: Date, default: Date.now }
});

chatSchema.index({ timestamp: -1, _id: -1 });

module.exports = mongoose.models.Chat || mongoose.model('Chat', chatSchema);
