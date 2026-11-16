// node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { frame, layout, cellAt, minZoom, isSideBySide, W } from '../js/layout.js';
import { FORMATS, TEMPLATES, PRESETS, cropDefault } from '../js/presets.js';

const portrait = { w: 1500, h: 2000 };
const landscape = { w: 2000, h: 1500 };
const PAIRS = { empty: [null, null], portrait: [portrait, portrait], landscape: [landscape, landscape], mixed: [landscape, portrait] };

function snap(format, template, pair, extra = {}) {
  const [before, after] = PAIRS[pair];
  return { format, template, presetId: 'general', presetName: 'General', before, after,
    labelB: 'Before', labelA: 'After', studio: '', note: true, noteText: 'Individual results may vary.',
    example: false, ...extra };
}

for (const format of Object.keys(FORMATS)) {
  for (const [template] of TEMPLATES) {
    for (const pair of Object.keys(PAIRS)) {
      test(`${template} × ${format} × ${pair}: cells stay inside the photo area`, () => {
        const s = snap(format, template, pair, { studio: '@yourstudio' });
        const f = frame(s);
        assert.equal(f.W, 1080);
        assert.equal(f.H, FORMATS[format].h);
        assert.ok(f.area.h > 200, 'photo area too small');
        assert.ok(f.footTop + f.footH <= f.H + 0.001, 'footer is clipped');
        const L = layout(s, f.area);
        assert.equal(L.cells.length, 2);
        assert.deepEqual(L.cells.map(c => c.key).sort(), ['after', 'before']);
        for (const c of L.cells) {
          assert.ok(c.w > 0 && c.h > 0);
          if (c.frame) {
            // Polaroid frames stay inside the photo area.
            assert.ok(c.x - c.frame.p >= f.area.x - 1 && c.x + c.w + c.frame.p <= f.area.x + f.area.w + 1, `${c.key} frame spills sideways`);
            assert.ok(c.y - c.frame.p >= f.area.y - 1 && c.y + c.h + c.frame.b <= f.footTop + 1, `${c.key} frame spills vertically`);
          } else {
            // Photos stay inside the area; a white border may sit in the margin, never past the canvas or into the footer text.
            assert.ok(c.x >= f.area.x - 1 && c.x + c.w <= f.area.x + f.area.w + 1, `${c.key} spills sideways`);
            assert.ok(c.y >= f.area.y - 1 && c.y + c.h <= f.footTop + 1, `${c.key} spills vertically`);
            const b = c.border || 0;
            assert.ok(c.x - b >= 0 && c.x + c.w + b <= f.W && c.y - b >= 0, `${c.key} border leaves the canvas`);
            assert.ok(c.y + c.h + b <= f.footTop + 26, `${c.key} border reaches the footer text`);
          }
        }
      });
    }
  }
}

test('story always stacks; post/square sit side by side when either photo is portrait', () => {
  assert.equal(isSideBySide(snap('story', 'classic', 'portrait')), false);
  assert.equal(isSideBySide(snap('post', 'classic', 'empty')), true);
  assert.equal(isSideBySide(snap('post', 'classic', 'mixed')), true);
  assert.equal(isSideBySide(snap('square', 'classic', 'landscape')), false);
});

test('hit-testing: overlap and magazine hit the top photo, diagonal hits the right side', () => {
  for (const format of ['post', 'story']) {
    const so = snap(format, 'overlap', 'portrait'), fo = frame(so), Lo = layout(so, fo.area);
    const after = Lo.cells.find(c => c.key === 'after'), before = Lo.cells.find(c => c.key === 'before');
    // A point inside both cells belongs to the after photo (z = 1).
    const both = { x: Math.max(after.x, before.x) + 5, y: Math.max(after.y, before.y) + 5 };
    assert.equal(cellAt(Lo.cells, both).key, 'after');

    const sm = snap(format, 'magazine', 'portrait'), fm = frame(sm), Lm = layout(sm, fm.area);
    const inset = Lm.cells.find(c => c.key === 'before');
    assert.equal(cellAt(Lm.cells, { x: inset.x + 10, y: inset.y + 10 }).key, 'before');
  }
  const sd = snap('post', 'diagonal', 'portrait'), fd = frame(sd), Ld = layout(sd, fd.area);
  assert.equal(cellAt(Ld.cells, { x: fd.area.x + 20, y: fd.area.y + fd.area.h / 2 }).key, 'before');
  assert.equal(cellAt(Ld.cells, { x: fd.area.x + fd.area.w - 20, y: fd.area.y + fd.area.h / 2 }).key, 'after');
  const ss = snap('story', 'diagonal', 'portrait'), fs = frame(ss), Ls = layout(ss, fs.area);
  assert.equal(cellAt(Ls.cells, { x: W / 2, y: fs.area.y + 20 }).key, 'before');
  assert.equal(cellAt(Ls.cells, { x: W / 2, y: fs.area.y + fs.area.h - 20 }).key, 'after');
  assert.equal(cellAt(Ls.cells, { x: 5, y: 5 }), null);
});

test('blend hit areas are the two halves', () => {
  const s = snap('post', 'blend', 'portrait'), f = frame(s), L = layout(s, f.area);
  assert.equal(cellAt(L.cells, { x: f.area.x + 10, y: f.area.y + 10 }).key, 'before');
  assert.equal(cellAt(L.cells, { x: f.area.x + f.area.w - 10, y: f.area.y + 10 }).key, 'after');
});

test('footer height follows its lines', () => {
  const plain = frame(snap('post', 'classic', 'portrait', { note: false }));
  const full = frame(snap('post', 'classic', 'portrait', { studio: 'x' }));
  assert.equal(plain.footH, 26 + 32 + 24);
  assert.equal(full.footH, 26 + 50 + 38 + 32 + 24);
});

test('minZoom shows the whole photo', () => {
  const z = minZoom({ w: 2000, h: 1000 }, { w: 500, h: 500 });
  assert.equal(z, 0.5);
});

test('presets: the 19 service presets, labels fit 24 characters', () => {
  assert.equal(PRESETS.length, 19);
  assert.equal(PRESETS[0].id, 'general');
  for (const p of PRESETS) {
    assert.ok(p.b.length <= 24 && p.a.length <= 24, p.id);
  }
  assert.equal(cropDefault('general', 100, 200), 35);
  assert.equal(cropDefault('general', 200, 100), 50);
  assert.equal(cropDefault('nail', 100, 200), 50);
});
