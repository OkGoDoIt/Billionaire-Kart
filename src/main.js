/* Boot. For now this drops straight into a race; menus arrive next. */
import * as THREE from 'three';
import { Gfx } from './render/gfx.js';
import { Input } from './core/input.js';
import { RaceSession } from './game/session.js';
import { preloadFaces } from './models/driver.js';
import { buildKart } from './models/kart.js';
import { RACERS, RACER_BY_ID } from './content/racers.js';
import { TRACKS, TRACK_BY_ID, registerTrack } from './content/tracks.js';

await document.fonts.load('40px "Luckiest Guy"').catch(() => {});
await preloadFaces();
const q = new URLSearchParams(location.search);
const canvas = document.getElementById('game');
const gfx = new Gfx(canvas, q.get('q') ? { quality: q.get('q') } : {});
const app = { gfx, input: new Input(), ui: document.getElementById('ui'), audio: null, session: null };
window.BK = { app, gfx, THREE, RACERS };

if (q.get('view') === 'kart') {
  gfx.fixedScale = true; gfx.setSky('day');
  const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 2400), focus = new THREE.Vector3();
  gfx.setViews([{ camera: cam, rect: [0, 0, 1, 1], focus }]);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: 0x8fa3b8, roughness: 0.9 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; gfx.scene.add(ground);
  const ids = (q.get('r') || 'elon').split(',');
  BK.rigs = ids.map((id, i) => { const rig = buildKart(RACER_BY_ID[id]); rig.root.position.x = ((ids.length - 1) / 2 - i) * 2.7; gfx.scene.add(rig.root); return rig; });
  const st = BK.st = { az: +(q.get('az') || 0.6), el: +(q.get('el') || 0.28), dist: +(q.get('d') || 6.5), y: 0.9, spin: 0, x: 0 };
  let last = performance.now();
  const frame = now => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; st.az += st.spin * dt;
    cam.position.set(st.x + Math.sin(st.az) * Math.cos(st.el) * st.dist, st.y + Math.sin(st.el) * st.dist, Math.cos(st.az) * Math.cos(st.el) * st.dist);
    cam.lookAt(st.x, st.y, 0); focus.set(st.x, 0, 0); gfx.render(dt); requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
} else {
  // a track file that is not in the registry yet can still be loaded by name while it is being built
  const wanted = q.get('track');
  if (wanted && !TRACK_BY_ID[wanted]) registerTrack((await import(`./tracks/${wanted}.js`)).default);
  const start = () => {
    app.session?.dispose();
    app.session = new RaceSession(app, {
      trackId: q.get('track') || TRACKS[0].id, cc: +(q.get('cc') || 150), level: q.get('level') || 'normal',
      players: (q.get('r') || 'elon').split(',').map((racerId, i) => ({ racerId, device: ['kb1', 'kb2', 'pad0', 'pad1'][i] })),
      seed: q.get('seed') ? +q.get('seed') : undefined, auto: q.get('auto') === '1', intro: q.get('intro') !== '0', laps: q.get('laps') ? +q.get('laps') : undefined,
    });
    BK.session = app.session; BK.race = app.session.race;
  };
  app.onRaceDone = () => setTimeout(start, 5000);
  app.input.onMenu = action => {
    if (action === 'pause' || action === 'back') app.session.setPaused(!app.session.paused);
    if (action === 'confirm') app.session.skipIntro();
    if (action === 'reset') app.session.race.players[0]?.startRescue();
  };
  // ?fly=1 parks the camera on the track for authoring screenshots: BK.fly = { s, lat, h, back, look } or { top: true }
  if (q.get('fly')) {
    const fly = BK.fly = { s: +(q.get('s') || 0), lat: 0, h: 5, back: 12, look: 22, top: q.get('fly') === 'top' };
    const P = new THREE.Vector3(), Q = new THREE.Vector3();
    app.afterUpdate = s => {
      const tr = s.race.track, cam = s.view.views[0].camera;
      for (const h of s.huds) h.setVisible(false);
      if (fly.top) { const b = tr.bounds, span = Math.max(b.maxX - b.minX, b.maxZ - b.minZ); cam.position.set(b.cx, b.maxY + span * 0.95, b.cz + span * 0.35); cam.lookAt(b.cx, b.minY, b.cz); s.view.views[0].focus.set(b.cx, 0, b.cz); }
      else { tr.pointAt(fly.s - fly.back, fly.lat, P, fly.h); tr.pointAt(fly.s + fly.look, 0, Q, 1.2); cam.position.copy(P); cam.lookAt(Q); s.view.views[0].focus.copy(Q); }
      if (cam.fov !== 60) { cam.fov = 60; cam.updateProjectionMatrix(); }
    };
  }
  start();
  let last = performance.now();
  const frame = now => { const dt = Math.min(0.1, (now - last) / 1000); last = now; app.session.frame(dt); requestAnimationFrame(frame); };
  requestAnimationFrame(frame);
}
