// Multiplayer without login: WebRTC rooms (PeerJS) with a 4-letter code, up to 4 players.
// Topology: the room creator is the host and relays everything (star). The transport is isolated
// in this file so it can be swapped (e.g. Firebase) without touching the games.
//
//   const room = createRoom({ gameId: "demo" });
//   room.onStatus((key, info) => ...)       // "connecting" | "room" | "fail" | "full" | "notFound" | "hostLeft" | "left"
//   room.create() / room.join("ABCD") / room.leave()
//   room.presence({ x, y, z, look })         // my state (merged, sent ~15x/s)
//   room.onPeers((peers) => ...)             // [{ id, isMe, presence }]
//   room.send("chat", { m: 3 })              // reliable event to everyone
//   room.on("chat", (data, fromId) => ...)
//   room.shared / room.setShared(obj)        // host-owned game state (level, timer, seed…)
//   room.onShared((obj) => ...)
import { Character } from "./avatar.js";

const PEERJS_URL = "https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js";
let peerLib = null;
function loadPeer() {
  if (window.Peer) return Promise.resolve(window.Peer);
  if (peerLib) return peerLib;
  peerLib = new Promise((res, rej) => {
    const s = document.createElement("script"); s.src = PEERJS_URL; s.async = true;
    s.onload = () => res(window.Peer); s.onerror = () => { peerLib = null; rej(new Error("peerjs")); };
    document.head.appendChild(s);
  });
  return peerLib;
}
const safe = (p, max = 6000) => { try { const j = JSON.stringify(p); return j && j.length < max ? JSON.parse(j) : null; } catch (e) { return null; } };
const code4 = () => { const A = "ABCDEFGHJKLMNPQRSTUVWXYZ"; let c = ""; for (let i = 0; i < 4; i++) c += A[Math.floor(Math.random() * A.length)]; return c; };

export function createRoom(opt = {}) {
  const MAX = opt.max || 4;
  const PREFIX = "gilele-" + (opt.gameId || "game") + "-v1-";
  const qs = new URLSearchParams(location.search), srv = qs.get("server");
  const popts = srv ? { host: srv.split(":")[0], port: +srv.split(":")[1] || 9000, path: "/", secure: false } : {};
  popts.config = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }] };

  let peer = null, isHost = false, myId = null, code = null, hostConn = null, dirty = true, lastSnap = 0, lastSent = 0;
  const conns = new Map(), seen = {}, myP = {}, evH = {}, peersFns = [], statusFns = [], sharedFns = [];
  let pres = {}, shared = {}, sharedVer = 0;

  const status = (k, info) => statusFns.forEach((f) => f(k, info || {}));
  function list() {
    const L = [{ id: myId || "me", isMe: true, presence: myP }];
    for (const id in pres) if (id !== myId) L.push({ id, isMe: false, presence: pres[id] });
    return L;
  }
  const emit = () => { const L = list(); peersFns.forEach((f) => f(L)); };
  function dispatch(type, data, from) { (evH[type] || []).forEach((f) => { try { f(data, from); } catch (e) { console.error(e); } }); }

  function reset(msg) {
    const p = peer, hc = hostConn;
    hostConn = null; peer = null; code = null; myId = null; isHost = false; conns.clear(); pres = {};
    try { if (hc) hc.close(); } catch (e) {}
    try { if (p) p.destroy(); } catch (e) {}
    emit(); if (msg) status(msg);
  }

  setInterval(() => {
    if (!code || !myId) return;
    const now = Date.now();
    if (isHost) {
      for (const id of Object.keys(seen)) if (now - seen[id] > 10000) {
        const c = conns.get(id); conns.delete(id); delete pres[id]; delete seen[id]; try { c && c.close(); } catch (e) {}
        dispatch("leave", null, id); status("room", info());
      }
      pres[myId] = myP;
      const snap = { t: "s", p: pres };
      for (const c of conns.values()) if (c.open) {
        c.send(snap);
        if (c.sharedV !== sharedVer && now - (c.sharedT || 0) > 1000) { c.sharedT = now; c.send({ t: "sh", d: shared, v: sharedVer }); }
      }
      emit();
    } else if (hostConn && hostConn.open && lastSnap && now - lastSnap > 10000) reset("hostLeft");
    else if (hostConn && hostConn.open && (dirty || now - lastSent > 900)) { hostConn.send({ t: "p", p: myP }); dirty = false; lastSent = now; }
  }, 66);

  const info = () => ({ code, n: !code ? 0 : isHost ? 1 + conns.size : Math.max(1, Object.keys(pres).length), max: MAX, isHost });

  async function create() {
    let Peer; try { Peer = await loadPeer(); } catch (e) { status("fail"); return; }
    reset(); const c = opt.code || code4(); isHost = true; status("connecting");
    const pr = new Peer(PREFIX + c, popts); peer = pr;
    pr.on("open", (id) => { if (peer !== pr) return; myId = id; code = c; pres = {}; emit(); status("room", info()); });
    pr.on("connection", (cn) => {
      if (conns.size >= MAX - 1) { cn.on("open", () => { cn.send({ t: "full" }); setTimeout(() => cn.close(), 400); }); return; }
      cn.on("open", () => { conns.set(cn.peer, cn); seen[cn.peer] = Date.now(); cn.sharedT = 0; dispatch("join", null, cn.peer); status("room", info()); });
      cn.on("data", (d) => {
        if (!d || !conns.has(cn.peer)) return;
        seen[cn.peer] = Date.now();
        if (d.t === "p") { const p = safe(d.p); if (p) pres[cn.peer] = p; }
        else if (d.t === "sa") cn.sharedV = d.v;
        else if (d.t === "e" && typeof d.k === "string") {
          const data = safe(d.d, 4000); const msg = { t: "e", k: d.k, d: data, f: cn.peer };
          for (const o of conns.values()) if (o.open && o !== cn) o.send(msg);
          dispatch(d.k, data, cn.peer);
        }
      });
      cn.on("close", () => { conns.delete(cn.peer); delete pres[cn.peer]; delete seen[cn.peer]; dispatch("leave", null, cn.peer); emit(); status("room", info()); });
    });
    pr.on("error", (e) => { if (peer !== pr) return; if (e.type === "unavailable-id" && !opt.code) create(); else if (!code) reset("fail"); });
  }

  async function join(c) {
    c = String(c || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
    if (c.length !== 4) { status("notFound"); return; }
    let Peer; try { Peer = await loadPeer(); } catch (e) { status("fail"); return; }
    reset(); isHost = false; status("connecting");
    const pr = new Peer(popts); peer = pr;
    pr.on("open", (id) => {
      if (peer !== pr) return; myId = id;
      const hc = pr.connect(PREFIX + c, { reliable: true }); hostConn = hc;
      const to = setTimeout(() => { if (hostConn === hc && !hc.open) reset("fail"); }, 12000);
      hc.on("open", () => { clearTimeout(to); lastSnap = Date.now(); code = c; dirty = true; status("room", info()); });
      hc.on("data", (d) => {
        if (!d || hostConn !== hc) return;
        if (d.t === "full") { hc.full = true; reset("full"); return; }
        if (d.t === "sh") { const s = safe(d.d, 60000); if (s) { shared = s; sharedFns.forEach((f) => f(shared)); } hc.send({ t: "sa", v: d.v }); return; }
        if (d.t === "e" && typeof d.k === "string") { dispatch(d.k, safe(d.d, 4000), d.f); return; }
        if (d.t === "s" && d.p && typeof d.p === "object") {
          lastSnap = Date.now(); const np = {}; let n = 0;
          for (const k in d.p) { if (++n > MAX) break; const p = safe(d.p[k]); if (p) np[k] = p; }
          const before = Object.keys(pres).length; pres = np; emit();
          if (Object.keys(np).length !== before) status("room", info());
        }
      });
      hc.on("close", () => { if (hostConn !== hc || hc.full) return; reset("hostLeft"); });
    });
    pr.on("error", (e) => { if (peer !== pr) return; if (e.type === "peer-unavailable") reset("notFound"); else if (!code) reset("fail"); });
  }

  const room = {
    create, join,
    leave() { reset("left"); },
    presence(patch) { for (const k in patch) { if (patch[k] === null || patch[k] === undefined) delete myP[k]; else myP[k] = patch[k]; } dirty = true; },
    onPeers(fn) { peersFns.push(fn); setTimeout(() => fn(list()), 0); },
    onStatus(fn) { statusFns.push(fn); return () => { const i = statusFns.indexOf(fn); if (i >= 0) statusFns.splice(i, 1); }; },
    on(type, fn) { (evH[type] ||= []).push(fn); },
    send(type, data) {
      const msg = { t: "e", k: type, d: data };
      if (isHost) { msg.f = myId; for (const c of conns.values()) if (c.open) c.send(msg); }
      else if (hostConn && hostConn.open) hostConn.send(msg);
    },
    get shared() { return shared; },
    setShared(obj) { if (!isHost && code) return; shared = Object.assign({}, shared, obj); sharedVer++; sharedFns.forEach((f) => f(shared)); },
    onShared(fn) { sharedFns.push(fn); },
    get code() { return code; }, get isHost() { return isHost; }, get myId() { return myId; },
    get connected() { return !!code; }, get count() { return info().n; }, max: MAX,
    /** Link with ?sala=CODE so friends land straight in the room. */
    shareUrl() { const u = new URL(location.href); u.search = ""; if (code) u.searchParams.set("sala", code); return u.toString(); },
    /** Join automatically if the page was opened with ?sala=CODE. */
    autoJoin() { const c = qs.get("sala"); if (c) { join(c); return true; } return false; },
  };
  return room;
}

/**
 * Keeps remote players' Characters in sync with presence, with smooth interpolation.
 * Presence fields used: x, y, z, r (yaw), look, g (grounded 0/1), sp (speed), po (pose)
 */
export function createRemotePlayers(scene, room, opt = {}) {
  const map = new Map();
  room.onPeers((peers) => {
    const alive = new Set();
    for (const p of peers) {
      if (p.isMe || !p.presence || typeof p.presence.x !== "number") continue;
      alive.add(p.id);
      let r = map.get(p.id);
      const pr = p.presence;
      if (!r) {
        r = { ch: new Character(scene, pr.look || {}, { kind: "remote" }), x: pr.x, y: pr.y, z: pr.z, r: pr.r || 0, lookJ: JSON.stringify(pr.look || {}) };
        r.ch.root.position.set(pr.x, pr.y, pr.z); map.set(p.id, r);
        if (opt.onAdd) opt.onAdd(p.id, r);
      }
      const lj = JSON.stringify(pr.look || {}); if (lj !== r.lookJ) { r.lookJ = lj; r.ch.setLook(pr.look); }
      r.tx = pr.x; r.ty = pr.y; r.tz = pr.z; r.tr = pr.r || 0; r.g = pr.g !== 0; r.sp = pr.sp || 0; r.po = pr.po || "walk"; r.pres = pr;
    }
    for (const [id, r] of map) if (!alive.has(id)) { r.ch.dispose(); map.delete(id); if (opt.onRemove) opt.onRemove(id); }
  });
  return {
    map,
    update(dt) {
      const k = 1 - Math.exp(-12 * dt);
      for (const r of map.values()) {
        if (r.tx === undefined) continue;
        if (Math.hypot(r.tx - r.x, r.tz - r.z) > 12) { r.x = r.tx; r.y = r.ty; r.z = r.tz; }
        r.x += (r.tx - r.x) * k; r.y += (r.ty - r.y) * k; r.z += (r.tz - r.z) * k;
        let d = r.tr - r.r; d = ((d + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; r.r += d * k;
        r.ch.root.position.set(r.x, r.y, r.z); r.ch.root.rotation.y = r.r;
        r.ch.animate(dt, r.sp, r.g, r.po);
      }
    },
    get(id) { return map.get(id); },
  };
}
