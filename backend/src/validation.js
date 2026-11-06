// Validate at the HTTP boundary before Mongoose can coerce client values.
const text =
  (max, min = 1) =>
  (value) =>
    typeof value === 'string' && value.trim().length >= min && value.length <= max;
const email = (value) => text(254)(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const optional = (rule) => (value) => value === undefined || value === '' || rule(value);
const httpUrl = (value) => {
  if (!text(2048)(value)) return false;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
};
const fields = {
  contact: { name: text(100), email, message: text(5000) },
  emergency: { name: text(100), email, mobile: text(30), problem: text(10000) },
  blog: { title: text(200), author: text(100), content: text(50000) },
  news: {
    title: text(200),
    summary: text(2000),
    fullDetails: text(20000),
    type: text(50),
    imageUrl: optional(httpUrl)
  },
  chat: { message: text(2000) }
};
function validateBody(kind) {
  return (req, res, next) => {
    const body = req.body;
    if (
      !body ||
      Array.isArray(body) ||
      typeof body !== 'object' ||
      !Object.entries(fields[kind]).every(([key, rule]) => rule(body[key]))
    ) {
      return res.status(400).json({ success: false, message: 'Invalid request data.' });
    }
    next();
  };
}
function validateId(req, res, next) {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid record ID.' });
  }
  next();
}
module.exports = { text, email, validateBody, validateId };
