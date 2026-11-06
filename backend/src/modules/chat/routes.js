const { requireSession } = require('../auth/session');
const { validateBody } = require('../../validation');
const { Router } = require('express');

function createChatRouter(chatLimit) {
  const Chat = require('./model');
  const router = Router();

  router.get('/api/chat', async (req, res) => {
    try {
      // Select the newest window, then display it in chronological order.
      const messages = await Chat.find().sort({ timestamp: -1, _id: -1 }).limit(100);
      res.status(200).json(messages.reverse());
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error fetching chats' });
    }
  });

  router.post('/api/chat', chatLimit, requireSession, validateBody('chat'), async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) return res.status(400).json({ success: false, message: 'Message is required' });

      const newChat = new Chat({
        sender: req.user.name,
        userId: req.user._id,
        message
      });
      await newChat.save();
      res.status(201).json({ success: true, message: 'Message sent!' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });
  return router;
}

module.exports = { createChatRouter };
