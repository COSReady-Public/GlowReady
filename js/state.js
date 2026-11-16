// Photo slots and settings, in memory only. Single state object + subscribe/notify.

import { presetById, DEFAULT_DISCLAIMER } from './presets.js';

export function defaults() {
  return {
    before: null, after: null, // Slot = { img, w, h, name, thumb, crop, tx, zoom, adj, isSample }
    loading: { before: false, after: false },
    errors: { before: null, after: null },
    format: 'post',
    template: 'classic',
    preset: 'general',
    labelB: '', labelA: '', studio: '', // '' = use the preset label
    note: true,
    adjTarget: 'before',
    custOpen: false, adjOpen: false,
    exportStatus: 'idle', exportMsg: '', showListing: false,
    drag: null, cvDrag: null, // panel row / canvas cell under a dragged file
  };
}

let state = defaults();
const subs = new Set();

export const getState = () => state;

export function setState(patch) {
  const p = typeof patch === 'function' ? patch(state) : patch;
  if (!p) return;
  state = { ...state, ...p };
  subs.forEach(fn => fn(state));
}

export function subscribe(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

export function updateSlot(key, patch) {
  setState(s => s[key] ? { [key]: { ...s[key], ...patch } } : null);
}

/** Immutable view handed to the renderer; export takes one at click time. */
export function snapshot(s = state) {
  const P = presetById(s.preset);
  return {
    format: s.format, template: s.template, presetId: P.id, presetName: P.name,
    before: s.before, after: s.after,
    labelB: s.labelB.trim() ? s.labelB : P.b,
    labelA: s.labelA.trim() ? s.labelA : P.a,
    studio: s.studio.trim(),
    note: s.note, noteText: DEFAULT_DISCLAIMER,
    example: !!((s.before && s.before.isSample) || (s.after && s.after.isSample)),
  };
}
