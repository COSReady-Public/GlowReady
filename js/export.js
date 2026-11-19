// PNG encoding and download, plus the anonymous export counter.

import { draw } from './render.js';
import { t } from './i18n.js';
import { track } from './track.js';

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
        if (!blob) return reject(new Error(t('errCreate')));
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
          reject(new Error(t('errDownload')));
        }
      }, 'image/png');
    } catch (e) {
      reject(new Error(t('errCreate')));
    }
  });
}

/** Count a successful export (format, style and preset only); never affects the export. */
export function countExport(snap) {
  track('download', { f: snap.format, t: snap.template, p: snap.presetId });
}
