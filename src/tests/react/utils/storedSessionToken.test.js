const assert = require('node:assert/strict');
const {test} = require('node:test');
const {readStoredSessionToken} = require('../../../utils/storedSessionToken');

for (const prefix of ['', '__q_objt|']) {
  for (const field of ['token', 'api_key']) {
    test(`reads ${field} from ${prefix ? 'wrapped' : 'plain'} session`, () => {
      const storage = {getItem: key => key === 'session' ? prefix + JSON.stringify({[field]: 'synthetic-token'}) : null};
      assert.equal(readStoredSessionToken(storage), 'synthetic-token');
    });
  }
}
test('prefers the canonical token field when both are present', () => {
  assert.equal(readStoredSessionToken({getItem: () => JSON.stringify({token: 'current', api_key: 'old'})}), 'current');
});
test('missing, malformed and inaccessible sessions have no token', () => {
  for (const raw of [null, '', 'broken', '__q_objt|broken', '{}', 'null']) {
    assert.equal(readStoredSessionToken({getItem: () => raw}), '');
  }
  assert.equal(readStoredSessionToken({getItem: () => {throw new Error('unavailable');}}), '');
  assert.equal(readStoredSessionToken(null), '');
});
