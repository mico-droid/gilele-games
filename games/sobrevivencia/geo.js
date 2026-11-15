// "Jogar na minha cidade" — dados geográficos (PoC).
// Fonte dos dados: OpenStreetMap (Overpass API). Busca de endereço: Nominatim (OSM).
// O link do Google Maps (ou de outro app) serve SÓ para ler as coordenadas: nenhum dado do Google é usado.
//
//   parseInput(texto)          → { lat, lon, label } | { query } | { short:true, query? } | null
//   geocode(texto)             → [{ lat, lon, label }]   (Nominatim, 1 pedido por clique do jogador)
//   loadPack(lat, lon, rM)     → "pacote do mapa" (formato próprio, compacto e determinístico; cache local)
//
// Pacote do mapa v1 (coordenadas em unidades do jogo: 1 u = 0,5 m; x = leste, z = sul; origem = centro do bloco):
//   { v, id, c:[lat,lon], r (m), date, roads:[{k,w,n,p:[x,z,…]}], blds:[{id,p,h,k,n,g}], areas:[{k,p}],
//     pois:[{id,k,n,x,z,d,in}], exit:{n,x,z,d}|null, user:{x,z} }
// Cada local tem o ID do OSM ("n123"/"w456") e uma categoria normalizada: é o gancho para itens, loja,
// afiliados e mapas premium no futuro (tabela categoria → conteúdo), sem mudar o formato.

export const PACK_V = 2;
export const U = 0.5;                // metros por unidade (igual ao M_PER_UNIT do jogo)
const GRID = 0.001;                  // o centro "encaixa" numa grade de ~110 m → o mesmo lugar gera sempre o mesmo bloco
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"];
const NOMINATIM = "https://nominatim.openstreetmap.org/search";

// ---------------------------------------------------------------- categorias estratégicas
export const CATS = {
  market: { e: "🛒", c: "#16a34a", wall: "#bbf7d0" },
  bakery: { e: "🥖", c: "#d97706", wall: "#fde68a" },
  pharmacy: { e: "💊", c: "#0d9488", wall: "#99f6e4" },
  hospital: { e: "🏥", c: "#dc2626", wall: "#fecaca" },
  police: { e: "🚓", c: "#1d4ed8", wall: "#bfdbfe" },
  fire: { e: "🚒", c: "#b91c1c", wall: "#fca5a5" },
  fuel: { e: "⛽", c: "#ea580c", wall: "#fed7aa" },
  bank: { e: "🏦", c: "#4338ca", wall: "#c7d2fe" },
  atm: { e: "🏧", c: "#4f46e5", wall: "#c7d2fe" },
  hardware: { e: "🔧", c: "#78716c", wall: "#e7e5e4" },
  water: { e: "🚰", c: "#0284c7", wall: "#bae6fd" },
  school: { e: "🏫", c: "#ca8a04", wall: "#fef08a" },
  news: { e: "📰", c: "#1d4ed8", wall: "#bfdbfe" },   // banca (só genérica, no Apagão Real)
};
/** Ordem de importância para a sobrevivência (lista de "locais estratégicos"). */
export const CAT_ORDER = ["market", "pharmacy", "fuel", "hospital", "police", "water", "hardware", "bakery", "bank", "atm", "fire", "school"];

function catOf(tg) {
  if (!tg) return null;
  const a = tg.amenity, s = tg.shop;
  if (s === "supermarket" || s === "convenience" || s === "greengrocer" || s === "butcher" || s === "wholesale" || s === "general") return "market";
  if (s === "bakery") return "bakery";
  if (a === "pharmacy" || s === "chemist") return "pharmacy";
  if (a === "hospital" || a === "clinic" || a === "doctors") return "hospital";
  if (a === "police") return "police";
  if (a === "fire_station") return "fire";
  if (a === "fuel") return "fuel";
  if (a === "bank") return "bank";
  if (a === "atm") return "atm";
  if (s === "hardware" || s === "doityourself") return "hardware";
  if (a === "drinking_water") return "water";
  if (a === "school") return "school";
  return null;
}
const AMEN = "pharmacy|hospital|clinic|doctors|police|fire_station|fuel|bank|atm|drinking_water|school";
const SHOPS = "supermarket|convenience|greengrocer|butcher|wholesale|general|bakery|chemist|hardware|doityourself";

// ---------------------------------------------------------------- entrada do jogador
const num = (s) => parseFloat(String(s).replace(",", "."));
const okLL = (a, b) => isFinite(a) && isFinite(b) && Math.abs(a) <= 90 && Math.abs(b) <= 180 && !(a === 0 && b === 0);

/**
 * Entende: links do Google Maps (longos, com @lat,lng / !3d!4d / q= / ll= / query=), OpenStreetMap, Apple Maps,
 * Waze, geo:, coordenadas soltas ("-16.68, -49.25") e texto livre (vira busca).
 * Links curtos (maps.app.goo.gl) não trazem coordenadas e o navegador não consegue abri-los por dentro:
 * nesse caso usamos o texto que veio junto (nome/endereço) ou pedimos o link completo.
 */
export function parseInput(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  const dec = (v) => { try { return decodeURIComponent(v); } catch (e) { return v; } };
  const urlM = s.match(/(https?:\/\/\S+|geo:\S+)/i), url = urlM ? dec(urlM[1]) : "";
  const rest = (urlM ? s.replace(urlM[1], " ") : s).replace(/\s+/g, " ").trim();
  const words = (v) => v.replace(/\+/g, " ").replace(/\s+/g, " ").trim();
  let place = "";
  const P = /\/place\/([^/@?]+)/.exec(url); if (P) place = words(P[1]);
  const pick = (re) => { const m = re.exec(url || s); return m && okLL(num(m[1]), num(m[2])) ? { lat: num(m[1]), lon: num(m[2]) } : null; };
  const F = "(-?\\d{1,2}(?:[.,]\\d+)?)", G = "(-?\\d{1,3}(?:[.,]\\d+)?)";
  // ordem de preferência: pino do lugar → parâmetros → centro da tela
  const ll = pick(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || pick(new RegExp("[?&](?:q|query|ll|sll|center|destination|daddr|mlat)=" + F + "\\s*(?:,|%2C|&mlon=)\\s*" + G, "i"))
    || pick(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || pick(/#map=\d+(?:\.\d+)?\/(-?\d+\.\d+)\/(-?\d+\.\d+)/) || pick(/geo:(-?\d+\.\d+),(-?\d+\.\d+)/i)
    || (!url ? pick(new RegExp("^\\s*" + F + "\\s*[,; ]\\s*" + G + "\\s*$")) : null);
  if (ll) return { ...ll, label: place || (url && rest && rest.length < 80 ? rest : "") };
  if (url && /goo\.gl|app\.goo|g\.co\/|maps\.app/i.test(url)) {
    // o app do Google Maps costuma mandar "Nome\nEndereço\nlink": buscamos pelo texto
    const lines = (urlM ? s.replace(urlM[1], "\n") : s).split(/\n+/).map((l) => l.trim()).filter((l) => l.length >= 3);
    return { short: true, query: place || lines.join(", "), alt: lines[0] || "" };
  }
  const q = /[?&](?:q|query)=([^&#]+)/i.exec(url); if (q && words(q[1]).length >= 3) return { query: words(q[1]) };
  if (place) return { query: place };
  if (!url && rest.length >= 3) return { query: rest };
  return null;
}

let lastGeo = 0;
const geoCache = new Map();
/** Busca de endereço/lugar (Nominatim). Só por clique do jogador, no máximo 1 pedido por segundo e sem autocompletar (regra do serviço). */
export async function geocode(q) {
  q = q.trim(); if (geoCache.has(q)) return geoCache.get(q);
  const wait = 1100 - (Date.now() - lastGeo); if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastGeo = Date.now();
  const url = NOMINATIM + "?format=jsonv2&limit=5&accept-language=pt-BR,pt,en&q=" + encodeURIComponent(q);
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error("geo " + r.status);
  const L = (await r.json()).map((o) => ({ lat: +o.lat, lon: +o.lon, label: o.display_name }));
  geoCache.set(q, L); return L;
}

// ---------------------------------------------------------------- projeção local (metros → unidades)
export function projector(lat0, lon0) {
  const kx = 111320 * Math.cos((lat0 * Math.PI) / 180) / U, kz = 110540 / U;
  return { x: (lon) => (lon - lon0) * kx, z: (lat) => -(lat - lat0) * kz, lon: (x) => lon0 + x / kx, lat: (z) => lat0 - z / kz };
}
const r1 = (v) => Math.round(v * 10) / 10;

// ---------------------------------------------------------------- Overpass (com progresso)
/** Erro com tipo para a tela: "offline" (sem internet), "busy" (servidor ocupado/lento) ou "other". */
export function netError(kind, msg) { const e = new Error(msg || kind); e.kind = kind; return e; }
async function overpass(q, { signal, onBytes } = {}) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw netError("offline");
  let err = null;
  for (const ep of OVERPASS) {
    const ac = new AbortController(); let tm = setTimeout(() => ac.abort(), 70000);
    const stop = () => ac.abort(); if (signal) signal.addEventListener("abort", stop);
    try {
      // POST com form-urlencoded = pedido "simples" (sem preflight de CORS)
      const r = await fetch(ep, { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded" }, signal: ac.signal });
      if (!r.ok) { err = netError(r.status === 429 || r.status >= 500 ? "busy" : "other", "overpass " + r.status); continue; }
      // lê aos pedaços para mostrar quanto já chegou
      let text = "";
      if (r.body && r.body.getReader) {
        const rd = r.body.getReader(), dec = new TextDecoder(); let n = 0;
        for (;;) { const { done, value } = await rd.read(); if (done) break; n += value.length; text += dec.decode(value, { stream: true }); onBytes && onBytes(n); clearTimeout(tm); tm = setTimeout(() => ac.abort(), 45000); }
        text += dec.decode();
      } else text = await r.text();
      const j = JSON.parse(text);
      if (j && Array.isArray(j.elements)) { if (j.remark && /timed out|out of memory/i.test(j.remark) && !j.elements.length) { err = netError("busy", j.remark); continue; } return j; }
      err = netError("other", "overpass json");
    } catch (e) {
      if (signal && signal.aborted) throw e;
      err = e && e.kind ? e : netError(typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : e && e.name === "AbortError" ? "busy" : "offline", String(e && e.message));
    } finally { clearTimeout(tm); if (signal) signal.removeEventListener("abort", stop); }
  }
  throw err || netError("other");
}

// ---------------------------------------------------------------- cache local (últimos blocos)
const CK = "sv:geo:";
function cacheGet(id) { try { const s = localStorage.getItem(CK + id); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function cachePut(id, pack) {
  try {
    const idx = JSON.parse(localStorage.getItem(CK + "idx") || "[]").filter((k) => k !== id); idx.unshift(id);
    while (idx.length > 4) localStorage.removeItem(CK + idx.pop());
    localStorage.setItem(CK + id, JSON.stringify(pack)); localStorage.setItem(CK + "idx", JSON.stringify(idx));
  } catch (e) { /* armazenamento cheio: segue sem cache */ }
}

/** Distância (m) entre dois pontos lat/lon. */
export function distM(a, b, c, d) {
  const R = 6371000, p = Math.PI / 180, x = (d - b) * p * Math.cos(((a + c) / 2) * p), y = (c - a) * p;
  return Math.hypot(x, y) * R;
}

/**
 * Baixa (ou lê do cache) o bloco ao redor de (lat, lon). rM = raio jogável em metros (150–300).
 * onProgress({ pct 0–100, step, kb }) alimenta a barra de carregamento.
 */
export async function loadPack(lat, lon, rM = 250, { onProgress, signal } = {}) {
  const cLat = Math.round(lat / GRID) * GRID, cLon = Math.round(lon / GRID) * GRID;
  const id = `${Math.round(cLat / GRID)}_${Math.round(cLon / GRID)}_${rM}`;
  const P = projector(cLat, cLon), user = { x: r1(P.x(lon)), z: r1(P.z(lat)) };
  const hit = cacheGet(id);
  if (hit && hit.v === PACK_V) return { ...hit, user };
  const prog = (pct, step, kb) => onProgress && onProgress({ pct: Math.min(99, Math.round(pct)), step, kb: Math.round(kb || 0) });

  const dLat = rM / 110540, dLon = rM / (111320 * Math.cos((cLat * Math.PI) / 180));
  const bb = [cLat - dLat, cLon - dLon, cLat + dLat, cLon + dLon].map((v) => v.toFixed(6)).join(",");
  const C = `${cLat.toFixed(6)},${cLon.toFixed(6)}`;
  // 1) bloco jogável: ruas, construções, áreas verdes/água e os locais estratégicos (até 2,5 km)
  const est = rM >= 250 ? 900e3 : 380e3; let got = 0;   // tamanho típico da resposta (para a %)
  prog(3, "stStreets", 0);
  const qa = `[out:json][timeout:50];
(way["highway"](${bb});way["building"](${bb});way["leisure"~"^(park|pitch|playground|garden)$"](${bb});way["landuse"~"^(grass|forest|meadow|recreation_ground)$"](${bb});way["natural"~"^(water|wood|scrub)$"](${bb}););
out tags geom qt;
(nwr["amenity"~"^(${AMEN})$"](around:2500,${C});nwr["shop"~"^(${SHOPS})$"](around:2500,${C}););
out tags center qt;`;
  const A = await overpass(qa, { signal, onBytes: (n) => { got = n; prog(3 + 67 * (1 - Math.exp(-n / est)), "stStreets", n / 1024); } });
  // 2) rodovia de saída mais próxima (BR/GO/SP-…, ou via expressa/rodovia troncal)
  prog(72, "stExit", got / 1024);
  let H = null;
  for (const rad of [4000, 15000]) {
    try {
      const qh = `[out:json][timeout:40];(way["highway"~"^(motorway|trunk|primary|motorway_link|trunk_link)$"]["ref"~"^[A-Z]{2,3}-? ?[0-9]"](around:${rad},${C});way["highway"~"^(motorway|trunk)$"](around:${rad},${C}););out tags geom(${(cLat - rad / 110540).toFixed(5)},${(cLon - rad / 100000).toFixed(5)},${(cLat + rad / 110540).toFixed(5)},${(cLon + rad / 100000).toFixed(5)}) qt;`;
      H = await overpass(qh, { signal, onBytes: (n) => prog(72 + (rad > 4000 ? 8 : 0) + 8 * (1 - Math.exp(-n / 200e3)), "stExit", (got + n) / 1024) });
      if (H.elements.length) break;
    } catch (e) { if (signal && signal.aborted) throw e; H = null; break; }
  }
  // 3) sem rodovia: para que lado fica a zona rural mais perto?
  let Ru = null;
  if (!H || !H.elements.length) {
    prog(90, "stRural", got / 1024);
    try {
      const qr = `[out:json][timeout:40];(way["landuse"~"^(farmland|farmyard|meadow|orchard|plantation|forest)$"](around:9000,${C});node["place"~"^(village|hamlet|farm|isolated_dwelling)$"](around:15000,${C}););out tags center qt;`;
      Ru = await overpass(qr, { signal });
    } catch (e) { if (signal && signal.aborted) throw e; Ru = null; }
  }
  prog(96, "stBuild", got / 1024);
  const pack = toPack(A, H, Ru, { id, cLat, cLon, rM, P });
  cachePut(id, pack);
  return { ...pack, user };
}
/** Guarda o bloco do jogo salvo (não sai do cache quando o jogador abre outros lugares). */
// slot "game" = mapa do jogo salvo; "pick" = lugar escolhido na tela de novo jogo (ainda não começou)
export function pinPack(pack, slot = "game") { try { localStorage.setItem(CK + slot, JSON.stringify(pack)); return true; } catch (e) { return false; } }
export function pinnedPack(slot = "game") { try { const s = localStorage.getItem(CK + slot); const p = s && JSON.parse(s); return p && p.v === PACK_V ? p : null; } catch (e) { return null; } }

const ROADW = { motorway: 14, trunk: 12, primary: 11, secondary: 10, tertiary: 8, unclassified: 7, residential: 7, living_street: 6, service: 4, track: 3, pedestrian: 5, footway: 2, path: 1.6, cycleway: 2, steps: 2, motorway_link: 7, trunk_link: 7, primary_link: 7, secondary_link: 7, tertiary_link: 6 };
const SKIP_ROAD = /^(proposed|construction|abandoned|razed|platform|bus_stop|elevator|corridor|raceway)$/;

function levelsOf(tg, areaM2) {
  const hM = num(tg.height); if (isFinite(hM) && hM > 1) return Math.min(60, hM / 3);
  const lv = num(tg["building:levels"]); if (isFinite(lv) && lv > 0) return Math.min(50, lv);
  const b = tg.building;
  if (b === "apartments" || b === "hotel" || b === "office") return 6;
  if (b === "commercial" || b === "retail" || b === "school" || b === "hospital" || b === "university" || b === "public" || b === "civic") return 2;
  if (b === "industrial" || b === "warehouse" || b === "supermarket") return 2;
  if (b === "roof" || b === "carport" || b === "shed" || b === "garage" || b === "garages") return 1;
  return areaM2 > 900 ? 2 : 1;
}
function polyArea(p) { let a = 0; for (let i = 0, n = p.length / 2; i < n; i++) { const j = (i + 1) % n; a += p[2 * i] * p[2 * j + 1] - p[2 * j] * p[2 * i + 1]; } return a / 2; }

/** Converte a resposta do Overpass no pacote do mapa (ordenado por ID → determinístico). */
function toPack(A, H, Ru, { id, cLat, cLon, rM, P }) {
  const R = rM / U, lim = R * 1.15, roads = [], blds = [], areas = [], poiMap = new Map();
  const els = A.elements.slice().sort((a, b) => (a.type + a.id < b.type + b.id ? -1 : 1));
  const path = (geom) => { const p = []; for (const g of geom || []) if (g) { p.push(r1(P.x(g.lon)), r1(P.z(g.lat))); } return p; };
  const inside = (x, z) => Math.abs(x) <= R && Math.abs(z) <= R;
  for (const e of els) {
    const tg = e.tags || {}, key = (e.type === "node" ? "n" : e.type === "way" ? "w" : "r") + e.id;
    if (e.type === "way" && e.geometry) {
      const p = path(e.geometry); if (p.length < 4) continue;
      let any = false; for (let i = 0; i < p.length; i += 2) if (Math.abs(p[i]) < lim && Math.abs(p[i + 1]) < lim) { any = true; break; }
      if (!any) continue;
      if (tg.highway && !SKIP_ROAD.test(tg.highway) && tg.area !== "yes") {
        const k = tg.highway, w = ROADW[k] || 5;
        roads.push({ k, w: (num(tg.width) > 1 ? Math.min(30, num(tg.width)) : w) / U, n: tg.name || tg.ref || "", p, b: tg.bridge === "yes" ? 1 : 0 });
        continue;
      }
      if (tg.building && tg.building !== "no") {
        if (p.length >= 8 && p[0] === p[p.length - 2] && p[1] === p[p.length - 1]) p.length -= 2; // fecha o anel sem repetir o 1º ponto
        if (p.length < 6) continue;
        const aM2 = Math.abs(polyArea(p)) * U * U; if (aM2 < 6) continue;
        const k = catOf(tg);
        blds.push({ id: key, p, h: r1(levelsOf(tg, aM2)), k, n: tg.name || "" });
        if (k) poiMap.set(key, { id: key, k, n: tg.name || "", x: r1(cx(p)), z: r1(cz(p)) });
        continue;
      }
      const ak = tg.natural === "water" ? "water" : tg.leisure === "pitch" ? "pitch" : tg.natural === "wood" || tg.landuse === "forest" ? "wood" : "green";
      if (p.length >= 6) areas.push({ k: ak, p });
      continue;
    }
    // locais estratégicos (também os de fora do bloco, até 2,5 km)
    const k = catOf(tg); if (!k) continue;
    const ll = e.type === "node" ? e : e.center; if (!ll) continue;
    poiMap.set(key, { id: key, k, n: tg.name || tg.brand || tg.operator || "", x: r1(P.x(ll.lon)), z: r1(P.z(ll.lat)) });
  }
  const pois = [...poiMap.values()].map((o) => ({ ...o, d: Math.round(Math.hypot(o.x, o.z) * U), in: inside(o.x, o.z) ? 1 : 0 }))
    .sort((a, b) => a.d - b.d || (a.id < b.id ? -1 : 1));
  // rodovia de saída: ponto mais próximo do centro
  let exit = null;
  if (H) for (const e of H.elements) {
    const p = path(e.geometry); const tg = e.tags || {};
    for (let i = 0; i + 3 < p.length; i += 2) {
      const q = nearestOnSeg(0, 0, p[i], p[i + 1], p[i + 2], p[i + 3]), d = Math.hypot(q[0], q[1]) * U;
      if (!exit || d < exit.d) exit = { n: tg.ref || tg.name || "", x: r1(q[0]), z: r1(q[1]), d: Math.round(d), k: tg.highway };
    }
  }
  // sem rodovia: lado (N/L/S/O) com zona rural mais perto (lavoura, pasto, mata, sítios, povoados)
  if (!exit && Ru && Ru.elements.length) {
    const side = {};
    for (const e of Ru.elements) {
      const ll = e.type === "node" ? e : e.center; if (!ll) continue;
      const x = P.x(ll.lon), z = P.z(ll.lat), d = Math.hypot(x, z) * U; if (d < 300) continue;
      const k = Math.abs(x) > Math.abs(z) ? (x > 0 ? "E" : "W") : z > 0 ? "S" : "N";
      const s = side[k] || (side[k] = { n: 0, best: null }); s.n++;
      if (!s.best || d < s.best.d) s.best = { x: r1(x), z: r1(z), d: Math.round(d) };
    }
    // o mais perto vence; empate (±15%) desempata por quantidade de áreas rurais
    let pick = null;
    for (const k in side) { const s = side[k]; if (!pick || s.best.d < pick.best.d * 0.85 || (s.best.d < pick.best.d * 1.15 && s.n > pick.n)) pick = { k, ...s }; }
    if (pick) exit = { n: "", rural: 1, side: pick.k, x: pick.best.x, z: pick.best.z, d: pick.best.d };
  }
  // último recurso: o lado do bloco com menos construções (rumo à periferia)
  if (!exit) {
    const cnt = { N: 0, S: 0, E: 0, W: 0 };
    for (const b of blds) { const x = cx(b.p), z = cz(b.p); cnt[Math.abs(x) > Math.abs(z) ? (x > 0 ? "E" : "W") : z > 0 ? "S" : "N"]++; }
    const k = Object.keys(cnt).sort((a, b) => cnt[a] - cnt[b])[0], D = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] }[k];
    exit = { n: "", rural: 1, guess: 1, side: k, x: D[0] * R * 3, z: D[1] * R * 3, d: Math.round(R * 3 * U) };
  }
  const edge = [-R, -R, R, -R, R, R, -R, R].map(r1);
  return { v: PACK_V, id, c: [cLat, cLon], r: rM, date: new Date().toISOString().slice(0, 10), roads, blds, areas, pois, exit, edge, src: "© OpenStreetMap contributors (ODbL)" };
}
function cx(p) { let s = 0; for (let i = 0; i < p.length; i += 2) s += p[i]; return s / (p.length / 2); }
function cz(p) { let s = 0; for (let i = 1; i < p.length; i += 2) s += p[i]; return s / (p.length / 2); }
export function nearestOnSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz; let t = L ? ((px - ax) * dx + (pz - az) * dz) / L : 0;
  t = Math.max(0, Math.min(1, t)); return [ax + dx * t, az + dz * t];
}
/** Direção cardeal (N, NE, L, SE, S, SO, O, NO) de um vetor (x = leste, z = sul). */
export function dirOf(x, z, labels = ["N", "NE", "L", "SE", "S", "SO", "O", "NO"]) {
  const a = (Math.atan2(x, -z) * 180) / Math.PI; return labels[((Math.round(a / 45) % 8) + 8) % 8];
}

// ---------------------------------------------------------------- encaixe do "quarteirão de casa" do Apagão Real
/** Direção cardeal levando em conta a rotação do mapa (fitHome). */
export function dirFrom(pack, x, z, labels) {
  const f = pack && pack.frame; if (f) { const X = x * f.u[0] + z * f.w[0], Z = x * f.u[1] + z * f.w[1]; x = X; z = Z; }
  return dirOf(x, z, labels);
}
/**
 * Gira/move o mapa para o quarteirão do jogador (prédio, vizinhos, garagem — city.js com homeOnly) caber
 * de frente para uma rua real perto do ponto escolhido. No sistema novo a rua fica em z ≈ 20 + meia largura
 * (como a rua sul do mapa padrão) e o quarteirão ocupa x ∈ [-24, 24], z ∈ [-24, 19]; o que estiver ali sai.
 * Devolve um novo pacote (mesmo formato) com frame = { u, w, O } e o encaixe é determinístico.
 */
export function fitHome(pack, box = { x0: -24, x1: 24, z0: -24, z1: 19 }) {
  const R = pack.r / U, user = pack.user || { x: 0, z: 0 };
  const segs = [];
  for (const r of pack.roads) { if (!/^(residential|living_street|unclassified|tertiary|secondary|primary|service)$/.test(r.k)) continue;
    for (let i = 0; i + 3 < r.p.length; i += 2) segs.push({ r, ax: r.p[i], az: r.p[i + 1], bx: r.p[i + 2], bz: r.p[i + 3] }); }
  const toL = (O, u, w, x, z) => { const dx = x - O[0], dz = z - O[1]; return [dx * u[0] + dz * u[1], dx * w[0] + dz * w[1]]; };
  let best = null;
  for (const sg of segs) {
    const dx = sg.bx - sg.ax, dz = sg.bz - sg.az, L = Math.hypot(dx, dz); if (L < 54) continue;
    const mx = (sg.ax + sg.bx) / 2, mz = (sg.az + sg.bz) / 2, dist0 = Math.hypot(mx - user.x, mz - user.z); if (dist0 > 320) continue;
    for (const side of [1, -1]) {
      let u = [dx / L, dz / L]; const v = [-u[1] * side, u[0] * side], w = [-v[0], -v[1]];
      if (u[0] * w[1] - u[1] * w[0] < 0) u = [-u[0], -u[1]];          // mantém a mão (sem espelhar o mapa)
      const off = sg.r.w / 2 + 20, O = [mx + v[0] * off, mz + v[1] * off];
      // o quarteirão inteiro tem de ficar dentro do bloco
      let ok = true; for (const [a, b] of [[box.x0, box.z0], [box.x1, box.z0], [box.x0, box.z1], [box.x1, box.z1]]) { const X = O[0] + a * u[0] + b * w[0], Z = O[1] + a * u[1] + b * w[1]; if (Math.abs(X) > R - 16 || Math.abs(Z) > R - 16) ok = false; }
      if (!ok) continue;
      let pen = 0;
      for (const r of pack.roads) { if (r === sg.r) continue; for (let i = 0; i < r.p.length; i += 2) { const [x, z] = toL(O, u, w, r.p[i], r.p[i + 1]); if (x > box.x0 - 2 && x < box.x1 + 2 && z > box.z0 - 2 && z < box.z1) pen += /^(footway|path|steps|cycleway|service)$/.test(r.k) ? 15 : 400; } }
      for (const b of pack.blds) { const [x, z] = toL(O, u, w, b.p[0], b.p[1]); if (x > box.x0 && x < box.x1 && z > box.z0 && z < box.z1) pen += b.k ? 200 : 6; }
      const score = dist0 + pen + (/^(residential|living_street)$/.test(sg.r.k) ? 0 : 40);
      if (!best || score < best.score) best = { score, O, u, w };
    }
  }
  if (!best) best = { O: [user.x, user.z], u: [1, 0], w: [0, 1] };
  const { O, u, w } = best, T = (x, z) => toL(O, u, w, x, z).map((v) => Math.round(v * 10) / 10);
  const tp = (p) => { const o = []; for (let i = 0; i < p.length; i += 2) o.push(...T(p[i], p[i + 1])); return o; };
  const inBox = (p, m = 1) => { for (let i = 0; i < p.length; i += 2) { const x = p[i], z = p[i + 1]; if (x > box.x0 - m && x < box.x1 + m && z > box.z0 - m && z < box.z1 + 1) return true; } return false; };
  const roads = pack.roads.map((r) => ({ ...r, p: tp(r.p) })).filter((r) => !(/^(footway|path|steps|cycleway|service)$/.test(r.k) && inBox(r.p, 0)));
  const blds = pack.blds.map((b) => ({ ...b, p: tp(b.p) })).filter((b) => !inBox(b.p, 2));
  const pt = (o) => { const [x, z] = T(o.x, o.z); return { ...o, x, z }; };
  return { ...pack, roads, blds, areas: pack.areas.map((a) => ({ ...a, p: tp(a.p) })), pois: pack.pois.map(pt), exit: pack.exit && pt(pack.exit),
    user: { x: 0, z: 0 }, edge: tp(pack.edge), frame: { u, w, O }, home: box };
}
