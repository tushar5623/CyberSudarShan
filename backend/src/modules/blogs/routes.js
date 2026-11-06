const { pagination, listRecords } = require('../../pagination');
const { validateBody, validateId } = require('../../validation');
const { Router } = require('express');

function createBlogRouter(security) {
  const Blog = require('./model');
  const router = Router();

  router.post(
    '/api/blogs',
    security.adminLimit,
    security.requireAdmin,
    validateBody('blog'),
    async (req, res) => {
      try {
        const { title, author, content } = req.body;

        const newBlog = new Blog({ title, author, content });
        await newBlog.save();
        res.status(201).json(newBlog);
      } catch (error) {
        res.status(500).json({ error: 'Failed to post blog' });
      }
    }
  );

  // 3. API: Saare Blogs laane ke liye (Read)
  router.get('/api/blogs', pagination, async (req, res) => {
    try {
      // Sabse naya blog sabse upar dikhega (sort -1)
      const blogs = await listRecords(Blog, {}, req, res);
      res.json(blogs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch blogs' });
    }
  });
  router.put(
    '/api/blogs/:id',
    security.adminLimit,
    security.requireAdmin,
    validateId,
    validateBody('blog'),
    async (req, res) => {
      try {
        const { title, author, content } = req.body;

        const updatedBlog = await Blog.findByIdAndUpdate(
          req.params.id,
          { title, author, content },
          { new: true, runValidators: true } // Ye naya updated data return karega
        );

        if (!updatedBlog)
          return res.status(404).json({ success: false, message: 'Blog not found' });
        res.status(200).json({ success: true, message: 'Blog updated successfully!' });
      } catch (error) {
        console.error('Blog update failed.');
        res.status(500).json({ success: false, message: 'Server error' });
      }
    }
  );

  router.delete(
    '/api/blogs/:id',
    security.adminLimit,
    security.requireAdmin,
    validateId,
    async (req, res) => {
      try {
        const deletedBlog = await Blog.findByIdAndDelete(req.params.id);

        if (!deletedBlog)
          return res.status(404).json({ success: false, message: 'Blog not found' });
        res.status(200).json({ success: true, message: 'Blog deleted successfully!' });
      } catch (error) {
        console.error('Blog deletion failed.');
        res.status(500).json({ success: false, message: 'Server error' });
      }
    }
  );

  return router;
}

module.exports = { createBlogRouter };
