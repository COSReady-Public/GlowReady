// File checks, EXIF-aware decode, downsampling and thumbnails. Nothing leaves the browser.

import { t } from './i18n.js';

export const MAX_BYTES = 20971520; // 20 MiB
export const MAX_PIXELS = 48000000; // 48 MP
export const MAX_SIDE = 2560;

/** Returns an error message, or null when the file may be decoded. */
export function validate(file) {
  const n = (file.name || '').toLowerCase(), type = (file.type || '').toLowerCase();
  if (/heic|heif/.test(type) || /\.(heic|heif)$/.test(n)) return t('errHeic');
  if (!/^image\/(jpeg|png|webp)$/.test(type)) return t('errType');
  if (file.size > MAX_BYTES) return t('errSize');
  return null;
}

async function decodeRaw(file) {
  if (window.createImageBitmap) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { /* fall back */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const im = new Image();
    im.src = url;
    await im.decode();
    return im;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function makeThumb(img, w, h) {
  const c = document.createElement('canvas'), s = 400 / Math.max(w, h);
  c.width = Math.max(1, Math.round(w * s));
  c.height = Math.max(1, Math.round(h * s));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', .8);
}

/** Decode a validated file. Resolves { img, w, h, thumb } or rejects with a user-facing message. */
export async function decodeFile(file) {
  let src;
  try { src = await decodeRaw(file); } catch (e) { throw new Error(t('errOpen')); }
  const w = src.naturalWidth || src.width, h = src.naturalHeight || src.height;
  if (!w || !h) { release(src); throw new Error(t('errOpen')); }
  if (w * h > MAX_PIXELS) {
    release(src);
    throw new Error(t('errPixels'));
  }
  let img = src, iw = w, ih = h;
  const m = Math.max(w, h);
  if (m > MAX_SIDE) {
    const k = MAX_SIDE / m;
    iw = Math.round(w * k); ih = Math.round(h * k);
    const c = document.createElement('canvas');
    c.width = iw; c.height = ih;
    const x = c.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.drawImage(src, 0, 0, iw, ih);
    release(src);
    img = c;
  }
  return { img, w: iw, h: ih, thumb: makeThumb(img, iw, ih) };
}

export function release(img) {
  if (img && img.close) img.close();
}

/** Placeholder example photos (gradients) until licensed photos are supplied. */
export function makeSample(kind) {
  const W = 1500, H = 2000, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, W, H);
  if (kind === 'before') { g.addColorStop(0, '#e4e1ea'); g.addColorStop(1, '#cfcad8'); }
  else { g.addColorStop(0, '#f7f5fb'); g.addColorStop(1, '#e9e4f3'); }
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  return { img: c, w: W, h: H, name: 'example-' + kind + '.jpg', isSample: true, thumb: makeThumb(c, W, H) };
}
