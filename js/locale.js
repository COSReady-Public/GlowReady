// Picks the page language before anything is drawn (a plain, blocking script).
//
// 1. A language the visitor picked on cosready.ai: the site keeps it in the
//    NEXT_LOCALE cookie. The site also writes "en" there for every visitor,
//    so English counts only when cosr_lang_chosen marks it as their own pick.
//    Chinese is never the site's default, so it always counts.
// 2. Otherwise the browser's (system) language: Traditional for zh-TW / HK /
//    MO / Hant, Simplified for other Chinese, else English.
//
// Sets <html lang> and data-locale. For Chinese it hides the page until
// main.js has swapped the text (or 3 s pass), so English never flashes first.
(function () {
  var L = 'en';
  try {
    var c = document.cookie || '';
    var m = /(?:^|;\s*)NEXT_LOCALE=([^;]*)/.exec(c);
    var v = m ? decodeURIComponent(m[1]) : '';
    var chosen = /(?:^|;\s*)cosr_lang_chosen=1(?:;|$)/.test(c);
    if (v === 'zh-CN' || v === 'zh-TW' || (v === 'en' && chosen)) {
      L = v;
    } else {
      var n = window.navigator || {};
      var langs = n.languages && n.languages.length ? n.languages : [n.language || ''];
      for (var i = 0; i < langs.length; i++) {
        var s = String(langs[i]).toLowerCase();
        if (/^zh-hans/.test(s)) { L = 'zh-CN'; break; }
        if (/^zh-(tw|hk|mo|hant)/.test(s)) { L = 'zh-TW'; break; }
        if (/^zh/.test(s)) { L = 'zh-CN'; break; }
        if (/^en/.test(s)) { L = 'en'; break; }
      }
    }
  } catch (e) { /* English */ }
  var h = document.documentElement;
  h.lang = L;
  h.setAttribute('data-locale', L);
  if (L !== 'en') {
    h.classList.add('i18n-pending');
    setTimeout(function () { h.classList.remove('i18n-pending'); }, 3000);
  }
})();
