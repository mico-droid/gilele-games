// Throwables: objects the player can pick up (carry over the head) and throw at others.
// Kid-friendly: no damage — a hit only knocks the target back and plays a sound.
//
//   const th = createThrowables({ world, phys, room, me, remotes, getTargets, onHit });
//   th.add("ball", x, y, z)          // kinds: ball, snow, pillow, crate, beach
//   th.action(dirX, dirZ)            // grab the nearest object, or throw the held one
//   th.update(dt)                    // every frame, after players/bots/remotes update
//   th.held / th.nearest()           // for HUD hints
// Multiplayer (events): "tg" grab, "tt" throw, "tr" rest, "td" drop, "th" hit, "ts" host snapshot.
import * as THREE from "./three.js";
import { GEO, getMat } from "./core.js";
import { Audio } from "./audio.js";

export const THROW_KINDS = {
  ball:   { r: 0.35, color: "#ef4444", push: 1,    bounce: 0.55 },
  snow:   { r: 0.3,  color: "#f8fafc", push: 0.7,  bounce: 0.1 },
  pillow: { r: 0.42, color: "#f9a8d4", push: 1.25, bounce: 0.2, shape: [1.5, 0.6, 1] },
  crate:  { r: 0.45, color: "#b45309", push: 1.5,  bounce: 0.25, shape: [1, 1, 1] },
  beach:  { r: 0.55, color: "#facc15", push: 1.1,  bounce: 0.75 },
};
const G = 24, HIT_H = 2.7, HIT_R = 0.75;

export function createThrowables({ world, phys, room = null, me, remotes = null, getTargets = () => [], onHit, onHitMe, reach = 2.4, power = 21 }) {
  const list = [], temps = [];
  const myId = () => (room && room.myId) || "me";
  const send = (k, d) => { if (room && room.connected) room.send(k, d); };
  const r2 = (v) => Math.round(v * 100) / 100;

  function mesh(kind) {
    const K = THROW_KINDS[kind];
    let m;
    if (K.shape) { m = new THREE.Mesh(GEO.box, getMat(K.color)); m.scale.set(K.shape[0] * K.r * 1.6, K.shape[1] * K.r * 1.6, K.shape[2] * K.r * 1.6); }
    else if (kind === "beach") {
      m = new THREE.Group();
      ["#facc15", "#ef4444", "#3b82f6", "#ffffff"].forEach((c, i) => {
        const s = new THREE.Mesh(new THREE.SphereGeometry(K.r, 16, 12, (i * Math.PI) / 2, Math.PI / 2), getMat(c)); s.castShadow = true; m.add(s);
      });
    } else { m = new THREE.Mesh(GEO.sphere, getMat(K.color)); m.scale.setScalar(K.r); }
    m.castShadow = true; world.scene.add(m);
    return m;
  }

  function add(kind, x, y, z) {
    const K = THROW_KINDS[kind] || THROW_KINDS.ball;
    const o = { i: list.length, kind, K, home: [x, y, z], p: new THREE.Vector3(x, y + K.r, z), v: new THREE.Vector3(), state: "rest", holder: null, by: null, hit: new Set(), spin: 0, m: mesh(kind) };
    o.m.position.copy(o.p);
    list.push(o);
    return o;
  }

  /** Local-only projectile that disappears when it lands (e.g. bots throwing snowballs back). */
  function fire(kind, p, v, by) {
    const K = THROW_KINDS[kind] || THROW_KINDS.snow;
    const o = { i: -1, temp: true, kind, K, home: p.slice(), p: new THREE.Vector3(), v: new THREE.Vector3(), state: "rest", hit: new Set(), spin: 0, m: mesh(kind) };
    launch(o, p, v, by); temps.push(o); Audio.play("whee");
    return o;
  }

  const myHeld = () => list.find((o) => o.state === "held" && o.holder === myId());
  function nearest() {
    let best = null, bd = reach;
    for (const o of list) {
      if (o.state !== "rest") continue;
      const d = Math.hypot(o.p.x - me.x, o.p.z - me.z);
      if (d < bd && o.p.y > me.y - 1.5 && o.p.y < me.y + 3.2) { bd = d; best = o; }
    }
    return best;
  }

  function grab(o, holder) { o.state = "held"; o.holder = holder; o.v.set(0, 0, 0); o.hit.clear(); }
  function launch(o, p, v, by) { o.state = "fly"; o.holder = null; o.by = by; o.p.set(p[0], p[1], p[2]); o.v.set(v[0], v[1], v[2]); o.hit.clear(); o.spin = 8 + Math.random() * 6; }
  function rest(o, p) { o.state = "rest"; o.holder = null; o.v.set(0, 0, 0); if (p) o.p.set(p[0], p[1], p[2]); }

  /** Grab the nearest object, or throw the one being held towards (dirX, dirZ). Returns "grab" | "throw" | null. */
  function action(dx, dz) {
    const h = myHeld();
    if (h) {
      const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const p = [me.x + dx * 0.8, me.y + 2.2, me.z + dz * 0.8];
      const v = [dx * power + me.body.vx * 0.5, 4, dz * power + me.body.vz * 0.5];
      launch(h, p, v, myId());
      send("tt", { i: h.i, p: p.map(r2), v: v.map(r2) });
      Audio.play("whee");
      return "throw";
    }
    const n = nearest();
    if (!n) return null;
    grab(n, myId()); send("tg", { i: n.i }); Audio.play("pop");
    return "grab";
  }

  /** Drop what I'm holding where I stand (used on respawn / menus). */
  function drop() {
    const h = myHeld(); if (!h) return;
    rest(h, [me.x, me.y + h.K.r, me.z]); send("td", { i: h.i, p: [h.p.x, h.p.y, h.p.z].map(r2) });
  }

  // ---- simple ball physics against the level boxes
  function collide(o) {
    const r = o.K.r;
    let landed = false;
    for (const b of phys.query(o.p.x, o.p.z, 1.5)) {
      if (b.type === "trigger") continue;
      if (o.p.x + r <= b.min[0] || o.p.x - r >= b.max[0] || o.p.y + r <= b.min[1] || o.p.y - r >= b.max[1] || o.p.z + r <= b.min[2] || o.p.z - r >= b.max[2]) continue;
      if (b.type === "kill") { rest(o, [o.home[0], o.home[1] + o.K.r, o.home[2]]); return "home"; }
      // push out along the axis of least penetration
      const pen = [
        [b.max[1] - (o.p.y - r), 1, 1], [(o.p.y + r) - b.min[1], 1, -1],
        [b.max[0] - (o.p.x - r), 0, 1], [(o.p.x + r) - b.min[0], 0, -1],
        [b.max[2] - (o.p.z - r), 2, 1], [(o.p.z + r) - b.min[2], 2, -1],
      ].sort((a, c) => a[0] - c[0])[0];
      const ax = ["x", "y", "z"][pen[1]];
      o.p[ax] += pen[0] * pen[2];
      if (pen[1] === 1 && pen[2] > 0) {
        if (b.type === "bounce") { o.v.y = 18; continue; }
        o.v.y = Math.abs(o.v.y) > 3 ? -o.v.y * o.K.bounce : 0;
        o.v.x *= 0.8; o.v.z *= 0.8; landed = true;
      } else o.v[ax] = -o.v[ax] * o.K.bounce;
    }
    return landed;
  }

  function targetHit(o) {
    for (const t of getTargets()) {
      if (t.id === o.by || o.hit.has(t.id) || (t.self && !o.temp)) continue;
      if (Math.hypot(t.x - o.p.x, t.z - o.p.z) > HIT_R + o.K.r) continue;
      if (o.p.y < t.y - o.K.r || o.p.y > t.y + HIT_H + o.K.r) continue;
      o.hit.add(t.id);
      const l = Math.hypot(o.v.x, o.v.z) || 1, dx = o.v.x / l, dz = o.v.z / l;
      o.v.x *= -0.25; o.v.z *= -0.25;
      const mine = o.by === myId();
      if (t.remote) { if (mine) send("th", { t: t.id, x: r2(dx * o.K.push), z: r2(dz * o.K.push) }); }
      else if (t.body) t.body.push(dx * o.K.push, dz * o.K.push, 7, 15);
      if (t.ch) t.ch.say(["😵", "Ai!", "Ei!", "😂"][Math.floor(Math.random() * 4)], 1.5);
      Audio.play("push");
      if (onHit) onHit(t, o, mine);
    }
  }

  // ---- network
  if (room) {
    room.on("tg", (d, from) => { const o = list[d && d.i]; if (o) grab(o, from); });
    room.on("tt", (d, from) => { const o = list[d && d.i]; if (o && Array.isArray(d.p) && Array.isArray(d.v)) launch(o, d.p, d.v, from); });
    room.on("tr", (d) => { const o = list[d && d.i]; if (o && o.state !== "held" && Array.isArray(d.p)) rest(o, d.p); });
    room.on("td", (d) => { const o = list[d && d.i]; if (o && Array.isArray(d.p)) rest(o, d.p); });
    room.on("th", (d) => {
      if (!d || d.t !== room.myId) return;
      const x = Math.max(-2, Math.min(2, +d.x || 0)), z = Math.max(-2, Math.min(2, +d.z || 0));
      me.body.push(x, z, 7, 15); me.ch.say("😵", 1.5); Audio.play("push");
      if (onHitMe) onHitMe();
    });
    room.on("ts", (d) => {
      if (!d || !Array.isArray(d.o)) return;
      d.o.forEach((s, i) => { const o = list[i]; if (!o || !s || o.holder === room.myId) return; if (s.h) grab(o, s.h); else if (o.state !== "fly") rest(o, s.p); });
    });
    room.on("join", () => { if (room.isHost) setTimeout(() => send("ts", { o: list.map((o) => ({ p: [o.p.x, o.p.y, o.p.z].map(r2), h: o.state === "held" ? o.holder : null })) }), 800); });
    room.on("leave", (d, from) => { for (const o of list) if (o.state === "held" && o.holder === from) rest(o, [o.p.x, o.p.y, o.p.z]); });
  }

  function holderPos(o) {
    if (o.holder === myId()) return { x: me.x, y: me.y, z: me.z, ch: me.ch };
    const r = remotes && remotes.get(o.holder);
    return r ? { x: r.x, y: r.y, z: r.z, ch: r.ch } : null;
  }

  function update(dt) {
    for (let j = temps.length - 1; j >= 0; j--) if (temps[j].state !== "fly") { world.scene.remove(temps[j].m); temps.splice(j, 1); }
    for (const o of list.concat(temps)) {
      if (o.state === "held") {
        const h = holderPos(o);
        if (!h) { rest(o, [o.p.x, o.p.y, o.p.z]); continue; }
        o.p.set(h.x, h.y + (h.ch.av.top || 2.6) + o.K.r * 0.6, h.z);
        const a = h.ch.av; a.armL.rotation.x = a.armR.rotation.x = -3; a.armL.rotation.z = -0.25; a.armR.rotation.z = 0.25;
      } else if (o.state === "fly") {
        const n = Math.max(1, Math.ceil((o.v.length() * dt) / 0.25)), s = dt / n;
        for (let k = 0; k < n && o.state === "fly"; k++) {
          o.v.y -= G * s; o.p.addScaledVector(o.v, s);
          const res = collide(o);
          if (res === "home") break;
          if (o.v.length() > 4) targetHit(o);
          if (res && o.v.length() < 1.2) {
            rest(o);
            if (o.by === myId() && !o.temp) send("tr", { i: o.i, p: [o.p.x, o.p.y, o.p.z].map(r2) });
          }
        }
        if (o.p.y < -30) rest(o, [o.home[0], o.home[1] + o.K.r, o.home[2]]);
        o.m.rotation.x += o.spin * dt;
      } else if (o.state === "rest") {
        // settle onto the ground if something moved under it
        const gy = phys.groundBelow(o.p.x, o.p.y + 0.05, o.p.z, 60);
        if (gy !== null && o.p.y - o.K.r > gy + 0.02) { o.state = "fly"; o.by = null; }
      }
      o.m.position.copy(o.p);
    }
  }

  return { list, add, fire, action, drop, nearest, update, get held() { return myHeld() || null; } };
}
