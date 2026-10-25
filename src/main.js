import { createGame, step, rankFor, NEAREST, BITE_INTERVAL } from './game.js';
import { createScene, drawBackground, drawForeground, drawVignette, W, H, MAX_WORLD_W } from './render/scene.js';
import { createGooseAnimator, updateGoose, drawGoose, nudgeGoose } from './render/goose.js';
import { drawSandwich, drawHands, paintSandwich } from './render/sandwich.js';
import { createFx, burst, popText, shake, flash, updateFx, drawFx, shakeOffset } from './render/fx.js';
import { drawImpactFrame, drawCutIn, CUT_IN_LENGTH } from './render/honk.js';
import { PALETTE as P, lerp, clamp01, easeInOut, easeOut, makeCanvas } from './render/paint.js';
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

const STEP = 1 / 60;
const IMPACT = 0.2;
const CARD_AT = CUT_IN_LENGTH + 0.25;

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
  slowmo: 0,
  sandwichPop: 1,
  shownEaten: 0,
  gone: 0,
  best: loadBest(),
  newBest: false,
  cardShown: false,
  hintUntil: 0,
  view: { s: 1, ox: 0, oy: 0, k: 1, ww: W, dx: 0, wide: false },
  scene: null,
  demoDist: 0.62,
};

/* ---------- layout ---------- */

// The world is always 960 units tall. Its width follows the screen: a phone
// sees the 540-wide strip (plus extra sky if it is taller than 9:16), a
// desktop sees up to 1800 units of park.
function resize() {
  const rect = stage.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  const aspect = rect.width / Math.max(1, rect.height);
  const ww = Math.round(Math.max(W, Math.min(MAX_WORLD_W, aspect * H)));
  let s;
  let ox = 0;
  let oy = 0;
  if (aspect * H < W) {
    s = rect.width / W;
    oy = rect.height - H * s;
  } else {
    s = rect.height / H;
    ox = (rect.width - ww * s) / 2;
  }
  const k = Math.min(3, s * dpr);
  state.view = { s: s * dpr, ox: ox * dpr, oy: oy * dpr, k, ww, dx: (ww - W) / 2, wide: ww >= 900 };
  const sc = state.scene;
  if (!sc || Math.abs(sc.pixelScale - k) > 0.05 || sc.w !== ww) state.scene = createScene(11, k, ww);
  grain = null;
}

const sandwichPos = () => ({ x: state.view.dx + 352, y: 790 });

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

const buzz = (pattern) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {}
};

/* ---------- flow ---------- */

function startRun(options = {}) {
  audio.unlock();
  state.game = createGame(options);
  state.goose = createGooseAnimator();
  state.fx = createFx();
  state.screen = 'play';
  state.sandwichPop = 1;
  state.gone = 0;
  state.shownEaten = 0;
  state.newBest = false;
  state.cardShown = false;
  state.slowmo = 0;
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
    popText(state.fx, T.golden, state.view.ww / 2, 300, { size: 40, color: '#ffd54a', life: 1.6, rise: 30 });
    burst(state.fx, 'sparkles', state.view.ww / 2, 300, 14);
  }
}

function endRun() {
  const g = state.game;
  state.screen = 'over';
  state.overTime = 0;
  state.hitStop = IMPACT;
  state.slowmo = 0;
  if (g.score > state.best) {
    state.best = g.score;
    state.newBest = g.score > 0;
    saveBest(g.score);
  }
}

function showOverCard() {
  state.cardShown = true;
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
  const { dx, ww, wide } = state.view;
  const p = clamp01((1 - dist) / (1 - NEAREST));
  const e = easeInOut(p);
  const spot = { x: dx + lerp(122, 146, e), y: lerp(648, 842, e), scale: lerp(0.66, 1.22, e) };
  if (state.screen === 'over') {
    // After the theft the goose struts to centre stage with its prize. On a
    // wide screen the result card sits on the right, so it struts left of it.
    const k = easeInOut(clamp01((state.overTime - 0.35) / 0.6));
    const tx = wide ? Math.min(ww * 0.36, ww - 820) + 60 : dx + 196;
    spot.x = lerp(spot.x, tx, k);
    spot.y = lerp(spot.y, wide ? 840 : 764, k);
    spot.scale = lerp(spot.scale, wide ? 1.2 : 1.0, k);
  }
  return spot;
}

function handleEvents(events) {
  const g = state.game;
  const sw = sandwichPos();
  for (const ev of events) {
    audio.play(ev.type === 'innocent' && ev.close ? 'close' : ev.type);
    if (ev.type === 'bite') {
      const eaten = 1 - g.sandwich.left / g.sandwich.size;
      const bx = sw.x + lerp(118, -118, eaten);
      burst(state.fx, 'crumbs', bx, sw.y - 10, 7);
      if (Math.random() < 0.55) popText(state.fx, g.golden ? '+2' : '+1', bx + 10, sw.y - 90, { size: 26, color: g.golden ? '#ffd54a' : '#ffffff', life: 0.6, rise: 60, rot: (Math.random() - 0.5) * 0.4 });
      nudgeGoose(state.goose, 0.5);
      shake(state.fx, 1.6);
      buzz(6);
      bumpScore();
    } else if (ev.type === 'sandwich') {
      state.sandwichPop = 0;
      state.shownEaten = 0;
      burst(state.fx, 'sparkles', sw.x, sw.y - 30, 12);
      popText(state.fx, T.next, sw.x, sw.y - 150, { size: 38, color: '#ffd54a', life: 0.9, rise: 50, rot: -0.08 });
    } else if (ev.type === 'tell') {
      shake(state.fx, 3);
    } else if (ev.type === 'innocent') {
      if (ev.close) {
        // Frame-perfect greed: slow motion, a bonus and a streak.
        state.slowmo = 0.45;
        const cx = sw.x - 40;
        popText(state.fx, T.close, cx, sw.y - 250, { size: 44, color: '#ffd54a', life: 1.3, rise: 50, rot: -0.07 });
        popText(state.fx, '+' + ev.bonus, cx + 140, sw.y - 190, { size: 34, color: '#ffffff', life: 1.1, rise: 60, rot: 0.1 });
        burst(state.fx, 'sparkles', cx, sw.y - 230, 10);
        buzz(30);
        bumpScore();
      }
      if (ev.streak >= 3) {
        popText(state.fx, fill(T.streak, { n: ev.streak }), state.view.ww / 2, 260, { size: 30, color: '#ffffff', life: 1, rise: 30 });
      }
    } else if (ev.type === 'fakeout') {
      // The goose was only messing with you.
      const spot = gooseSpot(g.goose.dist);
      popText(state.fx, T.jk, spot.x + 150 * spot.scale, spot.y - 230 * spot.scale, { size: 30, color: '#ffffff', life: 0.9, rise: 40, rot: 0.1 });
    } else if (ev.type === 'strike') {
      const spot = gooseSpot(g.goose.dist);
      shake(state.fx, 30);
      flash(state.fx, 0.6);
      burst(state.fx, 'feathers', spot.x + 40, spot.y - 160 * spot.scale, 22);
      burst(state.fx, 'crumbs', sw.x, sw.y - 20, 24);
      buzz([90, 40, 260]);
      endRun();
    }
  }
}

function bumpScore() {
  const el = $('score');
  el.textContent = String(state.game.score);
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

function update(rawDt) {
  state.time += rawDt;
  const g = state.game;
  if (state.hitStop > 0) {
    state.hitStop -= rawDt;
    return;
  }
  state.slowmo = Math.max(0, state.slowmo - rawDt);
  const dt = state.slowmo > 0 ? rawDt * 0.35 : rawDt;
  if (state.screen === 'play' && g) handleEvents(step(g, dt, state.chewing));
  if (state.screen === 'over') {
    state.overTime += dt;
    if (!state.cardShown && state.overTime >= CARD_AT) showOverCard();
    // Smug chewing: crumbs fall from the beak now and then.
    if (state.overTime > CUT_IN_LENGTH && Math.random() < dt * 2.2) {
      const spot = gooseSpot(0);
      burst(state.fx, 'crumbs', spot.x + 150 * spot.scale, spot.y - 300 * spot.scale, 3);
    }
    state.gone = Math.min(1, state.gone + dt * 1.1);
  }
  state.sandwichPop = Math.min(1, state.sandwichPop + dt * 3.2);

  let mood = 'idle';
  let target = null;
  if (g && state.screen !== 'title') {
    mood = g.goose.mood;
    if (state.screen === 'over') mood = state.overTime < 0.12 ? 'strike' : 'victory';
    if (mood === 'strike') target = strikeTarget(gooseSpot(g.goose.dist));
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

function strikeTarget(spot) {
  const sw = sandwichPos();
  return { x: (sw.x - 30 - spot.x) / spot.scale, y: (sw.y - 40 - spot.y) / spot.scale - 30 };
}

/* ---------- rendering ---------- */

function camera() {
  const { ww } = state.view;
  const g = state.game;
  const dist = g && state.screen !== 'title' ? g.goose.dist : state.demoDist;
  const spot = gooseSpot(dist);
  const mood = state.goose.mood;
  const tellAmt = mood === 'tell' ? easeOut(clamp01(state.goose.moodTime / 0.25)) : 0;
  const suspicion = g && state.screen === 'play' ? clamp01(g.goose.suspicion / g.goose.threshold) : 0;
  const slow = state.slowmo > 0 ? Math.sin(clamp01(state.slowmo / 0.45) * Math.PI) : 0;
  const impact = state.screen === 'over' && state.hitStop > 0;
  // The frozen impact frame punches in hard on the goose's head.
  const zoom = impact ? 1.45 : 1 + tellAmt * 0.06 + slow * 0.05 + (state.screen === 'over' ? 0.04 * easeOut(clamp01(state.overTime * 3)) : 0);
  // Lean toward the goose, but never so far that the world's edge shows.
  const halfW = ww / (2 * zoom);
  const halfH = H / (2 * zoom);
  const lean = impact ? 1 : tellAmt * 0.5;
  const fx = Math.min(ww - halfW, Math.max(halfW, lerp(ww / 2, spot.x + (impact ? 200 : 90) * spot.scale, lean)));
  const fy = Math.min(H - halfH, Math.max(halfH, lerp(H / 2, spot.y - 150 * spot.scale, impact ? 1 : tellAmt * 0.4)));
  return { spot, mood, tellAmt, suspicion, zoom, fx, fy, tension: Math.max(tellAmt, suspicion * 0.35, slow * 0.3) };
}

function applyWorld(c, cam, sh) {
  const { s, ox, oy, ww } = state.view;
  c.setTransform(s, 0, 0, s, ox, oy);
  c.translate(ww / 2 + sh.x, H / 2 + sh.y);
  c.scale(cam.zoom, cam.zoom);
  c.translate(-cam.fx, -cam.fy);
}

function drawActors(c, cam) {
  const g = state.game;
  const t = state.time;
  const sw = sandwichPos();
  const golden = g ? g.golden && state.screen !== 'title' : false;
  drawGoose(c, state.goose, {
    x: cam.spot.x,
    y: cam.spot.y,
    scale: cam.spot.scale,
    time: t,
    walk: g ? g.goose.walk : 0,
    walking: cam.mood === 'creep',
    anger: state.screen === 'title' ? 0.25 : Math.max(cam.suspicion, cam.mood === 'tell' || cam.mood === 'strike' ? 1 : 0),
    golden,
    held: state.screen === 'over' && state.overTime > 0.1 ? heldSandwich : null,
  });
  return { sw, golden };
}

function drawHandsAndSandwich(c) {
  const g = state.game;
  const t = state.time;
  const sw = sandwichPos();
  const chewPhase = state.chewing && g ? g.biteClock / BITE_INTERVAL : 0;
  const lift = Math.sin(chewPhase * Math.PI) * 16;
  const eaten = state.shownEaten;
  const hy = sw.y - lift + Math.sin(t * 1.6) * 2;
  const handEaten = state.gone > 0 ? 0.5 : eaten;
  drawHands(c, { x: sw.x, y: hy, eaten: handEaten, gone: state.gone, time: t, layer: 'back' });
  if (state.screen !== 'over') {
    drawSandwich(c, { x: sw.x, y: hy, scale: 1 + Math.sin(chewPhase * Math.PI) * 0.035, eaten, k: state.view.k * 1.1, pop: state.sandwichPop });
  }
  drawHands(c, { x: sw.x, y: hy, eaten: handEaten, gone: state.gone, time: t, layer: 'front' });
}

function render() {
  const { s, oy } = state.view;
  const t = state.time;
  const cam = camera();
  const sh = shakeOffset(state.fx);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = P.skyTop;
  ctx.fillRect(0, 0, canvas.width, canvas.height / 2);
  ctx.fillStyle = P.groundNear;
  ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);

  ctx.save();
  applyWorld(ctx, cam, sh);
  // Taller-than-9:16 screens see more sky: the scene is anchored to the
  // bottom so hands and grass never float.
  ctx.fillStyle = P.skyTop;
  ctx.fillRect(-MAX_WORLD_W, -oy / s - 400, MAX_WORLD_W * 3, oy / s + 400);
  drawBackground(ctx, state.scene, t, 1);
  drawActors(ctx, cam);
  drawForeground(ctx, state.scene, t, 1);
  drawHandsAndSandwich(ctx);
  ctx.restore();

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawVignette(ctx, cam.tension, state.fx.flash, canvas.width, canvas.height);
  drawGrain(ctx);

  ctx.save();
  applyWorld(ctx, cam, sh);
  drawFx(ctx, state.fx);
  ctx.restore();

  if (state.screen === 'over') {
    if (state.hitStop > 0) {
      // Frozen time: a two-tone impact frame that flips every few frames.
      const invert = Math.floor((IMPACT - state.hitStop) * 22) % 2 === 1;
      const head = { x: cam.spot.x + 220 * cam.spot.scale, y: cam.spot.y - 140 * cam.spot.scale };
      const { s: vs, ox, oy: voy, ww } = state.view;
      drawImpactFrame(ctx, canvas.width, canvas.height, {
        invert,
        focus: { x: ox + vs * (ww / 2 + (head.x - cam.fx) * cam.zoom), y: voy + vs * (H / 2 + (head.y - cam.fy) * cam.zoom) },
        paint: (c) => {
          applyWorld(c, cam, { x: 0, y: 0 });
          drawActors(c, cam);
          drawHandsAndSandwich(c);
        },
      });
    } else {
      drawCutIn(ctx, canvas.width, canvas.height, state.overTime, { golden: state.game.golden });
    }
  }
}

function heldSandwich(c) {
  c.scale(0.3, 0.3);
  c.translate(60, 10);
  paintSandwich(c);
}

// Fine film grain: a pre-rendered noise tile, barely there, to take the
// digital edge off the flat colours.
let grain = null;
function drawGrain(c) {
  if (!grain) {
    const tile = makeCanvas(160, 160);
    const tctx = tile.getContext('2d');
    const img = tctx.createImageData(160, 160);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    tctx.putImageData(img, 0, 0);
    grain = c.createPattern(tile, 'repeat');
  }
  c.save();
  c.globalAlpha = 0.045;
  c.globalCompositeOperation = 'overlay';
  c.translate((Math.random() * 160) | 0, (Math.random() * 160) | 0);
  c.fillStyle = grain;
  c.fillRect(-160, -160, canvas.width + 160, canvas.height + 160);
  c.restore();
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
