// Apagão: Sobreviva — escolha de lugar no mapa real (OpenStreetMap) + modo "Explorar minha cidade" (testes).
//   openPicker({ kid, onPack, onCancel, okLabel })  → telas: colar link / buscar / GPS (só 12+) → carregando (%) → confirmar
//   Usado pelo Apagão Real (main.js, mapa "📍 Minha cidade") e pelo modo de testes ?modo=cidade (runExplorer).
import {
  createWorld, createPhysics, endFrame, createInput, createFollowCamera, createPlayer, createBot, loadLook, randomLook,
  Audio, t, h, screen, openSettings, gameLinks, registerPWA, track, initGTM, isMobile, createStore, addStrings,
} from "../../engine/ez.js";
import "./strings.js";
import { parseInput, geocode, loadPack, CATS, CAT_ORDER, U, dirFrom } from "./geo.js";
import { buildOsmCity, drawMap, fmtKm, sign } from "./osmcity.js";
import { addX } from "./menu.js";

const S = {
  cityT: ["🏙️ Jogar na minha cidade", "🏙️ Play in my city", "🏙️ Jugar en mi ciudad"],
  cityTest: ["Em testes: ande pelo bairro real, abra portas e pegue itens. A história do apagão neste mapa fica no Apagão Real → Mapa → 📍 Minha cidade.", "Testing: walk around the real neighborhood, open doors and pick up items. The blackout story on this map is in Real Blackout → Map → 📍 My city.", "En pruebas: camina por el barrio real, abre puertas y recoge objetos. La historia del apagón en este mapa está en Apagón Real → Mapa → 📍 Mi ciudad."],
  cityPh: ["Cole o link do mapa ou digite um lugar (ex.: Praça Cívica, Goiânia)", "Paste a map link or type a place", "Pega el enlace del mapa o escribe un lugar"],
  cityGo: ["🔎 Buscar", "🔎 Search", "🔎 Buscar"],
  cityGps: ["📍 Usar minha localização", "📍 Use my location", "📍 Usar mi ubicación"],
  cityEx: ["🏙️ Exemplo: Jardim Goiás (Goiânia)", "🏙️ Example: Jardim Goiás (Goiânia)", "🏙️ Ejemplo: Jardim Goiás (Goiânia)"],
  cityLinks: ["Aceita links do Google Maps, OpenStreetMap, Apple Maps, Waze e coordenadas. O link serve só para achar o lugar: o mapa do jogo é feito com dados livres do OpenStreetMap.", "Accepts Google Maps, OpenStreetMap, Apple Maps, Waze links and coordinates. The link is only used to find the place: the game map is made with free OpenStreetMap data.", "Acepta enlaces de Google Maps, OpenStreetMap, Apple Maps, Waze y coordenadas. El enlace solo sirve para encontrar el lugar: el mapa del juego se hace con datos libres de OpenStreetMap."],
  cityKidGps: ["Na faixa infantil o GPS fica desligado. Digite o nome de uma praça, escola ou bairro.", "In the kids band GPS is off. Type the name of a square, school or neighborhood.", "En la franja infantil el GPS está apagado. Escribe el nombre de una plaza, escuela o barrio."],
  citySize: ["Tamanho da área", "Area size", "Tamaño del área"],
  sizeS: ["Pequena · 300 m (celular simples)", "Small · 300 m (basic phone)", "Pequeña · 300 m (celular básico)"],
  sizeM: ["Média · 500 m", "Medium · 500 m", "Mediana · 500 m"],
  short: ["Esse é um link curto: o navegador não consegue abrir ele por dentro. Abra o link, copie o endereço completo da barra (com os números) e cole aqui — ou digite o nome do lugar.", "That's a short link: the browser can't open it from inside. Open the link, copy the full address from the bar (with the numbers) and paste it here — or type the place name.", "Es un enlace corto: el navegador no puede abrirlo por dentro. Abre el enlace, copia la dirección completa de la barra (con los números) y pégala aquí — o escribe el nombre del lugar."],
  geoNotFound: ["Não achei esse lugar. Tente com o nome da cidade junto (ex.: \"Praça Tamandaré, Goiânia\").", "I couldn't find that place. Try adding the city name.", "No encontré ese lugar. Prueba agregando el nombre de la ciudad."],
  pickOne: ["Qual destes?", "Which one?", "¿Cuál de estos?"],
  geoOffline: ["📵 Sem internet. Para montar um bairro novo o jogo precisa de internet só uma vez (os últimos lugares abertos ficam guardados no aparelho). Conecte no Wi-Fi ou nos dados móveis e toque em Tentar de novo.", "📵 No internet. To build a new neighborhood the game needs internet just once (the last places you opened stay saved on the device). Connect to Wi-Fi or mobile data and tap Try again.", "📵 Sin internet. Para armar un barrio nuevo el juego necesita internet solo una vez (los últimos lugares abiertos quedan guardados en el dispositivo). Conéctate al Wi-Fi o a los datos móviles y toca Intentar de nuevo."],
  geoBusy: ["🐢 O servidor gratuito de mapas (OpenStreetMap) está ocupado agora. Espere um minutinho e toque em Tentar de novo — ou escolha a área Pequena.", "🐢 The free map server (OpenStreetMap) is busy right now. Wait a minute and tap Try again — or choose the Small area.", "🐢 El servidor gratuito de mapas (OpenStreetMap) está ocupado ahora. Espera un minuto y toca Intentar de nuevo — o elige el área Pequeña."],
  netErr: ["Não consegui baixar o mapa agora. Tente de novo em alguns segundos.", "Couldn't download the map now. Try again in a few seconds.", "No pude descargar el mapa ahora. Intenta de nuevo en unos segundos."],
  retry: ["↻ Tentar de novo", "↻ Try again", "↻ Intentar de nuevo"],
  gpsErr: ["Não consegui a localização. Cole um link ou digite o lugar.", "Couldn't get the location. Paste a link or type the place.", "No pude obtener la ubicación. Pega un enlace o escribe el lugar."],
  loading: ["Preparando o mapa…", "Preparing the map…", "Preparando el mapa…"],
  stFind: ["🔎 Procurando o lugar…", "🔎 Finding the place…", "🔎 Buscando el lugar…"],
  stStreets: ["🏘️ Baixando ruas e construções…", "🏘️ Downloading streets and buildings…", "🏘️ Descargando calles y construcciones…"],
  stExit: ["🛣️ Procurando a rodovia de saída…", "🛣️ Looking for the exit highway…", "🛣️ Buscando la carretera de salida…"],
  stRural: ["🌾 Procurando a zona rural mais perto…", "🌾 Looking for the nearest countryside…", "🌾 Buscando la zona rural más cercana…"],
  stBuild: ["🧱 Montando o bairro…", "🧱 Building the neighborhood…", "🧱 Armando el barrio…"],
  dlInfo: ["{kb} KB baixados · {s} s", "{kb} KB downloaded · {s} s", "{kb} KB descargados · {s} s"],
  slow: ["Está demorando mais que o normal (servidor lento). Pode esperar — se passar de 1 minuto sem mudar, toque em Cancelar e tente de novo.", "Taking longer than usual (slow server). You can wait — if nothing changes for a minute, tap Cancel and try again.", "Está tardando más de lo normal (servidor lento). Puedes esperar — si no cambia en un minuto, toca Cancelar e intenta de nuevo."],
  geoCancel: ["Cancelar", "Cancel", "Cancelar"],
  confirmT: ["Confirmar a região", "Confirm the area", "Confirmar la región"],
  statsT: ["{r} ruas · {b} construções · {p} locais estratégicos", "{r} streets · {b} buildings · {p} strategic places", "{r} calles · {b} construcciones · {p} lugares estratégicos"],
  fewB: ["Este bairro tem poucas construções no OpenStreetMap: as que faltam viram casas genéricas.", "This area has few buildings in OpenStreetMap: missing ones become generic houses.", "Este barrio tiene pocas construcciones en OpenStreetMap: las que faltan serán casas genéricas."],
  playHere: ["▶ Gerar e jogar", "▶ Build and play", "▶ Generar y jugar"],
  useHere: ["✔ Usar este lugar", "✔ Use this place", "✔ Usar este lugar"],
  geoOther: ["↺ Outro lugar", "↺ Another place", "↺ Otro lugar"],
  exitInfo: ["🛣️ Saída: {n} a {d} ({dir})", "🛣️ Exit: {n} {d} away ({dir})", "🛣️ Salida: {n} a {d} ({dir})"],
  exitRural: ["🌾 Zona rural: {d} ({dir})", "🌾 Countryside: {d} ({dir})", "🌾 Zona rural: {d} ({dir})"],
  exitGuess: ["🌾 Saída provável: lado {dir}", "🌾 Likely way out: {dir} side", "🌾 Salida probable: lado {dir}"],
  exitSign: ["SAÍDA", "EXIT", "SALIDA"],
  ruralSign: ["ZONA RURAL", "COUNTRYSIDE", "ZONA RURAL"],
  hwy: ["rodovia", "highway", "carretera"],
  placesT: ["📋 Locais estratégicos", "📋 Strategic places", "📋 Lugares estratégicos"],
  placesInfo: ["Mais perto de você. Os marcados com 🧭 ficam fora da área do jogo.", "Closest to you. Those marked 🧭 are outside the game area.", "Más cerca de ti. Los marcados con 🧭 quedan fuera del área del juego."],
  noPlaces: ["Nenhum local estratégico encontrado a 2,5 km.", "No strategic places found within 2.5 km.", "Ningún lugar estratégico a 2,5 km."],
  menuT: ["Menu", "Menu", "Menú"],
  cont: ["▶ Continuar", "▶ Continue", "▶ Continuar"],
  toMain: ["🏠 Sair para Menu", "🏠 Exit to Menu", "🏠 Salir al Menú"],
  osm: ["Mapa: © colaboradores do OpenStreetMap", "Map: © OpenStreetMap contributors", "Mapa: © colaboradores de OpenStreetMap"],
  cityHow: ["Ande pelo bairro. Placas mostram mercados, farmácias, postos, hospitais e delegacias. Algumas casas estão abertas, outras têm porta (✋ para abrir) e metade está trancada. Procure itens 💧🥫🩹 dentro delas e nas lojas. A luz verde (ou amarela) é a saída da cidade.", "Walk around. Signs show markets, pharmacies, gas stations, hospitals and police. Some houses are open, some have a door (✋ to open) and half are locked. Look for items 💧🥫🩹 inside them and in shops. The green (or yellow) light is the way out of town.", "Camina por el barrio. Los letreros muestran mercados, farmacias, gasolineras, hospitales y policía. Algunas casas están abiertas, otras tienen puerta (✋ para abrir) y la mitad está cerrada. Busca objetos 💧🥫🩹 dentro y en las tiendas. La luz verde (o amarilla) es la salida de la ciudad."],
  osmDoorOpen: ["🚪 Abrir a porta", "🚪 Open the door", "🚪 Abrir la puerta"],
  osmDoorClose: ["🚪 Fechar a porta", "🚪 Close the door", "🚪 Cerrar la puerta"],
  pickIt: ["Pegar {x}", "Pick up {x}", "Recoger {x}"],
  bagN: ["🎒 {n} itens", "🎒 {n} items", "🎒 {n} objetos"],
  cat_market: ["Mercado", "Market", "Mercado"], cat_bakery: ["Padaria", "Bakery", "Panadería"], cat_pharmacy: ["Farmácia", "Pharmacy", "Farmacia"],
  cat_hospital: ["Hospital/Saúde", "Hospital/Clinic", "Hospital/Salud"], cat_police: ["Delegacia/Polícia", "Police", "Policía"], cat_fire: ["Bombeiros", "Fire station", "Bomberos"],
  cat_fuel: ["Posto de combustível", "Gas station", "Gasolinera"], cat_bank: ["Banco", "Bank", "Banco"], cat_atm: ["Caixa eletrônico", "ATM", "Cajero"],
  cat_hardware: ["Material de construção", "Hardware store", "Ferretería"], cat_water: ["Bebedouro", "Drinking water", "Bebedero"], cat_school: ["Escola", "School", "Escuela"],
  cat_news: ["Banca de jornais", "Newsstand", "Quiosco de periódicos"],
  map_osm: ["📍 Minha cidade (testes)", "📍 My city (testing)", "📍 Mi ciudad (pruebas)"],
  map_osmInfo: ["O jogo acontece num bairro real que você escolher (mapa do OpenStreetMap). Seu prédio e seus vizinhos ficam numa rua de verdade perto do lugar.", "The game happens in a real neighborhood you choose (OpenStreetMap). Your building and neighbors sit on a real street near the place.", "El juego ocurre en un barrio real que elijas (OpenStreetMap). Tu edificio y tus vecinos quedan en una calle real cerca del lugar."],
  map_pick: ["📍 Escolher o lugar", "📍 Choose the place", "📍 Elegir el lugar"],
  map_change: ["📍 Trocar o lugar", "📍 Change the place", "📍 Cambiar el lugar"],
  map_none: ["Nenhum lugar escolhido ainda.", "No place chosen yet.", "Ningún lugar elegido aún."],
  map_mp: ["(sozinho por enquanto)", "(solo for now)", "(solo por ahora)"],
  map_lost: ["O mapa da sua cidade deste jogo não está mais no aparelho. Comece um novo jogo e escolha o lugar de novo.", "This game's city map is no longer on the device. Start a new game and choose the place again.", "El mapa de tu ciudad de esta partida ya no está en el dispositivo. Empieza una nueva partida y elige el lugar otra vez."],
  dirs: ["N,NE,L,SE,S,SO,O,NO", "N,NE,E,SE,S,SW,W,NW", "N,NE,E,SE,S,SO,O,NO"],
};
const dict = { pt: {}, en: {}, es: {} };
for (const k in S) { dict.pt[k] = S[k][0]; dict.en[k] = S[k][1]; dict.es[k] = S[k][2]; }
addStrings(dict);

let css = null;
export function addCss() {
  if (css) return; css = document.createElement("style");
  css.textContent = `.sv-mini{position:absolute;right:10px;top:62px;width:150px;height:150px;border-radius:14px;border:3px solid rgba(255,255,255,.85);box-shadow:0 4px 14px rgba(0,0,0,.35);pointer-events:auto;cursor:pointer}
.sv-osm{position:absolute;right:8px;bottom:4px;font-size:10px;opacity:.75;background:rgba(15,23,42,.55);padding:2px 6px;border-radius:6px}
.sv-ta{width:100%;min-height:74px;border-radius:12px;border:1px solid rgba(100,116,139,.7);background:rgba(255,255,255,.08);color:inherit;font:inherit;font-size:15px;padding:10px;box-sizing:border-box;resize:vertical;outline:none}
.sv-ta:focus{border-color:#f59e0b}
.sv-step{font-size:17px;text-align:center;min-height:26px;margin:4px 0}
.sv-bar2{height:16px;border-radius:9px;background:rgba(100,116,139,.25);overflow:hidden;margin:6px 0}
.sv-bar2 i{display:block;height:100%;width:0;background:linear-gradient(90deg,#f59e0b,#22c55e);transition:width .35s}
.sv-pct{font-size:30px;font-weight:700;text-align:center}
.sv-list{max-height:52vh;overflow:auto;display:flex;flex-direction:column;gap:4px}
.sv-list div{display:flex;gap:8px;align-items:center;background:rgba(100,116,139,.12);padding:6px 10px;border-radius:10px;font-size:14px}
.sv-list b{flex:1;font-weight:600}
@media (max-width:900px),(max-height:500px){.sv-mini{width:104px;height:104px;top:104px}}`;
  document.head.appendChild(css);
}
export const dirTxt = (pack, x, z) => dirFrom(pack, x, z, t("dirs").split(","));
export const shortLabel = (s) => { s = String(s || t("cityT")).split(",")[0]; return s.length > 28 ? s.slice(0, 27) + "…" : s; };
/** Texto da saída (rodovia ou zona rural) a partir de (x, z). */
export function exitText(pack, x = 0, z = 0) {
  const e = pack && pack.exit; if (!e) return "";
  const dx = e.x - x, dz = e.z - z, d = fmtKm(Math.hypot(dx, dz) * U), dir = dirTxt(pack, dx, dz);
  if (e.rural) return t(e.guess ? "exitGuess" : "exitRural", { d, dir });
  return t("exitInfo", { n: e.n || t("hwy"), d, dir });
}

/**
 * Telas para escolher o lugar. onPack(pack) recebe o pacote baixado (já confirmado).
 * opt: { kid, size (150|250), onSize(v), okLabel, title, extra(), footer(), onCancel }
 */
export function openPicker(opt) {
  addCss();
  let size = opt.size || 250;
  function start(msg) {
    const ta = h("textarea.sv-ta", { placeholder: t("cityPh"), rows: 3 });
    const err = h("p.ez-msg", { style: { color: "#ef4444", minHeight: "0" } }, msg || "");
    const sz = (v, label) => h("button.ez-chip" + (size === v ? ".sel" : ""), { onclick: () => { size = v; opt.onSize && opt.onSize(v); Audio.play("click"); scr.close(); start(); } }, label);
    let scr = null;
    scr = screen([
      h("h2", opt.title || t("cityT")),
      ...(opt.extra ? opt.extra() : []),
      ta, err,
      h("button.ez-btn.wide", { onclick: () => go(ta.value) }, t("cityGo")),
      opt.kid ? h("p.ez-msg", t("cityKidGps")) : h("button.ez-btn.blue.wide", { onclick: () => gps() }, t("cityGps")),
      h("button.ez-btn.gray.wide", { onclick: () => example() }, t("cityEx")),
      h("h3", t("citySize")), h("div.ez-row", sz(150, t("sizeS")), sz(250, t("sizeM"))),
      h("p.ez-msg", { style: { fontSize: "12px" } }, t("cityLinks")),
      ...(opt.footer ? opt.footer() : []),
    ]);
    addX(h, scr, () => { scr.close(); opt.onCancel && opt.onCancel(); });
    ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); go(ta.value); } });

    async function find(queries) {
      if (navigator.onLine === false) { err.textContent = t("geoOffline"); return null; }
      err.textContent = t("stFind");
      for (const q of queries) { if (!q) continue; try { const L = await geocode(q); if (L.length) return L; } catch (e) { err.textContent = navigator.onLine === false ? t("geoOffline") : t("geoBusy"); return null; } }
      return [];
    }
    async function example() {
      const L = await find(["Jardim Goiás, Goiânia", "Praça Tamandaré, Goiânia, Goiás"]); if (!L) return;
      if (!L.length) { err.textContent = t("geoNotFound"); return; }
      scr.close(); fetchArea(L[0].lat, L[0].lon, L[0].label);
    }
    async function go(text) {
      const p = parseInput(text);
      if (!p) { err.textContent = t("geoNotFound"); return; }
      if (p.short && !p.query) { err.textContent = t("short"); return; }
      if (p.lat != null) { scr.close(); fetchArea(p.lat, p.lon, p.label); return; }
      const L = await find([p.query, p.alt !== p.query ? p.alt : null]); if (!L) return;
      if (!L.length) { err.textContent = p.short ? t("short") : t("geoNotFound"); return; }
      scr.close();
      if (L.length === 1) fetchArea(L[0].lat, L[0].lon, L[0].label); else pickPlace(L);
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
    scr = screen([h("h2", t("pickOne")), h("div.ez-col", ...L.map((o) => h("button.ez-btn.gray.wide", { style: { textAlign: "left", fontSize: "14px" }, onclick: () => { scr.close(); fetchArea(o.lat, o.lon, o.label); } }, o.label)))], { x: () => { scr.close(); start(); } });
  }
  async function fetchArea(lat, lon, label) {
    const pct = h("div.sv-pct", "0%"), bar = h("i"), step = h("p.sv-step", t("stStreets")), info = h("p.ez-msg", { style: { textAlign: "center" } }, ""), warn = h("p.ez-msg", { style: { textAlign: "center", color: "#d97706" } }, "");
    const ab = new AbortController(), t0 = performance.now();
    let scr = null, lastAt = performance.now(), cur = { pct: 0, kb: 0, step: "stStreets" };
    const draw = () => {
      pct.textContent = cur.pct + "%"; bar.style.width = cur.pct + "%"; step.textContent = t(cur.step);
      info.textContent = t("dlInfo", { kb: cur.kb, s: Math.round((performance.now() - t0) / 1000) });
      warn.textContent = performance.now() - lastAt > 15000 ? t("slow") : "";
    };
    const tick = setInterval(draw, 500);
    scr = screen([h("h2", t("loading")), pct, h("div.sv-bar2", bar), step, info, warn, h("button.ez-btn.gray.wide", { onclick: () => { ab.abort(); clearInterval(tick); scr.close(); start(); } }, t("geoCancel"))]);
    try {
      const p = await loadPack(lat, lon, size, { signal: ab.signal, onProgress: (o) => { if (o.pct !== cur.pct || o.kb !== cur.kb) lastAt = performance.now(); cur = o; draw(); } });
      clearInterval(tick);
      p.label = label || "";
      if (!p.label) { let best = null; for (const r of p.roads) if (r.n) for (let i = 0; i < r.p.length; i += 2) { const d = Math.hypot(r.p[i] - p.user.x, r.p[i + 1] - p.user.z); if (!best || d < best.d) best = { d, n: r.n }; } p.label = (best && best.n) || t("cityT"); }
      cur = { pct: 100, kb: cur.kb, step: "stBuild" }; draw();
      scr.close(); preview(p);
    } catch (e) {
      clearInterval(tick);
      if (ab.signal.aborted) return;
      console.warn(e); scr.close();
      const kind = e && e.kind;
      let r = null;
      r = screen([h("h2", t("loading")), h("p", kind === "offline" ? t("geoOffline") : kind === "busy" ? t("geoBusy") : t("netErr")),
        h("button.ez-btn.wide", { onclick: () => { r.close(); fetchArea(lat, lon, label); } }, t("retry")),
        h("button.ez-btn.gray.wide", { onclick: () => { r.close(); start(); } }, t("geoOther"))], { x: () => { r.close(); start(); } });
    }
  }
  function preview(p) {
    const cv = h("canvas", { width: 600, height: 600, style: { width: "min(78vw, 44vh)", height: "min(78vw, 44vh)", display: "block", margin: "6px auto", borderRadius: "14px" } });
    const nIn = p.pois.filter((o) => o.in).length;
    let scr = null;
    scr = screen([
      h("h2", t("confirmT")), h("p", { style: { textAlign: "center", margin: "0" } }, "📍 " + shortLabel(p.label)), cv,
      h("p.ez-msg", { style: { textAlign: "center" } }, t("statsT", { r: p.roads.length, b: p.blds.length, p: nIn })),
      h("p.ez-msg", { style: { textAlign: "center" } }, exitText(p, p.user.x, p.user.z)),
      p.blds.length / ((4 * p.r * p.r) / 1e4) < 18 ? h("p.ez-msg", { style: { textAlign: "center" } }, "ℹ️ " + t("fewB")) : null,
      h("button.ez-btn.wide", { onclick: () => { scr.close(); opt.onPack(p); } }, opt.okLabel || t("playHere")),
      h("button.ez-btn.gray.wide", { onclick: () => { scr.close(); start(); } }, t("geoOther")),
      h("p.ez-msg", { style: { textAlign: "center", fontSize: "11px" } }, t("osm")),
    ], { x: () => { scr.close(); start(); } });
    drawMap(cv, p);
  }
  start();
}

/** Lista de locais estratégicos (com distância e direção a partir de x, z). */
export function placesList(pack, x, z) {
  const L = pack.pois.slice().map((o) => ({ ...o, dm: Math.hypot(o.x - x, o.z - z) * U }))
    .sort((a, b) => CAT_ORDER.indexOf(a.k) - CAT_ORDER.indexOf(b.k) || a.dm - b.dm);
  const per = {}, rows = [];
  for (const o of L) { per[o.k] = (per[o.k] || 0) + 1; if (per[o.k] > 3) continue; // até 3 por tipo, os mais perto
    rows.push(h("div", h("span", CATS[o.k].e), h("b", o.n || t("cat_" + o.k)), h("span", (o.in ? "" : "🧭 ") + fmtKm(o.dm) + " " + dirTxt(pack, o.x - x, o.z - z)))); }
  if (pack.exit) rows.unshift(h("div", h("b", exitText(pack, x, z))));
  return [h("p.ez-msg", t("placesInfo")), rows.length ? h("div.sv-list", ...rows) : h("p", t("noPlaces"))];
}

// =====================================================================================================
// Modo de testes "Explorar minha cidade" (?modo=cidade)
// =====================================================================================================
export function runExplorer() {
  addCss();
  registerPWA("../../sw.js");
  initGTM("GTM-54JJ46D9");
  const store = createStore("apagao");
  const cfg = Object.assign({ age: "kid", citySize: 250 }, store.getJSON("cfg", {}));
  const world = createWorld({ canvas: document.getElementById("c"), sky: 0xbfe3ff, fog: [90, 420], far: 650, shadowRange: 40 });
  const phys = createPhysics();
  const cam = createFollowCamera(world.camera, { phys, dist: 10, maxDist: 22 });
  let playing = false;
  const input = createInput({ canvas: world.renderer.domElement, enabled: () => playing, onLook: (dx, dy, tc) => cam.look(dx, dy, tc), onZoom: (d) => cam.zoom(d) });
  input.addButton({ label: "✋", action: "act", big: true, hold: false });
  input.addButton({ label: "⤒", action: "jump" });
  input.setVisible(false);
  const me = createPlayer({ world, phys, input, cam, look: loadLook(), spawn: { x: 0, y: 0.4, z: 0 } });
  let city = null, pack = null, bots = [], items = [], bagN = 0;
  let tmpGround = phys.addBox({ x: 0, y: -0.5, z: 0, w: 200, h: 1, d: 200, color: 0x9bbf63, scene: world.scene, castShadow: false });

  const placePill = h("div.ez-pill"), exitPill = h("div.ez-pill"), bagPill = h("div.ez-pill");
  const btn = (e, fn, title) => h("button.ez-rbtn", { title, onclick: fn }, e);
  const mini = h("canvas.sv-mini", { width: 180, height: 180, onclick: () => openBigMap() });
  const prompt = h("div.sv-prompt.ez-hidden");
  const hud = h("div.ez-hud.ez-hidden",
    h("div.ez-top", placePill, exitPill, bagPill, h("div.ez-spacer"), btn("🗺️", () => openBigMap(), "M"), btn("📋", () => openPlaces(), "L"), btn("✕", () => openMenu(), t("menuT"))),
    mini, prompt, h("div.sv-osm", t("osm")));
  document.body.appendChild(hud);
  const updHud = () => { if (!pack) return; placePill.textContent = "📍 " + shortLabel(pack.label); exitPill.textContent = exitText(pack, me.x, me.z); bagPill.textContent = t("bagN", { n: bagN }); };

  function showStart(msg) {
    playing = false; hud.classList.add("ez-hidden"); input.setVisible(false);
    const chip = (v, label) => h("button.ez-chip" + (cfg.age === v ? ".sel" : ""), { onclick: () => { cfg.age = v; store.setJSON("cfg", cfg); Audio.play("click"); document.querySelectorAll(".ez-screen").forEach((e) => e.remove()); showStart(); } }, label);
    openPicker({
      kid: cfg.age !== "teen", size: cfg.citySize, onSize: (v) => { cfg.citySize = v; store.setJSON("cfg", cfg); },
      extra: () => [h("p.ez-msg", { style: { textAlign: "center" } }, "🧪 " + t("cityTest")), msg ? h("p.ez-msg", { style: { color: "#ef4444" } }, msg) : null, h("h3", t("age")), h("div.ez-row", chip("kid", t("age_kid")), chip("teen", t("age_teen")))],
      footer: () => [h("button.ez-btn.gray.wide", { onclick: () => { location.href = "./"; } }, t("toMain")), gameLinks(t("title"))],
      onPack: play, onCancel: () => { location.href = "./"; },
    });
  }
  const LOOT = { house: ["water", "can", "biscuit", "kit", "candle", "batt", "matches", "bottle"], market: ["water", "can", "biscuit", "rice"], bakery: ["biscuit", "bread"], pharmacy: ["kit", "ors", "kit"], hospital: ["kit", "ors"], fuel: ["gascan", "water"], hardware: ["flash", "batt", "candle", "matches"], water: ["water"], school: ["water", "biscuit"] };
  const EMO = { water: "💧", can: "🥫", biscuit: "🍪", kit: "🩹", candle: "🕯️", batt: "🔋", matches: "🔥", bottle: "🍶", rice: "🍚", bread: "🍞", ors: "🧂", gascan: "⛽", flash: "🔦" };
  function play(p) {
    pack = p;
    if (city) city.dispose();
    if (tmpGround) { phys.removeBox(tmpGround); tmpGround = null; }
    bots.forEach((b) => world.scene.remove(b.ch.root)); bots = [];
    items.forEach((it) => world.scene.remove(it.sp)); items = [];
    const t0 = performance.now();
    city = buildOsmCity(world, phys, p, { seed: "explorar" });
    console.info("[cidade] mundo gerado em", Math.round(performance.now() - t0), "ms", JSON.stringify(city.stats));
    // itens (casas abertas/com porta: 30% têm algo; lojas: muitos do tipo da loja)
    for (const s of city.lootSlots) {
      const L = LOOT[s.kind === "house" ? "house" : s.cat] || LOOT.house, k = L[Math.floor(city.rand() * L.length)];
      const sp = sign(EMO[k], "rgba(15,23,42,.55)", 0.32); sp.position.set(s.x, 1.1, s.z); world.scene.add(sp); items.push({ k, sp, x: s.x, z: s.z });
    }
    // pessoas andando pelas ruas
    const nB = Math.min(city.botPoints.length, isMobile ? 6 : 10);
    for (let i = 0; i < nB; i++) { const q = city.botPoints[Math.floor(city.rand() * city.botPoints.length)];
      bots.push(createBot({ world, phys, look: randomLook(""), area: { x0: q.x - 14, z0: q.z - 14, x1: q.x + 14, z1: q.z + 14 }, speed: 0.3 + city.rand() * 0.25 })); }
    me.spawn = { ...city.spawn }; me.respawn(city.spawn);
    playing = true; hud.classList.remove("ez-hidden"); input.setVisible(true); world.setPaused(false);
    Audio.init(); updHud();
    track("game_start", { mode: "city", age_band: cfg.age, area: p.r });
    if (!store.get("cityHow2")) { store.set("cityHow2", "1"); const s = screen([h("h2", t("cityT")), h("p", t("cityHow")), h("button.ez-btn.wide", { onclick: () => s.close() }, "OK")], { x: true }); }
  }
  function pauseFor(fn) { const was = playing; playing = false; input.setVisible(false); fn(() => { if (was) { playing = true; input.setVisible(true); } }); }
  function openMenu() {
    pauseFor((resume) => {
      let scr = null; const back = () => { scr.close(); resume(); };
      scr = screen([h("h2", t("menuT")),
        h("button.ez-btn.wide", { onclick: back }, t("cont")),
        h("button.ez-btn.blue.wide", { onclick: () => { scr.close(); showStart(); } }, t("geoOther")),
        h("button.ez-btn.gray.wide", { onclick: () => { scr.close(); openSettings({ world, onClose: () => openMenu() }); } }, "⚙️"),
        h("button.ez-btn.gray.wide", { onclick: () => { location.href = "./"; } }, t("toMain")),
      ], { x: back });
    });
  }
  function openBigMap() {
    if (!pack) return;
    pauseFor((resume) => {
      const cv = h("canvas", { width: 700, height: 700, style: { width: "min(86vw, 62vh)", height: "min(86vw, 62vh)", display: "block", margin: "0 auto", borderRadius: "14px" } });
      let scr = null; const close = () => { scr.close(); resume(); };
      scr = screen([h("h2", "🗺️ " + shortLabel(pack.label)), cv, h("p.ez-msg", { style: { textAlign: "center" } }, exitText(pack, me.x, me.z)), h("button.ez-btn.wide", { onclick: close }, "OK")], { x: close });
      drawMap(cv, pack, { me: { x: me.x, z: me.z } });
    });
  }
  function openPlaces() {
    if (!pack) return;
    pauseFor((resume) => { let scr = null; const close = () => { scr.close(); resume(); };
      scr = screen([h("h2", t("placesT")), ...placesList(pack, me.x, me.z), h("button.ez-btn.wide", { onclick: close }, "OK")], { x: close }); });
  }

  let hudT = 0, miniT = 0;
  world.onUpdate((dt) => {
    if (playing) {
      me.update(dt);
      // interação: item no chão > porta
      let act = null, bi = -1, bd = 2.2;
      items.forEach((it, i) => { const d = Math.hypot(it.x - me.x, it.z - me.z); if (d < bd) { bd = d; bi = i; } });
      if (bi >= 0) { const it = items[bi]; act = { txt: t("pickIt", { x: EMO[it.k] }), fn: () => { world.scene.remove(it.sp); items.splice(bi, 1); bagN++; Audio.play("coin"); updHud(); } }; }
      else if (city) { const d = city.nearDoor(me.x, me.z); if (d) act = { txt: t(d.open ? "osmDoorClose" : "osmDoorOpen"), fn: () => { city.toggleDoor(d); Audio.play("click"); } }; }
      prompt.classList.toggle("ez-hidden", !act);
      if (act) { prompt.textContent = "✋ " + act.txt; if (input.pressed("act")) act.fn(); }
      if (city) city.setInside(city.insideHollow(me.x, me.z));
    }
    bots.forEach((b) => b.update(dt));
    items.forEach((it) => (it.sp.position.y = 1.1 + Math.sin(performance.now() / 350 + it.x) * 0.1));
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
  window.GAME = { world, phys, me, get city() { return city; }, get pack() { return pack; }, get items() { return items; }, play, parseInput, loadPack };
}
