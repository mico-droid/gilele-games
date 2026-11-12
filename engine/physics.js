// Simple, fast box physics (AABB) with a spatial hash — the same model that runs EZ Obby.
// Box types: "solid" (default), "kill" (respawn), "trigger" (no collision, fires onEnter/onExit),
// "bounce" (trampoline), "ice" (slippery). Boxes can move: call world.moveBox(b, x, y, z).
import * as THREE from "./three.js";
import { getMat, GEO } from "./core.js";

const CELL = 8;
const key = (i, k) => i * 73856093 ^ k * 19349663;

export function createPhysics(opt = {}) {
  const grid = new Map();
  const boxes = new Set();
  const gravity = opt.gravity ?? 34;

  function cells(b, fn) {
    for (let i = Math.floor(b.min[0] / CELL); i <= Math.floor(b.max[0] / CELL); i++)
      for (let k = Math.floor(b.min[2] / CELL); k <= Math.floor(b.max[2] / CELL); k++) fn(key(i, k));
  }
  function index(b) { cells(b, (h) => { let L = grid.get(h); if (!L) grid.set(h, (L = [])); L.push(b); }); }
  function unindex(b) { cells(b, (h) => { const L = grid.get(h); if (L) { const j = L.indexOf(b); if (j >= 0) L.splice(j, 1); } }); }

  /** Boxes whose cells touch the area around (x,z) within radius r. */
  function query(x, z, r = 2) {
    const out = new Set();
    for (let i = Math.floor((x - r) / CELL); i <= Math.floor((x + r) / CELL); i++)
      for (let k = Math.floor((z - r) / CELL); k <= Math.floor((z + r) / CELL); k++) {
        const L = grid.get(key(i, k)); if (L) for (const b of L) out.add(b);
      }
    return out;
  }

  /**
   * addBox({x,y,z,w,h,d, color, type, mesh:false|Mesh, scene, ...data})
   * (x,y,z) is the CENTER. Pass scene + color to get a mesh created automatically.
   */
  function addBox(o) {
    const b = Object.assign({ type: "solid" }, o);
    b.min = [o.x - o.w / 2, o.y - o.h / 2, o.z - o.d / 2];
    b.max = [o.x + o.w / 2, o.y + o.h / 2, o.z + o.d / 2];
    if (o.scene && o.mesh !== false && !o.mesh) {
      const m = new THREE.Mesh(GEO.box, getMat(o.color ?? 0x94a3b8, o.emissive || 0));
      m.scale.set(o.w, o.h, o.d); m.position.set(o.x, o.y, o.z);
      m.castShadow = o.castShadow !== false; m.receiveShadow = true;
      if (o.type === "trigger" && !o.visible) m.visible = false;
      o.scene.add(m); b.mesh = m;
    }
    delete b.scene;
    boxes.add(b); index(b);
    return b;
  }
  /** Platform helper: top surface at `top`, 1 unit thick. */
  function addPlatform(x, top, z, w, d, color, extra) {
    return addBox(Object.assign({ x, y: top - 0.5, z, w, h: 1, d, color }, extra || {}));
  }
  function removeBox(b) {
    if (!boxes.has(b)) return;
    unindex(b); boxes.delete(b);
    if (b.mesh && b.mesh.parent) b.mesh.parent.remove(b.mesh);
  }
  function moveBox(b, x, y, z) {
    const w = b.max[0] - b.min[0], h = b.max[1] - b.min[1], d = b.max[2] - b.min[2];
    const dx = x - (b.min[0] + w / 2), dy = y - (b.min[1] + h / 2), dz = z - (b.min[2] + d / 2);
    unindex(b);
    b.min = [x - w / 2, y - h / 2, z - d / 2]; b.max = [x + w / 2, y + h / 2, z + d / 2];
    b.vel = [dx, dy, dz]; // displacement this frame, carried by bodies standing on it
    index(b);
    if (b.mesh) b.mesh.position.set(x, y, z);
  }
  function clear() { for (const b of [...boxes]) removeBox(b); grid.clear(); }

  /** First solid top surface below (x,y,z), or null. */
  function groundBelow(x, y, z, maxDrop = 200) {
    let best = null;
    for (const b of query(x, z, 0.5)) {
      if (b.type === "trigger" || b.type === "kill") continue;
      if (x >= b.min[0] && x <= b.max[0] && z >= b.min[2] && z <= b.max[2] && b.max[1] <= y + 0.01 && y - b.max[1] < maxDrop)
        if (best === null || b.max[1] > best) best = b.max[1];
    }
    return best;
  }

  return { addBox, addPlatform, removeBox, moveBox, query, groundBelow, clear, boxes, gravity };
}

/**
 * Character body controlled by input (walk, jump with coyote time + variable height,
 * step-up on small ledges, knockback, moving platforms, triggers).
 * cfg: { halfWidth, height, speed, jump, stepUp }
 */
export function createBody(phys, x, y, z, cfg = {}) {
  const C = Object.assign({ halfWidth: 0.45, height: 2.7, speed: 8.2, jump: 12.8, stepUp: 0.55 }, cfg);
  const b = { x, y, z, vx: 0, vy: 0, vz: 0, kx: 0, kz: 0, grounded: false, coyote: 0, ground: null, cfg: C, inside: new Set() };
  const HW = C.halfWidth;
  const ov = (o, px, py, pz) => px + HW > o.min[0] && px - HW < o.max[0] && py + C.height > o.min[1] && py < o.max[1] && pz + HW > o.min[2] && pz - HW < o.max[2];
  const solid = (o) => o.type !== "kill" && o.type !== "trigger";
  const approach = (v, tg, d) => (v < tg ? Math.min(tg, v + d) : Math.max(tg, v - d));

  /**
   * step(dt, wishX, wishZ, jumpPressed, jumpHeld, speedMul) → events
   * events: { jumped, landed, impact, died, bounced, entered:[boxes], exited:[boxes] }
   */
  b.step = function (dt, wx, wz, jumpNow, held, speedMul = 1) {
    const ev = { jumped: false, landed: false, impact: 0, died: false, bounced: false, entered: [], exited: [] };
    const ice = b.ground && b.ground.type === "ice";
    const acc = b.grounded ? (ice ? 9 : 60) : 22;
    const sp = C.speed * speedMul;
    b.vx = approach(b.vx, wx * sp, acc * dt); b.vz = approach(b.vz, wz * sp, acc * dt);
    const kd = Math.exp(-(b.grounded ? 7 : 2.2) * dt); b.kx *= kd; b.kz *= kd;
    // ride moving platforms
    if (b.grounded && b.ground && b.ground.vel) { b.x += b.ground.vel[0]; b.y += b.ground.vel[1]; b.z += b.ground.vel[2]; }
    b.coyote -= dt; if (b.grounded) b.coyote = 0.1;
    if (jumpNow && b.coyote > 0) { b.vy = C.jump; b.coyote = 0; b.grounded = false; ev.jumped = true; }
    const g = phys.gravity;
    if (!held && b.vy > 4) b.vy -= g * 1.6 * dt;
    b.vy -= g * (b.vy < 0 ? 1.5 : 1) * dt; if (b.vy < -55) b.vy = -55;

    const wasG = b.grounded, vyBefore = b.vy, prevY = b.y;
    let N = phys.query(b.x, b.z, 3);
    b.y += b.vy * dt; b.grounded = false; b.ground = null;
    for (const o of N) {
      if (!solid(o) || !ov(o, b.x, b.y, b.z)) continue;
      if (b.vy <= 0 && prevY >= o.max[1] - 0.05 - (o.vel ? Math.abs(o.vel[1]) : 0)) {
        b.y = o.max[1];
        if (o.type === "bounce" && vyBefore < -2) { b.vy = o.power || 22; ev.bounced = true; }
        else { b.vy = 0; b.grounded = true; b.ground = o; }
      } else if (b.vy > 0 && prevY + C.height <= o.min[1] + 0.05) { b.y = o.min[1] - C.height; b.vy = 0; }
    }
    const axis = (i, v) => {
      for (const o of N) {
        if (!solid(o) || !ov(o, b.x, b.y, b.z)) continue;
        if (o.max[1] - b.y < C.stepUp && b.grounded) { b.y = o.max[1]; continue; }
        if (i === 0) { b.x = v > 0 ? o.min[0] - HW - 0.001 : o.max[0] + HW + 0.001; b.vx = 0; b.kx = 0; }
        else { b.z = v > 0 ? o.min[2] - HW - 0.001 : o.max[2] + HW + 0.001; b.vz = 0; b.kz = 0; }
      }
    };
    const mx = (b.vx + b.kx) * dt; b.x += mx; axis(0, mx);
    const mz = (b.vz + b.kz) * dt; b.z += mz; N = phys.query(b.x, b.z, 3); axis(2, mz);
    if (b.grounded && b.ground && b.ground.belt) { b.x += (b.ground.belt[0] || 0) * dt; b.z += (b.ground.belt[1] || 0) * dt; }

    // kill boxes + triggers
    const now = new Set();
    for (const o of N) {
      if (o.type === "kill" && ov(o, b.x, b.y + 0.05, b.z)) ev.died = true;
      if (o.type === "trigger" && ov(o, b.x, b.y, b.z)) now.add(o);
    }
    for (const o of now) if (!b.inside.has(o)) { ev.entered.push(o); if (o.onEnter) o.onEnter(b, o); }
    for (const o of b.inside) if (!now.has(o)) { ev.exited.push(o); if (o.onExit) o.onExit(b, o); }
    b.inside = now;
    if (b.y < (C.killY ?? -40)) ev.died = true;
    ev.landed = !wasG && b.grounded; ev.impact = vyBefore;
    return ev;
  };
  b.teleport = function (x, y, z) { b.x = x; b.y = y; b.z = z; b.vx = b.vy = b.vz = b.kx = b.kz = 0; b.inside.clear(); };
  b.push = function (dx, dz, up = 7, force = 14) { b.kx = dx * force; b.kz = dz * force; b.vy = Math.max(b.vy, up); b.grounded = false; };
  b.speed = () => Math.hypot(b.vx + b.kx, b.vz + b.kz);
  return b;
}

/** Clear moving-platform displacement after all bodies stepped (call once per frame). */
export function endFrame(phys) { for (const b of phys.boxes) if (b.vel) b.vel = null; }
