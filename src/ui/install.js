/* Install guidance: get phone-browser players out of the browser tab and into
   the installed app, with instructions that match their browser and OS.

   The platform facts this is built on (checked Nov 2026; sources in PR #152):
   - Chromium (Chrome, Edge, Samsung Internet) fires `beforeinstallprompt` once
     the app passes Chrome's install criteria; the page defers the event and
     fires `prompt()` from its own button. The event never fires on iOS, in any
     browser — WebKit has no install dialog a page can open.
   - iOS installs by hand: Share → Add to Home Screen → Add. Since iOS 16.4 the
     same flow works from Chrome, Firefox, and Edge on iOS, not just Safari.
   - Element fullscreen does not exist on iPhone Safari (iPad got it in 16.4),
     so on an iPhone installing IS the fullscreen answer. Android gets real
     fullscreen from the API; the game already requests it on the title tap and
     locks landscape at race start (app.js), so this module is the guidance.
   - In-app browsers (Messenger, Instagram, …) cannot install at all; the only
     useful advice there is "open this page in a real browser".

   Nothing here ever blocks play: the proactive card is dismissible and
   remembers the dismissal for a fortnight, the persistent buttons only exist
   where installing is actually possible, and standalone/installed players are
   never shown any of it. */

const STORE_KEY = 'bk-install';
const COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

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

/* ---------- the deferred Chromium prompt ---------- */
let deferredPrompt = null;
const listeners = new Set();
const notify = () => { for (const fn of [...listeners]) { try { fn(); } catch { /* a dead screen unsubscribes itself */ } } };
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; notify(); });
addEventListener('appinstalled', () => { deferredPrompt = null; store.write({ installed: true }); closeSteps(); document.querySelectorAll('.install-card').forEach(n => n.remove()); notify(); });
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

/* ---------- steps content ---------- */
const SHARE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11M8 6l4-4 4 4M5 11v9h14v-9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const stepsFor = kind => {
  if (kind === 'ios') return [
    ['Tap Share', 'The ' + SHARE_SVG + ' button in your browser\u2019s toolbar.'],
    ['Tap \u201cAdd to Home Screen\u201d', 'It hides partway down the list that pops up.'],
    ['Tap \u201cAdd\u201d', 'Billionaire Kart lands on your Home Screen. Open it there and it runs full screen, like a real app.'],
  ];
  if (kind === 'menu') return [
    ['Tap the menu', 'The \u22ee button at the top of your browser.'],
    ['Tap \u201cInstall app\u201d', 'On some browsers it says \u201cAdd to Home screen\u201d instead.'],
    ['Confirm', 'Billionaire Kart lands on your Home Screen and runs full screen, like a real app.'],
  ];
  return [
    ['Open this page in a real browser', 'This in-app browser can\u2019t install anything. Tap \u22ef or \u22ee and choose \u201cOpen in Safari\u201d or \u201cOpen in Chrome\u201d.'],
    ['Then add it from there', 'In Safari or Chrome you can put Billionaire Kart on your Home Screen, where it runs full screen.'],
  ];
};
const BLURB = {
  prompt: 'Install Billionaire Kart and it launches like a real app: full screen, no browser bars, straight from your Home Screen.',
  ios: 'You\u2019re one Share menu away from the good version: installed on your Home Screen, Billionaire Kart runs full screen with no browser bars. Safari just hides the button.',
  menu: 'Add Billionaire Kart to your Home Screen and it runs full screen, no browser bars, like a real app.',
  inapp: 'This browser can\u2019t install apps, so here\u2019s the way out.',
};

/* ---------- the steps overlay ---------- */
let overlay = null;
function closeSteps() { overlay?.remove(); overlay = null; }
export function openInstall() {
  const kind = installOffer();
  if (!kind) return;
  if (kind === 'prompt' && deferredPrompt) { promptInstall(); return; }
  if (kind === 'prompt') { openSteps('menu'); return; }   // forced/screenshot mode: no live event to fire
  openSteps(kind);
}
function openSteps(kind) {
  closeSteps();
  const steps = el('ol', { class: 'install-steps' }, stepsFor(kind).map(([head, body], i) =>
    el('li', {}, el('b', {}, el('i', {}, String(i + 1)), head), el('span', { html: body }))));
  overlay = el('div', { class: 'install-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Add Billionaire Kart to your Home Screen' },
    el('div', { class: 'install-sheet' },
      el('button', { class: 'install-x', 'aria-label': 'Close', onclick: closeSteps, html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>' }),
      el('h2', {}, 'Add to Home Screen'),
      el('p', { class: 'install-blurb' }, BLURB[kind]),
      steps,
      el('button', { class: 'btn go install-gotit', onclick: closeSteps }, 'Got it')));
  overlay.addEventListener('pointerdown', e => { if (e.target === overlay) closeSteps(); });
  document.body.appendChild(overlay);
}
async function promptInstall() {
  const e = deferredPrompt; if (!e) return;
  deferredPrompt = null;   // a deferred prompt can be spent only once
  try {
    e.prompt();
    const choice = await e.userChoice.catch(() => null);
    if (choice?.outcome === 'accepted') store.write({ installed: true });
  } catch { /* the browser declined to show it; the menu advice still applies */ }
  notify();
}

/* ---------- pieces the menus place ---------- */
/** The one-time hint card for the main menu. Null when there's nothing to offer,
    the player already installed, or the last dismissal is still in its cooldown. */
export function installCard() {
  const kind = installOffer();
  if (!kind) return null;
  if (!installContext().forced && Date.now() - (store.read().dismissed || 0) < COOLDOWN_MS) return null;
  const card = el('div', { class: 'install-card' },
    el('div', { class: 'install-card-text' }, el('b', {}, 'Take it full screen'), el('span', {}, BLURB[kind])),
    el('div', { class: 'install-card-btns' },
      kind === 'prompt'
        ? el('button', { class: 'btn go install-do', onclick: () => { card.remove(); openInstall(); } }, 'Install')
        : el('button', { class: 'btn go install-do', onclick: () => openSteps(kind) }, kind === 'inapp' ? 'How?' : 'Show me how'),
      el('button', { class: 'btn install-later', onclick: () => { store.write({ dismissed: Date.now() }); card.remove(); } }, 'Not now')));
  return card;
}
/** A persistent menu button (label + action) for the main menu row / Options. Null when there's nothing to offer. */
export function installButton() {
  const kind = installOffer();
  if (!kind) return null;
  return { label: kind === 'prompt' ? 'Install app' : kind === 'inapp' ? 'Get the app' : 'Add to Home Screen', act: openInstall };
}
/** The How to Play panel. Null when there's nothing to offer. */
export function installPanel() {
  const kind = installOffer();
  if (!kind) return null;
  const kids = [el('h3', {}, 'Play it like an app'), el('p', { class: 'install-panel-blurb' }, BLURB[kind])];
  if (kind === 'prompt') kids.push(el('button', { class: 'btn go install-do', onclick: () => promptInstall() }, 'Install Billionaire Kart'));
  else kids.push(el('ol', { class: 'install-steps compact' }, stepsFor(kind).map(([head, body], i) => el('li', {}, el('b', {}, el('i', {}, String(i + 1)), head), el('span', { html: body })))));
  return el('div', { class: 'panel install-panel' }, kids);
}

window.BKInstall = { context: installContext, offer: installOffer, open: openInstall, card: installCard };   // dev/debug handle, used by the screenshot tools
