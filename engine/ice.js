// Servidores STUN/TURN de todos os jogos (um lugar só). Quem usa: net.js (PeerJS).
//
//   STUN  = diz a cada jogador qual é o seu endereço na internet (sempre grátis, Google).
//   TURN  = repassa os dados quando os dois não conseguem falar direto (conta do Metered, ver turn.js).
//
// iceServers() devolve a lista pronta. Se o Metered não responder (sem internet, conta fora do ar,
// chave trocada), devolve só o STUN — ou seja, o multijogador continua funcionando como antes.
import { TURN } from "./turn.js";

export const STUN = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const CK = "gilele:ice";          // guarda a resposta por um tempo (as senhas do TURN são temporárias)
const TTL = 60 * 60 * 1000;       // 1 hora
let mem = null, pending = null;

function cached() {
  if (mem && Date.now() - mem.t < TTL) return mem.list;
  try {
    const s = JSON.parse(localStorage.getItem(CK) || "null");
    if (s && Date.now() - s.t < TTL && Array.isArray(s.list) && s.list.length) { mem = s; return s.list; }
  } catch (e) {}
  return null;
}

function keep(list) {
  mem = { t: Date.now(), list };
  try { localStorage.setItem(CK, JSON.stringify(mem)); } catch (e) {}
}

/** Lista de servidores para o WebRTC. Nunca falha: no pior caso devolve só o STUN. */
export async function iceServers() {
  const c = cached(); if (c) return c;
  if (pending) return pending;
  pending = (async () => {
    try {
      if (!TURN.app || !TURN.key) return STUN;
      const url = `https://${TURN.app}.metered.live/api/v1/turn/credentials?apiKey=${encodeURIComponent(TURN.key)}`;
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 4000);          // não segurar a entrada na sala
      const r = await fetch(url, { signal: ctrl.signal });
      clearTimeout(to);
      if (!r.ok) throw new Error("turn " + r.status);
      const list = await r.json();
      if (!Array.isArray(list) || !list.length) throw new Error("turn vazio");
      const ok = list.filter((s) => s && s.urls);
      const full = STUN.concat(ok);
      keep(full);
      return full;
    } catch (e) {
      return STUN;                                              // sem TURN: segue com STUN, como antes
    } finally {
      pending = null;
    }
  })();
  return pending;
}
