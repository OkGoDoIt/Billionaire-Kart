/* Temporary viewer while the engine comes together. */
import * as THREE from 'three';
import { Gfx } from './render/gfx.js';
import { Track } from './track/track.js';
import { buildTrackMesh, trackUniforms } from './track/trackmesh.js';
import { buildKart } from './models/kart.js';
import { preloadFaces } from './models/driver.js';
import { RACERS, RACER_BY_ID } from './content/racers.js';
import sv from './tracks/silicon-valley.js';

await document.fonts.load('40px "Luckiest Guy"').catch(() => {});
await preloadFaces();
const canvas = document.getElementById('game');
const q = new URLSearchParams(location.search);
const gfx = new Gfx(canvas, q.get('q') ? { quality: q.get('q') } : {});
gfx.fixedScale = true;
const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 2400);
const focus = new THREE.Vector3();
gfx.setViews([{ camera: cam, rect: [0, 0, 1, 1], focus }]);
window.BK = { gfx, cam, THREE, RACERS };

if (q.get('view') === 'kart') {
  gfx.setSky('day');
  const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: 0x8fa3b8, roughness: 0.9 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; gfx.scene.add(ground);
  const ids = (q.get('r') || 'elon').split(',');
  const rigs = ids.map((id, i) => { const rig = buildKart(RACER_BY_ID[id]); rig.root.position.x = (i - (ids.length - 1) / 2) * 2.6; gfx.scene.add(rig.root); return rig; });
  const st = BK.st = { az: +(q.get('az') || 0.6), el: +(q.get('el') || 0.28), dist: +(q.get('d') || 6.5), y: 0.9, spin: 0, x: 0 };
  let last = performance.now();
  const frame = now => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    st.az += st.spin * dt;
    cam.position.set(st.x + Math.sin(st.az) * Math.cos(st.el) * st.dist, st.y + Math.sin(st.el) * st.dist, Math.cos(st.az) * Math.cos(st.el) * st.dist);
    cam.lookAt(st.x, st.y, 0); focus.set(st.x, 0, 0);
    gfx.render(dt); requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  BK.rigs = rigs;
} else {
  const def = sv, track = new Track(def);
  gfx.setSky(def.sky);
  gfx.scene.add(buildTrackMesh(track, def.look));
  cam.fov = 64; cam.updateProjectionMatrix();
  const st = BK.st = { s: 0, lat: 0, h: 2.6, back: 7, speed: 24, auto: true };
  const P = new THREE.Vector3(), Q = new THREE.Vector3();
  let last = performance.now();
  const frame = now => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (st.auto) st.s += st.speed * dt;
    track.pointAt(st.s - st.back, st.lat, P, st.h); track.pointAt(st.s + 14, st.lat, Q, 1);
    cam.position.copy(P); cam.lookAt(Q); focus.copy(Q);
    trackUniforms.uTime.value = now / 1000;
    gfx.render(dt); requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  BK.track = track;
}
