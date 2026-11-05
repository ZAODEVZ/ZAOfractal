// Runs in <head> before the page paints, so members never see the newcomer
// view flash first. Plain same-origin file (CSP: script-src 'self', no inline).
// Keep the storage key and shape in step with site/src/lib/member.ts.
(function () {
  try {
    var raw = window.localStorage.getItem('zao-member');
    var r = raw ? JSON.parse(raw) : null;
    if (r && r.member === true && typeof r.expires === 'number' && r.expires > Date.now()) {
      document.documentElement.classList.add('is-member');
    }
  } catch (e) {}
})();
