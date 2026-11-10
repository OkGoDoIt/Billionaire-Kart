/* ui-fx.js — Billionaire Kart polish FX (POLISH.md §2.5.1, §2.8).
   Screen wipes (checker / star) + the item-slot roulette. Classic script,
   loaded before game.js; exposes window.BKFX. No dependencies, no build step.
   Rules from the bible: NO navigation happens without a wipe, and using an
   item mid-roulette is ignored — the drama is protected. */
(function () {
  'use strict';
  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var $ = function (id) { return document.getElementById(id); };

  /* ================= CHECKER WIPE ================= */
  var wipeEl = null, wipeBusy = false;
  function buildWipe() {
    wipeEl = document.createElement('div');
    wipeEl.id = 'bk-wipe';
    wipeEl.setAttribute('aria-hidden', 'true');
    for (var y = 0; y < 6; y++) for (var x = 0; x < 8; x++) {
      var c = document.createElement('div');
      c.className = 'bk-cell' + (((x + y) % 2) ? ' dark' : '');
      c.style.transitionDelay = ((x + y) * 14) + 'ms';
      wipeEl.appendChild(c);
    }
    document.body.appendChild(wipeEl);
  }
  function checkerTransition(fn) {
    if (!wipeEl) buildWipe();
    wipeEl.classList.add('show');
    void wipeEl.offsetWidth; // flush so the wave animates
    wipeEl.classList.add('on');
    setTimeout(function () { // fully covered (~48 cells * wave + grow time)
      try { fn(); } finally {
        setTimeout(function () {
          wipeEl.classList.remove('on');
          setTimeout(function () { wipeEl.classList.remove('show'); wipeBusy = false; }, 420);
        }, 110);
      }
    }, 400);
  }

  /* ================= STAR WIPE ================= */
  function starEl(x, y) {
    var wrap = document.createElement('div');
    wrap.className = 'bk-star-wrap';
    wrap.setAttribute('aria-hidden', 'true');
    var S = Math.max(window.innerWidth, window.innerHeight) * 1.7;
    wrap.style.left = x + 'px'; wrap.style.top = y + 'px';
    wrap.style.width = S + 'px'; wrap.style.height = S + 'px';
    var outer = document.createElement('div'); outer.className = 'bk-star outer';
    outer.style.width = '100%'; outer.style.height = '100%';
    var inner = document.createElement('div'); inner.className = 'bk-star inner';
    inner.style.width = 'calc(100% - 14px)'; inner.style.height = 'calc(100% - 14px)';
    wrap.appendChild(outer); wrap.appendChild(inner);
    document.body.appendChild(wrap);
    return wrap;
  }
  function starTransition(fn, origin) {
    var x = origin && origin.x != null ? origin.x : window.innerWidth / 2;
    var y = origin && origin.y != null ? origin.y : window.innerHeight / 2;
    var el = starEl(x, y);
    el.style.transition = 'transform .19s cubic-bezier(.16,1,.3,1)';
    void el.offsetWidth;
    el.style.transform = 'translate(-50%,-50%) scale(1)';
    setTimeout(function () {
      try { fn(); } finally {
        setTimeout(function () {
          el.style.transition = 'transform .22s cubic-bezier(.5,0,.9,.4)';
          el.style.transform = 'translate(-50%,-50%) scale(0)';
          setTimeout(function () { el.remove(); wipeBusy = false; }, 260);
        }, 70);
      }
    }, 210);
  }
  /* Post-swap star burst: the screen underneath has already changed (used for
     race -> results, where game.js reveals the panel itself). */
  function burst(origin) {
    if (reduced) return;
    var x = origin && origin.x != null ? origin.x : window.innerWidth / 2;
    var y = origin && origin.y != null ? origin.y : window.innerHeight * 0.42;
    var el = starEl(x, y);
    el.style.transition = 'transform .16s cubic-bezier(.16,1,.3,1)';
    void el.offsetWidth;
    el.style.transform = 'translate(-50%,-50%) scale(1)';
    setTimeout(function () {
      el.style.transition = 'transform .24s cubic-bezier(.5,0,.9,.4)';
      el.style.transform = 'translate(-50%,-50%) scale(0)';
      setTimeout(function () { el.remove(); }, 280);
    }, 190);
  }

  function transition(kind, fn, origin) {
    if (typeof fn !== 'function') return;
    if (reduced || wipeBusy) { fn(); return; } // never block navigation
    wipeBusy = true;
    if (kind === 'star') starTransition(fn, origin); else checkerTransition(fn);
  }

  /* ================= ITEM ROULETTE (§2.5.1) =================
     850 ms decelerating spin: swaps at widening gaps, then the real item
     lands with a pop. game.js blocks item use while BKFX.spinning. */
  var spin = { active: false, timers: [] };
  function clearSpinTimers() { spin.timers.forEach(clearTimeout); spin.timers = []; }
  function roulette(finalItem, items, hooks) {
    var slot = $('item-slot'), icon = $('item-icon'), name = $('item-name');
    if (!slot || !icon || spin.active || !finalItem) return false;
    var pool = Object.keys(items || {}).map(function (k) { return items[k]; }).filter(Boolean);
    if (!pool.length) return false;
    spin.active = true;
    slot.classList.add('spinning');
    slot.classList.remove('has-item');
    if (name) name.textContent = '···';
    var gaps = [45, 50, 55, 65, 75, 90, 110, 140]; // cumulative swaps: 45..630 ms
    var t = 0;
    gaps.forEach(function (g, i) {
      t += g;
      spin.timers.push(setTimeout(function () {
        var it = pool[(Math.random() * pool.length) | 0];
        icon.textContent = it.icon;
        if (name) name.textContent = it.name;
        icon.style.transform = 'scale(.7)';
        setTimeout(function () { icon.style.transform = ''; }, 42);
        if (hooks && hooks.tick) { try { hooks.tick(i); } catch (e) { } }
      }, t));
    });
    spin.timers.push(setTimeout(function () { land(finalItem, hooks); }, 850));
    return true;
  }
  function land(item, hooks) {
    clearSpinTimers();
    spin.active = false;
    var slot = $('item-slot'), icon = $('item-icon'), name = $('item-name');
    if (slot) {
      slot.classList.remove('spinning');
      slot.classList.add('has-item');
      slot.classList.remove('landed'); void slot.offsetWidth; slot.classList.add('landed');
      setTimeout(function () { slot.classList.remove('landed'); }, 380);
    }
    if (icon) icon.textContent = item.icon;
    if (name) name.textContent = item.name;
    if (hooks && hooks.land) { try { hooks.land(); } catch (e) { } }
  }
  function cancel() { // an authoritative slot refresh (race start, item use) kills a stale spin
    if (!spin.active) return;
    clearSpinTimers();
    spin.active = false;
    var slot = $('item-slot');
    if (slot) slot.classList.remove('spinning');
  }

  var BKFX = { transition: transition, burst: burst, roulette: roulette, cancel: cancel };
  Object.defineProperty(BKFX, 'spinning', { get: function () { return spin.active; } });
  window.BKFX = BKFX;
})();
