// UI helpers: DOM builder, toast, screens, settings, multiplayer panel, quick chat, avatar editor.
import { t, LANGS, LANG_NAMES, getLang, setLang, onLangChange } from "./i18n.js";
import { Audio } from "./audio.js";
import {
  KINDS, HAIRS, HAIRCOLS, PALETTE, SKINS, ACCS, FACES, KIND_SKIN, sanitizeLook, randomLook, saveLook, createAvatarPreview, openAccs,
} from "./avatar.js";
import { accOrder, isUnlocked } from "./unlocks.js";
import { canInstall, promptInstall, isIos, isStandalone, onInstallable } from "./pwa.js";
import { track } from "./analytics.js";

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
  const kk = attrs && attrs["data-k"];
  if (kk && KEYHINT[kk] && !COARSE) el.append(h("span.ez-kbd", KEYHINT[kk]));
  return el;
}
// Atalhos de teclado no PC: botões com data-k="next" | "back" | "ok" ganham a dica e respondem à tecla (ver screen()).
const COARSE = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
const KEYHINT = { next: "⏎", ok: "⏎", back: "←" };
export const $ = (id) => document.getElementById(id);

let toastEl = null, toastTimer = 0;
export function toast(msg, ms = 1800, big = false) {
  if (!toastEl) { toastEl = h("div.ez-toast"); document.body.appendChild(toastEl); }
  toastEl.textContent = msg; toastEl.classList.toggle("big", !!big); toastEl.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove("show"), ms);
}

/** Full-screen overlay with a card. Returns { el, card, close() }. */
/** x: true → ✕ no canto superior direito que fecha a tela; x: função → ✕ chama a função (ex.: cancelar). */
export function screen(content, { dim = false, onClose, x, keys = true, bare = false } = {}) {
  const card = h(bare ? "div.ez-bare" : "div.ez-card", content);
  const el = h("div.ez-screen" + (dim ? ".dim" : "") + (bare ? ".bare" : ""), card);
  document.body.appendChild(el);
  const api = { el, card, close() { document.removeEventListener("keydown", onKey, true); el.remove(); onClose && onClose(); } };
  function onKey(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const tag = e.target && e.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    const all = document.querySelectorAll(".ez-screen");
    if (all[all.length - 1] !== el) return;                       // só a tela de cima responde
    const hit = (k) => { const b = card.querySelector('[data-k="' + k + '"]:not([disabled])'); if (!b) return false; e.preventDefault(); b.click(); return true; };
    if (e.code === "Enter" || e.code === "NumpadEnter" || e.code === "Space" || e.code === "ArrowRight") hit("next") || hit("ok");
    else if (e.code === "ArrowLeft" || e.code === "Backspace") hit("back");
    else if (e.code === "Escape") { if (!hit("back") && x) { e.preventDefault(); typeof x === "function" ? x() : api.close(); } }
  }
  if (keys) document.addEventListener("keydown", onKey, true);
  if (x) { card.classList.add("has-x"); card.appendChild(h("button.ez-x", { "aria-label": "✕", onclick: () => (typeof x === "function" ? x() : api.close()) }, "✕")); }
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

/**
 * Chips dos acessórios: os já liberados funcionam normalmente, os trancados aparecem
 * translúcidos com 🔒 e, ao tocar, só explicam como se ganha (pedido do dono, 25/11/2026).
 */
export function accChips(cur, onPick) {
  const row = h("div.ez-row");
  accOrder().forEach((a) => {
    const open = isUnlocked(a);
    row.appendChild(h("button.ez-chip" + (a === cur ? ".sel" : "") + (open ? "" : ".locked"), {
      onclick: () => { if (open) { Audio.play("click"); onPick(a); } else { Audio.play("wrong"); toast("🔒 " + t("lockHint"), 3200); } },
    }, (open ? "" : "🔒 ") + t("a_" + a)));
  });
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
    // Aba do cabelo: bicho/ET/zumbi/carinha não usam cabelo, mas a aba NÃO pode ficar vazia
    // (o dono abria o editor com um boneco sorteado desses e não via opção nenhuma — 25/11/2026).
    // Agora ela sempre mostra a cor e, quando o tipo não tem cabelo, deixa trocar o tipo ali mesmo.
    if (tab === "hair") {
      const human = lk.g === "m" || lk.g === "f";
      body = human
        ? [h("h3", t("hair")), chips(HAIRS[lk.g === "f" ? "f" : "m"], lk.h, (x) => t("h_" + x), (x) => set({ h: x })), h("h3", t("hairColor")), swatches(HAIRCOLS, lk.hc, (x) => set({ hc: x }))]
        : [h("p.ez-msg", t("noHair")),
           chips(["m", "f"], null, (k) => t("k_" + k), (g) => {
             const c = lk.c.slice(); if (KIND_SKIN[lk.g]) { c[0] = SKINS[1]; c[2] = SKINS[1]; }
             const hs = HAIRS[g === "f" ? "f" : "m"]; set({ g, c, h: hs.includes(lk.h) && lk.h !== "none" ? lk.h : hs[0] });
           }),
           h("h3", t("hairColor")), swatches(HAIRCOLS, lk.hc, (x) => set({ hc: x }))];
    }
    if (tab === "colors") body = [
      h("h3", t("shirt")), swatches(PALETTE, lk.c[1], (x) => setC(1, x)),
      h("h3", t("pants")), swatches(PALETTE, lk.c[3], (x) => setC(3, x)),
    ];
    if (tab === "acc") body = [h("h3", t("acc")), accChips(lk.a, (x) => set({ a: x })), h("p.ez-msg", { style: { fontSize: "12px" } }, t("lockHint"))];
    if (tab === "face") body = [h("h3", t("face")), chips(FACES, lk.f, (x) => t("f_" + x), (x) => set({ f: x }))];
    opts.replaceChildren(...body.filter(Boolean));
  }
  const scr = screen([
    h("h2", "🧍 " + t("character")),
    h("div.ez-editor", cv, h("div.ez-col", h("div", h("h3", t("name")), name), tabRow, opts)),
    h("div.ez-row", { style: { marginTop: "14px", justifyContent: "space-between" } },
      h("button.ez-btn.warn.small", { onclick: () => { const n = lk.n; lk = randomLook(n, { accs: openAccs() }); redraw(); Audio.play("pop"); } }, "🎲 " + t("random")),
      h("div.ez-row",
        h("button.ez-btn.gray.small", { onclick: () => { pv.stop(); scr.close(); onCancel && onCancel(); } }, t("cancel")),
        h("button.ez-btn.small", { onclick: () => { lk.n = name.value; lk = sanitizeLook(lk); saveLook(lk); pv.stop(); scr.close(); Audio.play("ok"); onSave && onSave(lk); } }, "✔ " + t("save")))),
  ], { dim: true, x: () => { pv.stop(); scr.close(); onCancel && onCancel(); } });
  pv.start(); redraw();
  return scr;
}

// ------------------------------------------------------------------ settings
export function openSettings({ world, onClose } = {}) {
  const body = h("div.ez-col");
  let draw = function () {
    body.replaceChildren(...[
      h("h3", t("language")), chips(LANGS, getLang(), (l) => LANG_NAMES[l], (l) => { setLang(l); draw(); }),
      h("h3", t("music") + " / " + t("sfx")),
      h("div.ez-row",
        h("button.ez-chip" + (Audio.musicOn ? ".sel" : ""), { onclick: () => { Audio.init(); Audio.setMusic(!Audio.musicOn); draw(); } }, "🎵 " + t("music")),
        h("button.ez-chip" + (Audio.sfxOn ? ".sel" : ""), { onclick: () => { Audio.init(); Audio.setSfx(!Audio.sfxOn); draw(); } }, "🔊 " + t("sfx"))),
      world ? h("h3", t("quality")) : null,
      world ? chips(["auto", "low", "medium", "high"], world.quality, (q) => t("q_" + q), (q) => { world.setQuality(q); draw(); }) : null,
      world ? h("p", { style: { opacity: ".75", margin: "4px 0 0", fontSize: "12px" } }, t("q_note")) : null,
      installButton(),
    ].filter(Boolean));
  };
  const title = h("h2"), closeBtn = h("button.ez-btn.wide", { style: { marginTop: "16px" }, onclick: () => scr.close() });
  const draw0 = draw;
  draw = () => { title.textContent = "⚙️ " + t("settings"); closeBtn.textContent = t("close"); draw0(); };
  draw();
  const scr = screen([title, body, closeBtn], { dim: true, onClose, x: true });
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
 * Avisos de instalação no Android (abrir no Chrome, "Instalar assim mesmo" do Play Protect, Family Link).
 * Aparece em "Como instalar" de TODO jogo (vem por gameLinks). Fora do Android devolve null.
 */
export function installNotes() {
  if (!/android/i.test(navigator.userAgent)) return null;
  return h("div.ez-col", { style: { gap: "3px", marginTop: "4px" } },
    h("p", { style: { margin: "0", fontWeight: "700" } }, "⚠️ " + t("instNotesT")),
    h("p.ez-msg", { style: { margin: "0" } }, "• " + t("instN1")),
    h("p.ez-msg", { style: { margin: "0" } }, "• " + t("instN2")),
    h("p.ez-msg", { style: { margin: "0" } }, "• " + t("instN3")));
}

/**
 * Rodapé padrão da tela inicial de todo jogo: 🏠 Gilelê Games · 📲 Instalar · 📤 Compartilhar.
 * - Instalar some quando o app já está instalado; sem o pedido nativo do navegador, abre "Como instalar".
 * - Compartilhar usa o menu do celular (navigator.share) ou copia o link.
 * @param {string} gameName  nome do jogo no texto do compartilhamento
 * @param {string} portal    link do portal (padrão: raiz do monorepo, ../../)
 */
export const PORTAL_URL = "../../jogos.html"; // relativo: ainda não há domínio fixo

/**
 * O botão VOLTAR do celular (e do navegador) não pode jogar o jogador para fora sem avisar
 * (pedido do dono, 25/11/2026). O truque é deixar sempre uma "entrada falsa" no histórico: quando
 * o jogador aperta voltar, o navegador consome essa entrada, nós perguntamos e repomos a entrada.
 * Assim, por mais vezes que ele aperte, nunca sai sem confirmar.
 *   onBack()   → o que fazer quando apertar voltar e não houver pergunta aberta
 *   isAsking() → devolve a função que fecha a pergunta, se ela já estiver na tela
 */
let backGuard = false, fakeEntries = 0, leavingNow = false;
export function guardBack(onBack, isAsking) {
  if (backGuard) return; backGuard = true;
  const push = () => { try { history.pushState({ ezGuard: 1 }, ""); fakeEntries++; } catch (e) {} };
  push(); if (!fakeEntries) return;
  addEventListener("popstate", () => {
    if (leavingNow) return;                 // já estamos saindo: deixa o navegador seguir
    fakeEntries = Math.max(0, fakeEntries - 1);
    push();                                 // repõe a entrada falsa
    const shut = isAsking && isAsking();
    if (shut) shut();            // já estava perguntando: voltar fecha a pergunta
    else onBack();
  });
}
/**
 * Sair do jogo DE VERDADE (depois do "Quer mesmo sair? → Sim").
 * Antes isto era um `location.href = portal`, o que deixava a página do jogo e as entradas falsas
 * para trás no histórico: no portal, o botão voltar caía no jogo outra vez, já com a pergunta de
 * sair na tela, e dava um vai-e-vem sem fim (bug do dono, 25/11/2026). Agora o jogo DESCARTA as
 * suas entradas: se o jogador veio do portal, volta para ele; senão, troca a entrada atual.
 */
export function leaveToPortal(portal = PORTAL_URL) {
  if (leavingNow) return;
  leavingNow = true;
  const steps = fakeEntries + 1;                           // as entradas falsas + a página do jogo
  const ref = document.referrer || "";
  const cameFromPortal = !!ref && ref !== location.href && /jogos\.html(\?|#|$)/.test(ref);
  if (cameFromPortal && history.length > steps) {
    // se o voltar não sair em meio segundo (histórico cortado pelo navegador), navega na mão
    const fallback = setTimeout(() => location.replace(portal), 600);
    addEventListener("pagehide", () => clearTimeout(fallback), { once: true });
    try { history.go(-steps); return; } catch (e) { clearTimeout(fallback); }
  }
  location.replace(portal);
}

/**
 * Os quatro links/botões padrão, cada um por separado, para montar a tela inicial:
 *   { portal, install, share, privacy, settings }  (install já se redesenha sozinho)
 * `settings` só vem se `world` for passado.
 */
export function gameLinkParts(gameName, { portal = "../../jogos.html", small = true, world, onSettings } = {}) {
  const sz = small ? ".small" : "";
  const shareUrl = location.origin + location.pathname;
  const share = async () => {
    const text = t("shareText", { g: gameName });
    track("share", {});
    try { if (navigator.share) { await navigator.share({ title: gameName, text, url: shareUrl }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(text + " " + shareUrl); toast(t("linkCopied"), 2600); }
    catch { prompt(t("mpShare"), shareUrl); }
  };
  const howTo = () => {
    const scr = screen([h("h2", "📲 " + t("howInstall")), h("p", t("installHow")), installNotes(),
      h("button.ez-btn.ok.wide", { "data-k": "next", onclick: () => scr.close() }, t("close"))], { dim: true, x: true });
  };
  // "já instalado": aberto como app, ou marcado antes (o app instalado e o navegador dividem o mesmo armazenamento)
  const KEY = "ez:installed:" + location.pathname;
  const mark = () => { try { localStorage.setItem(KEY, "1"); } catch {} };
  if (isStandalone()) mark();
  addEventListener("appinstalled", () => { mark(); track("app_installed", {}); });
  const installed = () => { try { return isStandalone() || localStorage.getItem(KEY) === "1"; } catch { return isStandalone(); } };
  // o navegador só oferece instalar quando o app NÃO está instalado: se oferecer, a marca antiga é falsa (app removido)
  const instSlot = h("span.ez-slot");
  const drawInstall = () => {
    if (canInstall()) { try { localStorage.removeItem(KEY); } catch {} }
    instSlot.replaceChildren(...[installed() && !canInstall() ? null : h("button.ez-btn.blue" + sz, {
      onclick: async () => { track("install_click", {}); if (canInstall()) { if (await promptInstall()) { mark(); drawInstall(); } else howTo(); } else howTo(); },
    }, "📲 " + t("install"))].filter(Boolean));
  };
  drawInstall(); onInstallable(drawInstall);
  if (navigator.getInstalledRelatedApps) navigator.getInstalledRelatedApps().then((a) => { if (a && a.length) { mark(); drawInstall(); } }).catch(() => {});
  // Sair do jogo pergunta antes: o 🏠 estava levando embora com um toque só (pedido do dono, 25/11/2026)
  let askOpen = null;
  const leave = () => {
    if (askOpen) return;
    const shut = () => { askOpen = null; scr.close(); };
    const scr = screen([
      h("h2", "🏠 " + t("leaveTitle")),
      h("p", t("leaveAsk")),
      h("button.ez-btn.ok.wide", { "data-k": "next", onclick: () => { shut(); leaveToPortal(portal); } }, t("leaveYes")),
      h("button.ez-btn.gray.wide", { style: { marginTop: "8px" }, "data-k": "back", onclick: shut }, t("leaveNo")),
    ], { dim: true, x: shut });
    askOpen = shut;
  };
  guardBack(leave, () => askOpen);
  return {
    portal: h("button.ez-btn.gray" + sz, { onclick: leave }, "🏠 " + t("portal")),
    privacy: h("a.ez-btn.gray" + sz, { href: portal.replace(/jogos\.html$/, "") + "privacidade.html", style: { textDecoration: "none" } }, "🔒 " + t("privacy")),
    install: instSlot,
    share: h("button.ez-btn.blue" + sz, { onclick: share }, "📤 " + t("share")),
    settings: h("button.ez-btn.gray" + sz, { title: t("settings"), "aria-label": t("settings"), onclick: () => (onSettings ? onSettings() : openSettings({ world })) }, "⚙️"),
  };
}

/**
 * Rodapé padrão da tela inicial de todo jogo: 🏠 Gilelê Games · 📲 Instalar · 📤 Compartilhar · 🔒 Privacidade.
 * (Telas novas usam homeScreen(), que já monta tudo; isto fica para as telas antigas.)
 * @param {string} gameName  nome do jogo no texto do compartilhamento
 * @param {string} portal    link do portal (padrão: raiz do monorepo)
 */
export function gameLinks(gameName, { portal = "../../jogos.html" } = {}) {
  const p = gameLinkParts(gameName, { portal });
  return h("div.ez-row.ez-links", { style: { justifyContent: "center", flexWrap: "wrap", marginTop: "10px" } }, p.portal, p.install, p.share, p.privacy);
}

/**
 * CASCA PADRÃO DA TELA INICIAL (pedido do dono, 25/11/2026) — igual em todos os jogos 3D:
 *   topo:    idiomas · 📤 Compartilhar · 📲 Instalar · ⚙️ (música, gráficos…)
 *   título:  ícone + nome do jogo + subtítulo
 *   boneco:  desenho do personagem, o nome dele e ✏️ Editar ao lado (o editor NÃO abre sozinho)
 *   meio:    os botões do jogo (continuar, novo jogo…) que vêm em `body`
 *   embaixo: 👥 Multijogador · 🏠 Gilelê Games · 🔒 Privacidade
 *
 * @param o.icon/title/subtitle  cabeçalho
 * @param o.look                 visual do boneco a desenhar (me.ch.look)
 * @param o.onLook(lk)           chamado ao salvar o editor (me.setLook)
 * @param o.body                 nós com os botões do jogo (array)
 * @param o.room                 sala do multijogador → botão 👥 (ou passe o.onRoom)
 * @param o.reopen()             como voltar para esta tela depois de um submenu
 * @param o.note                 texto pequeno no fim (ajuda do teclado, versão…)
 * @returns a tela (screen) — .close() já para a animação do boneco
 */
/**
 * TELA INICIAL DE TODOS OS JOGOS 3D (refeita em 25/11/2026, no estilo Fall Guys / Rocket League).
 * Não tem painel: o cenário 3D do próprio jogo fica aparecendo atrás, o boneco fica no meio dando
 * pulinhos enquanto a "câmera" dá a volta nele, o título flutua em cima, os botões ficam na base e
 * os utilitários nos cantos. Sem rolagem.
 *
 *   topo:    idiomas (esquerda) · 📲 Instalar · ⚙️ (direita)
 *   meio:    título · subtítulo · boneco · nome do personagem com ✏️ ao lado
 *   base:    os botões do jogo (`buttons`) + 👥 Multijogador
 *   rodapé:  📤 Compartilhar · 🏠 Gilelê Games · 🔒 Privacidade
 *
 * @param o.buttons  botões do jogo (array). O principal pode vir com a classe .main (fica maior).
 * @param o.look/onLook  visual do boneco e o que fazer quando o editor salvar
 * @param o.reopen   como voltar para esta tela depois de um submenu
 */
export function homeScreen(o = {}) {
  const { icon = "", title = "", subtitle = "", look, onLook, buttons, body = [], extra, room, onRoom, roomActions, reopen, note, portal = "../../jogos.html", world } = o;
  const btns = (buttons || body).filter(Boolean);
  const cv = h("canvas.ez-hero");
  const pv = createAvatarPreview(cv, { hero: true });
  // Câmera de vitrine: enquanto a tela inicial está aberta, a câmera do jogo dá a volta devagar
  // num ponto bonito do cenário (o cenário é o fundo da tela). Nenhum jogo mexe na câmera com o
  // menu aberto, então dá para assumir o controle e devolver tudo no final.
  let stopScenic = null;
  if (world && world.camera && o.scenic !== false) {
    const cam = world.camera, at = o.scenicAt || { x: cam.position.x, y: cam.position.y - 2, z: cam.position.z - 12 };
    const keep = { x: cam.position.x, y: cam.position.y, z: cam.position.z, q: cam.quaternion.clone() };
    const R = o.scenicDist || 30, HI = o.scenicUp || 21;
    let ang = Math.random() * Math.PI * 2, alive = true;
    const off = world.onUpdate((dt) => {
      if (!alive) return;
      ang += (o.scenicSpeed || 0.055) * Math.min(dt, 0.05);
      cam.position.set(at.x + Math.cos(ang) * R, (at.y || 0) + HI, at.z + Math.sin(ang) * R);
      cam.lookAt(at.x, (at.y || 0) + 2, at.z);   // vista de cima, como uma maquete: nunca entra dentro de parede
    });
    stopScenic = () => {
      alive = false; if (off) off();
      cam.position.set(keep.x, keep.y, keep.z); cam.quaternion.copy(keep.q);
    };
  }
  const lk = sanitizeLook(look || {});
  pv.set(lk); pv.start();
  let scr = null;
  const back = () => { if (reopen) reopen(); };
  const close = () => { pv.stop(); if (stopScenic) stopScenic(); scr.close(); };
  const parts = gameLinkParts(title, { portal, world, onSettings: () => { close(); openSettings({ world, onClose: back }); } });
  const langRow = h("div.ez-row.ez-langs");
  LANGS.forEach((l) => langRow.appendChild(h("button.ez-chip" + (l === getLang() ? ".sel" : ""), { onclick: () => { setLang(l); close(); back(); } }, l.toUpperCase())));
  const charName = (lk.n || "").trim() || t("namePh");
  const editChar = () => { close(); openAvatarEditor(lk, (nw) => { onLook && onLook(nw); back(); }, { onCancel: back }); };
  if (room || onRoom) {
    btns.push(h("button.ez-btn.blue", { onclick: () => {
      close();
      if (onRoom) { onRoom(); return; }
      openRoomPanel(room, { onClose: back, actions: roomActions });
    } }, "👥 " + t("mp")));
  }
  scr = screen([
    h("div.ez-home-top",
      langRow,
      h("div.ez-row.ez-home-tools", parts.install, parts.settings)),
    h("div.ez-home-mid",
      h("h1.ez-home-title", (icon ? icon + " " : "") + title),
      subtitle ? h("p.ez-home-sub", subtitle) : null,
      cv,
      h("div.ez-home-name",
        h("b", charName),
        h("button.ez-editpill", { title: t("editChar"), "aria-label": t("editChar"), onclick: editChar }, "✏️"))),
    extra ? h("div.ez-home-extra", extra) : null,
    h("div.ez-home-base", ...btns),
    h("div.ez-home-foot", parts.share, parts.portal, parts.privacy),
    note ? h("p.ez-home-note", note) : null,
  ].filter(Boolean), { bare: true });
  const base = scr.close;
  scr.close = () => { pv.stop(); if (stopScenic) stopScenic(); base(); };
  return scr;
}

// ------------------------------------------------------------------ multiplayer panel
/** actions(api) → nós extras mostrados quando já há sala (ex.: botões "Jogar"); api.close() fecha sem chamar onClose. */
export function openRoomPanel(room, { onClose, actions } = {}) {
  let scr = null, silent = false;
  const msg = h("div.ez-msg");
  const code = h("input.ez-input.ez-code", { maxlength: 4, placeholder: t("mpCodePh") });
  const body = h("div.ez-col");
  // lista de salas públicas: a busca testa as vagas fixas uma a uma (ver PUBLIC_SLOTS em net.js)
  const pubBox = h("div.ez-col", { style: { gap: "6px" } });
  let searching = false;
  function showPub(found, pct) {
    pubBox.replaceChildren(...[
      h("p.ez-msg", { style: { margin: "6px 0 0" } }, searching ? t("mpPubSearching", { p: pct || 0 }) : (found.length ? t("mpPubFound", { n: found.length }) : t("mpPubNone"))),
      ...found.map((c) => h("button.ez-btn.ok.wide", { onclick: () => room.join(c) }, "▶ " + t("mpPubRoom", { code: c }))),
    ]);
  }
  async function searchPublic() {
    if (searching) return;
    searching = true; showPub([], 0);
    try { const found = await room.listPublic((f, p) => showPub(f, p)); searching = false; showPub(found, 100); }
    catch (e) { searching = false; showPub([], 100); }
  }
  function draw() {
    if (room.connected) {
      const url = room.shareUrl();
      body.replaceChildren(...[
        h("p", h("b", t("mpRoom", { code: room.code, n: room.count, max: room.max }))),
        room.isPublic ? h("p.ez-msg", "🌎 " + t("mpPubMine")) : null,
        h("p", t("mpShare")), h("div.ez-link", url),
        h("div.ez-row",
          h("button.ez-btn.blue.small", { onclick: async () => { try { if (navigator.share) await navigator.share({ url }); else { await navigator.clipboard.writeText(url); toast(t("copied")); } } catch (e) {} } }, "🔗 " + t("copy")),
          h("button.ez-btn.gray.small", { onclick: () => room.leave() }, t("mpLeave"))),
      ].filter(Boolean));
      if (actions) (actions({ close: () => { silent = true; scr.close(); } }) || []).forEach((n) => n && body.appendChild(n));
    } else {
      body.replaceChildren(...[
        h("button.ez-btn.wide", { onclick: () => room.create() }, "➕ " + t("mpCreate")),
        room.createPublic ? h("button.ez-btn.pub.wide", { style: { marginTop: "8px" }, onclick: () => room.createPublic() }, "🌎 " + t("mpPubCreate")) : null,
        room.createPublic ? h("p.ez-msg", { style: { margin: "2px 0 6px" } }, t("mpPubNote")) : null,
        h("div.ez-row", { style: { justifyContent: "center", marginTop: "8px" } }, code, h("button.ez-btn.blue", { onclick: () => room.join(code.value) }, t("mpJoin"))),
        room.listPublic ? h("button.ez-btn.blue.wide", { style: { marginTop: "10px" }, onclick: () => searchPublic() }, "🔎 " + t("mpPubList")) : null,
        pubBox,
      ].filter(Boolean));
    }
    body.appendChild(msg);
  }
  const L = (k, i) => {
    const map = { connecting: t("mpConnecting"), fail: t("mpFail"), full: t("mpFull", { max: room.max }), notFound: t("mpNotFound"), hostLeft: t("mpHostLeft"), left: t("mpLeft"), pubFull: t("mpPubFull") };
    msg.textContent = map[k] || ""; draw();
  };
  const unsub = room.onStatus(L);
  draw();
  scr = screen([h("h2", "👥 " + t("mp")), body, h("button.ez-btn.gray.wide", { style: { marginTop: "14px" }, onclick: () => scr.close() }, t("close"))], { dim: true, x: true, onClose: () => { unsub(); if (!silent && onClose) onClose(); } });
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
  el.appendChild(h("button.ez-chat-x", { "aria-label": "✕", onclick: () => el.remove() }, "✕"));
  document.body.appendChild(el);
  const off = (e) => { if (!el.contains(e.target)) { el.remove(); removeEventListener("pointerdown", off, true); } };
  setTimeout(() => addEventListener("pointerdown", off, true), 0);
  return el;
}
export const chatText = (i) => t(CHAT_KEYS[i] || "c0");
