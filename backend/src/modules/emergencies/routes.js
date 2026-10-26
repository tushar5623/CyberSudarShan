const { Router } = require('express');
const Emergency = require('./model');

function createEmergencyRouter(emergencyLimit) {
  const router = Router();

  router.post('/api/emergency', emergencyLimit, async (req, res) => {
    try {
        const { name, email, mobile, problem } = req.body;

        const newEmergency = new Emergency({
            name, email, mobile, problem
        });

        await newEmergency.save();
        res.status(201).json({ message: "Emergency reported successfully! We will contact you soon." });
    } catch (error) {
        console.error('Emergency persistence failed.');
        res.status(500).json({ message: "Server Error! Please try again." });
    }
  });

  return router;
}

module.exports = { createEmergencyRouter };
