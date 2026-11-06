const { Router } = require('express');
const bcrypt = require('bcryptjs');
const { text, email } = require('../../validation');
const { issueSession, revokeSession } = require('./session');
// A fixed hash equalizes the expensive password check for unknown accounts.
const dummyHash = bcrypt.hashSync('not-an-account-password', 10);

// Query fields must be scalars: never pass client-supplied MongoDB operators
// through to findOne. Do not normalize existing account names or passwords.
function validCredentials(body, signup = false) {
  return (
    body !== null &&
    typeof body === 'object' &&
    !Array.isArray(body) &&
    email(body.email) &&
    typeof body.password === 'string' &&
    body.password.length > 0 &&
    Buffer.byteLength(body.password, 'utf8') <= 72 &&
    (!signup || (text(100)(body.name) && body.password.length >= 8))
  );
}

function createAuthRouter(security) {
  const User = require('./model');
  const router = Router();

  router.post('/api/auth/signup', security.signupLimit, async (req, res) => {
    if (!validCredentials(req.body, true)) {
      return res.status(400).json({ success: false, message: 'Invalid signup data.' });
    }
    try {
      const { name, email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser)
        return res.status(400).json({ success: false, message: 'Email already registered!' });

      // Hash Password (Security First!)
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Save new user
      const newUser = new User({ name, email, password: hashedPassword });
      await newUser.save();

      res.status(201).json({
        success: true,
        message: 'Account created successfully!',
        user: { name: newUser.name, email: newUser.email }
      });
    } catch (error) {
      if (error.code === 11000)
        return res.status(400).json({ success: false, message: 'Email already registered!' });
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  router.post('/api/auth/login', security.loginLimit, async (req, res) => {
    if (!validCredentials(req.body)) {
      return res.status(400).json({ success: false, message: 'Invalid login data.' });
    }
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await User.findOne({ email });

      // Check password
      const isMatch = await bcrypt.compare(password, user?.password || dummyHash);
      if (!user || !isMatch)
        return res.status(401).json({ success: false, message: 'Invalid credentials!' });

      res.set('X-Session-Token', await issueSession(user));
      res.status(200).json({
        success: true,
        message: 'Login successful!',
        user: { id: String(user._id), name: user.name, email: user.email }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  router.post('/api/auth/logout', security.loginLimit, revokeSession);
  return router;
}

module.exports = { createAuthRouter };
