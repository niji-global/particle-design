/* 日英の切り替え。会社のサイトと CASK / BARREL のサイトで、この1つのファイル（/lang.js）を使う。
   自動で移すのは「日本語のページ → 英語のページ」の一方向だけ。だから行ったり来たりしない。
   検索エンジンは robots.txt（Disallow: /lang.js）でこのファイルを読まない。その行を消さないこと。
   端末に残すのは、人が選んだ言語の2文字（ja / en）だけ。Cookie なし、送信なし。 */
(function (w, d) {
  'use strict';
  var KEY = 'pd-lang', root = d.documentElement, loc = w.location, me = d.currentScript;

  /* 端末の言語: 優先順に見て、先に出た日本語か英語。どちらも無ければ英語 */
  function device(list) {
    for (var i = 0; i < list.length; i++) {
      var l = String(list[i]).slice(0, 2).toLowerCase();
      if (l === 'ja' || l === 'en') return l;
    }
    return 'en';
  }

  /* 英語のページへ移すか。端末の言語を見るのは、サイトに入ってきた時だけ:
     トップはどこから来ても、下のページは直接開いた時（referrer なし）。サイトの中では勝手に変えない */
  function goEnglish(s) {
    if (s.here !== 'ja' || !s.partner || s.back) return false;
    if (s.choice) return s.choice === 'en';
    return s.device === 'en' && !s.inside && (s.top || !s.referrer);
  }

  function partner(l) {
    var a = d.querySelector('link[rel="alternate"][hreflang="' + l + '"]');
    return a ? a.href : '';
  }
  /* 相手の住所（今いる置き場所のまま）に、今の ? と # を引き継ぐ。lang だけ外す */
  function carry(href) {
    var q = new URLSearchParams(loc.search), s;
    q.delete('lang');
    s = q.toString();
    return new URL(href, loc.href).pathname + (s ? '?' + s : '') + loc.hash;
  }
  function move(href) {
    root.style.visibility = 'hidden';
    w.setTimeout(function () { root.style.visibility = ''; }, 1500);
    loc.replace(carry(href));
  }
  function read() { var v = w.localStorage.getItem(KEY); return v === 'ja' || v === 'en' ? v : ''; }
  function save(l) { try { w.localStorage.setItem(KEY, l); } catch (e) {} }

  w.pdLang = { device: device, goEnglish: goEnglish, read: read, save: save };

  /* 切り替えのボタン（ただのリンク）を押した時だけ、選んだ言語を残す */
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-lang]');
    if (!a) return;
    save(a.getAttribute('data-lang'));
    a.href = carry(a.href);
  });

  var here = root.lang, choice, nav, m = /[?&]lang=(ja|en)(?=&|$)/.exec(loc.search);
  if (m) {                                   /* ?lang=ja / en は、ボタンを押したのと同じ */
    save(m[1]);
    if (m[1] !== here && partner(m[1])) { move(partner(m[1])); return; }
    try { w.history.replaceState(null, '', carry(loc.href)); } catch (e) {}
  }
  try { choice = m ? m[1] : read(); } catch (e) { return; }   /* 覚えられない端末では、自動で移さない */
  nav = w.performance && w.performance.getEntriesByType ? w.performance.getEntriesByType('navigation')[0] : null;
  if (goEnglish({
    here: here, partner: partner('en'), choice: choice,
    referrer: d.referrer, inside: d.referrer.indexOf(loc.origin + '/') === 0,
    top: !!me && me.hasAttribute('data-top'), back: !!nav && nav.type === 'back_forward',
    device: device(w.navigator.languages && w.navigator.languages.length ? w.navigator.languages : [w.navigator.language || ''])
  })) move(partner('en'));
})(window, document);
