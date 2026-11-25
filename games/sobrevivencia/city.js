// Bairro genérico de Goiânia (grade plana, avenidas largas) para o Capítulo 1 do Apagão Real.
// Tudo de caixas (estilo Roblox). Coordenadas: rua sul em z=24, rua norte em z=-24, ruas em x=±24.
import { THREE, getMat, part, addGround, addTree, addLabel, Character, randomLook, t, createScenery } from "../../engine/ez.js";

export const HOME = { x: 0, z: 10, w: 12, d: 12 };          // sua casa (porta virada para +z)
export const BED = { x: 3.6, z: 13.6 };
export const ZONES = {
  market: { x: 0, z: 33, r: 9 },
  square: { x: -48, z: 48, r: 12 },
};

/**
 * opt.homeOnly: só o quarteirão de casa (prédio, vizinhos, garagem, torre) — o resto vem do mapa real (osmcity.js).
 */
/** Ruas do bairro: centros das pistas (±24, ±72) e meia-largura útil (pista 8 + folga). */
const STREETS = [-72, -24, 24, 72], LANE = 4.6;
/** true = este ponto cai na pista de alguma rua (não pode haver casa, poste, árvore nem muro aí). */
export function onStreet(x, z, pad = 0) {
  return STREETS.some((c) => Math.abs(x - c) < LANE + pad) || STREETS.some((c) => Math.abs(z - c) < LANE + pad);
}

export function buildCity(world, phys, opt = {}) {
  const homeOnly = !!opt.homeOnly;
  const S = world.scene;
  const lit = [];                       // janelas e postes que apagam no apagão
  const winOn = getMat("#fde68a", 0.9), winOff = getMat("#1e293b");
  const lampOn = getMat("#fef9c3", 1.2), lampOff = getMat("#475569");

  const sc = createScenery(world, phys);
  if (!homeOnly) {
    sc.ground({ size: 420, color: 0x8fbf5e, amp: 0.26 });
    sc.hills({ radius: 190, count: 12, height: 16, color: 0x6a9e4e });
    sc.birds({ n: 6, y: 34, r: 70 });
    sc.autoUpdate();
    // limites invisíveis
    [[0, -88, 180, 2], [0, 88, 180, 2], [-88, 0, 2, 180], [88, 0, 2, 180]].forEach(([x, z, w, d]) => phys.addBox({ x, y: 3, z, w, h: 8, d, mesh: false }));

    // ruas (só visual; o chão já colide)
    const road = (x, z, w, d) => { const m = part(w, 0.04, d, "#3f3f46", x, 0.02, z, S, false); m.receiveShadow = true; };
    const dash = (x, z, w, d) => part(w, 0.05, d, "#facc15", x, 0.03, z, S, false);
    [-24, 24, -72, 72].forEach((c) => { road(0, c, 180, 8); road(c, 0, 8, 180); });
    for (let i = -84; i < 84; i += 6) [-24, 24].forEach((c) => { dash(i, c, 2.4, 0.2); dash(c, i, 0.2, 2.4); });
    // calçadas nas ruas principais
    [-24, 24].forEach((c) => { [c - 5, c + 5].forEach((s) => { part(180, 0.12, 2, "#d6d3d1", 0, 0.06, s, S, false); part(2, 0.12, 180, "#d6d3d1", s, 0.06, 0, S, false); }); });

    // postes de luz — NUNCA dentro da pista (o dono achou poste no meio da rua, 25/11/2026).
    // As ruas ficam centradas em ±24 e ±72, com 8 de largura; a calçada vai até 5 do centro.
    for (let i = -66; i <= 66; i += 22) [[i, -18.6], [i, 29.4], [-18.6, i], [29.4, i]].forEach(([x, z]) => {
      if (onStreet(x, z)) return;
      part(0.25, 5, 0.25, "#64748b", x, 2.5, z, S);
      const head = part(0.9, 0.3, 0.5, "#64748b", x, 5.1, z, S); head.material = lampOn; lit.push({ m: head, on: lampOn, off: lampOff });
    });
  }

  /** Placa de loja: quadro colorido com o nome, em cima do prédio. */
  function roofSign(text, x, y, z, bg) {
    const cv = document.createElement("canvas"); cv.width = 512; cv.height = 128; const c = cv.getContext("2d");
    let fs = 64; c.font = `700 ${fs}px Fredoka, system-ui, sans-serif`;
    while (c.measureText(text).width > 450 && fs > 28) { fs -= 4; c.font = `700 ${fs}px Fredoka, system-ui, sans-serif`; }
    const w = Math.min(500, c.measureText(text).width + 56), x0 = (512 - w) / 2;
    c.fillStyle = bg; c.strokeStyle = "#ffffff"; c.lineWidth = 8;
    c.beginPath(); c.roundRect ? c.roundRect(x0, 10, w, 108, 24) : c.rect(x0, 10, w, 108); c.fill(); c.stroke();
    c.fillStyle = "#ffffff"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(text, 256, 66);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sp.scale.set(9, 2.25, 1); sp.position.set(x, y, z); S.add(sp); return sp;
  }
  /** Prédio/casa fechada com janelas que acendem. */
  function building(x, z, w, d, h, color, { roof = "#9a3412", face = "+z", windows = true } = {}) {
    h = Math.max(h, 5); // pé-direito realista: o boneco tem ~2,7 de altura
    // nenhuma parede pode encostar na pista: empurra o prédio para dentro do quarteirão
    for (const c of STREETS) {
      if (Math.abs(x - c) < LANE + w / 2) x = c + Math.sign(x - c || 1) * (LANE + w / 2 + 0.6);
      if (Math.abs(z - c) < LANE + d / 2) z = c + Math.sign(z - c || 1) * (LANE + d / 2 + 0.6);
    }
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
  const H = HOME, x0 = H.x - H.w / 2, x1 = H.x + H.w / 2, z0 = H.z - H.d / 2, z1 = H.z + H.d / 2, WH = 4.5, T = 0.3;
  const wall = (x, z, w, d, c = "#fef3c7") => phys.addBox({ x, y: WH / 2, z, w, h: WH, d, color: c, scene: S });
  part(H.w, 0.06, H.d, "#e7e5e4", H.x, 0.03, H.z, S, false);                  // piso
  wall(H.x, z0, H.w, T); wall(x0, H.z, T, H.d); wall(x1, H.z, T, H.d);         // fundos e laterais
  wall(x0 + (H.w / 2 - 1.3) / 2, z1, H.w / 2 - 1.3, T); wall(x1 - (H.w / 2 - 1.3) / 2, z1, H.w / 2 - 1.3, T); // frente com porta
  part(2.6, 0.6, T, "#fef3c7", H.x, WH - 0.3, z1, S);                           // verga da porta
  // andares de cima do prédio (somem quando você está dentro do apartamento)
  // porta (gira na dobradiça esquerda) + tranca
  const doorMesh = new THREE.Group(); doorMesh.position.set(H.x - 1.3, 0, z1); S.add(doorMesh);
  part(2.6, 2.4, 0.14, "#7c2d12", 1.3, 1.2, 0, doorMesh); part(0.16, 0.16, 0.24, "#facc15", 2.3, 1.15, 0, doorMesh);
  const bar = part(2.2, 0.16, 0.1, "#57534e", 1.3, 1.5, -0.14, doorMesh); bar.visible = false;
  let doorBox = null; doorMesh.rotation.y = -1.35;
  const roof = new THREE.Group(); S.add(roof);
  const FL = 3;
  for (let f = 1; f <= FL; f++) {
    const y = WH + (f - 1) * 3.5;
    part(H.w + 4, 0.3, H.d + 1, "#cbd5e1", H.x - 1.5, y + 0.15, H.z, roof);
    part(H.w + 4, 3.2, H.d + 1, "#e2e8f0", H.x - 1.5, y + 1.9, H.z, roof);
    for (let i = 0; i < 4; i++) [H.z + H.d / 2 + 0.55, H.z - H.d / 2 - 0.55].forEach((wz) => { const m = part(1.6, 1.2, 0.1, "#fde68a", H.x - 6 + i * 4, y + 1.7, wz, roof, false); m.material = winOn; lit.push({ m, on: winOn, off: winOff }); });
    part(H.w + 5, 0.2, 1.2, "#94a3b8", H.x - 1.5, y + 0.2, H.z + H.d / 2 + 1, roof); // varandas
  }
  part(H.w + 4.4, 0.4, H.d + 1.4, "#64748b", H.x - 1.5, WH + FL * 3.5 + 0.2, H.z, roof);
  part(3, 1.6, 3, "#60a5fa", H.x + 2, WH + FL * 3.5 + 1.2, H.z - 2, roof);           // caixa d'água do prédio
  // hall do prédio (lado oeste): elevador e escada
  phys.addBox({ x: x0 - 1.5, y: WH / 2, z: H.z, w: 3, h: WH, d: H.d, color: "#e2e8f0", scene: S });
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
  const homeLabel = roofSign("🏢 " + t("l_building"), H.x - 1.5, WH + 11.2, H.z, "#b45309");


  // ---------------------------------------------------------------- casas do bairro (25/11/2026)
  // Regra do dono: 50% das casas ABERTAS (com porta de verdade, dá para entrar);
  // destas, 50% COM ITENS no chão; e destas, 50% com um MORADOR (NPC) que não deixa levar nada.
  // A lista é fixa (não sorteada) para o jogo salvo continuar combinando com o mapa.
  const HOUSE_SPOTS = [
    [-46, -10], [46, 6], [46, 54], [60, -40], [0, -50], [14, -54], [-14, -54], [46, -10], [-12, 62], [14, 60], [60, 40],
    [34, 14], [34, -12], [60, -12], [60, 12], [58, 34], [36, 60], [60, 60], [34, -34], [-34, -12], [-34, 12],
  ];
  const HCOL = ["#fde68a", "#c7d2fe", "#fecaca", "#d9f99d", "#e0e7ff", "#fae8ff", "#cffafe", "#fef9c3", "#e2e8f0", "#fee2e2", "#dcfce7"];
  const houses = [];
  /** Casa aberta: quatro paredes com vão de porta virado para +z, piso e telhado que some quando você entra. */
  function openHouse(x, z, w, d, color, i) {
    const HWH = 3.4, TH = 0.3, ax0 = x - w / 2, ax1 = x + w / 2, az0 = z - d / 2, az1 = z + d / 2;
    const wl = (wx, wz, ww, wd) => phys.addBox({ x: wx, y: HWH / 2, z: wz, w: ww, h: HWH, d: wd, color, scene: S });
    part(w, 0.06, d, "#e7e5e4", x, 0.03, z, S, false);                              // piso
    wl(x, az0, w, TH); wl(ax0, z, TH, d); wl(ax1, z, TH, d);                         // fundo e laterais
    const side = (w / 2 - 1.3);
    wl(ax0 + side / 2, az1, side, TH); wl(ax1 - side / 2, az1, side, TH);            // frente com o vão da porta
    part(2.6, 0.5, TH, color, x, HWH - 0.25, az1, S);                                // verga
    // porta aberta na dobradiça
    const dr = new THREE.Group(); dr.position.set(x - 1.3, 0, az1); dr.rotation.y = -1.25; S.add(dr);
    part(2.5, 2.3, 0.14, "#7c2d12", 1.25, 1.15, 0, dr); part(0.16, 0.16, 0.22, "#facc15", 2.2, 1.1, 0, dr);
    const roof = new THREE.Group(); S.add(roof);
    part(w + 0.8, 0.4, d + 0.8, "#9a3412", x, HWH + 0.2, z, roof);
    const win = [];
    [[ax0 - 0.05, z - 1.5], [ax1 + 0.05, z + 1.5]].forEach(([wx, wz]) => { const m = part(0.1, 1, 1.4, "#fde68a", wx, 1.8, wz, S, false); m.material = winOn; lit.push({ m, on: winOn, off: winOff }); win.push(m); });
    return { roof, inside: (px, pz) => px > ax0 && px < ax1 && pz > az0 && pz < az1, spots: [
      { x: ax0 + 1.6, z: az0 + 1.6 }, { x: ax1 - 1.6, z: az0 + 1.8 }, { x: x, z: z - 0.4 },
    ] };
  }
  if (!homeOnly) HOUSE_SPOTS.forEach(([hx2, hz2], i) => {
    const w = 10, d = 9, open = i % 2 === 0, loot = open && i % 4 === 0, npc = loot && i % 8 === 0;
    const color = HCOL[i % HCOL.length];
    if (!open) {
      building(hx2, hz2, w, d, i % 5 === 0 ? 9 : 3.4, color, { roof: i % 2 ? "#7c2d12" : "#475569" });
      // porta fechada, só visual, para a casa não ficar uma caixa lisa
      part(2.4, 2.3, 0.18, "#57534e", hx2, 1.15, hz2 + d / 2 + 0.12, S);
      part(0.16, 0.16, 0.2, "#e5e7eb", hx2 + 0.9, 1.1, hz2 + d / 2 + 0.24, S);
      houses.push({ x: hx2, z: hz2, w, d, open: false, loot: false, npc: false });
      return;
    }
    const oh = openHouse(hx2, hz2, w, d, color, i);
    houses.push({ x: hx2, z: hz2, w, d, open: true, loot, npc, roof: oh.roof, inside: oh.inside, spots: oh.spots });
  });

  const TP = homeOnly ? { x: 20, z: -20 } : { x: 48, z: -50 };   // torre de celular
  const tower = new THREE.Group(); tower.position.set(TP.x, 0, TP.z); S.add(tower);
  for (let y = 0; y < 28; y += 4) { part(0.25, 4, 0.25, "#94a3b8", -1, y + 2, -1, tower); part(0.25, 4, 0.25, "#94a3b8", 1, y + 2, 1, tower); part(0.25, 4, 0.25, "#94a3b8", -1, y + 2, 1, tower); part(0.25, 4, 0.25, "#94a3b8", 1, y + 2, -1, tower); part(2.2, 0.15, 2.2, "#94a3b8", 0, y + 4, 0, tower); }
  const tl = part(0.6, 0.6, 0.6, "#ef4444", 0, 28.6, 0, tower); tl.material = getMat("#ef4444", 1.5);
  part(3, 2.4, 2, "#cbd5e1", 3, 1.2, 0, tower);
  phys.addBox({ x: TP.x, y: 2, z: TP.z, w: 2.5, h: 4, d: 2.5, mesh: false });
  [["👴 " + t("l_ze"), -15, 11.6, 10, "#4d7c0f"], ["👩 " + t("l_cida"), 14, 5.6, -2, "#be185d"], ["👨 " + t("l_valdir"), -8, 5.6, -12, "#7e22ce"]].forEach(([txt, x, y, z, bg]) => roofSign(txt, x, y, z, bg));
  if (!homeOnly) {
    // ---------------------------------------------------------------- comércio e serviços
    /** Porta de loja: moldura, folha entreaberta, maçaneta e plaquinha "ABERTO" — o dono reclamou
     *  que os comércios não tinham porta nenhuma (25/11/2026). A compra é no toque da porta. */
    function shopDoor(x, z, w = 2.6, hh = 2.6) {
      part(w + 0.5, hh + 0.35, 0.22, "#0f172a", x, (hh + 0.35) / 2, z + 0.06, S);     // moldura
      const dr = new THREE.Group(); dr.position.set(x - w / 2, 0, z + 0.18); dr.rotation.y = -0.9; S.add(dr);
      part(w, hh, 0.12, "#92400e", w / 2, hh / 2, 0, dr);
      part(w - 0.6, hh - 1.2, 0.04, "#bae6fd", w / 2, hh / 2 + 0.3, 0.08, dr, false);
      part(0.14, 0.14, 0.2, "#facc15", w - 0.25, hh / 2 - 0.1, 0.1, dr);
      part(0.9, 0.3, 0.06, "#16a34a", x + w / 2 + 0.1, hh + 0.2, z + 0.2, S, false);  // plaquinha
      part(1.2, 0.08, 1.6, "#a8a29e", x, 0.04, z + 0.9, S, false);                     // soleira
    }
    building(0, 46, 26, 16, 6, "#f1f5f9", { roof: "#16a34a" });                     // mercado
    part(10, 1.4, 0.3, "#16a34a", 0, 5.2, 37.9, S);
    shopDoor(0, 37.95, 4, 3);                                                        // porta do mercado
    building(40, 38, 10, 8, 4, "#ecfeff", { roof: "#0d9488" });                     // farmácia
    shopDoor(40, 33.95, 2.6, 2.6);                                                   // porta da farmácia
    phys.addBox({ x: 0, y: 1.6, z: -32, w: 4, h: 3.2, d: 3, color: "#1d4ed8", scene: S });   // banco 24h
    const atmScr = part(1.2, 0.9, 0.1, "#38bdf8", 0, 1.7, -30.45, S, false); atmScr.material = getMat("#38bdf8", 1); lit.push({ m: atmScr, on: atmScr.material, off: winOff });
    // posto
    [[-52, -46], [-40, -46], [-52, -34], [-40, -34]].forEach(([x, z]) => part(0.5, 5, 0.5, "#e5e7eb", x, 2.5, z, S));
    part(14, 0.5, 14, "#dc2626", -46, 5.2, -40, S);
    [[-49, -40], [-43, -40]].forEach(([x, z]) => { phys.addBox({ x, y: 0.9, z, w: 1, h: 1.8, d: 0.8, color: "#f8fafc", scene: S }); const d = part(0.6, 0.4, 0.1, "#22c55e", x, 1.3, z + 0.42, S, false); d.material = getMat("#22c55e", 1); lit.push({ m: d, on: d.material, off: winOff }); });
    building(-46, -56, 12, 6, 3.5, "#fef2f2", { roof: "#dc2626" });
    shopDoor(-46, -52.95, 2.6, 2.6);
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

    // árvores: as quatro primeiras ficavam em z=±21, ou seja, DENTRO da pista — foram para dentro do quarteirão
    [[-18, 17], [18, 17], [-18, -17], [18, -17], [-30, 30], [30, 30], [-30, -30], [30, -30], [6, -30], [-6, 30], [36, -18], [-36, 18]].forEach(([x, z]) => addTree(world, phys, x, z, 0.9));

    // vegetação: canteiros da praça, arborização e mato nos terrenos vazios (preenche o vazio)
    sc.meadow({ area: [-60, 36, -36, 60], n: 150, flowers: 0.4 });
    sc.butterflies({ x: -48, z: 48, n: 6 });
    [[-55, 41], [-41, 41], [-55, 55], [-41, 55]].forEach(([x, z]) => sc.bush(x, z, { s: 1.1 }));
    // mato e árvores do lado de fora do bairro (atrás dos limites)
    sc.scatter({
      area: [-200, -200, 200, 200], trees: 70, rocks: 40, bushes: 50, grass: 5, flowers: 0.25,
      avoid: [{ x: 0, z: 0, r: 108 }], kinds: ["round", "round", "pine"],
    });
    // canteiros entre a calçada e o muro das quadras
    [[-34, -34], [34, -34], [-34, 34], [34, 34], [0, -60], [0, 60], [-62, 0], [62, 0]].forEach(([x, z], i) => {
      sc.meadow({ area: [x - 7, z - 7, x + 7, z + 7], n: 30, flowers: 0.4 });
      if (i % 2 === 0) sc.bush(x + 3, z + 3, { s: 1 });
    });

    // banca de jornais (vende o mapa de papel)
    phys.addBox({ x: 20, y: 1.2, z: 33, w: 4, h: 2.4, d: 2.4, color: "#1d4ed8", scene: S }); part(4.6, 0.3, 3, "#facc15", 20, 2.55, 32.8, S);
    part(3, 1, 0.1, "#f8fafc", 20, 1.5, 31.75, S); part(0.9, 0.7, 0.1, "#fca5a5", 19, 1.6, 31.7, S); part(0.9, 0.7, 0.1, "#bfdbfe", 21, 1.6, 31.7, S);
    // placas grandes no topo dos lugares importantes (sempre viradas para a câmera)
    const signs = [
      ["🛒 " + t("l_market"), 0, 9.4, 46, "#15803d"], ["💊 " + t("l_pharma"), 40, 6.8, 38, "#0f766e"], ["🏧 " + t("l_bank"), 0, 5.6, -32, "#1d4ed8"],
      ["⛽ " + t("l_gas"), -46, 7.8, -40, "#b91c1c"], ["🏥 " + t("i_hospital"), -52, 11.8, 6, "#1d4ed8"], ["🌳 " + t("l_square"), -48, 5.2, 48, "#166534"],
      ["📡 " + t("i_tower"), TP.x, 31.5, TP.z, "#475569"], ["📰 " + t("i_newsstand"), 20, 4.6, 33, "#1d4ed8"], ["🚌 " + t("i_bus"), 30.5, 4.4, -4, "#a16207"],
    ];
    signs.forEach(([txt, x, y, z, bg]) => roofSign(txt, x, y, z, bg));
  }

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
    scenery: sc, roof, npcs, gen, tower, towerLight: tl, homeLabel, towerPos: TP, houses,
    /** Esconde o telhado da casa em que o jogador entrou (e devolve os outros). */
    updateHouses(px, pz) {
      for (const hh of houses) if (hh.roof) hh.roof.visible = !hh.inside(px, pz);
    },
    /** Porta do apartamento: trancada = fechada e sólida; destrancada = aberta. */
    setDoor(locked) {
      doorMesh.rotation.y = locked ? 0 : -1.35; bar.visible = locked;
      if (locked && !doorBox) doorBox = phys.addBox({ x: H.x, y: 1.2, z: z1, w: 2.6, h: 2.4, d: 0.3, mesh: false });
      else if (!locked && doorBox) { phys.removeBox(doorBox); doorBox = null; }
    },
    setPower(on) { power = on; for (const l of lit) l.m.material = on ? l.on : l.off; },
    get power() { return power; },
    setTowerLight(on) { tl.visible = on; },
    /** Esconde o telhado quando o jogador está dentro de casa. */
    insideHome(x, z) { return x > x0 && x < x1 && z > z0 && z < z1; },
  };
}
