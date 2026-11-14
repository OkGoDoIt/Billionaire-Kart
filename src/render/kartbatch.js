/* In a split race a kart can appear in every pane. Draw rigid, untextured parts together; each
   vertex follows the original wheel, head, or body pivot. Faces, badges, glass, the plate,
   and effects keep their own materials and draw order. The paint follows the star uniforms. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function surfaceMaterial(side, paint) {
  const mat = new THREE.MeshPhysicalMaterial({ vertexColors: true, clearcoat: 1, clearcoatRoughness: 0.12, side });
  mat.onBeforeCompile = shader => {
    shader.uniforms.uPaint = { value: paint.color };
    shader.uniforms.uPaintEmission = { value: paint.emissive };
    shader.uniforms.uPaintPower = { value: paint.emissiveIntensity };
    mat.userData.shader = shader;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 finish; attribute vec3 emission; attribute float paintMask; uniform vec3 uPaint, uPaintEmission; uniform float uPaintPower; varying vec3 vFinish, vEmission;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFinish = finish; vEmission = mix(emission, uPaintEmission * uPaintPower, paintMask); vColor.xyz = mix(vColor.xyz, uPaint, paintMask);');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFinish, vEmission;')
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vFinish.x;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vFinish.y;')
      .replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance = vEmission;')
      .replace('#include <lights_physical_fragment>', THREE.ShaderChunk.lights_physical_fragment.replace('material.clearcoat = clearcoat;', 'material.clearcoat = vFinish.z;'));
  };
  return mat;
}

function fillAttribute(g, name, values) {
  const count = g.attributes.position.count, components = values.length;
  const array = new Float32Array(count * components);
  for (let i = 0; i < array.length; i += components) array.set(values, i);
  g.setAttribute(name, new THREE.BufferAttribute(array, components));
}

export function batchKart(rig, paint, shadow) {
  const joints = [rig.body, rig.steering, ...rig.wheels, ...rig.spinners, rig.torso, rig.head];
  if (rig.driver2) joints.push(rig.driver2.userData.torso, rig.head2);
  rig.root.updateMatrixWorld(true);
  const groups = new Map(), removed = [];
  rig.tilt.traverse(o => {
    const m = o.material;
    if (!o.isMesh || !m.isMeshStandardMaterial || m.transparent || m.map || m.emissiveMap) return;
    let pivot = o.parent;
    while (pivot && !joints.includes(pivot)) pivot = pivot.parent;
    if (!pivot) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    for (const key of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(key)) g.deleteAttribute(key);
    if (!m.vertexColors || !g.attributes.color) fillAttribute(g, 'color', m.color.toArray());
    fillAttribute(g, 'emission', m.emissive.clone().multiplyScalar(m.emissiveIntensity).toArray());
    fillAttribute(g, 'paintMask', [Number(m === paint)]);
    fillAttribute(g, 'finish', [m.roughness, m.metalness, m.clearcoat || 0]);
    fillAttribute(g, 'skinIndex', [joints.indexOf(pivot), 0, 0, 0]);
    fillAttribute(g, 'skinWeight', [1, 0, 0, 0]);
    if (!groups.has(m.side)) groups.set(m.side, []);
    groups.get(m.side).push(g);
    removed.push(o);
  });
  for (const o of removed) o.removeFromParent();
  const skeleton = new THREE.Skeleton(joints);
  for (const [side, geos] of groups) {
    const geometry = mergeGeometries(geos), material = surfaceMaterial(side, paint);
    const mesh = new THREE.SkinnedMesh(geometry, material);
    mesh.name = 'kart surfaces'; mesh.castShadow = shadow;
    mesh.onBeforeRender = () => { if (material.userData.shader) material.userData.shader.uniforms.uPaintPower.value = paint.emissiveIntensity; };
    mesh.bind(skeleton, new THREE.Matrix4());
    // Encloses the steering, head bob, spinning wheels, and suspension throughout their travel.
    geometry.computeBoundingSphere(); mesh.boundingSphere = geometry.boundingSphere.clone(); mesh.boundingSphere.radius += 0.5;
    mesh.userData.dispose = () => { geometry.dispose(); material.dispose(); skeleton.dispose(); };
    rig.tilt.add(mesh);
  }
}
