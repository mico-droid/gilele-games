// AI traffic on a road network from road.js: cars, motos, buses and pedestrians.
// Vehicles follow lanes and junction connectors, keep distance, obey traffic lights, PARE / yield and roundabouts,
// give way to pedestrians on crosswalks and use turn signals. Pedestrians walk on sidewalks and cross on zebras.
//
//   const traffic = createTraffic(world, road, { phys, cars: 14, motos: 3, buses: 1, peds: 12, player: () => car });
//   world.onUpdate((dt) => traffic.update(dt));
import * as THREE from "./three.js";
import { createVehicle } from "./vehicle.js";
import { Character, randomLook } from "./avatar.js";
import { makePath, pointInPoly } from "./road.js";

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#f8fafc", "#111827", "#94a3b8", "#a855f7", "#f59e0b", "#0ea5e9", "#7f1d1d", "#cbd5e1"];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export function createTraffic(world, road, o = {}) {
  const agents = [], peds = [];
  const fleet = o.fleet || (world.vehicles ||= new Set());
  const playerFn = o.player || (() => null);
  const ground = road.groundAt;

  // ---------------------------------------------------------------- vehicles
  function laneOK(l, kind) { return kind !== "bus" || l.i === l.n - 1; }
  function addVehicle({ kind = "car", lane, d, color, speedMul, script = false, data } = {}) {
    const veh = createVehicle(world, { kind, color: color || (kind === "bus" ? "#0ea5e9" : kind === "truck" ? "#f97316" : pick(COLORS)), ai: true, ground, fleet, rider: pick(COLORS), helmet: pick(["#ef4444", "#111827", "#f8fafc", "#facc15"]) });
    const a = {
      veh, kind, lane, conn: null, d: d || 0, speed: 0, mul: speedMul ?? (kind === "moto" ? 1.08 + Math.random() * 0.1 : 0.85 + Math.random() * 0.15),
      waitT: 0, stopped: 0, passedStop: null, stuck: 0, script, override: null, offset: 0, nextConn: null, data: data || {}, busT: 0, servedStops: new Set(),
    };
    veh.agent = a;
    chooseNext(a);
    agents.push(a);
    place(a, 0.016);
    return a;
  }
  function chooseNext(a) {
    const opts = a.lane.next.filter((c) => laneOK(c.lane, a.kind));
    if (!opts.length) { a.nextConn = null; return; }
    const w = opts.map((c) => (c.turn === "straight" ? 2.2 : 1));
    let r = Math.random() * w.reduce((s, x) => s + x, 0), k = 0;
    while (r > w[k]) { r -= w[k]; k++; }
    a.nextConn = a.forceTurn ? opts.find((c) => c.turn === a.forceTurn) || opts[k] : opts[k];
  }
  const curPath = (a) => (a.conn ? a.conn.path : a.lane.path);
  function place(a, dt) {
    const p = curPath(a).at(a.d);
    let x = p.x, z = p.z;
    if (a.offset) { x += -Math.cos(p.h) * a.offset; z += Math.sin(p.h) * a.offset; }
    // smooth heading
    let hh = p.h; if (a.h != null) { let dh = ((hh - a.h + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; hh = a.h + dh * Math.min(1, dt * 10); }
    a.h = hh;
    a.veh.steerAngle = clamp(-a.veh.yawRate * 0.3, -0.5, 0.5);
    a.veh.setPose(x, z, hh, a.speed, dt);
  }
  function spawnPoint(minDist = 45) {
    const pl = playerFn();
    for (let tries = 0; tries < 60; tries++) {
      const lane = pick(road.lanes); if (lane.path.len < 30) continue;
      const d = 5 + Math.random() * (lane.path.len - 20), p = lane.path.at(d);
      if (pl && Math.hypot(p.x - pl.x, p.z - pl.z) < minDist) continue;
      if ([...fleet].some((v) => Math.hypot(v.x - p.x, v.z - p.z) < 14)) continue;
      return { lane, d };
    }
    return null;
  }
  function respawn(a) {
    let sp = spawnPoint(70); if (!sp) return;
    if (!laneOK(sp.lane, a.kind)) { const alt = road.lanes.filter((l) => l.edge === sp.lane.edge && l.dir === sp.lane.dir && laneOK(l, a.kind))[0]; if (!alt) return; sp.lane = alt; }
    a.lane = sp.lane; a.d = sp.d; a.conn = null; a.speed = 0; a.stuck = 0; a.passedStop = null; a.h = null; chooseNext(a); place(a, 0.016);
  }

  function nodeBusy(n, me, radius) {
    for (const v of fleet) {
      if (v === me.veh) continue;
      const dx = v.x - n.x, dz = v.z - n.z, dist = Math.hypot(dx, dz);
      if (dist < radius && Math.abs(v.speed) > 0.3) return true;
      if (dist < radius * 0.55) return true;
      if (dist < radius + 28 && Math.abs(v.speed) > 2.5) { const f = v.forward(); if ((-dx * f.x - dz * f.z) / dist > 0.7 && (!v.agent || v.agent.lane.to === n || v.agent.conn)) return true; }
    }
    return false;
  }
  function ringBusy(n, entry, me) {
    const a0 = Math.atan2(entry[1] - n.z, entry[0] - n.x);
    for (const v of fleet) {
      if (v === me.veh) continue;
      const dx = v.x - n.x, dz = v.z - n.z, r = Math.hypot(dx, dz);
      if (r > n.roundabout + 1 || r < n.islandR - 1) continue;
      let da = Math.atan2(dz, dx) - a0; da = ((da % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); // upstream = larger angle
      if (da < 1.5 || da > Math.PI * 2 - 0.35) return true;
    }
    return false;
  }
  function pedOnCrosswalk(cw, margin = 1.2) {
    for (const p of peds) {
      if (p.cw === cw && (p.state === "cross" || p.state === "start")) return p;
      if (p.cwHint === cw) return p;
    }
    return null;
  }

  function updateAgent(a, dt) {
    const v = a.veh;
    if (a.override && a.override.pinD != null) { // scripted position (scenarios)
      a.speed = a.override.pinSpeed || 0; a.d = a.override.pinD;
      while (a.d >= curPath(a).len) { const L = curPath(a).len; if (a.conn) { a.lane = a.conn.lane; a.conn = null; } else if (a.nextConn) a.conn = a.nextConn; else break; a.d -= L; a.override.pinD = a.d; if (!a.conn) chooseNext(a); }
      place(a, dt); return;
    }
    const path = curPath(a);
    const limit = (a.lane.speed / 3.6) * a.mul;
    let want = a.override && a.override.speed != null ? a.override.speed : limit;
    let stopAt = Infinity;
    if (a.conn) want = Math.min(want, a.conn.turn === "right" ? 4.8 : a.conn.turn === "left" ? 6 : a.conn.node.roundabout ? 6.5 : want);
    // lane end control
    if (!a.conn && !(a.override && a.override.ignoreRules)) {
      const ap = a.lane.ap, distEnd = path.len - a.d, distStop = a.lane.stopD - a.d;
      if (ap && a.passedStop !== a.lane) {
        const n = ap.node;
        if (ap.control === "signal") {
          const st = road.signalState(n, ap.edge);
          if (st === "red" || (st === "yellow" && distStop > (a.speed * a.speed) / 6 + 1)) stopAt = distStop;
          else if (st === "off" || st === "blink") { if (!(a.stopped > 1 && !nodeBusy(n, a, 9))) stopAt = distStop; }
        } else if (ap.control === "stop") {
          if (!(a.stopped > 1.2 && (!nodeBusy(n, a, 10) || a.waitT > 9))) stopAt = distStop;
        } else if (ap.control === "yield") {
          const busy = n.roundabout ? ringBusy(n, a.lane.path.pts[1], a) : nodeBusy(n, a, 10);
          if (busy && a.waitT < 10) stopAt = distStop;
        }
        if (ap.cw && pedOnCrosswalk(ap.cw)) stopAt = Math.min(stopAt, distStop);
        if (distStop < 0.6 && stopAt === Infinity) a.passedStop = a.lane;
      }
      // exit crosswalk on the next lane start (pedestrians crossing the street we turn into)
      if (a.nextConn && distEnd < 18) {
        const nl = a.nextConn.lane, far = road.crosswalks.find((c) => c.edge === nl.edge && c.node === nl.from);
        if (far && pedOnCrosswalk(far)) stopAt = Math.min(stopAt, distEnd - 1);
      }
      // mid-block crosswalks on this lane
      for (const cw of road.crosswalks) {
        if (cw.node || cw.edge !== a.lane.edge) continue;
        const pr = a.lane.path.project(cw.x, cw.z), ahead = pr.d - a.d;
        if (ahead > 0 && ahead < 35 && pedOnCrosswalk(cw)) stopAt = Math.min(stopAt, ahead - 3);
      }
      // bus stops
      if (a.kind === "bus" && a.lane.edge.busStops) for (const s of a.lane.edge.busStops) {
        const pt = road.toWorld(a.lane.edge, s, a.lane.u), pr = a.lane.path.project(pt[0], pt[1]), ahead = pr.d - a.d, key = a.lane.id + ":" + s;
        if (!a.servedStops.has(key) && ahead > -1 && ahead < 40) { stopAt = Math.min(stopAt, ahead); if (ahead < 0.8 && a.speed < 0.2) { a.busT += dt; v.lights.hazard = false; if (a.busT > 7) { a.servedStops.add(key); a.busT = 0; } } }
      }
      // turn signal
      v.lights.blinker = a.nextConn && distEnd < 35 ? (a.nextConn.turn === "left" ? -1 : a.nextConn.turn === "right" ? 1 : 0) : 0;
    }
    if (a.override && a.override.stopAt != null) stopAt = Math.min(stopAt, a.override.stopAt - a.d);
    // obstacle ahead (vehicles incl. player, pedestrians)
    const f = { x: Math.sin(v.heading), z: Math.cos(v.heading) };
    let obst = Infinity;
    const look = 8 + a.speed * 3;
    if (!(a.override && a.override.ignoreLeader)) {
      for (const u of fleet) {
        if (u === v) continue;
        const dx = u.x - v.x, dz = u.z - v.z; if (Math.abs(dx) > look + 8 || Math.abs(dz) > look + 8) continue;
        const ahead = dx * f.x + dz * f.z, lat = -dx * f.z + dz * f.x;
        if (ahead <= 0) continue;
        const tol = v.spec.halfW + u.spec.halfW + (a.kind === "moto" && a.offset ? 0.1 : 0.45);
        if (Math.abs(lat) > tol + ahead * 0.06) continue;
        // ignore vehicles moving across far away when they are leaving
        obst = Math.min(obst, ahead - v.spec.halfL - u.spec.halfL - 1.8);
      }
      for (const p of peds) {
        const dx = p.x - v.x, dz = p.z - v.z, ahead = dx * f.x + dz * f.z, lat = -dx * f.z + dz * f.x;
        if (ahead > 0 && ahead < look + 4 && Math.abs(lat) < v.spec.halfW + 1.1 && p.onRoad) obst = Math.min(obst, ahead - v.spec.halfL - 2);
      }
    }
    const stopDist = Math.min(stopAt, obst);
    let target = want;
    if (stopDist < Infinity) target = Math.min(target, Math.sqrt(2 * 3.2 * Math.max(0, stopDist - 0.3)));
    if (stopDist < 0.4) target = 0;
    // speed bumps: slow down
    if (!a.conn && a.lane.edge.bumps) for (const s of a.lane.edge.bumps) { const pt = road.toWorld(a.lane.edge, s, 0), pr = a.lane.path.project(pt[0], pt[1]), ah = pr.d - a.d; if (ah > -3 && ah < 25) target = Math.min(target, 3.5 + Math.max(0, ah - 4) * 0.4); }
    // accelerate / brake
    if (target > a.speed) a.speed = Math.min(target, a.speed + (a.kind === "bus" ? 1.2 : a.kind === "moto" ? 3 : 2.2) * dt);
    else a.speed = Math.max(target, a.speed - (target === 0 && stopDist < 2 ? 9 : 6) * dt);
    v.controls.brake = target < a.speed - 0.05 || a.speed < 0.05 ? 0.6 : 0;
    if (a.speed < 0.15) { a.stopped += dt; if (stopAt < 6) a.waitT += dt; } else { a.stopped = 0; if (a.speed > 3) a.waitT = 0; }
    a.stuck = a.speed < 0.15 && obst < 6 ? a.stuck + dt : 0;
    // advance along the path
    a.d += a.speed * dt;
    while (a.d >= curPath(a).len) {
      const L = curPath(a).len;
      if (a.conn) { a.lane = a.conn.lane; a.conn = null; a.d -= L; a.passedStop = null; chooseNext(a); }
      else if (a.nextConn) { a.conn = a.nextConn; a.d -= L; a.waitT = 0; }
      else { respawn(a); break; }
    }
    place(a, dt);
    // stuck forever (deadlock) → respawn out of sight
    const pl = playerFn();
    if (a.stuck > 14 && !a.script && (!pl || Math.hypot(pl.x - v.x, pl.z - v.z) > 60)) respawn(a);
  }

  // ---------------------------------------------------------------- pedestrians
  const SW = 2.6;
  // sidewalk walking graph built from crosswalk ends on the same block
  const spots = [];
  for (const cw of road.crosswalks) cw.ends.forEach((p, k) => { const g = road.groundAt(p[0], p[1]); spots.push({ cw, k, x: p[0], z: p[1], block: g.block || null }); });
  for (const s of spots) s.peer = spots.find((q) => q.cw === s.cw && q !== s);
  function ringPath(block, a, b) {
    // walk along the block's sidewalk (polygon inset by SW/2) from a to b, shorter way
    const P = block.poly, cx = P.reduce((s, p) => s + p[0], 0) / P.length, cz = P.reduce((s, p) => s + p[1], 0) / P.length;
    const ring = P.map(([x, z]) => { const dx = cx - x, dz = cz - z, l = Math.hypot(dx, dz) || 1; return [x + (dx / l) * SW * 0.7, z + (dz / l) * SW * 0.7]; });
    const loop = makePath(ring.concat([ring[0]]));
    const pa = loop.project(a.x, a.z).d, pb = loop.project(b.x, b.z).d, L = loop.len;
    let fwd = (pb - pa + L) % L, pts = [[a.x, a.z]];
    const dirF = fwd <= L / 2, dist = dirF ? fwd : L - fwd, n = Math.max(2, Math.ceil(dist / 3));
    for (let i = 1; i < n; i++) { const d = (pa + (dirF ? 1 : -1) * (dist * i) / n + L) % L, q = loop.at(d); pts.push([q.x, q.z]); }
    pts.push([b.x, b.z]);
    return makePath(pts);
  }
  function addPed({ spot, look } = {}) {
    const s = spot || pick(spots.filter((q) => q.block));
    if (!s) return null;
    const ch = new Character(world.scene, look || randomLook(""), { kind: "npc", label: false });
    ch.root.scale.setScalar(0.55);
    const p = { ch, x: s.x, z: s.z, spot: s, state: "idle", t: Math.random() * 2, path: null, d: 0, speed: 1.15 + Math.random() * 0.35, cw: null, onRoad: false, rot: 0, script: null };
    peds.push(p);
    return p;
  }
  function pedNext(p) {
    const s = p.spot;
    if (Math.random() < 0.55 && s.peer) { p.state = "wait"; p.t = 0; p.cw = s.cw; return; }
    const cands = spots.filter((q) => q.block === s.block && q !== s); if (!cands.length || !s.block) { p.state = "wait"; p.cw = s.cw; p.t = 0; return; }
    const tgt = pick(cands); p.path = ringPath(s.block, s, tgt); p.d = 0; p.target = tgt; p.state = "walk";
  }
  function canCross(p) {
    const cw = p.cw, n = cw.node;
    if (n && n.signal && n.signal !== "off" && n.signal !== "blink") return road.signalState(n, cw.edge) === "red" && road.signalWait(n, cw.edge) > 6;
    // unsignalized: look for vehicles close and fast
    for (const v of fleet) {
      const dx = cw.x - v.x, dz = cw.z - v.z, dist = Math.hypot(dx, dz); if (dist > 22) continue;
      const f = v.forward(); if ((dx * f.x + dz * f.z) / (dist || 1) > 0.4 && Math.abs(v.speed) * 2.2 > dist - 4) return false;
    }
    return p.t > 1;
  }
  function updatePed(p, dt) {
    let moving = false;
    if (p.script) { const r = p.script(p, dt); moving = !!r; }
    else if (p.state === "idle") { p.t -= dt; if (p.t <= 0) pedNext(p); }
    else if (p.state === "walk") {
      p.d += p.speed * dt; const q = p.path.at(p.d); p.x = q.x; p.z = q.z; p.rot = q.h; moving = true;
      if (p.d >= p.path.len) { p.spot = p.target; p.state = "idle"; p.t = Math.random() * 3; }
    } else if (p.state === "wait") {
      p.t += dt; p.cwHint = null;
      const s = p.spot, tgt = s.peer; p.rot = Math.atan2(tgt.x - s.x, tgt.z - s.z);
      if (canCross(p)) { p.state = "cross"; p.path = makePath([[s.x, s.z], [tgt.x, tgt.z]]); p.d = 0; p.target = tgt; }
      else if (p.t > 25) { p.state = "idle"; p.t = 0; p.cw = null; }
      else if (p.t > 0.6 && !(p.cw.node && p.cw.node.signal)) p.cwHint = p.cw; // standing at the curb, wants to cross: drivers must yield
    } else if (p.state === "cross") {
      p.cwHint = null;
      p.d += p.speed * dt; const q = p.path.at(p.d); p.x = q.x; p.z = q.z; p.rot = q.h; moving = true;
      if (p.d >= p.path.len) { p.spot = p.target; p.state = "idle"; p.cw = null; p.t = 1 + Math.random() * 4; }
    }
    p.onRoad = road.groundAt(p.x, p.z).type === "road";
    const gy = road.groundAt(p.x, p.z).y;
    p.ch.root.position.set(p.x, gy, p.z); p.ch.root.rotation.y = p.rot;
    p.ch.animate(dt, moving ? p.speed * 4 : 0, true);
  }

  // ---------------------------------------------------------------- initial population
  function populate() {
    const put = (kind, n) => { for (let i = 0; i < n; i++) { const sp = spawnPoint(40); if (!sp) continue; if (!laneOK(sp.lane, kind)) { const alt = road.lanes.find((l) => l.edge === sp.lane.edge && l.dir === sp.lane.dir && laneOK(l, kind)); if (!alt) continue; sp.lane = alt; } addVehicle({ kind, lane: sp.lane, d: sp.d }); } };
    put("bus", o.buses ?? 1); put("car", o.cars ?? 14); put("moto", o.motos ?? 3);
    for (let i = 0; i < (o.peds ?? 12); i++) addPed();
  }
  if (o.populate !== false) populate();

  let enabled = true;
  return {
    agents, peds, spots, fleet,
    addVehicle, addPed, respawn, populate, pedOnCrosswalk, spawnPoint,
    set enabled(v) { enabled = v; }, get enabled() { return enabled; },
    /** Remove every AI vehicle and pedestrian. */
    clear() { for (const a of agents) a.veh.dispose(); agents.length = 0; for (const p of peds) p.ch.dispose(); peds.length = 0; },
    remove(a) { const i = agents.indexOf(a); if (i >= 0) { agents.splice(i, 1); a.veh.dispose(); } const j = peds.indexOf(a); if (j >= 0) { peds.splice(j, 1); a.ch.dispose(); } },
    update(dt) {
      if (!enabled) return;
      for (const a of agents) updateAgent(a, dt);
      for (const p of peds) updatePed(p, dt);
    },
  };
}
