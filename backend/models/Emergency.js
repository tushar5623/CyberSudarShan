    const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    mobile: { type: String, required: true },
    problem: { type: String, required: true },
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Emergency', emergencySchema);  