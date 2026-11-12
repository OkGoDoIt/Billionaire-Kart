/* Showroom: the turntable scene behind character select, and the podium at the
   end of a cup. Lives in the main scene so it shares lighting and post effects. */
import * as THREE from 'three';
import { buildKart } from '../models/kart.js';
import { Particles } from './particles.js';
import { damp } from '../core/util.js';

export class Showroom {
  constructor(gfx) {
    this.gfx = gfx; this.root = new THREE.Group(); this.root.name = 'showroom'; gfx.scene.add(this.root);
    gfx.setSky('studio');
    const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshStandardMaterial({ color: 0x1b2040, roughness: 0.35, metalness: 0.4, envMapIntensity: 0.9 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; this.root.add(floor);
    this.camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 800);
    this.focus = new THREE.Vector3(0, 0.8, 0);
    this.slots = []; this.rigs = new Map(); this.t = 0; this.fx = new Particles(this.root, 1);
    this.camPos = new THREE.Vector3(0, 2.2, 9); this.camWant = this.camPos.clone(); this.look = new THREE.Vector3(0, 0.9, 0); this.lookWant = this.look.clone();
    // what to frame (a box in the world) and where on screen to put it (a rectangle the menu leaves free)
    this.subject = { y: 1.2, w: 5, h: 3 }; this.stage = { cx: 0.5, cy: 0.5, w: 1, h: 1 }; this.stageNow = null;
    gfx.setViews([{ camera: this.camera, rect: [0, 0, 1, 1], focus: this.focus, onBeforeRender: () => this.fx.setViewport(gfx.renderer.domElement.height, this.camera.fov) }]);
  }

  _plinth(x, z, h = 0.25, r = 2.1, color = 0x2a3160) {
    const g = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.06, h, 48), new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.5 }));
    top.position.y = h / 2; top.receiveShadow = true; top.castShadow = true; g.add(top);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.0, 0.05, 8, 64), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffd23c, emissiveIntensity: 2.2 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = h + 0.02; g.add(ring);
    g.position.set(x, 0, z); this.root.add(g); return g;
  }

  /** The part of the screen the menu leaves free for the scene, as a DOM rectangle. The camera frames the subject inside it. */
  setStage(r) {
    const W = Math.max(1, innerWidth), H = Math.max(1, innerHeight);
    if (r.width < 8 || r.height < 8) return;
    this.stage = { cx: (r.left + r.width / 2) / W, cy: (r.top + r.height / 2) / H, w: r.width / W, h: r.height / H };
  }
  _frame(dt) {
    const s = this.subject, want = this.stage, W = this.gfx.width || innerWidth, H = this.gfx.height || innerHeight;
    const st = this.stageNow || (this.stageNow = { ...want });
    for (const k of ['cx', 'cy', 'w', 'h']) st[k] = dt > 0 ? damp(st[k], want[k], 6, dt) : want[k];
    // the world height the whole screen must span for the subject to fit inside the stage, both ways
    const span = Math.max(s.h / st.h, s.w * H / (st.w * W)), dist = span / (2 * Math.tan(this.camera.fov * Math.PI / 360));
    this.camWant.set(0, s.y + dist * 0.14, dist); this.lookWant.set(0, s.y, 0);
    const v = this.camera.view || (this.camera.view = { enabled: true, fullWidth: 1, fullHeight: 1, offsetX: 0, offsetY: 0, width: 1, height: 1 });
    const ox = 0.5 - st.cx, oy = 0.5 - st.cy;
    if (Math.abs(v.offsetX - ox) > 1e-4 || Math.abs(v.offsetY - oy) > 1e-4 || !v.enabled) { v.enabled = true; v.offsetX = ox; v.offsetY = oy; this.camera.updateProjectionMatrix(); }
  }

  /** Show these racers on turntables (one per local player). */
  setRacers(racers, { spin = true } = {}) {
    const offsetX = 0;
    for (const s of this.slots) this.root.remove(s.group);
    this.slots = [];
    const n = racers.length, gap = n > 2 ? 3.6 : 4.6;
    racers.forEach((racer, i) => {
      const x = offsetX + (i - (n - 1) / 2) * gap;
      const group = this._plinth(x, 0);
      const holder = new THREE.Group(); holder.position.y = 0.25; group.add(holder);
      this.slots.push({ group, holder, racer: null, rig: null, spin, angle: -0.6 + i * 0.2, pop: 1 });
      this.setRacer(i, racer);
    });
    this.subject = { y: 1.2, w: (n - 1) * gap + 4.5, h: 2.7 }; this.podium = false;
  }
  setRacer(i, racer) {
    const s = this.slots[i]; if (!s || s.racer === racer) return;
    if (s.rig) s.holder.remove(s.rig.root);
    s.racer = racer; s.rig = racer ? buildKart(racer) : null;
    if (s.rig) { s.holder.add(s.rig.root); s.pop = 0; s.sway = 0; }
  }

  /** Podium for the top three of a cup. */
  setPodium(top3) {
    for (const s of this.slots) this.root.remove(s.group);
    this.slots = [];
    const spots = [[0, 0, 1.5, 0xffd23c], [-4.2, 0.4, 1.0, 0xdfe7f2], [4.2, 0.6, 0.65, 0xf0a25a]];
    top3.forEach((racer, i) => {
      const [x, z, h, color] = spots[i];
      const group = this._plinth(x, z, h, 2.0, 0x2a3160);
      group.children[1].material = group.children[1].material.clone(); group.children[1].material.emissive.setHex(color);
      const holder = new THREE.Group(); holder.position.y = h; group.add(holder);
      const rig = buildKart(racer); holder.add(rig.root);
      this.slots.push({ group, holder, racer, rig, spin: false, angle: 0.5 - i * 0.5 + (i === 2 ? 0.3 : 0), pop: 0, podium: i });
    });
    this.subject = { y: 2.0, w: 13.5, h: 5.4 }; this.podium = true;
  }

  update(dt) {
    this.t += dt;
    for (const s of this.slots) {
      // sway rather than spin, so the face is always in view
      s.sway = (s.sway || 0) + dt;
      s.holder.rotation.y = s.spin ? 0.3 + Math.sin(s.sway * 0.55) * 0.85 : s.angle;
      s.pop = Math.min(1, s.pop + dt * 3.2);
      const e = 1 - Math.pow(1 - s.pop, 3), k = 0.3 + 0.7 * e * (1 + Math.sin(s.pop * 8) * 0.1 * (1 - s.pop));
      s.holder.scale.setScalar(k);
      if (s.rig) {
        // idle life: bobble the head and rock the body a little
        s.rig.head.rotation.set(Math.sin(this.t * 2.1 + s.angle) * 0.07, Math.sin(this.t * 1.3) * 0.25, Math.sin(this.t * 1.7) * 0.06);
        if (s.rig.head2) s.rig.head2.rotation.set(Math.sin(this.t * 1.9) * 0.08, Math.sin(this.t * 1.1 + 1) * 0.3, 0);
        s.rig.body.position.y = Math.sin(this.t * 3 + s.angle) * 0.012;
        if (s.podium === 0) { s.rig.torso.rotation.x = -0.1 + Math.sin(this.t * 8) * 0.06; s.rig.tilt.position.y = Math.abs(Math.sin(this.t * 4)) * 0.18; }
      }
    }
    if (this.podium && this.fx.count(26, dt)) this.fx.confetti((Math.random() - 0.5) * 14, 9, (Math.random() - 0.5) * 5, 1, [[1, 0.82, 0.24], [1, 0.3, 0.43], [0.22, 0.71, 1], [0.18, 0.9, 0.65], [1, 1, 1]], 2, 0);
    this.fx.update(dt);
    this._frame(dt);
    this.camPos.x = damp(this.camPos.x, this.camWant.x, 4, dt); this.camPos.y = damp(this.camPos.y, this.camWant.y, 4, dt); this.camPos.z = damp(this.camPos.z, this.camWant.z, 4, dt);
    this.look.lerp(this.lookWant, 1 - Math.exp(-4 * dt));
    this.camera.position.copy(this.camPos); this.camera.position.x += Math.sin(this.t * 0.3) * 0.25;
    this.camera.lookAt(this.look); this.focus.copy(this.look);
  }

  dispose() { this.gfx.scene.remove(this.root); this.gfx.setViews([]); }
}
