const { Router } = require('express');

function createChatRouter(chatLimit) {
const Chat = require('./model');
const router = Router();

// --- GET CHAT MESSAGES (Pichle 100 messages fetch karega) ---
router.get('/api/chat', async (req, res) => {
    try {
        // Sort by timestamp ascending (purane pehle, naye neeche)
        const messages = await Chat.find().sort({ timestamp: 1 }).limit(100);
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching chats" });
    }
});

// --- POST NEW MESSAGE ---
router.post('/api/chat', chatLimit, async (req, res) => {
    try {
        const { sender, message } = req.body;
        if (!message) return res.status(400).json({ success: false, message: "Message is required" });

        const newChat = new Chat({
            sender: sender || "Anonymous User",
            message
        });
        await newChat.save();
        res.status(201).json({ success: true, message: "Message sent!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});
return router;
}

module.exports = { createChatRouter };
