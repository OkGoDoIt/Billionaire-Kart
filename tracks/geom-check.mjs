/* Geometry vetting for candidate track splines — uses the game's own math:
   CatmullRomCurve3 closed/centripetal, getSpacedPoints(900), HALF_W = 11. */
import * as THREE from '../tools/vendor/three.module.js';

export function vet(name, points) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], 0, p[1])), true, 'centripetal');
  const N = 900, spaced = curve.getSpacedPoints(N), s = spaced.slice(0, N);
  const len = curve.getLength();
  let minR = Infinity, minRi = -1;
  for (let i = 0; i < N; i++) {
    const a = s[(i - 1 + N) % N], b = s[i], c = s[(i + 1) % N];
    const ab = b.clone().sub(a), bc = c.clone().sub(b), ac = c.clone().sub(a);
    const cross = Math.abs(ab.x * bc.z - ab.z * bc.x);
    const area2 = cross; // 2*triangle area = |ab x ac| actually; use circumradius formula properly below
    const lab = ab.length(), lbc = bc.length(), lac = ac.length();
    const crossAC = Math.abs(ab.x * ac.z - ab.z * ac.x);
    if (crossAC < 1e-9) continue;
    const R = (lab * lbc * lac) / (2 * crossAC);
    if (R < minR) { minR = R; minRi = i; }
  }
  let minClear = Infinity, pair = null;
  for (let i = 0; i < N; i += 2) for (let j = i + 2; j < N; j += 2) {
    const sep = Math.min(j - i, N - (j - i));
    if (sep < 70) continue;
    const d = s[i].distanceTo(s[j]);
    if (d < minClear) { minClear = d; pair = [i, j]; }
  }
  console.log(`${name}: length=${len.toFixed(0)}  minTurnRadius=${minR.toFixed(1)} @sample ${minRi}  minSelfClearance=${minClear.toFixed(1)} (samples ${pair})`);
  return { len, minR, minClear };
}

if (process.argv[2] === 'candidates') {
  vet('Datacenter', [[-170,-170],[-60,-178],[60,-178],[170,-170],[225,-105],[230,-30],[205,45],[232,105],[180,168],[80,160],[30,185],[-30,160],[-90,182],[-150,168],[-222,110],[-205,30],[-232,-40],[-225,-110]]);
  vet('Waters', [[0,-190],[150,-160],[245,-70],[255,40],[190,130],[90,180],[-30,190],[-150,160],[-240,80],[-255,-30],[-200,-120],[-110,-175]]);
  vet('WhiteHouse', [[269,-60],[134,-95],[-45,-100],[-213,-95],[-282,-40],[-289,10],[-267,58],[-190,80],[-67,88],[45,84],[123,60],[168,95],[241,88],[282,40],[278,-20]]);
  vet('Valley(ref)', [[0,-260],[150,-215],[235,-110],[205,10],[265,110],[170,205],[40,245],[-95,205],[-215,225],[-265,105],[-215,-15],[-255,-130],[-140,-215]]);
  vet('Mars(ref)', [[0,-240],[190,-190],[250,-40],[150,60],[230,170],[90,250],[-60,205],[-170,255],[-260,140],[-190,20],[-265,-90],[-170,-190],[-70,-160]]);
}
