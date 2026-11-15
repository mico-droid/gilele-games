// Apagão: Sobreviva — "Jogar na minha cidade" (EM TESTES · prova de conceito).
// O jogador cola um link de mapa / digita um lugar / usa o GPS (só 12+) → baixamos ruas, construções e
// locais estratégicos do OpenStreetMap → o bairro real vira cenário 3D para andar.
// Ainda sem roteiro de sobrevivência, sem itens e sem multijogador (próximas etapas, ver PLANO.md).
import {
  THREE, createWorld, createPhysics, endFrame, createInput, createFollowCamera, createPlayer, loadLook,
  Audio, t, h, toast, screen, openSettings, gameLinks, registerPWA, track, initGTM, isTouch, createStore, addStrings,
} from "../../engine/ez.js";
import "./strings.js";
import { parseInput, geocode, loadPack, CATS, CAT_ORDER, U, dirOf } from "./geo.js";
import { buildOsmCity, drawMap, fmtKm } from "./osmcity.js";
import { addX } from "./menu.js";

const S = {
  cityT: ["🏙️ Jogar na minha cidade", "🏙️ Play in my city", "🏙️ Jugar en mi ciudad"],
  cityTest: ["Em testes: por enquanto dá para andar pelo seu bairro real e ver os locais estratégicos. A sobrevivência vem na próxima etapa.", "Testing: for now you can walk around your real neighborhood and see the strategic places. Survival comes in the next step.", "En pruebas: por ahora puedes caminar por tu barrio real y ver los lugares estratégicos. La supervivencia llega en la próxima etapa."],
  cityDesc: ["Seu bairro de verdade vira o cenário (em testes).", "Your real neighborhood becomes the map (testing).", "Tu barrio real se vuelve el escenario (en pruebas)."],
  cityPh: ["Cole o link do mapa ou digite um lugar (ex.: Praça Cívica, Goiânia)", "Paste a map link or type a place", "Pega el enlace del mapa o escribe un lugar"],
  cityGo: ["🔎 Buscar", "🔎 Search", "🔎 Buscar"],
  cityGps: ["📍 Usar minha localização", "📍 Use my location", "📍 Usar mi ubicación"],
  cityEx: ["🏫 Exemplo: Escola Hugo de Carvalho Ramos (Goiânia)", "🏫 Example: Hugo de Carvalho Ramos School (Goiânia)", "🏫 Ejemplo: Escuela Hugo de Carvalho Ramos (Goiânia)"],
  cityLinks: ["Aceita links do Google Maps, OpenStreetMap, Apple Maps, Waze e coordenadas. O link serve só para achar o lugar: o mapa do jogo é feito com dados livres do OpenStreetMap.", "Accepts Google Maps, OpenStreetMap, Apple Maps, Waze links and coordinates. The link is only used to find the place: the game map is made with free OpenStreetMap data.", "Acepta enlaces de Google Maps, OpenStreetMap, Apple Maps, Waze y coordenadas. El enlace solo sirve para encontrar el lugar: el mapa del juego se hace con datos libres de OpenStreetMap."],
  cityKidGps: ["Na faixa infantil o GPS fica desligado. Digite o nome de uma praça, escola ou bairro.", "In the kids band GPS is off. Type the name of a square, school or neighborhood.", "En la franja infantil el GPS está apagado. Escribe el nombre de una plaza, escuela o barrio."],
  citySize: ["Tamanho da área", "Area size", "Tamaño del área"],
  sizeS: ["Pequena · 300 m (celular simples)", "Small · 300 m (basic phone)", "Pequeña · 300 m (celular básico)"],
  sizeM: ["Média · 500 m", "Medium · 500 m", "Mediana · 500 m"],
  short: ["Esse é um link curto: o navegador não consegue abrir ele por dentro. Abra o link, copie o endereço completo da barra (com os números) e cole aqui — ou digite o nome do lugar.", "That's a short link: the browser can't open it from inside. Open the link, copy the full address from the bar (with the numbers) and paste it here — or type the place name.", "Es un enlace corto: el navegador no puede abrirlo por dentro. Abre el enlace, copia la dirección completa de la barra (con los números) y pégala aquí — o escribe el nombre del lugar."],
  notFound: ["Não achei esse lugar. Tente com o nome da cidade junto (ex.: \"Praça Tamandaré, Goiânia\").", "I couldn't find that place. Try adding the city name.", "No encontré ese lugar. Prueba agregando el nombre de la ciudad."],
  pickOne: ["Qual destes?", "Which one?", "¿Cuál de estos?"],
  netErr: ["Não consegui baixar o mapa agora (servidor do OpenStreetMap ocupado ou sem internet). Tente de novo em alguns segundos.", "Couldn't download the map now (OpenStreetMap server busy or no internet). Try again in a few seconds.", "No pude descargar el mapa ahora (servidor de OpenStreetMap ocupado o sin internet). Intenta de nuevo en unos segundos."],
  gpsErr: ["Não consegui a localização. Cole um link ou digite o lugar.", "Couldn't get the location. Paste a link or type the place.", "No pude obtener la ubicación. Pega un enlace o escribe el lugar."],
  loading: ["Preparando o mapa…", "Preparing the map…", "Preparando el mapa…"],
  stFind: ["🔎 Procurando o lugar…", "🔎 Finding the place…", "🔎 Buscando el lugar…"],
  stStreets: ["🏘️ Baixando ruas e construções…", "🏘️ Downloading streets and buildings…", "🏘️ Descargando calles y construcciones…"],
  stExit: ["🛣️ Procurando a rodovia de saída…", "🛣️ Looking for the exit highway…", "🛣️ Buscando la carretera de salida…"],
  stBuild: ["🧱 Montando o bairro…", "🧱 Building the neighborhood…", "🧱 Armando el barrio…"],
  cancel: ["Cancelar", "Cancel", "Cancelar"],
  confirmT: ["Confirmar a região", "Confirm the area", "Confirmar la región"],
  statsT: ["{r} ruas · {b} construções · {p} locais estratégicos", "{r} streets · {b} buildings · {p} strategic places", "{r} calles · {b} construcciones · {p} lugares estratégicos"],
  fewB: ["Este bairro tem poucas construções no OpenStreetMap: as que faltam viram casas genéricas.", "This area has few buildings in OpenStreetMap: missing ones become generic houses.", "Este barrio tiene pocas construcciones en OpenStreetMap: las que faltan serán casas genéricas."],
  playHere: ["▶ Gerar e jogar", "▶ Build and play", "▶ Generar y jugar"],
  other: ["↺ Outro lugar", "↺ Another place", "↺ Otro lugar"],
  exitInfo: ["🛣️ Saída: {n} a {d} ({dir})", "🛣️ Exit: {n} {d} away ({dir})", "🛣️ Salida: {n} a {d} ({dir})"],
  exitNone: ["🛣️ Nenhuma rodovia num raio de 15 km", "🛣️ No highway within 15 km", "🛣️ Ninguna carretera en 15 km"],
  exitSign: ["SAÍDA", "EXIT", "SALIDA"],
  hwy: ["rodovia", "highway", "carretera"],
  placesT: ["📋 Locais estratégicos", "📋 Strategic places", "📋 Lugares estratégicos"],
  placesInfo: ["Mais perto do ponto escolhido. Os marcados com 🧭 ficam fora da área do jogo.", "Closest to the chosen point. Those marked 🧭 are outside the game area.", "Más cerca del punto elegido. Los marcados con 🧭 quedan fuera del área del juego."],
  noPlaces: ["Nenhum local estratégico encontrado a 2,5 km.", "No strategic places found within 2.5 km.", "Ningún lugar estratégico a 2,5 km."],
  menuT: ["Menu", "Menu", "Menú"],
  cont: ["▶ Continuar", "▶ Continue", "▶ Continuar"],
  toMain: ["🏠 Sair para Menu", "🏠 Exit to Menu", "🏠 Salir al Menú"],
  osm: ["Mapa: © colaboradores do OpenStreetMap", "Map: © OpenStreetMap contributors", "Mapa: © colaboradores de OpenStreetMap"],
  cityHow: ["Ande pelo seu bairro. As placas mostram mercados, farmácias, postos, hospitais e delegacias. A luz verde é a rodovia de saída mais próxima. Toque em 🗺️ para o mapa e em 📋 para a lista de locais.", "Walk around your neighborhood. Signs show markets, pharmacies, gas stations, hospitals and police. The green light is the nearest exit highway. Tap 🗺️ for the map and 📋 for the list of places.", "Camina por tu barrio. Los letreros muestran mercados, farmacias, gasolineras, hospitales y policía. La luz verde es la carretera de salida más cercana. Toca 🗺️ para el mapa y 📋 para la lista."],
  cat_market: ["Mercado", "Market", "Mercado"], cat_bakery: ["Padaria", "Bakery", "Panadería"], cat_pharmacy: ["Farmácia", "Pharmacy", "Farmacia"],
  cat_hospital: ["Hospital/Saúde", "Hospital/Clinic", "Hospital/Salud"], cat_police: ["Delegacia/Polícia", "Police", "Policía"], cat_fire: ["Bombeiros", "Fire station", "Bomberos"],
  cat_fuel: ["Posto de combustível", "Gas station", "Gasolinera"], cat_bank: ["Banco", "Bank", "Banco"], cat_atm: ["Caixa eletrônico", "ATM", "Cajero"],
  cat_hardware: ["Material de construção", "Hardware store", "Ferretería"], cat_water: ["Bebedouro", "Drinking water", "Bebedero"], cat_school: ["Escola", "School", "Escuela"],
  dirs: ["N,NE,L,SE,S,SO,O,NO", "N,NE,E,SE,S,SW,W,NW", "N,NE,E,SE,S,SO,O,NO"],
};
const dict = { pt: {}, en: {}, es: {} };
for (const k in S) { dict.pt[k] = S[k][0]; dict.en[k] = S[k][1]; dict.es[k] = S[k][2]; }
addStrings(dict);
const dirTxt = (x, z) => dirOf(x, z, t("dirs").split(","));

registerPWA("../../sw.js");
initGTM("GTM-54JJ46D9");
const store = createStore("apagao");
let cfg = Object.assign({ age: "kid", citySize: 250 }, store.getJSON("cfg", {}));

// ---------------------------------------------------------------- mundo
const world = createWorld({ canvas: document.getElementById("c"), sky: 0xbfe3ff, fog: [90, 420], far: 650, shadowRange: 40 });
const phys = createPhysics();
const cam = createFollowCamera(world.camera, { phys, dist: 10, maxDist: 22 });
let playing = false;
const input = createInput({ canvas: world.renderer.domElement, enabled: () => playing, onLook: (dx, dy, tc) => cam.look(dx, dy, tc), onZoom: (d) => cam.zoom(d) });
input.addButton({ label: "⤒", action: "jump" });
input.setVisible(false);
const me = createPlayer({ world, phys, input, cam, look: loadLook(), spawn: { x: 0, y: 0.4, z: 0 } });
let city = null, pack = null;
// chão provisório até o mapa chegar
const tmpGround = phys.addBox({ x: 0, y: -0.5, z: 0, w: 200, h: 1, d: 200, color: 0x9bbf63, scene: world.scene, castShadow: false });

// ---------------------------------------------------------------- HUD
const placePill = h("div.ez-pill"), exitPill = h("div.ez-pill");
const btn = (e, fn, title) => h("button.ez-rbtn", { title, onclick: fn }, e);
const mini = h("canvas.sv-mini", { width: 180, height: 180, onclick: () => openBigMap() });
const hud = h("div.ez-hud.ez-hidden",
  h("div.ez-top", placePill, exitPill, h("div.ez-spacer"), btn("🗺️", () => openBigMap(), "M"), btn("📋", () => openPlaces(), "L"), btn("✕", () => openMenu(), t("menuT"))),
  mini, h("div.sv-osm", t("osm")));
document.body.appendChild(hud);
const css = document.createElement("style");
css.textContent = `.sv-mini{position:absolute;right:10px;top:62px;width:150px;height:150px;border-radius:14px;border:3px solid rgba(255,255,255,.85);box-shadow:0 4px 14px rgba(0,0,0,.35);pointer-events:auto;cursor:pointer}
.sv-osm{position:absolute;right:8px;bottom:4px;font-size:10px;opacity:.75;background:rgba(15,23,42,.55);padding:2px 6px;border-radius:6px}
.sv-ta{width:100%;min-height:74px;border-radius:12px;border:2px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:inherit;font:inherit;font-size:15px;padding:10px;box-sizing:border-box;resize:vertical}
.sv-step{font-size:17px;text-align:center;min-height:30px}
.sv-list{max-height:52vh;overflow:auto;display:flex;flex-direction:column;gap:4px}
.sv-list div{display:flex;gap:8px;align-items:center;background:rgba(255,255,255,.07);padding:6px 10px;border-radius:10px;font-size:14px}
.sv-list b{flex:1;font-weight:600}
@media (max-width:900px),(max-height:500px){.sv-mini{width:104px;height:104px;top:104px}}`;
document.head.appendChild(css);

function updHud() {
  if (!pack) return;
  placePill.textContent = "📍 " + shortLabel(pack.label);
  exitPill.textContent = exitText();
}
const shortLabel = (s) => { s = String(s || t("cityT")).split(",")[0]; return s.length > 28 ? s.slice(0, 27) + "…" : s; };
function exitText() {
  const e = pack && pack.exit; if (!e) return t("exitNone");
  const dx = e.x - me.x, dz = e.z - me.z;
  return t("exitInfo", { n: e.n || t("hwy"), d: fmtKm(Math.hypot(dx, dz) * U), dir: dirTxt(dx, dz) });
}

// ---------------------------------------------------------------- telas
function showStart(msg) {
  playing = false; hud.classList.add("ez-hidden"); input.setVisible(false);
  const ta = h("textarea.sv-ta", { placeholder: t("cityPh"), rows: 3 });
  const err = h("p.ez-msg", { style: { color: "#fca5a5", minHeight: "0" } }, msg || "");
  const chip = (g, v, label) => h("button.ez-chip" + (cfg[g] === v ? ".sel" : ""), { onclick: () => { cfg[g] = v; store.setJSON("cfg", cfg); Audio.play("click"); scr.close(); showStart(); } }, label);
  const kid = cfg.age !== "teen";
  let scr = null;
  scr = screen([
    h("h2", t("cityT")),
    h("p.ez-msg", { style: { textAlign: "center" } }, "🧪 " + t("cityTest")),
    h("h3", t("age")), h("div.ez-row", chip("age", "kid", t("age_kid")), chip("age", "teen", t("age_teen"))),
    ta, err,
    h("button.ez-btn.wide", { onclick: () => go(ta.value) }, t("cityGo")),
    kid ? h("p.ez-msg", t("cityKidGps")) : h("button.ez-btn.blue.wide", { onclick: () => gps() }, t("cityGps")),
    h("button.ez-btn.gray.wide", { onclick: () => go("Escola Hugo de Carvalho Ramos, Goiânia") }, t("cityEx")),
    h("h3", t("citySize")), h("div.ez-row", chip("citySize", 150, t("sizeS")), chip("citySize", 250, t("sizeM"))),
    h("p.ez-msg", { style: { fontSize: "12px" } }, t("cityLinks")),
    h("button.ez-btn.gray.wide", { onclick: () => { location.href = "./"; } }, t("toMain")),
    gameLinks(t("title")),
  ]);
  addX(h, scr, () => { location.href = "./"; });
  ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); go(ta.value); } });
  setTimeout(() => ta.focus(), 50);

  async function go(text) {
    const p = parseInput(text);
    if (!p) { err.textContent = t("notFound"); return; }
    if (p.short && !p.query) { err.textContent = t("short"); return; }
    if (p.lat != null) { scr.close(); fetchArea(p.lat, p.lon, p.label); return; }
    err.textContent = t("stFind");
    try {
      let L = await geocode(p.query);
      if (!L.length && p.alt && p.alt !== p.query) L = await geocode(p.alt);
      if (!L.length) { err.textContent = p.short ? t("short") : t("notFound"); return; }
      if (L.length === 1 || text.startsWith("Escola Hugo de Carvalho Ramos")) { scr.close(); fetchArea(L[0].lat, L[0].lon, L[0].label); return; }
      scr.close(); pickPlace(L);
    } catch (e) { err.textContent = t("netErr"); }
  }
  function gps() {
    if (!navigator.geolocation) { err.textContent = t("gpsErr"); return; }
    err.textContent = t("stFind");
    navigator.geolocation.getCurrentPosition((pos) => { scr.close(); fetchArea(pos.coords.latitude, pos.coords.longitude, ""); },
      () => { err.textContent = t("gpsErr"); }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
  }
}
function pickPlace(L) {
  let scr = null;
  scr = screen([h("h2", t("pickOne")), h("div.ez-col", ...L.map((o) => h("button.ez-btn.gray.wide", { style: { textAlign: "left", fontSize: "14px" }, onclick: () => { scr.close(); fetchArea(o.lat, o.lon, o.label); } }, o.label)))], { x: () => { scr.close(); showStart(); } });
}

let abort = null;
async function fetchArea(lat, lon, label) {
  const step = h("p.sv-step", t("stStreets"));
  let scr = null;
  abort = new AbortController();
  scr = screen([h("h2", t("loading")), step, h("button.ez-btn.gray.wide", { onclick: () => { abort.abort(); scr.close(); showStart(); } }, t("cancel"))]);
  try {
    const p = await loadPack(lat, lon, cfg.citySize, { onStep: (k) => (step.textContent = t(k)), signal: abort.signal });
    p.label = label || p.label || "";
    if (!p.label) { const nr = nearestNamedRoad(p); p.label = nr || t("cityT"); }
    scr.close(); preview(p);
  } catch (e) {
    if (abort.signal.aborted) return;
    console.warn(e); scr.close(); showStart(t("netErr"));
  }
}
function nearestNamedRoad(p) {
  let best = null;
  for (const r of p.roads) if (r.n) for (let i = 0; i < r.p.length; i += 2) { const d = Math.hypot(r.p[i] - p.user.x, r.p[i + 1] - p.user.z); if (!best || d < best.d) best = { d, n: r.n }; }
  return best && best.n;
}
function preview(p) {
  const cv = h("canvas", { width: 600, height: 600, style: { width: "min(78vw, 46vh)", height: "min(78vw, 46vh)", display: "block", margin: "6px auto", borderRadius: "14px" } });
  const nIn = p.pois.filter((o) => o.in).length;
  let scr = null;
  scr = screen([
    h("h2", t("confirmT")), h("p", { style: { textAlign: "center", margin: "0" } }, "📍 " + shortLabel(p.label)), cv,
    h("p.ez-msg", { style: { textAlign: "center" } }, t("statsT", { r: p.roads.length, b: p.blds.length, p: nIn })),
    h("p.ez-msg", { style: { textAlign: "center" } }, p.exit ? t("exitInfo", { n: p.exit.n || t("hwy"), d: fmtKm(Math.hypot(p.exit.x - p.user.x, p.exit.z - p.user.z) * U), dir: dirTxt(p.exit.x - p.user.x, p.exit.z - p.user.z) }) : t("exitNone")),
    p.blds.length / ((4 * p.r * p.r) / 1e4) < 18 ? h("p.ez-msg", { style: { textAlign: "center" } }, "ℹ️ " + t("fewB")) : null,
    h("button.ez-btn.wide", { onclick: () => { scr.close(); play(p); } }, t("playHere")),
    h("button.ez-btn.gray.wide", { onclick: () => { scr.close(); showStart(); } }, t("other")),
    h("p.ez-msg", { style: { textAlign: "center", fontSize: "11px" } }, t("osm")),
  ], { x: () => { scr.close(); showStart(); } });
  drawMap(cv, p);
}

function play(p) {
  pack = p;
  if (city) city.dispose();
  if (tmpGround) phys.removeBox(tmpGround);
  const t0 = performance.now();
  city = buildOsmCity(world, phys, p);
  console.info("[cidade] mundo gerado em", Math.round(performance.now() - t0), "ms", city.stats);
  me.spawn = { ...city.spawn }; me.respawn(city.spawn);
  playing = true; hud.classList.remove("ez-hidden"); input.setVisible(true); world.setPaused(false);
  Audio.init(); updHud();
  track("game_start", { mode: "city", age_band: cfg.age, area: p.r });
  if (!store.get("cityHow")) { store.set("cityHow", "1"); const s = screen([h("h2", t("cityT")), h("p", t("cityHow")), h("button.ez-btn.wide", { onclick: () => s.close() }, "OK")], { x: true }); }
}
function openMenu() {
  playing = false; input.setVisible(false); world.setPaused(true);
  const resume = () => { scr.close(); playing = true; input.setVisible(true); world.setPaused(false); };
  let scr = null;
  scr = screen([h("h2", t("menuT")),
    h("button.ez-btn.wide", { onclick: resume }, t("cont")),
    h("button.ez-btn.blue.wide", { onclick: () => { scr.close(); world.setPaused(false); showStart(); } }, t("other")),
    h("button.ez-btn.gray.wide", { onclick: () => { scr.close(); openSettings({ world, onClose: openMenu }); } }, "⚙️"),
    h("button.ez-btn.gray.wide", { onclick: () => { location.href = "./"; } }, t("toMain")),
  ], { x: resume });
}
function openBigMap() {
  if (!pack) return;
  const wasPlaying = playing; playing = false; input.setVisible(false);
  const cv = h("canvas", { width: 700, height: 700, style: { width: "min(86vw, 62vh)", height: "min(86vw, 62vh)", display: "block", margin: "0 auto", borderRadius: "14px" } });
  let scr = null;
  const close = () => { scr.close(); if (wasPlaying) { playing = true; input.setVisible(true); } };
  scr = screen([h("h2", "🗺️ " + shortLabel(pack.label)), cv, h("p.ez-msg", { style: { textAlign: "center" } }, exitText()), h("button.ez-btn.wide", { onclick: close }, "OK")], { x: close });
  drawMap(cv, pack, { me: { x: me.x, z: me.z } });
}
function openPlaces() {
  if (!pack) return;
  const wasPlaying = playing; playing = false; input.setVisible(false);
  const L = pack.pois.slice().map((o) => ({ ...o, dm: Math.hypot(o.x - me.x, o.z - me.z) * U }))
    .sort((a, b) => CAT_ORDER.indexOf(a.k) - CAT_ORDER.indexOf(b.k) || a.dm - b.dm);
  const per = {}, rows = [];
  for (const o of L) { per[o.k] = (per[o.k] || 0) + 1; if (per[o.k] > 3) continue; // até 3 por tipo, os mais perto
    rows.push(h("div", h("span", CATS[o.k].e), h("b", o.n || t("cat_" + o.k)), h("span", (o.in ? "" : "🧭 ") + fmtKm(o.dm) + " " + dirTxt(o.x - me.x, o.z - me.z)))); }
  if (pack.exit) rows.unshift(h("div", h("span", "🛣️"), h("b", pack.exit.n || t("hwy")), h("span", fmtKm(Math.hypot(pack.exit.x - me.x, pack.exit.z - me.z) * U) + " " + dirTxt(pack.exit.x - me.x, pack.exit.z - me.z))));
  let scr = null;
  const close = () => { scr.close(); if (wasPlaying) { playing = true; input.setVisible(true); } };
  scr = screen([h("h2", t("placesT")), h("p.ez-msg", t("placesInfo")), rows.length ? h("div.sv-list", ...rows) : h("p", t("noPlaces")), h("button.ez-btn.wide", { onclick: close }, "OK")], { x: close });
}

// ---------------------------------------------------------------- laço
let hudT = 0, miniT = 0;
world.onUpdate((dt) => {
  if (playing) {
    me.update(dt);
  }
  if (city) city.update(dt);
  hudT -= dt; if (hudT <= 0) { hudT = 0.5; updHud(); }
  miniT -= dt; if (miniT <= 0 && pack && playing) { miniT = 0.25; drawMap(mini, pack, { cx: me.x, cz: me.z, scale: 180 / 260, me: { x: me.x, z: me.z } }); }
  endFrame(phys);
  input.endFrame();
});
addEventListener("keydown", (e) => { if (!playing) return; const k = e.key.toLowerCase(); if (k === "m") openBigMap(); if (k === "l") openPlaces(); });
world.start();
cam.update(0.016, me.body);
showStart();
window.GAME = { world, phys, me, get city() { return city; }, get pack() { return pack; }, play, parseInput, loadPack };
