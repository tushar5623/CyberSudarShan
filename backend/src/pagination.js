// Bound database work and response sizes while retaining the existing array body.
function pagination(req, res, next) {
  const { limit = '100', offset = '0' } = req.query;
  if (
    ![limit, offset].every((value) => typeof value === 'string' && /^\d+$/.test(value)) ||
    Number(limit) < 1 ||
    Number(limit) > 100 ||
    Number(offset) > 10000
  ) {
    return res
      .status(400)
      .json({ success: false, message: 'Invalid pagination. Use limit 1–100 and offset 0–10000.' });
  }
  req.pagination = { limit: Number(limit), offset: Number(offset) };
  next();
}

async function listRecords(Model, filter, req, res) {
  const { limit, offset } = req.pagination;
  const rows = await Model.find(filter)
    .sort({ date: -1, _id: -1 })
    .skip(offset)
    .limit(limit + 1)
    .lean();
  const hasMore = rows.length > limit;
  res.set('X-Has-More', String(hasMore));
  return rows.slice(0, limit);
}

module.exports = { pagination, listRecords };
