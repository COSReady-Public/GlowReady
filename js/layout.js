// Template geometry. Pure functions: no DOM, so `node --test` can run them.
// The same cells drive drawing (render.js) and hit-testing (gestures.js).

import { FORMATS } from './presets.js';

export const W = 1080;
export const PAD = 42;
export const TOP = 42;
export const GAP = 14;

export const FONT_BODY = '"DM Sans", system-ui, -apple-system, sans-serif';
export const FONT_HEAD = '"Schibsted Grotesk", ' + FONT_BODY;

/** Footer lines, stacked bottom-up visually but listed top-down. */
export function footerLines(snap) {
  const lines = [];
  if (snap.studio) lines.push({ t: snap.studio, font: '700 34px ' + FONT_BODY, color: '#1C1430', h: 50 });
  if (snap.note) lines.push({ t: snap.noteText, font: '400 24px ' + FONT_BODY, color: '#544d63', h: 38 });
  lines.push({ t: (snap.example ? 'Example · ' : '') + 'Made with GlowReady · by COSReady', font: '500 20px ' + FONT_BODY, color: '#8b8499', h: 32 });
  return lines;
}

/** Canvas size, footer and the photo area for a snapshot. */
export function frame(snap) {
  const H = FORMATS[snap.format].h;
  const lines = footerLines(snap);
  const footH = 26 + lines.reduce((t, l) => t + l.h, 0) + 24;
  const areaH = H - TOP - footH;
  return { W, H, lines, footH, footTop: TOP + areaH, area: { x: PAD, y: TOP, w: W - PAD * 2, h: areaH } };
}

/** Side by side when either photo is portrait (or none is loaded); Story always stacks. */
export function isSideBySide(snap) {
  if (snap.format === 'story') return false;
  const loaded = [snap.before, snap.after].filter(Boolean);
  return loaded.length ? loaded.some(p => p.h > p.w) : true;
}

export function layout(snap, A, gap = GAP) {
  const K = ['before', 'after'];
  const story = snap.format === 'story';
  const side = isSideBySide(snap);
  const split = () => side
    ? [{ x: A.x, y: A.y, w: (A.w - gap) / 2, h: A.h }, { x: A.x + (A.w + gap) / 2, y: A.y, w: (A.w - gap) / 2, h: A.h }]
    : [{ x: A.x, y: A.y, w: A.w, h: (A.h - gap) / 2 }, { x: A.x, y: A.y + (A.h + gap) / 2, w: A.w, h: (A.h - gap) / 2 }];

  if (snap.template === 'polaroid') {
    const fp = 18, fb = 88, m = 26;
    return { cells: split().map((sl, i) => {
      let pw = sl.w - 2 * m - 2 * fp, ph = pw * 1.25;
      const mh = sl.h - 2 * m - fp - fb;
      if (ph > mh) { ph = mh; pw = ph / 1.25; }
      const ox = side ? 0 : (i ? 1 : -1) * Math.max(0, Math.min(70, (sl.w - pw) / 2 - fp - m));
      return { key: K[i], x: sl.x + (sl.w - pw) / 2 + ox, y: sl.y + (sl.h - ph - fp - fb) / 2 + fp, w: pw, h: ph,
        r: 0, rot: i ? 2.2 : -2.6, frame: { p: fp, b: fb }, caption: true, wm: true };
    }) };
  }

  if (snap.template === 'overlap') {
    const cw = A.w * .6, ch = A.h * .6;
    return { cells: [
      { key: 'before', x: A.x, y: A.y, w: cw, h: ch, r: 14 },
      { key: 'after', x: A.x + A.w - cw, y: A.y + A.h - ch, w: cw, h: ch, r: 14, border: 14, z: 1, wm: true },
    ] };
  }

  if (snap.template === 'diagonal') {
    const { x, y, w, h } = A;
    if (story) {
      const l = y + h * .58, r = y + h * .42;
      return { divider: [[x, l], [x + w, r]], cells: [
        { ...A, key: 'before', r: 0, poly: [[x, y], [x + w, y], [x + w, r], [x, l]] },
        { ...A, key: 'after', r: 0, poly: [[x, l], [x + w, r], [x + w, y + h], [x, y + h]], labelAt: 'bl', wm: true },
      ] };
    }
    const t = x + w * .6, b = x + w * .4;
    return { divider: [[t, y], [b, y + h]], cells: [
      { ...A, key: 'before', r: 0, poly: [[x, y], [t, y], [b, y + h], [x, y + h]] },
      { ...A, key: 'after', r: 0, poly: [[t, y], [x + w, y], [x + w, y + h], [b, y + h]], labelAt: 'tr', wm: true },
    ] };
  }

  if (snap.template === 'blend') {
    const { x, y, w, h } = A;
    if (story) return { cells: [
      { ...A, key: 'before', r: 14, ctr: [x + w / 2, y + h * .25], hit: [[x, y], [x + w, y], [x + w, y + h / 2], [x, y + h / 2]] },
      { ...A, key: 'after', r: 14, z: 1, wm: true, labelAt: 'bl', fade: 'v', ctr: [x + w / 2, y + h * .75], hit: [[x, y + h / 2], [x + w, y + h / 2], [x + w, y + h], [x, y + h]] },
    ] };
    return { cells: [
      { ...A, key: 'before', r: 14, ctr: [x + w * .25, y + h / 2], hit: [[x, y], [x + w / 2, y], [x + w / 2, y + h], [x, y + h]] },
      { ...A, key: 'after', r: 14, z: 1, wm: true, labelAt: 'tr', fade: 'h', ctr: [x + w * .75, y + h / 2], hit: [[x + w / 2, y], [x + w, y], [x + w, y + h], [x + w / 2, y + h]] },
    ] };
  }

  if (snap.template === 'magazine') {
    const headH = 132, hero = { x: A.x, y: A.y + headH, w: A.w, h: A.h - headH };
    let iw = A.w * .36, ih = iw * 1.25;
    if (ih > hero.h * .58) { ih = hero.h * .58; iw = ih / 1.25; }
    return { head: { y: A.y, h: headH }, cells: [
      { key: 'before', x: hero.x + 30, y: hero.y + hero.h - ih - 30, w: iw, h: ih, r: 10, border: 12, z: 1, small: true },
      { ...hero, key: 'after', r: 14, wm: true },
    ] };
  }

  // classic
  return { cells: split().map((c, i) => ({ ...c, key: K[i], r: 14, wm: true })) };
}

export function pointInPoly(P, q) {
  let o = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i], [xj, yj] = P[j];
    if ((yi > q.y) !== (yj > q.y) && q.x < (xj - xi) * (q.y - yi) / (yj - yi) + xi) o = !o;
  }
  return o;
}

/** The cell under a point: highest z first, `hit` polygon, then `poly`, then the rect. */
export function cellAt(cells, pt) {
  const sorted = (cells || []).slice().sort((a, b) => (b.z || 0) - (a.z || 0));
  return sorted.find(c => (c.hit || c.poly)
    ? pointInPoly(c.hit || c.poly, pt)
    : pt.x >= c.x && pt.x <= c.x + c.w && pt.y >= c.y && pt.y <= c.y + c.h) || null;
}

/** Zoom at which the whole photo is visible in the cell (zoom 1 = cover). */
export function minZoom(p, c) {
  return Math.min(c.w / p.w, c.h / p.h) / Math.max(c.w / p.w, c.h / p.h);
}

/** Axis-aligned bounds of a cell including its frame/border, for keeping decor out. */
export function cellBounds(c) {
  if (c.frame) {
    const { p, b } = c.frame, ext = 12; // rotation slack
    return { x: c.x - p - ext, y: c.y - p - ext, w: c.w + 2 * p + 2 * ext, h: c.h + p + b + 2 * ext };
  }
  const b = c.border || 0;
  return { x: c.x - b, y: c.y - b, w: c.w + 2 * b, h: c.h + 2 * b };
}
