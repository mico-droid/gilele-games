// "Mapa real" — gera o cenário 3D a partir do pacote do mapa (geo.js).
// Tudo vira poucas malhas grandes (ruas, paredes, telhados, áreas) para rodar leve no celular.
// Colisão: a física do motor só tem caixas alinhadas aos eixos, então prédios fechados (polígonos
// inclinados) viram faixas de caixas, e as paredes das casas que dá para entrar viram fileiras de caixas finas.
// Casas (térreas/sobrados): 50% fechadas, 25% com porta (abre/fecha) e 25% abertas.
// Quarteirões sem prédios no OSM recebem casas genéricas; tudo com sorteio de semente = ID do bloco.
import { THREE, getMat, part, t } from "../../engine/ez.js";
import { CATS, U, dirFrom } from "./geo.js";

const LV = 6;            // altura de um andar em unidades (3 m)
const CELL = 1.5;        // resolução da colisão dos prédios fechados
const GRID = 4;          // grade de ocupação (casas genéricas, lojas genéricas)
const DW = 3.6;          // largura da porta

export function rng(seedStr) { let h = 2166136261; for (const c of String(seedStr)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => { h += 0x6d2b79f5; let x = Math.imul(h ^ (h >>> 15), 1 | h); x ^= x + Math.imul(x ^ (x >>> 7), 61 | x); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
export function pip(x, z, p) { let c = false; for (let i = 0, n = p.length / 2, j = n - 1; i < n; j = i++) { const xi = p[2 * i], zi = p[2 * i + 1], xj = p[2 * j], zj = p[2 * j + 1]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; }
const HOUSE = ["#fef3c7", "#fde68a", "#fed7aa", "#e0f2fe", "#f5f5f4", "#fce7f3", "#dcfce7", "#ede9fe", "#ffedd5", "#e7e5e4"];
const ROOF = ["#9a3412", "#7c2d12", "#78716c", "#57534e", "#b45309"];
const polyAreaU = (p) => { let a = 0; for (let i = 0, n = p.length / 2; i < n; i++) { const j = (i + 1) % n; a += p[2 * i] * p[2 * j + 1] - p[2 * j] * p[2 * i + 1]; } return a / 2; };

/** Acumulador de triângulos com cor por vértice (e UV opcional) → uma única BufferGeometry. */
function mesher(uv) {
  const pos = [], col = [], uvs = [], c = new THREE.Color(), v = new THREE.Vector3(), w = new THREE.Vector3();
  return {
    tri(a, b, d, color, want, ua, ub, ud) {
      v.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); w.set(d[0] - a[0], d[1] - a[1], d[2] - a[2]); v.cross(w);
      if (want && v.x * want[0] + v.y * want[1] + v.z * want[2] < 0) { [b, d] = [d, b]; [ub, ud] = [ud, ub]; }
      pos.push(...a, ...b, ...d); c.set(color); for (let i = 0; i < 3; i++) col.push(c.r, c.g, c.b);
      if (uv) uvs.push(...(ua || [0, 0]), ...(ub || [0, 0]), ...(ud || [0, 0]));
    },
    quad(a, b, c2, d, color, want, ua, ub, uc, ud) { this.tri(a, b, c2, color, want, ua, ub, uc); this.tri(a, c2, d, color, want, ua, uc, ud); },
    build() {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      if (uv) g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      g.computeVertexNormals(); g.computeBoundingSphere(); return g;
    },
    get count() { return pos.length / 9; },
  };
}
function windowTex() {
  const cv = document.createElement("canvas"); cv.width = cv.height = 64; const x = cv.getContext("2d");
  x.fillStyle = "#ffffff"; x.fillRect(0, 0, 64, 64);
  x.fillStyle = "#64748b"; x.fillRect(14, 18, 36, 26); x.fillStyle = "#94a3b8"; x.fillRect(16, 20, 15, 22); x.fillRect(33, 20, 15, 22);
  x.fillStyle = "#e5e7eb"; x.fillRect(0, 58, 64, 6);
  const tx = new THREE.CanvasTexture(cv); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; return tx;
}
export function sign(text, bg, scale = 1) {
  const cv = document.createElement("canvas"); cv.width = 512; cv.height = 128; const c = cv.getContext("2d");
  let fs = 56; c.font = `700 ${fs}px Fredoka, system-ui, sans-serif`;
  while (c.measureText(text).width > 460 && fs > 24) { fs -= 4; c.font = `700 ${fs}px Fredoka, system-ui, sans-serif`; }
  const w = Math.min(500, c.measureText(text).width + 50), x0 = (512 - w) / 2;
  c.fillStyle = bg; c.strokeStyle = "#fff"; c.lineWidth = 7; c.beginPath(); c.roundRect ? c.roundRect(x0, 12, w, 104, 24) : c.rect(x0, 12, w, 104); c.fill(); c.stroke();
  c.fillStyle = "#fff"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(text, 256, 66);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(12 * scale, 3 * scale, 1); return sp;
}
export function fmtKm(m) { return m >= 1000 ? (m / 1000).toFixed(1).replace(".", ",") + " km" : Math.round(m / 10) * 10 + " m"; }

/**
 * Monta o mundo. opt.seed muda o sorteio (casas abertas/fechadas, casas genéricas) — o mesmo bloco + seed = mesmo mundo.
 * Devolve { group, spawn, stats, exitMark, lootSlots, botPoints, place(cat), nearDoor, toggleDoor, insideHollow, setInside, update, dispose }.
 */
export function buildOsmCity(world, phys, pack, opt = {}) {
  const S = world.scene, R = pack.r / U, root = new THREE.Group(); S.add(root);
  const rand = rng(pack.id + "|" + (opt.seed || "")), boxes = [];
  const addBox = (o) => { const b = phys.addBox(o); boxes.push(b); return b; };
  const edge = pack.edge || [-R, -R, R, -R, R, R, -R, R];
  const inEdge = (x, z, m = 0) => pip(x, z, edge) && (!m || (pip(x + m, z, edge) && pip(x - m, z, edge) && pip(x, z + m, edge) && pip(x, z - m, edge)));
  const HB = pack.home; // quarteirão de casa do Apagão Real (city.js homeOnly)
  const inHome = (x, z, m = 0) => HB && x > HB.x0 - m && x < HB.x1 + m && z > HB.z0 - m && z < HB.z1 + 1 + m;

  // ---------------------------------------------------------------- chão e limites (bordas do bloco, mesmo girado)
  const G = R * 3.2;
  addBox({ x: 0, y: -0.5, z: 0, w: G, h: 1, d: G, color: 0x9bbf63, scene: root, castShadow: false });
  for (let i = 0, n = edge.length / 2; i < n; i++) {
    const j = (i + 1) % n, ax = edge[2 * i], az = edge[2 * i + 1], bx = edge[2 * j], bz = edge[2 * j + 1], L = Math.hypot(bx - ax, bz - az);
    for (let s = 0; s <= L; s += 3) addBox({ x: ax + ((bx - ax) * s) / L, y: 5, z: az + ((bz - az) * s) / L, w: 3.4, h: 12, d: 3.4, mesh: false });
  }

  // ---------------------------------------------------------------- grade de ocupação
  const E = R * 1.5, NG = Math.ceil((2 * E) / GRID), occ = new Uint8Array(NG * NG);
  const gi = (x) => Math.floor((x + E) / GRID);
  const mark = (x, z, v = 1) => { const i = gi(x), k = gi(z); if (i >= 0 && k >= 0 && i < NG && k < NG) occ[k * NG + i] = Math.max(occ[k * NG + i], v); };
  const isOcc = (x, z) => { const i = gi(x), k = gi(z); return i < 0 || k < 0 || i >= NG || k >= NG || occ[k * NG + i] > 0 || inHome(x, z, 3); };

  // ---------------------------------------------------------------- áreas verdes / água
  const am = mesher(false), AC = { green: "#86efac", wood: "#4d7c0f", pitch: "#65a30d", water: "#38bdf8" };
  for (const a of pack.areas) {
    const pts = []; for (let i = 0; i < a.p.length; i += 2) pts.push(new THREE.Vector2(a.p[i], a.p[i + 1]));
    if (pts.length > 2 && pts[0].equals(pts[pts.length - 1])) pts.pop();
    let tris; try { tris = THREE.ShapeUtils.triangulateShape(pts, []); } catch (e) { continue; }
    for (const [i, j, k] of tris) am.tri([pts[i].x, 0.01, pts[i].y], [pts[j].x, 0.01, pts[j].y], [pts[k].x, 0.01, pts[k].y], AC[a.k] || AC.green, [0, 1, 0]);
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let i = 0; i < a.p.length; i += 2) { x0 = Math.min(x0, a.p[i]); x1 = Math.max(x1, a.p[i]); z0 = Math.min(z0, a.p[i + 1]); z1 = Math.max(z1, a.p[i + 1]); }
    x0 = Math.max(x0, -E); x1 = Math.min(x1, E); z0 = Math.max(z0, -E); z1 = Math.min(z1, E);
    for (let x = x0; x <= x1; x += GRID) for (let z = z0; z <= z1; z += GRID) if (pip(x, z, a.p)) mark(x, z, 2);
  }
  // polygonOffset: puxa áreas e ruas "para cima" do chão sem tremer (z-fighting) de longe
  if (am.count) { const m = new THREE.Mesh(am.build(), new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); m.receiveShadow = true; root.add(m); }

  // ---------------------------------------------------------------- ruas
  const rm = mesher(false);
  const RC = (k) => (/^(footway|path|cycleway|steps|pedestrian)$/.test(k) ? "#d6d3d1" : k === "track" ? "#a16207" : /^(motorway|trunk)/.test(k) ? "#27272a" : "#3f3f46");
  const RY = (k) => (/^(footway|path|cycleway|steps)$/.test(k) ? 0.02 : /^(motorway|trunk|primary|secondary)/.test(k) ? 0.04 : 0.03);
  for (const r of pack.roads) {
    const hw = r.w / 2, c = RC(r.k), y = RY(r.k), p = r.p;
    for (let i = 0; i + 3 < p.length; i += 2) {
      const ax = p[i], az = p[i + 1], bx = p[i + 2], bz = p[i + 3], dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz); if (L < 0.01) continue;
      const nx = (-dz / L) * hw, nz = (dx / L) * hw;
      rm.quad([ax + nx, y, az + nz], [bx + nx, y, bz + nz], [bx - nx, y, bz - nz], [ax - nx, y, az - nz], c, [0, 1, 0]);
      for (let s = 0; s <= L; s += GRID / 2) for (let o = -hw; o <= hw; o += GRID / 2) mark(ax + (dx / L) * s + (nx / hw) * o, az + (dz / L) * s + (nz / hw) * o);
    }
    for (let i = 0; i < p.length; i += 2) { // juntas redondas (sem buracos nas curvas)
      const n = 8; for (let s = 0; s < n; s++) { const a0 = (s / n) * Math.PI * 2, a1 = ((s + 1) / n) * Math.PI * 2; rm.tri([p[i], y - 0.001, p[i + 1]], [p[i] + Math.cos(a0) * hw, y - 0.001, p[i + 1] + Math.sin(a0) * hw], [p[i] + Math.cos(a1) * hw, y - 0.001, p[i + 1] + Math.sin(a1) * hw], c, [0, 1, 0]); }
    }
  }
  if (rm.count) { const m = new THREE.Mesh(rm.build(), new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })); m.receiveShadow = true; root.add(m); }

  const nearestRoad = (x, z, skipFoot = true) => {
    let best = null;
    for (const r of pack.roads) { if (skipFoot && /^(footway|path|steps|cycleway)$/.test(r.k)) continue; const p = r.p;
      for (let i = 0; i + 3 < p.length; i += 2) { const ax = p[i], az = p[i + 1], dx = p[i + 2] - ax, dz = p[i + 3] - az, L = dx * dx + dz * dz; let tt = L ? ((x - ax) * dx + (z - az) * dz) / L : 0; tt = Math.max(0, Math.min(1, tt));
        const qx = ax + dx * tt, qz = az + dz * tt, d = Math.hypot(x - qx, z - qz); if (!best || d < best.d) best = { d, x: qx, z: qz, ang: Math.atan2(dz, dx), w: r.w }; } }
    return best;
  };

  // ---------------------------------------------------------------- prédios
  let wm = mesher(true), hRoofM = mesher(false), floorM = mesher(false);
  const roofM = mesher(false), wallTex = windowTex(), lateRoofs = [];
  const hollows = [], doors = [], lootSlots = [], hGrid = new Map();
  let nReal = 0, nGen = 0, nCol = 0, nOpen = 0, nDoor = 0, nClosed = 0;
  const poiByBld = new Map();
  for (const o of pack.pois) if (o.in && !o.id.startsWith("w")) for (const b of pack.blds) { if (pip(o.x, o.z, b.p)) { if (!poiByBld.has(b.id)) poiByBld.set(b.id, o); break; } }

  /** Ponto aleatório dentro do polígono, longe das paredes. */
  function inside(p, m = 1.8) {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let i = 0; i < p.length; i += 2) { x0 = Math.min(x0, p[i]); x1 = Math.max(x1, p[i]); z0 = Math.min(z0, p[i + 1]); z1 = Math.max(z1, p[i + 1]); }
    for (let k = 0; k < 30; k++) { const x = x0 + rand() * (x1 - x0), z = z0 + rand() * (z1 - z0); if (pip(x, z, p) && pip(x + m, z, p) && pip(x - m, z, p) && pip(x, z + m, p) && pip(x, z - m, p)) return { x, z }; }
    return null;
  }
  /** mode: "solid" (fechado), "door" (porta que abre), "open" (vão aberto). Devolve info do prédio. */
  function addBuilding(p, hU, color, roofC, mode = "solid") {
    const n = p.length / 2, ccw = polyAreaU(p) > 0, hollow = mode !== "solid";
    // porta na parede mais perto da rua
    let dEdge = -1;
    if (hollow) { let bd = Infinity;
      for (let i = 0; i < n; i++) { const j = (i + 1) % n, L = Math.hypot(p[2 * j] - p[2 * i], p[2 * j + 1] - p[2 * i + 1]); if (L < DW + 2.4) continue;
        const r = nearestRoad((p[2 * i] + p[2 * j]) / 2, (p[2 * i + 1] + p[2 * j + 1]) / 2); const d = r ? r.d : 0; if (d < bd) { bd = d; dEdge = i; } }
      if (dEdge < 0) mode = "solid";
    }
    const isH = mode !== "solid", DH = Math.min(hU - 0.8, 4.4);
    let u0 = 0;
    const wall = (ax, az, bx, bz, y0, y1, want, uA) => { const L = Math.hypot(bx - ax, bz - az), uB = uA + L / 6;
      wm.quad([ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az], color, want, [uA, y0 / LV], [uB, y0 / LV], [uB, y1 / LV], [uA, y1 / LV]); return uB; };
    let door = null;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, ax = p[2 * i], az = p[2 * i + 1], bx = p[2 * j], bz = p[2 * j + 1], L = Math.hypot(bx - ax, bz - az); if (L < 0.01) continue;
      const ex = (bx - ax) / L, ez = (bz - az) / L;
      const want = [ccw ? -(bz - az) : bz - az, 0, ccw ? bx - ax : -(bx - ax)]; // normal da parede (para dentro; a malha é dupla face)
      if (isH && i === dEdge) {
        const t0 = (L - DW) / 2, t1 = t0 + DW, dx0 = ax + ex * t0, dz0 = az + ez * t0, dx1 = ax + ex * t1, dz1 = az + ez * t1;
        wall(ax, az, dx0, dz0, 0, hU, want, u0); wall(dx1, dz1, bx, bz, 0, hU, want, u0 + t1 / 6); wall(dx0, dz0, dx1, dz1, DH, hU, want, u0 + t0 / 6);
        door = { hx: dx0, hz: dz0, ex, ez, inX: want[0], inZ: want[2], t0, t1, ax, az, L, DH }; // "want" aponta para dentro do polígono
      } else wall(ax, az, bx, bz, 0, hU, want, u0);
      u0 += L / 6;
      if (isH) { // colisão: fileira de caixas finas ao longo da parede (com vão da porta)
        for (let s = 0.5; s < L; s += 1) {
          if (i === dEdge && s > door.t0 - 0.6 && s < door.t1 + 0.6) continue;
          addBox({ x: ax + ex * s, y: hU / 2, z: az + ez * s, w: 1.1, h: hU, d: 1.1, mesh: false }); nCol++;
        }
      }
    }
    const pts = []; for (let i = 0; i < n; i++) pts.push(new THREE.Vector2(p[2 * i], p[2 * i + 1]));
    let tris = []; try { tris = THREE.ShapeUtils.triangulateShape(pts, []); } catch (e) {}
    const RM = isH ? hRoofM : roofM;
    for (const [i, j, k] of tris) RM.tri([pts[i].x, hU, pts[i].y], [pts[j].x, hU, pts[j].y], [pts[k].x, hU, pts[k].y], roofC, [0, 1, 0]);
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let i = 0; i < n; i++) { x0 = Math.min(x0, p[2 * i]); x1 = Math.max(x1, p[2 * i]); z0 = Math.min(z0, p[2 * i + 1]); z1 = Math.max(z1, p[2 * i + 1]); }
    for (let x = x0; x <= x1; x += GRID / 2) for (let z = z0; z <= z1; z += GRID / 2) if (pip(x, z, p)) mark(x, z, 3);
    const info = { p, hU, mode, x0, x1, z0, z1, door: null };
    if (isH) {
      for (const [i, j, k] of tris) floorM.tri([pts[i].x, 0.06, pts[i].y], [pts[j].x, 0.06, pts[j].y], [pts[k].x, 0.06, pts[k].y], "#c8a27a", [0, 1, 0]);
      const idx = hollows.push(info) - 1;
      for (let gx = Math.floor(x0 / 16); gx <= Math.floor(x1 / 16); gx++) for (let gz = Math.floor(z0 / 16); gz <= Math.floor(z1 / 16); gz++) { const k = gx + "," + gz; (hGrid.get(k) || hGrid.set(k, []).get(k)).push(idx); }
      if (mode === "door" && door) { info.door = door; door.open = false; door.boxes = []; door.i = doors.push(door) - 1; nDoor++; }
      else nOpen++;
    } else {
      nClosed++;
      for (let z = z0 + CELL / 2; z < z1; z += CELL) {
        let run = null;
        for (let x = x0 + CELL / 2; x < x1 + CELL; x += CELL) {
          const inn = x < x1 && pip(x, z, p);
          if (inn && run === null) run = x;
          if (!inn && run !== null) { addBox({ x: (run + x - CELL) / 2, y: hU / 2, z, w: x - run, h: hU, d: CELL, mesh: false }); nCol++; run = null; }
        }
      }
    }
    return info;
  }
  /** Casa (térrea/sobrado de tamanho comum): 50% fechada, 25% com porta, 25% aberta. */
  const houseMode = () => { const r = rand(); return r < 0.5 ? "solid" : r < 0.75 ? "door" : "open"; };
  const isHouseSize = (p, lv) => { const a = Math.abs(polyAreaU(p)) * U * U; return lv <= 2 && a >= 30 && a <= 700; };

  for (const b of pack.blds) {
    const poi = b.k ? pack.pois.find((o) => o.id === b.id) || { k: b.k } : poiByBld.get(b.id), cat = poi && CATS[poi.k];
    const hU = Math.max(5, b.h * LV), col = cat ? cat.wall : HOUSE[Math.floor(rand() * HOUSE.length)];
    const aM2 = Math.abs(polyAreaU(b.p)) * U * U;
    // loja/serviço pequeno: sempre aberto (dá para entrar e achar itens); casas: sorteio 50/25/25
    const mode = cat ? (aM2 < 3000 && b.h <= 3 ? "open" : "solid") : isHouseSize(b.p, b.h) ? houseMode() : "solid";
    const info = addBuilding(b.p, hU, col, b.h > 3 ? "#64748b" : ROOF[Math.floor(rand() * ROOF.length)], mode);
    b._h = hU; nReal++;
    if (poi && poi.id) poi._b = info;
    if (!cat && info.mode !== "solid" && rand() < 0.3) { const q = inside(b.p); if (q) lootSlots.push({ ...q, kind: "house" }); } // 30% das casas abertas/com porta têm algo
  }

  // ---------------------------------------------------------------- locais sem prédio no OSM: lojinha genérica no ponto
  const signs = [], seenSign = new Set();
  const rect = (cx, cz, w, d, ang) => { const c = Math.cos(ang), s = Math.sin(ang), o = []; [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].forEach(([a, b]) => o.push(cx + a * c - b * s, cz + a * s + b * c)); return o; };
  const free = (p) => { for (let i = 0; i < p.length; i += 2) if (isOcc(p[i], p[i + 1]) || !inEdge(p[i], p[i + 1])) return false; let x = 0, z = 0; for (let i = 0; i < p.length; i += 2) { x += p[i]; z += p[i + 1]; } return !isOcc(x / (p.length / 2), z / (p.length / 2)); };
  function addSign(o, top) {
    const cat = CATS[o.k], label = cat.e + " " + (o.n || t("cat_" + o.k)), key = o.k + Math.round(o.x / 30) + "_" + Math.round(o.z / 30);
    if (seenSign.has(key) || signs.length > 70) return; seenSign.add(key);
    const sp = sign(label, cat.c, /^(market|hospital|police|fuel|pharmacy)$/.test(o.k) ? 1 : 0.75);
    sp.position.set(o.x, top + 2.4, o.z); root.add(sp); signs.push(sp);
  }
  function genericStore(o, cx, cz, ang, late) {
    const cat = CATS[o.k], big = o.k === "market" || o.k === "hospital" ? 1.5 : 1, w = 20 * big, d = 16 * big;
    let p = rect(cx, cz, w, d, ang);
    if (!free(p)) p = rect(cx, cz, w * 0.65, d * 0.65, ang);
    const hU = o.k === "hospital" ? 12 : 7;
    if (late) { // depois que as malhas grandes já foram montadas: malhas próprias (raro: só locais que faltam no bloco)
      const keep = [wm, hRoofM, floorM]; wm = mesher(true); hRoofM = mesher(false); floorM = mesher(false);
      o._b = addBuilding(p, hU, cat.wall, "#475569", "open"); nGen++;
      if (wm.count) { const m = new THREE.Mesh(wm.build(), wallMat); m.castShadow = m.receiveShadow = true; root.add(m); }
      if (hRoofM.count) { const m = new THREE.Mesh(hRoofM.build(), hRoofMat); m.castShadow = true; root.add(m); lateRoofs.push(m); }
      if (floorM.count) root.add(new THREE.Mesh(floorM.build(), floorMat));
      [wm, hRoofM, floorM] = keep; return hU;
    }
    o._b = addBuilding(p, hU, cat.wall, "#475569", "open"); nGen++;
    return hU;
  }
  for (const o of pack.pois) {
    if (!o.in || inHome(o.x, o.z, 4)) continue;
    const cat = CATS[o.k]; let top = 0;
    const inB = o.id.startsWith("w") ? pack.blds.find((b) => b.id === o.id) : pack.blds.find((b) => poiByBld.get(b.id) === o);
    if (inB) top = inB._h;
    else if (!isOcc(o.x, o.z) || o.k === "fuel" || o.k === "atm" || o.k === "water") {
      const rd = nearestRoad(o.x, o.z), ang = rd ? rd.ang : 0;
      if (o.k === "fuel") { // posto: cobertura + bombas
        const g = new THREE.Group(); g.position.set(o.x, 0, o.z); g.rotation.y = -ang; root.add(g);
        part(16, 0.6, 10, "#f8fafc", 0, 9, 0, g); part(16.4, 0.3, 10.4, cat.c, 0, 8.6, 0, g);
        [[-7, -4], [7, -4], [-7, 4], [7, 4]].forEach(([a, b]) => part(0.5, 8.6, 0.5, "#e5e7eb", a, 4.3, b, g));
        [-3, 3].forEach((a) => { part(1.2, 2.6, 0.8, "#ef4444", a, 1.3, 0, g); });
        for (const a of [-3, 3]) { const c = Math.cos(-ang), s = Math.sin(-ang); addBox({ x: o.x + a * c, y: 1.3, z: o.z - a * s, w: 1.2, h: 2.6, d: 1.2, mesh: false }); }
        o._pump = { x: o.x, z: o.z }; top = 9.5;
      } else if (o.k === "atm" || o.k === "water") {
        part(1.2, 2.4, 0.9, cat.c, o.x, 1.2, o.z, root); addBox({ x: o.x, y: 1.2, z: o.z, w: 1.2, h: 2.4, d: 1.2, mesh: false }); top = 2.6;
      } else top = genericStore(o, o.x, o.z, ang);
    } else continue;
    addSign(o, top);
  }

  // ---------------------------------------------------------------- casas genéricas onde o OSM não tem prédios
  const RES = /^(residential|living_street|unclassified|tertiary)$/;
  const density = pack.blds.length / ((2 * pack.r * 2 * pack.r) / 1e4); // prédios por hectare
  if (density < 18) {
    for (const r of pack.roads) {
      if (!RES.test(r.k)) continue; const p = r.p;
      for (let i = 0; i + 3 < p.length; i += 2) {
        const ax = p[i], az = p[i + 1], dx = p[i + 2] - ax, dz = p[i + 3] - az, L = Math.hypot(dx, dz); if (L < 20) continue;
        const ux = dx / L, uz = dz / L, ang = Math.atan2(dz, dx);
        for (let s = 10; s < L - 10; s += 22 + rand() * 6) for (const side of [-1, 1]) {
          const wdt = 14 + rand() * 6, dep = 18 + rand() * 6, off = r.w / 2 + 5 + dep / 2;
          const cx = ax + ux * s - uz * off * side, cz = az + uz * s + ux * off * side;
          if (!inEdge(cx, cz, 10)) continue;
          const q = rect(cx, cz, wdt, dep, ang); if (!free(q)) continue;
          const two = rand() < 0.15, info = addBuilding(q, two ? 12 : 6, HOUSE[Math.floor(rand() * HOUSE.length)], ROOF[Math.floor(rand() * ROOF.length)], houseMode()); nGen++;
          if (info.mode !== "solid" && rand() < 0.3) { const pt = inside(q); if (pt) lootSlots.push({ ...pt, kind: "house" }); }
        }
      }
    }
  }
  const wallMat = new THREE.MeshLambertMaterial({ vertexColors: true, map: wallTex, side: THREE.DoubleSide });
  const hRoofMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const floorMat = new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 });
  if (wm.count) { const m = new THREE.Mesh(wm.build(), wallMat); m.castShadow = m.receiveShadow = true; root.add(m); }
  if (roofM.count) { const m = new THREE.Mesh(roofM.build(), new THREE.MeshLambertMaterial({ vertexColors: true })); m.castShadow = m.receiveShadow = true; root.add(m); }
  let hRoof = null;
  if (hRoofM.count) { hRoof = new THREE.Mesh(hRoofM.build(), hRoofMat); hRoof.castShadow = hRoof.receiveShadow = true; root.add(hRoof); }
  if (floorM.count) { const m = new THREE.Mesh(floorM.build(), floorMat); m.receiveShadow = true; root.add(m); }

  // ---------------------------------------------------------------- portas (uma malha instanciada para todas)
  let doorMesh = null;
  const DM = new THREE.Matrix4(), Q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), P3 = new THREE.Vector3(), S3 = new THREE.Vector3(), OFF = new THREE.Matrix4(), SC = new THREE.Matrix4();
  function placeDoor(d) {
    const theta = Math.atan2(-d.ez, d.ex);
    // abre para dentro: escolhe o lado do giro que aponta para o interior
    const swing = (Math.cos(theta + Math.PI / 2) * d.inX - Math.sin(theta + Math.PI / 2) * d.inZ) > 0 ? Math.PI / 2 : -Math.PI / 2;
    Q.setFromAxisAngle(Y, theta + (d.open ? swing * 0.95 : 0));
    DM.compose(P3.set(d.hx, 0, d.hz), Q, S3.set(1, 1, 1));
    OFF.makeTranslation(DW / 2, d.DH / 2, 0).multiply(SC.makeScale(DW, d.DH, 0.18));
    DM.multiply(OFF); doorMesh.setMatrixAt(d.i, DM);
    // colisão: só quando fechada
    if (!d.open && !d.boxes.length) for (let s = d.t0 + 0.3; s < d.t1; s += 0.9) d.boxes.push(addBox({ x: d.ax + d.ex * s, y: d.DH / 2, z: d.az + d.ez * s, w: 1, h: d.DH, d: 1, mesh: false }));
    if (d.open && d.boxes.length) { d.boxes.forEach((b) => phys.removeBox(b)); d.boxes = []; }
  }
  if (doors.length) {
    doorMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), getMat("#7c2d12"), doors.length);
    doorMesh.castShadow = true; root.add(doorMesh);
    doors.forEach(placeDoor); doorMesh.instanceMatrix.needsUpdate = true;
  }

  /** Ponto de chegada de um local (dentro, se dá para entrar; senão na calçada em frente). */
  function entrance(o) {
    const b = o._b;
    if (b && b.mode !== "solid") { let x = 0, z = 0; const n = b.p.length / 2; for (let i = 0; i < b.p.length; i += 2) { x += b.p[i]; z += b.p[i + 1]; } x /= n; z /= n; if (pip(x, z, b.p)) return { x, z }; const q = inside(b.p, 1); if (q) return q; }
    if (b) { // lado do prédio virado para a rua, 3 u para fora
      const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, rd = nearestRoad(cx, cz);
      if (rd) { const L = Math.hypot(rd.x - cx, rd.z - cz) || 1; let x = cx, z = cz;
        for (let s = 0; s < L; s += 0.5) { x = cx + ((rd.x - cx) * s) / L; z = cz + ((rd.z - cz) * s) / L; if (!pip(x, z, b.p)) break; }
        return { x: x + ((rd.x - cx) / L) * 3, z: z + ((rd.z - cz) / L) * 3 }; } }
    if (o._pump) return { x: o._pump.x + 3, z: o._pump.z + 3 };
    const rd = nearestRoad(o.x, o.z); return rd ? { x: rd.x, z: rd.z } : { x: o.x, z: o.z };
  }

  // ---------------------------------------------------------------- itens concentrados nos locais estratégicos
  for (const o of pack.pois) {
    if (!o.in || inHome(o.x, o.z, 4)) continue;
    const n = { market: 7, pharmacy: 6, hospital: 4, fuel: 3, hardware: 5, bakery: 3, water: 2, school: 2 }[o.k] || 0;
    for (let i = 0; i < n; i++) {
      let q = o._b && o._b.mode !== "solid" ? inside(o._b.p, 1.4) : null;
      if (!q) { const e = entrance(o); q = { x: e.x + (rand() - 0.5) * 3, z: e.z + (rand() - 0.5) * 3 }; }
      lootSlots.push({ ...q, kind: "poi", cat: o.k, poi: o.id });
    }
  }

  /** Local de uma categoria para o roteiro (o mais perto da casa); se não existir no bloco, cria uma loja genérica. */
  function place(cat, from = { x: 0, z: 0 }) {
    let best = null;
    for (const o of pack.pois) if (o.k === cat && o.in && !inHome(o.x, o.z, 4)) { const d = Math.hypot(o.x - from.x, o.z - from.z); if (!best || d < best.d) best = { o, d }; }
    if (best) return { ...entrance(best.o), poi: best.o };
    // genérico: ponto de rua livre entre 70 e 220 u da casa, sorteado
    const cand = [];
    for (const r of pack.roads) { if (!RES.test(r.k) && !/^(primary|secondary)$/.test(r.k)) continue; for (let i = 0; i + 3 < r.p.length; i += 2) {
      const ax = r.p[i], az = r.p[i + 1], dx = r.p[i + 2] - ax, dz = r.p[i + 3] - az, L = Math.hypot(dx, dz); if (L < 30) continue;
      for (const side of [-1, 1]) { const off = r.w / 2 + 12, cx = ax + dx / 2 - (dz / L) * off * side, cz = az + dz / 2 + (dx / L) * off * side, d = Math.hypot(cx - from.x, cz - from.z);
        if (d > 70 && d < 220 && inEdge(cx, cz, 14) && free(rect(cx, cz, 14, 12, Math.atan2(dz, dx)))) cand.push({ cx, cz, ang: Math.atan2(dz, dx) }); } } }
    if (!cand.length) return null;
    const c = cand[Math.floor(rand() * cand.length)], o = { id: "g_" + cat, k: cat, n: "", x: c.cx, z: c.cz, in: 1, gen: 1, d: 0 };
    const top = genericStore(o, c.cx, c.cz, c.ang, true); addSign(o, top); pack.pois.push(o);
    return { ...entrance(o), poi: o };
  }

  // ---------------------------------------------------------------- árvores leves nas áreas verdes (instanciadas)
  const trees = [];
  for (let k = 0; k < NG && trees.length < 260; k += 3) for (let i = 0; i < NG && trees.length < 260; i += 3) {
    const x = i * GRID - E + GRID / 2, z = k * GRID - E + GRID / 2;
    if (occ[k * NG + i] === 2 && rand() < 0.35 && !inHome(x, z, 2)) trees.push([x, z]);
  }
  if (trees.length) {
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.4, 0.5, 4, 6), getMat("#8b5a2b"), trees.length);
    const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(3, 0), getMat("#15803d"), trees.length);
    const M = new THREE.Matrix4();
    trees.forEach(([x, z], j) => { M.makeTranslation(x, 2, z); trunk.setMatrixAt(j, M); M.makeTranslation(x, 5.5, z); crown.setMatrixAt(j, M); addBox({ x, y: 2, z, w: 0.9, h: 4, d: 0.9, mesh: false }); });
    crown.castShadow = true; root.add(trunk, crown);
  }

  // ---------------------------------------------------------------- saída: rodovia ou zona rural
  let exitMark = null;
  if (pack.exit) {
    const e = pack.exit, inA = inEdge(e.x, e.z, 6), L = Math.hypot(e.x, e.z) || 1;
    let px = e.x, pz = e.z;
    if (!inA) { let s = 0; for (; s < L; s += 4) if (!inEdge((e.x * s) / L, (e.z * s) / L, 12)) break; s = Math.max(0, s - 4); px = (e.x * s) / L; pz = (e.z * s) / L; }
    const g = new THREE.Group(); g.position.set(px, 0, pz); root.add(g);
    part(0.5, 10, 0.5, "#14532d", -3, 5, 0, g); part(0.5, 10, 0.5, "#14532d", 3, 5, 0, g);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 60, 12, 1, true), new THREE.MeshBasicMaterial({ color: e.rural ? 0xeab308 : 0x22c55e, transparent: true, opacity: 0.25, depthWrite: false }));
    beam.position.y = 30; g.add(beam);
    const dirs = t("dirs").split(","), side = e.side ? { N: dirs[0], E: dirs[2], S: dirs[4], W: dirs[6] }[e.side] : "";
    const label = e.rural ? "🌾 " + t("ruralSign") + (side ? " (" + side + ")" : "") : "🛣️ " + t("exitSign") + (e.n ? " " + e.n : "") + (inA ? "" : " → " + fmtKm(e.d));
    const sp = sign(label, e.rural ? "#a16207" : "#15803d", 1.3); sp.position.set(0, 12, 0); g.add(sp);
    exitMark = { x: px, z: pz, inA, g, beam };
  }

  // ---------------------------------------------------------------- ponto de partida e pontos para pessoas andarem
  const u = pack.user || { x: 0, z: 0 };
  let spawn = { x: u.x, z: u.z };
  const rd0 = nearestRoad(u.x, u.z); if (rd0) spawn = { x: rd0.x, z: rd0.z };
  if (!inEdge(spawn.x, spawn.z, 4)) spawn = { x: 0, z: 0 };
  const botPoints = [];
  for (const r of pack.roads) { if (/^(motorway|trunk)/.test(r.k)) continue; for (let i = 0; i < r.p.length; i += 2) { const x = r.p[i], z = r.p[i + 1]; if (inEdge(x, z, 10) && !inHome(x, z, 4) && Math.hypot(x - spawn.x, z - spawn.z) > 12) botPoints.push({ x, z }); } }

  const hollowAt = (x, z) => { const L = hGrid.get(Math.floor(x / 16) + "," + Math.floor(z / 16)); if (L) for (const i of L) { const b = hollows[i]; if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && pip(x, z, b.p)) return b; } return null; };
  return {
    group: root, spawn: { x: spawn.x, y: 0.4, z: spawn.z }, exitMark, R, lootSlots, botPoints, place, entrance, rand, doors,
    stats: { roads: pack.roads.length, real: nReal, gen: nGen, pois: pack.pois.filter((o) => o.in).length, boxes: nCol, closed: nClosed, door: nDoor, open: nOpen, loot: lootSlots.length },
    /** Porta mais perto (até r unidades). */
    nearDoor(x, z, r = 3.2) { let best = null, bd = r; for (const d of doors) { const cx = d.hx + (d.ex * DW) / 2, cz = d.hz + (d.ez * DW) / 2, dd = Math.hypot(cx - x, cz - z); if (dd < bd) { bd = dd; best = d; } } return best; },
    toggleDoor(d) { d.open = !d.open; placeDoor(d); doorMesh.instanceMatrix.needsUpdate = true; },
    insideHollow: (x, z) => !!hollowAt(x, z),
    /** Esconde os telhados das casas abertas quando o jogador está dentro de uma (para a câmera ver). */
    setInside(v) { if (hRoof) hRoof.visible = !v; lateRoofs.forEach((m) => (m.visible = !v)); },
    dir: (x, z) => dirFrom(pack, x, z, t("dirs").split(",")),
    update() { if (exitMark) exitMark.beam.material.opacity = 0.18 + Math.sin(performance.now() / 400) * 0.08; },
    dispose() { root.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } }); S.remove(root); boxes.forEach((b) => phys.removeBox(b)); doors.forEach((d) => d.boxes.forEach((b) => phys.removeBox(b))); },
  };
}

/** Mapa 2D (pré-visualização, minimapa, mapa do celular). view = { cx, cz, scale (px por unidade), me?, icons? } */
export function drawMap(cv, pack, view = {}) {
  const c = cv.getContext("2d"), W = cv.width, H = cv.height, R = pack.r / U;
  const sc = view.scale || Math.min(W, H) / (2 * R * 1.05), cx = view.cx || 0, cz = view.cz || 0;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = "#cfe3a8"; c.fillRect(0, 0, W, H); c.translate(W / 2, H / 2);
  c.scale(sc, sc); c.translate(-cx, -cz);
  const poly = (p, fill) => { c.beginPath(); for (let i = 0; i < p.length; i += 2) (i ? c.lineTo : c.moveTo).call(c, p[i], p[i + 1]); c.closePath(); c.fillStyle = fill; c.fill(); };
  for (const a of pack.areas) poly(a.p, a.k === "water" ? "#7dd3fc" : "#a3d977");
  c.lineCap = c.lineJoin = "round";
  for (const r of pack.roads) { c.beginPath(); for (let i = 0; i < r.p.length; i += 2) (i ? c.lineTo : c.moveTo).call(c, r.p[i], r.p[i + 1]); c.strokeStyle = /^(footway|path|cycleway|steps|pedestrian)$/.test(r.k) ? "#f5f5f4" : /^(motorway|trunk|primary)/.test(r.k) ? "#fbbf24" : "#ffffff"; c.lineWidth = Math.max(r.w, 2 / sc); c.stroke(); }
  for (const b of pack.blds) poly(b.p, b.k ? CATS[b.k].c : "#a8a29e");
  if (pack.home) { const hb = pack.home; c.fillStyle = "#f59e0b"; c.fillRect(hb.x0, hb.z0, hb.x1 - hb.x0, hb.z1 - hb.z0); }
  const ed = pack.edge || [-R, -R, R, -R, R, R, -R, R];
  c.strokeStyle = "rgba(15,23,42,.6)"; c.lineWidth = 2 / sc; c.setLineDash([8 / sc, 6 / sc]); c.beginPath(); for (let i = 0; i < ed.length; i += 2) (i ? c.lineTo : c.moveTo).call(c, ed[i], ed[i + 1]); c.closePath(); c.stroke(); c.setLineDash([]);
  c.restore();
  const toPx = (x, z) => [W / 2 + (x - cx) * sc, H / 2 + (z - cz) * sc];
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  c.textAlign = "center"; c.textBaseline = "middle"; c.font = `${Math.max(11, Math.min(18, W / 22))}px system-ui, sans-serif`;
  if (view.icons !== false) for (const o of pack.pois) { const [x, y] = toPx(o.x, o.z); if (x < -10 || y < -10 || x > W + 10 || y > H + 10) continue; c.fillText(CATS[o.k].e, x, y); }
  if (pack.exit) {
    let [x, y] = toPx(pack.exit.x, pack.exit.z); const out = x < 14 || y < 14 || x > W - 14 || y > H - 14;
    if (out) { const dx = x - W / 2, dy = y - H / 2, k = Math.min((W / 2 - 14) / Math.abs(dx || 1e-6), (H / 2 - 14) / Math.abs(dy || 1e-6)); x = W / 2 + dx * k; y = H / 2 + dy * k; }
    c.fillText(pack.exit.rural ? "🌾" : "🛣️", x, y);
  }
  // norte (o mapa pode estar girado para caber a casa do jogador)
  const f = pack.frame, nx = f ? -f.u[1] : 0, nz = f ? -f.w[1] : -1, nl = Math.hypot(nx, nz) || 1, ax = W - 20, ay = 22;
  c.strokeStyle = "#0f172a"; c.fillStyle = "#0f172a"; c.lineWidth = 2; c.beginPath(); c.moveTo(ax - (nx / nl) * 8, ay - (nz / nl) * 8); c.lineTo(ax + (nx / nl) * 8, ay + (nz / nl) * 8); c.stroke();
  c.font = "bold 11px sans-serif"; c.fillText("N", ax + (nx / nl) * 15, ay + (nz / nl) * 15);
  if (view.me) { const [x, y] = toPx(view.me.x, view.me.z); c.fillStyle = "#ef4444"; c.strokeStyle = "#fff"; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 6, 0, Math.PI * 2); c.fill(); c.stroke(); }
  else if (pack.user && !pack.home) { const [x, y] = toPx(pack.user.x, pack.user.z); c.fillText("📍", x, y - 8); }
  c.restore();
}
