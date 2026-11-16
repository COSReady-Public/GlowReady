// Boot and event wiring.

import { FORMATS, TEMPLATES, PRESETS, presetById, cropDefault } from './presets.js';
import { getState, setState, subscribe, updateSlot, snapshot, defaults } from './state.js';
import { validate, decodeFile, release, makeSample } from './decode.js';
import { draw } from './render.js';
import { attachGestures } from './gestures.js';
import { exportPNG, countExport } from './export.js';
import { ADJUSTMENTS, supportsCanvasFilter } from './adjust.js';

const $ = id => document.getElementById(id);
const KEYS = ['before', 'after'];
const other = k => (k === 'before' ? 'after' : 'before');

const cv = $('preview'), ghost = $('ghost'), stage = $('stage');
const rev = { before: 0, after: 0 };
let exportRev = 0;
let cells = [];
let samples = null;

/* ---------- photos ---------- */

function sampleSlot(kind, preset) {
  if (!samples) samples = { before: makeSample('before'), after: makeSample('after') };
  const s = samples[kind];
  return { ...s, crop: cropDefault(preset, s.w, s.h) };
}

function releaseSlot(slot) {
  if (slot && !slot.isSample) release(slot.img);
}

function setErr(key, msg) {
  setState(s => ({ errors: { ...s.errors, [key]: msg } }));
}

async function loadFile(key, file) {
  if (!file) return;
  const err = validate(file);
  if (err) return setErr(key, err);
  const r = ++rev[key];
  setState(s => ({ loading: { ...s.loading, [key]: true }, errors: { ...s.errors, [key]: null } }));
  let d;
  try {
    d = await decodeFile(file);
  } catch (e) {
    if (r !== rev[key]) return;
    setState(s => ({ loading: { ...s.loading, [key]: false }, errors: { ...s.errors, [key]: e.message } }));
    return;
  }
  if (r !== rev[key]) { release(d.img); return; } // a newer pick won
  setState(s => {
    releaseSlot(s[key]);
    const n = {
      [key]: { img: d.img, w: d.w, h: d.h, name: file.name, crop: cropDefault(s.preset, d.w, d.h), thumb: d.thumb, isSample: false },
      loading: { ...s.loading, [key]: false },
      exportStatus: 'idle', exportMsg: '',
    };
    // A real photo removes the sample from the other slot.
    if (s[other(key)] && s[other(key)].isSample) n[other(key)] = null;
    return n;
  });
}

function pick(key) {
  const i = $('file-' + key);
  i.value = '';
  i.click();
}

KEYS.forEach(key => {
  $('file-' + key).addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    if (f) loadFile(key, f);
  });
  const row = document.querySelector('.slot[data-slot="' + key + '"] .slot__btn');
  row.addEventListener('click', () => pick(key));
  row.addEventListener('dragover', e => { e.preventDefault(); if (getState().drag !== key) setState({ drag: key }); });
  row.addEventListener('dragleave', () => setState({ drag: null }));
  row.addEventListener('drop', e => {
    e.preventDefault();
    setState({ drag: null });
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) loadFile(key, f);
  });
});

$('try-example').addEventListener('click', () => {
  rev.before++; rev.after++;
  setState(s => {
    releaseSlot(s.before); releaseSlot(s.after);
    return { before: sampleSlot('before', s.preset), after: sampleSlot('after', s.preset),
      loading: { before: false, after: false }, errors: { before: null, after: null }, exportStatus: 'idle', exportMsg: '' };
  });
});

$('swap').addEventListener('click', () => setState(s => ({ before: s.after, after: s.before, exportStatus: 'idle', exportMsg: '' })));

$('clear').addEventListener('click', () => {
  rev.before++; rev.after++; exportRev++;
  const s = getState();
  releaseSlot(s.before); releaseSlot(s.after);
  setState(defaults());
  document.querySelector('.slot[data-slot="before"] .slot__btn').focus();
});

/* ---------- format / style ---------- */

const segBtn = (cls, id, label, extra) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  b.dataset.id = id;
  b.setAttribute('aria-pressed', 'false');
  if (extra) {
    b.innerHTML = '<span class="seg__label"></span><span class="seg__dims"></span>';
    b.children[0].textContent = label;
    b.children[1].textContent = extra;
  } else {
    b.textContent = label;
  }
  return b;
};
Object.entries(FORMATS).forEach(([id, f]) => {
  const b = segBtn('seg__btn', id, f.label, f.dims);
  b.addEventListener('click', () => setState({ format: id }));
  $('formats').appendChild(b);
});
TEMPLATES.forEach(([id, label]) => {
  const b = segBtn('style-btn', id, label);
  b.addEventListener('click', () => setState({ template: id }));
  $('styles').appendChild(b);
});

/* ---------- labels & details ---------- */

PRESETS.forEach(p => {
  const o = document.createElement('option');
  o.value = p.id;
  o.textContent = p.name;
  $('preset').appendChild(o);
});
$('preset').addEventListener('change', e => {
  const id = e.target.value;
  const reset = p => p && { ...p, zoom: 1, tx: .5, crop: cropDefault(id, p.w, p.h) };
  setState(s => ({ preset: id, before: reset(s.before), after: reset(s.after) }));
});
$('label-b').addEventListener('input', e => setState({ labelB: e.target.value.slice(0, 24) }));
$('label-a').addEventListener('input', e => setState({ labelA: e.target.value.slice(0, 24) }));
$('studio').addEventListener('input', e => setState({ studio: e.target.value.slice(0, 40) }));
$('note').addEventListener('click', () => setState(s => ({ note: !s.note })));
$('cust-toggle').addEventListener('click', () => setState(s => ({ custOpen: !s.custOpen })));
$('adj-toggle').addEventListener('click', () => setState(s => ({ adjOpen: !s.adjOpen })));

/* ---------- adjust ---------- */

// Safari < 18 has no ctx.filter; adjust.js then uses a per-pixel fallback.
supportsCanvasFilter();
const sliderEls = {};
ADJUSTMENTS.forEach(([id, label]) => {
  const wrap = document.createElement('label');
  wrap.className = 'slider';
  wrap.innerHTML = '<span class="slider__row"><span></span><span></span></span><input type="range" min="-50" max="50" step="1" value="0">';
  wrap.querySelector('.slider__row span').textContent = label;
  const input = wrap.querySelector('input');
  input.addEventListener('input', () => {
    const k = getState().adjTarget;
    const p = getState()[k];
    if (p) updateSlot(k, { adj: { ...(p.adj || {}), [id]: +input.value } });
  });
  input.addEventListener('dblclick', () => {
    const k = getState().adjTarget, p = getState()[k];
    if (p) updateSlot(k, { adj: { ...(p.adj || {}), [id]: 0 } });
  });
  sliderEls[id] = { wrap, input, value: wrap.querySelectorAll('.slider__row span')[1] };
  $('sliders').appendChild(wrap);
});
$('sliders').style.cssText = 'display:flex;flex-direction:column;gap:10px';
document.querySelectorAll('#adj-target .adj-seg__btn').forEach(b =>
  b.addEventListener('click', () => setState({ adjTarget: b.dataset.target })));
$('adj-copy').addEventListener('click', () => {
  const s = getState(), k = s.adjTarget, p = s[k];
  updateSlot(other(k), { adj: { ...((p && p.adj) || {}) } });
});
$('adj-reset').addEventListener('click', () => updateSlot(getState().adjTarget, { adj: {} }));

/* ---------- download ---------- */

function canDownload(s) {
  return !!(s.before && s.after && !s.loading.before && !s.loading.after && s.exportStatus !== 'preparing');
}

$('download').addEventListener('click', () => {
  const s = getState();
  if (!canDownload(s)) return;
  const r = ++exportRev, snap = snapshot(s); // never re-read live state mid-export
  setState({ exportStatus: 'preparing', exportMsg: 'Preparing PNG…' });
  setTimeout(() => {
    if (r !== exportRev) return;
    exportPNG(snap, () => r === exportRev).then(done => {
      if (!done || r !== exportRev) return;
      setState({ exportStatus: 'ready', exportMsg: 'PNG ready. Check your downloads.', showListing: true });
      countExport(snap);
    }, e => {
      if (r === exportRev) setState({ exportStatus: 'error', exportMsg: e.message });
    });
  }, 60);
});

/* ---------- canvas ---------- */

attachGestures(cv, { getCells: () => cells, pick, loadFile });

const reducedMotion = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
let anims = [];
let last = null;
let drawQueued = false;

function redraw() {
  const s = getState();
  cells = draw(cv, snapshot(s), { dragKey: s.cvDrag });
}

/** Style / format change: cross-fade from a ghost of the old frame. */
function transition() {
  anims.forEach(a => { a.onfinish = null; a.oncancel = null; a.cancel(); });
  anims = [];
  const r0 = cv.getBoundingClientRect(), w0 = stage.offsetWidth, h0 = stage.offsetHeight;
  ghost.width = cv.width; ghost.height = cv.height;
  ghost.getContext('2d').drawImage(cv, 0, 0);
  Object.assign(ghost.style, { width: r0.width + 'px', height: r0.height + 'px', display: 'block' });
  applyStageSize();
  redraw();
  const w1 = stage.offsetWidth, h1 = stage.offsetHeight, d = 300, ease = 'cubic-bezier(.2,.7,.2,1)';
  stage.style.overflow = 'hidden';
  const a1 = (w0 !== w1 || h0 !== h1)
    ? stage.animate([{ width: w0 + 'px', height: h0 + 'px' }, { width: w1 + 'px', height: h1 + 'px' }], { duration: d, easing: ease })
    : null;
  const a2 = ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: d * .75, easing: 'ease-out', fill: 'forwards' });
  const a3 = cv.animate([{ opacity: 0, transform: 'scale(.985)' }, { opacity: 1, transform: 'none' }], { duration: d, easing: ease });
  const done = () => { ghost.style.display = 'none'; stage.style.overflow = ''; };
  a3.onfinish = done;
  a3.oncancel = done;
  anims = [a1, a2, a3].filter(Boolean);
}

function applyStageSize() {
  const s = getState();
  stage.classList.toggle('is-story', s.format === 'story');
}

function scheduleDraw() {
  if (drawQueued) return;
  drawQueued = true;
  requestAnimationFrame(() => {
    drawQueued = false;
    const s = getState();
    const changed = !!last && (last.template !== s.template || last.format !== s.format);
    last = { template: s.template, format: s.format };
    if (changed && stage.animate && !reducedMotion()) transition();
    else { applyStageSize(); redraw(); }
  });
}


/* ---------- view ---------- */

function setHidden(el, hidden) { if (el.hidden !== hidden) el.hidden = hidden; }
function setText(el, t) { if (el.textContent !== t) el.textContent = t; }

function render(s) {
  const P = presetById(s.preset), snap = snapshot(s);

  setHidden($('example-pill'), !snap.example);
  setHidden($('try-example'), !!(s.before || s.after));
  setText($('hint'), s.before && s.after
    ? 'Drag to move · Pinch or scroll to zoom · Double-tap to switch fill and full photo'
    : 'Click a Before or After box to add a photo, or drop one onto it');
  cv.setAttribute('aria-label', 'Preview of ' + FORMATS[s.format].label + ' before-and-after image' + (snap.example ? ' (example)' : ''));
  cv.classList.toggle('is-drop', !!s.cvDrag);

  KEYS.forEach(key => {
    const p = s[key], root = document.querySelector('.slot[data-slot="' + key + '"]');
    const btn = root.querySelector('.slot__btn'), thumb = root.querySelector('.slot__thumb'), err = root.querySelector('.slot__err');
    const loading = s.loading[key];
    btn.classList.toggle('is-filled', !!p);
    btn.classList.toggle('is-drag', s.drag === key);
    btn.setAttribute('aria-label', loading ? 'Loading photo…' : (p ? 'Replace ' : 'Add ') + key + ' photo');
    setText(root.querySelector('.slot__action'), loading ? 'Loading…' : (p ? 'Replace' : 'Add photo'));
    setHidden(thumb, !p);
    const bg = p && p.thumb ? 'url("' + p.thumb + '")' : 'none';
    if (thumb.style.backgroundImage !== bg) thumb.style.backgroundImage = bg;
    setText(err, s.errors[key] || '');
    setHidden(err, !s.errors[key]);
  });

  document.querySelectorAll('#formats .seg__btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === s.format)));
  document.querySelectorAll('#styles .style-btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === s.template)));

  // Labels & details
  $('cust-toggle').setAttribute('aria-expanded', String(s.custOpen));
  setHidden($('cust-body'), !s.custOpen);
  if ($('preset').value !== s.preset) $('preset').value = s.preset;
  [['label-b', 'labelB', P.b], ['label-a', 'labelA', P.a], ['studio', 'studio', null]].forEach(([id, k, ph]) => {
    const el = $(id);
    if (el.value !== s[k]) el.value = s[k];
    if (ph && el.placeholder !== ph) el.placeholder = ph;
  });
  $('note').setAttribute('aria-checked', String(s.note));

  // Adjust photos
  $('adj-toggle').setAttribute('aria-expanded', String(s.adjOpen));
  setHidden($('adj-body'), !s.adjOpen);
  document.querySelectorAll('#adj-target .adj-seg__btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.target === s.adjTarget)));
  const tp = s[s.adjTarget], A = (tp && tp.adj) || {};
  ADJUSTMENTS.forEach(([id]) => {
    const el = sliderEls[id], v = A[id] || 0;
    if (+el.input.value !== v) el.input.value = v;
    setText(el.value, v > 0 ? '+' + v : String(v));
  });
  setText($('adj-copy'), 'Apply to ' + other(s.adjTarget) + ' photo');
  setHidden($('adj-reset'), !(tp && ADJUSTMENTS.some(([id]) => A[id])));

  // Download
  const ok = canDownload(s);
  $('download').setAttribute('aria-disabled', String(!ok));
  setText($('download'), s.exportStatus === 'preparing' ? 'Preparing PNG…' : 'Download PNG');
  const status = $('status');
  setText(status, s.exportMsg || (s.loading.before || s.loading.after ? 'Loading photo…'
    : (s.before && s.after ? 'Downloads a ' + FORMATS[s.format].label + ' PNG.' : 'Add both photos to download.')));
  status.classList.toggle('is-error', s.exportStatus === 'error');
  status.classList.toggle('is-ready', s.exportStatus === 'ready');
  setHidden($('listing'), !s.showListing);

  scheduleDraw();
}

subscribe(render);
render(getState());

// Redraw once the canvas fonts are ready.
if (document.fonts) {
  Promise.all([
    document.fonts.load('600 28px "DM Sans"'),
    document.fonts.load('800 28px "Schibsted Grotesk"'),
  ]).catch(() => {}).then(() => scheduleDraw());
  document.fonts.ready.then(() => scheduleDraw());
}
