// Apagão: Sobreviva — Capítulo 1 (Apagão Real, primeiras 72 horas, Goiânia). Gilelê Engine.
// Plano e decisões: PLANO.md. Textos: strings.js. Mapa: city.js.
import {
  THREE, createWorld, createPhysics, endFrame, createInput, createFollowCamera, createPlayer, createBot,
  createRoom, createRemotePlayers, loadLook, randomLook, Audio, t, onLangChange, h, toast, screen, openAvatarEditor,
  openSettings, openRoomPanel, roomPill, openQuickChat, chatText, installButton, gameLinks, homeScreen, celebrate, grantWin, createAvatarPreview, registerPWA,
  track, initGTM, isTouch, isMobile, createStore, VERSION, onAppHide,
} from "../../engine/ez.js";
import { tx, setKidMode } from "./strings.js";
import { setupSocial } from "./social.js";
import { buildCity, HOME, BED, ZONES } from "./city.js";
import { modeMenu, modeHome, consumeAction, M_PER_UNIT, parts, pagedScreen, addX, confetti, bagBadge, wearPack, roomActions, bootRoom, installMusic } from "./menu.js";
import { openPicker, exitText, shortLabel } from "./cidade.js";
import { pinPack, pinnedPack, fitHome } from "./geo.js";
import { buildOsmCity, drawMap } from "./osmcity.js";

const GAME_ID = "sobrevivencia";
registerPWA("../../sw.js");
initGTM("GTM-54JJ46D9");
const store = createStore("apagao");

// ---------------------------------------------------------------- itens
const IT = {
  water: { e: "💧", kg: 1 }, bottle: { e: "🍶", kg: 0.05 },
  can: { e: "🥫", kg: 0.4, food: 30, np: 1 }, biscuit: { e: "🍪", kg: 0.2, food: 15, np: 1 }, rice: { e: "🍚", kg: 0.3, cook: 1, np: 1 },
  bread: { e: "🍞", kg: 0.3, food: 20, spoil: 48 }, meat: { e: "🥩", kg: 0.5, cook: 1, spoil: 24 }, milk: { e: "🥛", kg: 1, food: 12, drink: 10, spoil: 24 },
  fruit: { e: "🍌", kg: 0.15, food: 12, drink: 4 }, cooked: { e: "🍲", kg: 0.4, food: 45, mood: 8 }, spoiled: { e: "🤢", kg: 0.3, bad: 1 },
  flash: { e: "🔦", kg: 0.3 }, batt: { e: "🔋", kg: 0.1 }, candle: { e: "🕯️", kg: 0.1 }, matches: { e: "🔥", kg: 0.05 }, radio: { e: "📻", kg: 0.6 },
  pbank: { e: "🔌", kg: 0.25 }, map: { e: "🗺️", kg: 0.05 }, raw: { e: "🫗", kg: 1 }, bleach: { e: "🧴", kg: 0.5 }, docs: { e: "📄", kg: 0.1 }, kit: { e: "🩹", kg: 0.5, heal: 30 }, ors: { e: "🧂", kg: 0.05 }, gascan: { e: "⛽", kg: 4.5 },
};
const itName = (k) => IT[k].e + " " + t("it_" + k);
const MAXKG = 18;
const MARKET = { water: [12, 5, 6], can: [7, 1, 10], biscuit: [4, 1, 8], rice: [6, 3, 6], bread: [6, 1, 6], batt: [15, 1, 4], candle: [4, 1, 8], matches: [3, 1, 6] }; // preço, quantidade, estoque
const PHARMA = { kit: [30, 1, 2], ors: [5, 1, 6] };
const NEWS = { map: [15, 1, 4] };

// ---------------------------------------------------------------- estado
const CAUSES = ["solar", "cyber", "grid"];
function newState(cfg) {
  const hard = cfg.diff === "hard";
  return {
    v: 1, ...cfg, T: 0, B: hard ? 2 : 3, cause: CAUSES[Math.floor(Math.random() * 3)],
    s: { food: 75, water: 70, energy: 72, health: 100, mood: 70 },
    bag: { water: 0.5 }, cash: 20, bankBal: 800, withdrawn: 0,
    fridge: { meat: 2, milk: 1, fruit: 3, bread: 1 }, cupboard: { can: 1, rice: 1, matches: 1, bottle: 4, bleach: 1 },
    shelf: { flash: 1, radio: 1, candle: 2, docs: 1, pbank: 1 },
    homeWater: 0, homeRaw: 0, tankWater: hard ? 20 : 35, phone: 35, pbankPct: 30, flashH: 0, radioH: 0, flashOn: false, phoneLight: false, candleUntil: -1, carFuel: 15,
    stock: { ...Object.fromEntries(Object.entries(MARKET).map(([k, v]) => [k, v[2]])), ...Object.fromEntries(Object.entries(PHARMA).map(([k, v]) => [k, v[2]])), map: NEWS.map[2] },
    f: { hloot: 1, meet: 0, warned: 0, coInside: 0, helpedZe: 0, ateSpoiled: 0, radio: 0, cashB: null, foodB: null, lightB: null, fuelB: null, waterMax: 0.5, crowdMin: 0, gen: 0 },
    fired: {}, tips: [], news: [], pos: { x: HOME.x, z: HOME.z + 2 }, ended: 0,
    map: MAP_NOW, place: osmPack ? osmPack.label || "" : "", ground: OSM ? osmLoot() : houseLoot(),
  };
}
let st = null;
const kid = () => st && st.age === "kid";
const B = () => st.B;
const after = () => st.T >= st.B;
const hourOf = () => (17 + st.T) % 24;
const dayOf = () => Math.floor((17 + st.T) / 24);
const isDark = () => { const hh = hourOf(); return hh >= 18.4 || hh < 5.6; };
const signal = () => (!after() ? 3 : st.T < B() + 4 ? 3 : st.T < B() + 8 ? 1 : 0);
const bagKg = () => Object.entries(st.bag).reduce((a, [k, n]) => a + (IT[k] ? IT[k].kg * n : 0), 0);
const add = (o, k, n = 1) => { o[k] = Math.round(((o[k] || 0) + n) * 100) / 100; if (o[k] <= 0.001) delete o[k]; if (st && o === st.bag && n > 0 && typeof badge !== "undefined" && badge) { badge.flash(); badge.set(Object.keys(st.bag).filter((x) => IT[x] && st.bag[x] > 0).length); } };
const has = (o, k, n = 1) => (o[k] || 0) >= n - 1e-6;
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const SLOTS = 9, stackMax = (k) => (k === "water" || k === "raw" ? 8 : k === "gascan" ? 1 : 9);
const slotsUsed = () => Object.keys(st.bag).filter((k) => IT[k] && st.bag[k] > 0 && k !== "gascan").length; // o galão vai na mão
const fits = (k, n = 1) => (k === "gascan" || (st.bag[k] || 0) > 0 || slotsUsed() < SLOTS) && (st.bag[k] || 0) + n <= stackMax(k) + 1e-6;
function canCarry(k, n = 1) {
  if (fits(k, n)) return true;
  toast(t((st.bag[k] || 0) > 0 || slotsUsed() < SLOTS ? "stackFull" : "full"), 3000); Audio.play("wrong"); return false;
}
const fmtT = () => { const hh = hourOf(), m = Math.floor((hh % 1) * 60); return t("day", { d: dayOf() }) + " · " + String(Math.floor(hh)).padStart(2, "0") + ":" + String(m).padStart(2, "0"); };

// ---------------------------------------------------------------- mundo
// Mapa: padrão (bairro genérico de Goiânia) ou "📍 Minha cidade" (bairro real do OpenStreetMap + o quarteirão de casa).
// Trocar de mapa recarrega a página (?acao=novo:osm | novo:gyn | cont).
const BOOT_ACT = new URLSearchParams(location.search).get("acao") || "";
const bootSave = store.getJSON("save", null);
const wantOsm = BOOT_ACT === "novo:osm" || (!BOOT_ACT.startsWith("novo") && bootSave && !bootSave.ended && bootSave.map === "osm");
let osmPack = null;
if (wantOsm) { const pk = pinnedPack("game"); if (pk) osmPack = fitHome(pk); }
const MAP_NOW = osmPack ? "osm" : "gyn";
const world = createWorld({ canvas: document.getElementById("c"), sky: 0xbfe3ff, fog: osmPack ? [80, 380] : [60, 200], far: osmPack ? 650 : undefined, shadowRange: 36 });
const phys = createPhysics();
const city = buildCity(world, phys, { homeOnly: !!osmPack });
const OSM = osmPack ? buildOsmCity(world, phys, osmPack, { seed: "apagao" }) : null;
const OSMP = OSM ? osmPlaces() : null;
/** Lugares do roteiro no mapa real: o mais perto de casa de cada tipo (ou uma loja genérica, se faltar no bloco). */
function osmPlaces() {
  const home = { x: HOME.x, z: HOME.z };
  const has = (k) => osmPack.pois.some((o) => o.k === k && o.in);
  const P = { market: OSM.place("market", home), pharma: OSM.place("pharmacy", home), atm: OSM.place(has("atm") || !has("bank") ? "atm" : "bank", home), gas: OSM.place("fuel", home) };
  P.news = OSM.place("news", P.market || home);
  P.hospital = osmPack.pois.find((o) => o.k === "hospital") || null;
  // praça: área verde dentro do bloco mais perto de casa; senão, um ponto de rua longe do mercado
  let sq = null;
  for (const a of osmPack.areas) { if (a.k !== "green") continue; let x = 0, z = 0; const n = a.p.length / 2; for (let i = 0; i < a.p.length; i += 2) { x += a.p[i]; z += a.p[i + 1]; } x /= n; z /= n;
    const d = Math.hypot(x, z); if (d > 30 && d < osmPack.r * 2 * 0.85 && (!sq || d < sq.d)) sq = { x, z, d }; }
  if (!sq && OSM.botPoints.length) { const far = OSM.botPoints.filter((q) => !P.market || Math.hypot(q.x - P.market.x, q.z - P.market.z) > 60); const q = (far.length ? far : OSM.botPoints)[Math.floor(OSM.rand() * (far.length || OSM.botPoints.length))]; sq = { x: q.x, z: q.z }; }
  if (P.market) Object.assign(ZONES.market, { x: P.market.x, z: P.market.z });
  if (sq) Object.assign(ZONES.square, { x: sq.x, z: sq.z });
  return P;
}
/** Itens no chão das casas abertas do bairro padrão (as que a regra 50/50/50 marcou com itens). */
function houseLoot() {
  const POOL = ["water", "can", "biscuit", "kit", "candle", "batt", "matches", "bottle", "bread", "rice", "ors"];
  const out = []; let n = 0;
  (city.houses || []).filter((hh) => hh.loot).forEach((hh, hi) => {
    (hh.spots || []).forEach((sp, si) => {
      if (si >= 2 + (hi % 2)) return;                       // 2 ou 3 itens por casa
      const k = POOL[(hi * 3 + si * 5) % POOL.length];
      out.push({ id: "H" + n++, k, n: 1, x: Math.round(sp.x * 10) / 10, z: Math.round(sp.z * 10) / 10 });
    });
  });
  return out;
}
/** Itens espalhados no mapa real: 30% das casas abertas/com porta + muitos nas lojas do tipo certo (até 70). */
function osmLoot() {
  const L = { house: ["water", "can", "biscuit", "kit", "candle", "batt", "matches", "bottle", "bread"], market: ["water", "can", "biscuit", "rice", "water"], bakery: ["bread", "biscuit"], pharmacy: ["kit", "ors", "kit", "bleach"], hospital: ["kit", "ors"], fuel: ["gascan", "water"], hardware: ["flash", "batt", "candle", "matches", "bleach"], water: ["water"], school: ["water", "biscuit"] };
  const slots = OSM.lootSlots.slice().sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "poi" ? -1 : 1)).slice(0, 70);
  return slots.map((s, i) => { const A = L[s.kind === "house" ? "house" : s.cat] || L.house, k = A[Math.floor(OSM.rand() * A.length)]; return { id: "L" + i, k: IT[k] ? k : "water", n: 1, x: Math.round(s.x * 10) / 10, z: Math.round(s.z * 10) / 10 }; });
}
let playing = false, menuOpen = false;
const cam = createFollowCamera(world.camera, { phys, dist: 9, maxDist: 16 });
const input = createInput({ canvas: world.renderer.domElement, enabled: () => playing, onLook: (dx, dy, tc) => cam.look(dx, dy, tc), onZoom: (d) => cam.zoom(d) });
input.addButton({ label: "✋", action: "act", big: true, hold: false });
input.addButton({ label: "⤒", action: "jump" });
input.setVisible(false);
const room = createRoom({ gameId: GAME_ID, max: 4 });
const spawn = { x: HOME.x, y: 0.05, z: HOME.z + 2 };
const me = createPlayer({ world, phys, input, cam, look: loadLook(), spawn, room });
const realRespawn = me.respawn; let allowRespawn = true;
me.respawn = (p) => { if (allowRespawn) realRespawn(p); }; // a tecla R não teleporta para casa
const remotes = createRemotePlayers(world.scene, room);

// lanterna (spot preso ao jogador)
const flash = new THREE.SpotLight(0xfff6dd, 0, 34, 0.55, 0.45, 1);
const flashTarget = new THREE.Object3D(); world.scene.add(flash, flashTarget); flash.target = flashTarget;
const candle = new THREE.PointLight(0xffb347, 0, 12, 1.2); candle.position.set(HOME.x - 2, 1.6, HOME.z); world.scene.add(candle);

// multidões (bots só aparecem depois do apagão)
const nCrowd = isMobile ? 6 : 10;
const crowds = {
  market: Array.from({ length: nCrowd }, (_, i) => createBot({ world, phys, look: randomLook(""), area: { x0: ZONES.market.x - 8, z0: ZONES.market.z - 5, x1: ZONES.market.x + 8, z1: ZONES.market.z + 3 }, speed: 0.35 })),
  square: Array.from({ length: nCrowd }, (_, i) => createBot({ world, phys, look: randomLook(""), area: { x0: ZONES.square.x - 8, z0: ZONES.square.z - 8, x1: ZONES.square.x + 8, z1: ZONES.square.z + 8 }, speed: 0.3 })),
};
// mapa real: pessoas andando pelas ruas o tempo todo
const people = OSM ? Array.from({ length: Math.min(OSM.botPoints.length, isMobile ? 5 : 8) }, () => {
  const q = OSM.botPoints[Math.floor(OSM.rand() * OSM.botPoints.length)];
  const b = createBot({ world, phys, look: randomLook(""), area: { x0: q.x - 14, z0: q.z - 14, x1: q.x + 14, z1: q.z + 14 }, speed: 0.3 + OSM.rand() * 0.2 });
  b.ch.showLabel = false; b.ch.makeLabel(); return b;
}) : [];
// ---- moradores do bairro (25/11/2026; ampliado em 26/11/2026) ----
// Base = número de ruas do bairro (8). DE DIA são o DOBRO (16): metade some ao escurecer.
// 10% agressivos (empurram) e 10% ladrões. METADE do total conversa com frases prontas, e
// dessa metade uns topam trocar item e outros não querem trocar nada (pedido do dono).
const STREET_LINES = [-72, -24, 24, 72];
const nNight = STREET_LINES.length * 2, nDay = nNight * 2;
const dwellers = OSM ? [] : Array.from({ length: nDay }, (_, i) => {
  const along = STREET_LINES[i % STREET_LINES.length], horiz = (i % nNight) < STREET_LINES.length;
  const c = (-60 + ((i * 37) % 120));            // ponto de partida espalhado pela rua
  const area = horiz ? { x0: c - 18, x1: c + 18, z0: along - 3, z1: along + 3 }
                     : { x0: along - 3, x1: along + 3, z0: c - 18, z1: c + 18 };
  const role = i < 2 ? "agg" : i < 4 ? "thief" : "calm";
  const b = createBot({ world, phys, look: randomLook(""), area, speed: role === "agg" ? 0.5 : role === "thief" ? 0.55 : 0.34 });
  b.role = role; b.cd = 0;
  b.talk = role === "calm" && i < 4 + nDay / 2;   // metade do total conversa
  b.trades = b.talk && i % 4 < 2;                 // metade dos que conversam topa trocar
  b.dayOnly = i % 2 === 1;                        // estes só aparecem de dia (o dobro de bots)
  if (b.trades) setupTrade(b);
  b.ch.showLabel = false; b.ch.makeLabel();
  if (role !== "calm") b.ch.root.scale.setScalar(1.02);
  return b;
});
/** Sorteia o que o morador oferece e o que aceita em troca. */
function setupTrade(b) {
  const give = ["water", "biscuit", "candle", "batt", "matches", "kit", "bread", "rice", "ors", "bottle"].filter((k) => IT[k]);
  b.offer = give[Math.floor(Math.random() * give.length)];
  b.wants = give.filter((x) => x !== b.offer).sort(() => Math.random() - 0.5).slice(0, 3);
}
/** Aparece agora? (os "dayOnly" entram de dia e somem quando escurece) */
const dwellerOn = (b) => !b.dayOnly || !isDark();
/** Moradores: andam sempre; os agressivos e ladrões só agem depois do apagão. */
function updateDwellers(dt) {
  for (const b of dwellers) {
    const on = dwellerOn(b);
    b.ch.root.visible = on;
    if (!on) continue;
    b.update(dt);
    if (b.role === "calm" || !after() || !playing || menuOpen) continue;
    b.cd -= dt; if (b.cd > 0) continue;
    const d = Math.hypot(b.body.x - me.x, b.body.z - me.z);
    if (b.role === "agg" && d < 2.6) {
      b.cd = 7; Audio.play("push"); b.ch.say("😠");
      me.body.push((me.x - b.body.x) / (d || 1), (me.z - b.body.z) / (d || 1), 3.4, 9);
      st.s.health = clamp(st.s.health - (kid() ? 2 : 4)); st.s.mood = clamp(st.s.mood - 4);
      toast(tx(kid() ? "dwAgg_k" : "dwAgg"), 2800); updHud();
    } else if (b.role === "thief" && d < 2.2) {
      b.cd = 30; Audio.play("wrong"); b.ch.say("😈");
      const keys = Object.keys(st.bag).filter((k) => IT[k] && st.bag[k] > 0 && k !== "gascan");
      if (st.cash > 0 && (!keys.length || Math.random() < 0.5)) {
        const v = Math.max(5, Math.round(st.cash * 0.4)); st.cash -= Math.min(v, st.cash);
        toast(tx("dwThiefCash", { v }), 3200);
      } else if (keys.length) {
        const k = keys[Math.floor(Math.random() * keys.length)];
        add(st.bag, k, -1); toast(tx("dwThiefItem", { x: itName(k) }), 3200);
      } else toast(tx("dwThiefNone"), 2600);
      updHud();
    }
  }
}
/** Morador mais perto com quem dá para conversar (os de rua e os de dentro das casas). */
function nearestTalker() {
  let best = null, bd = 3.2;
  for (const b of dwellers) {
    if (!b.talk || !dwellerOn(b)) continue;
    const d = Math.hypot(b.body.x - me.x, b.body.z - me.z); if (d < bd) { bd = d; best = b; }
  }
  for (const r of residents) {
    if (!r.talk) continue;
    const d = Math.hypot(r.body.x - me.x, r.body.z - me.z); if (d < bd) { bd = d; best = r; }
  }
  return best;
}
/**
 * Conversa com um morador: só frases prontas (nunca texto livre — ECA) e, quando ele topa,
 * troca de um item por outro. Quem não troca diz na hora que não quer trocar nada.
 */
function talkTo(b) {
  let said = "";
  openMenu(() => {
    const bag = Object.keys(st.bag).filter((k) => IT[k] && st.bag[k] > 0);
    const canGive = b.trades ? b.wants.filter((k) => bag.includes(k)) : [];
    const ask = (k, e) => ({ label: tx("npcQ_" + k), fn: () => { b.ch.say(e); said = tx("npc_" + k + (after() ? "_a" : "_b")); } });
    const opts = [ask("hi", "👋"), ask("water", "💧"), ask("news", "📰")];
    if (!b.trades) opts.push({ label: "🔄 " + tx("npcQ_trade"), fn: () => { b.ch.say("🙅"); said = tx("npcNoTrade"); } });
    else if (!canGive.length) opts.push({ label: "🔄 " + tx("npcQ_trade"), fn: () => { b.ch.say("🤔"); said = tx("npcWants", { x: b.wants.map((k) => itName(k)).join(", "), y: itName(b.offer) }); } });
    else canGive.forEach((k) => opts.push({ cls: ".ok", label: "🔄 " + tx("npcGive", { x: itName(k), y: itName(b.offer) }), fn: () => {
      if (!fits(b.offer, 1)) { toast(tx("npcFull"), 2600); Audio.play("wrong"); return; }
      add(st.bag, k, -1); add(st.bag, b.offer, unitOf(b.offer));
      Audio.play("ok"); b.ch.say("🤝"); toast(tx("npcTradeOk", { x: itName(k), y: itName(b.offer) }), 3200);
      if (b.resident && !b.friend) { b.friend = true; toast(tx("hFriend"), 3600); }   // agora ele deixa pegar as coisas da casa
      setupTrade(b); save(); return "close";
    } }));
    return { title: "🧍 " + tx("npcTitle"), who: tx(b.resident ? "npcWhoH" : "npcWho"),
      info: [said || tx(b.trades ? "npcHi" : "npcHiCold")], opts, closeLabel: tx("npcBye") };
  });
}
Object.values(crowds).flat().forEach((b) => { b.ch.root.visible = false; b.ch.showLabel = false; b.ch.makeLabel(); });
const crowdOn = (z) => after() && (z === "market" ? st.T > B() + 0.8 && st.T < B() + 14 : st.T > B() + 2 && st.T < B() + 40);

// ---------------------------------------------------------------- dicas (mini-aulas)
const tipQueue = [];
function tip(key) {
  if (!st || st.tips.includes(key)) return;
  st.tips.push(key); tipQueue.push(key);
}
function showNextTip() {
  if (!tipQueue.length || menuOpen || !playing) return;
  const key = tipQueue.shift();
  Audio.play("pop");
  pagedMenu(t("tipTitle"), parts(tx(key)));
}
/** Menu com texto em partes (uma frase por vez). */
function pagedMenu(title, ps) {
  let i = 0;
  openMenu(() => ({ title: title + (ps.length > 1 ? ` · ${i + 1}/${ps.length}` : ""), info: [h("p", { style: { fontSize: "18px" } }, ps[i])],
    opts: [i < ps.length - 1 ? { label: t("nextP"), k: "next", fn: () => { i++; } } : null, i > 0 ? { label: t("backP"), cls: ".gray", k: "back", fn: () => { i--; } } : null], noClose: i < ps.length - 1, closeLabel: t("gotIt") }));
}

// ---------------------------------------------------------------- notícias e eventos
function news(key, vars, { phone = false, radio = false } = {}) {
  if (radio) { if (!radioWorks()) return; st.f.radio++; st.radioH = Math.max(0, st.radioH - 0.3); Audio.play("radio"); tip("tip_radio"); }
  if (phone && signal() === 0) return;
  const msg = tx(key, vars);
  st.news.unshift({ T: st.T, m: msg }); st.news.length = Math.min(st.news.length, 14);
  feed(msg);
}
const EVENTS = [
  [() => 0.03, () => { news("n1", { c: t("cause_" + st.cause) }, { phone: true }); tip("tip_signs"); }],
  [() => 0.6, () => news("n2", null, { phone: true })],
  [() => B() - 0.5, () => { news("n3", null, { phone: true }); flicker(); }],
  [() => B(), () => blackout()],
  [() => B() + 0.5, () => news("r0", null, { radio: true })],
  [() => B() + 0.8, () => news("nCrowd")],
  [() => B() + 3, () => { st.f.gen = 1; city.gen.visible = true; news("valdirGen"); }],
  [() => B() + 3.01, () => news("nPharmaClosed")],
  [() => B() + 4, () => { news("nSigWeak", null, { phone: true }); tip("tip_phone"); }],
  [() => B() + 6, () => news("r1", null, { radio: true })],
  [() => B() + 8, () => { news("nSigOff"); city.setTowerLight(false); }],
  [() => B() + 10, () => news("nMarketClosed")],
  [() => B() + 12, () => { news("nZe"); tip("tip_elder"); }],
  [() => B() + 14, () => news("nCida")],
  [() => B() + 15, () => { if (st.f.gen && !st.f.warned) { news("valdirSick"); city.gen.visible = false; st.f.gen = 0; } }],
  [() => B() + 18, () => news("r2", null, { radio: true })],
  [() => B() + 24, () => spoilFood(24)],
  [() => B() + 0.3, () => news("nTapBuilding")],
  [() => B() + 30, () => news("r3", null, { radio: true })],
  [() => B() + 36, () => news("nSewer")],
  [() => B() + 46, () => news("r4", null, { radio: true })],
  [() => B() + 48, () => { news("nLeave"); Audio.play("radio"); }],
  [() => B() + 48, () => { news("nHosp"); spoilFood(48); }],
  [() => B() + 60, () => news("r5", null, { radio: true })],
  [() => B() + 72, () => endChapter("forced")],
];
function runEvents() { EVENTS.forEach(([when, fn], i) => { if (!st.fired[i] && st.T >= when()) { st.fired[i] = 1; fn(); } }); }
function spoilFood(hours) {
  for (const o of [st.bag, st.fridge, st.cupboard]) for (const k of Object.keys(o)) if (IT[k] && IT[k].spoil === hours) { add(o, "spoiled", o[k]); delete o[k]; }
  if (hours === 24) { news("nFridge"); tip("tip_fridge"); }
}
let flickT = 0;
function flicker() { flickT = 2.5; }
function blackout() {
  city.setPower(false); Audio.play("blackout"); news("nBlack"); tip("tip_cash");
  const np = ["can", "biscuit", "rice"].reduce((a, k) => a + (st.bag[k] || 0) + (st.cupboard[k] || 0), 0);
  st.f.cashB = st.cash; st.f.foodB = np;
  st.f.lightB = (has(st.bag, "flash") || has(st.shelf, "flash")) && (st.flashH > 0 || has(st.bag, "batt") || has(st.cupboard, "batt")) ? 1 : 0;
  st.f.fuelB = st.carFuel >= 50 || has(st.bag, "gascan") ? 1 : 0;
  for (const k in st.stock) st.stock[k] = Math.ceil(st.stock[k] / 2);
}
function radioWorks() {
  if (!has(st.bag, "radio")) return false;
  if (st.radioH <= 0 && has(st.bag, "batt")) { add(st.bag, "batt", -1); st.radioH = 20; }
  return st.radioH > 0;
}

// ---------------------------------------------------------------- relógio, barras e luz
function advance(hours, sleeping = false) {
  const hard = st.diff === "hard" ? 1.35 : 1, k = hours * hard * (sleeping ? 0.6 : 1), s = st.s;
  s.water = clamp(s.water - 3.4 * k); s.food = clamp(s.food - 1.9 * k);
  s.energy = clamp(s.energy + (sleeping ? 11 * hours : -2.8 * k));
  const darkNoLight = after() && isDark() && !lightOn() && !sleeping;
  s.mood = clamp(s.mood + (darkNoLight ? -3 * hours : 0.4 * hours));
  let dh = 0;
  if (s.water <= 0) dh -= 8; if (s.food <= 0) dh -= 3; if (s.energy <= 0) dh -= 3;
  if (s.water > 35 && s.food > 35 && s.energy > 20) dh += 1.5;
  s.health = clamp(s.health + dh * hours);
  // aparelhos
  st.phone = clamp(st.phone - hours * ((signal() === 0 && after()) ? 2 : 1.2) - (st.phoneLight ? 12 * hours : 0));
  if (st.phone <= 0) st.phoneLight = false;
  if (st.flashOn) { st.flashH -= hours; if (st.flashH <= 0) { if (has(st.bag, "batt")) { add(st.bag, "batt", -1); st.flashH = 10; } else { st.flashH = 0; st.flashOn = false; toast(t("flashNoBatt")); } } }
  st.f.waterMax = Math.max(st.f.waterMax, st.homeWater + st.homeRaw + (st.bag.water || 0) + (st.bag.raw || 0));
  st.T += hours;
}
const lightOn = () => (st.flashOn && st.flashH > 0) || (st.phoneLight && st.phone > 0) || (st.T < st.candleUntil && city.insideHome(me.x, me.z));
const cSky = new THREE.Color(), cDay = new THREE.Color(0xbfe3ff), cNight = new THREE.Color(0x0b1020), cDusk = new THREE.Color(0xf59e0b);
function updateLight(dt) {
  const hh = hourOf();
  const day = hh < 5.5 || hh > 18.5 ? 0 : hh < 6.5 ? hh - 5.5 : hh > 17.5 ? 18.5 - hh : 1;
  const dusk = Math.max(0, 1 - Math.abs(hh - 18) * 1.6) + Math.max(0, 1 - Math.abs(hh - 6) * 1.6);
  const powerGlow = city.power ? 0.5 : 0;
  let f = 1;
  if (flickT > 0) { flickT -= dt; f = Math.random() < 0.3 ? 0.2 : 1; if (!after()) city.setPower(f > 0.5); if (flickT <= 0) city.setPower(!after()); }
  cSky.copy(cNight).lerp(cDay, day).lerp(cDusk, Math.min(0.35, dusk * 0.35));
  world.scene.background = cSky; world.scene.fog.color = cSky;
  world.hemi.intensity = (0.18 + powerGlow * (1 - day) + day * 2.2) * f;
  world.sun.intensity = day * 2.6;
  // lanterna
  const on = playing && lightOn() && !(st.T < st.candleUntil && city.insideHome(me.x, me.z) && !st.flashOn && !st.phoneLight);
  flash.intensity = on ? (st.flashOn ? 110 : 45) : 0;
  flash.position.set(me.x, me.y + 2, me.z);
  flashTarget.position.set(me.x + Math.sin(me.rot) * 8, me.y, me.z + Math.cos(me.rot) * 8);
  candle.intensity = st.T < st.candleUntil ? 18 + Math.sin(performance.now() / 90) * 2 : 0;
}

// ---------------------------------------------------------------- menus
function openMenu(build) {
  menuOpen = true; input.setVisible(false);
  const card = h("div");
  let scr = null;
  const close = () => { scr.el.remove(); menuOpen = false; if (playing) input.setVisible(true); updHud(); };
  function draw() {
    const d = build(close);
    card.replaceChildren(...[
      h("h2", d.title),
      ...(d.info || []).filter(Boolean).map((p) => (p instanceof Node ? p : d.who ? h("p.say", h("b", "🗣️ " + d.who + ": "), p) : h("p", p))),
      ...(d.who && (d.opts || []).some(Boolean) ? [h("p.say.you", h("b", t("youSay")))] : []),
      h("div.ez-col", { style: { marginTop: "10px" } },
        ...(d.opts || []).filter(Boolean).map((o) => h("button.ez-btn.wide" + (o.cls || ""), { "data-k": o.k || null, disabled: o.dis ? true : null, style: o.dis ? { opacity: 0.45 } : null, onclick: () => { if (o.dis) return; Audio.play("click"); const r = o.fn(); if (r === "close") close(); else if (scr.el.isConnected) draw(); } }, o.label)),
        d.noClose ? null : (h("button.ez-btn" + (d.closeLabel ? ".ok" : ".gray") + ".wide", { "data-k": d.closeLabel ? "next" : null, onclick: () => { close(); if (d.onClose) setTimeout(d.onClose, 0); } }, d.closeLabel || t("a_leave")))),
    ].filter(Boolean));
  }
  draw();
  scr = screen([card], { dim: true });
  addX(h, scr, close);
  return { close, draw };
}
function takeOpts(o, onTake) {
  const ks = Object.keys(o).filter((k) => IT[k] && o[k] > 0);
  if (!ks.length) return [];
  const list = ks.map((k) => ({ label: `${t("a_take")} ${itName(k)} ×${o[k]}`, fn: () => { if (!canCarry(k)) return; add(o, k, -1); add(st.bag, k, 1); Audio.play("coin"); onTake && onTake(k); } }));
  if (ks.length > 1) list.push({ label: t("a_takeAll"), cls: ".blue", fn: () => { for (const k of ks) while (o[k] > 0 && fits(k)) { add(o, k, -1); add(st.bag, k, 1); } Audio.play("coin"); } });
  return list;
}
const minutes = (m) => { if (!room.connected || room.isHost) advance(m / 60); toast(t("queue", { m })); };

// ---------------------------------------------------------------- mochila e itens
function openBag() {
  openMenu((close) => {
    const ks = Object.keys(st.bag).filter((k) => IT[k] && st.bag[k] > 0 && k !== "gascan");
    const grid = h("div.sv-grid");
    for (let i = 0; i < SLOTS; i++) {
      const k = ks[i];
      grid.appendChild(k ? h("button.sv-slot" + (k === "spoiled" || k === "raw" ? ".bad" : ""), { title: t("it_" + k), onclick: () => { Audio.play("click"); close(); setTimeout(() => openItem(k), 0); } },
        h("span", IT[k].e), h("small", k === "water" || k === "raw" ? st.bag[k].toFixed(1) + " L" : "×" + st.bag[k]), h("em", t("it_" + k).replace(/ \(.*\)/, "")))
        : h("div.sv-slot.empty"));
    }
    return { title: t("bag") + " · " + t("slots", { n: ks.length }), info: [t("bagSub"), grid, h("p.ez-msg", t("money", { c: st.cash, b: st.bankBal })), ks.length ? null : t("bagEmptyHint")], opts: [has(st.bag, "gascan") ? { label: itName("gascan") + " · " + t("inHand"), cls: ".blue", fn: () => { setTimeout(() => openItem("gascan"), 0); return "close"; } } : null] };
  });
}
function openItem(k) {
  openMenu(() => {
    if (!has(st.bag, k, k === "water" || k === "raw" ? 0.01 : 1)) return { title: itName(k), info: [t("empty")], closeLabel: t("bag"), onClose: openBag };
    const it = IT[k], n = st.bag[k], home = city.insideHome(me.x, me.z);
    const desc = t("d_" + (k === "raw" ? "raw" : k));
    const opts = [];
    if (k === "water") { opts.push({ label: t("a_drink"), dis: n < 0.5, fn: () => drink() }); if (home) opts.push({ label: t("storeHome") + " (1,5 L)", dis: n < 1.5, fn: () => { add(st.bag, "water", -1.5); st.homeWater += 1.5; } }); }
    else if (k === "raw") {
      opts.push({ label: "⚠️ " + t("drinkAnyway"), cls: ".warn", dis: n < 0.5, fn: () => { add(st.bag, "raw", -0.5); drinkRaw(); } });
      if (has(st.bag, "bleach")) opts.push({ label: "🧴 " + t("treatBleach"), fn: () => treatAll("bleach") });
      if (home) opts.push({ label: t("storeHome") + " (1,5 L)", dis: n < 1.5, fn: () => { add(st.bag, "raw", -1.5); st.homeRaw += 1.5; } });
    }
    else if (it.food || it.bad) opts.push({ label: t("a_eat"), cls: it.bad ? ".warn" : "", fn: () => eat(st.bag, k) });
    else if (k === "kit") opts.push({ label: t("a_use"), fn: () => { add(st.bag, k, -1); st.s.health = clamp(st.s.health + 30); Audio.play("ok"); } });
    else if (k === "ors") opts.push({ label: t("a_use"), dis: !has(st.bag, "water", 0.5), fn: () => { add(st.bag, k, -1); add(st.bag, "water", -0.5); st.s.water = clamp(st.s.water + 30); st.s.health = clamp(st.s.health + 8); Audio.play("ok"); } });
    else if (k === "pbank") opts.push({ label: t("usePbank") + ` (${Math.round(st.pbankPct)}%)`, dis: st.pbankPct < 5 || st.phone >= 99, fn: () => usePbank() });
    else if (k === "flash") opts.push({ label: "🔦 " + (st.flashOn ? "OFF" : "ON"), fn: () => toggleFlash() });
    else if (k === "map") opts.push({ label: "🗺️ " + t("mapOpen"), fn: () => { setTimeout(openMap, 0); return "close"; } });
    else if (k === "radio") opts.push({ label: t("radio"), fn: () => { setTimeout(openRadio, 0); return "close"; } });
    if (home && k !== "water" && k !== "raw") opts.push({ label: t("storePantry"), cls: ".blue", fn: () => { add(st.bag, k, -1); add(st.cupboard, k, 1); } });
    opts.push({ label: "⬇️ " + t("gr_drop"), cls: ".gray", fn: () => { social.drop(k); } });
    return { title: `${itName(k)} · ${k === "water" || k === "raw" ? n.toFixed(1) + " L" : "×" + n}`, info: [desc], opts, closeLabel: "🎒 " + t("bag"), onClose: openBag };
  });
}
function drink() { if (!has(st.bag, "water", 0.5)) return; add(st.bag, "water", -0.5); st.s.water = clamp(st.s.water + 22); Audio.play("pop"); }
function eat(o, k) {
  const it = IT[k]; add(o, k, -1);
  if (it.bad) { st.s.health = clamp(st.s.health - 22); st.s.water = clamp(st.s.water - 20); st.s.food = clamp(st.s.food + 5); st.f.ateSpoiled = 1; Audio.play("wrong"); tip("tip_spoiled"); return; }
  st.s.food = clamp(st.s.food + it.food); if (it.drink) st.s.water = clamp(st.s.water + it.drink); if (it.mood) st.s.mood = clamp(st.s.mood + it.mood);
  Audio.play("coin");
}
function toggleFlash() {
  if (!has(st.bag, "flash")) { toast(t("noFlash")); return; }
  if (!st.flashOn && st.flashH <= 0) { if (has(st.bag, "batt")) { add(st.bag, "batt", -1); st.flashH = 10; } else { toast(t("flashNoBatt")); Audio.play("wrong"); return; } }
  st.flashOn = !st.flashOn; Audio.play("click"); if (st.flashOn) { toast(t("flashOn")); if (after()) st.f.usedLight = 1; }
}
function usePbank() { const give = Math.min(50, 100 - st.phone, st.pbankPct); st.phone += give; st.pbankPct -= give; Audio.play("ok"); }

// ---------------------------------------------------------------- celular e rádio
function openPhone() {
  st.f.sawNews = 1;
  openMenu(() => {
    if (st.phone <= 0) return { title: t("phone"), info: [t("phoneDead")], opts: [has(st.bag, "pbank") && st.pbankPct > 5 ? { label: t("usePbank"), fn: usePbank } : null] };
    const sg = signal();
    const info = [t("battery", { v: Math.round(st.phone) }) + " · " + t(sg === 3 ? "sig3" : sg === 1 ? "sig1" : "sig0"),
      h("div", { style: { maxHeight: "180px", overflowY: "auto", background: "#f1f5f9", borderRadius: "10px", padding: "6px 10px", fontSize: "14px" } },
        h("b", t("news")), ...st.news.slice(0, 10).map((n) => h("p", { style: { margin: "4px 0" } }, n.m)))];
    const opts = [];
    if (!st.f.meet) {
      opts.push({ label: "💬 " + t("msgFam"), fn: () => {
        openMenu(() => ({ title: t("meetQ"), opts: ["meet1", "meet2", "meet3"].map((k) => ({ label: t(k), fn: () => {
          const ok = sg === 3 || (sg === 1 && Math.random() < 0.5);
          if (ok) { st.f.meet = 1; toast(t("sent")); Audio.play("ok"); } else { toast(t("notSent")); Audio.play("wrong"); }
          st.phone = clamp(st.phone - 1); return "close";
        } })) }));
      } });
    } else info.push("✓✓ " + t("g_phone"));
    opts.push({ label: "🔦 " + t("phoneLight") + (st.phoneLight ? " (ON)" : ""), fn: () => { st.phoneLight = !st.phoneLight; } });
    if (has(st.bag, "pbank")) opts.push({ label: t("usePbank") + ` (${Math.round(st.pbankPct)}%)`, dis: st.pbankPct < 5 || st.phone >= 99, fn: usePbank });
    return { title: t("phone"), info, opts };
  });
}
// ---------------------------------------------------------------- mapa do bairro (celular ou papel)
let dest = null;
const MAP_PLACES = [
  ["i_door", "🏢", "l_home"], ["i_market", "🛒"], ["i_newsstand", "📰"], ["i_pharma", "💊"], ["i_atm", "🏧"], ["i_gas", "⛽"], ["i_parking", "🚗"],
  ["i_ze", "👴"], ["i_cida", "👩"], ["i_valdir", "👨"],
];
const MAP_EXTRA = OSMP ? [OSMP.hospital && [OSMP.hospital.x, OSMP.hospital.z, "🏥", "i_hospital"], [ZONES.square.x, ZONES.square.z, "🌳", "l_square"], [city.towerPos.x, city.towerPos.z, "📡", "i_tower"]].filter(Boolean)
  : [[-52, 6, "🏥", "i_hospital"], [-48, 48, "🌳", "l_square"], [48, -50, "📡", "i_tower"]];
function openMap() {
  const paper = has(st.bag, "map");
  if (!paper && st.phone <= 0) { openMenu(() => ({ title: t("mapT"), info: [t("mapNoBatt")] })); return; }
  if (!paper) st.phone = clamp(st.phone - 1);
  const W = 300, R = OSM ? Math.min(osmPack.r * 2, 320) : 90, k = W / (2 * R), P = (x) => (x + R) * k;
  const cv = h("canvas", { width: W * 2, height: W * 2, style: { width: "min(300px, 72vw)", aspectRatio: "1", display: "block", margin: "6px auto", borderRadius: "14px", touchAction: "none" } });
  const c = cv.getContext("2d"); c.scale(2, 2);
  const places = MAP_PLACES.map(([key, e, lab]) => { const s = SPOTS.find((x) => x.key === key); return s && { s, e, name: t(lab || key) }; }).filter(Boolean);
  if (OSM && OSM.exitMark) places.push({ s: { x: OSM.exitMark.x, z: OSM.exitMark.z, r: 10, key: "exit" }, e: osmPack.exit.rural ? "🌾" : "🛣️", name: exitText(osmPack, me.x, me.z) });
  function draw() {
    if (OSM) drawMap(cv, osmPack, { cx: 0, cz: 0, scale: W / R, icons: false });   // mapa real (o canvas tem 2× pixels)
    else {
      c.fillStyle = "#9bbf63"; c.fillRect(0, 0, W, W);
      c.fillStyle = "#52525b"; [-24, 24, -72, 72].forEach((v) => { c.fillRect(0, P(v) - 4 * k, W, 8 * k); c.fillRect(P(v) - 4 * k, 0, 8 * k, W); });
      c.fillStyle = "#86efac"; c.fillRect(P(-61), P(35), 26 * k, 26 * k);
      c.fillStyle = "#e2e8f0"; [[0, 10, 16, 13], [0, 46, 26, 16], [40, 38, 10, 8], [-52, 6, 16, 20], [-46, -40, 14, 14], [0, -32, 4, 3]].forEach(([x, z, w, d]) => c.fillRect(P(x - w / 2), P(z - d / 2), w * k, d * k));
    }
    c.font = "16px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    const tg = dest || (mission && mission.target);
    if (tg) { c.strokeStyle = "#facc15"; c.lineWidth = 3; c.beginPath(); c.arc(P(tg.x), P(tg.z), 13, 0, Math.PI * 2); c.stroke(); }
    MAP_EXTRA.forEach(([x, z, e]) => c.fillText(e, P(x), P(z)));
    places.forEach((p) => c.fillText(p.e, P(p.s.x), P(p.s.z)));
    // você: seta na direção em que o boneco olha
    const px = P(me.x), pz = P(me.z), dx = Math.sin(me.rot), dz = Math.cos(me.rot);
    c.fillStyle = "#ef4444"; c.strokeStyle = "#fff"; c.lineWidth = 2; c.beginPath();
    c.moveTo(px + dx * 10, pz + dz * 10); c.lineTo(px - dz * 6 - dx * 6, pz + dx * 6 - dz * 6); c.lineTo(px + dz * 6 - dx * 6, pz - dx * 6 - dz * 6); c.closePath(); c.fill(); c.stroke();
    if (!OSM) { c.fillStyle = "#0f172a"; c.font = "bold 11px sans-serif"; c.fillText("N ▲", W - 20, 12); }
  }
  draw();
  let m = null;
  const go = (p) => { dest = p.s; toast("🧭 " + t("mapDest", { x: p.name }), 2600); Audio.play("ok"); m.close(); };
  cv.addEventListener("pointerdown", (e) => {
    const r = cv.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * W / k - R, z = ((e.clientY - r.top) / r.height) * W / k - R;
    let best = null, bd = (9 * R) / 90; for (const p of places) { const d = Math.hypot(p.s.x - x, p.s.z - z); if (d < bd) { bd = d; best = p; } }
    if (best) go(best);
  });
  m = openMenu(() => ({ title: t("mapT") + (paper ? " · " + t("mapPaper") : ""), info: [h("p.ez-msg", { style: { textAlign: "center" } }, t("mapHelp")), cv],
    opts: places.map((p) => ({ label: p.e + " " + p.name + " · " + t("guideM", { m: Math.max(1, Math.round(Math.hypot(p.s.x - me.x, p.s.z - me.z) * M_PER_UNIT)) }), cls: dest === p.s ? "" : ".blue", fn: () => { go(p); } })) }));
}
function openComm() {
  openMenu(() => ({ title: t("comm"), info: [], opts: [
    { label: t("commMap") + (has(st.bag, "map") ? " · " + t("mapPaper") : ""), fn: () => { setTimeout(openMap, 0); return "close"; } },
    { label: t("commPhone") + " · " + Math.round(st.phone) + "%", fn: () => { setTimeout(openPhone, 0); return "close"; } },
    { label: t("commRadio"), cls: ".blue", fn: () => { setTimeout(openRadio, 0); return "close"; } },
  ] }));
}
function openRadio() {
  let info;
  if (!has(st.bag, "radio")) info = [t("radioWhere"), t("radioWhy")];
  else if (!radioWorks()) info = [t("radioNoBatt"), t("radioWhy")];
  else {
    Audio.play("radio"); st.f.heard = 1;
    const heard = st.news.filter((n) => n.m.startsWith("📻"));
    info = after() ? (heard.length ? [h("b", t("radioLog")), ...heard.slice(0, 6).map((n) => h("p", { style: { fontSize: "14px" } }, n.m))] : [t("radioStatic")]) : [t("radioPre")];
    info.push(h("p.ez-msg", t("radioWhy")));
  }
  openMenu(() => ({ title: t("radio"), info }));
}

// ---------------------------------------------------------------- lugares
const SPOTS = [];
const spot = (x, z, r, key, open, extra) => SPOTS.push(Object.assign({ x, z, r, key, open }, extra || {}));
const hx = HOME.x, hz = HOME.z, z0 = HOME.z - HOME.d / 2, x0 = HOME.x - HOME.w / 2, z1 = HOME.z + HOME.d / 2;
spot(x0 + 1, z0 + 2.2, 1.9, "i_fridge", () => openMenu(() => {
  if (after()) tip("tip_fridge");
  const opts = takeOpts(st.fridge);
  return { title: "🧊 " + t("i_fridge"), info: [opts.length ? null : t("empty")], opts };
}));
spot(x0 + 3.4, z0 + 1.9, 1.7, "i_cupboard", () => openMenu(() => { const opts = takeOpts(st.cupboard); return { title: "🗄️ " + t("i_cupboard"), info: [opts.length ? null : t("empty")], opts }; }));
spot(hx + 0.2, z0 + 1.9, 1.5, "i_sink", () => openMenu(() => {
  const pre = !after(), wet = pre || st.tankWater > 0;
  const use = (L) => { if (!pre) st.tankWater = Math.max(0, st.tankWater - L); };
  if (!pre) tip("tip_tapRisk");
  const info = [wet ? (pre ? null : t("rawWarn")) : t("tapDry"), !pre && wet ? t("tapTank", { v: Math.round(st.tankWater) }) : null];
  const nb = st.bag.bottle || 0;
  return { title: "🚰 " + t("i_sink"), info, opts: wet ? [
    pre ? { label: t("drinkTap"), fn: () => { st.s.water = clamp(st.s.water + 22); Audio.play("pop"); } }
        : { label: "⚠️ " + t("drinkAnyway"), cls: ".warn", fn: () => { use(0.5); drinkRaw(); } },
    nb ? { label: (pre ? t("fillBottles") : t("fillRaw")) + ` (×${nb})`, fn: () => { const k = pre ? "water" : "raw"; if (!canCarry(k, nb * 1.5 - nb * 0.05)) return; add(st.bag, "bottle", -nb); add(st.bag, k, 1.5 * nb); use(1.5 * nb); Audio.play("coin"); } } : null,
    { label: t("fillBuckets"), dis: st.homeWater + st.homeRaw >= 40, fn: () => { const L = Math.min(20, 40 - st.homeWater - st.homeRaw, pre ? 99 : st.tankWater); if (pre) st.homeWater += L; else st.homeRaw += L; use(L); minutes(10); tip("tip_water"); Audio.play("coin"); } },
  ] : [] };
}));
function drinkRaw() {
  if (Math.random() < 0.5) { st.s.health = clamp(st.s.health - 15); st.s.water = clamp(st.s.water + 5); toast(t("sick"), 3500); Audio.play("wrong"); }
  else { st.s.water = clamp(st.s.water + 22); Audio.play("pop"); }
  tip("tip_tapRisk");
}
function treatAll(kind) {
  const bagRaw = st.bag.raw || 0, homeRaw = st.homeRaw;
  if (!bagRaw && !homeRaw) return;
  if (bagRaw) { add(st.bag, "raw", -bagRaw); add(st.bag, "water", bagRaw); }
  st.homeWater += homeRaw; st.homeRaw = 0;
  minutes(kind === "boil" ? 20 : 30); toast(t("treated"), 2500); Audio.play("ok");
}
spot(x0 + 1.7, z1 - 1.6, 1.8, "i_store", () => openMenu(() => {
  const tot = st.homeWater + st.homeRaw;
  return { title: "🪣 " + t("i_store"), info: [t("homeWater", { v: tot.toFixed(1) }) + (st.homeRaw > 0 ? " " + t("homeRaw", { v: st.homeRaw.toFixed(1) }) : ""), st.homeRaw > 0 ? t("rawWarn") : null], opts: [
    st.homeWater >= 0.5 ? { label: t("drinkHome"), fn: () => { st.homeWater -= 0.5; st.s.water = clamp(st.s.water + 22); Audio.play("pop"); } }
      : { label: "⚠️ " + t("drinkAnyway"), cls: ".warn", dis: st.homeRaw < 0.5, fn: () => { st.homeRaw -= 0.5; drinkRaw(); } },
    st.homeRaw > 0 && has(st.bag, "bleach") ? { label: "🧴 " + t("treatBleach"), fn: () => treatAll("bleach") } : null,
    { label: t("takeWater"), dis: st.homeWater < 1.5, fn: () => { if (!canCarry("water", 1.5)) return; st.homeWater -= 1.5; add(st.bag, "water", 1.5); } },
    { label: t("storeWater"), dis: !has(st.bag, "water", 1.5), fn: () => { add(st.bag, "water", -1.5); st.homeWater += 1.5; } },
  ] };
}));
spot(hx + 2.2, z0 + 1.9, 1.5, "i_stove", () => openMenu(() => {
  const food = has(st.bag, "rice") ? "rice" : has(st.bag, "meat") ? "meat" : null;
  const water = has(st.bag, "water", 0.5) || st.homeWater >= 0.5;
  return { title: "🍳 " + t("i_stove"), info: [after() && !has(st.bag, "matches") ? t("cookNeedMatch") : null, !food || !water ? t("cookNothing") : null], opts: [
    { label: t("cookStove"), dis: !food || !water || (after() && !has(st.bag, "matches")), fn: () => {
      add(st.bag, food, -1); if (has(st.bag, "water", 0.5)) add(st.bag, "water", -0.5); else st.homeWater -= 0.5; add(st.bag, "cooked", 1); minutes(30); toast(t("cooked")); Audio.play("ok");
    } },
    { label: "🔥 " + t("boilWater"), dis: !((st.bag.raw || 0) + st.homeRaw > 0) || (after() && !has(st.bag, "matches")), fn: () => treatAll("boil") },
    { label: "⚠️ " + t("coalInside"), cls: ".warn", fn: () => { st.f.coInside = 1; st.s.health = clamp(st.s.health - 30); st.s.mood = clamp(st.s.mood - 10); Audio.play("wrong"); toast(tx("coHurt"), 3500); tip("tip_co"); return "close"; } },
  ] };
}, { onTry: () => { if (after() && !has(st.bag, "matches")) tip("tip_matches"); } }));
spot(BED.x, BED.z, 2.2, "i_bed", () => openMenu(() => {
  const mp = room.connected && !room.isHost;
  const open = after() && !st.locked;
  return { title: "🛏️ " + t("i_bed"), info: [mp ? t("sleepMp") : null, open ? "⚠️ " + t("bedOpen") : null], opts: [
    open ? { label: "🔒 " + t("lockFirst"), cls: ".blue", fn: () => { setLock(true); } } : null,
    { label: t("sleep") + (open ? " · " + t("doorOpenTag") : ""), cls: open ? ".warn" : "", dis: mp, fn: () => { const hh = hourOf(); let n = hh >= 6 ? 30 - hh : 6 - hh; n = Math.min(n, 11); sleep(n); return "close"; } },
    { label: t("nap") + (open ? " · " + t("doorOpenTag") : ""), cls: open ? ".warn" : "", dis: mp, fn: () => { sleep(3); return "close"; } },
  ] };
}));
spot(x0 + 1.2, hz + 1, 1.9, "i_shelf", () => openMenu(() => {
  const opts = takeOpts(st.shelf);
  const pw = city.power;
  opts.push({ label: "🔌 " + t("chargePhone") + ` (${Math.round(st.phone)}%)`, dis: st.phone >= 99, fn: () => { if (!pw) { toast(t("noPower")); return; } minutes(20); st.phone = 100; Audio.play("ok"); } });
  opts.push({ label: "🔋 " + t("chargeBank") + ` (${Math.round(st.pbankPct)}%)`, dis: st.pbankPct >= 99, fn: () => { if (!pw) { toast(t("noPower")); return; } minutes(15); st.pbankPct = 100; Audio.play("ok"); } });
  if (has(st.bag, "candle") && has(st.bag, "matches")) opts.push({ label: "🕯️ " + t("lightCandle"), fn: () => { add(st.bag, "candle", -1); st.candleUntil = st.T + 4; st.f.usedLight = 1; toast(t("candleTip"), 3000); } });
  return { title: "📚 " + t("i_shelf"), opts };
}));
spot(hx, z0 - 2.5, 2, "i_yard", () => openMenu(() => {
  const food = has(st.bag, "rice") ? "rice" : has(st.bag, "meat") ? "meat" : null;
  const water = has(st.bag, "water", 0.5) || st.homeWater >= 0.5;
  return { title: "🌿 " + t("i_yard"), info: [!food || !water ? t("cookNothing") : null], opts: [
    { label: t("coalYard"), dis: !food || !water || !has(st.bag, "matches"), fn: () => { add(st.bag, food, -1); if (has(st.bag, "water", 0.5)) add(st.bag, "water", -0.5); else st.homeWater -= 0.5; add(st.bag, "cooked", 1); minutes(45); toast(t("cooked")); Audio.play("ok"); } },
  ] };
}));
spot(9.5, 12, 3.2, "i_parking", () => openMenu(() => ({ title: "🚗 " + t("i_car"), info: [t("carFuel", { v: Math.round(st.carFuel) }), after() && st.T < B() + 48 ? t("departEarly") : null], opts: [
  { label: t("carCharge"), dis: st.carFuel < 3 || st.phone >= 99, fn: () => { st.carFuel -= 2; st.phone = Math.min(100, st.phone + 40); minutes(30); Audio.play("ok"); } },
  has(st.bag, "gascan") ? { label: t("pourCan"), fn: () => { add(st.bag, "gascan", -1); st.carFuel = Math.min(100, st.carFuel + 40); Audio.play("ok"); } } : null,
  after() ? { label: st.carFuel >= 50 ? t("depart") : t("departFoot"), cls: st.carFuel >= 50 ? "" : ".warn", dis: st.T < B() + 48, fn: () => { setTimeout(() => endChapter(st.carFuel >= 50 ? "car" : "foot"), 0); return "close"; } } : null,
] })));
// comércio
function pay(price, card) {
  if (card) { if (st.bankBal < price) { toast(t("noMoney")); return false; } st.bankBal -= price; return true; }
  if (st.cash < price) { toast(t("noCash")); Audio.play("wrong"); return false; }
  st.cash -= price; return true;
}
function shopOpts(list) {
  const mul = after() ? (kid() ? 1.5 : 2) : 1, card = !after();
  return Object.entries(list).map(([k, [p, q]]) => {
    if (st.stock[k] == null) st.stock[k] = (MARKET[k] || PHARMA[k] || NEWS[k])[2];
    const price = Math.round(p * mul), left = st.stock[k];
    return { label: `${itName(k)}${q > 1 ? " ×" + q : ""} · R$ ${price}` + (left <= 0 ? " · " + t("soldOut") : ""), dis: left <= 0, fn: () => {
      if (!canCarry(k, q)) return;
      const doBuy = (c) => { if (!pay(price, c)) return; st.stock[k]--; add(st.bag, k, q); Audio.play("coin"); if (k === "map") tip("tip_map"); };
      if (card) openMenu(() => ({ title: itName(k), opts: [{ label: t("payCard"), fn: () => { doBuy(true); return "close"; } }, { label: t("payCash") + ` (R$ ${st.cash})`, fn: () => { doBuy(false); return "close"; } }] }));
      else doBuy(false);
    } };
  });
}
spot(0, 36.5, 3.2, "i_market", () => {
  if (after() && st.T > B() + (st.diff === "hard" ? 14 : 26)) { toast(t("closed")); return; }
  minutes(after() ? 45 : 10);
  openMenu(() => ({ title: "🛒 " + t("i_market"), info: [t("cash", { v: st.cash }) + (after() ? "" : " · " + t("bank", { v: st.bankBal })), after() ? t("cardOff") : null, after() ? t("priceUp") : null], opts: shopOpts(MARKET) }));
});
spot(40, 32.5, 2.6, "i_pharma", () => {
  if (after() && st.T > B() + (st.diff === "hard" ? 6 : 14)) { toast(t("closed")); return; }
  openMenu(() => ({ title: "💊 " + t("i_pharma"), info: [after() ? t("cardOff") : null], opts: shopOpts(PHARMA) }));
});
spot(20, 31.5, 2.6, "i_newsstand", () => {
  if (after() && st.T > B() + 20) { toast(t("closed")); return; }
  openMenu(() => ({ title: "📰 " + t("i_newsstand"), who: t("i_newsstand"), info: [t("newsHi"), after() ? t("cardOff") : null], opts: shopOpts(NEWS) }));
});
spot(0, -29.6, 2.4, "i_atm", () => {
  if (after()) { toast(t("atmOff"), 3000); tip("tip_cash"); Audio.play("wrong"); return; }
  openMenu(() => ({ title: "🏧 " + t("i_atm"), info: [t("bank", { v: st.bankBal }), t("cash", { v: st.cash })], opts: [100, 200, 300].map((v) => ({ label: t("atmWithdraw", { v }), dis: st.bankBal < v || st.withdrawn + v > 600, fn: () => { st.bankBal -= v; st.cash += v; st.withdrawn += v; Audio.play("coin"); } })) }));
});
spot(-46, -40, 5, "i_gas", () => {
  if (after()) { toast(t("gasOff"), 3000); tip("tip_fuel"); Audio.play("wrong"); return; }
  if (st.T > B() - 0.8) minutes(20);
  openMenu(() => ({ title: "⛽ " + t("i_gas"), info: [t("carFuel", { v: Math.round(st.carFuel) }), t("gasCarTip")], opts: [
    { label: t("gasFill"), dis: has(st.bag, "gascan"), fn: () => { if (!canCarry("gascan")) return; if (pay(35, st.bankBal >= 35)) { add(st.bag, "gascan", 1); Audio.play("coin"); tip("tip_fuel"); } } },
    { label: t("gasTank"), dis: st.carFuel >= 99, fn: () => { if (pay(250, st.bankBal >= 250)) { st.carFuel = 100; Audio.play("coin"); tip("tip_fuel"); } } },
  ] }));
});
spot(-15, 16.4, 2.6, "i_ze", () => openMenu(() => {
  const need = after() && st.T > B() + 12 && !st.f.helpedZe;
  return { title: "👴 " + t("i_ze"), who: t("i_ze"), info: [need ? tx("zeAsk") : st.f.helpedZe ? tx("zeThanks") : tx("zeFine")], opts: need ? [
    { label: t("zeGive"), dis: !has(st.bag, "water", 1.5), fn: () => { add(st.bag, "water", -1.5); st.f.helpedZe = 1; st.s.mood = clamp(st.s.mood + 15); Audio.play("ok"); } },
  ] : [] };
}), { mark: () => after() && st.T > B() + 12 && !st.f.helpedZe });
spot(14, 3, 2.6, "i_cida", () => openMenu(() => {
  const open = after() && st.T > B() + 14;
  return { title: "👩 " + t("i_cida"), who: t("i_cida"), info: [tx("cidaHi")], opts: open ? [
    { label: t("cidaT1"), dis: !has(st.bag, "water", 3) || st.f.cida1, fn: () => { add(st.bag, "water", -3); add(st.bag, "batt", 1); st.f.cida1 = 1; toast(t("cidaDone")); Audio.play("ok"); } },
    { label: t("cidaT2"), dis: !has(st.bag, "can") || st.f.cida2, fn: () => { add(st.bag, "can", -1); add(st.bag, "candle", 2); add(st.bag, "matches", 1); st.f.cida2 = 1; toast(t("cidaDone")); Audio.play("ok"); } },
  ] : [] };
}), { mark: () => after() && st.T > B() + 14 && !(st.f.cida1 && st.f.cida2) });
spot(-5, -17.4, 2.8, "i_valdir", () => openMenu(() => {
  const gen = st.f.gen && !st.f.warned;
  if (gen) tip("tip_co");
  return { title: "👨 " + t("i_valdir"), who: t("i_valdir"), info: [gen ? tx("valdirGen") : st.f.warned ? tx("valdirThanks") : tx("valdirIdle")], opts: gen ? [
    { label: t("valdirWarn"), fn: () => { st.f.warned = 1; city.gen.position.set(-8, 0, -18.5); st.s.mood = clamp(st.s.mood + 10); Audio.play("ok"); } },
  ] : [] };
}), { mark: () => st.f.gen && !st.f.warned });

spot(x0 - 1.5, z1 + 1, 2, "i_elev", () => openMenu(() => ({ title: "🛗 " + t("i_elev"), info: [after() ? t("elevOff") : t("elevOn")] })));
spot(hx, z1, 1.9, "i_door", () => openMenu(() => ({ title: "🚪 " + t("i_door"), info: [t(st.locked ? "doorLocked" : "doorOpen")], opts: [
  st.locked ? { label: "🔓 " + t("unlock"), fn: () => { setLock(false); return "close"; } } : { label: "🔒 " + t("lock"), fn: () => { setLock(true); return "close"; } },
] })));
// marcadores ❗ sobre quem precisa de você
const markTex = (() => { const cv = document.createElement("canvas"); cv.width = cv.height = 64; const c = cv.getContext("2d"); c.font = "52px sans-serif"; c.textAlign = "center"; c.fillText("❗", 32, 52); const tt = new THREE.CanvasTexture(cv); return tt; })();
// mapa real: mercado, farmácia, banca, caixa eletrônico e posto vão para os lugares de verdade (ou lojas genéricas)
if (OSMP) {
  const mv = (key, p) => { const s = SPOTS.find((x) => x.key === key); if (s && p) { s.x = p.x; s.z = p.z; s.r = Math.max(s.r, 3.4); } };
  mv("i_market", OSMP.market); mv("i_pharma", OSMP.pharma); mv("i_atm", OSMP.atm); mv("i_gas", OSMP.gas); mv("i_newsstand", OSMP.news);
}
SPOTS.filter((s) => s.mark).forEach((s) => { s.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: markTex, depthTest: false })); s.sprite.scale.set(1.4, 1.4, 1); s.sprite.position.set(s.x, 4.6, s.z); s.sprite.visible = false; world.scene.add(s.sprite); });

// ---------------------------------------------------------------- dormir, desmaiar, fim
function setLock(v) {
  st.locked = !!v; city.setDoor(st.locked); Audio.play("click");
  if (v) { st.f.lockedOnce = 1; toast("🔒 " + t("locked"), 2200); tip("tip_lock"); } else toast("🔓 " + t("unlocked"), 1600);
}
/** Dormiu com a porta destrancada durante o apagão: alguém entra e leva parte do estoque. */
function robbery() {
  st.f.robbed = (st.f.robbed || 0) + 1;
  for (const k of ["can", "biscuit", "rice", "candle", "batt"]) if (st.cupboard[k]) add(st.cupboard, k, -Math.ceil(st.cupboard[k] / 2));
  st.homeWater = Math.max(0, st.homeWater - 6); st.homeRaw = Math.max(0, st.homeRaw - 6);
  st.s.mood = clamp(st.s.mood - 15); Audio.play("wrong"); news("nRob"); tip("tip_lock");
}
function sleep(n) {
  const openDoor = after() && !st.locked;
  const steps = Math.ceil(n * 4);
  for (let i = 0; i < steps; i++) { advance(n / steps, true); runEvents(); if (st.ended) return; }
  st.s.mood = clamp(st.s.mood + 5); Audio.play("ok"); toast(fmtT(), 2200, true);
  if (openDoor && !st.ended) robbery();
}
function faint() {
  playing = false; input.setVisible(false); Audio.play("die");
  if (st.diff === "hard") {
    store.del("save");
    screen([h("h2", "😵 " + t("faint")), h("p", t("faintHard")), debrief(), h("button.ez-btn.wide", { onclick: () => location.reload() }, "↺ " + t("restart"))], { dim: true });
    return;
  }
  for (const k of Object.keys(st.bag)) if (Math.random() < 0.3) { const lose = Math.ceil(st.bag[k] * 0.5); add(st.bag, k, -lose); }
  Object.assign(st.s, { health: 45, water: Math.max(st.s.water, 40), food: Math.max(st.s.food, 40), energy: 50, mood: 35 });
  advance(6, true);
  me.respawn({ x: BED.x - 2, y: 0.05, z: BED.z });
  const scr = screen([h("h2", "😵 " + t("faint")), h("p", t("faintEasy")), h("button.ez-btn.wide", { onclick: () => { scr.close(); start(); } }, "▶ " + t("resume"))], { dim: true });
}
function grade() {
  const f = st.f, rows = [
    ["e_cash", (f.cashB ?? st.cash) >= 100 ? 10 : (f.cashB ?? st.cash) >= 50 ? 5 : 0, "tip_cash"],
    ["e_car", st.carFuel >= 50 ? 10 : f.fuelB ? 5 : 0, "tip_fuel"],
    ["e_bag", (5 - packMissing().length) * 2, "tip_pack"],
    ["e_water", f.waterMax >= 10 ? 10 : f.waterMax >= 5 ? 5 : 0, "tip_water"],
    ["e_food", (f.foodB ?? 0) >= 4 ? 10 : (f.foodB ?? 0) >= 2 ? 5 : 0, "tip_fridge"],
    ["e_light", f.lightB ? 10 : 0, "tip_night"],
    ["e_radio", f.radio >= 2 ? 10 : f.radio >= 1 ? 5 : 0, "tip_radio"],
    ["e_meet", f.meet ? 10 : 0, "tip_phone"],
    ["e_crowd", f.crowdMin < 30 ? 10 : f.crowdMin < 90 ? 5 : 0, "tip_crowd"],
    ["e_co", (f.warned ? 5 : 0) + (f.coInside ? 0 : 5), "tip_co"],
    ["e_help", f.helpedZe ? 10 : 0, "tip_elder"],
    ["e_lock", f.robbed ? 0 : f.lockedOnce ? 10 : 5, "tip_lock"],
  ];
  if (f.ateSpoiled) rows.push(["e_spoiled", -5, "tip_spoiled"]);
  return { rows, total: Math.max(0, Math.round(rows.reduce((a, r) => a + r[1], 0) / 120 * 100)) };
}
function debrief() {
  const { rows, total } = grade();
  return h("div",
    h("p", h("b", t("score", { v: total }))),
    ...rows.map(([k, p, tk]) => h("details", { style: { margin: "4px 0", background: p >= 10 ? "#dcfce7" : p > 0 ? "#fef9c3" : "#fee2e2", borderRadius: "10px", padding: "6px 10px" } },
      h("summary", { style: { fontWeight: 700, cursor: "pointer" } }, (p >= 10 ? "✅ " : p > 0 ? "🟡 " : "❌ ") + t(k) + ` (${p})`),
      h("p", { style: { fontSize: "14px" } }, tx(tk)))));
}
function endChapter(how = "forced") {
  if (st.ended) return;
  st.ended = 1; playing = false; input.setVisible(false);
  const party = celebrate({ big: true });                           // festa grande: ~22 s com a trilha de vitória
  grantWin();                                                      // terminar o capítulo = item novo
  const { total } = grade();
  const best = Math.max(total, +store.get("best", 0)); store.set("best", best); store.del("save");
  track("game_end", { mode: "real", score: total, difficulty: st.diff });
  const stars = total >= 80 ? "⭐⭐⭐" : total >= 55 ? "⭐⭐" : "⭐";
  screen([h("h1", stars), h("h2", { style: { textAlign: "center" } }, t(how === "car" ? "endCar" : how === "foot" ? "endFoot" : "endForced")), h("p", t("endSub")), debrief(), h("p", t("best", { v: best })), h("p.ez-msg", t("next")),
    h("button.ez-btn.wide", { onclick: () => { party.stop(); location.reload(); } }, "🏠 " + t("menu"))], { dim: true });
}

// ---------------------------------------------------------------- HUD
const bars = {};
const barEl = (k, e) => { const fill = h("i"); bars[k] = fill; return h("div.sv-bar", { title: t("s_" + k) }, h("span", e), h("b", fill)); };
const barsEl = h("div.sv-bars", barEl("food", "🍽️"), barEl("water", "💧"), barEl("energy", "⚡"), barEl("health", "❤️"));
const clockPill = h("div.ez-pill"), powerPill = h("div.ez-pill"), cashPill = h("div.ez-pill");
const prompt = h("div.sv-prompt.ez-hidden"), crowdPill = h("div.sv-alert.ez-hidden");
const goalsEl = h("div.sv-goals", { onclick: () => { if (goalsEl.classList.contains("min")) goalsEl.classList.remove("min"); else goalsEl.classList.toggle("open"); } });
const feedEl = h("div.sv-feed");
const btn = (e, fn, title) => h("button.ez-rbtn", { title, onclick: fn }, e);
const chatBtn = btn("💬", () => openQuickChat(sayChat));
const bagBtn = btn("🎒", () => openBag(), "I");
var badge = bagBadge(h, bagBtn);
const phoneBtn = btn("📱", () => openComm(), "Q");
// O percentual da bateria fica DENTRO do ícone do celular, para economizar espaço no topo
// (pedido do dono, 25/11/2026).
const phonePct = h("span.sv-batt", "--");
phoneBtn.style.position = "relative"; phoneBtn.appendChild(phonePct);
const topEl = h("div.ez-top", clockPill, powerPill, cashPill, roomPill(room), h("div.ez-spacer"),
    bagBtn, phoneBtn, btn("🔦", () => toggleFlash(), "F"), chatBtn, btn("✕", () => pause(), t("closeT")));
const guideEl = h("div.sv-guide.ez-hidden", h("span.arr", "⬆"), h("span.txt"));
const hud = h("div.ez-hud.ez-hidden", topEl,
  barsEl,
  goalsEl, feedEl, prompt, crowdPill, guideEl);
document.body.appendChild(hud);
function feed(msg) {
  const el = h("div", msg); feedEl.prepend(el);
  while (feedEl.children.length > 3) feedEl.lastChild.remove();
  setTimeout(() => el.classList.add("old"), 9000);
}
const waterAll = () => st.homeWater + st.homeRaw + (st.bag.water || 0) + (st.bag.raw || 0);
const npAll = () => ["can", "biscuit", "rice"].reduce((a, k) => a + (st.bag[k] || 0) + (st.cupboard[k] || 0), 0);
const packMissing = () => [
  (st.bag.water || 0) >= 3 ? null : "pk_water", ["can", "biscuit", "cooked"].reduce((a, k) => a + (st.bag[k] || 0), 0) >= 2 ? null : "pk_food",
  has(st.bag, "flash") ? null : "pk_flash", has(st.bag, "radio") ? null : "pk_radio", has(st.bag, "docs") ? null : "pk_docs"].filter(Boolean);
// Fase 1: em ordem. { id, done, spot (para a seta) }
const MS_PRE = [
  { id: "news", done: () => st.f.sawNews },
  { id: "shelf", done: () => has(st.bag, "flash") && has(st.bag, "radio"), spot: "i_shelf" },
  { id: "charge", done: () => st.phone >= 80, spot: "i_shelf" },
  { id: "meet", done: () => st.f.meet },
  { id: "cupboard", done: () => has(st.bag, "matches") || !has(st.cupboard, "matches"), spot: "i_cupboard" },
  { id: "water", done: () => waterAll() >= 10, spot: "i_sink" },
  { id: "cash", done: () => st.cash >= 100 || st.withdrawn > 0, spot: "i_atm" },
  { id: "market", done: () => (has(st.bag, "batt") || st.flashH > 0) && npAll() >= 4, spot: "i_market" },
  { id: "fuel", done: () => st.carFuel >= 50, spot: () => (has(st.bag, "gascan") ? "i_parking" : "i_gas") },
];
// Fases 2 e 3: a primeira que valer agora.
const MS_POST = [
  { id: "light", when: () => isDark() && !st.f.usedLight && has(st.bag, "flash") && (st.flashH > 0 || has(st.bag, "batt")) },
  { id: "valdir", when: () => st.f.gen && !st.f.warned, spot: "i_valdir" },
  { id: "radio", when: () => !st.f.heard && has(st.bag, "radio") && (st.radioH > 0 || has(st.bag, "batt")) },
  { id: "eat", when: () => st.s.food < 40 || st.s.water < 40 },
  { id: "treat", when: () => (st.bag.raw || 0) + st.homeRaw > 0 && (has(st.bag, "matches") || has(st.bag, "bleach")), spot: "i_stove" },
  { id: "ze", when: () => st.T > B() + 12 && !st.f.helpedZe && (st.bag.water || 0) + st.homeWater >= 3, spot: "i_ze" },
  { id: "pack", when: () => st.T >= B() + 48 && packMissing().length, vars: () => ({ x: packMissing().map((k) => t(k)).join(", ") }), phase: "phLeave" },
  { id: "leave", when: () => st.T >= B() + 48, spot: "i_parking", phase: "phLeave" },
  { id: "lock", when: () => isDark() && !st.locked && city.insideHome(me.x, me.z), spot: "i_door" },
  { id: "sleep", when: () => isDark() && st.s.energy < 75, spot: "i_bed" },
  { id: "wait", when: () => true, vars: () => ({ h: Math.max(0, Math.ceil(B() + 48 - st.T)) }) },
];
function curMission() {
  if (!after()) {
    const i = MS_PRE.findIndex((m) => !m.done());
    if (i < 0) return { id: "ready", phase: "phPre", spot: "i_bed" };
    return Object.assign({ phase: "phPre", i: i + 1, n: MS_PRE.length }, MS_PRE[i]);
  }
  const m = MS_POST.find((x) => x.when());
  return Object.assign({ phase: "phPost" }, m);
}
let mission = null, lastMission = "";
const POST_DONE = { light: () => st.f.usedLight, valdir: () => st.f.warned, radio: () => st.f.heard, eat: () => st.s.food >= 40 && st.s.water >= 40, treat: () => (st.bag.raw || 0) + st.homeRaw <= 0,
  lock: () => st.locked, ze: () => st.f.helpedZe, pack: () => !packMissing().length, sleep: () => st.s.energy >= 75 };
function missionDone(id) { const p = MS_PRE.find((x) => x.id === id); return p ? !!p.done() : POST_DONE[id] ? !!POST_DONE[id]() : false; }
function goals() {
  mission = curMission();
  const m = mission, spotKey = typeof m.spot === "function" ? m.spot() : m.spot;
  m.target = spotKey ? SPOTS.find((s) => s.key === spotKey) : null;
  if (m.id !== lastMission) {
    if (lastMission && playing && missionDone(lastMission)) {
      celebrate({ big: false });                                   // comemoração parcial (3x mais longa que antes)
      if (st && st.diff === "hard") grantWin({ half: true });       // 2 fases difíceis = 1 item novo no boneco
    }
    lastMission = m.id; goalsEl.classList.remove("open", "min");
  }
  const kids = [h("small.ph", t(m.phase)), h("b", "🚩 " + (m.i ? t("msN", { i: m.i, n: m.n }) : t("msNow"))),
    h("div.what", ...parts(t("ms_" + m.id, m.vars ? m.vars() : null)).map((x) => h("span.ln", x))), h("small.why", "💡 " + t("msWhy") + tx("mw_" + m.id))];
  if (!after()) kids.push(h("small.more", "▾ " + t("msList")), ...MS_PRE.map((x, i) => h("div.li" + (x.done() ? ".ok" : ""), (x.done() ? "✅ " : i + 1 === m.i ? "▶ " : "⬜ ") + t("ms_" + x.id).split(/[.(]/)[0])));
  kids.push(h("small.obj", t("objMain")));
  kids.push(h("button.sv-x", { onclick: (e) => { e.stopPropagation(); goalsEl.classList.add("min"); } }, "✕"), h("span.chip", "🚩 " + t("msShow")));
  goalsEl.replaceChildren(...kids);
}
const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 40, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
beacon.visible = false; world.scene.add(beacon);
function updGuide() {
  if (dest && Math.hypot(dest.x - me.x, dest.z - me.z) < dest.r) { dest = null; toast("📍 " + t("destReached"), 1800); Audio.play("cp"); }
  const tg = dest || (mission && mission.target), d = tg ? Math.hypot(tg.x - me.x, tg.z - me.z) : 0;
  const on = !!tg && playing && !menuOpen && d > tg.r * 0.8;
  guideEl.classList.toggle("ez-hidden", !on); beacon.visible = on && d > 5;
  if (!on) return;
  beacon.position.set(tg.x, 20, tg.z); beacon.material.opacity = 0.28 + Math.sin(performance.now() / 250) * 0.1;
  const b = cam.basis(), dx = tg.x - me.x, dz = tg.z - me.z;
  const ang = Math.atan2(dx * b.rx + dz * b.rz, dx * b.fx + dz * b.fz);
  guideEl.firstChild.style.transform = `rotate(${ang}rad)`;
  guideEl.lastChild.textContent = " " + t(tg.key) + " · " + t("guideM", { m: Math.max(1, Math.round(d * M_PER_UNIT)) });
}
let hudT = 0;
function updHud() {
  if (!st) return;
  clockPill.textContent = "🕒 " + fmtT();
  powerPill.textContent = after() ? t("powerOff", { h: Math.floor(st.T - B()) }) : t("powerOn");
  powerPill.style.background = after() ? "rgba(127,29,29,.8)" : "";
  cashPill.textContent = "💵 R$ " + st.cash;
  const pc = Math.round(st.phone);
  phonePct.textContent = pc + "%";
  phonePct.style.background = pc <= 10 ? "#ef4444" : pc <= 30 ? "#f59e0b" : "rgba(15,23,42,.85)";
  const top = topEl.getBoundingClientRect().bottom + 6;
  barsEl.style.top = top + "px"; goalsEl.style.top = top + barsEl.offsetHeight + 8 + "px";
  bars.health.parentNode.parentNode.style.display = st.s.health < 95 ? "" : "none";
  chatBtn.style.display = room.connected ? "" : "none";
  badge.set(Object.keys(st.bag).filter((x) => IT[x] && st.bag[x] > 0).length);
  for (const k in bars) { const v = st.s[k]; bars[k].style.width = v + "%"; bars[k].style.background = v < 20 ? "#ef4444" : v < 45 ? "#f59e0b" : "#22c55e"; }
  goals();
}
function openHow() { pagedMenu(t("howTitle"), ["how1", "how2", "how3", "how4", "how5"].map((k) => t(k))); }
function openTips() {
  openMenu(() => ({ title: t("tipsBook"), info: st.tips.length ? st.tips.map((k) => h("p", { style: { fontSize: "14px", background: "#f1f5f9", borderRadius: "10px", padding: "6px 10px" } }, tx(k))) : [t("noTips")] }));
}

// ---------------------------------------------------------------- chat e rede
room.on("chat", (d, from) => { const r = remotes.get(from); if (r && d && typeof d.m === "number") { r.ch.say(chatText(d.m)); Audio.play("pop"); } });
function sayChat(i) { me.ch.say(chatText(i)); Audio.play("pop"); room.send("chat", { m: i }); }
room.onShared((sh) => { if (!st || room.isHost || !sh || typeof sh.T !== "number") return; if (sh.cause) st.cause = sh.cause; if (typeof sh.B === "number") st.B = sh.B; if (Math.abs(sh.T - st.T) > 0.05) { const d = sh.T - st.T; if (d > 0) advance(d); else st.T = sh.T; } });
room.onStatus((k) => { if (k === "room") me.setLook(me.ch.look); });
let shareT = 0;

// sons próprios
Audio.addSfx("blackout", ({ tone, noise, now }) => { const n = now(); tone("sawtooth", 180, n, 1.2, 0.25, undefined, 30); noise(n, 0.4, 0.3, undefined, 300); });
Audio.addSfx("radio", ({ noise, tone, now }) => { const n = now(); noise(n, 0.5, 0.12, undefined, 2500); tone("sine", 1000, n + 0.5, 0.08, 0.1); });

// ---------------------------------------------------------------- telas
let cfg = Object.assign({ map: "gyn", age: "kid", diff: "easy" }, store.getJSON("cfg", {}), { mode: "real" });
function showTitle() {
  playing = false; hud.classList.add("ez-hidden"); input.setVisible(false);
  const saved = store.getJSON("save", null);
  const act = consumeAction();
  const mapOk = (sv) => (sv.map || "gyn") === MAP_NOW;
  if (act === "cont" && saved && !saved.ended) { if (!mapOk(saved)) { toast(t("map_lost"), 6000); showSetup(); return; } load(saved); start(); return; }
  if (act === "novo:osm" || act === "novo:gyn") { if (act === "novo:osm" && !OSM) { toast(t("map_lost"), 6000); showSetup(); return; } load(newState(cfg)); showIntro(); return; }
  if (act === "novo") { showSetup(); return; }
  let scr = null;
  const close = () => scr.close();
  scr = homeScreen({
    icon: "🔦", title: t("title"), subtitle: t("tagline") + " · v" + VERSION,
    look: me.ch.look, onLook: (lk) => me.setLook(lk),
    world, room, reopen: showTitle, roomActions: roomActions(room, store, enterGame),
    scenicAt: me.body ? { x: me.body.x, y: me.body.y, z: me.body.z } : null,
    note: isTouch ? null : t("help"),
    buttons: modeHome(store, {
      contReal: () => { close(); if (!mapOk(saved)) { location.replace("?acao=cont"); return; } load(saved); start(); },
      newReal: () => { close(); showSetup(); },
    }, { reopen: showTitle, close }),
  });
}
/** Entra no jogo a partir da tela de amigos: continua o jogo salvo ou abre o "novo jogo". */
function enterGame() { const sv = store.getJSON("save", null); if (sv && !sv.ended) { load(sv); start(); } else showSetup(); }
function showSetup() {
  const body = h("div.ez-col");
  const chip = (group, val, label, dis) => h("button.ez-chip" + (cfg[group] === val ? ".sel" : ""), { disabled: dis ? true : null, style: dis ? { opacity: 0.45 } : null, onclick: () => { if (dis) return; cfg[group] = val; Audio.play("click"); draw(); } }, label + (dis ? " (" + t("soon") + ")" : ""));
  let scr = null;
  function draw() {
    body.replaceChildren(...[
      h("h3", t("map")), h("div.ez-row", chip("map", "gyn", t("map_gyn")), chip("map", "rio", t("map_rio"), true), room.connected ? null : chip("map", "osm", t("map_osm"))),
      cfg.map === "osm" && !room.connected ? osmBox() : null,
      h("h3", t("age")), h("div.ez-row", chip("age", "kid", t("age_kid")), chip("age", "teen", t("age_teen"))),
      h("h3", t("diff")), h("div.ez-row", chip("diff", "easy", t("d_easy")), chip("diff", "hard", t("d_hard"))),
      h("p.ez-msg", t(cfg.diff === "hard" ? "d_hardInfo" : "d_easyInfo")),
      h("button.ez-btn.wide", { style: { marginTop: "10px" }, onclick: () => {
        if (cfg.map === "osm" && room.connected) cfg.map = "gyn";
        store.setJSON("cfg", cfg);
        // mapa diferente do que está montado: recarrega a página já com o mapa certo
        if (cfg.map === "osm") { const pk = pinnedPack("pick"); if (!pk) { choose(); return; } pinPack(pk, "game"); location.replace("?acao=novo:osm"); return; }
        if (MAP_NOW !== "gyn") { location.replace("?acao=novo:gyn"); return; }
        scr.close(); load(newState(cfg)); showIntro();
      } }, "▶ " + t("start")),
      h("button.ez-btn.gray.wide", { onclick: () => { scr.close(); showTitle(); } }, t("back")),
    ].filter(Boolean));
  }
  function choose() {
    scr.close();
    openPicker({ kid: cfg.age !== "teen", size: cfg.citySize || 250, onSize: (v) => { cfg.citySize = v; }, okLabel: t("useHere"), title: t("map_osm"),
      onPack: (p) => { pinPack(p, "pick"); showSetup(); }, onCancel: showSetup });
  }
  function osmBox() {
    const pk = pinnedPack("pick");
    return h("div.ez-col", { style: { gap: "4px" } }, h("p.ez-msg", t("map_osmInfo")), h("p", { style: { margin: "2px 0", fontWeight: "600" } }, pk ? "📍 " + shortLabel(pk.label) : t("map_none")),
      h("button.ez-btn.blue.wide", { onclick: choose }, t(pk ? "map_change" : "map_pick")));
  }
  draw();
  scr = screen([h("h2", t("m_real") + " · " + t("newGame")), body]);
}
function showIntro() {
  pagedScreen(h, screen, { title: "🌆 " + t("sub"), text: t("intro"), nextLabel: t("nextP"), backLabel: t("backP"), endLabel: "▶ " + t("play"), onEnd: start });
}
function load(s) {
  st = s; setKidMode(st.age === "kid");
  // Save antigo (de antes das casas abertas) não tinha item nenhum no chão: completa uma vez só.
  // Era por isso que o dono entrava nas casas abertas e não achava nada (26/11/2026).
  if (!OSM && st.f && !st.f.hloot) { st.f.hloot = 1; st.ground = (st.ground || []).concat(houseLoot()); }
  setTimeout(() => social.loadGround(st.ground || []), 0);
  allowRespawn = true; me.respawn({ x: st.pos.x, y: 0.05, z: st.pos.z }); allowRespawn = false;
  city.setPower(!after()); city.setTowerLight(st.T < B() + 8); city.setDoor(!!st.locked);
  city.gen.visible = !!st.f.gen || !!st.f.warned; if (st.f.warned) city.gen.position.set(-8, 0, -18.5);
  feedEl.replaceChildren(); updHud();
}
function start() {
  playing = true; hud.classList.remove("ez-hidden"); input.setVisible(true); world.setPaused(false);
  Audio.init(); music = music || installMusic(Audio); track("game_start", { mode: "real", multiplayer: room.connected ? 1 : 0, difficulty: st.diff, age_band: st.age });
  if (!store.get("howSeen")) { store.set("howSeen", "1"); openHow(); }
}
function pause(showMenu = true) {
  playing = false; world.setPaused(true); input.setVisible(false); save();
  if (!showMenu) return;
  const scr = screen([h("h2", "⏸ " + t("paused")), h("div.ez-col",
    h("button.ez-btn.wide", { onclick: () => { scr.close(); resume(); } }, "▶ " + t("resume")),
    h("button.ez-btn.blue.wide", { onclick: () => { scr.close(); resume(); openTips(); } }, t("tipsBook")),
    h("button.ez-btn.blue.wide", { onclick: () => { scr.close(); resume(); openHow(); } }, t("howTitle")),
    h("button.ez-btn.blue.wide", { onclick: () => { scr.close(); openRoomPanel(room, { onClose: resume, actions: roomActions(room, store, resume) }); } }, t("friends")),
    h("button.ez-btn.gray.wide", { onclick: () => { scr.close(); openSettings({ world, onClose: () => pause() }); } }, "⚙️ " + t("settings")),
    h("button.ez-btn.gray.wide", { onclick: () => { scr.close(); showTitle(); } }, t("exitMenu")))], { dim: true });
  addX(h, scr, () => { scr.close(); resume(); });
}
function resume() { start(); }
onAppHide(() => { if (playing) pause(); });   // trocar de aba / minimizar: pausa e cala a música
function save() { if (st && !st.ended) { st.pos = { x: me.x, z: me.z }; store.setJSON("save", st); } }
onLangChange(() => updHud());
addEventListener("pagehide", save);

input.onAction("pause", () => { if (playing && !menuOpen) pause(); });
input.onAction("chat", () => { if (playing && !menuOpen) openQuickChat(sayChat); });
addEventListener("keydown", (e) => {
  if (!playing || menuOpen) return;
  if (e.code === "KeyI") openBag(); else if (e.code === "KeyF") toggleFlash(); else if (e.code === "KeyQ") openComm(); else if (e.code === "KeyM") openMap();
  else { const n = parseInt(e.key, 10); if (n >= 0 && n <= 9) sayChat(n === 0 ? 9 : n - 1); }
});

// ---------------------------------------------------------------- jogar junto: chão, troca, mochila nas costas
const unitOf = (k) => (k === "water" || k === "raw" ? Math.min(1, st.bag[k] || 0) : 1);
// Moradores dentro das casas abertas com itens (a regra 50/50/50 do dono marcou quais):
// ficam na sala e NÃO deixam ninguém levar as coisas deles.
const residents = (city.houses || []).filter((hh) => hh.npc).map((hh, i) => {
  const b = createBot({ world, phys, look: randomLook(""), area: { x0: hh.x - 2.4, x1: hh.x + 2.4, z0: hh.z - 2, z1: hh.z + 2 }, speed: 0.22 });
  b.house = hh; b.resident = true; b.talk = true; b.trades = i % 2 === 0;   // metade troca, metade não
  if (b.trades) setupTrade(b);
  b.ch.showLabel = false; b.ch.makeLabel(); return b;
});
/** Item vigiado? (está dentro de uma casa que tem morador e o morador está por perto) */
function guardedItem(it) {
  for (const r of residents) {
    if (r.friend) continue;                       // já trocou com ele: virou amigo e pode pegar
    if (!r.house.inside(it.x, it.z)) continue;
    if (Math.hypot(r.body.x - it.x, r.body.z - it.z) < 7) return tx("hGuard");
  }
  return null;
}
const social = setupSocial({ world, room, remotes, me, openMenu, busy: () => menuOpen || !playing,
  guard: guardedItem,
  onGround: (list) => { if (st && !room.connected) st.ground = list; },
  bag: {
    list: () => Object.keys(st.bag).filter((k) => IT[k] && st.bag[k] > 0),
    has: (k) => (st.bag[k] || 0) > 0, take: (k) => { const n = unitOf(k); add(st.bag, k, -n); return n; }, give: (k, n) => add(st.bag, k, n),
    fits: (k) => fits(k, 1), label: (k) => itName(k).replace(/ \(.*\)/, ""), emoji: (k) => IT[k] && IT[k].e, slots: () => (st ? slotsUsed() : 0),
  } });

// ---------------------------------------------------------------- loop
let music = null, near = null, crowdTick = 0, inCrowdPrev = false, saveT = 0;
function nearestSpot() {
  let best = null, bd = 1e9;
  for (const s of SPOTS) { const d = Math.hypot(s.x - me.x, s.z - me.z); if (d < s.r && d < bd) { bd = d; best = s; } }
  return best;
}
world.onUpdate((dt) => {
  const active = playing && !menuOpen && st && !st.ended;
  if (active) {
    me.update(dt);
    // relógio: antes do apagão o tempo corre devagar (dá para se preparar)
    if (!room.connected || room.isHost) {
      const rate = !after() ? (st.diff === "hard" ? 1 / 100 : 1 / 150) : st.diff === "hard" ? 1 / 16 : 1 / 22;
      advance(dt * rate);
    }
    runEvents();
    if (st.ended) return;
    if (st.s.health <= 0) { faint(); return; }
    // interação
    near = nearestSpot();
    if (!near) { const tb = nearestTalker(); if (tb) near = { key: "npcNear", open: () => talkTo(tb) }; }
    if (!near && OSM) { const d = OSM.nearDoor(me.x, me.z); if (d) near = { key: d.open ? "osmDoorClose" : "osmDoorOpen", open: () => { OSM.toggleDoor(d); Audio.play("click"); } }; }
    const soc = social.near(!near);   // item no chão tem prioridade; troca só longe dos lugares
    const useSoc = soc && (!near || soc.text.startsWith("⬆"));
    prompt.classList.toggle("ez-hidden", !near && !soc);
    if (useSoc) { prompt.textContent = (isTouch ? "✋ " : "E · ") + soc.text; if (input.pressed("act")) soc.act(); }
    else if (near) { prompt.textContent = (isTouch ? "✋ " : "E · ") + t(near.key); if (input.pressed("act")) { if (near.onTry) near.onTry(); near.open(); } }
    // aglomeração
    const inCrowd = Object.entries(ZONES).some(([k, z]) => crowdOn(k) && Math.hypot(me.x - z.x, me.z - z.z) < z.r);
    if (music) {
      const nearCrowd = Object.entries(ZONES).some(([k, z]) => crowdOn(k) && Math.hypot(me.x - z.x, me.z - z.z) < z.r + 8);
      const danger = nearCrowd || st.s.health < 30 || st.s.water < 15 || (st.f.gen && !st.f.warned && Math.hypot(me.x + 8, me.z + 12) < 14) || (after() && isDark() && !lightOn() && !city.insideHome(me.x, me.z));
      const tg = dest || (mission && mission.target), closeTg = tg && Math.hypot(tg.x - me.x, tg.z - me.z) < 14;
      music.update(dt, danger ? 2 : closeTg ? 1 : 0);
    }
    crowdPill.classList.toggle("ez-hidden", !inCrowd);
    if (inCrowd) {
      crowdPill.textContent = t("inCrowd");
      if (!inCrowdPrev) { tip("tip_crowd"); if (st.cash > 0 && Math.random() < 0.4) { const v = Math.max(5, Math.round(st.cash * (kid() ? 0.15 : 0.3))); st.cash -= Math.min(v, st.cash); toast(tx(kid() ? "crowdLost_k" : "crowdLost", { v }), 3000); Audio.play("push"); } }
      const g = dt * (!after() ? 1 / 150 : 1 / 22) * 60; st.f.crowdMin += g; crowdTick += g;
      if (crowdTick > 15) { crowdTick = 0; st.s.mood = clamp(st.s.mood - 4); st.s.health = clamp(st.s.health - 2); if (Math.random() < 0.5) { me.body.push(Math.random() - 0.5, Math.random() - 0.5, 3, 8); Audio.play("push"); } }
    }
    inCrowdPrev = inCrowd;
    if (after() && isDark()) tip("tip_night");
    showNextTip();
    saveT += dt; if (saveT > 20) { saveT = 0; save(); }
  }
  if (st) {
    for (const [k, list] of Object.entries(crowds)) { const on = crowdOn(k); list.forEach((b) => { b.ch.root.visible = on; if (on) b.update(dt); }); }
    updateDwellers(dt);                      // moradores das ruas (agressivos e ladrões depois do apagão)
    residents.forEach((b) => b.update(dt));  // moradores dentro das casas
    city.updateHouses(me.x, me.z);           // telhado da casa em que o jogador entrou
    for (const s of SPOTS) if (s.sprite) { s.sprite.visible = !!s.mark(); s.sprite.position.y = 4.6 + Math.sin(performance.now() / 300) * 0.2; }
    const cp = world.camera.position, camIn = cp.y < 18 && cp.x > HOME.x - HOME.w / 2 - 5 && cp.x < HOME.x + HOME.w / 2 + 1.5 && cp.z > HOME.z - HOME.d / 2 - 1.5 && cp.z < HOME.z + HOME.d / 2 + 2.5;
    const inside = city.insideHome(me.x, me.z); city.roof.visible = !inside && !camIn; city.homeLabel.visible = Math.hypot(me.x - HOME.x, me.z - HOME.z) > 16;
    Object.values(city.npcs).forEach((c) => c.animate(dt, 0, true));
    if (OSM) { OSM.setInside(OSM.insideHollow(me.x, me.z)); OSM.update(dt); people.forEach((b) => b.update(dt)); }
    updateLight(dt);
    hudT -= dt; if (hudT <= 0) { hudT = 0.5; updHud(); }
    updGuide();
    if (room.connected && room.isHost) { shareT -= dt; if (shareT <= 0) { shareT = 1; room.setShared({ T: st.T, B: st.B, cause: st.cause }); } }
  }
  remotes.update(dt);
  if (st) social.update(dt);
  endFrame(phys);
  input.endFrame();
});
world.start();
allowRespawn = true; me.respawn(spawn); allowRespawn = false;
cam.update(0.016, me.body);
if (bootRoom(room, store)) toast(t("mpConnecting"));
showTitle();
window.GAME = { world, phys, me, room, city, cam, input, get st() { return st; }, advance: (hh) => { advance(hh); runEvents(); }, newState, load, start, SPOTS,
  // conferência rápida no console: contagem das casas e dos moradores
  casas: () => ({ total: city.houses.length, abertas: city.houses.filter((x) => x.open).length, comItem: city.houses.filter((x) => x.loot).length, comMorador: city.houses.filter((x) => x.npc).length, lista: city.houses.map((x) => ({ x: x.x, z: x.z, aberta: x.open, item: x.loot, morador: x.npc })) }),
  bots: () => ({ total: dwellers.length, agora: dwellers.filter(dwellerOn).length, conversam: dwellers.filter((b) => b.talk).length, trocam: dwellers.filter((b) => b.trades).length, moradores: residents.length }),
  itens: () => (st.ground || []).length };
