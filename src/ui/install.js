/* Getting phone-browser players into the installed app, and taking a room link with them.

   The platform facts this is built on (checked Nov 2026; sources in PR #152 and the join-and-share PR):
   - Chromium (Chrome, Edge, Samsung Internet) fires `beforeinstallprompt` once the app passes Chrome's
     install criteria; the page defers the event and fires `prompt()` from its own button. Never on iOS.
   - iOS installs by hand: Share → Add to Home Screen → Add. In Safari 26 the Share button moved into
     the ••• menu. The same flow works from Chrome, Firefox, and Edge on iOS.
   - On iPhone a link ALWAYS opens in Safari (or the app's in-app browser), never in the installed game,
     and the installed game has its own storage: nothing Safari keeps is visible to it, with one
     exception — since iOS 17.2 the cookies Safari holds at the moment of Add to Home Screen are copied
     into the new app, once.
   - On Android an installed game (a WebAPK) opens links from other apps itself, and shares storage
     with Chrome.
   - Element fullscreen does not exist on iPhone Safari, so on an iPhone installing IS the fullscreen
     answer. In-app browsers (Messenger, Instagram, …) cannot install at all.

   So, for a room link (?room=CODE) opened in a phone browser, the room is remembered three ways for
   half an hour at most, and the installed game takes it (once) when it opens or comes back to the front:
   a cookie (copied into a game installed from this page), localStorage (Android, where storage is
   shared), and a note on the race server keyed by the phone's network address and model (an iPhone
   whose game was installed before; POST /api/handoff, docs/online-protocol.md).

   The get-the-app sheet opens by itself in a phone browser, once per visit and for every room link,
   and never blocks play: "Play in Safari" is always one tap. Installed players never see any of it. */

const STORE_KEY = 'bk-install';
const ROOM_KEY = 'bk-room', ROOM_MS = 30 * 60 * 1000, SEEN_KEY = 'bk-sheet-seen', APP_KEY = 'bk-app-seen', APP_MS = 30 * 24 * 60 * 60 * 1000;
const ONLINE_HOSTS = ['billionaire-kart.okgodoit.com', 'localhost:5210', '127.0.0.1:5210', 'localhost:5211', '127.0.0.1:5211'];

const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const k in attrs) { const v = attrs[k]; if (v == null || v === false) continue; if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v); }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) e.append(kid.nodeType ? kid : document.createTextNode(kid));
  return e;
};

/* ---------- remembered state ---------- */
const store = {
  read() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; } },
  write(patch) { try { localStorage.setItem(STORE_KEY, JSON.stringify({ ...store.read(), ...patch })); } catch { /* private mode: forget quietly */ } },
};

/* ---------- the room a link brought this phone ---------- */
const ROOM_RE = /^[BCDFGHJKLMNPQRSTVWXZ]{4}$/;
const server = (method, path, body) => ONLINE_HOSTS.includes(location.host)
  ? fetch(path, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined, keepalive: true, signal: AbortSignal.timeout(8000) })
  : Promise.reject(new Error('no race server here'));
/** Remember a room link for the installed game: cookie, localStorage, and the server's note. */
export function rememberRoom(code) {
  if (!ROOM_RE.test(code)) return;
  const v = `${code}.${Date.now()}`;
  try { document.cookie = `${ROOM_KEY}=${v}; Max-Age=${ROOM_MS / 1000}; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`; } catch { /* cookies off */ }
  try { localStorage.setItem(ROOM_KEY, v); } catch { /* private mode */ }
  server('POST', '/api/handoff', { code }).catch(() => {});
}
/** The player is playing this room here after all: forget it everywhere. */
export function forgetRoom() {
  clearRoom();
  server('DELETE', '/api/handoff').catch(() => {});
}
function clearRoom() {
  try { document.cookie = `${ROOM_KEY}=; Max-Age=0; Path=/; SameSite=Lax`; } catch { /* cookies off */ }
  try { localStorage.removeItem(ROOM_KEY); } catch { /* private mode */ }
}
const fresh = v => { const [code, at] = String(v || '').split('.'); return ROOM_RE.test(code) && Date.now() - +at < ROOM_MS ? code : null; };
/* ---------- does this phone have the game installed? ---------- */
/** In the installed game, at every launch and return: say so, where the browser can find out. localStorage is
    shared with Chrome on Android; the race server remembers this player (whose cookie an iPhone copies from
    Safari into the game it installs) and this phone's network and model (POST /api/app). */
export function announceApp() {
  if (!installContext().standalone || installContext().forced) return;
  try { localStorage.setItem(APP_KEY, String(Date.now())); } catch { /* private mode */ }
  server('POST', '/api/app').catch(() => {});
}
/** In a phone browser: does this player probably have the game installed? Every signal we have, any one will do:
    the game's own mark (Android), Chrome's list of installed web apps (Android), and the race server (iPhone). */
export async function likelyHasApp() {
  const f = installContext().forced;
  if (f) return new URLSearchParams(location.search).get('hasapp') === '1';
  try { if (Date.now() - +localStorage.getItem(APP_KEY) < APP_MS) return true; } catch { /* private mode */ }
  const checks = [
    navigator.getInstalledRelatedApps?.().then(a => a.length > 0).catch(() => false),
    server('GET', '/api/app').then(r => r.ok ? r.json() : null).then(j => !!j?.app).catch(() => false),
  ].filter(Boolean);
  const any = new Promise(resolve => { let left = checks.length; if (!left) resolve(false); for (const c of checks) c.then(v => { if (v) resolve(true); else if (!--left) resolve(false); }); });
  return Promise.race([any, new Promise(r => setTimeout(() => r(false), 1500))]);
}

/** In the installed game: the room a link left for it, if any (each is used once), else null. */
export async function takeRoom() {
  if (!installContext().standalone) return null;
  let code = null;
  try { code = fresh(document.cookie.split('; ').find(c => c.startsWith(ROOM_KEY + '='))?.slice(ROOM_KEY.length + 1)); } catch { /* cookies off */ }
  try { code ||= fresh(localStorage.getItem(ROOM_KEY)); } catch { /* private mode */ }
  clearRoom();
  if (!code) {
    try { const r = await server('POST', '/api/handoff/claim'); if (r.status === 200) code = (await r.json()).code; } catch { /* offline, or no race server */ }
  }
  return ROOM_RE.test(code || '') ? code : null;
}

/* ---------- the deferred Chromium prompt ---------- */
let deferredPrompt = null;
const listeners = new Set();
const notify = () => { for (const fn of [...listeners]) { try { fn(); } catch { /* a dead screen unsubscribes itself */ } } };
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; notify(); });
addEventListener('appinstalled', () => { deferredPrompt = null; store.write({ installed: true }); closeSheet(); notify(); });
/** Run fn whenever installability changes (the prompt arriving, an install). Returns an unsubscribe. */
export const onInstallChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };

/* ---------- context detection ---------- */
const forced = () => new URLSearchParams(location.search).get('install');   // ?install=ios|android|prompt|inapp|standalone — screenshots and tests
/* Was this page LAUNCHED as an installed app? Latched once, here at load, on purpose:
   display-mode fullscreen matches an installed launch (our manifest asks for fullscreen)
   AND a plain browser tab the page itself put into element fullscreen — and this game does
   exactly that on the title tap, before the main menu ever mounts. Read live, the check
   would call every Android browser player "already installed" and hide the guidance from
   precisely the people it exists for. At load, no tap has happened yet, so the mode is the
   launch mode: installed apps report standalone/fullscreen, browser tabs report browser. */
const launchedStandalone = navigator.standalone === true
  || matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: minimal-ui)').matches;
export function installContext() {
  const f = forced();
  if (f) {
    return {
      standalone: f === 'standalone', platform: f === 'ios' ? 'ios' : f === 'standalone' ? 'ios' : 'android',
      browser: f === 'ios' ? 'safari' : 'chrome', inApp: f === 'inapp', coarse: true, forced: f,
    };
  }
  const ua = navigator.userAgent || '';
  const standalone = launchedStandalone;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  const inApp = /FBAN|FBAV|FB_IAB|Instagram|MicroMessenger|Snapchat|TikTok|Line\//.test(ua);
  const browser = inApp ? 'inapp'
    : /EdgiOS|EdgA|Edg\//.test(ua) ? 'edge'
    : /FxiOS|Firefox\//.test(ua) ? 'firefox'
    : /CriOS|Chrome\/|SamsungBrowser/.test(ua) ? 'chrome'
    : /Safari\//.test(ua) ? 'safari' : 'other';
  return { standalone, platform: ios ? 'ios' : android ? 'android' : 'desktop', browser, inApp, coarse: matchMedia('(pointer: coarse)').matches, forced: null };
}

/** What we can offer this player, if anything:
    'prompt' a real Install button (Chromium deferred prompt is in hand)
    'ios'    step card for Share → Add to Home Screen
    'menu'   step card for the Android browser menu (Chrome pre-prompt, Firefox)
    'inapp'  advice to open the page in a real browser
    null     nothing useful to say (desktop without a prompt, already installed…) */
export function installOffer() {
  const c = installContext();
  if (c.standalone || store.read().installed) return null;
  if (c.forced) return c.forced === 'prompt' ? 'prompt' : c.forced === 'ios' ? 'ios' : c.forced === 'inapp' ? 'inapp' : 'menu';
  if (deferredPrompt) return 'prompt';
  if (c.inApp) return c.coarse ? 'inapp' : null;
  if (c.platform === 'ios') return 'ios';
  if (c.platform === 'android') return 'menu';
  return null;
}

/* ---------- what to say ---------- */
const SHARE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11M8 6l4-4 4 4M5 11v9h14v-9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const DOTS = '<b class="install-glyph">\u2022\u2022\u2022</b>', VDOTS = '<b class="install-glyph">\u22ee</b>';
/** Where this browser keeps Share (iOS): Safari 26 tucked it into the ••• menu. */
function shareStep(c) {
  const v = +((navigator.userAgent.match(/Version\/(\d+)/) || [])[1] || 0);
  if (c.browser === 'safari' && (v >= 26 || c.forced)) return ['Tap ' + DOTS + ', then Share ' + SHARE_SVG, 'The \u2022\u2022\u2022 button is next to the address bar.'];
  if (c.browser === 'safari') return ['Tap Share ' + SHARE_SVG, 'It\u2019s in Safari\u2019s toolbar.'];
  if (c.browser === 'chrome') return ['Tap Share ' + SHARE_SVG, 'It\u2019s at the right of the address bar.'];
  return ['Open the Share menu ' + SHARE_SVG, 'It\u2019s in your browser\u2019s menu.'];
}
const stepsFor = (kind, room) => {
  const c = installContext(), open = room ? `Then open Billionaire Kart from your Home Screen. It goes straight to room ${room}.` : 'Then open Billionaire Kart from your Home Screen.';
  if (kind === 'ios') return [shareStep(c), ['Tap \u201cAdd to Home Screen\u201d', 'Scroll down the list if you don\u2019t see it.'], ['Tap \u201cAdd\u201d', open]];
  if (kind === 'menu') return [['Tap ' + VDOTS, 'The menu button next to the address bar.'], ['Tap \u201cInstall app\u201d', 'Some browsers say \u201cAdd to Home screen\u201d.'], ['Tap \u201cInstall\u201d', open]];
  return [['Tap ' + DOTS + ' or ' + VDOTS, 'At the top or bottom corner of this screen.'], ['Choose \u201cOpen in browser\u201d', 'Or \u201cOpen in Safari\u201d or \u201cOpen in Chrome\u201d.'], ['Add it to your Home Screen there', room ? `The link keeps room ${room}.` : 'The steps will be waiting.']];
};
const browserName = () => ({ safari: 'Safari', chrome: 'Chrome', edge: 'Edge', firefox: 'Firefox' })[installContext().browser] || 'the browser';
const stepList = (kind, room, cls = '') => el('ol', { class: 'install-steps ' + cls }, stepsFor(kind, room).map(([head, body], i) =>
  el('li', {}, el('i', {}, String(i + 1)), el('div', {}, el('b', { html: head }), el('span', { html: body })))));

/* ---------- the sheet ---------- */
let overlay = null, opener = null, ringed = null, onDone = null;
/** The menus show focus with a .focus ring, not the browser's outline; the sheet does the same. */
function ringFocus(elm) {
  if (ringed === elm) return;
  ringed?.classList.remove('focus'); ringed = elm;
  elm?.classList.add('focus');
}
function closeSheet(play = false) {
  if (!overlay) return;
  overlay.remove(); overlay = null; ringFocus(null);
  const back = opener, done = onDone; opener = null; onDone = null;
  if (play && done) done();
  else if (back?.isConnected) { back.classList.add('focus'); back.focus({ preventScroll: true }); }
}
function moveFocus(backwards) {
  const controls = [...overlay.querySelectorAll('button')].filter(b => b.offsetParent !== null);
  const i = controls.indexOf(document.activeElement);
  controls[(i + (backwards ? -1 : 1) + controls.length) % controls.length]?.focus({ preventScroll: true });
}
/** The sheet owns menu input until dismissed, including stick movement and Start. */
export function handleInstallAction(action) {
  if (!overlay) return false;
  if (action === 'back' || action === 'pause') closeSheet(true);
  else if (action === 'confirm') document.activeElement?.closest?.('.install-overlay button')?.click();
  else if (action === 'up' || action === 'left') moveFocus(true);
  else if (action === 'down' || action === 'right') moveFocus(false);
  return true;
}
function onSheetKey(e) {
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeSheet(true); }
  else if (e.key === 'Tab') { e.preventDefault(); moveFocus(e.shiftKey); }
}

/** The get-the-app sheet. room: a room link's code (the sheet is then that room's landing); onPlay: what
    "Play in Safari" (or closing) does. From a menu button, closing just returns to the menu. */
export function openInstall(trigger = document.activeElement, { room = null, onPlay = null, hasApp = false } = {}) {
  const kind = installOffer();
  if (!kind) { onPlay?.(); return false; }
  closeSheet();
  opener = trigger instanceof HTMLElement && trigger !== document.body ? trigger : null;
  opener?.classList.remove('focus');
  onDone = onPlay;
  const sheet = el('div', { class: 'install-sheet' });
  const play = el('button', { class: 'btn install-play', onclick: () => { if (room) forgetRoom(); closeSheet(true); } }, `Play in ${browserName()}`);
  const main = () => {
    const kids = [
      el('h2', {}, room ? `Join room ${room}` : 'Get the app'),
      el('p', { class: 'install-blurb' }, kind === 'inapp' ? 'This in-app browser can\u2019t install games. Open the page in your browser first.'
        : room ? 'Get the app first. It plays full screen, with no browser bars, and opens straight into this room.'
        : 'Billionaire Kart plays full screen from your Home Screen, with no browser bars in the way.'),
    ];
    if (kind === 'prompt') kids.push(el('button', { class: 'btn go install-do', onclick: () => promptInstall(room) }, 'Install Billionaire Kart'));
    else kids.push(stepList(kind, room));
    kids.push(el('div', { class: 'install-row' }, room && kind !== 'inapp' && el('button', { class: 'btn install-have', onclick: () => waiting() }, 'I already have the app'), play));
    sheet.replaceChildren(...kids.filter(Boolean));
    focusFirst();
  };
  // they have the game already: the room is waiting for it (the cookie, storage, and server note are set)
  const waiting = () => {
    rememberRoom(room);
    sheet.replaceChildren(
      el('h2', {}, 'Open the app'),
      el('p', { class: 'install-blurb' }, 'Open Billionaire Kart from your Home Screen and it goes straight to this room. If it doesn\u2019t, tap Online, then Join with a code:'),
      el('div', { class: 'install-code', 'aria-label': 'Room code ' + room.split('').join(' ') }, room),
      el('div', { class: 'install-row' }, el('button', { class: 'btn install-back', onclick: () => main() }, 'I don\u2019t have the app'), play));
    focusFirst();
  };
  // no room, but they have the game: say where it is
  const haveIt = () => {
    sheet.replaceChildren(
      el('h2', {}, 'Open the app'),
      el('p', { class: 'install-blurb' }, 'You have Billionaire Kart on your Home Screen. Open it there to play full screen.'),
      el('div', { class: 'install-row' }, el('button', { class: 'btn install-back', onclick: () => main() }, 'I don\u2019t have the app'), play));
    focusFirst();
  };
  const focusFirst = () => { const b = sheet.querySelector('button'); if (b) { ringFocus(b); b.focus({ preventScroll: true }); } };
  overlay = el('div', { class: 'install-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Get the app' }, sheet);
  overlay.addEventListener('keydown', onSheetKey);
  overlay.addEventListener('focusin', e => ringFocus(e.target.closest('button')));
  document.body.appendChild(overlay);
  if (room) rememberRoom(room);
  if (hasApp && kind !== 'inapp' && kind !== 'prompt') { if (room) waiting(); else haveIt(); } else main();
  return true;
}
/** On the title, in a phone browser: the sheet, once per visit and for every room link, opened on what fits this
    player (install steps, or "open the app" when they seem to have it). True if it will open. */
export function autoInstall({ room = null, onPlay, when = () => true }) {
  const c = installContext(), kind = installOffer();
  if (!kind || !(c.coarse || c.forced)) return false;
  let seen = false; try { seen = sessionStorage.getItem(SEEN_KEY) === '1'; sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* private mode */ }
  if (seen && !room) return false;
  // a link: give this browser its player now, so a game installed from here (which copies its cookies) is the same player
  if (room) server('POST', '/api/session').catch(() => {});
  likelyHasApp().then(hasApp => { if (!overlay && when()) openInstall(null, { room, onPlay, hasApp }); });
  return true;
}
async function promptInstall(room) {
  const e = deferredPrompt; if (!e) return;
  deferredPrompt = null;   // a deferred prompt can be spent only once
  try {
    e.prompt();
    const choice = await e.userChoice.catch(() => null);
    if (choice?.outcome === 'accepted') { store.write({ installed: true }); if (room) rememberRoom(room); }
  } catch { /* the browser declined to show it; the menu advice still applies */ }
  notify();
}

/* ---------- pieces the menus place ---------- */
/** A persistent menu button (label + action) for the main menu row / Options. Null when there's nothing to offer. */
export function installButton() {
  const kind = installOffer();
  if (!kind) return null;
  return { label: kind === 'prompt' ? 'Install app' : 'Get the app', act: trigger => likelyHasApp().then(hasApp => openInstall(trigger, { hasApp })) };
}
/** The How to Play panel. Null when there's nothing to offer. */
export function installPanel() {
  const kind = installOffer();
  if (!kind) return null;
  const kids = [el('h3', {}, 'Play it like an app'), el('p', { class: 'install-panel-blurb' }, 'Billionaire Kart plays full screen from your Home Screen, with no browser bars in the way.')];
  if (kind === 'prompt') kids.push(el('button', { class: 'btn go install-do', onclick: () => promptInstall() }, 'Install Billionaire Kart'));
  else kids.push(stepList(kind, null, 'compact'));
  return el('div', { class: 'panel install-panel' }, kids);
}

window.BKInstall = { context: installContext, offer: installOffer, open: openInstall, takeRoom, likelyHasApp };   // dev/debug handle, used by the screenshot tools
