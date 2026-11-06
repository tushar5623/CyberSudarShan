const { randomBytes, createHash } = require('node:crypto');
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true, expires: 0 }
});
const Session = mongoose.models.Session || mongoose.model('Session', schema);
const digest = (token) => createHash('sha256').update(token).digest('hex');
const tokenFrom = (req) => /^Bearer ([a-f\d]{64})$/i.exec(req.get('Authorization') || '')?.[1];

async function issueSession(user) {
  const token = randomBytes(32).toString('hex');
  await Session.create({
    tokenHash: digest(token),
    user: user._id,
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000)
  });
  return token;
}

async function requireSession(req, res, next) {
  const token = tokenFrom(req);
  if (!token) return res.status(401).json({ success: false, message: 'Please log in again.' });
  try {
    // TTL cleanup is asynchronous; expiration must also be checked on every use.
    const session = await Session.findOne({
      tokenHash: digest(token),
      expiresAt: { $gt: new Date() }
    }).populate('user', 'name email');
    if (!session?.user)
      return res.status(401).json({ success: false, message: 'Please log in again.' });
    req.user = session.user;
    next();
  } catch {
    next(new Error('Session lookup failed.'));
  }
}

async function revokeSession(req, res, next) {
  try {
    const token = tokenFrom(req);
    if (token) await Session.deleteOne({ tokenHash: digest(token) });
    res.status(204).end();
  } catch {
    next(new Error('Session revocation failed.'));
  }
}

module.exports = { Session, issueSession, requireSession, revokeSession };
