// Decor layer: corner flourishes and a dot texture in the margins.
// Drawn over the white background and behind the photos. Vector primitives only,
// so it stays crisp at export size.

import { cellBounds } from './layout.js';

const VIOLET = '#9666E9';

export function drawDecor(c, W, H, cells, keepOut) {
  c.save();

  // 4 corner flourishes: quarter arcs, 3 px, radius 90, 18 px in from each corner,
  // bowed towards the corner like a frame bracket (keeps clear of the Magazine headline).
  const R = 90, inset = 18;
  c.strokeStyle = VIOLET;
  c.lineWidth = 3;
  c.lineCap = 'round';
  const a = inset + R;
  [
    [a, a, Math.PI, Math.PI * 1.5],
    [W - a, a, Math.PI * 1.5, Math.PI * 2],
    [W - a, H - a, 0, Math.PI / 2],
    [a, H - a, Math.PI / 2, Math.PI],
  ].forEach(([cx, cy, a0, a1]) => {
    c.beginPath();
    c.arc(cx, cy, R, a0, a1);
    c.stroke();
  });

  // Dot texture: 2.5 px dots on a 28 px grid at 18% opacity, margins only.
  const boxes = cells.map(cellBounds).concat(keepOut || []);
  const inside = (x, y) => boxes.some(b => x >= b.x - 6 && x <= b.x + b.w + 6 && y >= b.y - 6 && y <= b.y + b.h + 6);
  c.globalAlpha = 0.18;
  c.fillStyle = VIOLET;
  c.beginPath();
  for (let y = 14; y < H; y += 28) {
    for (let x = 14; x < W; x += 28) {
      if (inside(x, y)) continue;
      c.moveTo(x + 1.25, y);
      c.arc(x, y, 1.25, 0, Math.PI * 2);
    }
  }
  c.fill();
  c.restore();
}
