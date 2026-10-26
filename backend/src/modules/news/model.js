const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
    title: { type: String, required: true },
    summary: { type: String, required: true },
    fullDetails: { type: String, required: true },
    type: { type: String, required: true },
    imageUrl: { type: String },
    status: { type: String, default: 'pending' }, // 🔥 NAYA FIELD: By default 'pending' rahega
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.models.News || mongoose.model('News', newsSchema);
