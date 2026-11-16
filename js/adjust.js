// Photo adjustments: Exposure, Contrast, Saturation via ctx.filter (per-pixel
// fallback where ctx.filter is missing, e.g. Safari < 18), Warmth and Lighting
// as overlays on the visible image rect.

export const ADJUSTMENTS = [
  ['exposure', 'Exposure'],
  ['contrast', 'Contrast'],
  ['highlights', 'Lighting'],
  ['saturation', 'Saturation'],
  ['warmth', 'Warmth'],
];

let filterSupport = null;
let scratch = null; // reused by the per-pixel fallback

/** True when ctx.filter actually changes pixels (feature + test render). */
export function supportsCanvasFilter() {
  if (filterSupport !== null) return filterSupport;
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    const x = c.getContext('2d', { willReadFrequently: true });
    if (!('filter' in x)) return (filterSupport = false);
    x.filter = 'brightness(0)';
    x.fillStyle = '#fff';
    x.fillRect(0, 0, 1, 1);
    const src = document.createElement('canvas');
    src.width = src.height = 1;
    const sx = src.getContext('2d');
    sx.fillStyle = '#fff';
    sx.fillRect(0, 0, 1, 1);
    x.clearRect(0, 0, 1, 1);
    x.drawImage(src, 0, 0);
    filterSupport = x.getImageData(0, 0, 1, 1).data[0] < 128;
  } catch (e) {
    filterSupport = false;
  }
  return filterSupport;
}

function filterString(ex, ct, sa) {
  return 'brightness(' + (1 + ex / 100) + ') contrast(' + (1 + ct / 100) + ') saturate(' + (1 + sa / 100) + ')';
}

/** Same maths as the CSS filter functions, applied to ImageData in place. */
function applyPixels(data, ex, ct, sa) {
  const b = 1 + ex / 100, c = 1 + ct / 100, s = 1 + sa / 100;
  const ic = 0.5 * (1 - c) * 255;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] * b, g = data[i + 1] * b, bl = data[i + 2] * b;
    r = r * c + ic; g = g * c + ic; bl = bl * c + ic;
    if (s !== 1) {
      const nr = (0.213 + 0.787 * s) * r + (0.715 - 0.715 * s) * g + (0.072 - 0.072 * s) * bl;
      const ng = (0.213 - 0.213 * s) * r + (0.715 + 0.285 * s) * g + (0.072 - 0.072 * s) * bl;
      const nb = (0.213 - 0.213 * s) * r + (0.715 - 0.715 * s) * g + (0.072 + 0.928 * s) * bl;
      r = nr; g = ng; bl = nb;
    }
    data[i] = r; data[i + 1] = g; data[i + 2] = bl; // Uint8ClampedArray clamps
  }
}

/**
 * Draw `img` at (dx,dy,dw,dh) with adjustments. The caller has already clipped
 * to the cell; (ix,iy,iw,ih) is the visible image rect inside the cell.
 */
export function drawAdjusted(c, img, dx, dy, dw, dh, adj, vis) {
  const A = adj || {};
  const ex = A.exposure || 0, ct = A.contrast || 0, sa = A.saturation || 0, wm = A.warmth || 0, hl = A.highlights || 0;
  const { ix, iy, iw, ih } = vis;

  if (ex || ct || sa) {
    if (supportsCanvasFilter()) {
      c.filter = filterString(ex, ct, sa);
      c.drawImage(img, dx, dy, dw, dh);
      c.filter = 'none';
    } else if (iw >= 1 && ih >= 1) {
      // Fallback: render only the visible part, adjust its pixels, draw it back.
      const t = scratch || (scratch = document.createElement('canvas'));
      t.width = Math.ceil(iw); t.height = Math.ceil(ih); // resizing also clears it
      const tx = t.getContext('2d', { willReadFrequently: true });
      tx.drawImage(img, dx - ix, dy - iy, dw, dh);
      const d = tx.getImageData(0, 0, t.width, t.height);
      applyPixels(d.data, ex, ct, sa);
      tx.putImageData(d, 0, 0);
      c.drawImage(t, ix, iy);
    }
  } else {
    c.drawImage(img, dx, dy, dw, dh);
  }

  if (wm) {
    c.globalCompositeOperation = 'soft-light';
    c.fillStyle = wm > 0 ? 'rgba(255,150,60,' + (wm / 100) + ')' : 'rgba(70,140,255,' + (-wm / 100) + ')';
    c.fillRect(ix, iy, iw, ih);
    c.globalCompositeOperation = 'source-over';
  }
  if (hl) {
    c.globalCompositeOperation = hl > 0 ? 'screen' : 'multiply';
    c.fillStyle = hl > 0 ? 'rgba(255,255,255,' + (hl / 250) + ')' : 'rgba(40,30,50,' + (-hl / 250) + ')';
    c.fillRect(ix, iy, iw, ih);
    c.globalCompositeOperation = 'source-over';
  }
}
