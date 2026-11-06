const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema({
  name: { type: String, maxlength: 100, required: true },
  email: { type: String, maxlength: 254, required: true },
  mobile: { type: String, maxlength: 30, required: true },
  problem: { type: String, maxlength: 10000, required: true },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Emergency || mongoose.model('Emergency', emergencySchema);
