import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeChallenge, parseChallenge } from '../src/share.js';

test('round trip', () => assert.equal(parseChallenge(encodeChallenge(47)), 47));

test('rejects junk', () => {
  for (const h of ['', '#', '#beat=', '#beat=abc', '#beat=0', '#beat=-3', '#beat=100000', '#beat=4.5']) {
    assert.equal(parseChallenge(h), null, h);
  }
});

test('accepts extra params', () => assert.equal(parseChallenge('#x=1&beat=12'), 12));
