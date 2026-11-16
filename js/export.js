// PNG encoding and download, plus the anonymous export counter.

import { draw } from './render.js';

const VERSION = '1.0';

/**
 * Render a snapshot off-screen and download it. Resolves true when downloaded,
 * false when `isCurrent()` says the export went stale (e.g. Start over) first.
 */
export function exportPNG(snap, isCurrent = () => true) {
  return new Promise((resolve, reject) => {
    try {
      const cv = document.createElement('canvas');
      draw(cv, snap);
      cv.toBlob(blob => {
        if (!isCurrent()) return resolve(false);
        if (!blob) return reject(new Error('Could not create the PNG. Try again.'));
        try {
          const url = URL.createObjectURL(blob), a = document.createElement('a');
          a.href = url;
          a.download = 'glowready-' + snap.template + '-' + snap.format + '.png';
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 5000);
          resolve(true);
        } catch (e) {
          reject(new Error('Could not start the download. Try again.'));
        }
      }, 'image/png');
    } catch (e) {
      reject(new Error('Could not create the PNG. Try again.'));
    }
  });
}

/**
 * Cookieless usage count, sent only after a successful export. Carries format,
 * style and preset only: never image data, filenames, labels, studio names or IDs.
 * Skipped under Do Not Track; never affects the export.
 */
export function countExport(snap) {
  try {
    if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;
    if (!window.fetch) return;
    const onCosready = /(^|\.)cosready\.ai$/.test(location.hostname);
    const url = onCosready ? '/api/glowready-count' : 'https://cosready.ai/api/glowready-count';
    // fetch rather than sendBeacon: sendBeacon always sends cookies, and §9 says none.
    fetch(url, {
      method: 'POST',
      body: JSON.stringify({ v: VERSION, f: snap.format, t: snap.template, p: snap.presetId }),
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      credentials: 'omit',
      mode: 'no-cors',
      keepalive: true,
    }).catch(() => {});
  } catch (e) { /* fail silent */ }
}
