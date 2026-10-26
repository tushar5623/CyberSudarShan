const { createHash, timingSafeEqual } = require('node:crypto');
const { isIP } = require('node:net');
const { rateLimit } = require('express-rate-limit');

function positiveInteger(env, name, fallback) {
  if (env[name] === undefined) return fallback;
  const value = Number(env[name]);
  if (!/^\d+$/.test(env[name]) || !Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return value;
}

function trustedProxies(value) {
  if (value === undefined || value.trim() === '') return false;
  const entries = value.split(',').map(entry => entry.trim());
  for (const entry of entries) {
    const [address, prefix, extra] = entry.split('/');
    const version = isIP(address);
    if (!version || extra !== undefined || (prefix !== undefined &&
        (!/^\d+$/.test(prefix) || Number(prefix) < 1 || Number(prefix) > (version === 4 ? 32 : 128)))) {
      throw new Error('TRUSTED_PROXY_CIDRS must contain explicit IP addresses or nonzero CIDR ranges.');
    }
  }
  return entries;
}

function allowedOrigins(env) {
  const value = env.CORS_ALLOWED_ORIGINS;
  if (value === undefined && env.NODE_ENV !== 'production') return [];
  const invalid = () => new Error('CORS_ALLOWED_ORIGINS must contain explicit HTTP(S) origins without credentials, paths, queries or fragments.');
  if (typeof value !== 'string' || !value.trim()) throw invalid();
  const origins = value.split(',').map(origin => origin.trim());
  for (const origin of origins) {
    let url;
    try { url = new URL(origin); } catch { throw invalid(); }
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin ||
        url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw invalid();
  }
  return [...new Set(origins)];
}

function createSecurity(env) {
  if (typeof env.ADMIN_SECRET !== 'string' || !env.ADMIN_SECRET.trim()) {
    throw new Error('ADMIN_SECRET is required and must not be blank.');
  }
  // Preserve exact existing secrets, including any intentional surrounding spaces.
  const expectedDigest = createHash('sha256').update(env.ADMIN_SECRET).digest();
  const isAdmin = credential => typeof credential === 'string' &&
    credential.trim().length > 0 && timingSafeEqual(
      createHash('sha256').update(credential).digest(), expectedDigest
    );
  const unauthorized = res => res.status(401).json({
    success: false, error: 'Unauthorized', message: 'Invalid admin credentials.'
  });
  const requireAdmin = (req, res, next) => {
    if (!isAdmin(req.body?.adminPassword)) return unauthorized(res);
    next();
  };
  const limit = (maximum, windowMs) => rateLimit({
    windowMs,
    limit: maximum,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    // With trust proxy disabled, forwarding headers are deliberately ignored.
    validate: { xForwardedForHeader: false },
    message: { success: false, error: 'Too many requests. Please try again later.',
      message: 'Too many requests. Please try again later.' }
  });
  const authMax = positiveInteger(env, 'AUTH_RATE_LIMIT_MAX', 10);
  const adminMax = positiveInteger(env, 'ADMIN_RATE_LIMIT_MAX', 60);
  const publicMax = positiveInteger(env, 'PUBLIC_WRITE_RATE_LIMIT_MAX', 20);
  const chatMax = positiveInteger(env, 'CHAT_RATE_LIMIT_MAX', 60);
  const breachMax = positiveInteger(env, 'BREACH_RATE_LIMIT_MAX', 10);
  return {
    corsOrigins: allowedOrigins(env),
    trustProxy: trustedProxies(env.TRUSTED_PROXY_CIDRS),
    isAdmin, unauthorized, requireAdmin,
    // Independent stores isolate ordinary endpoint budgets; admins share one budget.
    loginLimit: limit(authMax, 15 * 60 * 1000),
    signupLimit: limit(authMax, 15 * 60 * 1000),
    adminLimit: limit(adminMax, 15 * 60 * 1000),
    contactLimit: limit(publicMax, 15 * 60 * 1000),
    emergencyLimit: limit(publicMax, 15 * 60 * 1000),
    newsLimit: limit(publicMax, 15 * 60 * 1000),
    chatLimit: limit(chatMax, 60 * 1000),
    breachLimit: limit(breachMax, 60 * 1000)
  };
}

module.exports = { createSecurity };
