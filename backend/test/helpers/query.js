function queryRows(rows) {
  let offset = 0;
  let count = rows.length;
  return {
    skip(value) {
      offset = value;
      return this;
    },
    limit(value) {
      count = value;
      return this;
    },
    lean: async () => rows.slice(offset, offset + count)
  };
}
module.exports = { queryRows };
