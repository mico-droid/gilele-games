// Bloco de modos das telas iniciais (Apagão Real e Aprendizado usam o mesmo):
//   ▶ Continuar jogo anterior  → só aparece se houver jogo salvo (Aulas e/ou Apagão Real)
//   🆕 Novo jogo               → 📚 Aprendizado (primeiro) e 🌑 Apagão Real
// Trocar de modo recarrega a página com ?modo=…&acao=cont|novo; consumeAction() lê a ação pedida.
import { h, t } from "../../engine/ez.js";
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
