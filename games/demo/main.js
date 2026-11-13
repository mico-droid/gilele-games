// Gilele Playground — template game showing every engine feature.
// Copy this folder to start a new game (games/<name>/), then change GAME_ID, strings and buildLevel().
import {
  THREE, createWorld, createPhysics, endFrame, createInput, createFollowCamera, createPlayer, createBot,
  createRoom, createRemotePlayers, loadLook, randomLook, Audio, addStrings, t, onLangChange, applyDom,
  h, toast, screen, openAvatarEditor, openSettings, openRoomPanel, roomPill, openQuickChat, chatText, installButton, gameLinks,
  addGround, addTree, addCloud, addTrampoline, addSign, createCoins, addCheckpoint, addMover, createAvatarPreview,
  registerPWA, track, initGTM, isTouch, VERSION, createThrowables, GEO, getMat,
} from "../../engine/ez.js";

const GAME_ID = "demo";
registerPWA("../../sw.js");
initGTM("GTM-54JJ46D9");

addStrings({
  pt: { title: "Playground Testes", sub: "Jogo-modelo do motor", grab: "✋ E: pegar", throwH: "🎯 E: arremessar", hitsL: "Acertos", bullseye: "🎯 Na mosca!", range: "Alvos 🎯", toys: "Brinquedos ✋", coins: "Moedas", allCoins: "Todas as moedas! 🏆", cp: "Checkpoint! 🚩", top: "Você chegou ao topo! 🎉", welcome: "Bem-vindo!", tower: "Torre ↑", help: "WASD/setas: andar · Espaço: pular · E: pegar/arremessar · Arraste: câmera · T: chat · R: voltar" },
  en: { title: "Test Playground", sub: "Engine template game", grab: "✋ E: pick up", throwH: "🎯 E: throw", hitsL: "Hits", bullseye: "🎯 Bullseye!", range: "Targets 🎯", toys: "Toys ✋", coins: "Coins", allCoins: "All coins! 🏆", cp: "Checkpoint! 🚩", top: "You reached the top! 🎉", welcome: "Welcome!", tower: "Tower ↑", help: "WASD/arrows: move · Space: jump · E: pick up/throw · Drag: camera · T: chat · R: respawn" },
  es: { title: "Playground de Pruebas", sub: "Juego plantilla del motor", grab: "✋ E: agarrar", throwH: "🎯 E: lanzar", hitsL: "Aciertos", bullseye: "🎯 ¡En el blanco!", range: "Blancos 🎯", toys: "Juguetes ✋", coins: "Monedas", allCoins: "¡Todas las monedas! 🏆", cp: "¡Checkpoint! 🚩", top: "¡Llegaste a la cima! 🎉", welcome: "¡Bienvenido!", tower: "Torre ↑", help: "WASD/flechas: mover · Espacio: saltar · E: agarrar/lanzar · Arrastra: cámara · T: chat · R: volver" },
});

// ---------------------------------------------------------------- world
const world = createWorld({ canvas: document.getElementById("c"), sky: 0xaee6ff, fog: [50, 180] });
const phys = createPhysics();
let playing = false;
const cam = createFollowCamera(world.camera, { phys });
const input = createInput({
  canvas: world.renderer.domElement,
  enabled: () => playing,
  onLook: (dx, dy, touch) => cam.look(dx, dy, touch),
  onZoom: (d) => cam.zoom(d),
});
input.addButton({ label: "⤒", action: "jump", big: true });
const actBtn = input.addButton({ label: "✋", action: "act", hold: false });
input.addButton({ label: "💬", action: "chat", hold: false });
input.addButton({ label: "↺", action: "reset", hold: false });
input.setVisible(false);

const coins = createCoins(world);
let spawn = { x: 0, y: 0.05, z: 8 };
const movers = [];
const targets = [];

function buildLevel() {
  addGround(world, phys, { size: 220 });
  // water ring (kill) around the island
  const water = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.MeshLambertMaterial({ color: 0x38bdf8 }));
  water.rotation.x = -Math.PI / 2; water.position.y = -3; world.scene.add(water);
  phys.addBox({ x: 0, y: -4, z: 0, w: 800, h: 1, d: 800, type: "kill", mesh: false });

  for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2, r = 60 + (i % 3) * 14; addTree(world, phys, Math.cos(a) * r, Math.sin(a) * r, 0.9 + (i % 4) * 0.2); }
  for (let i = 0; i < 10; i++) addCloud(world, (i - 5) * 30, 28 + (i % 3) * 5, -40 + (i % 4) * 25, 1.6);
  addSign(world, t("welcome"), -4, 0, 4, 0.3);
  addSign(world, t("tower"), 6, 0, -6, -0.4, { width: 3 });

  // parkour tower: spiral of platforms
  const cols = ["#f97316", "#facc15", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7", "#ec4899"];
  let y = 1.2;
  for (let i = 0; i < 14; i++) {
    const a = i * 0.9, r = 7;
    const x = 12 + Math.cos(a) * r, z = -18 + Math.sin(a) * r;
    phys.addPlatform(x, y, z, 3, 3, cols[i % cols.length], { scene: world.scene });
    if (i % 3 === 1) coins.add(x, y + 1.2, z);
    y += 1.6;
  }
  phys.addPlatform(12, y, -18, 6, 6, "#fde047", { scene: world.scene });
  addCheckpoint(world, phys, 12, y, -18, () => { Audio.play("win"); toast(t("top"), 2500, true); track("ez_finish", { game: GAME_ID }); spawn = { x: 12, y: y + 0.05, z: -18 }; });
  for (let i = 0; i < 4; i++) coins.add(10.5 + (i % 2) * 3, y + 1.2, -19.5 + Math.floor(i / 2) * 3);

  // stairs, trampoline, moving platform, ice
  for (let i = 0; i < 6; i++) phys.addPlatform(-14, 0.5 + i * 0.5, -6 - i * 1.6, 4, 1.6, "#94a3b8", { scene: world.scene });
  addTrampoline(world, phys, -20, 10, { power: 26 });
  coins.add(-20, 12, 10);
  movers.push(addMover(phys, [-30, 2, -10], [-30, 2, 10], { scene: world.scene, color: "#a855f7", period: 6 }));
  phys.addPlatform(-30, 2.5, -16, 5, 4, "#c084fc", { scene: world.scene });
  coins.add(-30, 4, 14);
  phys.addBox({ x: 20, y: 0.05, z: 14, w: 16, h: 0.3, d: 10, color: "#bae6fd", type: "ice", scene: world.scene });
  coins.add(26, 1.3, 14);
  addCheckpoint(world, phys, -30, 2.5, -16, (cp) => { Audio.play("cp"); toast(t("cp")); spawn = { x: cp.x, y: cp.y + 0.05, z: cp.z }; });
  for (let i = 0; i < 6; i++) coins.add(-6 + i * 2.5, 1.2, 16);

  // target range (throwing practice): 5 targets that fall when hit and stand up again
  addSign(world, t("range"), -11, 0, 27, 0.3, { width: 3 });
  for (let i = 0; i < 5; i++) {
    const x = -8 + i * 4, z = 30 + (i % 2) * 3;
    phys.addBox({ x, y: 0.9, z: z + 0.6, w: 0.25, h: 1.8, d: 0.25, color: "#78350f", scene: world.scene });
    const g = new THREE.Group(); g.position.set(x, 1.8, z + 0.6); world.scene.add(g);
    [[1, "#ef4444"], [0.68, "#ffffff"], [0.36, "#ef4444"]].forEach(([r, c], k) => {
      const d = new THREE.Mesh(GEO.cyl, getMat(c)); d.scale.set(r, 0.08 + k * 0.03, r); d.rotation.x = Math.PI / 2; d.position.set(0, 0.95, -0.1 - k * 0.03); d.castShadow = true; g.add(d);
    });
    targets.push({ id: "alvo" + i, alvo: true, x, y: 1.6, z: z + 0.2, g, down: 0 });
  }
  addSign(world, t("toys"), 7, 0, 3, -0.3, { width: 3 });
}
buildLevel();

// ---------------------------------------------------------------- player, bots, network
const room = createRoom({ gameId: GAME_ID, max: 4 });
const me = createPlayer({ world, phys, input, cam, look: loadLook(), spawn, room, onDie: () => { throwables.drop(); me.respawn(spawn); } });
const remotes = createRemotePlayers(world.scene, room);
const bots = [0, 1, 2].map((i) => createBot({ world, phys, look: randomLook(["Bip", "Bop", "Zeca"][i]), area: { x0: -18, z0: -4, x1: 18, z1: 26 } }));

// ---------------------------------------------------------------- pick up & throw
let hits = 0;
const botIds = bots.map((b, i) => "bot" + i);
const throwables = createThrowables({
  world, phys, room, me, remotes,
  getTargets: () => {
    const L = bots.map((b, i) => ({ id: botIds[i], bot: b, body: b.body, ch: b.ch, x: b.body.x, y: b.body.y, z: b.body.z }));
    for (const [id, r] of remotes.map) L.push({ id, remote: true, ch: r.ch, x: r.x, y: r.y, z: r.z });
    for (const tg of targets) if (!tg.down) L.push(tg);
    L.push({ id: room.myId || "me", self: true, body: me.body, ch: me.ch, x: me.x, y: me.y, z: me.z });
    return L;
  },
  onHit: (tg, o, mine) => {
    if (tg.alvo) { tg.down = 4; Audio.play(mine ? "ok" : "pop"); if (mine) toast(t("bullseye")); }
    if (mine && !tg.self) { hits++; updHits(); track("ez_hit", { game: GAME_ID }); }
    // bots throw a snowball back at whoever hit them (local fun, not synced)
    if (tg.bot && mine) setTimeout(() => {
      const b = tg.bot.body, dx = me.x - b.x, dz = me.z - b.z, d = Math.hypot(dx, dz) || 1;
      if (d > 30) return;
      const tt = d / 18; // flight time
      throwables.fire("snow", [b.x + dx / d * 0.7, b.y + 2.4, b.z + dz / d * 0.7], [dx / tt, 24 * tt / 2 + (me.y - b.y) / tt, dz / tt], tg.id);
    }, 900 + Math.random() * 700);
  },
});
const TOYS = [["ball", 4, 2], ["ball", 5, 3.5], ["beach", 7, 1], ["pillow", 8.5, 3], ["pillow", 9.5, 1.5], ["crate", 3, 0], ["crate", 3, -1.3],
  ["snow", -2, 1], ["snow", -2.7, 1.6], ["snow", -1.4, 1.8], ["snow", -2.2, 2.6], ["ball", -6, 22], ["snow", 0, 22], ["snow", 1, 22.5], ["beach", -3, 22]];
TOYS.forEach(([k, x, z]) => throwables.add(k, x, 0, z));
input.onAction("act", () => {
  if (!playing) return;
  const b = cam.basis();
  const r = throwables.action(b.fx, b.fz);
  if (r === "throw") me.rot = Math.atan2(b.fx, b.fz);
});

room.on("chat", (d, from) => { const r = remotes.get(from); if (r && d && typeof d.m === "number") { r.ch.say(chatText(d.m)); Audio.play("pop"); } });
room.onStatus((k) => { if (k === "room") me.setLook(me.ch.look); });
function sayChat(i) { me.ch.say(chatText(i)); Audio.play("pop"); room.send("chat", { m: i }); }
input.onAction("chat", () => { if (playing) openQuickChat(sayChat); });
input.onAction("pause", () => { if (playing) pause(); });
addEventListener("keydown", (e) => { const n = parseInt(e.key, 10); if (playing && n >= 0 && n <= 9) sayChat(n === 0 ? 9 : n - 1); });

// ---------------------------------------------------------------- HUD
const coinPill = h("div.ez-pill");
const hitPill = h("div.ez-pill");
const hintPill = h("div.ez-pill", { style: { position: "fixed", left: "50%", bottom: "22%", transform: "translateX(-50%)", display: "none", pointerEvents: "none" } });
const hud = h("div.ez-hud.ez-hidden",
  h("div.ez-top",
    coinPill, hitPill, roomPill(room), h("div.ez-spacer"),
    h("button.ez-rbtn", { title: "Chat", onclick: () => openQuickChat(sayChat) }, "💬"),
    h("button.ez-rbtn", { title: "👥", onclick: () => { pause(false); openRoomPanel(room, { onClose: resume }); } }, "👥"),
    h("button.ez-rbtn", { title: "👕", onclick: () => { pause(false); openAvatarEditor(me.ch.look, (lk) => { me.setLook(lk); resume(); }, { onCancel: resume }); } }, "👕"),
    h("button.ez-rbtn", { title: "⏸", onclick: () => pause() }, "⏸"),
  ));
hud.appendChild(hintPill);
document.body.appendChild(hud);
const updHits = () => (hitPill.textContent = `🎯 ${hits}`);
updHits();
const total = coins.list.length;
let got = 0;
const updCoins = () => (coinPill.textContent = `🪙 ${got}/${total}`);
updCoins();

// ---------------------------------------------------------------- screens
let titleScr = null;
function showTitle() {
  playing = false; hud.classList.add("ez-hidden"); input.setVisible(false);
  const cv = h("canvas", { style: { width: "150px", height: "200px", display: "block", margin: "0 auto" } });
  const pv = createAvatarPreview(cv); pv.set(me.ch.look); pv.start();
  const close = () => { pv.stop(); titleScr.close(); };
  titleScr = screen([
    h("h1", "🎮 " + t("title")), h("p", { style: { textAlign: "center", opacity: 0.7 } }, t("sub") + " · v" + VERSION),
    cv,
    h("div.ez-col", { style: { marginTop: "10px" } },
      h("button.ez-btn.wide", { onclick: () => { close(); start(); } }, "▶ " + t("play")),
      h("div.ez-row", { style: { justifyContent: "center" } },
        h("button.ez-btn.blue.small", { onclick: () => { close(); openAvatarEditor(me.ch.look, (lk) => { me.setLook(lk); showTitle(); }, { onCancel: showTitle }); } }, "👕 " + t("character")),
        h("button.ez-btn.blue.small", { onclick: () => { close(); openRoomPanel(room, { onClose: showTitle }); } }, "👥 " + t("mp")),
        h("button.ez-btn.gray.small", { onclick: () => { close(); openSettings({ world, onClose: showTitle }); } }, "⚙️")),
      gameLinks(t("title")),
      isTouch ? null : h("p.ez-msg", { style: { textAlign: "center" } }, t("help")),
    ),
  ]);
}
function start() {
  playing = true; hud.classList.remove("ez-hidden"); input.setVisible(true); world.setPaused(false);
  Audio.init(); track("ez_play", { game: GAME_ID, multiplayer: room.connected ? 1 : 0 });
}
let pauseScr = null;
function pause(showMenu = true) {
  playing = false; world.setPaused(true); input.setVisible(false);
  if (!showMenu) return;
  pauseScr = screen([
    h("h2", "⏸ " + t("paused")),
    h("div.ez-col",
      h("button.ez-btn.wide", { onclick: () => { pauseScr.close(); resume(); } }, "▶ " + t("resume")),
      h("button.ez-btn.gray.wide", { onclick: () => { pauseScr.close(); openSettings({ world, onClose: () => pause() }); } }, "⚙️ " + t("settings")),
      h("button.ez-btn.gray.wide", { onclick: () => { pauseScr.close(); showTitle(); } }, "🏠 " + t("menu"))),
  ], { dim: true });
}
function resume() { start(); }
onLangChange(() => { updCoins(); updHits(); });

// ---------------------------------------------------------------- loop
world.onUpdate((dt, time) => {
  movers.forEach((m) => m.update(time));
  me.update(dt);
  bots.forEach((b) => b.update(dt));
  remotes.update(dt);
  endFrame(phys);
  throwables.update(dt);
  for (const tg of targets) {
    if (tg.down > 0) tg.down = Math.max(0, tg.down - dt);
    const goal = tg.down > 0 ? -Math.PI / 2 : 0; tg.g.rotation.x += (goal - tg.g.rotation.x) * Math.min(1, dt * 10);
  }
  const held = throwables.held, near = !held && throwables.nearest();
  const hint = held ? t("throwH") : near ? t("grab") : "";
  if (hintPill.textContent !== hint) { hintPill.textContent = hint; hintPill.style.display = hint && !isTouch ? "" : "none"; }
  actBtn.textContent = held ? "🎯" : "✋"; actBtn.style.opacity = held || near ? 1 : 0.5;
  const n = coins.update(dt, me.x, me.y, me.z);
  if (n) { got += n; Audio.play("coin"); updCoins(); if (got === total) { Audio.play("win"); toast(t("allCoins"), 2500, true); } }
  input.endFrame();
});
// keep rendering the scene behind menus (paused world still renders)
world.start();
me.respawn(spawn);
cam.update(0.016, me.body);
if (room.autoJoin()) toast(t("mpConnecting"));
showTitle();
window.GAME = { world, phys, me, room, bots, cam, input, throwables, targets }; // handy for debugging in the console
