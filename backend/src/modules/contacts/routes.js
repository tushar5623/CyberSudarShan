const { Router } = require('express');

function createContactRouter(contactLimit) {
  const Contact = require('./model');
  const router = Router();

  router.post('/api/contact', contactLimit, async (req, res) => {
    try {
      const { name, email, message } = req.body;
      const newContact = new Contact({ name, email, message });
      await newContact.save();
      res.status(201).json({ message: "Data Saved to Cloud!" });
    } catch (error) {
      res.status(500).json({ error: "Failed to save data" });
    }
  });

  return router;
}

module.exports = { createContactRouter };
