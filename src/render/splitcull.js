/* Split cameras see different slices of a course. Course-wide batches have huge bounds, so
   submitting one sends all its triangles even when only the first stand or hill is in view.
   Keep the authored geometry, materials, and animation; cull each spatial cell of a batch. */
import * as THREE from 'three';

const cellSize = 38;
const matrix = new THREE.Matrix4();
const frustum = new THREE.Frustum(), lightFrustum = new THREE.Frustum();
const point = new THREE.Vector3();
const sphere = new THREE.Sphere();
const cellOf = (x, z) => Math.floor(x / cellSize) + ',' + Math.floor(z / cellSize);

function cellFor(cells, key) {
  let cell = cells.get(key);
  if (!cell) cells.set(key, cell = { ids: [], bounds: new THREE.Box3() });
  return cell;
}

/* Course authors can animate instance transforms, tints, and counts. Keep their mesh as the
   source of truth and bind a camera's packed instance list only for the duration of its draw. */
function instanceCells(mesh) {
  const matrices = mesh.instanceMatrix, colors = mesh.instanceColor, cells = new Map();
  const packedMatrices = matrices.clone().setUsage(THREE.DynamicDrawUsage);
  const packedColors = colors?.clone().setUsage(THREE.DynamicDrawUsage);
  const geo = mesh.geometry, bounds = new THREE.Box3();
  if (!geo.boundingSphere) geo.computeBoundingSphere();
  let version = -1, count = 0;
  return {
    before(camera, light) {
      if (version !== matrices.version || count !== mesh.count) {
        cells.clear(); version = matrices.version; count = mesh.count;
        for (let i = 0; i < count; i++) {
          matrix.fromArray(matrices.array, i * 16);
          sphere.copy(geo.boundingSphere).applyMatrix4(matrix);
          const cell = cellFor(cells, cellOf(sphere.center.x, sphere.center.z));
          cell.ids.push(i);
          point.copy(sphere.center).addScalar(sphere.radius); cell.bounds.expandByPoint(point);
          point.copy(sphere.center).subScalar(sphere.radius); cell.bounds.expandByPoint(point);
        }
        // Three also tests the whole mesh. Its sphere must cover every pane, even if
        // the first render happens to pack only a handful of instances.
        bounds.makeEmpty();
        for (const cell of cells.values()) bounds.union(cell.bounds);
        bounds.getBoundingSphere(mesh.boundingSphere ??= new THREE.Sphere());
      }
      let n = 0;
      for (const cell of cells.values()) {
        if (!frustum.intersectsBox(cell.bounds) && !light?.intersectsBox(cell.bounds)) continue;
        for (const id of cell.ids) {
          const src = id * 16, dst = n * 16;
          for (let j = 0; j < 16; j++) packedMatrices.array[dst + j] = matrices.array[src + j];
          if (colors) for (let j = 0; j < 3; j++) packedColors.array[n * 3 + j] = colors.array[id * 3 + j];
          n++;
        }
      }
      mesh.count = n; mesh.instanceMatrix = packedMatrices; mesh.instanceColor = packedColors || null;
      if (n) {
        packedMatrices.clearUpdateRanges(); packedMatrices.addUpdateRange(0, n * 16); packedMatrices.needsUpdate = true;
        if (colors) { packedColors.clearUpdateRanges(); packedColors.addUpdateRange(0, n * 3); packedColors.needsUpdate = true; }
      }
    },
    after() { mesh.count = count; mesh.instanceMatrix = matrices; mesh.instanceColor = colors; },
    dispose() {
      mesh.instanceMatrix = packedMatrices; mesh.instanceColor = packedColors || null; mesh.dispose();
      mesh.instanceMatrix = matrices; mesh.instanceColor = colors;
    },
  };
}

/* A large terrain or baked prop mesh can occupy the entire circuit. The cells index the
   original attribute buffers, retaining colours, UV seams, normals, and complete triangles. */
function meshCells(mesh) {
  const g = mesh.geometry, p = g.attributes.position, index = g.index, cells = new Map();
  for (let i = 0, n = index?.count ?? p.count; i < n; i += 3) {
    const a = index ? index.getX(i) : i, b = index ? index.getX(i + 1) : i + 1, c = index ? index.getX(i + 2) : i + 2;
    const key = cellOf((p.getX(a) + p.getX(b) + p.getX(c)) / 3, (p.getZ(a) + p.getZ(b) + p.getZ(c)) / 3);
    const cell = cellFor(cells, key);
    cell.ids.push(a, b, c);
    for (const j of [a, b, c]) cell.bounds.expandByPoint(point.fromBufferAttribute(p, j));
  }
  if (cells.size < 4) return null;
  // A single index upload avoids turning each visible cell into another draw. Retain the
  // camera's selection between frames; only rebuild when a cell crosses the frustum.
  const byCamera = new Map(), cellList = [...cells.values()];
  return {
    before(camera, light) {
      let cache = byCamera.get(camera);
      if (!cache) {
        const Index = p.count > 65535 ? Uint32Array : Uint16Array;
        const buffer = new THREE.BufferAttribute(new Index(index?.count ?? p.count), 1).setUsage(THREE.DynamicDrawUsage);
        const geometry = new THREE.BufferGeometry();
        for (const [name, attribute] of Object.entries(g.attributes)) geometry.setAttribute(name, attribute);
        geometry.setIndex(buffer);
        geometry.boundingSphere = g.boundingSphere;
        cache = { geometry, buffer, visible: new Uint8Array(cellList.length).fill(2), length: 0 };
        byCamera.set(camera, cache);
      }
      let changed = false;
      for (let i = 0; i < cellList.length; i++) {
        const visible = Number(frustum.intersectsBox(cellList[i].bounds) || !!light?.intersectsBox(cellList[i].bounds));
        if (visible !== cache.visible[i]) { changed = true; cache.visible[i] = visible; }
      }
      if (changed) {
        let n = 0;
        for (let i = 0; i < cellList.length; i++) if (cache.visible[i]) {
          const ids = cellList[i].ids; cache.buffer.array.set(ids, n); n += ids.length;
        }
        cache.length = n;
        cache.buffer.clearUpdateRanges(); cache.buffer.addUpdateRange(0, n); cache.buffer.needsUpdate = true;
      }
      cache.geometry.setDrawRange(0, cache.length); mesh.geometry = cache.geometry;
    },
    after() { mesh.geometry = g; },
    dispose() {
      for (const { geometry } of byCamera.values()) {
        // Only the camera-specific index belongs to this geometry.
        for (const name of Object.keys(geometry.attributes)) geometry.deleteAttribute(name);
        geometry.dispose();
      }
      byCamera.clear();
    },
  };
}

export function splitScenery(root) {
  const entries = [];
  root.updateMatrixWorld(true);
  root.traverse(mesh => {
    if (!mesh.isMesh || Array.isArray(mesh.material) || mesh.material.transparent || !mesh.frustumCulled) return;
    const g = mesh.geometry, p = g.attributes.position;
    let entry;
    if (mesh.isInstancedMesh && mesh.count > 4 && mesh.count * (g.index?.count ?? p.count) > 24000) entry = instanceCells(mesh);
    else if (!mesh.isInstancedMesh && (g.index?.count ?? p.count) > 42000 && g.drawRange.count === Infinity && p.usage === THREE.StaticDrawUsage) entry = meshCells(mesh);
    if (entry) entries.push({ mesh, entry });
  });
  const projection = new THREE.Matrix4(), lightProjection = new THREE.Matrix4();
  return {
    before(camera, shadowCamera) {
      camera.updateMatrixWorld();
      if (shadowCamera) lightProjection.multiplyMatrices(shadowCamera.projectionMatrix, shadowCamera.matrixWorldInverse);
      projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      for (const { mesh, entry } of entries) {
        matrix.multiplyMatrices(projection, mesh.matrixWorld);
        frustum.setFromProjectionMatrix(matrix, camera.coordinateSystem, camera.reversedDepth);
        const casts = shadowCamera && mesh.castShadow;
        if (casts) lightFrustum.setFromProjectionMatrix(matrix.multiplyMatrices(lightProjection, mesh.matrixWorld), shadowCamera.coordinateSystem, shadowCamera.reversedDepth);
        entry.before(camera, casts ? lightFrustum : null);
      }
    },
    after() { for (const { entry } of entries) entry.after(); },
    dispose() { for (const { entry } of entries) entry.dispose?.(); },
  };
}
