// draw(canvas, snapshot, opts): the one renderer behind the live preview and the export.

import { frame, layout, FONT_BODY as F, FONT_HEAD as HF, PAD } from './layout.js';
import { drawAdjusted } from './adjust.js';
import { drawDecor } from './decor.js';

// One reusable offscreen canvas for the Blend fade (drawing is synchronous).
let fadeCanvas = null;

function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/**
 * opts.dragKey: slot highlighted as a drop target (preview only)
 * opts.focusKey: slot outlined for keyboard framing (preview only)
 * Returns the cells, for hit-testing.
 */
export function draw(cv, s, opts = {}) {
  const fr = frame(s);
  const { W, H, lines, area } = fr;
  if (cv.width !== W) cv.width = W;
  if (cv.height !== H) cv.height = H;
  const c = cv.getContext('2d');
  c.fillStyle = '#FFFFFF';
  c.fillRect(0, 0, W, H);

  const L = layout(s, area);

  if (s.decor) {
    const keepOut = [{ x: 0, y: fr.footTop, w: W, h: H - fr.footTop }];
    if (L.head) keepOut.push({ x: PAD, y: L.head.y, w: W - PAD * 2, h: L.head.h });
    drawDecor(c, W, H, L.cells, keepOut);
  }

  if (L.head) {
    const general = s.presetId === 'general';
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
    if (!general) {
      c.font = '700 22px ' + F;
      c.fillStyle = '#8458DD';
      c.fillText('BEFORE & AFTER', PAD, L.head.y + 26);
    }
    c.font = '800 66px ' + HF;
    c.fillStyle = '#1C1430';
    c.fillText(general ? 'Before & after' : s.presetName, PAD, L.head.y + L.head.h - 34, W - PAD * 2);
  }

  const ph = { before: [s.before, s.labelB], after: [s.after, s.labelA] };
  L.cells.slice().sort((a, b) => (a.z || 0) - (b.z || 0)).forEach(cell => {
    const [p, label] = ph[cell.key];
    if (!cell.fade) return drawCell(c, cell, p, label, opts);
    // Blend: render the after photo offscreen, fade it in with destination-in.
    const t = fadeCanvas || (fadeCanvas = document.createElement('canvas'));
    if (t.width !== W) t.width = W;
    if (t.height !== H) t.height = H;
    const tc = t.getContext('2d');
    tc.globalCompositeOperation = 'source-over';
    tc.clearRect(0, 0, W, H);
    drawCell(tc, { ...cell, wm: false, noLabel: true }, p, label, opts);
    const v = cell.fade === 'v';
    const g = v
      ? tc.createLinearGradient(0, cell.y + cell.h * .4, 0, cell.y + cell.h * .6)
      : tc.createLinearGradient(cell.x + cell.w * .4, 0, cell.x + cell.w * .6, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,1)');
    tc.globalCompositeOperation = 'destination-in';
    tc.fillStyle = g;
    tc.fillRect(0, 0, W, H);
    c.drawImage(t, 0, 0);
    drawCell(c, { ...cell, skipPhoto: true }, p, label, opts);
  });

  if (L.divider) {
    c.save();
    c.strokeStyle = '#fff';
    c.lineWidth = 10;
    c.beginPath();
    c.moveTo(...L.divider[0]);
    c.lineTo(...L.divider[1]);
    c.stroke();
    c.restore();
  }

  if (opts.focusKey) {
    const cell = L.cells.find(x => x.key === opts.focusKey);
    if (cell) {
      c.save();
      c.strokeStyle = '#9666E9';
      c.lineWidth = 6;
      if (cell.hit || cell.poly) {
        c.beginPath();
        (cell.hit || cell.poly).forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
        c.closePath();
      } else {
        rr(c, cell.x - 3, cell.y - 3, cell.w + 6, cell.h + 6, (cell.r || 0) + 3);
      }
      c.stroke();
      c.restore();
    }
  }

  c.textAlign = 'center';
  c.textBaseline = 'middle';
  let y = fr.footTop + 26;
  lines.forEach(l => {
    c.font = l.font;
    c.fillStyle = l.color;
    c.fillText(l.t, W / 2, y + l.h / 2, W - PAD * 2);
    y += l.h;
  });

  return L.cells;
}

function drawCell(c, cell, p, label, opts) {
  const { x, y, w, h } = cell, r = cell.r == null ? 14 : cell.r, fr = cell.frame;
  c.save();
  if (cell.rot) {
    const cx = x + w / 2, cy = y + h / 2 + (fr ? (fr.b - fr.p) / 2 : 0);
    c.translate(cx, cy);
    c.rotate(cell.rot * Math.PI / 180);
    c.translate(-cx, -cy);
  }
  if (fr) {
    c.save();
    c.shadowColor = 'rgba(28,20,48,.16)'; c.shadowBlur = 28; c.shadowOffsetY = 10;
    c.fillStyle = '#fff';
    c.fillRect(x - fr.p, y - fr.p, w + 2 * fr.p, h + fr.p + fr.b);
    c.restore();
    c.strokeStyle = '#E6E1F2'; c.lineWidth = 1.5;
    c.strokeRect(x - fr.p, y - fr.p, w + 2 * fr.p, h + fr.p + fr.b);
  }
  if (cell.border) {
    const b = cell.border;
    c.save();
    c.shadowColor = 'rgba(28,20,48,.14)'; c.shadowBlur = 24; c.shadowOffsetY = 8;
    c.fillStyle = '#fff';
    rr(c, x - b, y - b, w + 2 * b, h + 2 * b, r + b);
    c.fill();
    c.restore();
  }

  c.save();
  if (cell.poly) {
    c.beginPath();
    cell.poly.forEach(([px, py], i) => i ? c.lineTo(px, py) : c.moveTo(px, py));
    c.closePath();
  } else {
    rr(c, x, y, w, h, r);
  }
  c.clip();
  if (!cell.skipPhoto) {
    c.fillStyle = '#F4F2FB';
    c.fillRect(x, y, w, h);
    if (!p) {
      const ctr = cell.ctr || (cell.poly
        ? cell.poly.reduce((a, q) => [a[0] + q[0] / cell.poly.length, a[1] + q[1] / cell.poly.length], [0, 0])
        : [x + w / 2, y + h / 2]);
      const sm = cell.small;
      if (opts.dragKey === cell.key) { c.fillStyle = '#ECE5FC'; c.fillRect(x, y, w, h); }
      c.textAlign = 'center'; c.textBaseline = 'middle';
      const R = sm ? 26 : 38, cy0 = ctr[1] - (sm ? 30 : 44);
      c.fillStyle = '#fff';
      c.beginPath(); c.arc(ctr[0], cy0, R, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#9666E9'; c.lineWidth = sm ? 3 : 4;
      const q = R * .42;
      c.beginPath();
      c.moveTo(ctr[0] - q, cy0); c.lineTo(ctr[0] + q, cy0);
      c.moveTo(ctr[0], cy0 - q); c.lineTo(ctr[0], cy0 + q);
      c.stroke();
      c.fillStyle = '#1C1430';
      c.font = '700 ' + (sm ? 22 : 30) + 'px ' + F;
      c.fillText((cell.key === 'before' ? 'Add before' : 'Add after') + ' photo', ctr[0], ctr[1] + (sm ? 14 : 18));
      if (!sm) {
        c.fillStyle = '#8b8499';
        c.font = '500 22px ' + F;
        c.fillText('Click or drop · JPG, PNG, WebP', ctr[0], ctr[1] + 56);
      }
    } else {
      const k = Math.max(w / p.w, h / p.h) * (p.zoom || 1), dw = p.w * k, dh = p.h * k;
      const tx = p.tx == null ? .5 : p.tx, ty = p.crop / 100;
      const dx = dw > w + .5 ? x - (dw - w) * tx : x + (w - dw) / 2;
      const dy = dh > h + .5 ? y - (dh - h) * ty : y + (h - dh) / 2;
      const ix = Math.max(x, dx), iy = Math.max(y, dy);
      const vis = { ix, iy, iw: Math.min(x + w, dx + dw) - ix, ih: Math.min(y + h, dy + dh) - iy };
      drawAdjusted(c, p.img, dx, dy, dw, dh, p.adj, vis);
    }
  }
  c.restore();

  if (cell.wm) {
    c.save();
    c.textAlign = 'right'; c.textBaseline = 'alphabetic';
    c.shadowColor = 'rgba(28,20,48,.35)'; c.shadowBlur = 8;
    c.fillStyle = 'rgba(255,255,255,.82)';
    const wmR = x + w - 22, wmY = y + h - 22;
    c.font = '800 28px ' + HF;
    const wmB = c.measureText('COSReady').width;
    c.fillText('COSReady', wmR, wmY);
    c.font = '500 24px ' + F;
    c.fillText('GlowReady by ', wmR - wmB, wmY);
    c.restore();
  }

  if (!cell.noLabel) {
    const base = cell.small ? 22 : 28;
    let size = base, text = label;
    const maxW = Math.min(w - 76, cell.poly ? 420 : 9999);
    c.font = '600 ' + size + 'px ' + F;
    while (c.measureText(text).width > maxW && size > 18) { size--; c.font = '600 ' + size + 'px ' + F; }
    if (c.measureText(text).width > maxW) {
      while (text.length > 1 && c.measureText(text + '…').width > maxW) text = text.slice(0, -1);
      text += '…';
    }
    const tw = c.measureText(text).width;
    if (cell.caption) {
      c.fillStyle = '#1C1430'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(text, x + w / 2, y + h + fr.b / 2 + 2);
    } else {
      const pw = tw + (cell.small ? 32 : 40), phh = size + (cell.small ? 18 : 24), at = cell.labelAt || 'tl';
      const lx = at === 'tr' ? x + w - 18 - pw : x + 18, ly = at === 'bl' ? y + h - 18 - phh : y + 18;
      c.fillStyle = 'rgba(255,255,255,.94)';
      rr(c, lx, ly, pw, phh, phh / 2);
      c.fill();
      c.fillStyle = '#1C1430'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(text, lx + pw / 2, ly + phh / 2 + 1);
    }
  }
  c.restore();
}
