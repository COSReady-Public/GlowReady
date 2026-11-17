// Language: dictionaries complete, page keys covered, and locale.js picks the right language.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

import { _strings, setLocale, t, presetText } from '../js/i18n.js';
import { PRESETS, FORMATS, TEMPLATES } from '../js/presets.js';
import { ADJUSTMENTS } from '../js/adjust.js';
import { fontBody, footerLines } from '../js/layout.js';
import { validate } from '../js/decode.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const pageKeys = [...html.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g)].map(m => m[1]);
const EN = _strings.en, CN = _strings['zh-CN'], TW = _strings['zh-TW'];

test('Simplified and Traditional have the same keys', () => {
  assert.deepEqual(Object.keys(TW).sort(), Object.keys(CN).sort());
});

test('every script string has Chinese', () => {
  for (const k of Object.keys(EN)) assert.ok(k in CN, k);
});

test('every page key has Chinese, and no Chinese key is unused', () => {
  for (const k of pageKeys) assert.ok(k in CN, k);
  const scriptKeys = new Set(Object.keys(EN));
  const used = new Set(pageKeys);
  for (const k of Object.keys(CN)) {
    if (k.startsWith('preset.')) continue;
    assert.ok(scriptKeys.has(k) || used.has(k), `unused key ${k}`);
  }
});

test('every preset, format, style and slider has Chinese', () => {
  for (const p of PRESETS) for (const d of [CN, TW]) assert.equal(d['preset.' + p.id].length, 3, p.id);
  for (const id of Object.keys(FORMATS)) assert.ok(CN['fmt.' + id] && EN['fmt.' + id], id);
  for (const [id] of TEMPLATES) assert.ok(CN['tpl.' + id] && EN['tpl.' + id], id);
  for (const [id] of ADJUSTMENTS) assert.ok(CN['adj.' + id] && EN['adj.' + id], id);
});

test('English text matches what the design shows', () => {
  setLocale('en');
  assert.equal(presetText(PRESETS[1]).name, 'Lash extensions');
  assert.equal(t('statusDownloads', { format: t('fmt.post') }), 'Downloads a Post PNG.');
  assert.equal(fontBody(), '"DM Sans", system-ui, -apple-system, sans-serif');
  const s = { studio: '', note: true, noteText: t('disclaimer'), example: true };
  assert.deepEqual(footerLines(s).map(l => l.t), ['Individual results may vary.', 'Example · Made with GlowReady · by COSReady']);
});

test('Chinese text and canvas fonts', () => {
  setLocale('zh-CN');
  assert.equal(presetText(PRESETS[1]).b, '嫁接前');
  assert.equal(t('statusDownloads', { format: t('fmt.post') }), '将下载帖子尺寸 PNG。');
  assert.match(fontBody(), /^"DM Sans", "PingFang SC"/);
  setLocale('zh-TW');
  assert.equal(t('cvCredit'), '由 GlowReady 製作 · COSReady 出品');
  assert.match(fontBody(), /^"DM Sans", "PingFang TC"/);
  setLocale('fr');
  assert.equal(t('downloadPng'), 'Download PNG');
  setLocale('en');
});

test('file checks answer in the current language', () => {
  const txt = { name: 'a.txt', type: 'text/plain', size: 2 };
  const heic = { name: 'IMG_1.HEIC', type: '', size: 2 };
  const big = { name: 'a.jpg', type: 'image/jpeg', size: 21 * 1024 * 1024 };
  setLocale('en');
  assert.equal(validate(txt), 'Choose a JPG, PNG, or WebP photo.');
  assert.match(validate(heic), /^Choose a JPG, PNG, or WebP photo\. HEIC/);
  assert.equal(validate({ name: 'a.jpg', type: 'image/jpeg', size: 2 }), null);
  setLocale('zh-CN');
  assert.equal(validate(big), '文件过大，请压缩至 20 MiB 以内后重试。');
  setLocale('zh-TW');
  assert.equal(validate(txt), '請選擇 JPG、PNG 或 WebP 照片。');
  setLocale('en');
});

// Runs js/locale.js against a fake page.
const localeJs = readFileSync(new URL('../js/locale.js', import.meta.url), 'utf8');
function pick(cookie, languages) {
  const attrs = {}, classes = new Set();
  const documentElement = {
    set lang(v) { attrs.lang = v; },
    setAttribute: (k, v) => { attrs[k] = v; },
    classList: { add: c => classes.add(c), remove: c => classes.delete(c) },
  };
  vm.runInNewContext(localeJs, {
    document: { cookie, documentElement },
    window: { navigator: { languages, language: languages[0] } },
    setTimeout: () => {},
  });
  assert.equal(attrs.lang, attrs['data-locale']);
  assert.equal(classes.has('i18n-pending'), attrs.lang !== 'en');
  return attrs.lang;
}

test('a language picked on cosready.ai wins', () => {
  assert.equal(pick('NEXT_LOCALE=zh-TW', ['en-US']), 'zh-TW');
  assert.equal(pick('a=1; NEXT_LOCALE=zh-CN; b=2', ['en-CA']), 'zh-CN');
  assert.equal(pick('NEXT_LOCALE=en; cosr_lang_chosen=1', ['zh-CN']), 'en');
});

test('otherwise the system language', () => {
  assert.equal(pick('NEXT_LOCALE=en', ['zh-CN', 'en']), 'zh-CN'); // the site's default "en" is not a pick
  assert.equal(pick('', ['zh-TW']), 'zh-TW');
  assert.equal(pick('', ['zh-HK']), 'zh-TW');
  assert.equal(pick('', ['zh-Hant-CA']), 'zh-TW');
  assert.equal(pick('', ['zh-Hans-HK']), 'zh-CN');
  assert.equal(pick('', ['zh']), 'zh-CN');
  assert.equal(pick('', ['fr-CA', 'zh-CN']), 'zh-CN');
  assert.equal(pick('', ['fr-CA']), 'en');
  assert.equal(pick('', ['en-US', 'zh-CN']), 'en');
  assert.equal(pick('NEXT_LOCALE=xx', ['ja']), 'en');
});
