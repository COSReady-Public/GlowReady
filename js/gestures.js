// Framing on the preview: drag to pan, pinch / wheel to zoom, double-tap to switch
// fill and full photo, click or drop on an empty cell to add a photo.

import { cellAt, minZoom, W } from './layout.js';
import { cropDefault } from './presets.js';
import { getState, setState, updateSlot } from './state.js';

const clamp01 = v => Math.min(1, Math.max(0, v));

export function attachGestures(cv, { getCells, pick, loadFile }) {
  const pointers = new Map();
  let gesture = null, tap = null, lastTap = null, lastPointerType = 'mouse';

  const canvasPt = e => {
    const r = cv.getBoundingClientRect(), k = W / r.width;
    return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k };
  };
  const cellUnder = pt => cellAt(getCells(), pt);
  const filledUnder = pt => {
    const c = cellUnder(pt);
    return c && getState()[c.key] ? { key: c.key, cell: c } : null;
  };
  const mid = pts => ({ x: pts.reduce((a, p) => a + p.x, 0) / pts.length, y: pts.reduce((a, p) => a + p.y, 0) / pts.length });
  const dist = pts => pts.length < 2 ? 0 : Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);

  function startGesture() {
    const p = getState()[gesture.key], pts = [...pointers.values()];
    gesture.start = { zoom: p.zoom || 1, tx: p.tx == null ? .5 : p.tx, ty: p.crop / 100, mid: mid(pts), dist: dist(pts) };
  }

  function toggleFit(key, cell) {
    const s = getState(), p = s[key], full = minZoom(p, cell);
    updateSlot(key, Math.abs((p.zoom || 1) - 1) < .01 && full < .99
      ? { zoom: full }
      : { zoom: 1, tx: .5, crop: cropDefault(s.preset, p.w, p.h) });
  }

  cv.addEventListener('pointerdown', e => {
    lastPointerType = e.pointerType || 'mouse';
    const pt = canvasPt(e);
    if (!gesture) {
      const ce = cellUnder(pt);
      if (ce && !getState()[ce.key]) { tap = { key: ce.key, x: e.clientX, y: e.clientY }; return; }
      const h = filledUnder(pt);
      if (!h) return;
      gesture = { key: h.key, cell: h.cell, downX: e.clientX, downY: e.clientY, type: e.pointerType };
    }
    try { cv.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    pointers.set(e.pointerId, pt);
    startGesture();
  });

  cv.addEventListener('pointermove', e => {
    if (!gesture || !pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, canvasPt(e));
    const g = gesture, st = g.start, p = getState()[g.key], pts = [...pointers.values()];
    if (!p) return;
    let zoom = st.zoom;
    if (pts.length > 1 && st.dist > 0) zoom = Math.min(5, Math.max(minZoom(p, g.cell), st.zoom * dist(pts) / st.dist));
    const m = mid(pts), k = Math.max(g.cell.w / p.w, g.cell.h / p.h) * zoom;
    const ox = p.w * k - g.cell.w, oy = p.h * k - g.cell.h;
    updateSlot(g.key, {
      zoom,
      tx: ox > 0 ? clamp01(st.tx - (m.x - st.mid.x) / ox) : .5,
      crop: (oy > 0 ? clamp01(st.ty - (m.y - st.mid.y) / oy) : st.ty) * 100,
    });
  });

  const up = e => {
    const t = tap;
    tap = null;
    if (t && e.type === 'pointerup' && Math.hypot(e.clientX - t.x, e.clientY - t.y) < 10) { pick(t.key); return; }
    // Touch / pen double-tap (mouse uses dblclick).
    if (gesture && e.type === 'pointerup' && gesture.type !== 'mouse' && pointers.size === 1
      && Math.hypot(e.clientX - gesture.downX, e.clientY - gesture.downY) < 10) {
      const now = performance.now();
      if (lastTap && now - lastTap.t < 320 && lastTap.key === gesture.key && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30) {
        toggleFit(gesture.key, gesture.cell);
        lastTap = null;
      } else {
        lastTap = { t: now, key: gesture.key, x: e.clientX, y: e.clientY };
      }
    }
    pointers.delete(e.pointerId);
    if (!pointers.size) gesture = null;
    else if (gesture) startGesture();
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);

  cv.addEventListener('dblclick', e => {
    // Phones also fire dblclick after a double-tap; the touch path above has
    // already toggled, and a second toggle would undo it.
    if (lastPointerType !== 'mouse') return;
    const h = filledUnder(canvasPt(e));
    if (h) toggleFit(h.key, h.cell);
  });

  cv.addEventListener('wheel', e => {
    const h = filledUnder(canvasPt(e));
    if (!h) return;
    e.preventDefault();
    const p = getState()[h.key];
    updateSlot(h.key, { zoom: Math.min(5, Math.max(minZoom(p, h.cell), (p.zoom || 1) * Math.exp(-e.deltaY * .0015))) });
  }, { passive: false });

  // Drag and drop a file onto a cell.
  cv.addEventListener('dragover', e => {
    e.preventDefault();
    const c = cellUnder(canvasPt(e)), k = c ? c.key : null;
    if (getState().cvDrag !== k) setState({ cvDrag: k });
  });
  cv.addEventListener('dragleave', () => setState({ cvDrag: null }));
  cv.addEventListener('drop', e => {
    e.preventDefault();
    const c = cellUnder(canvasPt(e));
    setState({ cvDrag: null });
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (c && f) loadFile(c.key, f);
  });

  // Cursor: pointer over an empty cell, grab over a filled one.
  cv.addEventListener('mousemove', e => {
    const c = cellUnder(canvasPt(e));
    cv.style.cursor = c ? (getState()[c.key] ? 'grab' : 'pointer') : 'default';
  });
}
