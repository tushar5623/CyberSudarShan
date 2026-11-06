const { Session } = require('../../src/modules/auth/session');
const token = 'a'.repeat(64);
function mockSessions(t, name = 'Reader') {
  t.mock.method(Session, 'create', async (value) => value);
  t.mock.method(Session, 'findOne', () => ({
    populate: async () => ({
      user: { _id: '507f1f77bcf86cd799439099', name, email: 'reader@example.invalid' }
    })
  }));
  t.mock.method(Session, 'deleteOne', async () => ({ deletedCount: 1 }));
}
module.exports = { mockSessions, authorization: `Bearer ${token}` };
