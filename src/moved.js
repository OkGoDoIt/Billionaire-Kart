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
  // All or nothing: every entry is read and checked before anything is written, so a damaged or cut-off fragment
  // leaves this address's storage as it was. (The game's own load then checks every field: src/core/save.js.)
  var writes = [], before = [], key, i;
  try {
    var came = unpack(location.hash.slice(MARK.length));
    if (!isObj(came)) throw new Error('not a save');
    for (key in came) {
      if (!own(came, key) || (key !== KEY && key.indexOf(KEY + ':') !== 0)) continue;
      var theirs = came[key];
      if (typeof theirs !== 'string' || !isObj(JSON.parse(theirs))) throw new Error('a damaged entry');
      var mine = localStorage.getItem(key), a = null;
      try { a = mine == null ? null : JSON.parse(mine); } catch (e) { a = null; }
      if (!isObj(a)) { writes.push([key, theirs]); continue; }   // nothing readable here: theirs
      if (key !== KEY) continue;                                 // a ghost already here stays
      writes.push([key, JSON.stringify(better(a, JSON.parse(theirs)))]);
    }
  } catch (e) { writes = []; /* a damaged or cut-off save: start with what is here */ }
  try {
    for (i = 0; i < writes.length; i++) { before.push([writes[i][0], localStorage.getItem(writes[i][0])]); localStorage.setItem(writes[i][0], writes[i][1]); }
  } catch (e) {
    // storage filled up part way: put back what was there
    for (i = before.length - 1; i >= 0; i--) try { if (before[i][1] == null) localStorage.removeItem(before[i][0]); else localStorage.setItem(before[i][0], before[i][1]); } catch (e2) { /* nothing more to do */ }
  }
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { location.hash = ''; }

  function isObj(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
  function own(o, k) { return k !== '__proto__' && Object.prototype.hasOwnProperty.call(o, k); }
  function pos(v) { return typeof v === 'number' && isFinite(v) && v > 0; }
  /** Progress on both addresses: this one's settings, and the better of each record. */
  function better(a, b) {
    var id, x, y, t, u, bb = isObj(b.best) ? b.best : {}, bt = isObj(b.trophies) ? b.trophies : {}, bs = isObj(b.stats) ? b.stats : {};
    if (!isObj(a.best)) a.best = {};
    if (!isObj(a.trophies)) a.trophies = {};
    if (!isObj(a.stats)) a.stats = {};
    for (id in bb) {
      if (!own(bb, id) || !isObj(y = bb[id])) continue;
      x = own(a.best, id) && isObj(a.best[id]) ? a.best[id] : (a.best[id] = {});
      if (pos(y.race) && !(pos(x.race) && x.race <= y.race)) { x.race = y.race; x.racer = y.racer; }
      if (pos(y.lap) && !(pos(x.lap) && x.lap <= y.lap)) x.lap = y.lap;
    }
    for (id in bt) {
      if (!own(bt, id) || !isObj(u = bt[id]) || !pos(u.rank)) continue;
      t = own(a.trophies, id) && isObj(a.trophies[id]) ? a.trophies[id] : null;
      if (!t || !pos(t.rank) || u.rank < t.rank || (u.rank === t.rank && u.points > t.points)) a.trophies[id] = u;
    }
    for (id in bs) if (own(bs, id) && pos(bs[id])) a.stats[id] = own(a.stats, id) && pos(a.stats[id]) ? Math.max(a.stats[id], bs[id]) : bs[id];
    return a;
  }
})();
