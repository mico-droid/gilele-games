// Gilele Playground — template game showing every engine feature.
// Copy this folder to start a new game (games/<name>/), then change GAME_ID, strings and buildLevel().
import {
  THREE, createWorld, createPhysics, endFrame, createInput, createFollowCamera, createPlayer, createBot,
  createRoom, createRemotePlayers, loadLook, randomLook, Audio, addStrings, t, onLangChange, applyDom,
  h, toast, screen, openAvatarEditor, openSettings, openRoomPanel, roomPill, openQuickChat, chatText, installButton,
  addGround, addTree, addCloud, addTrampoline, addSign, createCoins, addCheckpoint, addMover, createAvatarPreview,
  registerPWA, track, initGTM, isTouch, VERSION,
} from "../../engine/ez.js";

const GAME_ID = "demo";
registerPWA("../../sw.js");
initGTM("GTM-54JJ46D9");

addStrings({
  pt: { title: "Gilele Playground", sub: "Jogo-modelo do motor", coins: "Moedas", allCoins: "Todas as moedas! 🏆", cp: "Checkpoint! 🚩", top: "Você chegou ao topo! 🎉", welcome: "Bem-vindo!", tower: "Torre ↑", help: "WASD/setas: andar · Espaço: pular · Arraste: câmera · T: chat · R: voltar" },
  en: { title: "Gilele Playground", sub: "Engine template game", coins: "Coins", allCoins: "All coins! 🏆", cp: "Checkpoint! 🚩", top: "You reached the top! 🎉", welcome: "Welcome!", tower: "Tower ↑", help: "WASD/arrows: move · Space: jump · Drag: camera · T: chat · R: respawn" },
  es: { title: "Gilele Playground", sub: "Juego plantilla del motor", coins: "Monedas", allCoins: "¡Todas las monedas! 🏆", cp: "¡Checkpoint! 🚩", top: "¡Llegaste a la cima! 🎉", welcome: "¡Bienvenido!", tower: "Torre ↑", help: "WASD/flechas: mover · Espacio: saltar · Arrastra: cámara · T: chat · R: volver" },
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
input.addButton({ label: "💬", action: "chat", hold: false });
input.addButton({ label: "↺", action: "reset", hold: false });
input.setVisible(false);

const coins = createCoins(world);
let spawn = { x: 0, y: 0.05, z: 8 };
const movers = [];

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
}
buildLevel();

// ---------------------------------------------------------------- player, bots, network
const room = createRoom({ gameId: GAME_ID, max: 4 });
const me = createPlayer({ world, phys, input, cam, look: loadLook(), spawn, room, onDie: () => me.respawn(spawn) });
const remotes = createRemotePlayers(world.scene, room);
const bots = [0, 1, 2].map((i) => createBot({ world, phys, look: randomLook(["Bip", "Bop", "Zeca"][i]), area: { x0: -18, z0: -4, x1: 18, z1: 26 } }));

room.on("chat", (d, from) => { const r = remotes.get(from); if (r && d && typeof d.m === "number") { r.ch.say(chatText(d.m)); Audio.play("pop"); } });
room.onStatus((k) => { if (k === "room") me.setLook(me.ch.look); });
function sayChat(i) { me.ch.say(chatText(i)); Audio.play("pop"); room.send("chat", { m: i }); }
input.onAction("chat", () => { if (playing) openQuickChat(sayChat); });
input.onAction("pause", () => { if (playing) pause(); });
addEventListener("keydown", (e) => { const n = parseInt(e.key, 10); if (playing && n >= 0 && n <= 9) sayChat(n === 0 ? 9 : n - 1); });

// ---------------------------------------------------------------- HUD
const coinPill = h("div.ez-pill");
const hud = h("div.ez-hud.ez-hidden",
  h("div.ez-top",
    coinPill, roomPill(room), h("div.ez-spacer"),
    h("button.ez-rbtn", { title: "Chat", onclick: () => openQuickChat(sayChat) }, "💬"),
    h("button.ez-rbtn", { title: "👥", onclick: () => { pause(false); openRoomPanel(room, { onClose: resume }); } }, "👥"),
    h("button.ez-rbtn", { title: "👕", onclick: () => { pause(false); openAvatarEditor(me.ch.look, (lk) => { me.setLook(lk); resume(); }, { onCancel: resume }); } }, "👕"),
    h("button.ez-rbtn", { title: "⏸", onclick: () => pause() }, "⏸"),
  ));
document.body.appendChild(hud);
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
      installButton(),
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
onLangChange(() => updCoins());

// ---------------------------------------------------------------- loop
world.onUpdate((dt, time) => {
  movers.forEach((m) => m.update(time));
  me.update(dt);
  bots.forEach((b) => b.update(dt));
  remotes.update(dt);
  endFrame(phys);
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
window.GAME = { world, phys, me, room, bots, cam, input }; // handy for debugging in the console
