/* WEWORK MEMORIAL GP — Billionaire Kart track module (Batch 3, issue #12).
 * A ruined coworking cathedral, raced at golden-hour dusk. The hustle is over;
 * the kombucha taps remain. Signature set piece: the great spiral staircase
 * to nowhere. Animated: the fallen HUSTLE neon flickers, the rooftop W turns. */
import { lam, box, cyl, cone, sign, plaque, canvasSign, scatterEach, clouds, anchorGroup } from './shared.js';

export const TRACK = {
  name: 'WeWork Memorial GP', sky: 0x9aa5b1, fog: 0xb8bec6, ground: 0x77755f, shoulder: 0x8c7a5a, roadSeed: 7,
  points: [[0, -255], [150, -225], [240, -130], [225, -10], [255, 105], [180, 205], [70, 240], [-60, 215], [-150, 245], [-235, 160], [-205, 40], [-245, -70], [-190, -180], [-80, -225]],
};
export const CARD = { emoji: '🏢', desc: 'A ruined coworking cathedral. The kombucha is gone.' };

const SIGNS = [
  ['COMMUNITY ADJUSTED EBITDA', 0.04, 1, 40],
  ['DO WHAT YOU LOVE (TERMS APPLY)', 0.20, -1, 25],
  ['HOT DESK: $0.00/MO FOREVER', 0.36, 1, 200],
  ['$47B VALUATION → $0', 0.52, -1, 0],
  ['WE ARE A TECH COMPANY (WE WERE NOT)', 0.66, 1, 275],
  ['MEMBERSHIP DOES NOT VEST', 0.80, -1, 150],
  ['ELEVATE THE WORLD\'S CONSCIOUSNESS (FORECLOSED)', 0.92, 1, 330],
];

function phoneBooth(ctx, x, z, ry, tint) {
  const g = new ctx.THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; ctx.scene.add(g);
  const shell = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(1.7, 3.6, 1.7), lam(ctx, tint));
  shell.position.y = 1.8; shell.castShadow = true; g.add(shell);
  const glass = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(1.3, 2.6, 0.1),
    new ctx.THREE.MeshLambertMaterial({ color: 0xbfd9e2, emissive: 0x39505c, emissiveIntensity: 0.5 }));
  glass.position.set(0, 1.9, 0.87); g.add(glass);
  return g;
}

function deskRow(ctx, x, z, ry, n) {
  const g = new ctx.THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; ctx.scene.add(g);
  const top = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(n * 2.4, 0.18, 1.3), lam(ctx, 0xd8cfc0));
  top.position.y = 1.15; top.castShadow = true; g.add(top);
  for (let i = 0; i < n; i++) {
    const dx = (i - (n - 1) / 2) * 2.4;
    const mon = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(1.15, 0.75, 0.08), lam(ctx, 0x14161c));
    mon.position.set(dx, 1.75, -0.25); mon.rotation.x = -0.12; g.add(mon);
    const chair = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(0.8, 1.1, 0.8), lam(ctx, i % 2 ? 0xc75146 : 0x3f6d8e));
    chair.position.set(dx, 0.55, 0.85); g.add(chair);
  }
  return g;
}

export function build(ctx) {
  const { scene, trackCenter } = ctx;

  /* ---- signature set piece: the Spiral Staircase to Nowhere ---- */
  const stair = new ctx.THREE.Group();
  stair.position.set(trackCenter.x, 0, trackCenter.z); scene.add(stair);
  const column = new ctx.THREE.Mesh(new ctx.THREE.CylinderGeometry(1.6, 1.9, 30, 12), lam(ctx, 0x8c7a5a));
  column.position.y = 15; column.castShadow = true; stair.add(column);
  const stepMat = lam(ctx, 0xe8e2d4);
  for (let i = 0; i < 30; i++) {
    const a = i * 0.42, step = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(4.6, 0.35, 1.7), stepMat);
    step.position.set(Math.cos(a) * 3.6, 1.2 + i * 0.98, Math.sin(a) * 3.6);
    step.rotation.y = -a; step.castShadow = true; stair.add(step);
  }
  const crown = new ctx.THREE.Mesh(new ctx.THREE.TorusGeometry(3.4, 0.35, 8, 20),
    new ctx.THREE.MeshLambertMaterial({ color: 0xd4af37, emissive: 0x8a6d1f, emissiveIntensity: 0.7 }));
  crown.position.y = 31.5; crown.rotation.x = Math.PI / 2; stair.add(crown);
  const stairPlaque = plaque(ctx, 'STAIRWAY TO SYNERGY (TOP FLOOR: VACANT)', 15, 3.8, 40);
  stairPlaque.position.set(trackCenter.x, 5, trackCenter.z + 8.5); scene.add(stairPlaque);
  ctx.animators.push(dt => { stair.rotation.y += dt * 0.05; }); // it turns, very slowly, going nowhere

  /* ---- the ruined cathedral: HQ hall with a broken pitched roof ---- */
  const hall = anchorGroup(ctx, 0.47, -(ctx.HALF_W + 46));
  const wallM = lam(ctx, 0xcfc4ae);
  for (const [w, h, d, x, y, z] of [[44, 13, 1.2, 0, 6.5, -13], [44, 13, 1.2, 0, 6.5, 13], [1.2, 13, 27, -22, 6.5, 0]]) {
    const wall = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(w, h, d), wallM);
    wall.position.set(x, y, z); wall.castShadow = true; hall.add(wall);
  }
  // the fourth wall is gone entirely — that's the memorial part
  const beamM = lam(ctx, 0x6e5136);
  for (let i = -3; i <= 3; i++) {
    const beam = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(0.7, 0.7, 30), beamM);
    beam.position.set(i * 6.4, 16.5 - Math.abs(i) * 0.4, 0); beam.rotation.x = i % 2 ? 0.42 : -0.42; hall.add(beam);
  }
  const fallen = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(18, 0.8, 2.2), beamM);
  fallen.position.set(6, 0.6, 22); fallen.rotation.set(0.2, 0.7, 0.12); hall.add(fallen); // roof beam, retired
  // gold W on the roof, still turning out of habit
  const wSign = canvasSign(ctx, 7, 7, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = '#d4af37'; g.font = '900 380px system-ui';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('W', w / 2, h / 2 + 20);
  });
  wSign.position.set(0, 21, 0); hall.add(wSign);
  ctx.animators.push(dt => { wSign.rotation.y += dt * 0.5; });
  const hallPlaque = plaque(ctx, 'GLOBAL HQ — PLEASE STOP TAKING THE COPPER', 17, 4.2, 25);
  hallPlaque.position.set(0, 9, 14.2); hall.add(hallPlaque);

  /* ---- the FALLEN HUSTLE neon (animated flicker) ---- */
  const neonMat = new ctx.THREE.MeshLambertMaterial({
    color: 0x2a0a18, emissive: 0xff2e88, emissiveIntensity: 1.6, transparent: true,
  });
  const neonTex = ctx.canvasTexture(512, 128, (g, w, h) => {
    g.fillStyle = '#160409'; g.fillRect(0, 0, w, h);
    g.font = '900 92px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#ff2e88'; g.shadowBlur = 26; g.fillStyle = '#ffd7ec';
    g.fillText('HUSTLE', w / 2, h / 2);
  });
  neonMat.map = neonTex;
  const neon = new ctx.THREE.Mesh(new ctx.THREE.PlaneGeometry(13, 3.3), neonMat);
  const neonPos = anchorGroup(ctx, 0.60, ctx.HALF_W + 10);
  neon.position.set(0, 1.5, 0); neon.rotation.set(-0.25, 0, 1.25); // fallen sideways, face-up to the sky it failed
  neonPos.add(neon);
  ctx.animators.push((dt, t) => {
    const flick = Math.sin(t * 31) * Math.sin(t * 7.3) > 0.55 ? 0.25 : 1; // dying-neon stutter
    neonMat.emissiveIntensity = 1.6 * flick * (0.85 + Math.random() * 0.15);
  });

  /* ---- bankruptcy-court annex ---- */
  const annex = anchorGroup(ctx, 0.13, ctx.HALF_W + 30);
  const aBase = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(20, 6, 12), lam(ctx, 0xd9d4c8));
  aBase.position.y = 3; aBase.castShadow = true; annex.add(aBase);
  for (let i = 0; i < 4; i++) {
    const col = new ctx.THREE.Mesh(new ctx.THREE.CylinderGeometry(0.7, 0.7, 7.5, 10), lam(ctx, 0xe8e4da));
    col.position.set(-7.5 + i * 5, 3.75, 7); annex.add(col);
  }
  const ped = new ctx.THREE.Mesh(new ctx.THREE.CylinderGeometry(0.1, 11, 3.4, 3, 1), lam(ctx, 0xd9d4c8));
  ped.position.y = 8.6; ped.rotation.y = Math.PI; annex.add(ped);
  for (let sIdx = 0; sIdx < 3; sIdx++) {
    const step = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(22 - sIdx * 2, 0.55, 3), lam(ctx, 0xcac4b4));
    step.position.set(0, 0.28 + sIdx * 0.55, 10.5 - sIdx * 1.2); annex.add(step);
  }
  const aPlaque = plaque(ctx, 'BANKRUPTCY COURT — CHAPTER 11 ANNEX', 16, 4, 0);
  aPlaque.position.set(0, 4.6, 6.2); annex.add(aPlaque);

  /* ---- kombucha tap bars (the taps outlived the company) ---- */
  for (const frac of [0.26, 0.74]) {
    const bar = anchorGroup(ctx, frac, -(ctx.HALF_W + 13));
    const counter = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(9, 2.2, 1.6), lam(ctx, 0x7a4a21));
    counter.position.y = 1.1; counter.castShadow = true; bar.add(counter);
    for (let i = 0; i < 3; i++) {
      cyl(ctx, 0.55, 0.55, 2.6, 0xb9c0c7, 0, 0, 0, { parent: bar }).position.set(-3 + i * 3, 3.4, 0);
      const tap = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(0.3, 0.7, 0.5), lam(ctx, 0xd4af37));
      tap.position.set(-3 + i * 3, 2.6, 0.6); bar.add(tap);
    }
    const bPlaque = plaque(ctx, 'KOMBUCHA ON TAP (EMPTY SINCE 2019)', 11, 2.8, 90);
    bPlaque.position.set(0, 5.6, 0); bar.add(bPlaque);
  }

  /* ---- phone-booth pods, still reservable in the app (the app is gone) ---- */
  const boothTints = [0xe4572e, 0x3f6d8e, 0x5b8c5a, 0x8e6cc8];
  scatterEach(ctx, 12, ctx.HALF_W + 9, ctx.HALF_W + 30, (p, i) =>
    phoneBooth(ctx, p.x, p.z, ctx.rand(0, 6.3), boothTints[i % 4]));

  /* ---- hot-desk rows out on the dead lawn ---- */
  deskRow(ctx, trackCenter.x - 34, trackCenter.z + 30, 0.4, 5);
  deskRow(ctx, trackCenter.x + 38, trackCenter.z - 26, -0.9, 4);
  scatterEach(ctx, 8, ctx.HALF_W + 20, ctx.HALF_W + 52, (p, i) =>
    deskRow(ctx, p.x, p.z, ctx.rand(0, 6.3), 2 + (i % 3)));

  /* ---- rubble & fallen signage of the empire ---- */
  scatterEach(ctx, 16, ctx.HALF_W + 6, ctx.HALF_W + 44, p => {
    const s = ctx.rand(0.7, 2.2);
    const rock = new ctx.THREE.Mesh(new ctx.THREE.DodecahedronGeometry(s), lam(ctx, 0x9a958a));
    rock.position.set(p.x, s * 0.5, p.z); rock.rotation.set(ctx.rand(0, 3), ctx.rand(0, 3), 0);
    rock.castShadow = true; scene.add(rock);
  });

  for (const [text, frac, side, hue] of SIGNS) sign(ctx, text, frac, side, hue);

  clouds(ctx, 6, 0xd8dde2); // thin, depressed clouds
}
