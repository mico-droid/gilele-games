// Auto Escola — simulador educativo de direção (Gilele Engine).
// Regras: Res. CONTRAN 1.020/2025 + MBEDV. Modos: Aprendizado, Prova, Trânsito Difícil (e passeio livre).
import {
  THREE, createWorld, createPhysics, createRoads, createTraffic, createVehicle, createFirstPersonCamera, Character,
  loadLook, randomLook, Audio, t, onLangChange, h, toast, screen, openSettings, installButton, registerPWA, track, initGTM,
  isTouch, isMobile, createStore, getLang, VERSION,
} from "../../engine/ez.js";
import "./strings.js";
import { buildMapDef, decorate } from "./map.js";
import { createCockpit } from "./cockpit.js";
import { createJudge, RULES, ruleTitle, ruleTip, PTS, PASS_MAX } from "./rules.js";
import { LESSONS, SCENARIOS, createExam, createLesson, createScenario, createFree } from "./modes.js";

const GAME_ID = "auto-escola";
registerPWA("../../sw.js");
initGTM("GTM-54JJ46D9");
const store = createStore("autoescola");

// ---------------------------------------------------------------- world
const world = createWorld({ canvas: document.getElementById("c"), sky: 0xbfe3ff, fog: [90, 330], far: 700, shadowRange: 45 });
world.camera.near = 0.05; world.camera.updateProjectionMatrix();
const phys = createPhysics();
const road = createRoads(world, phys, buildMapDef());
decorate(world, phys, road);
let car = null;
const traffic = createTraffic(world, road, { phys, cars: isMobile ? 10 : 16, motos: 3, buses: 1, peds: isMobile ? 8 : 14, player: () => car });

// ---------------------------------------------------------------- player car
let transmission = store.get("gearbox", "manual");
car = createVehicle(world, { phys, ground: road.groundAt, transmission, color: "#f8fafc", roofSign: "AUTOESCOLA" });
car.assistClutch = store.get("assist", "0") === "1";
car.data.belt = false;
// driver (player's avatar) and the instructor / examiner on the passenger seat
const driver = new Character(world.scene, loadLook(), { kind: "me", label: false });
car.mesh.body.add(driver.root); driver.root.position.set(car.spec.eye[0], 0.02, -0.2); driver.root.scale.setScalar(0.5);
const mate = new Character(world.scene, Object.assign(randomLook(""), { a: "glasses" }), { kind: "npc", label: false });
car.mesh.body.add(mate.root); mate.root.position.set(-car.spec.eye[0], 0.02, -0.2); mate.root.scale.setScalar(0.5);
const cockpit = createCockpit(world, car, { lowQuality: () => world.quality === "low" || (world.quality === "auto" && isMobile), hideInMirrors: [driver.root, mate.root], touch: isTouch });

// ---------------------------------------------------------------- cameras
const fp = createFirstPersonCamera(world.camera, { yawOffset: Math.PI, maxYaw: 2.4, maxPitch: 0.9 });
let camMode = "in", orbitYaw = 0, orbitT = 0, lookHold = 0, lookTarget = 0, lastShoulder = { "-1": -99, "1": -99 }, headMoved = -99;
const chase = { pos: new THREE.Vector3(), look: new THREE.Vector3(), first: true };
function setCamera(m) {
  camMode = m; cockpit.setInterior(m === "in"); cockpit.setOverlay(m === "out" || isTouch);
  document.body.classList.toggle("ae-touchui", isTouch);
  driver.root.visible = m === "out"; chase.first = true;
  world.camera.fov = m === "in" ? (innerWidth < innerHeight ? 80 : 68) : 62; world.camera.updateProjectionMatrix();
  if (mode && mode.id) store.set("cam_" + mode.id, m);
  camBtn && (camBtn.textContent = m === "in" ? "🎥" : "🚗");
}
function updateCamera(dt) {
  if (camMode === "in") {
    // shoulder check (hold) eases the head; free look by dragging
    if (lookHold) { fp.state.yaw += (lookTarget - fp.state.yaw) * Math.min(1, dt * 7); }
    else if (performance.now() - lastDrag > 1600) { fp.state.yaw *= 1 - Math.min(1, dt * 2.5); fp.state.pitch *= 1 - Math.min(1, dt * 2.5); }
    if (fp.state.yaw > 1.25) lastShoulder["-1"] = clock; if (fp.state.yaw < -1.25) lastShoulder["1"] = clock;
    if (Math.abs(fp.state.yaw) > 0.25) headMoved = clock;
    fp.update(dt, car.mesh.body, cockpit.eye);
  } else {
    const f = car.forward(), back = 7.2, up = 2.9;
    if (performance.now() - lastDrag > 1500) orbitYaw *= 1 - Math.min(1, dt * 2);
    const c = Math.cos(orbitYaw), s = Math.sin(orbitYaw), fx = f.x * c + f.z * s, fz = -f.x * s + f.z * c;
    const want = new THREE.Vector3(car.x - fx * back, car.y + up, car.z - fz * back), look = new THREE.Vector3(car.x + f.x * 4, car.y + 1, car.z + f.z * 4);
    if (chase.first) { chase.pos.copy(want); chase.look.copy(look); chase.first = false; }
    chase.pos.lerp(want, 1 - Math.exp(-dt * 6)); chase.look.lerp(look, 1 - Math.exp(-dt * 10));
    const gy = road.groundAt(chase.pos.x, chase.pos.z).y + 0.8; if (chase.pos.y < gy) chase.pos.y = gy;
    world.camera.position.copy(chase.pos); world.camera.lookAt(chase.look);
  }
  world.followSun(car.x, car.y, car.z);
}

// ---------------------------------------------------------------- input
const keys = {};
const ctl = { thr: 0, brk: 0, cl: 0, steer: 0, touch: { wheel: null, thr: null, brk: null, cl: null } };
let mirrorAdjust = null, lastDrag = 0, playing = false, clock = 0;
const KEYMAP = { up: ["KeyW", "ArrowUp"], down: ["KeyS", "ArrowDown"], left: ["KeyA", "ArrowLeft"], right: ["KeyD", "ArrowRight"], clutch: ["ShiftLeft", "ShiftRight", "KeyQ"] };
const isKey = (a) => KEYMAP[a].some((c) => keys[c]);
addEventListener("keydown", (e) => {
  if (document.activeElement && document.activeElement.tagName === "INPUT") return;
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys[e.code] = true;
  if (!playing) { if (e.code === "Escape" || e.code === "KeyP") return; return; }
  const auto = car.transmission === "auto";
  const digit = e.code.startsWith("Digit") ? +e.code.slice(5) : null;
  if (digit !== null) { if (auto) { if (digit === 0) shift("P"); else if (digit === 1) shift("D"); } else if (digit >= 1 && digit <= 5) shift(digit); else if (digit === 0) shift(0); }
  if (e.code === "KeyR") shift(auto ? "R" : -1);
  if (e.code === "KeyN") shift(auto ? "N" : 0);
  if (e.code === "Space") toggleHandbrake();
  if (e.code === "KeyZ") blinker(-1);
  if (e.code === "KeyX") blinker(1);
  if (e.code === "KeyH") toggleHazard();
  if (e.code === "KeyL") toggleLights();
  if (e.code === "KeyV") toggleWipers();
  if (e.code === "KeyK") toggleBelt();
  if (e.code === "KeyB") hornDown();
  if (e.code === "KeyI") ignitionDown();
  if (e.code === "KeyM") cycleMirror();
  if (e.code === "KeyC") setCamera(camMode === "in" ? "out" : "in");
  if (e.code === "Comma") { lookHold = 1; lookTarget = 2.0; }
  if (e.code === "Period") { lookHold = 1; lookTarget = -2.0; }
  if (e.code === "Escape" || e.code === "KeyP") pause();
});
addEventListener("keyup", (e) => {
  keys[e.code] = false;
  if (e.code === "KeyB") hornUp();
  if (e.code === "KeyI") ignitionUp();
  if (e.code === "Comma" || e.code === "Period") lookHold = 0;
});
addEventListener("blur", () => { for (const k in keys) keys[k] = false; hornUp(); });

function shift(g) {
  const ok = car.shift(g);
  if (!ok && car._ev.grind) msg("m_grind");
  if (!ok && car._ev.needBrake) msg("m_needBrake");
  updateGearUI();
}
function toggleHandbrake() { car.controls.handbrake = car.controls.handbrake > 0.5 ? 0 : 1; Audio.play("click"); updateButtons(); }
let blinkStartH = 0, blinkTurned = false;
function blinker(side) { const L = car.lights; L.blinker = L.blinker === side ? 0 : side; blinkStartH = car.heading; blinkTurned = false; Audio.play("click"); updateButtons(); }
function toggleHazard() { car.lights.hazard = !car.lights.hazard; Audio.play("click"); updateButtons(); }
function toggleLights() { car.lights.head = !car.lights.head; Audio.play("click"); updateButtons(); }
function toggleWipers() { car.data.wipers = !car.data.wipers; Audio.play("click"); updateButtons(); }
function toggleBelt() { car.data.belt = !car.data.belt; Audio.play(car.data.belt ? "ok" : "click"); updateButtons(); mode && mode.onBelt && mode.onBelt(); }
let hornSound = null;
function hornDown() { if (car.data.horn) return; car.data.horn = true; judge && judge.horn(true); Audio.play("horn"); hornSound = setInterval(() => Audio.play("horn"), 330); }
function hornUp() { car.data.horn = false; clearInterval(hornSound); }
let ignT = null;
function ignitionDown() {
  if (car.engineOn) { car.stopEngine(); Audio.play("click"); updateButtons(); mode && mode.onEngineOff && mode.onEngineOff(); return; }
  ignT = setTimeout(() => { car.startEngine(); if (car._ev.jolt) msg("m_jolt"); if (car._ev.needPN) msg("m_needPN"); }, 150);
}
function ignitionUp() { clearTimeout(ignT); }
function cycleMirror() {
  const order = [cockpit.left, cockpit.right, cockpit.inner, null];
  mirrorAdjust = order[(order.indexOf(mirrorAdjust) + 1) % order.length];
  if (mirrorAdjust) { setCamera("in"); toast("🪞 " + t("mirrors") + ": " + { left: "◀", right: "▶", in: "⬆" }[mirrorAdjust.name]); car.data.mirrors = (car.data.mirrors || 0) | 1; }
  cockpit.mirrors.forEach((m) => m.frame.material = m.frame.material); // no-op; highlight below
  cockpit.mirrors.forEach((m) => m.frame.scale.setScalar(m === mirrorAdjust ? 1.15 : 1));
  updateButtons();
}
// canvas drag: look around / adjust mirrors / orbit
const canvas = world.renderer.domElement;
let dragId = null, dragLast = null;
canvas.addEventListener("pointerdown", (e) => { if (!playing) return; dragId = e.pointerId; dragLast = { x: e.clientX, y: e.clientY }; try { canvas.setPointerCapture(e.pointerId); } catch (_) {} });
canvas.addEventListener("pointermove", (e) => {
  if (e.pointerId !== dragId) return;
  const dx = e.clientX - dragLast.x, dy = e.clientY - dragLast.y; dragLast = { x: e.clientX, y: e.clientY };
  lastDrag = performance.now();
  if (mirrorAdjust) { cockpit.adjust(mirrorAdjust, -dx * 0.003, -dy * 0.003); car.data.mirrors = 3; return; }
  if (camMode === "in") fp.look(dx, dy, e.pointerType === "touch"); else orbitYaw -= dx * 0.006;
});
const endDrag = (e) => { if (e.pointerId === dragId) dragId = null; };
canvas.addEventListener("pointerup", endDrag); canvas.addEventListener("pointercancel", endDrag);
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

function readControls(dt) {
  const T = ctl.touch, v = car.kmh();
  // throttle / brake ramps for keys
  if (isKey("up")) ctl.thr = Math.min(1, Math.max(ctl.thr, 0.3) + dt * 0.55); else ctl.thr = 0;
  if (isKey("down")) ctl.brk = Math.min(1, Math.max(ctl.brk, 0.3) + dt * 1.1); else ctl.brk = 0;
  if (isKey("clutch")) ctl.cl = Math.min(1, ctl.cl + dt * 7); else ctl.cl = Math.max(0, ctl.cl - dt * (ctl.cl > 0.65 ? 2.2 : 0.75)); // slow through the biting point
  // steering
  const kd = (isKey("right") ? 1 : 0) - (isKey("left") ? 1 : 0);
  const maxK = 1 / (1 + v / 28);
  if (kd) ctl.steer += Math.max(-dt * 2.2, Math.min(dt * 2.2, kd * maxK - ctl.steer));
  else ctl.steer += Math.max(-dt * 2.8, Math.min(dt * 2.8, -ctl.steer));
  const c = car.controls;
  c.throttle = T.thr != null ? T.thr : ctl.thr;
  c.brake = T.brk != null ? T.brk : ctl.brk;
  c.clutch = T.cl != null ? T.cl : ctl.cl;
  // steer: +1 = right. Vehicle steerAngle > 0 → positive yaw → LEFT turn, so invert.
  const s = T.wheel != null ? T.wheel : ctl.steer;
  c.steer = -s;
  // blinker auto-cancel after the turn
  const L = car.lights;
  if (L.blinker) { const dh = Math.abs(((car.heading - blinkStartH + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI); if (dh > 1.0) blinkTurned = true; if (blinkTurned && Math.abs(s) < 0.12) { L.blinker = 0; updateButtons(); } }
}

// ---------------------------------------------------------------- touch controls (custom)
const tc = h("div.ae-touch" + (isTouch ? "" : ".ez-hidden"));
const wheelEl = h("div.ae-wheel", h("div.ae-wheel-in", h("div.ae-spoke"), h("div.ae-mark")));
const pedals = h("div.ae-pedals");
const pedal = (key, label, cls) => {
  const el = h("div.ae-pedal." + cls, h("span", label), h("div.ae-fill"));
  const set = (e) => { const r = el.getBoundingClientRect(); const v = Math.max(0.12, Math.min(1, (r.bottom - e.clientY) / r.height)); ctl.touch[key] = v; el.lastChild.style.height = v * 100 + "%"; };
  el.addEventListener("pointerdown", (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); set(e); });
  el.addEventListener("pointermove", (e) => { if (el.hasPointerCapture(e.pointerId)) set(e); });
  const up = () => { ctl.touch[key] = key === "cl" ? null : null; el.lastChild.style.height = "0"; if (key === "cl") { ctl.cl = 1; } };
  el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
  return el;
};
const clutchPedal = pedal("cl", "E", "cl"), brakePedal = pedal("brk", "F", "brk"), thrPedal = pedal("thr", "A", "thr");
pedals.append(clutchPedal, brakePedal, thrPedal);
{
  let id = null, a0 = 0, base = 0, val = 0;
  const ang = (e) => { const r = wheelEl.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)); };
  wheelEl.addEventListener("pointerdown", (e) => { e.preventDefault(); id = e.pointerId; wheelEl.setPointerCapture(id); a0 = ang(e); base = val; });
  wheelEl.addEventListener("pointermove", (e) => {
    if (e.pointerId !== id) return; let d = ang(e) - a0; d = ((d + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    const turns = Math.PI * 1.25; val = Math.max(-1, Math.min(1, base + d / turns)); a0 = ang(e); base = val; ctl.touch.wheel = val;
  });
  const up = (e) => { if (e.pointerId !== id) return; id = null; const back = () => { if (id !== null) return; val *= 0.8; if (Math.abs(val) < 0.02) val = 0; ctl.touch.wheel = val; if (val) requestAnimationFrame(back); else ctl.touch.wheel = null; }; back(); };
  wheelEl.addEventListener("pointerup", up); wheelEl.addEventListener("pointercancel", up);
}
const gearBox = h("div.ae-gears");
function updateGearUI() {
  const cur = car.transmission === "auto" ? car.autoMode : car.gear === -1 ? "R" : car.gear === 0 ? "N" : String(car.gear);
  const opts = car.transmission === "auto" ? ["P", "R", "N", "D"] : ["1", "3", "5", "N", "2", "4", "R"];
  gearBox.className = "ae-gears " + car.transmission;
  gearBox.replaceChildren(...opts.map((g) => h("button" + (g === cur ? ".sel" : ""), { onpointerdown: (e) => { e.preventDefault(); shift(car.transmission === "auto" ? g : g === "R" ? -1 : g === "N" ? 0 : +g); } }, g)));
  gearPill.textContent = car.gearLabel();
}
const tbtn = (label, fn, cls = "") => h("button.ae-b" + cls, { onpointerdown: (e) => { e.preventDefault(); e.stopPropagation(); fn(true); }, onpointerup: () => fn(false), onpointercancel: () => fn(false) }, label);
const bl = tbtn("◀", (d) => d && blinker(-1)), br = tbtn("▶", (d) => d && blinker(1)), hb = tbtn("(P)", (d) => d && toggleHandbrake(), ".hb");
const beltB = tbtn("🪢", (d) => d && toggleBelt()), keyB = tbtn("🔑", (d) => (d ? ignitionDown() : ignitionUp()));
const hazB = tbtn("⚠️", (d) => d && toggleHazard()), lightB = tbtn("💡", (d) => d && toggleLights()), hornB = tbtn("📯", (d) => (d ? hornDown() : hornUp())), wipB = tbtn("🌧", (d) => d && toggleWipers()), mirB = tbtn("🪞", (d) => d && cycleMirror());
const lookLB = tbtn("👀◀", (d) => { lookHold = d ? 1 : 0; lookTarget = 2.0; }), lookRB = tbtn("▶👀", (d) => { lookHold = d ? 1 : 0; lookTarget = -2.0; });
const moreP = h("div.ae-more.ez-hidden", hazB, lightB, hornB, wipB, mirB);
const moreB = tbtn("☰", (d) => d && moreP.classList.toggle("ez-hidden"));
tc.append(
  h("div.ae-left", h("div.ae-row", bl, hb, br), h("div.ae-row", beltB, keyB, moreB), moreP, wheelEl),
  h("div.ae-right", gearBox, pedals),
);
document.body.appendChild(tc);

// ---------------------------------------------------------------- HUD
const modePill = h("div.ez-pill"), ptsPill = h("div.ez-pill.ez-hidden"), domPill = h("div.ez-pill.ae-dom.ez-hidden", h("span"), h("i", h("b")));
const gearPill = h("b.ae-gear"), spdPill = h("b.ae-spd"), blPill = h("span.ae-bl"), beltPill = h("span.ae-beltico", "🪢"), hbPill = h("span.ae-hbico", "(P)");
const dashPill = h("div.ae-dash", blPill, spdPill, h("small", "km/h"), gearPill, beltPill, hbPill);
const speech = h("div.ae-speech.ez-hidden", h("b"), h("span"));
const objBox = h("div.ae-obj.ez-hidden");
const mini = h("canvas.ae-mini", { width: 150, height: 150 });
const camBtn = h("button.ez-rbtn", { title: t("cam_in"), onclick: () => setCamera(camMode === "in" ? "out" : "in") }, "🎥");
const rotateHint = h("div.ae-rotate.ez-hidden", t("rotate"));
const hud = h("div.ez-hud.ez-hidden",
  h("div.ez-top", modePill, ptsPill, domPill, h("div.ez-spacer"), isTouch ? h("div.ae-looks", lookLB, lookRB) : null, camBtn, h("button.ez-rbtn", { onclick: () => pause() }, "⏸")),
  speech, objBox, mini, dashPill, rotateHint);
document.body.appendChild(hud);
function updateButtons() {
  const L = car.lights;
  bl.classList.toggle("on", L.blinker < 0); br.classList.toggle("on", L.blinker > 0); hb.classList.toggle("on", car.controls.handbrake > 0.5);
  beltB.classList.toggle("on", !!car.data.belt); keyB.classList.toggle("on", car.engineOn); hazB.classList.toggle("on", L.hazard); lightB.classList.toggle("on", L.head);
  wipB.classList.toggle("on", !!car.data.wipers); mirB.classList.toggle("on", !!mirrorAdjust);
  beltPill.classList.toggle("off", !!car.data.belt); hbPill.classList.toggle("off", car.controls.handbrake < 0.5);
}
let speechT = 0;
function say(who, key, vars, secs = 6) {
  speech.firstChild.textContent = who ? t(who) + ": " : ""; speech.lastChild.textContent = t(key, vars);
  speech.classList.remove("ez-hidden"); speechT = secs;
}
let msgCool = {};
function msg(key, secs = 2.6) { if ((msgCool[key] || 0) > clock) return; msgCool[key] = clock + 4; toast(t(key), secs * 1000); }
function setObjectives(list) {
  if (!list) { objBox.classList.add("ez-hidden"); return; }
  objBox.classList.remove("ez-hidden");
  objBox.replaceChildren(h("b", "🎯 " + t("obj")), ...list.map((o) => h("div" + (o.done ? ".done" : o.failed ? ".failed" : ""), (o.done ? "✅ " : o.failed ? "❌ " : "⬜ ") + t(o.key, o.vars))));
}
// minimap
const mctx = mini.getContext("2d");
let route = null;
function drawMini() {
  const c = mctx, S = 150, sc = 0.32, cx = car.x, cz = car.z;
  c.clearRect(0, 0, S, S); c.save(); c.beginPath(); c.arc(S / 2, S / 2, S / 2 - 2, 0, 7); c.clip();
  c.fillStyle = "rgba(15,23,42,0.6)"; c.fillRect(0, 0, S, S);
  c.translate(S / 2, S / 2); c.rotate(car.heading + Math.PI); c.scale(-sc, sc); // heading up
  c.lineCap = "round";
  for (const e of road.edges) { c.strokeStyle = "#94a3b8"; c.lineWidth = (e.uMax - e.uMin) * 0.9; c.beginPath(); c.moveTo(e.A.x - cx, e.A.z - cz); c.lineTo(e.B.x - cx, e.B.z - cz); c.stroke(); }
  for (const n of Object.values(road.nodes)) if (n.roundabout) { c.strokeStyle = "#94a3b8"; c.lineWidth = 7; c.beginPath(); c.arc(n.x - cx, n.z - cz, n.ringR, 0, 7); c.stroke(); }
  if (route && route.pts) { c.strokeStyle = "#22c55e"; c.lineWidth = 3 / sc; c.beginPath(); route.pts.forEach((p, i) => (i ? c.lineTo(p[0] - cx, p[1] - cz) : c.moveTo(p[0] - cx, p[1] - cz))); c.stroke(); }
  if (route && route.target) { c.fillStyle = "#facc15"; c.beginPath(); c.arc(route.target[0] - cx, route.target[1] - cz, 4 / sc, 0, 7); c.fill(); }
  c.restore();
  c.fillStyle = "#facc15"; c.beginPath(); c.moveTo(S / 2, S / 2 - 9); c.lineTo(S / 2 - 6, S / 2 + 7); c.lineTo(S / 2 + 6, S / 2 + 7); c.fill();
}

// ---------------------------------------------------------------- judge, replay buffer
let judge = null, mode = null;
const replayBuf = [];
let recT = 0;
function record(dt) {
  recT += dt; if (recT < 0.1) return; recT = 0;
  const vs = [];
  for (const v of traffic.fleet) if (v !== car && Math.abs(v.x - car.x) < 80 && Math.abs(v.z - car.z) < 80) vs.push([v, v.x, v.y, v.z, v.heading]);
  const ps = traffic.peds.filter((p) => Math.abs(p.x - car.x) < 60 && Math.abs(p.z - car.z) < 60).map((p) => [p, p.x, p.ch.root.position.y, p.z, p.rot]);
  replayBuf.push({ c: [car.x, car.y, car.z, car.heading, car.pitch, car.steerAngle], vs, ps });
  if (replayBuf.length > 70) replayBuf.shift();
}
function newJudge(opts = {}) {
  judge = createJudge({
    car, road, traffic, opts,
    onInfraction: (inf) => {
      inf.replay = replayBuf.slice(-55);
      Audio.play("wrong");
      toast(`⚠️ ${ruleTitle(inf.key)} (+${inf.pts})`, 2600);
      mode && mode.onInfraction && mode.onInfraction(inf);
      updatePts();
    },
    onDomain: (ev, d) => { updatePts(); if (ev === "stall") msg("m_stall"); if (ev === "crash") msg("m_crash"); if (ev === "rollback") msg("m_rollback"); },
    onInterrupt: (ev) => mode && mode.onInterrupt && mode.onInterrupt(ev),
    onMessage: (k) => msg(k === "belt" ? (mode && mode.id === "exam" ? "m_beltExam" : "m_belt") : k, 4),
  });
  updatePts();
  return judge;
}
function updatePts() {
  if (!judge || !mode || !mode.showPoints) { ptsPill.classList.add("ez-hidden"); domPill.classList.add("ez-hidden"); return; }
  ptsPill.classList.remove("ez-hidden"); domPill.classList.remove("ez-hidden");
  ptsPill.textContent = `📋 ${judge.points} / ${PASS_MAX}`; ptsPill.classList.toggle("bad", judge.points > PASS_MAX);
  domPill.firstChild.textContent = t("domain") + " "; domPill.lastChild.firstChild.style.width = judge.domain + "%";
  domPill.lastChild.firstChild.style.background = judge.domain > 60 ? "#22c55e" : judge.domain > 30 ? "#f59e0b" : "#ef4444";
}

// ---------------------------------------------------------------- weather
const rain = (() => {
  const N = 1400, g = new THREE.BufferGeometry(), pos = new Float32Array(N * 6);
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xbfd8ff, transparent: true, opacity: 0.5 }));
  lines.frustumCulled = false; lines.visible = false; world.scene.add(lines);
  const seeds = Array.from({ length: N }, () => [Math.random() * 60 - 30, Math.random() * 20, Math.random() * 60 - 30]);
  return {
    on: false,
    set(on) {
      this.on = on; lines.visible = on;
      world.scene.background.set(on ? 0x8ea3b5 : 0xbfe3ff); world.scene.fog.color.set(on ? 0x8ea3b5 : 0xbfe3ff); world.scene.fog.near = on ? 25 : 90; world.scene.fog.far = on ? 160 : 330;
      world.sun.intensity = on ? 1.1 : 2.6; car.spec.brakeForce = on ? 6500 : 10500;
    },
    update(dt) {
      if (!this.on) return;
      const cp = world.camera.position;
      for (let i = 0; i < N; i++) { const s = seeds[i]; s[1] -= dt * 22; if (s[1] < 0) s[1] += 20; const x = cp.x + s[0], y = cp.y - 6 + s[1], z = cp.z + s[2]; pos.set([x, y, z, x + 0.05, y + 0.6, z], i * 6); }
      g.attributes.position.needsUpdate = true;
    },
  };
})();

// ---------------------------------------------------------------- routing (for exam / lessons)
function edgeDirs(fromNode) { const out = []; for (const e of road.edges) { if (e.A === fromNode && e.nF > 0) out.push({ e, to: e.B, dir: 1 }); if (e.B === fromNode && e.nB > 0) out.push({ e, to: e.A, dir: -1 }); } return out; }
/** Shortest path of nodes from `from` (arriving via edge `viaEdge`, no U-turn) to `to`. */
function plan(from, to, viaEdge) {
  const dist = new Map([[from.id, 0]]), prevM = new Map(), q = [from];
  while (q.length) {
    q.sort((a, b) => dist.get(a.id) - dist.get(b.id)); const n = q.shift();
    if (n === to) break;
    for (const o of edgeDirs(n)) {
      if (n === from && viaEdge && o.e === viaEdge) continue;
      const d = dist.get(n.id) + o.e.len;
      if (d < (dist.get(o.to.id) ?? Infinity)) { dist.set(o.to.id, d); prevM.set(o.to.id, { n, e: o.e }); q.push(o.to); }
    }
  }
  if (!dist.has(to.id)) return null;
  const steps = []; let cur = to; while (cur !== from) { const p = prevM.get(cur.id); steps.unshift({ from: p.n, to: cur, e: p.e }); cur = p.n; }
  return steps;
}
const ctx = {
  world, road, traffic, phys, store, get car() { return car; }, cockpit, rain,
  get judge() { return judge; }, newJudge, say, msg, toast, setObjectives, setCamera, plan, edgeDirs,
  setRoute(r) { route = r; }, get clock() { return clock; }, get lastShoulder() { return lastShoulder; }, get headMoved() { return headMoved; },
  get camMode() { return camMode; }, fp, snapshot: () => replayBuf.slice(-55),
  resetCar(p) {
    car.teleport(p.x, p.z, p.h); car.controls.handbrake = p.hb ?? 1; car.lights.blinker = 0; car.lights.hazard = false; car.data.horn = false;
    if (p.engine) { car.engineOn = true; car.w = car.spec.idle / 9.549; } else car.stopEngine();
    if (car.transmission === "auto") car.autoMode = p.engine && p.gear ? "D" : "P"; else car.gear = p.gear ?? 0;
    car.data.belt = !!p.belt; car.data.wipers = false; car.lights.head = false; car.data.mirrors = 0;
    updateButtons(); updateGearUI(); chase.first = true; fp.recenter();
  },
  freeze(secs, key) { // stop the world for a moment (risk situation) — no gore, just a warning card
    world.setPaused(true); playing = false;
    const s = screen([h("h2", "⚠️"), h("p", { style: { fontSize: "20px", fontWeight: 700 } }, t(key || "sc_freeze"))], { dim: true });
    setTimeout(() => { s.close(); world.setPaused(false); playing = true; }, secs * 1000);
  },
  end(result) { endMode(result); },
  get playing() { return playing; },
};

// ---------------------------------------------------------------- modes
function startMode(factory, arg) {
  if (mode && mode.dispose) mode.dispose();
  setObjectives(null); speech.classList.add("ez-hidden"); route = null; rain.set(false);
  traffic.enabled = true;
  mode = factory(ctx, arg);
  modePill.textContent = mode.label;
  newJudge(mode.judgeOpts || {});
  setCamera(store.get("cam_" + mode.id, mode.defaultCam || "in"));
  mode.start && mode.start();
  playing = true; world.setPaused(false);
  hud.classList.remove("ez-hidden"); tc.classList.toggle("ez-hidden", !isTouch);
  updateGearUI(); updateButtons(); updatePts();
  car.enableSound(); Audio.init();
  track("ae_start", { game: GAME_ID, mode: mode.id, gearbox: car.transmission });
}
function endMode(result) {
  playing = false; world.setPaused(true); hud.classList.add("ez-hidden"); tc.classList.add("ez-hidden"); car.disableSound(); cockpit.setOverlay(false);
  track("ae_end", { game: GAME_ID, mode: mode.id, ok: result && result.ok ? 1 : 0, pts: judge ? judge.points : 0 });
  showReport(result || {});
}

// ---------------------------------------------------------------- replay viewer
function playReplay(frames, onDone) {
  if (!frames || !frames.length) return onDone && onDone();
  const save = { c: [car.x, car.y, car.z, car.heading, car.pitch, car.steerAngle], vs: [...traffic.fleet].map((v) => [v, v.x, v.y, v.z, v.heading]), ps: traffic.peds.map((p) => [p, p.x, p.ch.root.position.y, p.z, p.rot]) };
  const apply = (f) => {
    car.mesh.root.position.set(f.c[0], f.c[1], f.c[2]); car.mesh.root.rotation.set(0, f.c[3], 0);
    for (const [v, x, y, z, hh] of f.vs) { v.mesh.root.position.set(x, y, z); v.mesh.root.rotation.set(0, hh, 0); }
    for (const [p, x, y, z, r] of f.ps) { p.ch.root.position.set(x, y, z); p.ch.root.rotation.y = r; }
  };
  const label = h("div.ae-replay", "⏪ " + t("replay"), h("button.ez-btn.small", { onclick: () => (i = frames.length) }, "✕"));
  document.body.appendChild(label);
  const prevCam = camMode; driver.root.visible = true; cockpit.setInterior(false); cockpit.setOverlay(false);
  let i = 0, ang = 0;
  const tick = () => {
    if (i >= frames.length) {
      apply(save); car.mesh.root.position.set(save.c[0], save.c[1], save.c[2]); label.remove(); setCamera(prevCam);
      clearInterval(timer); onDone && onDone(); return;
    }
    const f = frames[i++]; apply(f); ang += 0.025;
    const r = 11, cx = f.c[0], cz = f.c[2];
    world.camera.position.set(cx + Math.sin(f.c[3] + 2.4 + ang) * r, f.c[1] + 6, cz + Math.cos(f.c[3] + 2.4 + ang) * r); world.camera.lookAt(cx, f.c[1] + 0.8, cz);
  };
  const timer = setInterval(tick, 100);
}

// ---------------------------------------------------------------- screens
let titleScr = null;
function natLabel(k) { return t("nat_" + RULES[k].nat); }
function showReport(res) {
  const inf = judge ? judge.infractions : [];
  const body = [];
  if (res.title) body.push(h("h1", res.title));
  if (res.sub) body.push(h("p", { style: { textAlign: "center", fontWeight: 700 } }, res.sub));
  if (res.lines) res.lines.forEach((l) => body.push(h("p", { style: { textAlign: "center" } }, l)));
  for (const r of res.replays || []) body.push(h("div.ae-infrow", h("div", h("b", r.title)), h("button.ez-btn.blue.small", { onclick: () => { scr.el.style.display = "none"; playReplay(r.frames, () => (scr.el.style.display = "")); } }, t("res_watch"))));
  if (inf.length || (mode && mode.showPoints)) {
    if (!inf.length) body.push(h("p", { style: { textAlign: "center" } }, t("res_none")));
    const list = h("div.ae-inf");
    for (const i of inf) {
      list.appendChild(h("div.ae-infrow",
        h("div", h("b", `+${i.pts} · ${ruleTitle(i.key)}`), h("small", ` CTB art. ${RULES[i.key].art} — ${natLabel(i.key)}`), h("p", ruleTip(i.key))),
        h("div.ez-col",
          i.replay && i.replay.length ? h("button.ez-btn.blue.small", { onclick: () => { scr.el.style.display = "none"; playReplay(i.replay, () => (scr.el.style.display = "")); } }, t("res_watch")) : null,
          RULES[i.key].lesson ? h("button.ez-btn.gray.small", { onclick: () => { scr.close(); chooseGearbox(() => startMode(createLesson, RULES[i.key].lesson - 1)); } }, t("res_train")) : null)));
    }
    body.push(list);
  }
  body.push(h("div.ez-row", { style: { justifyContent: "center", marginTop: "12px" } },
    res.next ? h("button.ez-btn", { onclick: () => { scr.close(); res.next(); } }, "▶ " + t("next")) : null,
    h("button.ez-btn.blue", { onclick: () => { scr.close(); res.again ? res.again() : startMode(mode.factory, mode.arg); } }, "↺ " + t("again")),
    h("button.ez-btn.gray", { onclick: () => { scr.close(); showTitle(); } }, "🏠 " + t("menu"))));
  const scr = screen(body, { dim: true });
}
function chooseGearbox(then) {
  // the student picks the gearbox each time a mode starts (remembered as default)
  const sc = screen([
    h("h2", "⚙️ " + t("gearbox")),
    h("div.ez-row", { style: { justifyContent: "center" } },
      h("button.ez-btn" + (transmission === "manual" ? "" : ".gray"), { onclick: () => pickT("manual") }, "🕹️ " + t("manual")),
      h("button.ez-btn" + (transmission === "auto" ? "" : ".gray"), { onclick: () => pickT("auto") }, "🅰️ " + t("auto"))),
    h("label.ae-check", h("input", { type: "checkbox", checked: car.assistClutch ? true : null, onchange: (e) => { car.assistClutch = e.target.checked; store.set("assist", e.target.checked ? "1" : "0"); } }), " " + t("assist")),
    h("p.ez-msg", t(transmission === "auto" ? "help_keys_auto" : "help_keys")),
  ], { dim: true });
  function pickT(tr) { transmission = tr; store.set("gearbox", tr); car.setTransmission(tr); sc.close(); then(); }
}
function showTitle() {
  playing = false; world.setPaused(false); cockpit.setOverlay(false); hud.classList.add("ez-hidden"); tc.classList.add("ez-hidden");
  if (mode && mode.dispose) mode.dispose(); mode = null; rain.set(false);
  const card = (emoji, key, onclick) => h("button.ae-mode", { onclick }, h("span.e", emoji), h("b", t(key)), h("small", t(key + "_d")));
  titleScr = screen([
    h("h1", "🚗 " + t("title")), h("p", { style: { textAlign: "center", opacity: 0.75, margin: "0 0 10px" } }, t("sub")),
    h("div.ae-modes",
      card("🎓", "m_learn", () => { titleScr.close(); showList("lessons"); }),
      card("📋", "m_exam", () => { titleScr.close(); chooseGearbox(() => startMode(createExam)); }),
      card("⚠️", "m_hard", () => { titleScr.close(); showList("scenarios"); }),
      card("🗺️", "m_free", () => { titleScr.close(); chooseGearbox(() => startMode(createFree)); })),
    h("div.ez-row", { style: { justifyContent: "center", marginTop: "10px" } },
      h("button.ez-btn.gray.small", { onclick: () => { titleScr.close(); openSettings({ world, onClose: showTitle }); } }, "⚙️ " + t("settings"))),
    installButton(),
    h("p.ez-msg", { style: { textAlign: "center", fontSize: "12px" } }, t("disclaimer") + " · Gilele Engine v" + VERSION),
  ]);
}
function showList(kind) {
  const items = kind === "lessons" ? LESSONS : SCENARIOS, prog = store.getJSON("stars", {});
  const sc = screen([
    h("h2", kind === "lessons" ? "🎓 " + t("lessons") : "⚠️ " + t("scenarios")),
    h("div.ae-list", items.map((it, i) => h("button.ae-item", { onclick: () => { sc.close(); chooseGearbox(() => startMode(kind === "lessons" ? createLesson : createScenario, i)); } },
      h("b", `${it.num || i + 1}. ${t(it.key)}`), h("small", t(it.key + "d")), h("span.stars", "⭐".repeat(prog[kind + i] || 0) + "☆".repeat(3 - (prog[kind + i] || 0)))))),
    h("button.ez-btn.gray.wide", { style: { marginTop: "12px" }, onclick: () => { sc.close(); showTitle(); } }, t("back")),
  ], { dim: true });
}
let pauseScr = null;
function pause() {
  if (!playing) return;
  playing = false; world.setPaused(true); car.disableSound();
  pauseScr = screen([
    h("h2", "⏸ " + t("paused")),
    h("div.ez-col",
      h("button.ez-btn.wide", { onclick: () => { pauseScr.close(); resume(); } }, "▶ " + t("resume")),
      h("button.ez-btn.blue.wide", { onclick: () => { pauseScr.close(); startMode(mode.factory, mode.arg); } }, "↺ " + t("again")),
      h("button.ez-btn.gray.wide", { onclick: () => { pauseScr.close(); openSettings({ world, onClose: () => { playing = true; pause(); } }); } }, "⚙️ " + t("settings")),
      h("p.ez-msg", t(car.transmission === "auto" ? "help_keys_auto" : "help_keys")),
      h("button.ez-btn.gray.wide", { onclick: () => { pauseScr.close(); showTitle(); } }, "🏠 " + t("menu"))),
  ], { dim: true });
}
function resume() { playing = true; world.setPaused(false); car.enableSound(); }

// ---------------------------------------------------------------- loop
function frame(dt) {
  clock += dt;
  road.update(dt);
  traffic.update(dt);
  if (playing) {
    readControls(dt);
    const ev = car.step(dt);
    if (ev.stalled) updateButtons();
    if (ev.started) { updateButtons(); mode && mode.onEngineOn && mode.onEngineOn(); }
    if (ev.curb && !(judge && judge.loc && judge.loc.parkSide)) msg("m_curb");
    if (judge) { judge.vehicleEvents(ev); judge.update(dt); }
    if (mode && mode.update) mode.update(dt, ev);
    record(dt);
    // HUD
    spdPill.textContent = Math.round(car.kmh()); gearPill.textContent = car.gearLabel();
    blPill.textContent = (car.lights.blinker < 0 || car.lights.hazard) && car.blinkOn ? "◀" : (car.lights.blinker > 0 || car.lights.hazard) && car.blinkOn ? "▶" : "";
    if (speechT > 0) { speechT -= dt; if (speechT <= 0) speech.classList.add("ez-hidden"); }
    if ((clock * 10 | 0) % 2 === 0) drawMini();
    rotateHint.classList.toggle("ez-hidden", !(isTouch && innerHeight > innerWidth));
  } else car.updateMesh(dt);
  rain.update(dt);
  driver.animate(dt, 0, true, "drive");
  mate.animate(dt, 0, true, "drive"); mate.av.armL.rotation.x = mate.av.armR.rotation.x = -0.5;
  updateCamera(dt);
}
world.onUpdate(frame);
world.start();
// start screen: parked on the avenue for a pretty background
ctx.resetCar({ x: road.toWorld(road.E.h10, 30, road.E.h10.uMax - 1.25)[0], z: road.toWorld(road.E.h10, 30, road.E.h10.uMax - 1.25)[1], h: road.E.h10.h });
setCamera("out");
updateGearUI(); updateButtons();
onLangChange(() => { updateGearUI(); });
showTitle();
window.GAME = { tick: frame, ctl, world, road, traffic, car, cockpit, ctx, get judge() { return judge; }, get mode() { return mode; }, startMode, createExam, createLesson, createScenario, createFree, setCamera, keys };
