const { Router } = require('express');

function createNewsRouter(security) {
const News = require('./model');
const router = Router();

// --- 1. GET APPROVED NEWS (For Public) ---
router.get('/api/news', async (req, res) => {
    try {
        // Sirf wahi news dikhegi jo 'approved' hai
        const news = await News.find({ status: 'approved' }).sort({ date: -1 });
        res.status(200).json(news);
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching news" });
    }
});

// --- 2. GET ALL NEWS (For Admin - Includes Pending) ---
router.post('/api/news/admin', security.adminLimit, security.requireAdmin, async (req, res) => {
    try {
        const news = await News.find().sort({ date: -1 }); // Admin ko sab dikhega
        res.status(200).json(news);
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// --- 3. POST NEW NEWS (Public & Admin) ---
router.post('/api/news', security.newsLimit, (req, res, next) => {
    // Supplying this field explicitly requests the existing admin publishing flow.
    if (req.body && Object.hasOwn(req.body, 'adminPassword')) {
        return security.adminLimit(req, res, error => {
            if (error) return next(error);
            return security.requireAdmin(req, res, next);
        });
    }
    next();
}, async (req, res) => {
    try {
        const { adminPassword, title, summary, fullDetails, type, imageUrl } = req.body;

        // Agar admin ne daala hai toh direct 'approved', warna 'pending'
        let status = 'pending';
        if (security.isAdmin(adminPassword)) {
            status = 'approved';
        }

        const newNews = new News({ title, summary, fullDetails, type, imageUrl, status });
        await newNews.save();
        res.status(201).json({ success: true, message: status === 'approved' ? "News Live!" : "Sent for verification!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// --- 4. APPROVE NEWS (Admin Only) ---
router.put('/api/news/approve/:id', security.adminLimit, security.requireAdmin, async (req, res) => {
    try {
        await News.findByIdAndUpdate(req.params.id, { status: 'approved' });
        res.status(200).json({ success: true, message: "News Approved & Live!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// --- 5. DELETE NEWS (Admin Only) ---
router.delete('/api/news/:id', security.adminLimit, security.requireAdmin, async (req, res) => {
    try {
        await News.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "News deleted!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});
return router;
}

module.exports = { createNewsRouter };
