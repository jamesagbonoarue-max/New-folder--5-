const test = require('node:test');
const assert = require('node:assert/strict');
const {
  generateVerificationCode,
  hashResetToken,
  isValidResetPassword,
} = require('../controllers/passwordResetController');

test('verification codes are six-digit strings', () => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    assert.match(generateVerificationCode(), /^\d{6}$/);
  }
});

test('reset token hashes are one-way SHA-256 digests', () => {
  const token = 'a'.repeat(64);
  const hash = hashResetToken(token);

  assert.equal(hash.length, 64);
  assert.notEqual(hash, token);
  assert.equal(hashResetToken(token), hash);
  assert.notEqual(hashResetToken(`${token}b`), hash);
});

test('reset passwords must meet all composition requirements', () => {
  assert.equal(isValidResetPassword('School123!'), true);
  assert.equal(isValidResetPassword('short1!'), false);
  assert.equal(isValidResetPassword('lowercase123!'), false);
  assert.equal(isValidResetPassword('UPPERCASE123!'), false);
  assert.equal(isValidResetPassword('SchoolPass!'), false);
  assert.equal(isValidResetPassword('School1234'), false);
});
