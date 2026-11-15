// "Jogar na minha cidade" — gera o cenário 3D a partir do pacote do mapa (geo.js).
// Tudo vira poucas malhas grandes (ruas, paredes, telhados, áreas) para rodar leve no celular.
// Colisão: a física do motor só tem caixas alinhadas aos eixos, então cada prédio (polígono inclinado)
// é "rasterizado" em faixas de caixas de 1,5 u que cobrem o contorno.
// Quarteirões sem prédios no OSM (comum no Brasil) recebem casas genéricas ao longo das ruas residenciais,
// sempre iguais para o mesmo bloco (aleatório com semente = ID do bloco).
import { THREE, getMat, part, t } from "../../engine/ez.js";
import { CATS, U, dirOf } from "./geo.js";

const LV = 6;            // altura de um andar em unidades (3 m)
const CELL = 1.5;        // resolução da colisão
const GRID = 4;          // grade de ocupação (para casas genéricas)

function rng(seedStr) { let h = 2166136261; for (const c of seedStr) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => { h += 0x6d2b79f5; let x = Math.imul(h ^ (h >>> 15), 1 | h); x ^= x + Math.imul(x ^ (x >>> 7), 61 | x); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
function pip(x, z, p) { let c = false; for (let i = 0, n = p.length / 2, j = n - 1; i < n; j = i++) { const xi = p[2 * i], zi = p[2 * i + 1], xj = p[2 * j], zj = p[2 * j + 1]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; }
const HOUSE = ["#fef3c7", "#fde68a", "#fed7aa", "#e0f2fe", "#f5f5f4", "#fce7f3", "#dcfce7", "#ede9fe", "#ffedd5", "#e7e5e4"];
const ROOF = ["#9a3412", "#7c2d12", "#78716c", "#57534e", "#b45309"];

/** Acumulador de triângulos com cor por vértice (e UV opcional) → uma única BufferGeometry. */
function mesher(uv) {
  const pos = [], col = [], uvs = [], c = new THREE.Color(), v = new THREE.Vector3(), w = new THREE.Vector3();
  return {
    tri(a, b, d, color, want, ua, ub, ud) {
      // garante a face virada para "want" (normal desejada)
      v.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); w.set(d[0] - a[0], d[1] - a[1], d[2] - a[2]); v.cross(w);
      if (want && v.x * want[0] + v.y * want[1] + v.z * want[2] < 0) { [b, d] = [d, b]; [ub, ud] = [ud, ub]; }
      pos.push(...a, ...b, ...d); c.set(color); for (let i = 0; i < 3; i++) col.push(c.r, c.g, c.b);
      if (uv) uvs.push(...(ua || [0, 0]), ...(ub || [0, 0]), ...(ud || [0, 0]));
    },
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
function sign(text, bg, scale = 1) {
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

/**
 * Monta o mundo. Devolve { group, spawn, stats, exitMark, catName(k), rebuild? }.
 * Interface parecida com city.js para, depois, o roteiro de sobrevivência usar os dois mapas.
 */
export function buildOsmCity(world, phys, pack) {
  const S = world.scene, R = pack.r / U, root = new THREE.Group(); S.add(root);
  const rand = rng(pack.id), boxes = [];
  const addBox = (o) => boxes.push(phys.addBox(o));

  // ---------------------------------------------------------------- chão e limites
  const G = R * 2 + 80;
  addBox({ x: 0, y: -0.5, z: 0, w: G, h: 1, d: G, color: 0x9bbf63, scene: root, castShadow: false });
  [[0, -R - 4, G, 2], [0, R + 4, G, 2], [-R - 4, 0, 2, G], [R + 4, 0, 2, G]].forEach(([x, z, w, d]) => addBox({ x, y: 4, z, w, h: 10, d, mesh: false }));

  // ---------------------------------------------------------------- grade de ocupação
  const NG = Math.ceil((2 * R + 40) / GRID), occ = new Uint8Array(NG * NG);
  const gi = (x) => Math.floor((x + R + 20) / GRID);
  const mark = (x, z, v = 1) => { const i = gi(x), k = gi(z); if (i >= 0 && k >= 0 && i < NG && k < NG) occ[k * NG + i] = Math.max(occ[k * NG + i], v); };
  const isOcc = (x, z) => { const i = gi(x), k = gi(z); return i < 0 || k < 0 || i >= NG || k >= NG || occ[k * NG + i] > 0; };

  // ---------------------------------------------------------------- áreas verdes / água
  const am = mesher(false), AC = { green: "#86efac", wood: "#4d7c0f", pitch: "#65a30d", water: "#38bdf8" };
  for (const a of pack.areas) {
    const pts = []; for (let i = 0; i < a.p.length; i += 2) pts.push(new THREE.Vector2(a.p[i], a.p[i + 1]));
    if (pts.length > 2 && pts[0].equals(pts[pts.length - 1])) pts.pop();
    let tris; try { tris = THREE.ShapeUtils.triangulateShape(pts, []); } catch (e) { continue; }
    const y = a.k === "water" ? 0.012 : 0.01;
    for (const [i, j, k] of tris) am.tri([pts[i].x, y, pts[i].y], [pts[j].x, y, pts[j].y], [pts[k].x, y, pts[k].y], AC[a.k] || AC.green, [0, 1, 0]);
    for (let i = 0; i < a.p.length; i += 2) mark(a.p[i], a.p[i + 1], 2);
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let i = 0; i < a.p.length; i += 2) { x0 = Math.min(x0, a.p[i]); x1 = Math.max(x1, a.p[i]); z0 = Math.min(z0, a.p[i + 1]); z1 = Math.max(z1, a.p[i + 1]); }
    x0 = Math.max(x0, -R); x1 = Math.min(x1, R); z0 = Math.max(z0, -R); z1 = Math.min(z1, R);
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
      rm.tri([ax + nx, y, az + nz], [bx + nx, y, bz + nz], [bx - nx, y, bz - nz], c, [0, 1, 0]);
      rm.tri([ax + nx, y, az + nz], [bx - nx, y, bz - nz], [ax - nx, y, az - nz], c, [0, 1, 0]);
      for (let s = 0; s <= L; s += GRID / 2) for (let o = -hw; o <= hw; o += GRID / 2) mark(ax + (dx / L) * s + (nx / hw) * o, az + (dz / L) * s + (nz / hw) * o);
    }
    for (let i = 0; i < p.length; i += 2) { // juntas redondas (sem buracos nas curvas)
      const n = 8; for (let s = 0; s < n; s++) { const a0 = (s / n) * Math.PI * 2, a1 = ((s + 1) / n) * Math.PI * 2; rm.tri([p[i], y - 0.001, p[i + 1]], [p[i] + Math.cos(a0) * hw, y - 0.001, p[i + 1] + Math.sin(a0) * hw], [p[i] + Math.cos(a1) * hw, y - 0.001, p[i + 1] + Math.sin(a1) * hw], c, [0, 1, 0]); }
    }
  }
  if (rm.count) { const m = new THREE.Mesh(rm.build(), new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })); m.receiveShadow = true; root.add(m); }

  // ---------------------------------------------------------------- prédios
  const wm = mesher(true), roofM = mesher(false), wallTex = windowTex();
  let nReal = 0, nGen = 0, nCol = 0;
  const poiByBld = new Map();
  for (const o of pack.pois) if (o.in && !o.id.startsWith("w")) for (const b of pack.blds) { if (pip(o.x, o.z, b.p)) { if (!poiByBld.has(b.id)) poiByBld.set(b.id, o); break; } }

  function addBuilding(p, hU, color, roofC, solid = true) {
    const n = p.length / 2; let area = 0;
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; area += p[2 * i] * p[2 * j + 1] - p[2 * j] * p[2 * i + 1]; }
    const ccw = area > 0; let u0 = 0;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, ax = p[2 * i], az = p[2 * i + 1], bx = p[2 * j], bz = p[2 * j + 1], L = Math.hypot(bx - ax, bz - az); if (L < 0.01) continue;
      const ox = ccw ? -(bz - az) : bz - az, oz = ccw ? bx - ax : -(bx - ax); // normal para fora
      const want = [ox, 0, oz], u1 = u0 + L / 6, vH = hU / LV;
      wm.tri([ax, 0, az], [bx, 0, bz], [bx, hU, bz], color, want, [u0, 0], [u1, 0], [u1, vH]);
      wm.tri([ax, 0, az], [bx, hU, bz], [ax, hU, az], color, want, [u0, 0], [u1, vH], [u0, vH]);
      u0 = u1;
    }
    const pts = []; for (let i = 0; i < n; i++) pts.push(new THREE.Vector2(p[2 * i], p[2 * i + 1]));
    let tris = []; try { tris = THREE.ShapeUtils.triangulateShape(pts, []); } catch (e) {}
    for (const [i, j, k] of tris) roofM.tri([pts[i].x, hU, pts[i].y], [pts[j].x, hU, pts[j].y], [pts[k].x, hU, pts[k].y], roofC, [0, 1, 0]);
    // ocupação + colisão por faixas
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let i = 0; i < n; i++) { x0 = Math.min(x0, p[2 * i]); x1 = Math.max(x1, p[2 * i]); z0 = Math.min(z0, p[2 * i + 1]); z1 = Math.max(z1, p[2 * i + 1]); }
    for (let x = x0; x <= x1; x += GRID / 2) for (let z = z0; z <= z1; z += GRID / 2) if (pip(x, z, p)) mark(x, z, 3);
    if (!solid) return;
    for (let z = z0 + CELL / 2; z < z1; z += CELL) {
      let run = null;
      for (let x = x0 + CELL / 2; x < x1 + CELL; x += CELL) {
        const inn = x < x1 && pip(x, z, p);
        if (inn && run === null) run = x;
        if (!inn && run !== null) { addBox({ x: (run + x - CELL) / 2, y: hU / 2, z, w: x - run, h: hU, d: CELL, mesh: false }); nCol++; run = null; }
      }
    }
  }
  for (const b of pack.blds) {
    const poi = b.k ? { k: b.k } : poiByBld.get(b.id), cat = poi && CATS[poi.k];
    const hU = Math.max(5, b.h * LV), col = cat ? cat.wall : HOUSE[Math.floor(rand() * HOUSE.length)];
    addBuilding(b.p, hU, col, b.h > 3 ? "#64748b" : ROOF[Math.floor(rand() * ROOF.length)]);
    b._h = hU; nReal++;
  }

  // ---------------------------------------------------------------- locais sem prédio no OSM: lojinha genérica no ponto
  const signs = [], seenSign = new Set();
  const nearestRoad = (x, z) => {
    let best = null;
    for (const r of pack.roads) { if (/^(footway|path|steps|cycleway)$/.test(r.k)) continue; const p = r.p;
      for (let i = 0; i + 3 < p.length; i += 2) { const ax = p[i], az = p[i + 1], dx = p[i + 2] - ax, dz = p[i + 3] - az, L = dx * dx + dz * dz; let tt = L ? ((x - ax) * dx + (z - az) * dz) / L : 0; tt = Math.max(0, Math.min(1, tt));
        const qx = ax + dx * tt, qz = az + dz * tt, d = Math.hypot(x - qx, z - qz); if (!best || d < best.d) best = { d, x: qx, z: qz, ang: Math.atan2(dz, dx), w: r.w }; } }
    return best;
  };
  const rect = (cx, cz, w, d, ang) => { const c = Math.cos(ang), s = Math.sin(ang), o = []; [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].forEach(([a, b]) => o.push(cx + a * c - b * s, cz + a * s + b * c)); return o; };
  const free = (p) => { for (let i = 0; i < p.length; i += 2) if (isOcc(p[i], p[i + 1])) return false; let x = 0, z = 0; for (let i = 0; i < p.length; i += 2) { x += p[i]; z += p[i + 1]; } return !isOcc(x / (p.length / 2), z / (p.length / 2)); };

  for (const o of pack.pois) {
    if (!o.in) continue;
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
        for (const [a, b] of [[-3, 0], [3, 0]]) { const c = Math.cos(-ang), s = Math.sin(-ang); addBox({ x: o.x + a * c + b * s, y: 1.3, z: o.z - a * s + b * c, w: 1.2, h: 2.6, d: 1.2, mesh: false }); }
        top = 9.5;
      } else if (o.k === "atm" || o.k === "water") {
        part(1.2, 2.4, 0.9, cat.c, o.x, 1.2, o.z, root); addBox({ x: o.x, y: 1.2, z: o.z, w: 1.2, h: 2.4, d: 1.2, mesh: false }); top = 2.6;
      } else {
        const big = o.k === "market" || o.k === "hospital" ? 1.6 : 1, w = 20 * big, d = 16 * big;
        let p = rect(o.x, o.z, w, d, ang);
        if (!free(p)) p = rect(o.x, o.z, w * 0.6, d * 0.6, ang);
        addBuilding(p, o.k === "hospital" ? 12 : 7, cat.wall, "#475569"); top = o.k === "hospital" ? 12 : 7; nGen++;
      }
    } else continue;
    const label = cat.e + " " + (o.n || t("cat_" + o.k));
    const key = o.k + Math.round(o.x / 30) + "_" + Math.round(o.z / 30);
    if (seenSign.has(key) || signs.length > 70) continue; seenSign.add(key);
    const sp = sign(label, cat.c, o.k === "market" || o.k === "hospital" || o.k === "police" || o.k === "fuel" || o.k === "pharmacy" ? 1 : 0.75);
    sp.position.set(o.x, top + 2.4, o.z); root.add(sp); signs.push(sp);
  }

  // ---------------------------------------------------------------- casas genéricas onde o OSM não tem prédios
  const RES = /^(residential|living_street|unclassified|tertiary)$/;
  const built = pack.blds.length, density = built / ((2 * pack.r * 2 * pack.r) / 1e4); // prédios por hectare
  if (density < 18) {
    for (const r of pack.roads) {
      if (!RES.test(r.k)) continue; const p = r.p;
      for (let i = 0; i + 3 < p.length; i += 2) {
        const ax = p[i], az = p[i + 1], dx = p[i + 2] - ax, dz = p[i + 3] - az, L = Math.hypot(dx, dz); if (L < 20) continue;
        const ux = dx / L, uz = dz / L, ang = Math.atan2(dz, dx);
        for (let s = 10; s < L - 10; s += 22 + rand() * 6) for (const side of [-1, 1]) {
          const wdt = 14 + rand() * 6, dep = 18 + rand() * 6, off = r.w / 2 + 5 + dep / 2;
          const cx = ax + ux * s - uz * off * side, cz = az + uz * s + ux * off * side;
          if (Math.abs(cx) > R - 8 || Math.abs(cz) > R - 8) continue;
          const q = rect(cx, cz, wdt, dep, ang); if (!free(q)) continue;
          addBuilding(q, rand() < 0.15 ? 12 : 6, HOUSE[Math.floor(rand() * HOUSE.length)], ROOF[Math.floor(rand() * ROOF.length)]); nGen++;
        }
      }
    }
  }
  const wallMat = new THREE.MeshLambertMaterial({ vertexColors: true, map: wallTex });
  if (wm.count) { const m = new THREE.Mesh(wm.build(), wallMat); m.castShadow = m.receiveShadow = true; root.add(m); }
  if (roofM.count) { const m = new THREE.Mesh(roofM.build(), new THREE.MeshLambertMaterial({ vertexColors: true })); m.castShadow = m.receiveShadow = true; root.add(m); }

  // ---------------------------------------------------------------- árvores leves nas áreas verdes (instanciadas)
  const trees = [];
  for (let k = 0; k < NG && trees.length < 260; k += 3) for (let i = 0; i < NG && trees.length < 260; i += 3) if (occ[k * NG + i] === 2 && rand() < 0.35) trees.push([i * GRID - R - 20 + GRID / 2, k * GRID - R - 20 + GRID / 2]);
  if (trees.length) {
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.4, 0.5, 4, 6), getMat("#8b5a2b"), trees.length);
    const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(3, 0), getMat("#15803d"), trees.length);
    const M = new THREE.Matrix4();
    trees.forEach(([x, z], j) => { M.makeTranslation(x, 2, z); trunk.setMatrixAt(j, M); M.makeTranslation(x, 5.5, z); crown.setMatrixAt(j, M); addBox({ x, y: 2, z, w: 0.9, h: 4, d: 0.9, mesh: false }); });
    crown.castShadow = true; root.add(trunk, crown);
  }

  // ---------------------------------------------------------------- rodovia de saída
  let exitMark = null;
  if (pack.exit) {
    const e = pack.exit, inA = Math.abs(e.x) < R && Math.abs(e.z) < R;
    const k = inA ? 1 : Math.min((R - 10) / Math.abs(e.x || 1e-6), (R - 10) / Math.abs(e.z || 1e-6));
    const px = inA ? e.x : e.x * Math.min(1, k), pz = inA ? e.z : e.z * Math.min(1, k);
    const g = new THREE.Group(); g.position.set(px, 0, pz); root.add(g);
    part(0.5, 10, 0.5, "#14532d", -3, 5, 0, g); part(0.5, 10, 0.5, "#14532d", 3, 5, 0, g);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 60, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.25, depthWrite: false }));
    beam.position.y = 30; g.add(beam);
    const label = "🛣️ " + t("exitSign") + (e.n ? " " + e.n : "") + (inA ? "" : " → " + fmtKm(e.d));
    const sp = sign(label, "#15803d", 1.3); sp.position.set(0, 12, 0); g.add(sp);
    exitMark = { x: px, z: pz, inA, g, beam };
  }

  // ---------------------------------------------------------------- ponto de partida: rua mais perto do local escolhido
  const u = pack.user || { x: 0, z: 0 };
  let spawn = { x: u.x, z: u.z };
  const rd = nearestRoad(u.x, u.z); if (rd) spawn = { x: rd.x, z: rd.z };
  if (Math.abs(spawn.x) > R - 4 || Math.abs(spawn.z) > R - 4) spawn = { x: 0, z: 0 };

  return {
    group: root, spawn: { x: spawn.x, y: 0.4, z: spawn.z }, exitMark, R,
    stats: { roads: pack.roads.length, real: nReal, gen: nGen, pois: pack.pois.filter((o) => o.in).length, boxes: nCol },
    update(dt) { if (exitMark) exitMark.beam.material.opacity = 0.18 + Math.sin(performance.now() / 400) * 0.08; },
    dispose() { root.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } }); S.remove(root); boxes.forEach((b) => phys.removeBox(b)); },
  };
}
export function fmtKm(m) { return m >= 1000 ? (m / 1000).toFixed(1).replace(".", ",") + " km" : Math.round(m / 10) * 10 + " m"; }

/** Mapa 2D (pré-visualização e minimapa). view = { cx, cz, scale (px por unidade), rot? , me? } */
export function drawMap(cv, pack, view = {}) {
  const c = cv.getContext("2d"), W = cv.width, H = cv.height, R = pack.r / U;
  const sc = view.scale || Math.min(W, H) / (2 * R * 1.05), cx = view.cx || 0, cz = view.cz || 0;
  c.save(); c.fillStyle = "#cfe3a8"; c.fillRect(0, 0, W, H); c.translate(W / 2, H / 2);
  if (view.rot) c.rotate(view.rot);
  c.scale(sc, sc); c.translate(-cx, -cz);
  const poly = (p, fill) => { c.beginPath(); for (let i = 0; i < p.length; i += 2) (i ? c.lineTo : c.moveTo).call(c, p[i], p[i + 1]); c.closePath(); c.fillStyle = fill; c.fill(); };
  for (const a of pack.areas) poly(a.p, a.k === "water" ? "#7dd3fc" : "#a3d977");
  c.lineCap = c.lineJoin = "round";
  for (const r of pack.roads) { c.beginPath(); for (let i = 0; i < r.p.length; i += 2) (i ? c.lineTo : c.moveTo).call(c, r.p[i], r.p[i + 1]); c.strokeStyle = /^(footway|path|cycleway|steps|pedestrian)$/.test(r.k) ? "#f5f5f4" : /^(motorway|trunk|primary)/.test(r.k) ? "#fbbf24" : "#ffffff"; c.lineWidth = Math.max(r.w, 2 / sc); c.stroke(); }
  for (const b of pack.blds) poly(b.p, b.k ? CATS[b.k].c : "#a8a29e");
  c.strokeStyle = "rgba(15,23,42,.6)"; c.lineWidth = 2 / sc; c.setLineDash([8 / sc, 6 / sc]); c.strokeRect(-R, -R, 2 * R, 2 * R); c.setLineDash([]);
  c.restore();
  // ícones (sem girar o texto)
  const toPx = (x, z) => { let dx = (x - cx) * sc, dz = (z - cz) * sc; if (view.rot) { const s = Math.sin(view.rot), co = Math.cos(view.rot); [dx, dz] = [dx * co - dz * s, dx * s + dz * co]; } return [W / 2 + dx, H / 2 + dz]; };
  c.textAlign = "center"; c.textBaseline = "middle"; c.font = `${Math.max(11, Math.min(18, W / 22))}px system-ui, sans-serif`;
  for (const o of pack.pois) { const [x, y] = toPx(o.x, o.z); if (x < -10 || y < -10 || x > W + 10 || y > H + 10) continue; c.fillText(CATS[o.k].e, x, y); }
  if (pack.exit) {
    let [x, y] = toPx(pack.exit.x, pack.exit.z); const out = x < 8 || y < 8 || x > W - 8 || y > H - 8;
    if (out) { const dx = x - W / 2, dy = y - H / 2, k = Math.min((W / 2 - 14) / Math.abs(dx || 1e-6), (H / 2 - 14) / Math.abs(dy || 1e-6)); x = W / 2 + dx * k; y = H / 2 + dy * k; }
    c.fillText("🛣️", x, y);
  }
  if (view.me) { const [x, y] = toPx(view.me.x, view.me.z); c.fillStyle = "#ef4444"; c.strokeStyle = "#fff"; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 6, 0, Math.PI * 2); c.fill(); c.stroke(); }
  else if (pack.user) { const [x, y] = toPx(pack.user.x, pack.user.z); c.fillText("📍", x, y - 8); }
}
export { dirOf };
