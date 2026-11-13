// Bairro genérico de Goiânia (grade plana, avenidas largas) para o Capítulo 1 do Apagão Real.
// Tudo de caixas (estilo Roblox). Coordenadas: rua sul em z=24, rua norte em z=-24, ruas em x=±24.
import { THREE, getMat, part, addGround, addTree, addLabel, Character, randomLook, t } from "../../engine/ez.js";

export const HOME = { x: 0, z: 10, w: 12, d: 12 };          // sua casa (porta virada para +z)
export const BED = { x: 3.6, z: 13.6 };
export const ZONES = {
  market: { x: 0, z: 33, r: 9 },
  square: { x: -48, z: 48, r: 12 },
};

export function buildCity(world, phys) {
  const S = world.scene;
  const lit = [];                       // janelas e postes que apagam no apagão
  const winOn = getMat("#fde68a", 0.9), winOff = getMat("#1e293b");
  const lampOn = getMat("#fef9c3", 1.2), lampOff = getMat("#475569");

  addGround(world, phys, { size: 180, color: 0x9bbf63 });
  // limites invisíveis
  [[0, -88, 180, 2], [0, 88, 180, 2], [-88, 0, 2, 180], [88, 0, 2, 180]].forEach(([x, z, w, d]) => phys.addBox({ x, y: 3, z, w, h: 8, d, mesh: false }));

  // ruas (só visual; o chão já colide)
  const road = (x, z, w, d) => { const m = part(w, 0.04, d, "#3f3f46", x, 0.02, z, S, false); m.receiveShadow = true; };
  const dash = (x, z, w, d) => part(w, 0.05, d, "#facc15", x, 0.03, z, S, false);
  [-24, 24, -72, 72].forEach((c) => { road(0, c, 180, 8); road(c, 0, 8, 180); });
  for (let i = -84; i < 84; i += 6) [-24, 24].forEach((c) => { dash(i, c, 2.4, 0.2); dash(c, i, 0.2, 2.4); });
  // calçadas nas ruas principais
  [-24, 24].forEach((c) => { [c - 5, c + 5].forEach((s) => { part(180, 0.12, 2, "#d6d3d1", 0, 0.06, s, S, false); part(2, 0.12, 180, "#d6d3d1", s, 0.06, 0, S, false); }); });

  // postes de luz
  for (let i = -66; i <= 66; i += 22) [[i, -18.6], [i, 29.4], [-18.6, i], [29.4, i]].forEach(([x, z]) => {
    part(0.25, 5, 0.25, "#64748b", x, 2.5, z, S);
    const head = part(0.9, 0.3, 0.5, "#64748b", x, 5.1, z, S); head.material = lampOn; lit.push({ m: head, on: lampOn, off: lampOff });
  });

  /** Prédio/casa fechada com janelas que acendem. */
  function building(x, z, w, d, h, color, { roof = "#9a3412", face = "+z", windows = true } = {}) {
    phys.addBox({ x, y: h / 2, z, w, h, d, color, scene: S });
    part(w + 0.6, 0.4, d + 0.6, roof, x, h + 0.2, z, S);
    if (!windows) return;
    const floors = Math.max(1, Math.floor(h / 3));
    for (let f = 0; f < floors; f++) {
      const y = 1.6 + f * 3;
      const n = Math.max(1, Math.floor(w / 3));
      for (let i = 0; i < n; i++) {
        const wx = x - w / 2 + (i + 0.5) * (w / n);
        [z + d / 2 + 0.05, z - d / 2 - 0.05].forEach((wz) => { const m = part(1.2, 1.1, 0.1, "#fde68a", wx, y, wz, S, false); m.material = winOn; lit.push({ m, on: winOn, off: winOff }); });
      }
    }
  }

  // ---------------------------------------------------------------- sua casa (dá para entrar)
  const H = HOME, x0 = H.x - H.w / 2, x1 = H.x + H.w / 2, z0 = H.z - H.d / 2, z1 = H.z + H.d / 2, WH = 3, T = 0.3;
  const wall = (x, z, w, d, c = "#fef3c7") => phys.addBox({ x, y: WH / 2, z, w, h: WH, d, color: c, scene: S });
  part(H.w, 0.06, H.d, "#e7e5e4", H.x, 0.03, H.z, S, false);                  // piso
  wall(H.x, z0, H.w, T); wall(x0, H.z, T, H.d); wall(x1, H.z, T, H.d);         // fundos e laterais
  wall(x0 + (H.w / 2 - 1.3) / 2, z1, H.w / 2 - 1.3, T); wall(x1 - (H.w / 2 - 1.3) / 2, z1, H.w / 2 - 1.3, T); // frente com porta
  part(2.6, 0.6, T, "#fef3c7", H.x, WH - 0.3, z1, S);                           // verga da porta
  // andares de cima do prédio (somem quando você está dentro do apartamento)
  const roof = new THREE.Group(); S.add(roof);
  const FL = 3;
  for (let f = 1; f <= FL; f++) {
    const y = WH + (f - 1) * 3;
    part(H.w + 4, 0.3, H.d + 1, "#cbd5e1", H.x - 1.5, y + 0.15, H.z, roof);
    part(H.w + 4, 2.7, H.d + 1, "#e2e8f0", H.x - 1.5, y + 1.65, H.z, roof);
    for (let i = 0; i < 4; i++) [H.z + H.d / 2 + 0.55, H.z - H.d / 2 - 0.55].forEach((wz) => { const m = part(1.6, 1.2, 0.1, "#fde68a", H.x - 6 + i * 4, y + 1.7, wz, roof, false); m.material = winOn; lit.push({ m, on: winOn, off: winOff }); });
    part(H.w + 5, 0.2, 1.2, "#94a3b8", H.x - 1.5, y + 0.2, H.z + H.d / 2 + 1, roof); // varandas
  }
  part(H.w + 4.4, 0.4, H.d + 1.4, "#64748b", H.x - 1.5, WH + FL * 3 + 0.2, H.z, roof);
  part(3, 1.6, 3, "#60a5fa", H.x + 2, WH + FL * 3 + 1.2, H.z - 2, roof);           // caixa d'água do prédio
  // hall do prédio (lado oeste): elevador e escada
  phys.addBox({ x: x0 - 1.5, y: 1.5, z: H.z, w: 3, h: 3, d: H.d, color: "#e2e8f0", scene: S });
  part(1.4, 2.4, 0.1, "#94a3b8", x0 - 1.5, 1.2, z1 + 0.06, S);                     // porta do elevador
  part(0.15, 2.4, 0.12, "#475569", x0 - 1.5, 1.2, z1 + 0.08, S);
  const elevLamp = part(0.3, 0.3, 0.1, "#22c55e", x0 - 1.5, 2.6, z1 + 0.1, S, false); elevLamp.material = getMat("#22c55e", 1.2); lit.push({ m: elevLamp, on: elevLamp.material, off: winOff });
  // móveis
  const furn = (w, h, d, c, x, z) => phys.addBox({ x, y: h / 2, z, w, h, d, color: c, scene: S });
  furn(1.4, 2.2, 1.2, "#f8fafc", x0 + 1, z0 + 1);                               // geladeira
  furn(2.4, 1, 1, "#a16207", x0 + 3.4, z0 + 0.7);                               // armário
  furn(1.6, 1, 1, "#94a3b8", H.x + 0.2, z0 + 0.7);                              // pia
  furn(1.4, 1, 1, "#e5e7eb", H.x + 2.2, z0 + 0.7);                              // fogão
  part(1.2, 0.05, 0.8, "#111827", H.x + 2.2, 1.03, z0 + 0.7, S);
  furn(2.2, 0.6, 3.2, "#3b82f6", BED.x, BED.z);                                 // cama
  part(2.2, 0.25, 0.8, "#ffffff", BED.x, 0.72, BED.z - 1.1, S);
  furn(0.8, 2, 2.2, "#78350f", x0 + 0.6, H.z + 1);                              // estante
  furn(0.9, 0.7, 0.9, "#0ea5e9", x0 + 1.2, z1 - 1.6); furn(0.9, 0.7, 0.9, "#0284c7", x0 + 2.3, z1 - 1.6); // baldes
  const homeWin = [];
  [[x0 - 0.05, H.z - 2, 0.1, 1.4], [x1 + 0.05, H.z - 2, 0.1, 1.4], [x1 + 0.05, H.z + 3, 0.1, 1.4]].forEach(([x, z, w, d]) => { const m = part(w, 1, d, "#fde68a", x, 1.7, z, S, false); m.material = winOn; lit.push({ m, on: winOn, off: winOff }); homeWin.push(m); });
  // carro na garagem (lado leste)
  const car = new THREE.Group(); car.position.set(9.5, 0, 12); S.add(car);
  part(2.2, 0.9, 4.2, "#dc2626", 0, 0.75, 0, car); part(1.9, 0.7, 2.2, "#bae6fd", 0, 1.5, -0.2, car);
  [[-1.1, -1.4], [1.1, -1.4], [-1.1, 1.4], [1.1, 1.4]].forEach(([a, b]) => part(0.3, 0.7, 0.7, "#111827", a, 0.35, b, car));
  phys.addBox({ x: 9.5, y: 0.9, z: 12, w: 2.2, h: 1.8, d: 4.2, mesh: false });
  part(12, 0.08, 3, "#a8a29e", 9.5, 0.04, 20, S, false); // calçada da garagem
  part(3, 0.05, 5.4, "#facc15", 9.5, 0.03, 12, S, false); part(2.6, 0.06, 5, "#57534e", 9.5, 0.035, 12, S, false); // vaga
  // quintal (atrás da casa) com fogareiro
  part(1, 0.6, 1, "#57534e", H.x, 0.3, z0 - 2.5, S); part(0.7, 0.08, 0.7, "#111827", H.x, 0.64, z0 - 2.5, S);
  for (let i = -6; i <= 6; i += 1.5) part(0.15, 1, 0.15, "#a16207", H.x + i, 0.5, z0 - 5.5, S);

  // vizinhos no mesmo quarteirão
  building(-15, 10, 6, 10, 9, "#bbf7d0");        // prédio do Seu Zé
  building(14, -2, 7, 8, 3.2, "#fbcfe8");        // Dona Cida (a garagem do seu carro fica entre as casas)
  building(-8, -12, 10, 8, 3.2, "#e9d5ff");      // Seu Valdir
  part(4, 2.6, 0.2, "#6b7280", -8, 1.3, -16.1, S); // portão da garagem do Valdir
  building(10, -14, 8, 8, 3.2, "#fed7aa");
  const homeLabel = addLabel(world, "🏢 " + t("l_building"), H.x, WH + 11.5, H.z, { color: "#fde047" });

  // ---------------------------------------------------------------- comércio e serviços
  building(0, 46, 26, 16, 6, "#f1f5f9", { roof: "#16a34a" });                     // mercado
  part(6, 3, 0.2, "#0f172a", 0, 1.5, 37.95, S); part(10, 1.4, 0.3, "#16a34a", 0, 5.2, 37.9, S);
  building(40, 38, 10, 8, 4, "#ecfeff", { roof: "#0d9488" });                     // farmácia
  part(2.4, 2.6, 0.2, "#0f172a", 40, 1.3, 33.95, S);
  phys.addBox({ x: 0, y: 1.6, z: -32, w: 4, h: 3.2, d: 3, color: "#1d4ed8", scene: S });   // banco 24h
  const atmScr = part(1.2, 0.9, 0.1, "#38bdf8", 0, 1.7, -30.45, S, false); atmScr.material = getMat("#38bdf8", 1); lit.push({ m: atmScr, on: atmScr.material, off: winOff });
  // posto
  [[-52, -46], [-40, -46], [-52, -34], [-40, -34]].forEach(([x, z]) => part(0.5, 5, 0.5, "#e5e7eb", x, 2.5, z, S));
  part(14, 0.5, 14, "#dc2626", -46, 5.2, -40, S);
  [[-49, -40], [-43, -40]].forEach(([x, z]) => { phys.addBox({ x, y: 0.9, z, w: 1, h: 1.8, d: 0.8, color: "#f8fafc", scene: S }); const d = part(0.6, 0.4, 0.1, "#22c55e", x, 1.3, z + 0.42, S, false); d.material = getMat("#22c55e", 1); lit.push({ m: d, on: d.material, off: winOff }); });
  building(-46, -56, 12, 6, 3.5, "#fef2f2", { roof: "#dc2626" });
  // torre de celular
  const tower = new THREE.Group(); tower.position.set(48, 0, -50); S.add(tower);
  for (let y = 0; y < 28; y += 4) { part(0.25, 4, 0.25, "#94a3b8", -1, y + 2, -1, tower); part(0.25, 4, 0.25, "#94a3b8", 1, y + 2, 1, tower); part(0.25, 4, 0.25, "#94a3b8", -1, y + 2, 1, tower); part(0.25, 4, 0.25, "#94a3b8", 1, y + 2, -1, tower); part(2.2, 0.15, 2.2, "#94a3b8", 0, y + 4, 0, tower); }
  const tl = part(0.6, 0.6, 0.6, "#ef4444", 0, 28.6, 0, tower); tl.material = getMat("#ef4444", 1.5);
  part(3, 2.4, 2, "#cbd5e1", 3, 1.2, 0, tower);
  phys.addBox({ x: 48, y: 2, z: -50, w: 2.5, h: 4, d: 2.5, mesh: false });
  // hospital
  building(-52, 6, 16, 20, 9, "#f8fafc", { roof: "#1d4ed8" });
  part(0.2, 2.4, 0.8, "#ef4444", -43.85, 7, 6, S); part(0.2, 0.8, 2.4, "#ef4444", -43.85, 7, 6, S);
  // ponto de ônibus + ônibus parado
  part(3, 0.15, 1.4, "#334155", 30.5, 2.6, -4, S); part(0.15, 2.6, 0.15, "#334155", 29.2, 1.3, -4.5, S); part(0.15, 2.6, 0.15, "#334155", 31.8, 1.3, -4.5, S);
  phys.addBox({ x: 27, y: 1.6, z: 8, w: 2.8, h: 3.2, d: 11, color: "#facc15", scene: S });
  // praça
  part(26, 0.1, 26, "#86efac", -48, 0.05, 48, S, false);
  part(4, 1, 4, "#a8a29e", -48, 0.5, 48, S); part(1, 2.4, 1, "#a8a29e", -48, 1.7, 48, S);
  [[-56, 42], [-40, 42], [-56, 54], [-40, 54]].forEach(([x, z]) => { part(3, 0.4, 1, "#92400e", x, 0.5, z, S); });
  [[-58, 38], [-38, 38], [-58, 58], [-38, 58], [-50, 58], [-46, 38]].forEach(([x, z]) => addTree(world, phys, x, z, 1.1));

  // quarteirões de enchimento
  const fill = [[-46, -10, "#fde68a"], [46, 6, "#c7d2fe"], [46, 54, "#fecaca"], [60, -40, "#d9f99d"], [0, -50, "#e0e7ff"], [14, -54, "#fae8ff"], [-14, -54, "#cffafe"], [46, -10, "#fef9c3"], [-16, 62, "#e2e8f0"], [14, 60, "#fee2e2"], [60, 40, "#dcfce7"]];
  fill.forEach(([x, z, c], i) => building(x, z, 10, 9, i % 4 === 0 ? 9 : 3.4, c, { roof: i % 2 ? "#7c2d12" : "#475569" }));
  [[-18, 21], [18, 21], [-18, -21], [18, -21], [-30, 30], [30, 30], [-30, -30], [30, -30], [6, -30], [-6, 30], [36, -18], [-36, 18]].forEach(([x, z]) => addTree(world, phys, x, z, 0.9));

  // placas
  addLabel(world, t("l_market"), 0, 7.4, 37.6, { color: "#bbf7d0" });
  addLabel(world, t("l_pharma"), 40, 5.4, 33.6, { color: "#99f6e4" });
  addLabel(world, t("l_bank"), 0, 4, -30.4, { color: "#bfdbfe" });
  addLabel(world, t("l_gas"), -46, 6.4, -33, { color: "#fecaca" });
  addLabel(world, "🏥 " + t("i_hospital"), -43, 10.5, 6, { color: "#fecaca" });

  addLabel(world, "🌳 " + t("l_square"), -48, 5, 48, { color: "#bbf7d0" });

  // ---------------------------------------------------------------- vizinhos (NPCs parados)
  const npc = (name, x, z, rot, look) => {
    const ch = new Character(S, Object.assign(randomLook(name), look || {}), { kind: "remote" });
    ch.root.position.set(x, 0, z); ch.root.rotation.y = rot; return ch;
  };
  const npcs = {
    ze: npc("Seu Zé", -15, 16.4, 0, { h: "short", hc: "#e5e7eb", g: "m", a: "hat" }),
    cida: npc("Dona Cida", 14, 3, 0, { g: "f", h: "bob", hc: "#a0673f" }),
    valdir: npc("Seu Valdir", -5, -17.4, Math.PI, { g: "m", h: "short", hc: "#1f1a17", a: "cap" }),
  };
  // gerador do Valdir (aparece no evento)
  const gen = new THREE.Group(); gen.position.set(-8, 0, -14.5); gen.visible = false; S.add(gen);
  part(1.2, 0.9, 0.8, "#f59e0b", 0, 0.45, 0, gen); part(0.2, 0.5, 0.2, "#111827", 0.4, 1.1, 0, gen);

  let power = true;
  return {
    roof, npcs, gen, tower, towerLight: tl, homeLabel,
    setPower(on) { power = on; for (const l of lit) l.m.material = on ? l.on : l.off; },
    get power() { return power; },
    setTowerLight(on) { tl.visible = on; },
    /** Esconde o telhado quando o jogador está dentro de casa. */
    insideHome(x, z) { return x > x0 && x < x1 && z > z0 && z < z1; },
  };
}
