// Itens do boneco que o jogador desbloqueia jogando (pedido do dono, 25/11/2026).
// Começa com pouca coisa (óculos e cartola) e ganha UM item novo a cada "grande vitória":
//   · EZ Obby e Parkour Tabuada → terminar o jogo
//   · Apagão: Sobreviva → cada 2 fases concluídas no modo difícil (e o fim do capítulo)
// O progresso é compartilhado por TODOS os jogos (mesma origem, chave "gilele:unlocks"),
// igual ao visual do boneco e ao nível de gráficos. Os HTML avulsos têm uma cópia disto.
import { shared } from "./storage.js";

/** Acessórios livres desde o começo. */
export const ACC_FREE = ["none", "glasses", "hat"];
/** Ordem de desbloqueio (um por grande vitória). */
export const ACC_CHAIN = ["headphones", "cape", "afro", "pet", "catears", "cap", "emo", "halo", "horns", "crown"];

const num = (v, d = 0) => (Number.isFinite(+v) ? Math.max(0, Math.floor(+v)) : d);

/** Quantas grandes vitórias o jogador já tem (= quantos itens da corrente estão liberados). */
export function unlockCount() { return Math.min(ACC_CHAIN.length, num(shared.get("unlocks", "0"))); }
/** Meias-vitórias (usado pelo Apagão: 2 fases difíceis = 1 item). */
function halfCount() { return num(shared.get("unlockHalf", "0")); }

export function isUnlocked(acc) { return ACC_FREE.includes(acc) || ACC_CHAIN.indexOf(acc) < unlockCount(); }
/** Lista na ordem em que aparece no editor: livres, depois a corrente. */
export function accOrder() { return ACC_FREE.concat(ACC_CHAIN); }
/** Próximo item ainda trancado (ou null se já tem tudo). */
export function nextLocked() { return ACC_CHAIN[unlockCount()] || null; }

/**
 * Registra uma grande vitória. `half: true` conta meia vitória (duas viram uma).
 * Devolve o item desbloqueado agora (string) ou null se nada mudou.
 */
export function addWin({ half = false } = {}) {
  if (half) {
    const hc = halfCount() + 1;
    if (hc < 2) { shared.set("unlockHalf", hc); return null; }
    shared.set("unlockHalf", 0);
  }
  const n = unlockCount();
  if (n >= ACC_CHAIN.length) return null;
  shared.set("unlocks", n + 1);
  return ACC_CHAIN[n];
}
