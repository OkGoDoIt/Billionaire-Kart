/* The game moved from okgodoit.github.io/Billionaire-Kart to billionaire-kart.okgodoit.com.
   A plain script, loaded first in index.html, so it runs before the game reads its save.

   On the old address: send the player to the new one, carrying their saved progress in the
   address fragment (browser storage does not follow a change of address; the fragment is
   never sent to any server). Only when the new site answers, so a player who is offline
   keeps playing the copy they have. Add ?stay=1 to stay put.

   On the new address: if a save came along, take it in, then tidy the address bar. */
(function () {
  var NEW = 'https://billionaire-kart.okgodoit.com/', OLD_HOST = 'okgodoit.github.io', KEY = 'billionaire-kart-v2', MARK = '#moved=';

  function pack(obj) { return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unpack(text) { return JSON.parse(decodeURIComponent(escape(atob(text.replace(/-/g, '+').replace(/_/g, '/'))))); }

  if (location.hostname === OLD_HOST) {
    if (/[?&]stay=1(&|$)/.test(location.search)) return;
    fetch(NEW + 'version.txt', { mode: 'no-cors', cache: 'no-store' }).then(function () {
      var hash = location.hash || '';
      try {
        var main = localStorage.getItem(KEY), all = {}, i, k;
        if (main) {
          for (i = 0; i < localStorage.length; i++) { k = localStorage.key(i); if (k === KEY || k.indexOf(KEY + ':') === 0) all[k] = localStorage.getItem(k); }
          var packed = pack(all);
          // time-trial ghosts are large: when everything will not fit in an address, the progress goes without them
          if (packed.length > 48000) { var only = {}; only[KEY] = main; packed = pack(only); }
          if (packed.length <= 48000) hash = MARK + packed;
        }
      } catch (e) { /* storage unavailable: move without it */ }
      location.replace(NEW + location.search + hash);
    }).catch(function () { /* the new site cannot be reached: stay and play */ });
    return;
  }

  if (location.hash.indexOf(MARK) !== 0) return;
  try {
    var came = unpack(location.hash.slice(MARK.length));
    for (var key in came) {
      if (key !== KEY && key.indexOf(KEY + ':') !== 0) continue;
      var theirs = came[key], mine = localStorage.getItem(key);
      if (typeof theirs !== 'string') continue;
      if (mine == null) { localStorage.setItem(key, theirs); continue; }
      if (key !== KEY) continue;                         // a ghost already here stays
      // progress on both addresses: keep this one's settings, and the better of each record
      var a = JSON.parse(mine), b = JSON.parse(theirs), id;
      a.best = a.best || {}; a.trophies = a.trophies || {}; a.stats = a.stats || {};
      for (id in b.best || {}) {
        var x = a.best[id] || (a.best[id] = {}), y = b.best[id] || {};
        if (isFinite(y.race) && y.race > 0 && (!x.race || y.race < x.race)) { x.race = y.race; x.racer = y.racer; }
        if (isFinite(y.lap) && y.lap > 0 && (!x.lap || y.lap < x.lap)) x.lap = y.lap;
      }
      for (id in b.trophies || {}) {
        var t = a.trophies[id], u = b.trophies[id];
        if (u && (!t || u.rank < t.rank || (u.rank === t.rank && u.points > t.points))) a.trophies[id] = u;
      }
      for (id in b.stats || {}) if (typeof b.stats[id] === 'number') a.stats[id] = Math.max(a.stats[id] || 0, b.stats[id]);
      localStorage.setItem(key, JSON.stringify(a));
    }
  } catch (e) { /* a damaged or cut-off save: start with what is here */ }
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { location.hash = ''; }
})();
