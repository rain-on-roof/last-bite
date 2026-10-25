// The whole game, minus pixels: a goose that gets angrier the more you chew.
// Deterministic for a given seed, so behaviour is tested without a browser.
import { mulberry32, range } from './rng.js';

export const BITE_INTERVAL = 0.26;
export const NEAREST = 0.18;
const FIRST_SANDWICH = 10;
const TELL_FLOOR = 0.3;
const STEP_INTERVAL = 0.3;
export const CLOSE_CALL = 0.72;
const CLOSE_BONUS = 3;

const RANKS = [
  [100, 'whisperer'],
  [60, 'legend'],
  [30, 'regular'],
  [10, 'snack'],
  [0, 'crumb'],
];

export function rankFor(score) {
  return RANKS.find(([min]) => score >= min)[1];
}

export function createGame({ seed = (Math.random() * 2 ** 32) >>> 0, golden } = {}) {
  const rand = mulberry32(seed);
  const isGolden = golden ?? rand() < 1 / 25;
  const temper = {
    patience: range(rand, 1.3, 1.9),
    irritability: range(rand, 0.55, 0.8) * (isGolden ? 1.25 : 1),
    creep: range(rand, 0.085, 0.13),
    tellBase: range(rand, 0.62, 0.8),
    fakeoutChance: range(rand, 0.18, 0.3),
  };
  const game = {
    rand,
    seed,
    temper,
    phase: 'play',
    time: 0,
    score: 0,
    golden: isGolden,
    chewing: false,
    biteClock: 0,
    sandwich: { size: FIRST_SANDWICH, left: FIRST_SANDWICH },
    sandwiches: 0,
    tells: 0,
    streak: 0,
    goose: {
      dist: 0.86,
      mood: 'idle',
      moodTime: 0,
      moodLength: 0,
      suspicion: 0,
      threshold: 0,
      fake: false,
      releasedAt: -1,
      walk: 0,
      stepClock: 0,
    },
  };
  rollThreshold(game);
  return game;
}

function rollThreshold(game) {
  game.goose.threshold = game.temper.patience * range(game.rand, 0.55, 1.05);
}

function setMood(goose, mood, length = 0) {
  goose.mood = mood;
  goose.moodTime = 0;
  goose.moodLength = length;
}

function tellLength(game) {
  return Math.max(TELL_FLOOR, game.temper.tellBase * (1 - game.score * 0.004));
}

export function step(game, dt, chewing) {
  const events = [];
  if (game.phase !== 'play') return events;
  const goose = game.goose;
  game.time += dt;
  goose.moodTime += dt;
  game.chewing = chewing;

  if (chewing) {
    game.biteClock += dt;
    while (game.biteClock >= BITE_INTERVAL) {
      game.biteClock -= BITE_INTERVAL;
      game.score += game.golden ? 2 : 1;
      game.sandwich.left -= 1;
      events.push({ type: 'bite' });
      if (game.sandwich.left <= 0) {
        game.sandwiches += 1;
        game.sandwich.size += 2;
        game.sandwich.left = game.sandwich.size;
        events.push({ type: 'sandwich' });
      }
    }
  } else {
    // A bite only lands after a full chew; letting go resets it.
    game.biteClock = Math.min(game.biteClock, BITE_INTERVAL * 0.5);
  }

  const closeness = 1 - goose.dist;
  if (goose.mood === 'tell') {
    const length = goose.moodLength;
    if (!chewing && goose.releasedAt < 0) goose.releasedAt = goose.moodTime / length;
    if (chewing) goose.releasedAt = -1;
    if (goose.fake && goose.moodTime >= length * 0.55) {
      goose.suspicion = goose.threshold * 0.6;
      rollThreshold(game);
      setMood(goose, chewing ? 'creep' : 'idle');
      events.push({ type: 'fakeout' });
    } else if (goose.moodTime >= length) {
      if (chewing) {
        setMood(goose, 'strike');
        game.phase = 'over';
        events.push({ type: 'strike' });
        return events;
      }
      goose.suspicion *= 0.35;
      rollThreshold(game);
      setMood(goose, 'innocent', range(game.rand, 1.1, 1.6));
      // Letting go at the last moment pays: greed rewarded, once you survive it.
      const close = goose.releasedAt >= CLOSE_CALL;
      game.streak += 1;
      if (close) {
        const bonus = CLOSE_BONUS * (game.golden ? 2 : 1);
        game.score += bonus;
        events.push({ type: 'innocent', close: true, bonus, streak: game.streak });
      } else {
        events.push({ type: 'innocent', close: false, bonus: 0, streak: game.streak });
      }
    }
    return events;
  }

  if (chewing) {
    goose.suspicion += dt * game.temper.irritability * (1 + closeness * 0.9);
  } else {
    goose.suspicion = Math.max(0, goose.suspicion - dt * 0.35);
  }

  if (goose.mood === 'innocent') {
    if (goose.moodTime >= goose.moodLength) setMood(goose, chewing ? 'creep' : 'idle');
    return events;
  }

  if (chewing) {
    if (goose.mood !== 'creep') setMood(goose, 'creep');
    goose.dist = Math.max(NEAREST, goose.dist - game.temper.creep * dt);
    goose.walk = (goose.walk + dt / (STEP_INTERVAL * 2)) % 1;
    goose.stepClock += dt;
    if (goose.dist > NEAREST && goose.stepClock >= STEP_INTERVAL) {
      goose.stepClock = 0;
      events.push({ type: 'step' });
    }
  } else {
    if (goose.mood !== 'idle') setMood(goose, 'idle');
    goose.dist = Math.min(1, goose.dist + dt * 0.015);
  }

  if (goose.suspicion >= goose.threshold) {
    game.tells += 1;
    goose.fake = game.tells > 1 && game.rand() < game.temper.fakeoutChance;
    goose.releasedAt = chewing ? -1 : 0;
    setMood(goose, 'tell', tellLength(game));
    events.push({ type: 'tell' });
  }
  return events;
}
