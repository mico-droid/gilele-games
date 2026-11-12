// Bairro-modelo genérico (sem cidade real): grade 3×3 de quarteirões, avenida com semáforos, rua de mão única,
// rotatória, ladeira com semáforo e PARE no topo, rua da escola (30 km/h, lombada, faixa de pedestre, ponto de ônibus),
// vagas paralelas na Rua do Comércio e uma estrada de pista simples para ultrapassagem.
import { THREE, part, getMat } from "../../engine/ez.js";

export const XS = [-150, -50, 50, 150], ZS = [-150, -50, 50, 150];
/** Terrain: a hill on the west side (plateau 9 m at x ≤ -140, flat at x ≥ -60). */
export const height = (x, z) => 9 * Math.min(1, Math.max(0, (-60 - x) / 80));
export const RB = { node: "n22", r: 15 }; // roundabout at (50, 50)

const VNAME = ["Rua do Morro", "Rua Goiás", "Rua Sete", "Rua das Flores"];
const HNAME = ["Rua do Comércio", "Av. Brasil", "Rua das Palmeiras", "Rua da Escola"];

export function buildMapDef() {
  const nodes = {}, edges = [];
  const id = (i, j) => "n" + i + j;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) nodes[id(i, j)] = { x: XS[i], z: ZS[j] };
  // vertical streets (along z): i = column
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
    const e = { id: "v" + i + j, a: id(i, j), b: id(i, j + 1), lanes: [1, 1], speed: 40, name: VNAME[i] };
    if (i === 3) { e.lanes = [2, 0]; e.name = VNAME[3]; } // one-way northbound (+z)
    edges.push(e);
  }
  // horizontal streets (along x): j = row
  for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) {
    const e = { id: "h" + i + j, a: id(i, j), b: id(i + 1, j), lanes: [1, 1], speed: 40, name: HNAME[j] };
    if (j === 1) { e.lanes = [2, 2]; e.speed = 60; e.center = "double"; }
    if (j === 3) { e.speed = 30; e.school = true; if (i === 1) { e.bumps = [40]; e.crosswalks = [62]; e.busStops = [78]; } }
    if (j === 0 && i === 1) e.parking = { side: 1, from: 18, to: 78 }; // right side going +x → south curb
    if (j === 2 && i === 0) e.center = "double"; // ladeira: no overtaking
    edges.push(e);
  }
  // signals on the avenue
  ["n01", "n11", "n21", "n31"].forEach((n) => (nodes[n].signal = true));
  // roundabout
  nodes[RB.node].roundabout = RB.r;
  // PARE: minor streets crossing Rua das Palmeiras (row 2) and at the T-junctions of the border streets
  nodes.n12.stop = ["v11", "v12"];
  nodes.n02.stop = ["h02"]; // top of the hill: climbing street must stop
  nodes.n32.stop = ["h22"];
  nodes.n13.stop = ["v12"]; nodes.n23.stop = ["v22"];
  nodes.n10.stop = ["v10"]; nodes.n20.stop = ["v20"];
  // country road to the east (single carriageway, overtaking scenario)
  nodes.r1 = { x: 300, z: -50, crosswalk: false }; nodes.r2 = { x: 390, z: -50, crosswalk: false }; nodes.r3 = { x: 620, z: -50, crosswalk: false };
  edges.push({ id: "e1", a: "n31", b: "r1", lanes: [1, 1], speed: 60, name: "Estrada Velha" });
  edges.push({ id: "e2", a: "r1", b: "r2", lanes: [1, 1], speed: 60, center: "double" });
  edges.push({ id: "e3", a: "r2", b: "r3", lanes: [1, 1], speed: 60 });
  // blocks
  const half = (e) => (e.lanes[1] > 0 ? Math.max(e.lanes[0], e.lanes[1]) * 3.3 + (e.parking ? 2.4 : 0) : e.lanes[0] * 1.65);
  const hv = (i) => half(edges.find((e) => e.id === "v" + i + "0"));
  const hh = (j, i = 0) => { const e = edges.find((q) => q.id === "h" + i + j); return half(e) + (e.parking ? 0 : 0); };
  const blocks = [];
  const rbChamfer = (poly) => { // cut block corners that overlap the roundabout
    const cx = XS[2], cz = ZS[2], R = RB.r + 0.6, out = [];
    for (let k = 0; k < poly.length; k++) {
      const p = poly[k];
      if (Math.hypot(p[0] - cx, p[1] - cz) > R) { out.push(p); continue; }
      const prev = poly[(k + poly.length - 1) % poly.length], next = poly[(k + 1) % poly.length];
      const cut = (a) => { // point on segment p→a at distance R from center
        const dx = a[0] - p[0], dz = a[1] - p[1]; let lo = 0, hi = 1;
        for (let it = 0; it < 30; it++) { const m = (lo + hi) / 2; if (Math.hypot(p[0] + dx * m - cx, p[1] + dz * m - cz) < R) lo = m; else hi = m; }
        return [p[0] + dx * hi, p[1] + dz * hi];
      };
      const c1 = cut(prev), c2 = cut(next);
      let a1 = Math.atan2(c1[1] - cz, c1[0] - cx), a2 = Math.atan2(c2[1] - cz, c2[0] - cx);
      let d = a2 - a1; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      out.push(c1); for (let s = 1; s < 6; s++) { const a = a1 + (d * s) / 6; out.push([cx + Math.cos(a) * R, cz + Math.sin(a) * R]); } out.push(c2);
    }
    return out;
  };
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const x0 = XS[i] + hv(i), x1 = XS[i + 1] - hv(i + 1);
    const hb = edges.find((e) => e.id === "h" + i + j), ht = edges.find((e) => e.id === "h" + i + (j + 1));
    const z0 = ZS[j] + (hb.parking ? hb.lanes[0] * 3.3 + 2.4 : half(hb)), z1 = ZS[j + 1] - half(ht);
    let poly = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
    if ((i === 1 || i === 2) && (j === 1 || j === 2)) poly = rbChamfer(poly);
    blocks.push({ poly, cell: [i, j] });
  }
  // outer strips (sidewalk on the far side of the border streets)
  const D = 16, X0 = XS[0] - hv(0), X1 = XS[3] + hv(3), Z0 = ZS[0] - hh(0), Z1 = ZS[3] + hh(3);
  blocks.push({ rect: [X0 - D, Z1, X1 + D, Z1 + D], outer: "n" });
  blocks.push({ rect: [X0 - D, Z0 - D, X1 + D, Z0], outer: "s" });
  blocks.push({ rect: [X0 - D, Z0, X0, Z1], outer: "w" });
  const av = hh(1);
  blocks.push({ rect: [X1, Z0, X1 + D, ZS[1] - av], outer: "e" });
  blocks.push({ rect: [X1, ZS[1] + av, X1 + D, Z1], outer: "e" });
  // roundabout island
  blocks.push({ circle: [XS[2], ZS[2], RB.r - 7.5], sw: 0.6, lot: "#4ade80", island: true });
  return { height, nodes, edges, blocks, sidewalk: 2.6, groundSize: 1500 };
}

// ------------------------------------------------------------------ scenery (houses, shops, school, trees)
const WALLS = ["#fde68a", "#fecaca", "#bfdbfe", "#bbf7d0", "#e9d5ff", "#fed7aa", "#f5f5f4", "#fca5a5", "#a5f3fc"];
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
function house(world, phys, road, x, z, w, d, h, ry, col, label) {
  const y0 = Math.min(road.height(x - w / 2, z), road.height(x + w / 2, z)) + 0.1;
  const g = new THREE.Group(); g.position.set(x, y0, z); g.rotation.y = ry; world.scene.add(g);
  part(w, h + 0.4, d, col, 0, (h + 0.4) / 2 - 0.4, 0, g);
  part(w + 0.3, 0.3, d + 0.3, "#9a3412", 0, h, 0, g); // roof slab
  part(1.1, 2.1, 0.06, "#7c2d12", 0, 1.05, d / 2 + 0.02, g, false);
  for (let k = -1; k <= 1; k += 2) part(1.2, 1, 0.06, "#1e3a8a", k * w * 0.28, 1.7, d / 2 + 0.02, g, false);
  if (h > 6) for (let k = -1; k <= 1; k += 2) part(1.2, 1, 0.06, "#1e3a8a", k * w * 0.28, 4.6, d / 2 + 0.02, g, false);
  if (label) {
    const cv = document.createElement("canvas"); cv.width = 512; cv.height = 96; const c = cv.getContext("2d");
    c.fillStyle = "#1f2937"; c.fillRect(0, 0, 512, 96); c.fillStyle = "#fde047"; c.font = "700 54px Fredoka, system-ui"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(label, 256, 52);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w - 0.4, 6), 1.1), new THREE.MeshLambertMaterial({ map: t })); m.position.set(0, Math.min(h - 0.6, 3.2), d / 2 + 0.05); g.add(m);
  }
  // collision box (axis aligned: houses are placed with ry multiple of 90°)
  const rot = Math.abs(Math.sin(ry)) > 0.5, W = rot ? d : w, Dd = rot ? w : d;
  phys.addBox({ x, y: y0 + h / 2, z, w: W, h: h + 2, d: Dd, mesh: false, building: true });
  return g;
}
function tree(world, phys, road, x, z, s = 1) {
  const y = road.groundAt(x, z).y, g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); world.scene.add(g);
  part(0.35, 2.2, 0.35, "#8b5a2b", 0, 1.1, 0, g); part(2.2, 1.8, 2.2, "#16a34a", 0, 3.0, 0, g); part(1.4, 1.0, 1.4, "#22c55e", 0, 4.2, 0, g);
  phys.addBox({ x, y: y + 1.1, z, w: 0.4, h: 2.2, d: 0.4, mesh: false });
}
export function decorate(world, phys, road) {
  seed = 7;
  const SW = 2.6;
  for (const b of road.blocks) {
    const bd = b.data;
    if (bd.island) { tree(world, phys, road, XS[2], ZS[2], 1.3); continue; }
    const [x0, z0, x1, z1] = b.bb;
    if (bd.outer) {
      // a row of houses along the strip, facing the street
      const along = bd.outer === "n" || bd.outer === "s";
      const L = along ? x1 - x0 : z1 - z0, n = Math.floor(L / 14);
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n;
        if (along) { const x = x0 + L * t, z = bd.outer === "n" ? z0 + SW + 5 : z1 - SW - 5; if (Math.abs(x - 300) < 20) continue; house(world, phys, road, x, z, 9, 7, 3.4 + rnd() * 4, bd.outer === "n" ? Math.PI : 0, WALLS[k % WALLS.length]); }
        else { const z = z0 + L * t, x = bd.outer === "w" ? x0 + 8 : x1 - SW - 5 + 0.5; house(world, phys, road, x, z, 9, 7, 3.4 + rnd() * 3, bd.outer === "w" ? -Math.PI / 2 : Math.PI / 2, WALLS[(k + 3) % WALLS.length]); }
      }
      continue;
    }
    const [ci, cj] = bd.cell;
    // houses along the 4 sides, inset from the sidewalk
    const sides = [
      { x: (x0 + x1) / 2, z: z0 + SW + 4.5, len: x1 - x0, ry: Math.PI, ax: "x" }, // south side faces -z
      { x: (x0 + x1) / 2, z: z1 - SW - 4.5, len: x1 - x0, ry: 0, ax: "x" },
      { x: x0 + SW + 4.5, z: (z0 + z1) / 2, len: z1 - z0, ry: -Math.PI / 2, ax: "z" },
      { x: x1 - SW - 4.5, z: (z0 + z1) / 2, len: z1 - z0, ry: Math.PI / 2, ax: "z" },
    ];
    const school = ci === 1 && cj === 2;
    sides.forEach((s, si) => {
      const n = Math.max(1, Math.floor((s.len - 28) / 13));
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n - 0.5, off = t * (s.len - 30);
        const x = s.ax === "x" ? s.x + off : s.x, z = s.ax === "z" ? s.z + off : s.z;
        if (!road.blocks.find((q) => q === b) || road.groundAt(x, z).block !== b) continue;
        if (school && si === 1) continue;
        const shop = cj === 0 && si === 0 && k % 2 === 0 ? ["Padaria", "Mercado", "Farmácia", "Lanchonete"][k % 4] : null;
        house(world, phys, road, x, z, 9, 7, shop ? 4 : 3.2 + rnd() * 4.5, s.ry, WALLS[(ci * 3 + cj + k + si) % WALLS.length], shop);
      }
    });
    if (school) house(world, phys, road, (x0 + x1) / 2, z1 - SW - 7, 34, 10, 6.5, 0, "#fef08a", "ESCOLA");
    // sidewalk trees
    const per = [[x0 + 1.2, z0 + 1.2], [x1 - 1.2, z0 + 1.2], [x0 + 1.2, z1 - 1.2], [x1 - 1.2, z1 - 1.2]];
    for (const [tx, tz] of per) if (road.groundAt(tx, tz).block === b && rnd() < 0.6) tree(world, phys, road, tx + (tx < (x0 + x1) / 2 ? 10 : -10), tz, 0.8);
  }
  // bus shelter on Rua da Escola
  const e = road.E.h13, p = road.toWorld(e, 78, e.uMax + 1.4), y = road.groundAt(p[0], p[1]).y;
  const g = new THREE.Group(); g.position.set(p[0], y, p[1]); world.scene.add(g);
  part(4, 0.12, 1.6, "#0f766e", 0, 2.5, 0, g); part(0.1, 2.5, 0.1, "#334155", -1.9, 1.25, 0.7, g); part(0.1, 2.5, 0.1, "#334155", 1.9, 1.25, 0.7, g); part(3.6, 0.1, 0.4, "#78350f", 0, 0.5, 0.4, g);
  // road end barrier on the country road
  const r3 = road.nodes.r3; part(1, 1.2, 8, "#ef4444", r3.x - 6, road.height(r3.x, r3.z) + 0.6, r3.z, world.scene);
  phys.addBox({ x: r3.x - 6, y: 0.6, z: r3.z, w: 1, h: 1.2, d: 8, mesh: false });
  // fields along the country road
  for (let x = 200; x < 600; x += 22) { tree(world, phys, road, x, -50 - 14 - rnd() * 20, 1); tree(world, phys, road, x + 9, -50 + 14 + rnd() * 20, 1); }
}
