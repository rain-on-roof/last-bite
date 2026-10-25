// The park. Everything that never moves is painted once into two offscreen
// canvases (sky, land); only clouds, water, the duck, birds, leaves and grass
// are drawn per frame.
import { mulberry32, range } from '../rng.js';
import { INK, PALETTE as P, circle, ellipse, inkUnder, toonBlobs, softShadow, makeCanvas, lerp } from './paint.js';

export const W = 540;
export const H = 960;
export const HORIZON = 470;
export const POND = { x: 410, y: 552, rx: 210, ry: 46 };

export function createScene(seed, pixelScale) {
  const rand = mulberry32(seed ^ 0x9e3779b9);
  const scene = {
    pixelScale,
    sky: paintLayer(pixelScale, (ctx) => paintSky(ctx)),
    land: paintLayer(pixelScale, (ctx) => paintLand(ctx, mulberry32(seed))),
    clouds: makeClouds(rand, pixelScale),
    leaves: Array.from({ length: 5 }, (_, i) => ({ phase: i / 5 + rand() * 0.1, x: range(rand, 10, 230), sway: range(rand, 18, 40) })),
    blades: makeBlades(rand),
    duck: { x: POND.x - 70 },
  };
  return scene;
}

function paintLayer(k, paint) {
  const c = makeCanvas(W * k, H * k);
  const ctx = c.getContext('2d');
  ctx.scale(k, k);
  paint(ctx);
  return c;
}

/* ---------- sky ---------- */

function paintSky(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON);
  g.addColorStop(0, P.skyTop);
  g.addColorStop(0.55, P.skyMid);
  g.addColorStop(1, P.skyLow);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, HORIZON + 40);

  const sx = 400;
  const sy = 170;
  const glow = ctx.createRadialGradient(sx, sy, 10, sx, sy, 330);
  glow.addColorStop(0, 'rgba(255, 246, 207, 0.95)');
  glow.addColorStop(0.18, 'rgba(255, 236, 180, 0.55)');
  glow.addColorStop(0.5, 'rgba(255, 220, 160, 0.18)');
  glow.addColorStop(1, 'rgba(255, 220, 160, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, HORIZON + 40);

  ctx.fillStyle = P.sun;
  ctx.beginPath();
  ctx.arc(sx, sy, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.arc(sx, sy, 36, 0, Math.PI * 2);
  ctx.fill();
}

function makeClouds(rand, k) {
  const shapes = [
    [[0, 0, 34], [38, -16, 42], [82, -4, 36], [114, 8, 26], [-30, 10, 24], [50, 14, 34]],
    [[0, 0, 24], [28, -12, 30], [60, -2, 24], [-22, 6, 18], [36, 10, 22]],
    [[0, 0, 28], [34, -20, 36], [74, -10, 32], [104, 4, 22], [44, 10, 28], [-24, 8, 20]],
    [[0, 0, 18], [22, -8, 22], [46, 0, 18], [-14, 4, 12]],
  ];
  const placements = [
    { y: 92, speed: 5.5, scale: 1.0, x: 40 },
    { y: 210, speed: 3.6, scale: 0.85, x: 300 },
    { y: 300, speed: 2.4, scale: 0.7, x: 120 },
    { y: 150, speed: 4.4, scale: 0.75, x: 480 },
  ];
  return placements.map((pl, i) => {
    const blobs = shapes[i];
    const pad = 70;
    const minX = Math.min(...blobs.map(([x, , r]) => x - r)) - pad / 2;
    const minY = Math.min(...blobs.map(([, y, r]) => y - r)) - pad / 2;
    const maxX = Math.max(...blobs.map(([x, , r]) => x + r)) + pad / 2;
    const maxY = Math.max(...blobs.map(([, y, r]) => y + r)) + pad / 2;
    const w = (maxX - minX) * pl.scale;
    const h = (maxY - minY) * pl.scale;
    const c = makeCanvas(w * k, h * k);
    const ctx = c.getContext('2d');
    ctx.scale(k * pl.scale, k * pl.scale);
    ctx.translate(-minX, -minY);
    toonBlobs(ctx, blobs, {
      fill: '#ffffff',
      shade: '#d8e3f3',
      light: '#ffffff',
      glow: null,
      width: 3,
      ink: 'rgba(120, 140, 175, 0.55)',
      lx: 0.18,
      ly: -0.26,
    });
    return { canvas: c, w, h, y: pl.y, speed: pl.speed, x: pl.x + rand() * 40 };
  });
}

/* ---------- land ---------- */

function paintLand(ctx, rand) {
  paintHills(ctx);
  paintSkyline(ctx, rand);
  paintFarTrees(ctx, rand);
  paintGround(ctx, rand);
  paintFarTree(ctx);
  paintPond(ctx, rand);
  paintPath(ctx);
  paintBushes(ctx);
  paintFlowers(ctx, rand);
  paintBigTree(ctx);
  paintSign(ctx);
  paintLamp(ctx);
  paintBin(ctx);
}

function paintHills(ctx) {
  ctx.fillStyle = '#c9dcc0';
  ctx.beginPath();
  ctx.moveTo(0, HORIZON);
  ctx.bezierCurveTo(90, 395, 210, 400, 300, 440);
  ctx.bezierCurveTo(380, 410, 470, 400, W, 430);
  ctx.lineTo(W, HORIZON + 10);
  ctx.lineTo(0, HORIZON + 10);
  ctx.fill();
  ctx.fillStyle = P.hazeHills;
  ctx.beginPath();
  ctx.moveTo(0, HORIZON - 10);
  ctx.bezierCurveTo(120, 425, 230, 428, 330, 455);
  ctx.bezierCurveTo(420, 440, 480, 436, W, 450);
  ctx.lineTo(W, HORIZON + 10);
  ctx.lineTo(0, HORIZON + 10);
  ctx.fill();
}

function paintSkyline(ctx, rand) {
  const base = HORIZON - 4;
  let x = 96;
  const buildings = [];
  while (x < 450) {
    const w = range(rand, 18, 34);
    const h = range(rand, 34, 96) * (1 - Math.abs(x - 270) / 420);
    buildings.push({ x, w, h });
    x += w - 2;
  }
  // A tower with a spire gives the skyline a silhouette people remember.
  buildings.push({ x: 236, w: 22, h: 132, spire: true });
  for (const b of buildings) {
    ctx.fillStyle = P.skyline;
    ctx.fillRect(b.x, base - b.h, b.w, b.h);
    if (b.spire) {
      ctx.beginPath();
      ctx.moveTo(b.x + 4, base - b.h);
      ctx.lineTo(b.x + b.w / 2, base - b.h - 44);
      ctx.lineTo(b.x + b.w - 4, base - b.h);
      ctx.fill();
    }
    ctx.fillStyle = P.skylineLit;
    for (let wy = base - b.h + 8; wy < base - 8; wy += 11) {
      for (let wx = b.x + 4; wx < b.x + b.w - 6; wx += 7) {
        if (rand() < 0.35) ctx.fillRect(wx, wy, 3, 4);
      }
    }
  }
  // Haze over the city.
  const haze = ctx.createLinearGradient(0, base - 140, 0, base);
  haze.addColorStop(0, 'rgba(255, 236, 205, 0)');
  haze.addColorStop(1, 'rgba(255, 236, 205, 0.55)');
  ctx.fillStyle = haze;
  ctx.fillRect(80, base - 190, 400, 190);
}

function paintFarTrees(ctx, rand) {
  const blobs = [];
  for (let x = -10; x < W + 20; x += range(rand, 14, 24)) {
    blobs.push([x, HORIZON - range(rand, 4, 14), range(rand, 12, 22)]);
  }
  toonBlobs(ctx, blobs, {
    fill: P.farTrees,
    shade: '#6c9d6b',
    light: P.farTreesLight,
    width: 0,
    lx: 0.2,
    ly: -0.3,
  });
}

function paintGround(ctx, rand) {
  const g = ctx.createLinearGradient(0, HORIZON - 6, 0, H);
  g.addColorStop(0, P.groundFar);
  g.addColorStop(0.35, '#86c25c');
  g.addColorStop(1, P.groundNear);
  ctx.fillStyle = g;
  ctx.fillRect(0, HORIZON - 6, W, H - HORIZON + 6);

  // Soft mowing stripes that converge toward the horizon.
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = '#ffffff';
  for (let i = -6; i < 10; i += 2) {
    ctx.beginPath();
    ctx.moveTo(270 + i * 9, HORIZON);
    ctx.lineTo(270 + (i + 1) * 9, HORIZON);
    ctx.lineTo(270 + (i + 1) * 140, H);
    ctx.lineTo(270 + i * 140, H);
    ctx.fill();
  }
  ctx.restore();

  // Tufts: small v-strokes, bigger and denser near the camera.
  ctx.lineCap = 'round';
  for (let i = 0; i < 900; i++) {
    const t = rand() ** 0.7;
    const y = lerp(HORIZON + 6, H, t);
    const x = rand() * W;
    const s = lerp(1.2, 7, t);
    ctx.strokeStyle = rand() < 0.5 ? 'rgba(52, 120, 50, 0.45)' : 'rgba(170, 220, 110, 0.5)';
    ctx.lineWidth = lerp(0.8, 2, t);
    ctx.beginPath();
    ctx.moveTo(x - s * 0.6, y - s);
    ctx.lineTo(x, y);
    ctx.lineTo(x + s * 0.5, y - s * 1.1);
    ctx.stroke();
  }
}

function paintFarTree(ctx) {
  // Tree on the far bank, softened by distance.
  const x = 488;
  const base = 508;
  ctx.fillStyle = '#7d6250';
  ctx.beginPath();
  ctx.moveTo(x - 7, base);
  ctx.quadraticCurveTo(x - 4, base - 50, x - 2, base - 80);
  ctx.lineTo(x + 4, base - 80);
  ctx.quadraticCurveTo(x + 6, base - 50, x + 9, base);
  ctx.fill();
  toonBlobs(
    ctx,
    [
      [x - 40, base - 100, 34],
      [x, base - 128, 44],
      [x + 40, base - 104, 34],
      [x - 10, base - 84, 30],
      [x + 26, base - 150, 28],
      [x - 34, base - 140, 26],
    ],
    { fill: '#67a85d', shade: '#4e8a52', light: '#86c26c', glow: '#a5d683', width: 2.5, ink: '#41604a', lx: 0.22, ly: -0.3 },
  );
}

function pondPath() {
  const p = new Path2D();
  ellipse(p, POND.x, POND.y, POND.rx, POND.ry);
  return p;
}

function paintPond(ctx, rand) {
  const p = pondPath();
  // Muddy bank under the water edge.
  const bank = new Path2D();
  ellipse(bank, POND.x, POND.y + 5, POND.rx + 10, POND.ry + 9);
  ctx.fillStyle = '#7fae55';
  ctx.fill(bank);
  inkUnder(ctx, p, 2.5, '#3d6f4a');
  const g = ctx.createLinearGradient(0, POND.y - POND.ry, 0, POND.y + POND.ry);
  g.addColorStop(0, '#a9e2f2');
  g.addColorStop(0.45, P.water);
  g.addColorStop(1, P.waterDeep);
  ctx.fillStyle = g;
  ctx.fill(p);
  ctx.save();
  ctx.clip(p);
  // Reflection of the far tree and the sky glow.
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#4e8a52';
  ctx.beginPath();
  ctx.ellipse(488, POND.y - 22, 60, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#fff1c9';
  ctx.beginPath();
  ctx.ellipse(400, POND.y - 14, 90, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Lily pads.
  for (const [x, y, r] of [[300, 566, 11], [322, 574, 8], [520, 582, 12], [455, 590, 9]]) {
    const pad = new Path2D();
    pad.moveTo(x, y);
    pad.ellipse(x, y, r, r * 0.42, 0, 0.35, Math.PI * 2 - 0.1);
    pad.closePath();
    inkUnder(ctx, pad, 1.5, '#2f6a3c');
    ctx.fillStyle = '#5fae4f';
    ctx.fill(pad);
  }
  ctx.fillStyle = '#ff9ec4';
  ctx.beginPath();
  ctx.arc(522, 578, 3.4, 0, Math.PI * 2);
  ctx.fill();
  // Reeds and cattails on the near bank.
  ctx.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const x = range(rand, 470, 545);
    const y = range(rand, 586, 604);
    const h = range(rand, 22, 46);
    const bend = range(rand, -8, 8);
    ctx.strokeStyle = i % 3 ? '#4d8d3e' : '#6fae4f';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + bend * 0.3, y - h * 0.6, x + bend, y - h);
    ctx.stroke();
    if (i % 4 === 0) {
      ctx.fillStyle = '#7a4a2c';
      ctx.beginPath();
      ctx.ellipse(x + bend, y - h - 5, 3.2, 8, bend * 0.02, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function paintPath(ctx) {
  const p = new Path2D();
  p.moveTo(186, H);
  p.bezierCurveTo(220, 760, 300, 640, 268, 560);
  p.bezierCurveTo(258, 525, 270, 495, 286, HORIZON + 6);
  p.lineTo(298, HORIZON + 6);
  p.bezierCurveTo(296, 500, 300, 530, 324, 568);
  p.bezierCurveTo(380, 650, 420, 760, 520, H);
  p.closePath();
  inkUnder(ctx, p, 2.5, 'rgba(110, 90, 60, 0.55)');
  const g = ctx.createLinearGradient(0, HORIZON, 0, H);
  g.addColorStop(0, '#f6e4bf');
  g.addColorStop(1, P.path);
  ctx.fillStyle = g;
  ctx.fill(p);
  ctx.save();
  ctx.clip(p);
  ctx.fillStyle = 'rgba(214, 184, 132, 0.55)';
  for (let i = 0; i < 70; i++) {
    const t = i / 70;
    const y = lerp(HORIZON + 10, H, t ** 1.3);
    const x = lerp(290, 350, t) + Math.sin(i * 12.9898) * lerp(8, 120, t);
    const s = lerp(1, 6, t);
    ctx.beginPath();
    ctx.ellipse(x, y, s * 1.6, s * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function paintBushes(ctx) {
  const opts = { fill: P.leaf, shade: P.leafShade, light: P.leafLight, glow: P.leafGlow, width: 3 };
  toonBlobs(ctx, [[150, 500, 22], [180, 490, 28], [212, 500, 20], [128, 510, 16], [196, 510, 18]], opts);
  toonBlobs(ctx, [[18, 520, 26], [50, 512, 22], [-6, 530, 20]], opts);
}

function paintFlowers(ctx, rand) {
  const colors = ['#ffffff', '#ffe066', '#ff9fc8', '#ffb3a1'];
  for (let i = 0; i < 70; i++) {
    const t = rand() ** 0.8;
    const y = lerp(HORIZON + 30, 900, t);
    let x = rand() * W;
    if (Math.abs(x - lerp(292, 350, t)) < lerp(20, 150, t)) x = (x + W * 0.5) % W;
    const r = lerp(1.4, 4.6, t);
    ctx.fillStyle = colors[i % colors.length];
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7, r * 0.75, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffb627';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintBigTree(ctx) {
  const x = 62;
  const base = 612;
  softShadow(ctx, x + 20, base + 4, 120, 22, 0.3);
  const trunk = new Path2D();
  trunk.moveTo(x - 30, base + 4);
  trunk.quadraticCurveTo(x - 14, base - 10, x - 16, base - 120);
  trunk.quadraticCurveTo(x - 18, base - 230, x - 30, base - 300);
  trunk.lineTo(x + 6, base - 310);
  trunk.quadraticCurveTo(x + 12, base - 240, x + 30, base - 200);
  trunk.lineTo(x + 70, base - 260);
  trunk.lineTo(x + 78, base - 248);
  trunk.quadraticCurveTo(x + 30, base - 180, x + 20, base - 110);
  trunk.quadraticCurveTo(x + 22, base - 20, x + 44, base + 4);
  trunk.closePath();
  inkUnder(ctx, trunk, 4);
  ctx.fillStyle = P.trunk;
  ctx.fill(trunk);
  ctx.save();
  ctx.clip(trunk);
  ctx.fillStyle = P.trunkShade;
  ctx.fillRect(x - 40, base - 330, 34, 340);
  ctx.strokeStyle = 'rgba(60, 35, 20, 0.5)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const yy = base - 20 - i * 30;
    ctx.beginPath();
    ctx.moveTo(x - 6 + (i % 3) * 6, yy);
    ctx.quadraticCurveTo(x + 2, yy - 10, x - 2 + (i % 2) * 8, yy - 22);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255, 220, 160, 0.25)';
  ctx.fillRect(x + 12, base - 330, 30, 340);
  ctx.restore();
  // Knot hole.
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(x + 2, base - 150, 6, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  toonBlobs(
    ctx,
    [
      [x - 40, 250, 70],
      [x + 40, 200, 80],
      [x + 130, 240, 62],
      [x + 150, 315, 46],
      [x + 90, 330, 56],
      [x + 10, 340, 60],
      [x - 60, 330, 50],
      [x - 20, 150, 60],
      [x + 80, 130, 54],
      [x + 160, 180, 40],
      [x + 50, 270, 60],
    ],
    { fill: P.leaf, shade: P.leafShade, light: P.leafLight, glow: P.leafGlow, width: 4, lx: 0.2, ly: -0.28 },
  );
  // A few leaf clusters that break the silhouette.
  ctx.fillStyle = P.leafShade;
  for (const [lx, ly] of [[x + 196, 236], [x + 184, 300], [x - 96, 300], [x + 120, 380]]) {
    leafShape(ctx, lx, ly, 9, 0.6);
  }
}

function leafShape(ctx, x, y, s, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const p = new Path2D();
  p.moveTo(-s, 0);
  p.quadraticCurveTo(0, -s * 0.8, s, 0);
  p.quadraticCurveTo(0, s * 0.8, -s, 0);
  inkUnder(ctx, p, 1.6);
  ctx.fill(p);
  ctx.restore();
}

function paintSign(ctx) {
  const x = 236;
  const base = 618;
  softShadow(ctx, x + 6, base + 2, 30, 7, 0.3);
  const post = new Path2D();
  post.rect(x - 5, base - 84, 10, 86);
  inkUnder(ctx, post, 3);
  ctx.fillStyle = P.woodShade;
  ctx.fill(post);

  const bw = 126;
  const bh = 74;
  const bx = x - bw / 2;
  const by = base - 84 - bh;
  const board = new Path2D();
  board.roundRect(bx, by, bw, bh, 10);
  inkUnder(ctx, board, 3.5);
  ctx.fillStyle = P.wood;
  ctx.fill(board);
  const face = new Path2D();
  face.roundRect(bx + 6, by + 6, bw - 12, bh - 12, 6);
  ctx.fillStyle = '#fff8ea';
  ctx.fill(face);

  // Goose with bread, crossed out.
  const cx = bx + 30;
  const cy = by + 36;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(cx - 2, cy + 6, 11, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.moveTo(cx + 6, cy + 2);
  ctx.quadraticCurveTo(cx + 12, cy - 6, cx + 6, cy - 12);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 6, cy - 13);
  ctx.lineTo(cx + 14, cy - 11);
  ctx.stroke();
  ctx.fillStyle = '#e9b46a';
  ctx.fillRect(cx + 12, cy + 4, 9, 7);
  ctx.strokeStyle = '#e2453c';
  ctx.lineWidth = 3.6;
  ctx.beginPath();
  ctx.arc(cx + 2, cy, 19, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 11, cy + 13);
  ctx.lineTo(cx + 15, cy - 13);
  ctx.stroke();

  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 10.5px "Arial Black", "Segoe UI Black", system-ui, sans-serif';
  ctx.fillText('DO NOT', bx + 89, by + 25);
  ctx.fillText('FEED THE', bx + 89, by + 38);
  ctx.fillText('GEESE', bx + 89, by + 51);
}

function paintLamp(ctx) {
  const x = 472;
  const base = 664;
  softShadow(ctx, x + 8, base + 2, 34, 8, 0.32);
  const pole = new Path2D();
  pole.moveTo(x - 12, base);
  pole.lineTo(x - 8, base - 26);
  pole.lineTo(x - 4, base - 30);
  pole.lineTo(x - 3.5, base - 270);
  pole.lineTo(x + 3.5, base - 270);
  pole.lineTo(x + 4, base - 30);
  pole.lineTo(x + 8, base - 26);
  pole.lineTo(x + 12, base);
  pole.closePath();
  inkUnder(ctx, pole, 3);
  ctx.fillStyle = P.metal;
  ctx.fill(pole);
  ctx.fillStyle = P.metalLight;
  ctx.fillRect(x + 0.5, base - 268, 2, 238);

  const top = base - 270;
  const lamp = new Path2D();
  lamp.moveTo(x - 14, top);
  lamp.lineTo(x - 18, top - 40);
  lamp.lineTo(x + 18, top - 40);
  lamp.lineTo(x + 14, top);
  lamp.closePath();
  const roof = new Path2D();
  roof.moveTo(x - 24, top - 40);
  roof.lineTo(x, top - 60);
  roof.lineTo(x + 24, top - 40);
  roof.closePath();
  inkUnder(ctx, lamp, 3);
  inkUnder(ctx, roof, 3);
  const glass = ctx.createLinearGradient(0, top - 40, 0, top);
  glass.addColorStop(0, '#fff3c4');
  glass.addColorStop(1, '#ffd27a');
  ctx.fillStyle = glass;
  ctx.fill(lamp);
  ctx.fillStyle = P.metal;
  ctx.fill(roof);
  ctx.fillRect(x - 1.5, top - 40, 3, 40);
  ctx.beginPath();
  ctx.arc(x, top - 63, 4, 0, Math.PI * 2);
  ctx.fill();
}

function paintBin(ctx) {
  const x = 512;
  const base = 676;
  softShadow(ctx, x + 4, base + 2, 26, 6, 0.3);
  const bin = new Path2D();
  bin.moveTo(x - 20, base - 52);
  bin.lineTo(x + 20, base - 52);
  bin.lineTo(x + 16, base);
  bin.lineTo(x - 16, base);
  bin.closePath();
  inkUnder(ctx, bin, 3);
  ctx.fillStyle = '#3f8a5c';
  ctx.fill(bin);
  ctx.save();
  ctx.clip(bin);
  ctx.fillStyle = '#2f6e48';
  for (let i = -16; i < 20; i += 9) ctx.fillRect(x + i, base - 52, 3.5, 52);
  ctx.restore();
  const rim = new Path2D();
  rim.roundRect(x - 23, base - 58, 46, 8, 3);
  inkUnder(ctx, rim, 2.5);
  ctx.fillStyle = '#4fa36d';
  ctx.fill(rim);
}

/* ---------- per frame ---------- */

function makeBlades(rand) {
  const blades = [];
  for (let i = 0; i < 70; i++) {
    blades.push({
      x: range(rand, -10, W + 10),
      y: range(rand, 900, H + 10),
      h: range(rand, 18, 42),
      lean: range(rand, -6, 6),
      phase: rand() * Math.PI * 2,
      dark: rand() < 0.45,
    });
  }
  return blades.sort((a, b) => a.y - b.y);
}

export function drawBackground(ctx, scene, t, wind = 1) {
  ctx.drawImage(scene.sky, 0, 0, W, H);
  drawSunRays(ctx, t);
  for (const c of scene.clouds) {
    const span = W + c.w + 40;
    const x = ((c.x + t * c.speed) % span) - c.w - 20;
    ctx.drawImage(c.canvas, x, c.y - c.h / 2, c.w, c.h);
  }
  drawBirds(ctx, t);
  ctx.drawImage(scene.land, 0, 0, W, H);
  drawWater(ctx, t);
  drawDuck(ctx, scene, t);
  drawLeaves(ctx, scene, t, wind);
  drawButterfly(ctx, t);
}

function drawSunRays(ctx, t) {
  ctx.save();
  ctx.translate(400, 170);
  ctx.rotate(t * 0.03);
  ctx.globalAlpha = 0.09 + Math.sin(t * 0.8) * 0.02;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 12; i++) {
    ctx.rotate((Math.PI * 2) / 12);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-18, -300);
    ctx.lineTo(18, -300);
    ctx.fill();
  }
  ctx.restore();
}

function drawBirds(ctx, t) {
  const cycle = 26;
  const k = (t % cycle) / cycle;
  if (k > 0.55) return;
  const x = lerp(-60, W + 60, k / 0.55);
  const y = 120 + Math.sin(k * 9) * 10;
  ctx.save();
  ctx.strokeStyle = 'rgba(43, 33, 49, 0.55)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (const [dx, dy, s] of [[0, 0, 1], [-22, 10, 0.8], [-16, -12, 0.7]]) {
    const flap = Math.sin(t * 9 + dx) * 4 * s;
    ctx.beginPath();
    ctx.moveTo(x + dx - 8 * s, y + dy - flap);
    ctx.quadraticCurveTo(x + dx - 3 * s, y + dy - 4 * s, x + dx, y + dy);
    ctx.quadraticCurveTo(x + dx + 3 * s, y + dy - 4 * s, x + dx + 8 * s, y + dy - flap);
    ctx.stroke();
  }
  ctx.restore();
}

function drawWater(ctx, t) {
  ctx.save();
  const p = new Path2D();
  ellipse(p, POND.x, POND.y, POND.rx - 2, POND.ry - 2);
  ctx.clip(p);
  ctx.strokeStyle = P.waterLight;
  ctx.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const row = i % 5;
    const y = POND.y - 30 + row * 14 + Math.sin(t * 1.3 + i) * 1.5;
    const span = 260;
    const x = POND.x - 200 + ((i * 53 + t * (10 + row * 3)) % span) * 1.6;
    const len = 10 + (i % 3) * 8;
    ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 2 + i * 1.7) ** 2;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDuck(ctx, scene, t) {
  const x = scene.duck.x + Math.sin(t * 0.25) * 40;
  const y = POND.y + 6 + Math.sin(t * 2.1) * 1.2;
  const dir = Math.cos(t * 0.25) >= 0 ? 1 : -1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir * 0.9, 0.9);
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = P.waterDeep;
  ctx.beginPath();
  ctx.ellipse(0, 5, 22, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  const body = new Path2D();
  body.moveTo(-18, -4);
  body.quadraticCurveTo(-20, 6, -4, 6);
  body.lineTo(12, 6);
  body.quadraticCurveTo(20, 2, 14, -6);
  body.quadraticCurveTo(0, -12, -18, -4);
  const head = new Path2D();
  circle(head, 11, -14, 7);
  inkUnder(ctx, body, 2);
  inkUnder(ctx, head, 2);
  ctx.fillStyle = '#ffd84a';
  ctx.fill(body);
  ctx.fill(head);
  ctx.fillStyle = '#f2b51f';
  ctx.beginPath();
  ctx.ellipse(-4, 1, 9, 3.5, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f7932b';
  ctx.beginPath();
  ctx.moveTo(17, -15);
  ctx.lineTo(24, -12);
  ctx.lineTo(17, -10);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(13, -16, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLeaves(ctx, scene, t, wind) {
  for (const leaf of scene.leaves) {
    const k = (t * 0.07 + leaf.phase) % 1;
    const y = lerp(320, 640, k);
    const x = leaf.x + Math.sin(k * 12 + leaf.phase * 9) * leaf.sway + k * 60 * wind;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (1 - k) * 4, k * 8);
    ctx.fillStyle = k * 10 % 2 < 1 ? P.leafLight : '#d7b54a';
    leafShape(ctx, x, y, 6, Math.sin(k * 20 + leaf.phase) * 1.4);
    ctx.restore();
  }
}

function drawButterfly(ctx, t) {
  const x = 390 + Math.sin(t * 0.6) * 90 + Math.sin(t * 1.7) * 14;
  const y = 650 + Math.sin(t * 0.9) * 40 + Math.cos(t * 2.3) * 10;
  const flap = Math.abs(Math.sin(t * 14));
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#ff8fb8';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * 5 * flap, -2, 6 * flap + 1, 5, s * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = INK;
  ctx.fillRect(-1, -6, 2, 9);
  ctx.restore();
}

export function drawForeground(ctx, scene, t, wind = 1) {
  ctx.lineCap = 'round';
  for (const b of scene.blades) {
    const sway = Math.sin(t * 1.8 + b.phase + b.x * 0.01) * 5 * wind + b.lean;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.quadraticCurveTo(b.x + sway * 0.3, b.y - b.h * 0.6, b.x + sway, b.y - b.h);
    ctx.stroke();
    ctx.strokeStyle = b.dark ? P.grassDark : P.grassLight;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

export function drawVignette(ctx, tension, flash = 0) {
  const g = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.25, W / 2, H * 0.55, H * 0.75);
  g.addColorStop(0, 'rgba(40, 10, 20, 0)');
  g.addColorStop(1, `rgba(40, 10, 20, ${0.18 + tension * 0.45})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  if (tension > 0) {
    ctx.fillStyle = `rgba(255, 60, 60, ${tension * 0.08})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (flash > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${flash})`;
    ctx.fillRect(0, 0, W, H);
  }
}
