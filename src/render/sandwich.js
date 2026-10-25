// The sandwich and the hands holding it. The sandwich is painted whole into a
// scratch canvas and then bitten: everything right of the bite line is cut
// away with a scalloped edge, and the cut is inked so it reads as teeth marks.
import { INK, PALETTE as P, inkUnder, makeCanvas, lerp, easeOutBack, clamp01 } from './paint.js';

const SW = 300;
const SH = 230;
let scratch = null;
let scratchScale = 0;

function scratchCanvas(k) {
  if (!scratch || scratchScale !== k) {
    scratch = makeCanvas(SW * k, SH * k);
    scratchScale = k;
  }
  return scratch;
}

export function paintSandwich(ctx) {
  // Bottom slice.
  const bottom = new Path2D();
  bottom.roundRect(-112, 26, 224, 36, [6, 6, 16, 16]);
  inkUnder(ctx, bottom, 4);
  ctx.fillStyle = '#d99a4e';
  ctx.fill(bottom);
  ctx.fillStyle = '#f6d9a0';
  ctx.beginPath();
  ctx.roundRect(-104, 30, 208, 22, [4, 4, 10, 10]);
  ctx.fill();

  // Lettuce, wavy and spilling past the bread.
  const lettuce = new Path2D();
  lettuce.moveTo(-124, 30);
  for (let i = 0; i <= 16; i++) {
    const x = lerp(-124, 124, i / 16);
    lettuce.quadraticCurveTo(x - 8, 46 + (i % 2) * 6, x, 32 + (i % 3) * 3);
  }
  lettuce.lineTo(124, 18);
  lettuce.lineTo(-124, 18);
  lettuce.closePath();
  inkUnder(ctx, lettuce, 3.5);
  ctx.fillStyle = '#7cc84a';
  ctx.fill(lettuce);
  ctx.strokeStyle = '#4f9a34';
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const x = -104 + i * 26;
    ctx.beginPath();
    ctx.moveTo(x, 22);
    ctx.quadraticCurveTo(x + 6, 30, x + 2, 38);
    ctx.stroke();
  }

  // Tomato slices peeking out.
  for (const x of [-78, -6, 66]) {
    const tom = new Path2D();
    tom.ellipse(x, 16, 34, 11, 0, 0, Math.PI * 2);
    inkUnder(ctx, tom, 3.5);
    ctx.fillStyle = '#ef4a3c';
    ctx.fill(tom);
    ctx.fillStyle = '#ff8a6e';
    ctx.beginPath();
    ctx.ellipse(x + 6, 13, 18, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd4a0';
    for (const dx of [-16, 0, 16]) {
      ctx.beginPath();
      ctx.ellipse(x + dx, 18, 3, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Cheese with drips.
  const cheese = new Path2D();
  cheese.moveTo(-118, -2);
  cheese.lineTo(118, -2);
  cheese.lineTo(118, 8);
  cheese.lineTo(96, 8);
  cheese.quadraticCurveTo(90, 30, 84, 8);
  cheese.lineTo(10, 8);
  cheese.quadraticCurveTo(2, 26, -6, 8);
  cheese.lineTo(-70, 8);
  cheese.quadraticCurveTo(-78, 34, -86, 8);
  cheese.lineTo(-118, 8);
  cheese.closePath();
  inkUnder(ctx, cheese, 3.5);
  ctx.fillStyle = '#ffc93c';
  ctx.fill(cheese);
  ctx.fillStyle = '#ffe58a';
  ctx.fillRect(-110, -1, 220, 3);

  // Ham.
  const ham = new Path2D();
  ham.moveTo(-120, -16);
  for (let i = 0; i <= 12; i++) {
    const x = lerp(-120, 120, i / 12);
    ham.quadraticCurveTo(x - 10, -24 + (i % 2) * 4, x, -18);
  }
  ham.lineTo(120, -2);
  ham.lineTo(-120, -2);
  ham.closePath();
  inkUnder(ctx, ham, 3.5);
  ctx.fillStyle = '#f39aa6';
  ctx.fill(ham);
  ctx.fillStyle = '#ffc4cb';
  ctx.fillRect(-112, -14, 224, 3);

  // Top slice: toast with a crust and a little shine.
  const top = new Path2D();
  top.roundRect(-114, -66, 228, 52, [26, 26, 8, 8]);
  inkUnder(ctx, top, 4);
  const g = ctx.createLinearGradient(0, -66, 0, -14);
  g.addColorStop(0, '#e6a556');
  g.addColorStop(1, '#c9843d');
  ctx.fillStyle = g;
  ctx.fill(top);
  ctx.fillStyle = '#f8dfaa';
  ctx.beginPath();
  ctx.roundRect(-102, -56, 204, 34, [20, 20, 6, 6]);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.beginPath();
  ctx.ellipse(40, -46, 34, 5, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(200, 140, 70, 0.35)';
  for (const [x, y] of [[-70, -36], [-40, -44], [-10, -32], [70, -30], [-84, -48], [20, -38]]) {
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Toothpick with an olive.
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-30, -40);
  ctx.lineTo(-34, -104);
  ctx.stroke();
  ctx.strokeStyle = '#f2dcae';
  ctx.lineWidth = 3.5;
  ctx.stroke();
  const olive = new Path2D();
  olive.ellipse(-33, -82, 12, 14, 0, 0, Math.PI * 2);
  inkUnder(ctx, olive, 3);
  ctx.fillStyle = '#6f9a2c';
  ctx.fill(olive);
  ctx.fillStyle = '#e8463a';
  ctx.beginPath();
  ctx.arc(-33, -86, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.ellipse(-28, -78, 2.5, 4, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Frilly top.
  ctx.fillStyle = '#ff5fa2';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(-34 + Math.cos(a) * 6, -108 + Math.sin(a) * 3, 5, 3, a, 0, Math.PI * 2);
    ctx.fill();
  }
}

// eaten: 0 = whole, 1 = gone. The bite line moves right to left.
export function drawSandwich(ctx, { x, y, scale = 1, eaten, k, pop = 1 }) {
  const c = scratchCanvas(k);
  const s = c.getContext('2d');
  s.setTransform(1, 0, 0, 1, 0, 0);
  s.clearRect(0, 0, c.width, c.height);
  s.setTransform(k, 0, 0, k, (SW / 2) * k, (SH / 2 + 20) * k);
  paintSandwich(s);

  if (eaten > 0.001) {
    const cut = lerp(124, -124, clamp01(eaten));
    const bites = [];
    for (let i = 0; i < 7; i++) bites.push([cut + 6 + (i % 2) * 10, -120 + i * 34 + ((i * 37) % 9), 24]);
    s.globalCompositeOperation = 'destination-out';
    s.fillRect(cut + 6, -200, 400, 400);
    for (const [bx, by, r] of bites) {
      s.beginPath();
      s.arc(bx, by, r, 0, Math.PI * 2);
      s.fill();
    }
    // Ink the bite edge only where sandwich remains.
    s.globalCompositeOperation = 'source-atop';
    s.strokeStyle = INK;
    s.lineWidth = 7;
    for (const [bx, by, r] of bites) {
      s.beginPath();
      s.arc(bx, by, r, 0, Math.PI * 2);
      s.stroke();
    }
    s.globalCompositeOperation = 'source-over';
  }

  const sc = scale * easeOutBack(clamp01(pop));
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sc, sc);
  ctx.drawImage(c, -SW / 2, -SH / 2 - 20, SW, SH);
  ctx.restore();
}

// Both hands. `gone` = the goose took the sandwich: hands fly open.
export function drawHands(ctx, { x, y, scale = 1, eaten, gone = 0, time, layer }) {
  const width = lerp(224, 40, clamp01(eaten));
  const left = { x: x - 112 * scale, y: y + 38 * scale, rot: -0.15 };
  const right = { x: x + (-112 + width - 18) * scale, y: y + 44 * scale, rot: 0.12 };
  if (gone > 0) {
    // Empty hands fly open in shock, then sink out of frame.
    const open = clamp01(gone * 2);
    const sink = clamp01(gone * 1.6 - 0.6) ** 2;
    const shake = Math.sin(time * 40) * 3 * (1 - sink);
    left.x -= 50 * open;
    left.y += 20 * open + shake + sink * 340;
    left.rot -= 0.6 * open;
    right.x = lerp(right.x, x + 130 * scale, open);
    right.y += 20 * open - shake + sink * 340;
    right.rot += 0.6 * open;
  }
  for (const [h, side] of [[left, -1], [right, 1]]) {
    if (layer === 'back') drawHandBack(ctx, h, side, scale);
    else drawThumb(ctx, h, side, scale, gone);
  }
}

function drawHandBack(ctx, h, side, scale) {
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.scale(scale, scale);
  ctx.rotate(h.rot);
  // Sleeve running off the bottom of the screen.
  const sleeve = new Path2D();
  sleeve.moveTo(-34, 30);
  sleeve.lineTo(34, 30);
  sleeve.lineTo(60 * side + 30, 360);
  sleeve.lineTo(60 * side - 70, 360);
  sleeve.closePath();
  inkUnder(ctx, sleeve, 4);
  ctx.fillStyle = P.sleeve;
  ctx.fill(sleeve);
  ctx.save();
  ctx.clip(sleeve);
  ctx.fillStyle = P.sleeveShade;
  ctx.beginPath();
  ctx.moveTo(-34 * side, 30);
  ctx.lineTo(-10 * side, 30);
  ctx.lineTo(60 * side - 30 * side, 360);
  ctx.lineTo(60 * side - 80 * side, 360);
  ctx.fill();
  ctx.restore();
  const cuff = new Path2D();
  cuff.roundRect(-38, 22, 76, 22, 8);
  inkUnder(ctx, cuff, 4);
  ctx.fillStyle = '#e8f1ef';
  ctx.fill(cuff);
  // Palm and fingers, mostly hidden behind the bread.
  const palm = new Path2D();
  palm.ellipse(0, 0, 36, 32, 0, 0, Math.PI * 2);
  for (let i = 0; i < 4; i++) palm.roundRect(-30 + i * 15 - (side < 0 ? 0 : 0), -54 + Math.abs(i - 1.5) * 5, 15, 40, 7);
  inkUnder(ctx, palm, 4);
  ctx.fillStyle = P.skin;
  ctx.fill(palm);
  ctx.save();
  ctx.clip(palm);
  ctx.fillStyle = P.skinShade;
  ctx.beginPath();
  ctx.ellipse(-14 * side, 18, 34, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

function drawThumb(ctx, h, side, scale, gone) {
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.scale(scale, scale);
  ctx.rotate(h.rot);
  const open = gone;
  ctx.translate(-side * 6, -8);
  ctx.rotate(side * (0.9 + open * 0.8));
  const thumb = new Path2D();
  thumb.roundRect(-9, -40, 19, 46, 9);
  inkUnder(ctx, thumb, 4);
  ctx.fillStyle = P.skin;
  ctx.fill(thumb);
  ctx.fillStyle = '#ffe1cc';
  ctx.beginPath();
  ctx.roundRect(-5, -36, 10, 12, 4);
  ctx.fill();
  ctx.restore();
}
