// Comemoração (pedido do dono, 25/11/2026): a festa da vitória final dura ~10x mais que antes
// e tem música própria (trilha "victory"); as vitórias parciais (bandeira, missão, aula) duram 3x mais.
// Confete + fogos + estrelas + sons, com o CSS injetado aqui (os HTML avulsos têm uma cópia disto).
import { Audio } from "./audio.js";
import { addWin } from "./unlocks.js";
import { t } from "./i18n.js";
import { toast } from "./ui.js";   // ui.js não importa party.js — sem ciclo

const SMALL_MS = 6600;     // vitória parcial: 2,2 s (antigo) x 3
const BIG_MS = 22000;      // vitória final: 2,2 s x 10
const COLS = ["#f59e0b", "#22c55e", "#3b82f6", "#ef4444", "#a855f7", "#fde047", "#ec4899", "#06b6d4"];
let styled = false;

function css() {
  if (styled) return; styled = true;
  const st = document.createElement("style");
  st.textContent = `
.ez-party{position:fixed;inset:0;pointer-events:none;z-index:60;overflow:hidden}
.ez-party i{position:absolute;top:-6vh;border-radius:2px;animation:ezFall linear forwards}
@keyframes ezFall{to{transform:translate(var(--dx),var(--dy)) rotate(var(--r));opacity:.15}}
.ez-party b{position:absolute;width:10px;height:10px;border-radius:50%;animation:ezBoom .9s ease-out forwards}
@keyframes ezBoom{0%{transform:translate(0,0) scale(.5);opacity:1}100%{transform:translate(var(--bx),var(--by)) scale(1.1);opacity:0}}
.ez-party s{position:absolute;font-size:28px;text-decoration:none;animation:ezRise 1.6s ease-out forwards}
@keyframes ezRise{0%{transform:translateY(0) scale(.6);opacity:0}25%{opacity:1}100%{transform:translateY(-26vh) scale(1.25);opacity:0}}
@media (prefers-reduced-motion:reduce){.ez-party{display:none}}`;
  document.head.appendChild(st);
}
const box = () => { css(); const b = document.createElement("div"); b.className = "ez-party"; document.body.appendChild(b); return b; };

/** Uma chuva de confete (uma "onda"). */
function wave(b, n = 46) {
  for (let i = 0; i < n; i++) {
    const d = document.createElement("i");
    d.style.cssText = `left:${Math.random() * 100}%;background:${COLS[i % COLS.length]};--dx:${(Math.random() - 0.5) * 60}vw;--dy:${80 + Math.random() * 40}vh;--r:${(Math.random() - 0.5) * 1600}deg;animation-duration:${2 + Math.random() * 1.6}s;animation-delay:${Math.random() * 0.4}s;width:${7 + Math.random() * 8}px;height:${9 + Math.random() * 10}px`;
    b.appendChild(d);
    setTimeout(() => d.remove(), 4200);
  }
}
/** Um fogo de artifício estourando num ponto da tela. */
function boom(b) {
  const x = 12 + Math.random() * 76, y = 14 + Math.random() * 42;
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2, r = 12 + Math.random() * 14, p = document.createElement("b");
    p.style.cssText = `left:${x}%;top:${y}%;background:${COLS[(i + Math.floor(x)) % COLS.length]};--bx:${Math.cos(a) * r}vmin;--by:${Math.sin(a) * r}vmin`;
    b.appendChild(p); setTimeout(() => p.remove(), 1100);
  }
  Audio.play("firework");
}
/** Emoji subindo (gatilho de felicidade). */
function emoji(b, list) {
  const e = document.createElement("s");
  e.textContent = list[Math.floor(Math.random() * list.length)];
  e.style.cssText = `left:${10 + Math.random() * 80}%;top:${55 + Math.random() * 25}%`;
  b.appendChild(e); setTimeout(() => e.remove(), 1800);
}

/**
 * celebrate({ big }) — festa na tela.
 *   big: true  → vitória final: ~22 s de confete, fogos, emoji e a trilha "victory"
 *   big: false → vitória parcial (bandeira/missão/aula): ~6,6 s
 * Devolve { stop() } para cortar a festa (sair da tela, novo jogo…).
 */
export function celebrate({ big = false, ms, music = true } = {}) {
  const dur = ms || (big ? BIG_MS : SMALL_MS);
  const b = box(), timers = [];
  const every = (period, fn) => { const id = setInterval(fn, period); timers.push(id); return id; };
  const prev = Audio.song;
  if (big) {
    if (music) Audio.setSong("victory", { now: true });
    Audio.play("fanfare");
    wave(b, 80); boom(b);
    every(1300, () => wave(b, 34));
    every(1700, () => boom(b));
    every(420, () => emoji(b, ["🎉", "🏆", "⭐", "🎊", "🥳", "✨", "🎈"]));
    timers.push(setTimeout(() => Audio.play("cheer"), 1200));
  } else {
    Audio.play("cheer");
    wave(b, 40);
    every(1500, () => { wave(b, 26); Audio.play("pop"); });
    every(650, () => emoji(b, ["🎉", "⭐", "✨", "👏"]));
  }
  let done = false;
  const stop = (keepSong = false) => {
    if (done) return; done = true;
    timers.forEach((id) => { clearInterval(id); clearTimeout(id); });
    setTimeout(() => b.remove(), 4300);
    if (big && music && !keepSong && prev && prev !== "victory") Audio.setSong(prev, { now: true });
  };
  const endId = setTimeout(() => stop(), dur); timers.push(endId);
  return { stop, el: b, ms: dur };
}
/** Atalho das vitórias parciais (mesmo nome de antes, agora 3x mais longo). */
export const celebrateFlag = () => celebrate({ big: false });

/**
 * Marca uma GRANDE VITÓRIA: desbloqueia o próximo item do boneco e avisa o jogador.
 *   grantWin()               → terminar um jogo (EZ Obby, Parkour, capítulo do Apagão…)
 *   grantWin({ half: true }) → meia vitória (2 fases difíceis do Apagão viram 1 item)
 * Devolve o item ganho (string) ou null.
 */
export function grantWin({ half = false, delay = 1400 } = {}) {
  const got = addWin({ half });
  if (got) setTimeout(() => toast(t("unlockNew", { a: t("a_" + got) }), 5200, true), delay);
  return got;
}
