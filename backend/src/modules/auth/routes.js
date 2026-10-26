const { Router } = require('express');
const bcrypt = require('bcryptjs');

// Query fields must be scalars: never pass client-supplied MongoDB operators
// through to findOne. Do not normalize existing account names or passwords.
const nonblankString = value => typeof value === 'string' && value.trim().length > 0;
function validCredentials(body, signup = false) {
    return body !== null && typeof body === 'object' && !Array.isArray(body) &&
        nonblankString(body.email) && typeof body.password === 'string' && body.password.length > 0 &&
        (!signup || nonblankString(body.name));
}

function createAuthRouter(security) {
const User = require('./model');
const router = Router();

// --- 1. SIGN UP (New User) ---
router.post('/api/auth/signup', security.signupLimit, async (req, res) => {
    if (!validCredentials(req.body, true)) {
        return res.status(400).json({ success: false, message: 'Invalid signup data.' });
    }
    try {
        const { name, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ success: false, message: "Email already registered!" });

        // Hash Password (Security First!)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Save new user
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ success: true, message: "Account created successfully!", user: { name: newUser.name, email: newUser.email } });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// --- 2. LOGIN (Existing User) ---
router.post('/api/auth/login', security.loginLimit, async (req, res) => {
    if (!validCredentials(req.body)) {
        return res.status(400).json({ success: false, message: 'Invalid login data.' });
    }
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: "User not found!" });

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ success: false, message: "Invalid credentials!" });

        res.status(200).json({ success: true, message: "Login successful!", user: { name: user.name, email: user.email } });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

return router;
}

module.exports = { createAuthRouter };
