// Road network from a JSON-like definition: streets, intersections, roundabouts, raised blocks with
// sidewalks and curbs, lane markings (Brazilian colors), crosswalks, stop lines, PARE / speed / school signs,
// speed bumps and traffic lights. Also answers queries used by vehicles, AI traffic and driving rules.
//
// def = {
//   height?(x,z) → terrain height (m)
//   sidewalk?: 2.6,
//   nodes: { id: { x, z, signal?: true|"off", roundabout?: radius, stop?: [edgeId], yield?: [edgeId], crosswalk?: false } },
//   edges: [{ id, a, b, lanes: [nAB, nBA], laneW?: 3.3, speed?: 40, center?: "dashed"|"double", name?, school?, bumps?: [s(m)],
//             parking?: { side: 1|-1, from, to }, crosswalks?: [s(m)], noCrosswalk?: [nodeId] }],
//   blocks: [{ poly: [[x,z]…] } | { rect: [x0,z0,x1,z1] }],
// }
// Lateral coordinate u is measured to the RIGHT of the a→b direction (Brazil drives on the right).
import * as THREE from "./three.js";
import { getMat, part, GEO } from "./core.js";

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const wrap = (a) => ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;

// ------------------------------------------------------------------ path helper
/** Polyline with arc-length sampling. pts: [[x,z],…] */
export function makePath(pts) {
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const len = L[L.length - 1];
  return {
    pts, len,
    at(d) {
      d = clamp(d, 0, len);
      let i = 1; while (i < L.length - 1 && L[i] < d) i++;
      const a = pts[i - 1], b = pts[i], seg = L[i] - L[i - 1] || 1, k = (d - L[i - 1]) / seg;
      return { x: a[0] + (b[0] - a[0]) * k, z: a[1] + (b[1] - a[1]) * k, h: Math.atan2(b[0] - a[0], b[1] - a[1]) };
    },
    /** distance along the path of the closest point to (x,z) */
    project(x, z) {
      let best = Infinity, bd = 0;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1;
        const k = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / l2, 0, 1), px = a[0] + dx * k, pz = a[1] + dz * k, d = (x - px) ** 2 + (z - pz) ** 2;
        if (d < best) { best = d; bd = L[i - 1] + Math.sqrt(l2) * k; }
      }
      return { d: bd, dist: Math.sqrt(best) };
    },
  };
}
function bezier(p0, c, p1, n = 10) {
  const out = [];
  for (let i = 0; i <= n; i++) { const t = i / n, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, d = t * t; out.push([a * p0[0] + b * c[0] + d * p1[0], a * p0[1] + b * c[1] + d * p1[1]]); }
  return out;
}
function lineX(p, d, q, e) { // intersection of p + t d and q + s e
  const den = d[0] * e[1] - d[1] * e[0]; if (Math.abs(den) < 1e-6) return null;
  const t = ((q[0] - p[0]) * e[1] - (q[1] - p[1]) * e[0]) / den; return [p[0] + d[0] * t, p[1] + d[1] * t];
}
function hull(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
export function pointInPoly(x, z, poly) {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) ins = !ins;
  }
  return ins;
}
function distToPolyEdge(x, z, poly) {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j], b = poly[i], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1;
    const k = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / l2, 0, 1);
    best = Math.min(best, Math.hypot(x - a[0] - dx * k, z - a[1] - dz * k));
  }
  return best;
}

// ------------------------------------------------------------------ mesh builder (merged triangles per material)
function builder() {
  const lists = new Map();
  const get = (col) => { let l = lists.get(col); if (!l) lists.set(col, (l = [])); return l; };
  return {
    tri(col, a, b, c) { get(col).push(...a, ...b, ...c); },
    quad(col, a, b, c, d) { const l = get(col); l.push(...a, ...b, ...c, ...a, ...c, ...d); },
    build(scene, receive = true) {
      const meshes = [];
      for (const [col, arr] of lists) {
        const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3)); g.computeVertexNormals();
        const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide })); m.receiveShadow = receive; scene.add(m); meshes.push(m);
      }
      return meshes;
    },
  };
}

// ------------------------------------------------------------------ signs
function canvasTex(w, h, draw) {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; draw(cv.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const texCache = new Map();
function signTex(key, draw) { let t = texCache.get(key); if (!t) texCache.set(key, (t = canvasTex(128, 128, draw))); return t; }
const F = (s) => `700 ${s}px Fredoka, system-ui, sans-serif`;
export const SIGN_DRAW = {
  stop: (c) => { c.fillStyle = "#fff"; c.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + (i * Math.PI) / 4; c.lineTo(64 + Math.cos(a) * 62, 64 + Math.sin(a) * 62); } c.fill(); c.fillStyle = "#dc2626"; c.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + (i * Math.PI) / 4; c.lineTo(64 + Math.cos(a) * 56, 64 + Math.sin(a) * 56); } c.fill(); c.fillStyle = "#fff"; c.font = F(36); c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("PARE", 64, 66); },
  yield: (c) => { c.fillStyle = "#dc2626"; c.beginPath(); c.moveTo(4, 12); c.lineTo(124, 12); c.lineTo(64, 120); c.fill(); c.fillStyle = "#fff"; c.beginPath(); c.moveTo(24, 22); c.lineTo(104, 22); c.lineTo(64, 96); c.fill(); },
  speed: (n) => (c) => { c.fillStyle = "#fff"; c.beginPath(); c.arc(64, 64, 62, 0, 7); c.fill(); c.strokeStyle = "#dc2626"; c.lineWidth = 14; c.beginPath(); c.arc(64, 64, 54, 0, 7); c.stroke(); c.fillStyle = "#111"; c.font = F(n >= 100 ? 40 : 50); c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(String(n), 64, 68); c.font = F(16); c.fillText("km/h", 64, 98); },
  warn: (txt) => (c) => { c.fillStyle = "#111"; c.save(); c.translate(64, 64); c.rotate(Math.PI / 4); c.fillRect(-44, -44, 88, 88); c.fillStyle = "#facc15"; c.fillRect(-40, -40, 80, 80); c.restore(); c.fillStyle = "#111"; c.font = F(txt.length > 6 ? 18 : 22); c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(txt, 64, 66); },
  noOvertake: (c) => { c.fillStyle = "#fff"; c.beginPath(); c.arc(64, 64, 62, 0, 7); c.fill(); c.fillStyle = "#111"; c.fillRect(30, 50, 26, 34); c.fillStyle = "#dc2626"; c.fillRect(70, 44, 26, 40); c.strokeStyle = "#dc2626"; c.lineWidth = 12; c.beginPath(); c.arc(64, 64, 54, 0, 7); c.stroke(); c.beginPath(); c.moveTo(26, 26); c.lineTo(102, 102); c.stroke(); },
  noPark: (c) => { c.fillStyle = "#fff"; c.beginPath(); c.arc(64, 64, 62, 0, 7); c.fill(); c.fillStyle = "#111"; c.font = F(64); c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("E", 64, 68); c.strokeStyle = "#dc2626"; c.lineWidth = 12; c.beginPath(); c.arc(64, 64, 54, 0, 7); c.stroke(); c.beginPath(); c.moveTo(26, 26); c.lineTo(102, 102); c.stroke(); },
  park: (c) => { c.fillStyle = "#1d4ed8"; c.fillRect(4, 4, 120, 120); c.fillStyle = "#fff"; c.font = F(80); c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("E", 64, 70); },
};
/** Post with a 2-sided sign facing heading `h` (the side drivers see). kind: "stop"|"yield"|"speed:40"|"warn:ESCOLA"|… */
export function addRoadSign(scene, kind, x, y, z, h, size = 0.75) {
  const [k, arg] = kind.split(":");
  const draw = k === "speed" ? SIGN_DRAW.speed(+arg) : k === "warn" ? SIGN_DRAW.warn(arg) : SIGN_DRAW[k];
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = h; scene.add(g);
  part(0.08, 2.3, 0.08, "#64748b", 0, 1.15, 0, g);
  const mat = new THREE.MeshLambertMaterial({ map: signTex(kind, draw), transparent: true, alphaTest: 0.5 });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat); face.position.set(0, 2.3, 0.06); g.add(face);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(size, size), getMat("#94a3b8")); back.position.set(0, 2.3, 0.05); back.rotation.y = Math.PI; g.add(back);
  return g;
}
function streetNameTex(name) {
  return canvasTex(512, 96, (c, w, h) => { c.fillStyle = "#1e3a8a"; c.fillRect(0, 0, w, h); c.strokeStyle = "#fff"; c.lineWidth = 5; c.strokeRect(6, 6, w - 12, h - 12); c.fillStyle = "#fff"; c.font = F(46); c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(name, w / 2, h / 2 + 3); });
}

// ------------------------------------------------------------------ traffic light head
function lightHead(parent, x, y, z) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  part(0.42, 1.2, 0.3, "#111827", 0, 0, 0, g);
  const mk = (col, yy) => { const m = new THREE.Mesh(GEO.sphere, new THREE.MeshLambertMaterial({ color: col, emissive: new THREE.Color(col), emissiveIntensity: 0 })); m.scale.set(0.14, 0.14, 0.06); m.position.set(0, yy, 0.16); g.add(m); return m; };
  return { g, red: mk("#ef4444", 0.36), yellow: mk("#facc15", 0), green: mk("#22c55e", -0.36) };
}

/**
 * createRoads(world, phys, def) → network API (see bottom). Builds every mesh into world.scene.
 */
export function createRoads(world, phys, def) {
  const H = def.height || (() => 0);
  const SW = def.sidewalk ?? 2.6;
  const nodes = {}, edges = [], E = {};
  for (const id in def.nodes) nodes[id] = Object.assign({ id, edges: [] }, def.nodes[id]);
  for (const ed of def.edges) {
    const a = nodes[ed.a], b = nodes[ed.b];
    const e = Object.assign({ laneW: 3.3, speed: 40, center: "dashed" }, ed);
    e.A = a; e.B = b; e.nF = e.lanes[0]; e.nB = e.lanes[1];
    const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz);
    e.len = L; e.d = [dx / L, dz / L]; e.r = [-dz / L, dx / L]; e.h = Math.atan2(dx, dz);
    const W = e.laneW, pk = e.parking ? 2.4 : 0;
    if (e.nB > 0) { e.uMin = -e.nB * W; e.uMax = e.nF * W; } else { e.uMin = -e.nF * W / 2; e.uMax = e.nF * W / 2; }
    if (e.parking) { if (e.parking.side > 0) e.uMax += pk; else e.uMin -= pk; }
    e.half = Math.max(-e.uMin, e.uMax);
    edges.push(e); E[e.id] = e; a.edges.push(e); b.edges.push(e);
  }
  // world ↔ edge coordinates
  const toWorld = (e, s, u) => [e.A.x + e.d[0] * s + e.r[0] * u, e.A.z + e.d[1] * s + e.r[1] * u];
  const toEdge = (e, x, z) => { const px = x - e.A.x, pz = z - e.A.z; return { s: px * e.d[0] + pz * e.d[1], u: px * e.r[0] + pz * e.r[1] }; };
  // trims
  for (const n of Object.values(nodes)) {
    for (const e of n.edges) {
      let t;
      if (n.roundabout) t = n.roundabout;
      else { t = 0; for (const o of n.edges) if (o !== e) { const cos = Math.abs(o.d[0] * e.d[0] + o.d[1] * e.d[1]); t = Math.max(t, o.half / Math.max(0.35, Math.sqrt(1 - cos * cos)) * (cos > 0.95 ? 0 : 1)); } if (n.edges.length === 1) t = 0; }
      if (e.A === n) e.tA = t; else e.tB = t;
    }
  }
  const scene = world.scene;
  const geo = builder(), mark = builder();
  const ASPH = "#3f4652", SIDE = "#cbd5e1", CURB = "#94a3b8", WHITE = "#f8fafc", YEL = "#facc15";
  const Y = (x, z, off = 0) => H(x, z) + off;
  const v3 = (p, off) => [p[0], Y(p[0], p[1], off), p[1]];
  // ground
  {
    const S = def.groundSize || 900, N = 90, g = new THREE.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position; for (let i = 0; i < pos.count; i++) pos.setY(i, H(pos.getX(i), pos.getZ(i)) - 0.05);
    g.computeVertexNormals(); const m = new THREE.Mesh(g, getMat(def.groundColor || "#6cc04a")); m.receiveShadow = true; scene.add(m);
  }
  // road strips (subdivided to follow the terrain)
  function strip(col, e, s0, s1, u0, u1, off, b = geo) {
    const n = Math.max(1, Math.ceil((s1 - s0) / 4));
    for (let i = 0; i < n; i++) {
      const sa = s0 + ((s1 - s0) * i) / n, sb = s0 + ((s1 - s0) * (i + 1)) / n;
      b.quad(col, v3(toWorld(e, sa, u0), off), v3(toWorld(e, sa, u1), off), v3(toWorld(e, sb, u1), off), v3(toWorld(e, sb, u0), off));
    }
  }
  for (const e of edges) strip(ASPH, e, e.tA, e.len - e.tB, e.uMax, e.uMin, 0.02);
  // intersections
  for (const n of Object.values(nodes)) {
    if (n.roundabout) {
      const R = n.roundabout, Ri = R - (n.ringW || 7.5), seg = 40;
      n.ringR = (R + Ri) / 2; n.islandR = Ri;
      for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
        const p = (r, a) => [n.x + Math.cos(a) * r, n.z + Math.sin(a) * r];
        geo.quad(ASPH, v3(p(R + 0.5, a0), 0.02), v3(p(Ri, a0), 0.02), v3(p(Ri, a1), 0.02), v3(p(R + 0.5, a1), 0.02));
      }
      continue;
    }
    if (n.edges.length < 2) continue;
    const pts = [];
    for (const e of n.edges) { const s = e.A === n ? e.tA : e.len - e.tB; pts.push(toWorld(e, s, e.uMin), toWorld(e, s, e.uMax)); }
    pts.push([n.x, n.z]);
    const hp = hull(pts); n.poly = hp;
    for (let i = 1; i < hp.length - 1; i++) geo.tri(ASPH, v3(hp[0], 0.02), v3(hp[i + 1], 0.02), v3(hp[i], 0.02));
  }
  // ---------------------------------------------------------------- blocks (raised sidewalks + lots)
  const blocks = [];
  for (const bd of def.blocks || []) {
    let poly = bd.poly;
    if (bd.rect) { const [x0, z0, x1, z1] = bd.rect; poly = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]; }
    if (bd.circle) { const [cx, cz, r] = bd.circle; poly = []; for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; poly.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); } }
    const b = { poly, data: bd, sw: bd.sw ?? SW, lot: bd.lot || "#86c66b" };
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity; for (const [x, z] of poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    b.bb = [x0, z0, x1, z1];
    blocks.push(b);
    const top = 0.16;
    // top surface: grid cells (follows terrain), colored sidewalk vs lot
    const cs = 2;
    for (let x = x0; x < x1 - 1e-6; x += cs) for (let z = z0; z < z1 - 1e-6; z += cs) {
      const xa = x, xb = Math.min(x + cs, x1), za = z, zb = Math.min(z + cs, z1), cx = (xa + xb) / 2, cz = (za + zb) / 2;
      if (!pointInPoly(cx, cz, poly)) continue;
      const col = distToPolyEdge(cx, cz, poly) < b.sw ? SIDE : b.lot;
      geo.quad(col, v3([xa, za], top), v3([xa, zb], top), v3([xb, zb], top), v3([xb, za], top));
    }
    // curb faces
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.max(1, Math.ceil(L / 4));
      for (let k = 0; k < n; k++) {
        const a = [p[0] + ((q[0] - p[0]) * k) / n, p[1] + ((q[1] - p[1]) * k) / n], c = [p[0] + ((q[0] - p[0]) * (k + 1)) / n, p[1] + ((q[1] - p[1]) * (k + 1)) / n];
        geo.quad(CURB, v3(a, top), v3(a, -0.04), v3(c, -0.04), v3(c, top));
      }
    }
  }
  // ---------------------------------------------------------------- markings
  const crosswalks = [], stopLines = [], approaches = [];
  const dash = (e, s0, s1, u, w, col, on = 3, off = 4) => { for (let s = s0; s < s1; s += on + off) strip(col, e, s, Math.min(s + on, s1), u - w / 2, u + w / 2, 0.035, mark); };
  const solid = (e, s0, s1, u, w, col) => strip(col, e, s0, s1, u - w / 2, u + w / 2, 0.035, mark);
  for (const e of edges) {
    const s0 = e.tA + 0.5, s1 = e.len - e.tB - 0.5;
    // edge lines
    solid(e, s0, s1, e.uMin + 0.2, 0.12, WHITE); solid(e, s0, s1, e.uMax - 0.2, 0.12, WHITE);
    if (e.nB > 0) {
      if (e.center === "double") { solid(e, s0, s1, -0.12, 0.1, YEL); solid(e, s0, s1, 0.12, 0.1, YEL); }
      else if (e.center === "mixed") { solid(e, s0, s1, -0.12, 0.1, YEL); dash(e, s0, s1, 0.12, 0.1, YEL); } // no overtaking for B→A
      else dash(e, s0, s1, 0, 0.12, YEL, 4, 4);
      for (let i = 1; i < e.nF; i++) dash(e, s0, s1, i * e.laneW, 0.12, WHITE);
      for (let i = 1; i < e.nB; i++) dash(e, s0, s1, -i * e.laneW, 0.12, WHITE);
    } else for (let i = 1; i < e.nF; i++) dash(e, s0, s1, e.uMin + (e.parking && e.parking.side < 0 ? 2.4 : 0) + i * e.laneW, 0.12, WHITE);
    // parking lane: slot marks
    if (e.parking) {
      const sd = e.parking.side, uIn = sd > 0 ? e.uMax - 2.4 : e.uMin + 2.4, uOut = sd > 0 ? e.uMax - 0.2 : e.uMin + 0.2;
      e.slots = [];
      for (let s = e.parking.from; s + 6 <= e.parking.to; s += 6) { strip(WHITE, e, s - 0.06, s + 0.06, Math.min(uIn, uOut), Math.max(uIn, uOut), 0.036, mark); e.slots.push({ s0: s, s1: s + 6, u: (uIn + uOut) / 2 }); }
      strip(WHITE, e, e.parking.to - 0.06, e.parking.to + 0.06, Math.min(uIn, uOut), Math.max(uIn, uOut), 0.036, mark);
      solid(e, e.parking.from, e.parking.to, uIn, 0.12, WHITE);
    }
    // per-end: crosswalk + stop line + approach data
    for (const end of ["A", "B"]) {
      const n = e[end]; if (n.edges.length < 2 && !n.roundabout) continue;
      const t = end === "A" ? e.tA : e.len - e.tB, sg = end === "A" ? 1 : -1; // sg: direction from node into the edge
      const hasCw = !(n.crosswalk === false || (e.noCrosswalk || []).includes(n.id)) && !n.roundabout;
      const cwS0 = t + sg * 0.6, cwS1 = t + sg * 3.6;
      if (hasCw) {
        const sa = Math.min(cwS0, cwS1), sb = Math.max(cwS0, cwS1);
        for (let u = e.uMin + 0.4; u < e.uMax - 0.3; u += 0.9) strip(WHITE, e, sa, sb, u, Math.min(u + 0.5, e.uMax - 0.3), 0.036, mark);
        const mid = toWorld(e, (sa + sb) / 2, 0);
        crosswalks.push({ id: crosswalks.length, edge: e, node: n, s0: sa, s1: sb, x: mid[0], z: mid[1], ends: [toWorld(e, (sa + sb) / 2, e.uMin - SW / 2), toWorld(e, (sa + sb) / 2, e.uMax + SW / 2)] });
      }
      // incoming lanes toward n: direction a→b if n is B
      const incomingDir = end === "B" ? 1 : -1, nIn = incomingDir > 0 ? e.nF : e.nB;
      if (nIn > 0) {
        const stopS = t + sg * (hasCw ? 4.3 : 0.6);
        const uA = incomingDir > 0 ? (e.nB > 0 ? 0 : e.uMin) : e.uMin, uB = incomingDir > 0 ? e.uMax : 0;
        const control = n.signal ? "signal" : (n.stop || []).includes(e.id) ? "stop" : (n.yield || []).includes(e.id) ? "yield" : n.roundabout ? "yield" : "none";
        if (control === "signal" || control === "stop") strip(WHITE, e, Math.min(stopS, stopS + sg * 0.4), Math.max(stopS, stopS + sg * 0.4), uA, uB, 0.036, mark);
        const ap = { edge: e, node: n, dir: incomingDir, stopS, control, cw: hasCw ? crosswalks[crosswalks.length - 1] : null };
        approaches.push(ap); stopLines.push(ap);
        // signs on the driver's right side, before the stop line
        const travelH = incomingDir > 0 ? e.h : e.h + Math.PI, uSide = incomingDir > 0 ? e.uMax + 0.9 : e.uMin - 0.9;
        const sp = toWorld(e, stopS + sg * 0.6, uSide);
        if (control === "stop") addRoadSign(scene, "stop", sp[0], Y(sp[0], sp[1], 0.16), sp[1], travelH + Math.PI);
        if (control === "yield" && !n.roundabout) addRoadSign(scene, "yield", sp[0], Y(sp[0], sp[1], 0.16), sp[1], travelH + Math.PI);
        if (n.roundabout) addRoadSign(scene, "warn:↻", sp[0], Y(sp[0], sp[1], 0.16), sp[1], travelH + Math.PI);
        // "PARE" painted on the road
        if (control === "stop") {
          const tex = signTex("pareRoad", (c) => { c.fillStyle = "#fff"; c.font = F(54); c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("PARE", 64, 64); });
          const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false }));
          const c = toWorld(e, stopS + sg * 2.4, (uA + uB) / 2); m.position.set(c[0], Y(c[0], c[1], 0.04), c[1]); m.rotation.set(-Math.PI / 2, 0, -travelH + Math.PI); m.renderOrder = 1; scene.add(m);
        }
      }
      // speed limit sign leaving the node (direction away from n)
      const outDir = end === "A" ? 1 : -1, nOut = outDir > 0 ? e.nF : e.nB;
      if (nOut > 0 && e.len > 40) {
        const sS = t + sg * 9, uSide = outDir > 0 ? e.uMax + 0.9 : e.uMin - 0.9, p = toWorld(e, sS, uSide), hh = outDir > 0 ? e.h : e.h + Math.PI;
        addRoadSign(scene, "speed:" + e.speed, p[0], Y(p[0], p[1], 0.16), p[1], hh + Math.PI);
        if (e.school) { const q = toWorld(e, sS + sg * 14, uSide); addRoadSign(scene, "warn:ESCOLA", q[0], Y(q[0], q[1], 0.16), q[1], hh + Math.PI); }
        if (e.center === "double" && e.len > 120) { const q = toWorld(e, sS + sg * 22, uSide); addRoadSign(scene, "noOvertake", q[0], Y(q[0], q[1], 0.16), q[1], hh + Math.PI); }
      }
    }
    // mid-block crosswalks
    for (const s of e.crosswalks || []) {
      for (let u = e.uMin + 0.4; u < e.uMax - 0.3; u += 0.9) strip(WHITE, e, s - 1.5, s + 1.5, u, Math.min(u + 0.5, e.uMax - 0.3), 0.036, mark);
      const mid = toWorld(e, s, 0);
      crosswalks.push({ id: crosswalks.length, edge: e, node: null, s0: s - 1.5, s1: s + 1.5, x: mid[0], z: mid[1], ends: [toWorld(e, s, e.uMin - SW / 2), toWorld(e, s, e.uMax + SW / 2)] });
      [[1, e.uMax + 0.9], [-1, e.uMin - 0.9]].forEach(([dir, u]) => { const p = toWorld(e, s - dir * 8, u); addRoadSign(scene, "warn:🚶", p[0], Y(p[0], p[1], 0.16), p[1], (dir > 0 ? e.h : e.h + Math.PI) + Math.PI); });
    }
    // speed bumps
    for (const s of e.bumps || []) {
      for (let k = 0; k < 8; k++) strip(k % 2 ? "#111827" : YEL, e, s - 1.5, s + 1.5, e.uMin + ((e.uMax - e.uMin) * k) / 8, e.uMin + ((e.uMax - e.uMin) * (k + 1)) / 8, 0.12, mark);
      [[1, e.uMax + 0.9], [-1, e.uMin - 0.9]].forEach(([dir, u]) => { if ((dir > 0 ? e.nF : e.nB) === 0) return; const p = toWorld(e, s - dir * 25, u); addRoadSign(scene, "warn:LOMBADA", p[0], Y(p[0], p[1], 0.16), p[1], (dir > 0 ? e.h : e.h + Math.PI) + Math.PI); });
    }
    // street name plate at the A end
    if (e.name && e.len > 40) {
      const p = toWorld(e, e.tA + 2, e.uMax + 1.4); const g = new THREE.Group(); g.position.set(p[0], Y(p[0], p[1], 0.16), p[1]); g.rotation.y = e.h + Math.PI / 2; scene.add(g);
      part(0.08, 2.9, 0.08, "#475569", 0, 1.45, 0, g);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.45), new THREE.MeshLambertMaterial({ map: streetNameTex(e.name), side: THREE.DoubleSide })); m.position.y = 2.75; g.add(m);
    }
  }
  geo.build(scene); mark.build(scene, true);

  // ---------------------------------------------------------------- traffic lights
  let clock = 0;
  const lights = [];
  for (const n of Object.values(nodes)) {
    if (!n.signal) continue;
    const groups = [];
    for (const e of n.edges) { const ang = ((e.h % Math.PI) + Math.PI) % Math.PI; let g = groups.find((q) => Math.abs(wrap(2 * (q.ang - ang))) < 0.6); if (!g) groups.push((g = { ang, edges: [] })); g.edges.push(e); }
    n.groups = groups; n.cycle = def.cycle || [14, 3, 1.5]; n.offset = (n.offset ?? (Object.keys(nodes).indexOf(n.id) * 7.3)) % 100;
    for (const ap of approaches.filter((a) => a.node === n)) {
      const e = ap.edge, sg = ap.dir > 0 ? -1 : 1;
      const uSide = ap.dir > 0 ? e.uMax + 0.9 : e.uMin - 0.9;
      const p = toWorld(e, ap.stopS + sg * 0.4, uSide), hh = (ap.dir > 0 ? e.h : e.h + Math.PI) + Math.PI;
      const g = new THREE.Group(); g.position.set(p[0], Y(p[0], p[1], 0.16), p[1]); g.rotation.y = hh; scene.add(g);
      part(0.14, 3.2, 0.14, "#334155", 0, 1.6, 0, g);
      const head = lightHead(g, 0, 3.6, 0);
      // second head across the intersection (far side, left of the driver) for visibility from the cockpit
      const far = toWorld(e, ap.stopS - sg * (2 * (ap.dir > 0 ? e.tB : e.tA) + 10), ap.dir > 0 ? e.uMin - 0.9 : e.uMax + 0.9);
      const g2 = new THREE.Group(); g2.position.set(far[0], Y(far[0], far[1], 0.16), far[1]); g2.rotation.y = hh; scene.add(g2);
      part(0.14, 3.2, 0.14, "#334155", 0, 1.6, 0, g2);
      const head2 = lightHead(g2, 0, 3.6, 0);
      phys.addBox({ x: p[0], y: Y(p[0], p[1], 1.6), z: p[1], w: 0.3, h: 3.2, d: 0.3, mesh: false });
      lights.push({ ap, heads: [head, head2] });
      ap.group = groups.findIndex((q) => q.edges.includes(e));
    }
  }
  function signalState(n, edge) {
    if (n.signal === "off") return "off";
    if (n.signal === "blink") return "blink";
    const [G, Yw, R] = n.cycle, T = 2 * (G + Yw + R), t = (clock + n.offset) % T;
    const gi = n.groups.findIndex((q) => q.edges.includes(edge));
    const local = gi === 0 ? t : (t + (G + Yw + R)) % T;
    if (local < G) return "green"; if (local < G + Yw) return "yellow"; return "red";
  }
  /** seconds until this approach turns green (0 if green) */
  function signalWait(n, edge) {
    const [G, Yw, R] = n.cycle, T = 2 * (G + Yw + R), t = (clock + n.offset) % T, gi = n.groups.findIndex((q) => q.edges.includes(edge));
    const local = gi === 0 ? t : (t + (G + Yw + R)) % T; return local < G ? 0 : T - local;
  }

  // ---------------------------------------------------------------- lanes & connectors (for AI traffic)
  const lanes = [];
  for (const e of edges) {
    for (const dir of [1, -1]) {
      const n = dir > 0 ? e.nF : e.nB;
      for (let i = 0; i < n; i++) {
        let u;
        if (e.nB > 0) u = dir * (i + 0.5) * e.laneW; else u = e.uMin + (e.parking && e.parking.side < 0 ? 2.4 : 0) + (i + 0.5) * e.laneW;
        const from = dir > 0 ? e.A : e.B, to = dir > 0 ? e.B : e.A;
        const sStart = dir > 0 ? e.tA : e.len - e.tB, sEnd = dir > 0 ? e.len - e.tB : e.tA;
        const ap = approaches.find((a) => a.edge === e && a.dir === dir);
        const p0 = toWorld(e, sStart, u), p1 = toWorld(e, sEnd, u);
        // lane index from the driver's left (0 = leftmost)
        const left = e.nB > 0 ? i : dir > 0 ? i : n - 1 - i;
        const lane = { id: lanes.length, edge: e, dir, i: left, n, u, from, to, path: makePath([p0, p1]), h: dir > 0 ? e.h : e.h + Math.PI, ap, speed: e.speed, next: [] };
        lane.stopD = ap ? Math.abs(ap.stopS - sStart) : lane.path.len;
        lanes.push(lane);
      }
    }
  }
  const turnOf = (hin, hout) => { const d = wrap(hout - hin); return Math.abs(d) < 0.5 ? "straight" : d > 0 ? "left" : "right"; };
  // heading increases counter-clockwise seen from above?  forward = (sin h, cos h): a positive Δh turns toward +x from +z → LEFT for a driver (right = -x).
  for (const n of Object.values(nodes)) {
    const ins = lanes.filter((l) => l.to === n), outs = lanes.filter((l) => l.from === n);
    for (const li of ins) {
      const byEdge = new Map(); for (const lo of outs) { if (lo.edge === li.edge) continue; (byEdge.get(lo.edge) || byEdge.set(lo.edge, []).get(lo.edge)).push(lo); }
      for (const [oe, olanes] of byEdge) {
        const turn = turnOf(li.h, olanes[0].h);
        const leftmost = li.i === 0, rightmost = li.i === li.n - 1;
        if (!n.roundabout && ((turn === "right" && !rightmost) || (turn === "left" && !leftmost))) continue;
        olanes.sort((a, b) => a.i - b.i);
        const lo = turn === "right" ? olanes[olanes.length - 1] : turn === "left" ? olanes[0] : olanes[Math.min(li.i, olanes.length - 1)];
        const p0 = li.path.pts[1], p1 = lo.path.pts[0];
        let pts;
        if (n.roundabout) {
          const R = n.ringR, a0 = Math.atan2(p0[1] - n.z, p0[0] - n.x), a1 = Math.atan2(p1[1] - n.z, p1[0] - n.x);
          let s0 = a0 - 0.25, s1 = a1 + 0.25; while (s1 > s0 - 0.2) s1 -= Math.PI * 2; // decreasing angle (island on the driver's left)
          pts = [p0];
          const steps = Math.max(4, Math.ceil((s0 - s1) / 0.2));
          for (let k = 0; k <= steps; k++) { const a = s0 + ((s1 - s0) * k) / steps; pts.push([n.x + Math.cos(a) * R, n.z + Math.sin(a) * R]); }
          pts.push(p1);
        } else {
          const c = lineX(p0, [Math.sin(li.h), Math.cos(li.h)], p1, [Math.sin(lo.h), Math.cos(lo.h)]) || [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
          pts = turn === "straight" ? [p0, p1] : bezier(p0, c, p1, 10);
        }
        li.next.push({ lane: lo, path: makePath(pts), turn, node: n });
      }
    }
  }

  // ---------------------------------------------------------------- queries
  function groundAt(x, z) {
    for (const b of blocks) {
      if (x < b.bb[0] || x > b.bb[2] || z < b.bb[1] || z > b.bb[3]) continue;
      if (pointInPoly(x, z, b.poly)) return { y: H(x, z) + 0.16, type: distToPolyEdge(x, z, b.poly) < b.sw ? "sidewalk" : "lot", block: b };
    }
    let y = H(x, z);
    // speed bumps
    for (const e of edges) {
      if (!e.bumps) continue;
      const q = toEdge(e, x, z); if (q.u < e.uMin || q.u > e.uMax) continue;
      for (const s of e.bumps) { const d = Math.abs(q.s - s); if (d < 1.5) y += 0.1 * Math.cos((d / 1.5) * Math.PI * 0.5); }
    }
    return { y, type: onRoad(x, z) ? "road" : "off" };
  }
  function onRoad(x, z) {
    for (const e of edges) { const q = toEdge(e, x, z); if (q.s >= -1 && q.s <= e.len + 1 && q.u >= e.uMin - 0.3 && q.u <= e.uMax + 0.3) return true; }
    for (const n of Object.values(nodes)) { if (n.roundabout) { const d = Math.hypot(x - n.x, z - n.z); if (d < n.roundabout + 0.5 && d > n.islandR) return true; } else if (n.poly && pointInPoly(x, z, n.poly)) return true; }
    return false;
  }
  /**
   * Where is a driver at (x,z) heading h? → { edge, s, u, dir (+1 a→b, -1 b→a), lane (0 = leftmost) | -1 (wrong side), wrongWay, onCenter,
   *   speed, node (inside an intersection), ap (next approach ahead), distToStop }
   */
  function locate(x, z, h) {
    for (const n of Object.values(nodes)) {
      if (n.roundabout) { const d = Math.hypot(x - n.x, z - n.z); if (d < n.roundabout && d > n.islandR - 0.5) return { node: n, roundabout: true, speed: Math.max(...n.edges.map((e) => e.speed)) }; }
      else if (n.poly && pointInPoly(x, z, n.poly)) return { node: n, speed: Math.max(...n.edges.map((e) => e.speed)) };
    }
    let best = null;
    for (const e of edges) {
      const q = toEdge(e, x, z);
      if (q.s < e.tA - 0.5 || q.s > e.len - e.tB + 0.5 || q.u < e.uMin - 1 || q.u > e.uMax + 1) continue;
      const cos = Math.cos(h - e.h), dir = cos >= 0 ? 1 : -1;
      let lane = -1, wrongWay = false;
      if (e.nB > 0) { if (q.u * dir > 0) lane = Math.floor((q.u * dir) / e.laneW); else wrongWay = true; }
      else { if (dir < 0) wrongWay = true; else lane = clamp(Math.floor((q.u - e.uMin) / e.laneW), 0, e.nF - 1); }
      const ap = approaches.find((a) => a.edge === e && a.dir === dir);
      const r = { edge: e, s: q.s, u: q.u, dir, lane, wrongWay, onCenter: e.nB > 0 && Math.abs(q.u) < 0.9, speed: e.speed, ap, distToStop: ap ? (ap.stopS - q.s) * dir : Infinity, school: !!e.school };
      const off = Math.max(0, q.u - e.uMax, e.uMin - q.u);
      if (!best || off < best._off) { best = r; r._off = off; }
    }
    return best;
  }
  /** Ray-ish visibility test for scenario scripting: is (x2,z2) hidden from (x1,z1) by a building? */
  function blocked(x1, z1, x2, z2) {
    const n = Math.ceil(Math.hypot(x2 - x1, z2 - z1) / 2);
    for (let i = 1; i < n; i++) { const x = x1 + ((x2 - x1) * i) / n, z = z1 + ((z2 - z1) * i) / n; for (const b of phys.query(x, z, 1)) if (b.building && x > b.min[0] && x < b.max[0] && z > b.min[2] && z < b.max[2]) return true; }
    return false;
  }

  const api = {
    nodes, edges, E, blocks, lanes, crosswalks, approaches, lights, height: H, toWorld, toEdge,
    groundAt, onRoad, locate, blocked, signalState, signalWait,
    get clock() { return clock; },
    update(dt) {
      clock += dt;
      for (const L of lights) {
        const st = signalState(L.ap.node, L.ap.edge), blinkOn = (clock % 1) < 0.5;
        for (const hd of L.heads) {
          hd.red.material.emissiveIntensity = st === "red" ? 1.6 : 0.03;
          hd.yellow.material.emissiveIntensity = st === "yellow" || (st === "blink" && blinkOn) ? 1.6 : 0.03;
          hd.green.material.emissiveIntensity = st === "green" ? 1.6 : 0.03;
        }
      }
    },
  };
  return api;
}
