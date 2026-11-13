// UI helpers: DOM builder, toast, screens, settings, multiplayer panel, quick chat, avatar editor.
import { t, LANGS, LANG_NAMES, getLang, setLang, onLangChange } from "./i18n.js";
import { Audio } from "./audio.js";
import {
  KINDS, HAIRS, HAIRCOLS, PALETTE, SKINS, ACCS, FACES, KIND_SKIN, sanitizeLook, randomLook, saveLook, createAvatarPreview,
} from "./avatar.js";
import { canInstall, promptInstall, isIos, isStandalone, onInstallable } from "./pwa.js";

/** h("div.cls#id", {attrs, onclick}, ...children) */
export function h(sel, attrs, ...kids) {
  const m = sel.match(/^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i);
  const el = document.createElement(m[1] || "div");
  (m[2].match(/[.#][\w-]+/g) || []).forEach((p) => (p[0] === "." ? el.classList.add(p.slice(1)) : (el.id = p.slice(1))));
  if (attrs && (typeof attrs !== "object" || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
  for (const k in attrs || {}) {
    const v = attrs[k];
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k === "text") el.textContent = v;
    else if (k === "html") el.innerHTML = v;
    else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}
export const $ = (id) => document.getElementById(id);

let toastEl = null, toastTimer = 0;
export function toast(msg, ms = 1800, big = false) {
  if (!toastEl) { toastEl = h("div.ez-toast"); document.body.appendChild(toastEl); }
  toastEl.textContent = msg; toastEl.classList.toggle("big", !!big); toastEl.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove("show"), ms);
}

/** Full-screen overlay with a card. Returns { el, card, close() }. */
export function screen(content, { dim = false, onClose } = {}) {
  const card = h("div.ez-card", content);
  const el = h("div.ez-screen" + (dim ? ".dim" : ""), card);
  document.body.appendChild(el);
  const api = { el, card, close() { el.remove(); onClose && onClose(); } };
  return api;
}
export function chips(values, cur, label, onPick) {
  const row = h("div.ez-row");
  values.forEach((v) => row.appendChild(h("button.ez-chip" + (v === cur ? ".sel" : ""), { onclick: () => { Audio.play("click"); onPick(v); } }, label(v))));
  return row;
}
export function swatches(cols, cur, onPick) {
  const row = h("div.ez-row");
  cols.forEach((c) => row.appendChild(h("button.ez-sw" + (c === cur ? ".sel" : ""), { style: { background: c }, "aria-label": c, onclick: () => { Audio.play("click"); onPick(c); } })));
  return row;
}

// ------------------------------------------------------------------ avatar editor
/** openAvatarEditor(look, onSave(look)) — tabs for type, hair, colors, accessories, face, name. */
export function openAvatarEditor(look, onSave, { onCancel } = {}) {
  let lk = sanitizeLook(look);
  const cv = h("canvas");
  const pv = createAvatarPreview(cv);
  const name = h("input.ez-input", { maxlength: 14, value: lk.n, placeholder: t("namePh"), oninput: (e) => { lk.n = e.target.value; } });
  const opts = h("div.opts");
  const tabs = ["kind", "hair", "colors", "acc", "face"];
  let tab = "kind";
  const tabRow = h("div.ez-tabs");
  function redraw() {
    pv.set(lk);
    tabRow.replaceChildren(...tabs.map((k) => h("button.ez-chip" + (k === tab ? ".sel" : ""), { onclick: () => { tab = k; redraw(); } }, t("tab_" + k))));
    const set = (patch) => { Object.assign(lk, patch); lk = sanitizeLook(lk); redraw(); };
    const setC = (i, col) => { const c = lk.c.slice(); c[i] = col; set({ c }); };
    let body = [];
    if (tab === "kind") body = [
      h("h3", t("kind")), chips(KINDS, lk.g, (k) => t("k_" + k), (g) => {
        const c = lk.c.slice(); if (KIND_SKIN[g]) { c[0] = KIND_SKIN[g]; if (c[2] === lk.c[0]) c[2] = c[0]; }
        else if (KIND_SKIN[lk.g]) { c[0] = SKINS[1]; c[2] = SKINS[1]; }
        const hs = HAIRS[g === "f" ? "f" : "m"]; set({ g, c, h: hs.includes(lk.h) ? lk.h : hs[0] });
      }),
      h("h3", t("skin")), swatches(SKINS.concat(Object.values(KIND_SKIN)), lk.c[0], (col) => { const c = lk.c.slice(); if (c[2] === c[0]) c[2] = col; c[0] = col; set({ c }); }),
    ];
    if (tab === "hair") body = ["m", "f"].includes(lk.g) || ["horse"].includes(lk.g)
      ? [h("h3", t("hair")), lk.g === "horse" ? null : chips(HAIRS[lk.g === "f" ? "f" : "m"], lk.h, (x) => t("h_" + x), (x) => set({ h: x })), h("h3", t("hairColor")), swatches(HAIRCOLS, lk.hc, (x) => set({ hc: x }))]
      : [h("p", "—")];
    if (tab === "colors") body = [
      h("h3", t("shirt")), swatches(PALETTE, lk.c[1], (x) => setC(1, x)),
      h("h3", t("sleeves")), swatches([lk.c[0]].concat(PALETTE), lk.c[2], (x) => setC(2, x)),
      h("h3", t("pants")), swatches(PALETTE, lk.c[3], (x) => setC(3, x)),
    ];
    if (tab === "acc") body = [h("h3", t("acc")), chips(ACCS, lk.a, (x) => t("a_" + x), (x) => set({ a: x }))];
    if (tab === "face") body = [h("h3", t("face")), chips(FACES, lk.f, (x) => t("f_" + x), (x) => set({ f: x }))];
    opts.replaceChildren(...body.filter(Boolean));
  }
  const scr = screen([
    h("h2", "🧍 " + t("character")),
    h("div.ez-editor", cv, h("div.ez-col", h("div", h("h3", t("name")), name), tabRow, opts)),
    h("div.ez-row", { style: { marginTop: "14px", justifyContent: "space-between" } },
      h("button.ez-btn.warn.small", { onclick: () => { const n = lk.n; lk = randomLook(n); redraw(); Audio.play("pop"); } }, "🎲 " + t("random")),
      h("div.ez-row",
        h("button.ez-btn.gray.small", { onclick: () => { pv.stop(); scr.close(); onCancel && onCancel(); } }, t("cancel")),
        h("button.ez-btn.small", { onclick: () => { lk.n = name.value; lk = sanitizeLook(lk); saveLook(lk); pv.stop(); scr.close(); Audio.play("ok"); onSave && onSave(lk); } }, "✔ " + t("save")))),
  ], { dim: true });
  pv.start(); redraw();
  return scr;
}

// ------------------------------------------------------------------ settings
export function openSettings({ world, onClose } = {}) {
  const body = h("div.ez-col");
  let draw = function () {
    body.replaceChildren(
      h("h3", t("language")), chips(LANGS, getLang(), (l) => LANG_NAMES[l], (l) => { setLang(l); draw(); }),
      h("h3", t("music") + " / " + t("sfx")),
      h("div.ez-row",
        h("button.ez-chip" + (Audio.musicOn ? ".sel" : ""), { onclick: () => { Audio.init(); Audio.setMusic(!Audio.musicOn); draw(); } }, "🎵 " + t("music")),
        h("button.ez-chip" + (Audio.sfxOn ? ".sel" : ""), { onclick: () => { Audio.init(); Audio.setSfx(!Audio.sfxOn); draw(); } }, "🔊 " + t("sfx"))),
      world ? h("h3", t("quality")) : null,
      world ? chips(["auto", "low", "high"], world.quality, (q) => t("q_" + q), (q) => { world.setQuality(q); draw(); }) : null,
      installButton(),
    );
  };
  const title = h("h2"), closeBtn = h("button.ez-btn.wide", { style: { marginTop: "16px" }, onclick: () => scr.close() });
  const draw0 = draw;
  draw = () => { title.textContent = "⚙️ " + t("settings"); closeBtn.textContent = t("close"); draw0(); };
  draw();
  const scr = screen([title, body, closeBtn], { dim: true, onClose });
  return scr;
}
/** "Install app" button (PWA) — hidden when already installed or unsupported. */
export function installButton() {
  if (isStandalone()) return null;
  if (canInstall()) return h("button.ez-btn.blue.wide", { style: { marginTop: "12px" }, onclick: () => promptInstall() }, "📲 " + t("install"));
  if (isIos()) return h("p.ez-msg", "📲 " + t("installIos"));
  return null;
}

/**
 * Rodapé padrão da tela inicial de todo jogo: 🏠 gi-lele games · 📲 Instalar · 📤 Compartilhar.
 * - Instalar some quando o app já está instalado; sem o pedido nativo do navegador, abre "Como instalar".
 * - Compartilhar usa o menu do celular (navigator.share) ou copia o link.
 * @param {string} gameName  nome do jogo no texto do compartilhamento
 * @param {string} portal    link do portal (padrão: raiz do monorepo, ../../)
 */
export const PORTAL_URL = "https://mico-droid.github.io/gilele-games/";
export function gameLinks(gameName, { portal = "../../" } = {}) {
  const row = h("div.ez-row.ez-links", { style: { justifyContent: "center", flexWrap: "wrap", marginTop: "10px" } });
  const shareUrl = location.origin + location.pathname;
  const share = async () => {
    const text = t("shareText", { g: gameName });
    try { if (navigator.share) { await navigator.share({ title: gameName, text, url: shareUrl }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(text + " " + shareUrl); toast(t("linkCopied"), 2600); }
    catch { prompt(t("mpShare"), shareUrl); }
  };
  const howTo = () => {
    const scr = screen([h("h2", "📲 " + t("howInstall")), h("p", t("installHow")), h("button.ez-btn.wide", { onclick: () => scr.close() }, t("close"))], { dim: true });
  };
  // "já instalado": aberto como app, ou marcado antes (o app instalado e o navegador dividem o mesmo armazenamento)
  const KEY = "ez:installed:" + location.pathname;
  const mark = () => { try { localStorage.setItem(KEY, "1"); } catch {} };
  if (isStandalone()) mark();
  addEventListener("appinstalled", mark);
  const installed = () => { try { return isStandalone() || localStorage.getItem(KEY) === "1"; } catch { return isStandalone(); } };
  const draw = () => {
    // o navegador só oferece instalar quando o app NÃO está instalado: se oferecer, a marca antiga é falsa (app removido)
    if (canInstall()) { try { localStorage.removeItem(KEY); } catch {} }
    row.replaceChildren(...[
      h("a.ez-btn.gray.small", { href: portal, style: { textDecoration: "none" } }, "🏠 " + t("portal")),
      installed() && !canInstall() ? null : h("button.ez-btn.blue.small", { onclick: async () => { if (canInstall()) { if (await promptInstall()) { mark(); draw(); } } else howTo(); } }, "📲 " + t("install")),
      h("button.ez-btn.blue.small", { onclick: share }, "📤 " + t("share")),
    ].filter(Boolean));
  };
  draw(); onInstallable(draw);
  // Chrome/Android: pergunta ao sistema se este app já está instalado
  if (navigator.getInstalledRelatedApps) navigator.getInstalledRelatedApps().then((a) => { if (a && a.length) { mark(); draw(); } }).catch(() => {});
  return row;
}

// ------------------------------------------------------------------ multiplayer panel
export function openRoomPanel(room, { onClose } = {}) {
  const msg = h("div.ez-msg");
  const code = h("input.ez-input.ez-code", { maxlength: 4, placeholder: t("mpCodePh") });
  const body = h("div.ez-col");
  function draw() {
    if (room.connected) {
      const url = room.shareUrl();
      body.replaceChildren(
        h("p", h("b", t("mpRoom", { code: room.code, n: room.count, max: room.max }))),
        h("p", t("mpShare")), h("div.ez-link", url),
        h("div.ez-row",
          h("button.ez-btn.blue.small", { onclick: async () => { try { if (navigator.share) await navigator.share({ url }); else { await navigator.clipboard.writeText(url); toast(t("copied")); } } catch (e) {} } }, "🔗 " + t("copy")),
          h("button.ez-btn.gray.small", { onclick: () => room.leave() }, t("mpLeave"))),
      );
    } else {
      body.replaceChildren(
        h("button.ez-btn.wide", { onclick: () => room.create() }, "➕ " + t("mpCreate")),
        h("div.ez-row", { style: { justifyContent: "center", marginTop: "8px" } }, code, h("button.ez-btn.blue", { onclick: () => room.join(code.value) }, t("mpJoin"))),
      );
    }
    body.appendChild(msg);
  }
  const L = (k, i) => {
    const map = { connecting: t("mpConnecting"), fail: t("mpFail"), full: t("mpFull", { max: room.max }), notFound: t("mpNotFound"), hostLeft: t("mpHostLeft"), left: t("mpLeft") };
    msg.textContent = map[k] || ""; draw();
  };
  const unsub = room.onStatus(L);
  draw();
  const scr = screen([h("h2", "👥 " + t("mp")), body, h("button.ez-btn.gray.wide", { style: { marginTop: "14px" }, onclick: () => scr.close() }, t("close"))], { dim: true, onClose: () => { unsub(); onClose && onClose(); } });
  return scr;
}
/** Status pill for the HUD that follows the room state. */
export function roomPill(room) {
  const el = h("div.ez-pill", h("span.dot"), h("span", t("offline")));
  const upd = () => { el.classList.toggle("on", room.connected); el.lastChild.textContent = room.connected ? t("mpRoom", { code: room.code, n: room.count, max: room.max }) : t("offline"); };
  room.onStatus(upd); onLangChange(upd); upd();
  return el;
}

// ------------------------------------------------------------------ quick chat (preset phrases only — safe for kids)
export const CHAT_KEYS = ["c0", "c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9"];
export function openQuickChat(onPick) {
  const el = h("div.ez-chat", CHAT_KEYS.map((k, i) => h("button", { onclick: () => { el.remove(); onPick(i); } }, t(k))));
  document.body.appendChild(el);
  const off = (e) => { if (!el.contains(e.target)) { el.remove(); removeEventListener("pointerdown", off, true); } };
  setTimeout(() => addEventListener("pointerdown", off, true), 0);
  return el;
}
export const chatText = (i) => t(CHAT_KEYS[i] || "c0");
