import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step, rankFor } from '../src/game.js';

const DT = 1 / 60;

function run(g, secs, chewing, sink = []) {
  for (let t = 0; t < secs; t += DT) {
    sink.push(...step(g, DT, typeof chewing === 'function' ? chewing(g) : chewing));
    if (g.phase === 'over') break;
  }
  return sink;
}

const releaseOnTell = (g) => g.goose.mood !== 'tell';

test('chewing scores bites', () => {
  const g = createGame({ seed: 1, golden: false });
  const ev = run(g, 1, true);
  assert.ok(g.score >= 3);
  assert.equal(ev.filter((e) => e.type === 'bite').length, g.score);
});

test('never chewing never strikes', () => {
  const g = createGame({ seed: 2, golden: false });
  run(g, 60, false);
  assert.equal(g.phase, 'play');
  assert.equal(g.score, 0);
});

test('chewing nonstop is eventually punished', () => {
  for (let s = 1; s <= 20; s++) {
    const g = createGame({ seed: s });
    const ev = run(g, 60, true);
    assert.equal(g.phase, 'over', 'seed ' + s);
    assert.equal(ev.at(-1).type, 'strike');
  }
});

test('releasing on every tell survives', () => {
  for (let s = 1; s <= 20; s++) {
    const g = createGame({ seed: s });
    run(g, 60, releaseOnTell);
    assert.equal(g.phase, 'play', 'seed ' + s);
    assert.ok(g.score > 20, 'seed ' + s + ' score ' + g.score);
  }
});

test('resuming chewing before the tell ends is punished', () => {
  const g = createGame({ seed: 5, golden: false });
  // Release when the tell starts, but get greedy again halfway through it.
  run(g, 60, (g2) => g2.goose.mood !== 'tell' || g2.goose.moodTime > g2.goose.moodLength * 0.9);
  assert.equal(g.phase, 'over');
});

test('golden doubles points', () => {
  const g = createGame({ seed: 3, golden: true });
  run(g, 0.6, true);
  assert.equal(g.score % 2, 0);
  assert.ok(g.score >= 4);
});

test('finishing a sandwich serves a bigger one', () => {
  const g = createGame({ seed: 4, golden: false });
  const first = g.sandwich.size;
  const ev = run(g, 60, releaseOnTell);
  assert.ok(ev.some((e) => e.type === 'sandwich'));
  assert.ok(g.sandwich.size > first);
});

test('some tells are fake-outs, and the first tell is always real', () => {
  let fake = 0;
  for (let s = 1; s <= 30; s++) {
    const g = createGame({ seed: s });
    const ev = run(g, 40, releaseOnTell).filter((e) => e.type === 'tell' || e.type === 'fakeout' || e.type === 'innocent');
    assert.notEqual(ev[1] && ev[1].type, 'fakeout', 'seed ' + s);
    fake += ev.filter((e) => e.type === 'fakeout').length;
  }
  assert.ok(fake > 0);
});

test('tells get shorter as the score grows, down to a floor', () => {
  const g = createGame({ seed: 9, golden: false });
  let firstLen = null;
  let lastLen = null;
  run(g, 240, (g2) => {
    if (g2.goose.mood === 'tell') {
      if (firstLen === null) firstLen = g2.goose.moodLength;
      lastLen = g2.goose.moodLength;
      return false;
    }
    return true;
  });
  assert.ok(lastLen < firstLen);
  assert.ok(lastLen >= 0.3);
});

test('rank ladder', () => {
  assert.equal(rankFor(0), 'crumb');
  assert.equal(rankFor(500), 'whisperer');
  const ranks = [0, 10, 30, 60, 100].map(rankFor);
  assert.equal(new Set(ranks).size, 5);
});
