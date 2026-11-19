/* Kart snapshots on the wire (docs/online-protocol.md, "Binary snapshot").
   The first 10 bytes are the header the server reads; the rest is ours.
   One snapshot is SNAP_BYTES long, little-endian:

   off type  field
   0   u8    1 (snapshot)
   1   u8    slot
   2   u32   step
   6   f32   raceDistance (m)
   10  f32×3 x, y, z (m)
   22  i16×3 yaw, pitch, roll (rad × 32767/π)
   28  i16×3 vx, vy, vz (cm/s)
   34  i8    steer × 127
   35  u16   flags (FLAG below)
   37  u8    driftTier (bits 0-1) | boostKind index << 2 (bits 2-4)
   38  u8    boostT (1/20 s)
   39  u8    (boostMul - 1) × 200
   40  u8    hitKind index
   41  u8×2  hitT, hitDur (1/20 s)
   43  u8×9  starT shrinkT ghostT bulletT invulnT squashT rescueT goldenT inkT (1/20 s)
   52  u8    item index (0 = none)
   53  u8    itemUses
   54  u8    rouletteT (1/20 s)
   55  u8    coins
   56  u8    lap (bits 0-4) | cpNext << 5
   57  i8    circuit
   58        end

   Timers round up, so a running timer never reads as zero on the far side. */
import { ITEMS } from '../race/items.js';

export const SNAP = 1;
export const SNAP_BYTES = 58;
export const ITEM_IDS = [null, ...Object.keys(ITEMS)];
export const BOOST_KINDS = ['', 'mushroom', 'pad', 'trick', 'start', 'draft', 'mini'];
export const HIT_KINDS = ['', 'spin', 'tumble', 'squash', 'burnout', 'zap'];
export const TIMERS = ['starT', 'shrinkT', 'ghostT', 'bulletT', 'invulnT', 'squashT', 'rescueT', 'goldenT', 'inkT'];
export const FLAG = {
  grounded: 1, drifting: 2, driftRight: 4, hopping: 8, trick: 16, trickTurn: 32, trickRight: 64, finished: 128,
  driftPaused: 256, drafting: 512, revving: 1024, goldenActive: 2048, driftArmed: 4096,
};
const ANG = 32767 / Math.PI;
const t20 = v => Math.min(255, Math.max(0, Math.ceil((v || 0) * 20 - 1e-6)));
const i16 = v => Math.max(-32768, Math.min(32767, Math.round(v)));
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

/** Encode a kart's state at `step` into a new ArrayBuffer of SNAP_BYTES. */
export function encodeSnap(k, step) {
  const buf = new ArrayBuffer(SNAP_BYTES), v = new DataView(buf);
  v.setUint8(0, SNAP); v.setUint8(1, k.slot); v.setUint32(2, step >>> 0, true); v.setFloat32(6, k.raceDistance, true);
  v.setFloat32(10, k.x, true); v.setFloat32(14, k.y, true); v.setFloat32(18, k.z, true);
  v.setInt16(22, i16(wrap(k.yaw) * ANG), true); v.setInt16(24, i16(wrap(k.pitch) * ANG), true); v.setInt16(26, i16(wrap(k.roll) * ANG), true);
  v.setInt16(28, i16(k.vx * 100), true); v.setInt16(30, i16(k.vy * 100), true); v.setInt16(32, i16(k.vz * 100), true);
  v.setInt8(34, Math.max(-127, Math.min(127, Math.round((k.steer || 0) * 127))));
  let f = 0;
  if (k.grounded) f |= FLAG.grounded;
  if (k.drifting) f |= FLAG.drifting;
  if (k.driftDir > 0) f |= FLAG.driftRight;
  if (k.hopping) f |= FLAG.hopping;
  if (k.trick) f |= FLAG.trick;
  if (k.trickDir) f |= FLAG.trickTurn;
  if (k.trickDir > 0) f |= FLAG.trickRight;
  if (k.finished) f |= FLAG.finished;
  if (k.driftPaused) f |= FLAG.driftPaused;
  if (k.drafting) f |= FLAG.drafting;
  if (k.revving) f |= FLAG.revving;
  if (k.goldenActive) f |= FLAG.goldenActive;
  if (k.driftArmed) f |= FLAG.driftArmed;
  v.setUint16(35, f, true);
  v.setUint8(37, (k.driftTier & 3) | (Math.max(0, BOOST_KINDS.indexOf(k.boostKind || '')) << 2));
  v.setUint8(38, t20(k.boostT));
  v.setUint8(39, Math.min(255, Math.max(0, Math.round(((k.boostMul || 1) - 1) * 200))));
  v.setUint8(40, Math.max(0, HIT_KINDS.indexOf(k.hitKind || '')));
  v.setUint8(41, t20(k.hitT)); v.setUint8(42, t20(k.hitDur));
  TIMERS.forEach((name, i) => v.setUint8(43 + i, t20(k[name])));
  v.setUint8(52, Math.max(0, ITEM_IDS.indexOf(k.item || null)));
  v.setUint8(53, Math.min(255, Math.max(0, k.itemUses | 0)));
  v.setUint8(54, t20(k.rouletteT));
  v.setUint8(55, Math.min(255, Math.max(0, k.coins | 0)));
  v.setUint8(56, (Math.min(31, Math.max(0, k.lap | 0))) | (Math.min(7, Math.max(0, k.cpNext | 0)) << 5));
  v.setInt8(57, Math.max(-128, Math.min(127, k.circuit | 0)));
  return buf;
}

export const HEADER_BYTES = 10;
/* Frames come from other players' devices and the server relays them unchanged, so a frame with a float that is not a
   number, or a place no track reaches, is dropped whole: puppets interpolate, and simply wait for the next good one. */
const MAX_COORD = 100000, MAX_RD = 10000000;   // m: far beyond every track's bounds and any race's length
const sane = (v, max) => Number.isFinite(v) && Math.abs(v) <= max;

/** Read the fixed header: { type, slot, step, rd } (the part the server reads too). Null for a frame too short to have one. */
export function readHeader(data) {
  const v = view(data);
  if (v.byteLength < HEADER_BYTES) return null;
  return { type: v.getUint8(0), slot: v.getUint8(1), step: v.getUint32(2, true), rd: v.getFloat32(6, true) };
}

/** Decode a snapshot into a plain object with the kart's field names. Returns null for anything else, and for a
    snapshot whose floats are not finite or are out of any track's reach. */
export function decodeSnap(data) {
  const v = view(data);
  if (v.byteLength < SNAP_BYTES || v.getUint8(0) !== SNAP) return null;
  const rd = v.getFloat32(6, true), x = v.getFloat32(10, true), y = v.getFloat32(14, true), z = v.getFloat32(18, true);
  if (!sane(rd, MAX_RD) || !sane(x, MAX_COORD) || !sane(y, MAX_COORD) || !sane(z, MAX_COORD)) return null;
  const f = v.getUint16(35, true), tb = v.getUint8(37);
  const d = {
    slot: v.getUint8(1), step: v.getUint32(2, true), rd, x, y, z,
    yaw: v.getInt16(22, true) / ANG, pitch: v.getInt16(24, true) / ANG, roll: v.getInt16(26, true) / ANG,
    vx: v.getInt16(28, true) / 100, vy: v.getInt16(30, true) / 100, vz: v.getInt16(32, true) / 100,
    steer: v.getInt8(34) / 127,
    grounded: !!(f & FLAG.grounded), drifting: !!(f & FLAG.drifting), driftDir: f & FLAG.drifting ? (f & FLAG.driftRight ? 1 : -1) : 0,
    hopping: !!(f & FLAG.hopping), trick: !!(f & FLAG.trick), trickDir: f & FLAG.trickTurn ? (f & FLAG.trickRight ? 1 : -1) : 0,
    finished: !!(f & FLAG.finished), driftPaused: !!(f & FLAG.driftPaused), drafting: !!(f & FLAG.drafting), revving: !!(f & FLAG.revving),
    goldenActive: !!(f & FLAG.goldenActive), driftArmed: !!(f & FLAG.driftArmed),
    driftTier: tb & 3, boostKind: BOOST_KINDS[(tb >> 2) & 7] || '',
    boostT: v.getUint8(38) / 20, boostMul: 1 + v.getUint8(39) / 200,
    hitKind: HIT_KINDS[v.getUint8(40)] || '', hitT: v.getUint8(41) / 20, hitDur: v.getUint8(42) / 20,
    item: ITEM_IDS[v.getUint8(52)] || null, itemUses: v.getUint8(53), rouletteT: v.getUint8(54) / 20, coins: v.getUint8(55),
    lap: v.getUint8(56) & 31, cpNext: v.getUint8(56) >> 5, circuit: v.getInt8(57),
  };
  TIMERS.forEach((name, i) => { d[name] = v.getUint8(43 + i) / 20; });
  return d;
}

function view(data) {
  if (data == null) return new DataView(new ArrayBuffer(0));
  if (data instanceof DataView) return data;
  if (data instanceof ArrayBuffer) return new DataView(data);
  return new DataView(data.buffer, data.byteOffset, data.byteLength);   // Uint8Array, Node Buffer
}
