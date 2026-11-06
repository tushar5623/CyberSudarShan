const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 100 },
  email: { type: String, required: true, maxlength: 254 },
  message: { type: String, required: true, maxlength: 5000 },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Contact || mongoose.model('Contact', contactSchema);
