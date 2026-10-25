import { createGame, step, rankFor, NEAREST, BITE_INTERVAL } from './game.js';
import { createScene, drawBackground, drawForeground, drawVignette, W, H } from './render/scene.js';
import { createGooseAnimator, updateGoose, drawGoose, nudgeGoose } from './render/goose.js';
import { drawSandwich, drawHands, paintSandwich } from './render/sandwich.js';
import { createFx, burst, popText, shake, flash, updateFx, drawFx, shakeOffset } from './render/fx.js';
import { PALETTE as P, lerp, clamp01, easeInOut, easeOut } from './render/paint.js';
import { createAudio } from './audio.js';
import { pickLocale, strings, fill, unit } from './i18n.js';
import { parseChallenge, challengeUrl, shareChallenge } from './share.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');
const stage = $('stage');

const locale = pickLocale();
const T = strings(locale);
document.documentElement.lang = locale;
const challenge = parseChallenge(location.hash);
const audio = createAudio();

const SANDWICH = { x: 352, y: 790 };
const STEP = 1 / 60;

const state = {
  screen: 'title',
  game: null,
  chewing: false,
  holding: false,
  goose: createGooseAnimator(),
  fx: createFx(),
  time: 0,
  overTime: 0,
  hitStop: 0,
  sandwichPop: 1,
  shownEaten: 0,
  gone: 0,
  best: loadBest(),
  newBest: false,
  hintUntil: 0,
  view: { s: 1, ox: 0, oy: 0, k: 1 },
  scene: null,
  demoDist: 0.62,
};

/* ---------- layout ---------- */

function resize() {
  const rect = stage.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  const s = Math.min(rect.width / W, rect.height / H);
  const k = Math.min(3, s * dpr);
  state.view = { s: s * dpr, ox: ((rect.width - W * s) / 2) * dpr, oy: (rect.height - H * s) * dpr, k };
  if (!state.scene || Math.abs(state.scene.pixelScale - k) > 0.05) state.scene = createScene(11, k);
}

/* ---------- text ---------- */

function applyStaticText() {
  $('tagline').textContent = T.tagline;
  $('hold-label').textContent = T.hold;
  $('by-title').textContent = T.by;
  $('by-over').textContent = T.by;
  $('again').textContent = T.again;
  $('dare').textContent = T.dare;
  $('mute').setAttribute('aria-label', T.sound);
  if (challenge) {
    $('challenge').textContent = fill(T.challenge, { n: challenge });
    $('challenge').hidden = false;
  }
}

function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (el.hidden = true), 1800);
}

/* ---------- flow ---------- */

function startRun(options = {}) {
  audio.unlock();
  state.game = createGame(options);
  state.goose = createGooseAnimator();
  state.goose.pose.hx += 0;
  state.fx = createFx();
  state.screen = 'play';
  state.sandwichPop = 1;
  state.gone = 0;
  state.shownEaten = 0;
  state.newBest = false;
  state.hintUntil = state.best < 15 ? state.time + 3.2 : 0;
  $('title').hidden = true;
  $('over').hidden = true;
  $('mute').hidden = false;
  $('hud').hidden = false;
  $('score').textContent = '0';
  const gold = $('golden-badge');
  gold.hidden = !state.game.golden;
  gold.textContent = T.golden;
  if (state.game.golden) {
    popText(state.fx, T.golden, W / 2, 300, { size: 40, color: '#ffd54a', life: 1.6, rise: 30 });
    burst(state.fx, 'sparkles', W / 2, 300, 14);
  }
}

function endRun() {
  const g = state.game;
  state.screen = 'over';
  state.overTime = 0;
  state.hitStop = 0.14;
  if (g.score > state.best) {
    state.best = g.score;
    state.newBest = g.score > 0;
    saveBest(g.score);
  }
  setTimeout(showOverCard, 1250);
}

function showOverCard() {
  if (state.screen !== 'over') return;
  const g = state.game;
  $('hud').hidden = true;
  $('hint').hidden = true;
  $('over-title').textContent = T.honk;
  $('over-line').textContent = T.lines[g.seed % T.lines.length];
  $('over-score').textContent = String(g.score);
  $('over-unit').textContent = unit(locale, g.score);
  $('over-rank').textContent = T.ranks[rankFor(g.score)];
  const best = $('over-best');
  best.textContent = fill(T.best, { n: state.best });
  if (state.newBest) {
    const tag = document.createElement('span');
    tag.className = 'new';
    tag.textContent = ' · ' + T.newBest;
    best.append(tag);
  }
  const vs = $('over-challenge');
  if (challenge) {
    const won = g.score > challenge;
    vs.textContent = won ? fill(T.won, { n: challenge }) : fill(T.lost, { d: challenge - g.score + 1, n: challenge });
    vs.className = 'vs ' + (won ? 'win' : 'lose');
    vs.hidden = false;
  }
  $('over').hidden = false;
  $('mute').hidden = true;
  $('again').focus({ preventScroll: true });
}

/* ---------- input ---------- */

function press() {
  if (state.holding) return;
  state.holding = true;
  audio.unlock();
  if (state.screen === 'title') startRun();
  if (state.screen === 'play') state.chewing = true;
}

function release() {
  state.holding = false;
  state.chewing = false;
}

stage.addEventListener('pointerdown', (e) => {
  if (e.target.closest('button, a')) return;
  if (state.screen === 'over') return;
  e.preventDefault();
  stage.setPointerCapture?.(e.pointerId);
  press();
});
stage.addEventListener('pointerup', release);
stage.addEventListener('pointercancel', release);
stage.addEventListener('lostpointercapture', release);
stage.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('blur', release);
document.addEventListener('visibilitychange', () => document.hidden && release());
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    if (state.screen === 'over') return;
    e.preventDefault();
    press();
  } else if (e.code === 'Enter' && state.screen === 'over' && !$('over').hidden) {
    e.preventDefault();
    $('again').click();
  }
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') release();
});

$('again').addEventListener('click', () => {
  audio.play('ui');
  startRun();
});

$('dare').addEventListener('click', async () => {
  audio.play('ui');
  const score = state.game ? state.game.score : 0;
  const result = await shareChallenge({ url: challengeUrl(score), text: fill(T.shareText, { n: score }), title: 'Last Bite' });
  if (result === 'copied') toast(T.copied);
});

$('mute').addEventListener('click', () => {
  audio.unlock();
  audio.setMuted(!audio.muted);
  $('mute').setAttribute('aria-pressed', String(audio.muted));
  try {
    localStorage.setItem('lastbite.muted', audio.muted ? '1' : '0');
  } catch {}
});

/* ---------- simulation ---------- */

function gooseSpot(dist) {
  const p = clamp01((1 - dist) / (1 - NEAREST));
  const e = easeInOut(p);
  const spot = { x: lerp(122, 146, e), y: lerp(648, 842, e), scale: lerp(0.66, 1.22, e) };
  if (state.screen === 'over') {
    // After the theft the goose struts to centre stage with its prize.
    const k = easeInOut(clamp01((state.overTime - 0.35) / 0.6));
    spot.x = lerp(spot.x, 196, k);
    spot.y = lerp(spot.y, 764, k);
    spot.scale = lerp(spot.scale, 1.0, k);
  }
  return spot;
}

function handleEvents(events) {
  const g = state.game;
  for (const ev of events) {
    audio.play(ev.type);
    if (ev.type === 'bite') {
      const eaten = 1 - g.sandwich.left / g.sandwich.size;
      const bx = SANDWICH.x + lerp(118, -118, eaten);
      burst(state.fx, 'crumbs', bx, SANDWICH.y - 10, 7);
      if (Math.random() < 0.55) popText(state.fx, g.golden ? '+2' : '+1', bx + 10, SANDWICH.y - 90, { size: 26, color: g.golden ? '#ffd54a' : '#ffffff', life: 0.6, rise: 60, rot: (Math.random() - 0.5) * 0.4 });
      nudgeGoose(state.goose, 0.5);
      shake(state.fx, 1.6);
      const el = $('score');
      el.textContent = String(g.score);
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
    } else if (ev.type === 'sandwich') {
      state.sandwichPop = 0;
      state.shownEaten = 0;
      burst(state.fx, 'sparkles', SANDWICH.x, SANDWICH.y - 30, 12);
      popText(state.fx, T.next, SANDWICH.x, SANDWICH.y - 150, { size: 38, color: '#ffd54a', life: 0.9, rise: 50, rot: -0.08 });
    } else if (ev.type === 'tell') {
      shake(state.fx, 3);
    } else if (ev.type === 'fakeout') {
      // The goose was only messing with you.
      const spot = gooseSpot(g.goose.dist);
      popText(state.fx, T.jk, spot.x + 150 * spot.scale, spot.y - 230 * spot.scale, { size: 30, color: '#ffffff', life: 0.9, rise: 40, rot: 0.1 });
    } else if (ev.type === 'strike') {
      const spot = gooseSpot(g.goose.dist);
      shake(state.fx, 24);
      flash(state.fx, 0.85);
      burst(state.fx, 'feathers', spot.x + 40, spot.y - 160 * spot.scale, 16);
      burst(state.fx, 'crumbs', SANDWICH.x, SANDWICH.y - 20, 18);
      popText(state.fx, 'HONK!', W / 2, 330, { size: 112, color: '#ffffff', life: 1.25, kind: 'honk', rot: -0.12 });
      endRun();
    }
  }
}

function update(dt) {
  state.time += dt;
  const g = state.game;
  if (state.hitStop > 0) {
    state.hitStop -= dt;
    updateFx(state.fx, dt * 0.15);
    return;
  }
  if (state.screen === 'play' && g) handleEvents(step(g, dt, state.chewing));
  if (state.screen === 'over') {
    state.overTime += dt;
    // Smug chewing: crumbs fall from the beak now and then.
    if (state.overTime > 1 && Math.random() < dt * 2.2) {
      const spot = gooseSpot(0);
      burst(state.fx, 'crumbs', spot.x + 150, spot.y - 300, 3);
    }
    state.gone = Math.min(1, state.gone + dt * 1.1);
  }
  state.sandwichPop = Math.min(1, state.sandwichPop + dt * 3.2);

  let mood = 'idle';
  let target = null;
  if (g && state.screen !== 'title') {
    mood = g.goose.mood;
    if (state.screen === 'over') mood = state.overTime < 0.32 ? 'strike' : 'victory';
    if (mood === 'strike') {
      const spot = gooseSpot(g.goose.dist);
      target = { x: (SANDWICH.x - 30 - spot.x) / spot.scale, y: (SANDWICH.y - 40 - spot.y) / spot.scale - 30 };
    }
  }
  updateGoose(state.goose, dt, { mood, time: state.time, strikeTarget: target });

  if (g) {
    const eaten = 1 - g.sandwich.left / g.sandwich.size;
    state.shownEaten += (eaten - state.shownEaten) * (1 - Math.exp(-dt * 18));
  }
  updateFx(state.fx, dt);

  const hint = $('hint');
  const showHint = state.screen === 'play' && state.time < state.hintUntil;
  if (showHint && hint.hidden) {
    hint.textContent = T.hint;
    hint.hidden = false;
  } else if (!showHint && !hint.hidden) hint.hidden = true;
}

/* ---------- rendering ---------- */

function render() {
  const { s, ox, oy, k } = state.view;
  const g = state.game;
  const t = state.time;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // Taller-than-9:16 screens see more sky instead of black bars: the scene
  // is anchored to the bottom so hands and grass never float.
  ctx.fillStyle = P.skyTop;
  ctx.fillRect(0, 0, canvas.width, canvas.height / 2);
  ctx.fillStyle = P.groundNear;
  ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);

  const dist = g && state.screen !== 'title' ? g.goose.dist : state.demoDist;
  const spot = gooseSpot(dist);
  const mood = state.goose.mood;
  const tellAmt = mood === 'tell' ? easeOut(clamp01(state.goose.moodTime / 0.25)) : 0;
  const suspicion = g && state.screen === 'play' ? clamp01(g.goose.suspicion / g.goose.threshold) : 0;
  const tension = Math.max(tellAmt, suspicion * 0.35);
  const zoom = 1 + tellAmt * 0.06 + (state.screen === 'over' ? 0.04 * easeOut(clamp01(state.overTime * 3)) : 0);
  // Lean toward the goose, but never so far that the world's edge shows.
  const halfW = W / (2 * zoom);
  const halfH = H / (2 * zoom);
  const focusX = Math.min(W - halfW, Math.max(halfW, lerp(W / 2, spot.x + 90 * spot.scale, tellAmt * 0.5)));
  const focusY = Math.min(H - halfH, Math.max(halfH, lerp(H / 2, spot.y - 150 * spot.scale, tellAmt * 0.4)));
  const sh = shakeOffset(state.fx);

  ctx.setTransform(s, 0, 0, s, ox, oy);
  ctx.save();
  ctx.translate(W / 2 + sh.x, H / 2 + sh.y);
  ctx.scale(zoom, zoom);
  ctx.translate(-focusX, -focusY);

  ctx.fillStyle = P.skyTop;
  ctx.fillRect(-W, -oy / s - 400, W * 3, oy / s + 400);
  ctx.fillStyle = P.groundNear;
  ctx.fillRect(-W, H - 2, W * 3, oy / s + 400);

  drawBackground(ctx, state.scene, t, 1);

  const walking = mood === 'creep';
  const golden = g ? g.golden && state.screen !== 'title' : false;
  const held = state.screen === 'over' && state.overTime > 0.3 ? heldSandwich : null;
  drawGoose(ctx, state.goose, {
    x: spot.x,
    y: spot.y,
    scale: spot.scale,
    time: t,
    walk: g ? g.goose.walk : 0,
    walking,
    anger: state.screen === 'title' ? 0.25 : Math.max(suspicion, mood === 'tell' || mood === 'strike' ? 1 : 0),
    golden,
    held,
  });

  drawForeground(ctx, state.scene, t, 1);

  const chewPhase = state.chewing && g ? (g.biteClock / BITE_INTERVAL) : 0;
  const lift = Math.sin(chewPhase * Math.PI) * 16;
  const eaten = state.shownEaten;
  const hx = SANDWICH.x;
  const hy = SANDWICH.y - lift + Math.sin(t * 1.6) * 2;
  const handScale = 1;
  drawHands(ctx, { x: hx, y: hy, scale: handScale, eaten: state.gone > 0 ? 0.5 : eaten, gone: state.gone, time: t, layer: 'back' });
  if (state.screen !== 'over') {
    drawSandwich(ctx, { x: hx, y: hy, scale: 1 + Math.sin(chewPhase * Math.PI) * 0.035, eaten, k: k * 1.1, pop: state.sandwichPop });
  }
  drawHands(ctx, { x: hx, y: hy, scale: handScale, eaten: state.gone > 0 ? 0.5 : eaten, gone: state.gone, time: t, layer: 'front' });

  ctx.restore();

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.save();
  ctx.scale(canvas.width / W, canvas.height / H);
  drawVignette(ctx, tension, state.fx.flash);
  ctx.restore();

  // Effects sit above the flash so HONK reads at full strength.
  ctx.setTransform(s, 0, 0, s, ox, oy);
  ctx.translate(W / 2 + sh.x, H / 2 + sh.y);
  ctx.scale(zoom, zoom);
  ctx.translate(-focusX, -focusY);
  drawFx(ctx, state.fx);
}

function heldSandwich(c) {
  c.scale(0.3, 0.3);
  c.translate(60, 10);
  paintSandwich(c);
}

/* ---------- loop ---------- */

const hooks = { state, startRun, press, release, frozen: false };
let last = performance.now();
let acc = 0;
function frame(now) {
  acc += Math.min(0.1, (now - last) / 1000);
  last = now;
  while (acc >= STEP) {
    if (!hooks.frozen) update(STEP);
    acc -= STEP;
  }
  render();
  requestAnimationFrame(frame);
}

/* ---------- storage ---------- */

function loadBest() {
  try {
    return Number(localStorage.getItem('lastbite.best')) || 0;
  } catch {
    return 0;
  }
}

function saveBest(n) {
  try {
    localStorage.setItem('lastbite.best', String(n));
  } catch {}
}

/* ---------- boot ---------- */

try {
  if (localStorage.getItem('lastbite.muted') === '1') {
    audio.setMuted(true);
    $('mute').setAttribute('aria-pressed', 'true');
  }
} catch {}

applyStaticText();
resize();
new ResizeObserver(resize).observe(stage);
requestAnimationFrame(frame);

// Test hook for screenshots and automated play; harmless in production.
window.__lastBite = hooks;
