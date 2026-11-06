const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, maxlength: 100, required: true },
  email: { type: String, maxlength: 254, required: true, unique: true },
  password: { type: String, required: true }
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
