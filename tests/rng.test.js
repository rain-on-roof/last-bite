import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../src/rng.js';

test('deterministic and in range', () => {
  const a = mulberry32(7);
  const b = mulberry32(7);
  for (let i = 0; i < 1000; i++) {
    const x = a();
    assert.equal(x, b());
    assert.ok(x >= 0 && x < 1);
  }
});
