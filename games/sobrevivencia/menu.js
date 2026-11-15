// Bloco de modos das telas iniciais (Apagão Real e Aprendizado usam o mesmo):
//   ▶ Continuar jogo anterior  → só aparece se houver jogo salvo (Aulas e/ou Apagão Real)
//   🆕 Novo jogo               → 📚 Aprendizado (primeiro) e 🌑 Apagão Real
// Trocar de modo recarrega a página com ?modo=…&acao=cont|novo; consumeAction() lê a ação pedida.
import { h, t, THREE, part, toast } from "../../engine/ez.js";
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
export function modeMenu(store, on) {
  const real = store.getJSON("save", null), learn = store.getJSON("learn", null);
  const hasReal = !!(real && !real.ended), hasLearn = !!(learn && ((learn.done && learn.done.length) || learn.cur));
  const run = (mode, k, acao) => () => (here === mode ? on[k]() : go(mode, acao));
  const desc = (k) => h("p.ez-msg", { style: { margin: "-4px 0 4px", textAlign: "center" } }, t(k));
  const sec = (k) => h("h3", { style: { margin: "10px 0 2px", textAlign: "center" } }, t(k));
  const newLearn = () => { if (hasLearn && !confirm(t("confirmNewL"))) return; store.setJSON("learn", {}); run("learn", "newLearn", "novo")(); };
  const newReal = () => { if (hasReal && !confirm(t("confirmNewR"))) return; run("real", "newReal", "novo")(); };
  return [
    hasReal || hasLearn ? sec("secCont") : null,
    hasLearn ? h("button.ez-btn.wide", { onclick: run("learn", "contLearn", "cont") }, t("contLearn", { d: learn.done.length, n: LESSONS.length })) : null,
    hasReal ? h("button.ez-btn.wide", { onclick: run("real", "contReal", "cont") }, t("contReal", { d: t("day", { d: Math.floor((17 + real.T) / 24) }) })) : null,
    sec("secNew"),
    h("button.ez-btn.blue.wide", { onclick: newLearn }, t("m_learn")), desc("learnDesc"),
    h("button.ez-btn.blue.wide", { onclick: newReal }, t("m_real")), desc("realDesc"),
  ];
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
      i > 0 ? h("button.ez-btn.gray", { onclick: () => { i--; draw(); } }, backLabel) : null,
      h("button.ez-btn", { style: { flex: "1" }, onclick: () => { if (i < ps.length - 1) { i++; draw(); } else { scr.close(); onEnd(); } } }, i < ps.length - 1 ? nextLabel : endLabel)));
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
