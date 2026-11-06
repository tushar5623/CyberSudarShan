const { pagination, listRecords } = require('../../pagination');
const { validateBody, validateId } = require('../../validation');
const { Router } = require('express');

function createNewsRouter(security) {
  const News = require('./model');
  const router = Router();

  router.get('/api/news', pagination, async (req, res) => {
    try {
      // Sirf wahi news dikhegi jo 'approved' hai
      const news = await listRecords(News, { status: 'approved' }, req, res);
      res.status(200).json(news);
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error fetching news' });
    }
  });

  router.post(
    '/api/news/admin',
    security.adminLimit,
    security.requireAdmin,
    pagination,
    async (req, res) => {
      try {
        const news = await listRecords(News, {}, req, res); // Admin ko sab dikhega
        res.status(200).json(news);
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    }
  );

  router.post(
    '/api/news',
    security.newsLimit,
    (req, res, next) => {
      // Supplying this field explicitly requests the existing admin publishing flow.
      if (req.body && Object.hasOwn(req.body, 'adminPassword')) {
        return security.adminLimit(req, res, (error) => {
          if (error) return next(error);
          return security.requireAdmin(req, res, next);
        });
      }
      next();
    },
    validateBody('news'),
    async (req, res) => {
      try {
        const { adminPassword, title, summary, fullDetails, type, imageUrl } = req.body;

        // Agar admin ne daala hai toh direct 'approved', warna 'pending'
        let status = 'pending';
        if (security.isAdmin(adminPassword)) {
          status = 'approved';
        }

        const newNews = new News({ title, summary, fullDetails, type, imageUrl, status });
        await newNews.save();
        res.status(201).json({
          success: true,
          message: status === 'approved' ? 'News Live!' : 'Sent for verification!'
        });
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    }
  );

  router.put(
    '/api/news/approve/:id',
    security.adminLimit,
    security.requireAdmin,
    validateId,
    async (req, res) => {
      try {
        const record = await News.findByIdAndUpdate(
          req.params.id,
          { status: 'approved' },
          { runValidators: true }
        );
        if (!record) return res.status(404).json({ success: false, message: 'News not found' });
        res.status(200).json({ success: true, message: 'News Approved & Live!' });
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    }
  );

  router.delete(
    '/api/news/:id',
    security.adminLimit,
    security.requireAdmin,
    validateId,
    async (req, res) => {
      try {
        const record = await News.findByIdAndDelete(req.params.id);
        if (!record) return res.status(404).json({ success: false, message: 'News not found' });
        res.status(200).json({ success: true, message: 'News deleted!' });
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    }
  );
  return router;
}

module.exports = { createNewsRouter };
