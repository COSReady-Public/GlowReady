// Formats, styles and service presets. Pure data, safe to import from Node tests.

export const FORMATS = {
  post: { label: 'Post', h: 1350, dims: '1080 × 1350' },
  square: { label: 'Square', h: 1080, dims: '1080 × 1080' },
  story: { label: 'Story', h: 1920, dims: '1080 × 1920' },
};

export const TEMPLATES = [
  ['classic', 'Classic'],
  ['polaroid', 'Polaroid'],
  ['overlap', 'Overlap'],
  ['diagonal', 'Diagonal'],
  ['magazine', 'Magazine'],
  ['blend', 'Blend'],
];

// disclaimer: 'default' | 'sessions' (optional "Results shown after N sessions.") | 'cosmetic'
export const PRESETS = [
  { id: 'general', name: 'General', b: 'Before', a: 'After', crop: null, disclaimer: 'default' },
  { id: 'timeline', name: 'Timeline', b: 'Day 0', a: 'Today', crop: null, disclaimer: 'default' },
  { id: 'lash', name: 'Lash extensions', b: 'Before lashes', a: 'After lashes', crop: 30, disclaimer: 'default' },
  { id: 'brows', name: 'Brows', b: 'Before brows', a: 'After brows', crop: 30, disclaimer: 'default' },
  { id: 'skin', name: 'Skin treatments', b: 'Before treatment', a: 'After treatment', crop: 30, disclaimer: 'sessions' },
  { id: 'hair', name: 'Hair services', b: 'Before hair', a: 'After hair', crop: 30, disclaimer: 'default' },
  { id: 'nail', name: 'Nail services', b: 'Before nails', a: 'After nails', crop: 50, disclaimer: 'default' },
  { id: 'makeup', name: 'Makeup', b: 'Before makeup', a: 'After makeup', crop: 30, disclaimer: 'default' },
  { id: 'pmu', name: 'Permanent makeup', b: 'Before PMU', a: 'After PMU', crop: 30, disclaimer: 'default' },
  { id: 'lip', name: 'Lip treatments', b: 'Before lips', a: 'After lips', crop: 40, disclaimer: 'default' },
  { id: 'facial', name: 'Facials', b: 'Before facial', a: 'After facial', crop: 30, disclaimer: 'sessions' },
  { id: 'injectables', name: 'Injectables', b: 'Before treatment', a: 'After treatment', crop: 30, disclaimer: 'sessions' },
  { id: 'haircolor', name: 'Hair colour', b: 'Before colour', a: 'After colour', crop: 35, disclaimer: 'default' },
  { id: 'extensions', name: 'Hair extensions', b: 'Before extensions', a: 'After extensions', crop: 40, disclaimer: 'default' },
  { id: 'barber', name: 'Barbering', b: 'Before cut', a: 'After cut', crop: 30, disclaimer: 'default' },
  { id: 'wax', name: 'Waxing & hair removal', b: 'Before', a: 'After', crop: 50, disclaimer: 'default' },
  { id: 'tan', name: 'Spray tan', b: 'Before tan', a: 'After tan', crop: 40, disclaimer: 'default' },
  { id: 'body', name: 'Body contouring', b: 'Before', a: 'After', crop: 50, disclaimer: 'sessions' },
  { id: 'teeth', name: 'Teeth whitening', b: 'Before whitening', a: 'After whitening', crop: 40, disclaimer: 'cosmetic' },
  { id: 'tattoo', name: 'Tattoo removal', b: 'Before', a: 'After', crop: 50, disclaimer: 'sessions' },
];

export const DEFAULT_DISCLAIMER = 'Individual results may vary.';

export function presetById(id) {
  return PRESETS.find(p => p.id === id) || PRESETS[0];
}

/** The disclaimer line for a preset. `sessions` is only used by presets that take it. */
export function disclaimerText(presetId, sessions) {
  const p = presetById(presetId);
  if (p.disclaimer === 'cosmetic') return 'Cosmetic result. Individual results may vary.';
  const n = parseInt(sessions, 10);
  if (p.disclaimer === 'sessions' && n > 0) {
    return DEFAULT_DISCLAIMER + ' Results shown after ' + n + (n === 1 ? ' session.' : ' sessions.');
  }
  return DEFAULT_DISCLAIMER;
}

/** Vertical crop (0-100) a preset starts from: top-biased for faces, centred otherwise. */
export function cropDefault(presetId, w, h) {
  const p = presetById(presetId);
  return p.crop != null ? p.crop : (h > w ? 35 : 50);
}
