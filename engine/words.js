// Apelido do jogador: tamanho e filtro de palavrão (PT/EN/ES).
//
// Por que existe: o público pode incluir crianças (ECA Digital). Não há chat livre, mas o APELIDO
// aparece na cabeça do boneco, no placar e na tela dos amigos — inclusive o apelido de quem entra
// numa sala pública, que vem de outro aparelho. Por isso o filtro roda nos DOIS lados: quando o
// jogador salva o nome e quando um nome chega pela rede (`sanitizeLook`).
//
// Como funciona: o texto é normalizado só para a CONFERÊNCIA (o nome guardado continua como foi
// digitado, com acento e maiúscula). A normalização tira acentos, desfaz o "leet" (0→o, 1→i, 3→e,
// 4→a, 5→s, 7→t, @→a, $→s), troca o que não é letra/número por espaço e encolhe letras repetidas
// ("mmmeeerda" → "merda").
//
// Duas listas, de propósito:
//   WORD  — palavras curtas e ambíguas. Só valem no COMEÇO de uma palavra (\b), senão "cu" pegaria
//           "curitiba" e "puta" pegaria "disputa" / "computador".
//   TIGHT — palavras longas e sem ambiguidade. Valem também no texto COLADO (sem espaços nem
//           pontos), para pegar "c.a.r.a.l.h.o" e "p u t a r i a". Só entra aqui com 5+ letras.
//
// Ao mexer: nunca pôr palavra curta na TIGHT, e testar com nomes comuns (Assunção, Curitiba,
// Espinosa, Mathias, Cuca, Pinto) antes de subir.

const MAXLEN = 14;

// começo de palavra (pega plural e derivados: puta/putas/putaria, fode/fodase)
const WORD = [
  // pt
  "put[ao]", "puto", "merd", "porra", "caralh", "carai", "cacete", "buce?t", "boce?t", "xoxot", "xereca",
  "pinto?ba", "piroc", "rola\\b", "pau no", "fod[ae]", "foder", "fuder", "cu\\b", "cus\\b", "cuzao", "cuzinh",
  "arromba", "corno", "viado", "veado", "bicha\\b", "baitola", "traveco", "punhet", "siririca", "chupa",
  "vagabund", "piranha", "galinha\\b", "safad", "otari", "idiot", "imbecil", "burr[oa]\\b", "retardad",
  "mongol", "aleijad", "macac[oa]\\b", "preto do", "crioul", "favelad", "fdp", "pqp", "vtnc", "vsf", "tnc\\b",
  "filha? da put", "pau no cu", "toma no cu", "vai se fode", "desgraca", "peid", "bosta", "escroto", "babaca",
  "estupr", "pedofil", "nazist", "hitler", "suicid",
  // en
  "fuck", "fck\\b", "shit", "bitch", "bastard", "cunt", "dick\\b", "cock\\b", "asshole", "whore", "slut",
  "pussy", "nigg", "f+a+g", "retard", "rape\\b", "rapist", "nazi", "penis", "boobs?\\b", "tits?\\b", "porn",
  "sex\\b", "sexo\\b", "wank", "jerkoff", "dumbass", "motherf",
  // es
  "mierd", "cono\\b", "joder", "jodete", "gilipoll", "cabron", "polla\\b", "pendejo", "chinga", "verga\\b",
  "maricon", "marica\\b", "zorra\\b", "culero", "pinche", "huevon", "boludo", "pelotudo", "concha tu",
  "hijo de put", "puta madre", "cula?o\\b", "teta\\b", "tetas\\b",
];

// 5+ letras, sem ambiguidade: valem também no texto colado ("c-a-r-a-l-h-o")
const TIGHT = [
  "caralho", "buceta", "boceta", "xoxota", "piroca", "merda", "porra", "cuzao", "arrombado", "punheta",
  "viado", "pedofilo", "pedofilia", "estupro", "estuprador", "filhadaputa", "filhodaputa", "putaria",
  "putinha", "putinho", "putona", "fodase", "vaisefoder", "tomanocu", "vagabunda", "escroto", "babaca",
  "fuck", "bitch", "asshole", "motherfucker", "nigger", "faggot", "pussy", "whore",
  "mierda", "gilipollas", "cabron", "maricon", "pendejo", "hijodeputa", "putamadre", "chingada",
];

const WORD_RE = new RegExp("(^|[^a-z0-9])(" + WORD.join("|") + ")", "i");
const TIGHT_RE = new RegExp("(" + TIGHT.join("|") + ")", "i");

const LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "€": "e", "!": "i", "|": "i" };

/** Texto normalizado só para a conferência (nunca é o que se guarda). */
function norm(s) {
  return String(s)
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")        // tira acento
    .replace(/[01345 7@$€!|]/g, (c) => (c === " " ? " " : LEET[c] || c))
    .replace(/[^a-z0-9]+/g, " ")                              // pontuação vira espaço
    .replace(/(.)\1{2,}/g, "$1")                              // "mmmerda" → "merda"
    .trim();
}

/** true se o apelido tem palavrão/ofensa em PT, EN ou ES. */
export function isBadName(s) {
  const n = norm(s);
  if (!n) return false;
  if (WORD_RE.test(n)) return true;
  return TIGHT_RE.test(n.replace(/ /g, ""));                  // texto colado: pega "p u t a r i a"
}

/**
 * cleanName(nome) → apelido pronto para guardar e mostrar.
 * Tira caracteres de controle e de direção de texto, corta em 14 e devolve "" quando é ofensivo
 * (quem chama mostra o apelido padrão "Jogador" no lugar).
 */
export function cleanName(s) {
  const t = (typeof s === "string" ? s : "")
    .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAXLEN);
  return isBadName(t) ? "" : t;
}

export const NAME_MAX = MAXLEN;
