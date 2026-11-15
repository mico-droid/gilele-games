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

export const PACK_V = 1;
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

// ---------------------------------------------------------------- Overpass
async function overpass(q, signal) {
  let err = null;
  for (const ep of OVERPASS) {
    const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 60000);
    const stop = () => ac.abort(); if (signal) signal.addEventListener("abort", stop);
    try {
      // POST com form-urlencoded = pedido "simples" (sem preflight de CORS)
      const r = await fetch(ep, { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded" }, signal: ac.signal });
      if (r.ok) { const j = await r.json(); if (j && Array.isArray(j.elements)) return j; }
      err = new Error("overpass " + r.status);
    } catch (e) { err = e; if (signal && signal.aborted) throw e; }
    finally { clearTimeout(tm); if (signal) signal.removeEventListener("abort", stop); }
  }
  throw err || new Error("overpass");
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
 * onStep(chave) informa a etapa para a tela de carregamento.
 */
export async function loadPack(lat, lon, rM = 250, { onStep, signal } = {}) {
  const cLat = Math.round(lat / GRID) * GRID, cLon = Math.round(lon / GRID) * GRID;
  const id = `${Math.round(cLat / GRID)}_${Math.round(cLon / GRID)}_${rM}`;
  const P = projector(cLat, cLon), user = { x: r1(P.x(lon)), z: r1(P.z(lat)) };
  const hit = cacheGet(id);
  if (hit && hit.v === PACK_V) return { ...hit, user };

  const dLat = rM / 110540, dLon = rM / (111320 * Math.cos((cLat * Math.PI) / 180));
  const bb = [cLat - dLat, cLon - dLon, cLat + dLat, cLon + dLon].map((v) => v.toFixed(6)).join(",");
  const C = `${cLat.toFixed(6)},${cLon.toFixed(6)}`;
  onStep && onStep("stStreets");
  // 1) bloco jogável: ruas, construções, áreas verdes/água e os locais dentro dele
  const qa = `[out:json][timeout:50];
(way["highway"](${bb});way["building"](${bb});way["leisure"~"^(park|pitch|playground|garden)$"](${bb});way["landuse"~"^(grass|forest|meadow|recreation_ground)$"](${bb});way["natural"~"^(water|wood|scrub)$"](${bb}););
out tags geom qt;
(nwr["amenity"~"^(${AMEN})$"](around:2500,${C});nwr["shop"~"^(${SHOPS})$"](around:2500,${C}););
out tags center qt;`;
  const A = await overpass(qa, signal);
  onStep && onStep("stExit");
  // 2) rodovia de saída mais próxima (BR/GO/SP-…, ou via expressa/rodovia troncal)
  let H = null;
  for (const rad of [4000, 15000]) {
    try {
      const qh = `[out:json][timeout:40];(way["highway"~"^(motorway|trunk|primary|motorway_link|trunk_link)$"]["ref"~"^[A-Z]{2,3}-? ?[0-9]"](around:${rad},${C});way["highway"~"^(motorway|trunk)$"](around:${rad},${C}););out tags geom(${(cLat - rad / 110540).toFixed(5)},${(cLon - rad / 100000).toFixed(5)},${(cLat + rad / 110540).toFixed(5)},${(cLon + rad / 100000).toFixed(5)}) qt;`;
      H = await overpass(qh, signal);
      if (H.elements.length) break;
    } catch (e) { if (signal && signal.aborted) throw e; H = null; break; }
  }
  onStep && onStep("stBuild");
  const pack = toPack(A, H, { id, cLat, cLon, rM, P });
  cachePut(id, pack);
  return { ...pack, user };
}

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
function toPack(A, H, { id, cLat, cLon, rM, P }) {
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
  return { v: PACK_V, id, c: [cLat, cLon], r: rM, date: new Date().toISOString().slice(0, 10), roads, blds, areas, pois, exit, src: "© OpenStreetMap contributors (ODbL)" };
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
