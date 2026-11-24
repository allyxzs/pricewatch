import { test } from 'node:test';
import assert from 'node:assert/strict';
import { token, validToken, checkOrigin } from '../lib/server/auth';
process.env.SESSION_SECRET = 'test-secret-that-is-at-least-32-characters-long';
process.env.APP_URL = 'http://localhost:3000';
test('signed session expires and cannot be modified', () => {
  const now = Date.now(),
    value = token(now);
  assert.equal(validToken(value, now), true);
  assert.equal(validToken(value, now + 7 * 86400000 + 1), false);
  assert.equal(validToken(value + 'x', now), false);
  assert.equal(validToken('junk', now), false);
});
test('writes require the configured origin', () => {
  assert.throws(() =>
    checkOrigin(
      new Request('http://localhost:3000/api/products', {
        method: 'POST',
        headers: { Origin: 'https://attacker.test' },
      }),
    ),
  );
  assert.throws(() =>
    checkOrigin(new Request('http://localhost:3000/api/products', { method: 'POST' })),
  );
  assert.doesNotThrow(() =>
    checkOrigin(
      new Request('http://localhost:3000/api/products', {
        method: 'POST',
        headers: { Origin: 'http://localhost:3000' },
      }),
    ),
  );
});
