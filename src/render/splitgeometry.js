/* Quarter-screen race scenery uses the same authored meshes. Reduce redundant tessellation
   within a small geometric error, preserving normals, texture seams, and painted colours. */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { MeshoptSimplifier } from 'three/addons/libs/meshopt_simplifier.module.js';

const ready = MeshoptSimplifier.supported && await MeshoptSimplifier.ready.then(() => true, () => false);

export function simplifyScenery(root) {
  if (!ready) return;
  const cache = new Map();
  root.traverse(mesh => {
    if (!mesh.isMesh || !mesh.frustumCulled || Array.isArray(mesh.material) || mesh.material.transparent || mesh.material.isShaderMaterial) return;
    const source = mesh.geometry, p = source.attributes.position;
    const triangles = (source.index?.count ?? p.count) / 3;
    if (triangles * (mesh.count ?? 1) < 4200 || triangles < 40 || source.drawRange.count !== Infinity ||
        Object.keys(source.attributes).some(k => !['position', 'normal', 'color', 'uv'].includes(k))) return;
    const repeated = mesh.isInstancedMesh && mesh.count > 200;
    const key = (mesh.material.map ? 1 : 0) + (repeated ? 2 : 0);
    let variants = cache.get(source);
    if (!variants) cache.set(source, variants = new Map());
    if (variants.has(key)) { mesh.geometry = variants.get(key); return; }
    const g = source.index ? source.clone() : mergeVertices(source);
    const pos = g.attributes.position, normal = g.attributes.normal, uv = g.attributes.uv, color = g.attributes.color;
    const weights = [], attrs = [];
    if (normal) { weights.push(0.04, 0.04, 0.04); attrs.push(normal); }
    if (uv && mesh.material.map) { weights.push(0.4, 0.4); attrs.push(uv); }
    if (color) { for (let j = 0; j < color.itemSize; j++) weights.push(0.2); attrs.push(color); }
    const data = new Float32Array(pos.count * weights.length);
    for (let i = 0, offset = 0; i < pos.count; i++) for (const a of attrs) {
      for (let j = 0; j < a.itemSize; j++) data[offset++] = a.getComponent(i, j);
    }
    const error = mesh.name === 'terrain' ? 0.14 : repeated ? 0.12 : 0.08;
    const index = g.index.array;
    const [result] = MeshoptSimplifier.simplifyWithAttributes(index, pos.array, 3, data, weights.length, weights,
      null, Math.floor(index.length / 3 * (repeated ? 0.12 : 0.22)) * 3, error, ['ErrorAbsolute', 'Permissive']);
    if (result.length < index.length) {
      g.setIndex(new THREE.BufferAttribute(result, 1)); g.clearGroups(); mesh.geometry = g;
    }
    variants.set(key, mesh.geometry);
  });
}
