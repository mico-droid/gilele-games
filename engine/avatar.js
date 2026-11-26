// Blocky avatars (ported from EZ Obby) + Character wrapper with name label, speech bubble and animation.
// A "look" is plain JSON so it can be saved and sent over the network:
// { n: name, g: kind, h: hair, hc: hairColor, c: [skin, detalhe, (livre), pants], a: accessory, f: face }
// A camiseta é sempre branca com a marca (uniforme); c[1] pinta gola, punho e barra.
import * as THREE from "./three.js";
import { cleanName } from "./words.js";
import { part, getMat } from "./core.js";
import { shared } from "./storage.js";
import { t } from "./i18n.js";
import { ACC_FREE, ACC_CHAIN, unlockCount } from "./unlocks.js";

export const INK = "#111827";
export const PALETTE = ["#f4c095", "#e0a878", "#a0673f", "#6b4226", "#ffd23f", "#f97316", "#ef4444", "#ec4899", "#a855f7", "#3b82f6", "#06b6d4", "#22c55e", "#ffffff", "#94a3b8", "#1f2937"];
export const SKINS = ["#f9d7b9", "#f4c095", "#e0a878", "#c68642", "#a0673f", "#6b4226", "#4a2c17"];
export const HAIRCOLS = ["#1f1a17", "#5b3a1e", "#a0673f", "#e8c15a", "#c2410c", "#ec4899", "#3b82f6", "#e5e7eb"];
export const KINDS = ["m", "f", "fox", "et", "horse", "smiley", "zombie"];
// Acessórios: os três primeiros vêm liberados; o resto é desbloqueado jogando (ver engine/unlocks.js).
export const ACCS = ["none", "hat", "cap", "glasses", "crown", "headphones", "cape", "afro", "pet", "catears", "emo", "halo", "horns"];
/** Acessórios que ocupam o lugar do cabelo (não dá para usar junto). */
export const ACC_HAIR = ["afro", "emo"];
export const FACES = ["normal", "happy", "smug", "sigma"];
export const HAIRS = { m: ["short", "spiky", "curly", "none"], f: ["long", "ponytail", "pigtails", "bob", "curly", "none"] };
export const ALLHAIR = ["none", "short", "spiky", "curly", "long", "ponytail", "pigtails", "bob"];
export const KIND_SKIN = { fox: "#f97316", et: "#22c55e", zombie: "#7fae6a" };
export const DEFAULT_LOOK = { n: "", g: "m", h: "short", hc: "#5b3a1e", c: ["#f4c095", "#ec4899", "#f4c095", "#3b82f6"], a: "none", f: "normal" };

const okColor = (c) => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c);
/** Validate anything (saved data, network) into a safe look. Names: max 14 chars, no control chars. */
export function sanitizeLook(o) {
  if (!o || typeof o !== "object") o = {};
  const c = Array.isArray(o.c) && o.c.length === 4 && o.c.every(okColor) ? o.c.slice() : DEFAULT_LOOK.c.slice();
  return {
    n: cleanName(o.n),   // tamanho + palavrão (words.js): vale para o nome local e para o que chega pela rede
    g: KINDS.includes(o.g) ? o.g : "m",
    h: ALLHAIR.includes(o.h) ? o.h : "none",
    hc: okColor(o.hc) ? o.hc : DEFAULT_LOOK.hc,
    c, a: ACCS.includes(o.a) ? o.a : "none", f: FACES.includes(o.f) ? o.f : "normal",
    ...(o.bot ? { bot: 1 } : {}),
  };
}
const pick = (a) => a[Math.floor(Math.random() * a.length)];
/** Acessórios que o jogador já pode usar (os outros são desbloqueados jogando). */
export function openAccs() { return ACC_FREE.concat(ACC_CHAIN.slice(0, unlockCount())); }
/** randomLook(nome) — sorteia um boneco. Por padrão só usa acessórios já liberados. */
export function randomLook(name = "", { accs } = {}) {
  const g = Math.random() < 0.8 ? pick(["m", "f"]) : pick(KINDS);
  const skin = KIND_SKIN[g] || pick(SKINS);
  const pool = accs || openAccs();
  return sanitizeLook({ n: name, g, h: pick(HAIRS[g === "f" ? "f" : "m"]), hc: pick(HAIRCOLS), c: [skin, pick(PALETTE), skin, pick(PALETTE)], a: Math.random() < 0.6 ? "none" : pick(pool), f: pick(FACES) });
}
/**
 * O visual do boneco é compartilhado por todos os jogos Gilelê.
 * Na primeira vez sorteia um boneco (o dono pediu personagem inicial aleatório, 25/11/2026)
 * e já salva, para o jogador se reconhecer nos outros jogos.
 */
export function loadLook() {
  const saved = shared.getJSON("look", null);
  if (saved && typeof saved === "object") return sanitizeLook(saved);
  const lk = randomLook("");
  saveLook(lk);
  return lk;
}
export function saveLook(lk) { shared.setJSON("look", sanitizeLook(lk)); }

// ------------------------------------------------------------------ building blocks
function buildHair(head, lk) {
  const c = lk.hc, h = lk.h;
  if (h === "none") return;
  part(0.76, 0.16, 0.76, c, 0, 0.39, 0, head);
  if (h === "short" || h === "spiky") { part(0.76, 0.42, 0.12, c, 0, 0.2, -0.33, head); part(0.08, 0.25, 0.62, c, -0.36, 0.24, -0.04, head); part(0.08, 0.25, 0.62, c, 0.36, 0.24, -0.04, head); part(0.76, 0.1, 0.07, c, 0, 0.32, 0.36, head); }
  if (h === "spiky") [[-0.24, -0.15], [0, -0.2], [0.24, -0.15], [-0.12, 0.15], [0.14, 0.12]].forEach(([x, z]) => { const m = part(0.2, 0.2, 0.2, c, x, 0.52, z, head); m.rotation.set(0.6, 0.78, 0); });
  if (h === "curly" && lk.g === "f") {
    for (let i = 0; i < 16; i++) { const x = (i % 4 - 1.5) * 0.27, z = (Math.floor(i / 4) - 1.5) * 0.27; part(0.34, 0.34, 0.34, c, x, 0.52 + ((i * 7) % 3) * 0.04, z, head); }
    for (let j = 0; j < 4; j++) [-1, 1].forEach((s) => part(0.34, 0.34, 0.4, c, s * 0.5, 0.35 - j * 0.27, -0.12 + (j % 2) * 0.08, head));
    part(1.05, 1.1, 0.36, c, 0, -0.05, -0.47, head);
    for (let j = 0; j < 3; j++) part(0.36, 0.32, 0.36, c, (j - 1) * 0.36, -0.65, -0.45, head);
    part(0.8, 0.12, 0.08, c, 0, 0.32, 0.37, head);
  } else if (h === "curly") {
    for (let i = 0; i < 9; i++) { const x = (i % 3 - 1) * 0.26, z = (Math.floor(i / 3) - 1) * 0.26; part(0.3, 0.3, 0.3, c, x, 0.5 + (i % 2) * 0.05, z, head); }
    [[-0.4, 0.15], [0.4, 0.15], [-0.4, -0.15], [0.4, -0.15]].forEach(([x, z]) => part(0.22, 0.3, 0.26, c, x, 0.25, z, head)); part(0.8, 0.4, 0.2, c, 0, 0.18, -0.36, head);
  }
  if (h === "long") { part(0.8, 1.0, 0.14, c, 0, -0.08, -0.36, head); part(0.1, 0.85, 0.5, c, -0.38, -0.02, -0.08, head); part(0.1, 0.85, 0.5, c, 0.38, -0.02, -0.08, head); part(0.76, 0.12, 0.07, c, 0, 0.31, 0.36, head); }
  if (h === "bob") { part(0.8, 0.55, 0.14, c, 0, 0.08, -0.36, head); part(0.1, 0.55, 0.62, c, -0.38, 0.08, -0.04, head); part(0.1, 0.55, 0.62, c, 0.38, 0.08, -0.04, head); part(0.76, 0.14, 0.07, c, 0, 0.3, 0.36, head); }
  if (h === "ponytail") {
    part(0.76, 0.4, 0.12, c, 0, 0.2, -0.33, head); part(0.76, 0.1, 0.07, c, 0, 0.32, 0.36, head); part(0.08, 0.3, 0.6, c, -0.36, 0.22, -0.04, head); part(0.08, 0.3, 0.6, c, 0.36, 0.22, -0.04, head);
    part(0.12, 0.12, 0.12, "#ec4899", 0, 0.25, -0.45, head); part(0.22, 0.75, 0.22, c, 0, -0.15, -0.52, head);
  }
  if (h === "pigtails") {
    part(0.76, 0.4, 0.12, c, 0, 0.2, -0.33, head); part(0.76, 0.1, 0.07, c, 0, 0.32, 0.36, head);
    [-1, 1].forEach((s) => { part(0.12, 0.12, 0.12, "#ec4899", s * 0.43, 0.22, -0.1, head); part(0.22, 0.62, 0.22, c, s * 0.5, -0.08, -0.1, head); });
  }
}
function eyes(head, lk) {
  if (lk.a === "glasses") return;
  part(0.1, 0.15, 0.03, INK, -0.15, 0.07, 0.355, head, false); part(0.1, 0.15, 0.03, INK, 0.15, 0.07, 0.355, head, false);
}
function faceNormal(head, lk) {
  const girl = lk.g === "f";
  eyes(head, lk);
  if (girl && lk.a !== "glasses") { part(0.05, 0.07, 0.03, INK, -0.22, 0.17, 0.355, head, false); part(0.05, 0.07, 0.03, INK, 0.22, 0.17, 0.355, head, false); }
  if (girl) { part(0.1, 0.06, 0.03, "#f9a8d4", -0.23, -0.06, 0.355, head, false); part(0.1, 0.06, 0.03, "#f9a8d4", 0.23, -0.06, 0.355, head, false); }
  const mc = girl ? "#be185d" : INK;
  part(0.26, 0.05, 0.03, mc, 0, -0.14, 0.355, head, false); part(0.05, 0.06, 0.03, mc, -0.14, -0.1, 0.355, head, false); part(0.05, 0.06, 0.03, mc, 0.14, -0.1, 0.355, head, false);
}
function faceHappy(head, lk) {
  // ^ ^ eyes
  if (lk.a !== "glasses") [-1, 1].forEach((s) => {
    const l = part(0.1, 0.045, 0.03, INK, s * 0.15 - 0.035, 0.07, 0.355, head, false); l.rotation.z = 0.7;
    const r = part(0.1, 0.045, 0.03, INK, s * 0.15 + 0.035, 0.07, 0.355, head, false); r.rotation.z = -0.7;
  });
  part(0.3, 0.12, 0.03, "#7f1d1d", 0, -0.14, 0.355, head, false); part(0.22, 0.04, 0.02, "#ffffff", 0, -0.1, 0.357, head, false);
  part(0.1, 0.06, 0.03, "#f9a8d4", -0.25, -0.06, 0.355, head, false); part(0.1, 0.06, 0.03, "#f9a8d4", 0.25, -0.06, 0.355, head, false);
}
function faceSmug(head) {
  const b = part(0.2, 0.05, 0.03, INK, -0.15, 0.2, 0.355, head, false); b.rotation.z = 0.35; part(0.2, 0.05, 0.03, INK, 0.15, 0.15, 0.355, head, false);
  part(0.15, 0.05, 0.03, INK, -0.15, 0.06, 0.355, head, false); part(0.15, 0.05, 0.03, INK, 0.15, 0.06, 0.355, head, false);
  part(0.36, 0.05, 0.03, INK, 0.03, -0.17, 0.355, head, false); part(0.05, 0.12, 0.03, INK, 0.21, -0.12, 0.355, head, false); part(0.28, 0.05, 0.02, "#ffffff", 0.03, -0.13, 0.357, head, false);
}
function faceSigma(head) {
  const bl = part(0.22, 0.07, 0.03, INK, -0.15, 0.17, 0.355, head, false); bl.rotation.z = -0.18; const br = part(0.22, 0.07, 0.03, INK, 0.15, 0.17, 0.355, head, false); br.rotation.z = 0.18;
  part(0.1, 0.08, 0.03, INK, -0.15, 0.07, 0.355, head, false); part(0.1, 0.08, 0.03, INK, 0.15, 0.07, 0.355, head, false);
  part(0.2, 0.04, 0.03, INK, 0.02, -0.15, 0.355, head, false); part(0.04, 0.06, 0.03, INK, 0.12, -0.12, 0.355, head, false);
}
function buildHorseHead(head, lk) {
  const br = "#8b5a2b", mz = "#d6b38a", mane = lk.hc || "#1f1a17";
  part(0.62, 0.8, 0.7, br, 0, 0.05, -0.05, head); part(0.5, 0.45, 0.6, br, 0, -0.18, 0.45, head); part(0.52, 0.32, 0.2, mz, 0, -0.24, 0.78, head);
  part(0.06, 0.07, 0.02, INK, -0.12, -0.2, 0.885, head, false); part(0.06, 0.07, 0.02, INK, 0.12, -0.2, 0.885, head, false);
  [-1, 1].forEach((s) => { part(0.03, 0.13, 0.13, INK, s * 0.315, 0.15, 0.15, head, false); part(0.12, 0.27, 0.1, br, s * 0.18, 0.56, -0.15, head); });
  part(0.14, 1.0, 0.5, mane, 0, 0.12, -0.34, head); part(0.14, 0.22, 0.36, mane, 0, 0.52, 0.08, head);
}
function buildSmileyHead(head) {
  part(1.1, 1.1, 1.1, "#facc15", 0, 0.2, 0, head);
  part(0.13, 0.28, 0.03, INK, -0.2, 0.36, 0.555, head, false); part(0.13, 0.28, 0.03, INK, 0.2, 0.36, 0.555, head, false);
  [[-0.36, 0.02, 0.12], [-0.25, -0.1, 0.14], [0, -0.17, 0.38], [0.25, -0.1, 0.14], [0.36, 0.02, 0.12]].forEach(([x, y, w]) => part(w, 0.08, 0.03, INK, x, y, 0.555, head, false));
}

// ------------------------------------------------------------------ uniforme da marca
// Camiseta branca com o nome da marca estampado (pedido do dono: venda para escolas).
export const BRAND = { name: "Gilelê Games", shirt: "#ffffff", ink: "#1f2937" };
let brandTex = null;
function brandTexture() {
  if (brandTex) return brandTex;
  const cv = document.createElement("canvas"); cv.width = 256; cv.height = 128;
  const c = cv.getContext("2d");
  c.clearRect(0, 0, 256, 128);
  c.textAlign = "center"; c.textBaseline = "middle";
  const parts = BRAND.name.split(" ");
  const l1 = parts[0] || BRAND.name, l2 = parts.slice(1).join(" ");
  const fit = (txt, size) => { let f = size; c.font = `800 ${f}px Fredoka, system-ui, sans-serif`; while (c.measureText(txt).width > 228 && f > 10) { f -= 2; c.font = `800 ${f}px Fredoka, system-ui, sans-serif`; } };
  c.fillStyle = BRAND.ink;
  if (l2) { fit(l1, 54); c.fillText(l1, 128, 48); fit(l2, 40); c.fillText(l2, 128, 94); }
  else { fit(l1, 60); c.fillText(l1, 128, 64); }
  brandTex = new THREE.CanvasTexture(cv); brandTex.colorSpace = THREE.SRGBColorSpace; brandTex.anisotropy = 4;
  return brandTex;
}
/** Estampa da marca (frente e costas) no tronco. */
function brandDecal(body, w, y, z) {
  const m = new THREE.MeshBasicMaterial({ map: brandTexture(), transparent: true, depthWrite: false });
  const front = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.74, w * 0.37), m);
  front.position.set(0, y, z + 0.005); body.add(front);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.74, w * 0.37), m);
  back.position.set(0, y, -z - 0.005); back.rotation.y = Math.PI; body.add(back);
  return front;
}

/** Build the 3D model. Returns { g, body, legL, legR, armL, armR, head, zombie, top }. Model faces +Z. */
export function buildAvatar(lk) {
  lk = sanitizeLook(lk);
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const c = lk.c, kind = lk.g, girl = kind === "f", fox = kind === "fox", et = kind === "et", zom = kind === "zombie", face = lk.f;
  const tw = girl ? 0.9 : 1.0, ax = girl ? 0.69 : 0.75, aw = girl ? 0.4 : 0.46, lw = girl ? 0.42 : 0.47;
  const legL = new THREE.Group(); legL.position.set(-0.24, 1.0, 0); part(lw, 1.0, 0.48, c[3], 0, -0.5, 0, legL); body.add(legL);
  const legR = new THREE.Group(); legR.position.set(0.24, 1.0, 0); part(lw, 1.0, 0.48, c[3], 0, -0.5, 0, legR); body.add(legR);
  // camiseta branca com a marca (uniforme) + gola/barra na cor escolhida (c[1] = detalhe)
  part(tw, 1.0, 0.5, BRAND.shirt, 0, 1.5, 0, body);
  part(tw * 1.01, 0.11, 0.51, c[1], 0, 1.95, 0, body, false);   // gola
  part(tw * 1.01, 0.09, 0.51, c[1], 0, 1.03, 0, body, false);   // barra
  brandDecal(body, tw, 1.52, 0.251);
  if (girl) { part(1.08, 0.42, 0.66, c[1], 0, 0.86, 0, body); }
  const sleeve = BRAND.shirt;
  const mkArm = (sx) => { const a = new THREE.Group(); a.position.set(sx * ax, 1.95, 0); part(aw, 0.45, 0.46, sleeve, 0, -0.2, 0, a); part(aw * 1.02, 0.08, 0.47, c[1], 0, -0.41, 0, a, false); part(aw * 0.94, 0.55, 0.42, c[0], 0, -0.68, 0, a); body.add(a); return a; };
  const armL = mkArm(-1), armR = mkArm(1);
  const head = new THREE.Group(); head.position.set(0, 2.36, 0); body.add(head);
  const ret = { g, body, legL, legR, armL, armR, head, zombie: zom, top: kind === "smiley" ? 3.75 : et ? 3.55 : 3.3 };
  if (zom) {
    [[-0.2, 1.72, 0.255, 0.16, 0.2], [0.22, 1.3, 0.255, 0.2, 0.14]].forEach(([x, y, z, w, h]) => part(w, h, 0.03, "#3f6212", x, y, z, body, false));
    part(0.2, 0.14, 0.04, "#5b4636", -0.05, -0.55, 0.25, legL, false);
  }
  if (lk.bot) { part(0.7, 0.7, 0.7, c[0], 0, 0, 0, head); part(0.56, 0.16, 0.03, "#22d3ee", 0, 0.06, 0.355, head, false); part(0.06, 0.4, 0.06, "#9ca3af", 0, 0.55, 0, head); part(0.14, 0.14, 0.14, "#ef4444", 0, 0.78, 0, head); return ret; }
  let up = 0;
  if (kind === "horse") { buildHorseHead(head, lk); up = 0.1; }
  else if (kind === "smiley") { buildSmileyHead(head); up = 0.42; }
  else {
    if (et) { head.position.y = 2.46; head.scale.set(1.28, 1.22, 1.25); }
    part(0.7, 0.7, 0.7, c[0], 0, 0, 0, head);
    if (fox) {
      [-1, 1].forEach((s) => { part(0.22, 0.32, 0.14, c[0], s * 0.22, 0.5, -0.04, head); part(0.12, 0.18, 0.03, "#1f2937", s * 0.22, 0.47, 0.035, head, false); part(0.12, 0.2, 0.05, "#ffffff", s * 0.28, -0.13, 0.34, head, false); });
      part(0.36, 0.24, 0.22, "#ffffff", 0, -0.14, 0.44, head); part(0.12, 0.09, 0.06, INK, 0, -0.06, 0.56, head, false);
      const tail = new THREE.Group(); tail.position.set(0, 1.05, -0.25); tail.rotation.x = -0.7; body.add(tail);
      part(0.36, 0.36, 0.8, c[0], 0, 0, -0.4, tail); part(0.38, 0.38, 0.3, "#ffffff", 0, 0, -0.92, tail);
      ret.tail = tail;
    }
    if (zom) {
      part(0.72, 0.12, 0.72, "#3f3f2e", 0, 0.38, 0, head); part(0.22, 0.16, 0.22, "#3f3f2e", -0.18, 0.5, 0.1, head); part(0.16, 0.12, 0.16, "#3f3f2e", 0.2, 0.48, -0.12, head);
      [-1, 1].forEach((s) => { part(0.18, 0.16, 0.03, "#1c1917", s * 0.16, 0.08, 0.355, head, false); part(0.07, 0.07, 0.02, "#ef4444", s * 0.16, 0.07, 0.372, head, false); });
      part(0.34, 0.06, 0.03, "#1c1917", 0, -0.2, 0.355, head, false); [-0.12, 0, 0.12].forEach((x) => part(0.03, 0.14, 0.035, "#1c1917", x, -0.2, 0.36, head, false));
    }
    if (et) [-1, 1].forEach((s) => { part(0.04, 0.32, 0.04, "#4d7c0f", s * 0.15, 0.5, 0, head); part(0.11, 0.11, 0.11, "#facc15", s * 0.15, 0.7, 0, head); });
    if (zom) {}
    else if (face === "smug") faceSmug(head);
    else if (face === "sigma") faceSigma(head);
    else if (face === "happy") faceHappy(head, lk);
    else if (fox) { if (lk.a !== "glasses") { part(0.1, 0.14, 0.03, INK, -0.15, 0.1, 0.355, head, false); part(0.1, 0.14, 0.03, INK, 0.15, 0.1, 0.355, head, false); } }
    else if (et) { [-1, 1].forEach((s) => { const e = part(0.28, 0.17, 0.03, "#0b0b0b", s * 0.16, 0.04, 0.355, head, false); e.rotation.z = s * 0.4; part(0.05, 0.05, 0.02, "#ffffff", s * 0.12, 0.08, 0.372, head, false); }); part(0.12, 0.03, 0.03, "#14532d", 0, -0.18, 0.355, head, false); }
    else faceNormal(head, lk);
    if (!fox && !et && !zom && !ACC_HAIR.includes(lk.a)) { buildHair(head, lk); up = lk.h !== "none" ? (lk.h === "curly" && girl ? 0.2 : 0.08) : 0; }
  }
  const hd = kind === "smiley" ? 1.55 : 1;
  const ink = INK;
  if (lk.a === "hat") { part(0.98 * hd, 0.06, 0.98 * hd, "#1f2937", 0, 0.38 + up, 0, head); part(0.64 * hd, 0.55, 0.64 * hd, "#1f2937", 0, 0.68 + up, 0, head); part(0.66 * hd, 0.1, 0.66 * hd, c[1], 0, 0.47 + up, 0, head); }
  else if (lk.a === "cap") { part(0.78 * hd, 0.24, 0.78 * hd, c[1], 0, 0.46 + up, 0, head); part(0.66 * hd, 0.06, 0.42, c[1], 0, 0.37 + up, 0.54 * hd, head); }
  else if (lk.a === "crown") {
    const y0 = 0.42 + up, gold = "#facc15";
    part(0.72 * hd, 0.16, 0.72 * hd, gold, 0, y0, 0, head);
    [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([x, z]) => part(0.12, 0.18, 0.12, gold, x * 0.3 * hd, y0 + 0.16, z * 0.3 * hd, head));
    part(0.1, 0.1, 0.04, "#ef4444", 0, y0, 0.37 * hd, head, false);
  }
  else if (lk.a === "headphones" && kind !== "horse") {
    const w = 0.39 * hd, y = kind === "smiley" ? 0.25 : 0.02;
    part(0.84 * hd, 0.08, 0.14, ink, 0, 0.44 + up * 0.6, 0, head);
    [-1, 1].forEach((s) => { part(0.08, 0.4, 0.12, ink, s * (w + 0.02), 0.25, 0, head); part(0.12, 0.3, 0.3, "#ef4444", s * w, y, 0, head); });
  }
  else if (lk.a === "glasses" && kind !== "horse") {
    const gy = kind === "smiley" ? 0.36 : 0.07, gz = kind === "smiley" ? 0.57 : 0.37, gx = kind === "smiley" ? 0.2 : 0.15;
    part(0.25, 0.17, 0.04, ink, -gx, gy, gz, head, false); part(0.25, 0.17, 0.04, ink, gx, gy, gz, head, false); part(gx * 2 + 0.42, 0.04, 0.04, ink, 0, gy + 0.05, gz, head, false);
  }
  // ---- itens desbloqueados jogando (25/11/2026) ----
  else if (lk.a === "catears") {
    const fur = lk.hc;
    [-1, 1].forEach((s) => { const e = part(0.3 * hd, 0.38, 0.16, fur, s * 0.23 * hd, 0.54 + up, -0.02, head); e.rotation.z = s * 0.26; part(0.15, 0.2, 0.06, "#f9a8d4", s * 0.23 * hd, 0.52 + up, 0.07, head, false); });
  }
  else if (lk.a === "horns") {
    const bone = "#e7e5e4";
    part(0.62 * hd, 0.16, 0.34, "#a8a29e", 0, 0.3 + up, 0, head);                                  // faixa na testa
    [-1, 1].forEach((s) => {
      part(0.3, 0.17, 0.17, bone, s * 0.42 * hd, 0.28 + up, 0, head);                              // sai de lado
      const mid = part(0.18, 0.3, 0.18, bone, s * 0.56 * hd, 0.45 + up, 0, head); mid.rotation.z = s * -0.3;
      const tip = part(0.12, 0.24, 0.12, bone, s * 0.52 * hd, 0.65 + up, 0, head); tip.rotation.z = s * 0.15;
    });
  }
  else if (lk.a === "halo") {
    const gold = "#fde047", y0 = 0.72 + up;
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; part(0.11, 0.07, 0.11, gold, Math.cos(a) * 0.3 * hd, y0, Math.sin(a) * 0.3 * hd, head, false); }
  }
  else if (lk.a === "afro") {
    const f = lk.hc;
    for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2; part(0.34, 0.34, 0.34, f, Math.cos(a) * 0.5 * hd, 0.12 + (i % 2) * 0.08, Math.sin(a) * 0.5 * hd, head); }   // volume em volta
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + 0.3; part(0.32, 0.32, 0.32, f, Math.cos(a) * 0.32 * hd, 0.44, Math.sin(a) * 0.32 * hd, head); }            // topo
    part(0.86 * hd, 0.36, 0.86 * hd, f, 0, 0.32, 0, head);
    part(0.78 * hd, 0.1, 0.08, f, 0, 0.2, 0.36 * hd, head, false);              // linha do cabelo
  }
  else if (lk.a === "emo") {
    const f = lk.hc;
    part(0.8 * hd, 0.22, 0.8 * hd, f, 0, 0.34, 0, head);                                            // topo
    const fringe = part(0.52 * hd, 0.4, 0.12, f, -0.11 * hd, 0.15, 0.36 * hd, head, false); fringe.rotation.z = 0.38;  // franja caída no olho
    part(0.34 * hd, 0.26, 0.1, f, 0.25 * hd, 0.26, 0.36 * hd, head, false);
    part(0.8 * hd, 0.66, 0.16, f, 0, 0.02, -0.36 * hd, head);                                       // nuca
    [-1, 1].forEach((s) => part(0.12, 0.56, 0.46, f, s * 0.38 * hd, 0.06, -0.02, head));            // laterais
  }
  if (lk.a === "cape") {
    const cp = new THREE.Group(); cp.position.set(0, 1.92, -0.26); cp.rotation.x = 0.12; body.add(cp);
    part(1.12, 1.5, 0.08, c[1], 0, -0.72, 0, cp);
    part(1.2, 0.16, 0.14, "#fde047", 0, 0.02, 0.02, cp, false);                 // gola da capa
    part(0.9, 0.3, 0.07, "#fde047", 0, -1.4, -0.02, cp, false);                 // barra
    ret.cape = cp;
  }
  if (lk.a === "pet") {
    const pet = new THREE.Group(); pet.position.set(-0.95, 0.3, -0.5); g.add(pet);
    const fur = lk.hc;
    part(0.5, 0.34, 0.7, fur, 0, 0, 0, pet);
    part(0.36, 0.34, 0.34, fur, 0, 0.26, 0.4, pet);
    [-1, 1].forEach((s) => part(0.12, 0.16, 0.1, fur, s * 0.12, 0.46, 0.38, pet));
    part(0.12, 0.08, 0.1, INK, 0, 0.2, 0.58, pet, false);
    [[-0.17, 0.26], [0.17, 0.26], [-0.17, -0.26], [0.17, -0.26]].forEach(([x, z]) => part(0.12, 0.3, 0.12, fur, x, -0.3, z, pet));
    const tail = part(0.1, 0.34, 0.1, fur, 0, 0.18, -0.38, pet); tail.rotation.x = -0.5;
    ret.pet = pet; ret.petTail = tail;
  }
  return ret;
}

// ------------------------------------------------------------------ text sprites
function roundRect(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
/** Billboard text (names, bubbles, signs). opt: { bubble, color, scale } */
export function makeTextSprite(text, opt = {}) {
  const cv = document.createElement("canvas"); cv.width = 512; cv.height = 128;
  const x = cv.getContext("2d");
  let fsz = 58; const F = (s) => `700 ${s}px Fredoka, system-ui, sans-serif`;
  x.font = F(fsz); x.textAlign = "center"; x.textBaseline = "middle";
  while (x.measureText(text).width > (opt.bubble ? 440 : 490) && fsz > 26) { fsz -= 4; x.font = F(fsz); }
  if (opt.bubble) {
    const tw = Math.min(480, x.measureText(text).width + 60);
    x.fillStyle = "rgba(255,255,255,0.95)"; roundRect(x, (512 - tw) / 2, 10, tw, 100, 30); x.fill();
    x.fillStyle = "#111827"; x.fillText(text, 256, 62);
  } else {
    x.lineWidth = 10; x.strokeStyle = "rgba(0,0,0,0.65)"; x.strokeText(text, 256, 64);
    x.fillStyle = opt.color || "#ffffff"; x.fillText(text, 256, 64);
  }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  const s = opt.scale || 1;
  sp.scale.set((opt.bubble ? 3.4 : 3.0) * s, (opt.bubble ? 0.85 : 0.75) * s, 1); sp.renderOrder = 10;
  return sp;
}
export function disposeSprite(sp) { if (!sp) return; sp.material.map.dispose(); sp.material.dispose(); if (sp.parent) sp.parent.remove(sp); }

// ------------------------------------------------------------------ Character
/**
 * new Character(scene, look, { kind: "me" | "remote" | "bot" | "npc", label: true })
 * .root (Group: move/rotate this) .setLook(lk) .say(text) .setExtra(text) .animate(dt, speed, grounded, pose)
 */
export class Character {
  constructor(scene, lk, opt = {}) {
    this.scene = scene; this.kind = opt.kind || "remote"; this.showLabel = opt.label !== false;
    this.root = new THREE.Group(); scene.add(this.root);
    this.phase = 0; this.label = null; this.bubble = null; this.bubbleT = 0; this.extra = "";
    this.setLook(lk);
  }
  labelText() { return (this.kind === "bot" ? "🤖 " : "") + (this.look.n || t("namePh")) + (this.extra ? "  " + this.extra : ""); }
  makeLabel() {
    disposeSprite(this.label); this.label = null;
    if (!this.showLabel) return;
    const col = this.kind === "me" ? "#fde047" : this.kind === "bot" ? "#93c5fd" : "#ffffff";
    this.label = makeTextSprite(this.labelText(), { color: col }); this.label.position.y = this.av.top; this.root.add(this.label);
  }
  setLook(lk) {
    if (this.av) this.root.remove(this.av.g);
    this.look = sanitizeLook(lk); this.av = buildAvatar(this.look); this.root.add(this.av.g); this.makeLabel();
  }
  /** Extra text after the name (score, medal…). */
  setExtra(s) { if (s === this.extra) return; this.extra = s; this.makeLabel(); }
  say(text, secs = 4) {
    disposeSprite(this.bubble); this.bubble = makeTextSprite(text, { bubble: true });
    this.bubble.position.y = this.av.top + 0.95; this.root.add(this.bubble); this.bubbleT = secs;
  }
  /** pose: "walk" (default), "sit", "freeze", "wave", "drive" */
  animate(dt, speed, grounded, pose = "walk") {
    const a = this.av, amt = Math.min(1, speed / 7);
    a.armL.rotation.z = a.armR.rotation.z = 0;
    if (pose === "freeze") { a.legL.rotation.x = a.legR.rotation.x = 0; a.armL.rotation.x = a.armR.rotation.x = -0.3; }
    else if (pose === "sit" || pose === "drive") {
      a.legL.rotation.x = a.legR.rotation.x = -1.45;
      a.armL.rotation.x = a.armR.rotation.x = pose === "drive" ? -1.2 : -2.9;
    }
    else if (pose === "wave") { this.phase += dt * 8; a.armR.rotation.x = -2.8; a.armR.rotation.z = 0.4 + Math.sin(this.phase) * 0.4; a.armL.rotation.x = 0; a.legL.rotation.x = a.legR.rotation.x = 0; }
    else if (grounded) {
      this.phase += dt * (4 + speed * 1.2); const s = Math.sin(this.phase) * 0.9 * amt;
      a.legL.rotation.x = s; a.legR.rotation.x = -s; a.armL.rotation.x = -s; a.armR.rotation.x = s;
      if (a.zombie) { a.armL.rotation.x = -1.45 + s * 0.12; a.armR.rotation.x = -1.45 - s * 0.12; }
    } else { a.legL.rotation.x = 0.35; a.legR.rotation.x = -0.35; a.armL.rotation.x = -2.6; a.armR.rotation.x = -2.6; a.armL.rotation.z = -0.15; a.armR.rotation.z = 0.15; }
    if (a.tail) a.tail.rotation.y = Math.sin(performance.now() / 300) * 0.3;
    const tm = performance.now();
    if (a.cape) a.cape.rotation.x = 0.12 + Math.min(0.5, speed * 0.06) + Math.sin(tm / 260) * (0.05 + amt * 0.1);   // capa balança
    if (a.pet) { a.pet.position.y = 0.3 + Math.abs(Math.sin(tm / 190)) * 0.12 * (0.4 + amt); a.pet.rotation.y = Math.sin(tm / 700) * 0.25; if (a.petTail) a.petTail.rotation.z = Math.sin(tm / 120) * 0.6; }
    if (this.bubble) { this.bubbleT -= dt; if (this.bubbleT <= 0) { disposeSprite(this.bubble); this.bubble = null; } }
  }
  dispose() { disposeSprite(this.label); disposeSprite(this.bubble); this.scene.remove(this.root); }
}

/** Small 3D preview renderer for menus (rotating avatar on a grass disc). */
/**
 * Bonequinho girando num canvas.
 *   opt.hero = true  → versão da TELA INICIAL (25/11/2026): fundo transparente (aparece o cenário 3D do
 *   jogo atrás), sem o disquinho de grama, boneco maior, girando devagar como se a câmera desse a volta,
 *   e parado ele respira e dá pulinhos de vez em quando.
 */
export function createAvatarPreview(canvas, opt = {}) {
  const hero = !!opt.hero;
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const sc = new THREE.Scene();
  sc.add(new THREE.HemisphereLight(0xffffff, 0x88aa99, hero ? 2.9 : 2.6));
  const l = new THREE.DirectionalLight(0xffffff, hero ? 2.6 : 2.2); l.position.set(3, 5, 7); sc.add(l);
  const cam = new THREE.PerspectiveCamera(hero ? 26 : 30, 1, 0.1, 50); cam.position.set(0, 1.9, hero ? 9.4 : 8.2); cam.lookAt(0, hero ? 1.45 : 1.6, 0);
  if (!hero) { const ground = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.15, 24), getMat(0x6cc04a)); ground.position.y = -0.08; sc.add(ground); }
  let av = null, raf = 0, spin = 0, drag = null, t0 = performance.now(), lastW = 0, lastH = 0;
  canvas.style.touchAction = "none";
  canvas.addEventListener("pointerdown", (e) => { drag = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener("pointermove", (e) => { if (drag !== null) { spin += (e.clientX - drag) * (hero ? 0.01 : 0.02); drag = e.clientX; } });
  canvas.addEventListener("pointerup", () => (drag = null));
  function size() {
    const w = canvas.clientWidth || 160, hh = canvas.clientHeight || 220;
    lastW = w; lastH = hh; r.setSize(w, hh, false); cam.aspect = w / hh; cam.updateProjectionMatrix();
  }
  /** Idle da tela inicial: respira, balança os braços e pula de vez em quando. */
  function idle(now) {
    if (!av) return;
    const cyc = now % 3.6;
    if (cyc < 0.66) {                                   // pulinho
      const p = cyc / 0.66, up = Math.sin(p * Math.PI);
      av.g.position.y = up * 0.85;
      av.g.scale.set(1 + up * 0.04, 1 - up * 0.05, 1 + up * 0.04);
      if (av.legL) { av.legL.rotation.x = 0.4 * up; av.legR.rotation.x = -0.4 * up; }
      if (av.armL) { av.armL.rotation.x = -2.4 * up; av.armR.rotation.x = -2.4 * up; av.armL.rotation.z = -0.2 * up; av.armR.rotation.z = 0.2 * up; }
    } else {
      const b = Math.sin(now * 2.2);
      av.g.position.y = 0.02 + b * 0.02;
      av.g.scale.set(1, 1 + b * 0.012, 1);
      if (av.legL) { av.legL.rotation.x = 0; av.legR.rotation.x = 0; }
      if (av.armL) { av.armL.rotation.x = b * 0.12; av.armR.rotation.x = -b * 0.12; av.armL.rotation.z = 0.06; av.armR.rotation.z = -0.06; }
    }
    if (av.cape) av.cape.rotation.x = 0.12 + Math.sin(now * 2.6) * 0.08;
    if (av.pet) { av.pet.position.y = 0.3 + Math.abs(Math.sin(now * 5)) * 0.1; if (av.petTail) av.petTail.rotation.z = Math.sin(now * 9) * 0.6; }
  }
  function loop() {
    raf = requestAnimationFrame(loop);
    const now = (performance.now() - t0) / 1000;
    if (canvas.clientWidth !== lastW || canvas.clientHeight !== lastH) size();   // a tela inicial muda de tamanho
    if (hero) {
      if (drag === null) spin += 0.0045;                                          // a "câmera" dá a volta devagar
      if (av) av.g.rotation.y = spin * 2;
      idle(now);
    } else {
      if (drag === null) spin += 0.012;
      if (av) av.g.rotation.y = Math.sin(spin) * 0.9;
    }
    r.render(sc, cam);
  }
  return {
    set(lk) { if (av) sc.remove(av.g); av = buildAvatar(lk); sc.add(av.g); size(); },
    start() { size(); if (!raf) loop(); },
    stop() { cancelAnimationFrame(raf); raf = 0; },
    resize: size,
  };
}
