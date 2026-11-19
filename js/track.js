// Anonymous, cookieless usage events: visit, photo pair, download, CTA click.
//
// Each event carries only its name, the page language and, for a download,
// format, style and preset: never image data, filenames, labels, studio names
// or IDs. The server counts a visit once per IP every 30 minutes and answers
// the all-time visitor count shown in the header. Under Do Not Track nothing
// is counted; the count is only read. Failures are silent.

import { getLocale } from './i18n.js';

function endpoint() {
  const host = location.hostname;
  // cosready.ai (and its dev sites) proxy /api to the server; a local copy is
  // expected to do the same. Anywhere else (GitHub Pages) calls cosready.ai.
  const sameSite = /(^|\.)cosready\.ai$/.test(host) || host === 'localhost' || host === '127.0.0.1';
  return (sameSite ? '' : 'https://cosready.ai') + '/api/glowready-event';
}

const dnt = () => navigator.doNotTrack === '1' || window.doNotTrack === '1';

function post(body, opts) {
  // fetch rather than sendBeacon: sendBeacon always sends cookies.
  return fetch(endpoint(), {
    method: 'POST',
    body: JSON.stringify({ ...body, l: getLocale() }),
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    credentials: 'omit',
    keepalive: true,
    ...opts,
  });
}

/** Send one event: 'photos', 'download' (with f, t, p) or 'cta'. */
export function track(e, extra) {
  try {
    if (dnt() || !window.fetch) return;
    post({ e, ...extra }, { mode: 'no-cors' }).catch(() => {});
  } catch (err) { /* fail silent */ }
}

/** Count this visit; resolves to the all-time visitor count, or null. */
export function trackVisit() {
  try {
    if (!window.fetch) return Promise.resolve(null);
    const req = dnt()
      ? fetch(endpoint(), { credentials: 'omit' })
      : post({ e: 'visit' });
    return req
      .then(r => (r.ok ? r.json() : null))
      .then(d => (d && Number.isFinite(d.visitors) ? d.visitors : null))
      .catch(() => null);
  } catch (err) {
    return Promise.resolve(null);
  }
}
