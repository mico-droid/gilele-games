// Bloco de modos das telas iniciais (Apagão Real e Aprendizado usam o mesmo):
//   ▶ Continuar jogo anterior  → só aparece se houver jogo salvo (Aulas e/ou Apagão Real)
//   🆕 Novo jogo               → 📚 Aprendizado (primeiro) e 🌑 Apagão Real
// Trocar de modo recarrega a página com ?modo=…&acao=cont|novo; consumeAction() lê a ação pedida.
import { h, t, screen, THREE, part, toast } from "../../engine/ez.js";
import { LESSONS } from "./lessons.js";

const here = new URLSearchParams(location.search).get("modo") === "aprender" ? "learn" : "real";
const go = (mode, acao) => { location.href = (mode === "learn" ? "?modo=aprender&" : "?") + "acao=" + acao; };

/** Ação pedida pela URL ("cont" | "novo" | null). Só vale uma vez (limpa a URL). */
export function consumeAction() {
  const u = new URL(location.href), a = u.searchParams.get("acao");
  if (a) { u.searchParams.delete("acao"); history.replaceState(null, "", u.pathname + u.search); }
  return a;
}

/**
 * @param store  createStore("apagao")
 * @param on     { contReal, newReal, contLearn, newLearn } — ações quando o modo é o desta página
 */
export function modeMenu(store, on, { fromHome = false } = {}) {
  const real = store.getJSON("save", null), learn = store.getJSON("learn", null);
  const hasReal = !!(real && !real.ended), hasLearn = !!(learn && ((learn.done && learn.done.length) || learn.cur));
  const run = (mode, k, acao) => () => (here === mode ? on[k]() : go(mode, acao));
  const desc = (k) => h("p.ez-msg", { style: { margin: "0 0 4px", textAlign: "center" } }, t(k));
  const sec = (k) => h("h3", { style: { margin: "10px 0 2px", textAlign: "center" } }, t(k));
  const newLearn = () => { if (hasLearn && !confirm(t("confirmNewL"))) return; store.setJSON("learn", {}); run("learn", "newLearn", "novo")(); };
  const newReal = () => { if (hasReal && !confirm(t("confirmNewR"))) return; run("real", "newReal", "novo")(); };
  return [
    !fromHome && (hasReal || hasLearn) ? sec("secCont") : null,
    !fromHome && hasLearn ? h("button.ez-btn.wide", { onclick: run("learn", "contLearn", "cont") }, t("contLearn", { d: learn.done.length, n: LESSONS.length })) : null,
    !fromHome && hasReal ? h("button.ez-btn.wide", { onclick: run("real", "contReal", "cont") }, t("contReal", { d: t("day", { d: Math.floor((17 + real.T) / 24) }) })) : null,
    fromHome ? null : sec("secNew"),
    h("button.ez-btn.blue.wide", { onclick: newLearn }, t("m_learn")), desc("learnDesc"),
    h("button.ez-btn.blue.wide", { onclick: newReal }, t("m_real")), desc("realDesc"),
    sec("secTest"),
    h("button.ez-btn.gray.wide", { onclick: () => { location.href = "?modo=cidade"; } }, t("m_city")), desc("cityDescM"),
  ];
}

/**
 * Botões compactos da TELA INICIAL NOVA (25/11/2026): cabem na base da tela, sem rolagem.
 *   ▶ Continuar  (principal, só se houver jogo salvo)   ·   🆕 Novo jogo (abre a lista de modos)
 * A lista completa (Aprendizado, Apagão Real, Explorar a cidade) continua sendo a `modeMenu`,
 * agora dentro de uma caixa que abre no "Novo jogo".
 * @param reopen  como voltar para a tela inicial se o jogador fechar a caixa
 */
export function modeHome(store, on, { reopen, close } = {}) {
  const real = store.getJSON("save", null), learn = store.getJSON("learn", null);
  const hasReal = !!(real && !real.ended), hasLearn = !!(learn && ((learn.done && learn.done.length) || learn.cur));
  const out = [];
  if (hasReal || hasLearn) {
    const toReal = hasReal && (here === "real" || !hasLearn);
    const label = toReal ? t("contReal", { d: t("day", { d: Math.floor((17 + real.T) / 24) }) })
                         : t("contLearn", { d: learn ? learn.done.length : 0, n: LESSONS.length });
    out.push(h("button.ez-btn.ok.main", { onclick: () => {
      if (toReal) { here === "real" ? on.contReal() : go("real", "cont"); }
      else { here === "learn" ? on.contLearn() : go("learn", "cont"); }
    } }, label));
  }
  out.push(h("button.ez-btn" + (hasReal || hasLearn ? ".blue" : ".ok.main"), { onclick: () => {
    close && close();
    const scr = screen([h("h2", t("secNew")), ...modeMenu(store, on, { fromHome: true }),
      h("button.ez-btn.gray.wide", { style: { marginTop: "10px" }, "data-k": "back", onclick: () => { scr.close(); reopen && reopen(); } }, t("back"))],
      { dim: true, x: () => { scr.close(); reopen && reopen(); } });
  } }, t("newGame")));
  return out;
}

/** Escala de distância mostrada ao jogador: 1 unidade do mundo ≈ 1 passo do boneco ≈ 0,5 m. */
export const M_PER_UNIT = 0.5;

/** Divide um texto em partes curtas (uma frase por parte; frases muito curtas ficam com a seguinte). */
export function parts(text) {
  const raw = String(text).split(/(?<=[.!?…])\s+(?=[A-ZÀ-ÚÑ¿¡"“(]|\p{Extended_Pictographic})/u), out = [];
  for (const r of raw) { if (out.length && out[out.length - 1].length < 45) out[out.length - 1] += " " + r; else out.push(r); }
  return out;
}
/** Tela com o texto em partes: "Próximo ▶" até a última, depois o botão final; "◀ Voltar" relê a parte anterior. */
export function pagedScreen(h, screen, { title, text, nextLabel, endLabel, backLabel = "◀", onEnd }) {
  const ps = Array.isArray(text) ? text : parts(text); let i = 0;
  const body = h("div"), scr = screen([h("h2", title), body]);
  addX(h, scr, () => { scr.close(); onEnd(); });
  const draw = () => body.replaceChildren(h("p", { style: { fontSize: "18px", minHeight: "70px" } }, ps[i]), h("p.ez-msg", { style: { textAlign: "center" } }, `${i + 1}/${ps.length}`),
    h("div.ez-row", { style: { gap: "8px" } },
      i > 0 ? h("button.ez-btn.gray", { "data-k": "back", onclick: () => { i--; draw(); } }, backLabel) : null,
      h("button.ez-btn" + (i < ps.length - 1 ? "" : ".ok"), { "data-k": "next", style: { flex: "1" }, onclick: () => { if (i < ps.length - 1) { i++; draw(); } else { scr.close(); onEnd(); } } }, i < ps.length - 1 ? nextLabel : endLabel)));
  draw();
}

/** ✕ no canto superior direito de uma caixa: fecha sem fazer nada. */
export function addX(h, scr, onClose) {
  scr.card.style.position = "relative";
  scr.card.appendChild(h("button.sv-x", { "aria-label": "✕", onclick: (e) => { e.stopPropagation(); onClose(); } }, "✕"));
}
/** Confete rápido na tela (missão concluída). */
export function confetti(n = 46) {
  const box = document.createElement("div"); box.className = "sv-confetti";
  const cols = ["#f59e0b", "#22c55e", "#3b82f6", "#ef4444", "#a855f7", "#fde047", "#ec4899"];
  for (let i = 0; i < n; i++) {
    const d = document.createElement("i");
    d.style.cssText = `left:${50 + (Math.random() - 0.5) * 30}%;background:${cols[i % cols.length]};--dx:${(Math.random() - 0.5) * 70}vw;--dy:${40 + Math.random() * 45}vh;--r:${(Math.random() - 0.5) * 1400}deg;animation-delay:${Math.random() * 0.15}s;width:${7 + Math.random() * 7}px;height:${9 + Math.random() * 9}px`;
    box.appendChild(d);
  }
  document.body.appendChild(box); setTimeout(() => box.remove(), 2200);
}
/** Selo com a quantidade no botão da mochila; flash() pisca por 3 s. */
export function bagBadge(h, button) {
  const b = h("span.sv-badge", "0"); button.style.position = "relative"; button.appendChild(b);
  let tm = 0;
  return { set(n) { b.textContent = n; b.style.display = n ? "" : "none"; }, flash() { button.classList.add("sv-blink"); clearTimeout(tm); tm = setTimeout(() => button.classList.remove("sv-blink"), 3000); } };
}

/** Desenha a mochila nas costas do boneco (refaz sozinho quando o visual do boneco muda). Chamar de vez em quando. */
export function wearPack(ch, color = "#b45309") {
  const body = ch && ch.av && ch.av.body;
  if (!body || body.getObjectByName("pack")) return;
  const g = new THREE.Group(); g.name = "pack"; body.add(g);
  part(0.72, 0.82, 0.34, color, 0, 1.52, -0.43, g);            // corpo da mochila
  part(0.74, 0.2, 0.36, "#78350f", 0, 1.86, -0.43, g);          // tampa
  part(0.44, 0.3, 0.1, "#92400e", 0, 1.34, -0.63, g);           // bolso de trás
  part(0.5, 0.14, 0.3, "#3f6212", 0, 2.02, -0.43, g);           // rolo do saco de dormir
  [-0.3, 0.3].forEach((x) => { part(0.12, 0.86, 0.04, "#451a03", x, 1.55, 0.27, g, false); part(0.12, 0.05, 0.56, "#451a03", x, 1.98, 0, g, false); }); // alças
}

// ------------------------------------------------------------ sala de amigos × modos de jogo
// Cada modo tem a sua página; a sala acompanha o dono quando ele troca de modo (mesmo código).
const modeUrl = (mode) => (mode === "learn" ? "?modo=aprender&" : "?");
const hasSave = (store, mode) => { const v = store.getJSON(mode === "learn" ? "learn" : "save", null); return mode === "learn" ? !!(v && ((v.done && v.done.length) || v.cur)) : !!(v && !v.ended); };
const travel = (store, mode, code, extra) => { location.href = modeUrl(mode) + "sala=" + code + extra + "&acao=" + (hasSave(store, mode) ? "cont" : "novo"); };
/** Botões "Jogar Aprendizado / Jogar Apagão Real" para a tela de amigos (opção `actions` do openRoomPanel). */
export function roomActions(room, store, enterHere) {
  return ({ close }) => {
    const btn = (mode) => {
      const mine = mode === here, dis = !mine && !room.isHost;
      return h("button.ez-btn.wide" + (mine ? "" : ".blue"), { disabled: dis ? true : null, style: dis ? { opacity: 0.45 } : null, onclick: () => {
        if (dis) return;
        if (mine) { close(); enterHere(); return; }
        const code = room.code; room.send("goto", { m: mode, c: code });
        toast(t("mpMoving", { m: t(mode === "learn" ? "m_learn" : "m_real") }));
        setTimeout(() => travel(store, mode, code, "&host=1"), 500);
      } }, "▶ " + t("mpPlay", { m: t(mode === "learn" ? "m_learn" : "m_real") }) + (mine ? "" : " ↪"));
    };
    return [h("h3", { style: { margin: "12px 0 2px", textAlign: "center" } }, t("mpEnter")), h("div.ez-col", btn("learn"), btn("real")),
      h("p.ez-msg", { style: { textAlign: "center" } }, t(room.isHost ? "mpHostTip" : "mpGuestTip"))];
  };
}
/** No carregamento: entra na sala da URL (ou recria como dono, se veio de uma troca de modo) e segue o dono quando ele troca. */
export function bootRoom(room, store) {
  room.on("goto", (d) => {
    if (!d || (d.m !== "learn" && d.m !== "real") || d.m === here || room.isHost) return;
    const code = String(d.c || room.code || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4); if (code.length !== 4) return;
    toast(t("mpFollow", { m: t(d.m === "learn" ? "m_learn" : "m_real") }), 3500);
    setTimeout(() => travel(store, d.m, code, "&segue=1"), 3500);
  });
  const u = new URL(location.href), c = u.searchParams.get("sala"); if (!c) return false;
  const asHost = u.searchParams.get("host") === "1", follow = u.searchParams.get("segue") === "1";
  u.searchParams.delete("host"); u.searchParams.delete("segue"); history.replaceState(null, "", u.pathname + u.search);
  if (asHost) { room.create(c); return true; }
  if (follow) { let tries = 0; room.onStatus((k) => { if (k === "room") tries = 9; else if ((k === "notFound" || k === "fail") && tries < 4) { tries++; setTimeout(() => room.join(c), 2500); } }); }
  room.join(c); return true;
}

/** Placa com nome em cima de um lugar (quadro colorido, virado para a câmera). */
export function makeSign(scene, text, x, y, z, bg = "#334155", scale = 1) {
  const cv = document.createElement("canvas"); cv.width = 512; cv.height = 128; const c = cv.getContext("2d");
  let fs = 64; const F = () => `700 ${fs}px Fredoka, system-ui, sans-serif`; c.font = F();
  while (c.measureText(text).width > 450 && fs > 28) { fs -= 4; c.font = F(); }
  const w = Math.min(500, c.measureText(text).width + 56), x0 = (512 - w) / 2;
  c.fillStyle = bg; c.strokeStyle = "#ffffff"; c.lineWidth = 8;
  c.beginPath(); if (c.roundRect) c.roundRect(x0, 10, w, 108, 24); else c.rect(x0, 10, w, 108); c.fill(); c.stroke();
  c.fillStyle = "#ffffff"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(text, 256, 66);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sp.scale.set(9 * scale, 2.25 * scale, 1); sp.position.set(x, y, z); scene.add(sp); return sp;
}

// ------------------------------------------------------------ trilha sonora (os dois modos)
// Uma música só, em lá menor, sombria e com batida. O nível muda o arranjo e o andamento sem cortar a música:
// 0 = explorando · 1 = perto da missão (mais animada) · 2 = perigo (tensa e rápida).
let musicLevel = 0;
export function installMusic(Audio) {
  const BASS = [45, 41, 38, 40], CH = [[0, 3, 7], [0, 4, 7], [0, 3, 7], [0, 4, 8]];
  Audio.addSong("apagao", {
    get bpm() { return [104, 118, 132][musicLevel]; }, len: 64,
    play(s, tm, k) {
      const L = musicLevel, bar = Math.floor(s / 16), st = s % 16, r = BASS[bar], m = k.music, f = k.mtof;
      // batida
      if (st % (L ? 4 : 8) === 0) k.tone("sine", 140, tm, 0.18, 0.55, m, 40);
      if (L >= 1 && (st === 4 || st === 12)) k.noise(tm, 0.1, 0.2, m, 1800);
      if (st % 2 === 1 || (L === 2 && st % 2 === 0)) k.noise(tm, 0.025, L === 2 ? 0.07 : 0.05, m, 9000);
      // baixo pulsante (colcheias; semicolcheias no perigo)
      if (st % (L === 2 ? 1 : 2) === 0) k.tone("sawtooth", f(r + (st % 4 === 2 ? 12 : 0)), tm, 0.1, L ? 0.11 : 0.08, m);
      // fundo sombrio: quinta e trítono, longo
      if (st === 0) { k.tone("sine", f(r + 12), tm, 1.9, 0.07, m); k.tone("sine", f(r + 18), tm + 0.02, 1.9, bar === 3 ? 0.05 : 0.03, m); }
      // arpejo (missão perto)
      if (L >= 1 && st % 2 === 0) { const c = CH[bar]; k.tone("square", f(r + 24 + c[(st >> 1) % 3]), tm, 0.09, 0.045, m); }
      // sino de alerta / melodia tensa (perigo)
      if (L === 2) {
        if (st === 0 || st === 6 || st === 10) k.tone("triangle", f(r + 36 + (st === 6 ? 1 : 0)), tm, 0.22, 0.06, m);
        if (bar === 3 && st >= 12) k.tone("sine", 220 - (st - 12) * 30, tm, 0.12, 0.3, m, 70);
      } else if (st === 8 && (bar === 1 || bar === 3)) k.tone("triangle", f(r + 31), tm, 0.5, 0.04, m);
    },
  });
  Audio.setSong("apagao");
  let want = 0, hold = 0;
  return {
    /** Chamar todo quadro com o nível desejado (0, 1, 2); só troca depois de ~1 s firme (sem pisca-pisca). */
    update(dt, level) { if (level !== want) { want = level; hold = 0; } hold += dt; if (want !== musicLevel && (hold > (want > musicLevel ? 0.4 : 1.6))) musicLevel = want; },
  };
}
