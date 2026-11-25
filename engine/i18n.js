// Tiny i18n: PT / EN / ES. Games pass their own dictionaries; engine strings are merged in.
import { shared } from "./storage.js";
import { track } from "./analytics.js";

export const LANGS = ["pt", "en", "es"];
export const LANG_NAMES = { pt: "Português", en: "English", es: "Español" };

const BASE = {
  pt: {
    play: "Jogar", back: "Voltar", save: "Salvar", cancel: "Cancelar", close: "Fechar", random: "Aleatório",
    paused: "Pausado", resume: "Continuar", menu: "Menu", settings: "Configurações", language: "Idioma",
    music: "Música", sfx: "Efeitos", quality: "Gráficos", q_auto: "Auto", q_low: "Leve", q_medium: "Equilibrado", q_high: "Realista", q_note: "Leve ↔ Equilibrado/Realista muda ao reabrir o jogo.",
    privacy: "Privacidade", install: "Instalar app", installIos: "No iPhone: toque em Compartilhar e depois em \"Adicionar à Tela de Início\".",
    portal: "Gilelê Games", share: "Compartilhar", shareText: "Vem jogar {g} comigo! 🎮", linkCopied: "Link copiado! Cole numa conversa para compartilhar.",
    instNotesT: "Se não aparecer o botão de instalar no Android:",
    instN1: "Abra o jogo no Chrome. Se você entrou por um link do WhatsApp ou Instagram, toque no menu ⋮ e em \"Abrir no Chrome\".",
    instN2: "Se o celular avisar sobre app desconhecido ou Play Protect, toque em \"Instalar assim mesmo\" — o jogo é uma página, não um aplicativo da loja.",
    instN3: "Se o celular é de criança com Family Link, o responsável precisa aprovar a instalação no aparelho dele.",
    howInstall: "Como instalar", installHow: "No Android (Chrome): toque no menu ⋮ e depois em \"Instalar app\" ou \"Adicionar à tela inicial\". No iPhone (Safari): toque em Compartilhar e depois em \"Adicionar à Tela de Início\". No computador (Chrome/Edge): clique no ícone de instalar na barra de endereço.",
    character: "Personagem", tab_kind: "Tipo", tab_hair: "Cabelo", tab_colors: "Cores 🎨", tab_acc: "Acessório", tab_face: "Rosto", name: "Nome", namePh: "Jogador", kind: "Tipo", hair: "Cabelo", hairColor: "Cor do cabelo",
    skin: "Pele", shirt: "Detalhe", sleeves: "Mangas", pants: "Calça", acc: "Acessório", face: "Rosto",
    k_m: "Menino", k_f: "Menina", k_fox: "Raposa", k_et: "ET", k_horse: "Cavalo", k_smiley: "Smiley", k_zombie: "Zumbi",
    h_none: "Careca", h_short: "Curto", h_spiky: "Espetado", h_curly: "Cacheado", h_long: "Longo", h_ponytail: "Rabo", h_pigtails: "Marias", h_bob: "Chanel",
    a_none: "Nada", a_hat: "Cartola", a_cap: "Boné", a_glasses: "Óculos", a_crown: "Coroa", a_headphones: "Fone",
    a_cape: "Capa de herói", a_afro: "Black power", a_pet: "Bichinho", a_catears: "Orelha de gato", a_emo: "Cabelo emo", a_helmet: "Capacete", a_halo: "Auréola", a_horns: "Chifre de boi",
    locked: "Trancado", lockHint: "Ganhe um item novo a cada grande vitória: terminar um jogo ou passar 2 fases difíceis.",
    unlockNew: "🎁 Item novo no personagem: {a}!", editChar: "Editar",
    f_normal: "Normal", f_smug: "Debochado", f_sigma: "Sério", f_happy: "Feliz",
    mp: "Multijogador", mpCreate: "Criar sala", mpJoin: "Entrar", mpCodePh: "CÓDIGO", mpLeave: "Sair da sala",
    mpConnecting: "Conectando…", mpRoom: "Sala {code} · {n}/{max}", mpFail: "Não deu para conectar. Tente de novo.",
    mpFull: "Sala cheia (máx. {max}).", mpNotFound: "Sala não encontrada.", mpHostLeft: "O dono da sala saiu.", mpLeft: "Você saiu da sala.",
    mpShare: "Mande este link para os amigos:", copied: "Copiado!", copy: "Copiar", offline: "Sozinho", online: "Online",
    chat: "Chat rápido",
    c0: "Oi! 👋", c1: "Bora! 🚀", c2: "Me espera! ✋", c3: "Boa! 👍", c4: "Kkkk 😂", c5: "Socorro! 😱", c6: "GG 🏆", c7: "Valeu! 🙏", c8: "Vem cá! 👉", c9: "Tchau! 👋",
  },
  en: {
    play: "Play", back: "Back", save: "Save", cancel: "Cancel", close: "Close", random: "Random",
    paused: "Paused", resume: "Resume", menu: "Menu", settings: "Settings", language: "Language",
    music: "Music", sfx: "Sound FX", quality: "Graphics", q_auto: "Auto", q_low: "Fast", q_medium: "Balanced", q_high: "Realistic", q_note: "Fast ↔ Balanced/Realistic applies when you reopen the game.",
    privacy: "Privacy", install: "Install app", installIos: "On iPhone: tap Share, then \"Add to Home Screen\".",
    portal: "Gilelê Games", share: "Share", shareText: "Come play {g} with me! 🎮", linkCopied: "Link copied! Paste it in a chat to share.",
    instNotesT: "If the install button doesn't show up on Android:",
    instN1: "Open the game in Chrome. If you came from a WhatsApp or Instagram link, tap the ⋮ menu and \"Open in Chrome\".",
    instN2: "If the phone warns about an unknown app or Play Protect, tap \"Install anyway\" — the game is a web page, not a store app.",
    instN3: "If it's a child's phone with Family Link, the parent has to approve the install on their own phone.",
    howInstall: "How to install", installHow: "On Android (Chrome): tap the ⋮ menu, then \"Install app\" or \"Add to Home screen\". On iPhone (Safari): tap Share, then \"Add to Home Screen\". On a computer (Chrome/Edge): click the install icon in the address bar.",
    character: "Character", tab_kind: "Type", tab_hair: "Hair", tab_colors: "Colors 🎨", tab_acc: "Accessory", tab_face: "Face", name: "Name", namePh: "Player", kind: "Type", hair: "Hair", hairColor: "Hair color",
    skin: "Skin", shirt: "Trim", sleeves: "Sleeves", pants: "Pants", acc: "Accessory", face: "Face",
    k_m: "Boy", k_f: "Girl", k_fox: "Fox", k_et: "Alien", k_horse: "Horse", k_smiley: "Smiley", k_zombie: "Zombie",
    h_none: "Bald", h_short: "Short", h_spiky: "Spiky", h_curly: "Curly", h_long: "Long", h_ponytail: "Ponytail", h_pigtails: "Pigtails", h_bob: "Bob",
    a_none: "None", a_hat: "Top hat", a_cap: "Cap", a_glasses: "Glasses", a_crown: "Crown", a_headphones: "Headphones",
    a_cape: "Hero cape", a_afro: "Afro", a_pet: "Pet", a_catears: "Cat ears", a_emo: "Emo hair", a_helmet: "Helmet", a_halo: "Halo", a_horns: "Bull horns",
    locked: "Locked", lockHint: "You unlock a new item on every big win: finishing a game or clearing 2 hard stages.",
    unlockNew: "🎁 New character item: {a}!", editChar: "Edit",
    f_normal: "Normal", f_smug: "Smug", f_sigma: "Serious", f_happy: "Happy",
    mp: "Multiplayer", mpCreate: "Create room", mpJoin: "Join", mpCodePh: "CODE", mpLeave: "Leave room",
    mpConnecting: "Connecting…", mpRoom: "Room {code} · {n}/{max}", mpFail: "Could not connect. Try again.",
    mpFull: "Room is full (max {max}).", mpNotFound: "Room not found.", mpHostLeft: "The host left.", mpLeft: "You left the room.",
    mpShare: "Send this link to your friends:", copied: "Copied!", copy: "Copy", offline: "Solo", online: "Online",
    chat: "Quick chat",
    c0: "Hi! 👋", c1: "Let's go! 🚀", c2: "Wait for me! ✋", c3: "Nice! 👍", c4: "LOL 😂", c5: "Help! 😱", c6: "GG 🏆", c7: "Thanks! 🙏", c8: "Come here! 👉", c9: "Bye! 👋",
  },
  es: {
    play: "Jugar", back: "Volver", save: "Guardar", cancel: "Cancelar", close: "Cerrar", random: "Aleatorio",
    paused: "Pausado", resume: "Continuar", menu: "Menú", settings: "Ajustes", language: "Idioma",
    music: "Música", sfx: "Efectos", quality: "Gráficos", q_auto: "Auto", q_low: "Ligero", q_medium: "Equilibrado", q_high: "Realista", q_note: "Ligero ↔ Equilibrado/Realista cambia al reabrir el juego.",
    privacy: "Privacidad", install: "Instalar app", installIos: "En iPhone: toca Compartir y luego \"Agregar a inicio\".",
    portal: "Gilelê Games", share: "Compartir", shareText: "¡Ven a jugar {g} conmigo! 🎮", linkCopied: "¡Enlace copiado! Pégalo en un chat para compartir.",
    instNotesT: "Si no aparece el botón de instalar en Android:",
    instN1: "Abre el juego en Chrome. Si entraste por un enlace de WhatsApp o Instagram, toca el menú ⋮ y \"Abrir en Chrome\".",
    instN2: "Si el teléfono avisa de app desconocida o Play Protect, toca \"Instalar de todos modos\" — el juego es una página web, no una app de la tienda.",
    instN3: "Si es el teléfono de un niño con Family Link, el adulto tiene que aprobar la instalación en su propio teléfono.",
    howInstall: "Cómo instalar", installHow: "En Android (Chrome): toca el menú ⋮ y luego \"Instalar app\" o \"Agregar a la pantalla principal\". En iPhone (Safari): toca Compartir y luego \"Agregar a inicio\". En la computadora (Chrome/Edge): haz clic en el icono de instalar en la barra de direcciones.",
    character: "Personaje", tab_kind: "Tipo", tab_hair: "Pelo", tab_colors: "Colores 🎨", tab_acc: "Accesorio", tab_face: "Cara", name: "Nombre", namePh: "Jugador", kind: "Tipo", hair: "Pelo", hairColor: "Color de pelo",
    skin: "Piel", shirt: "Detalle", sleeves: "Mangas", pants: "Pantalón", acc: "Accesorio", face: "Cara",
    k_m: "Niño", k_f: "Niña", k_fox: "Zorro", k_et: "Alien", k_horse: "Caballo", k_smiley: "Smiley", k_zombie: "Zombi",
    h_none: "Calvo", h_short: "Corto", h_spiky: "Punta", h_curly: "Rizado", h_long: "Largo", h_ponytail: "Coleta", h_pigtails: "Coletas", h_bob: "Bob",
    a_none: "Nada", a_hat: "Chistera", a_cap: "Gorra", a_glasses: "Gafas", a_crown: "Corona", a_headphones: "Audífonos",
    a_cape: "Capa de héroe", a_afro: "Afro", a_pet: "Mascota", a_catears: "Orejas de gato", a_emo: "Pelo emo", a_helmet: "Casco", a_halo: "Aureola", a_horns: "Cuernos de toro",
    locked: "Bloqueado", lockHint: "Ganas un objeto nuevo en cada gran victoria: terminar un juego o pasar 2 fases difíciles.",
    unlockNew: "🎁 ¡Objeto nuevo del personaje: {a}!", editChar: "Editar",
    f_normal: "Normal", f_smug: "Burlón", f_sigma: "Serio", f_happy: "Feliz",
    mp: "Multijugador", mpCreate: "Crear sala", mpJoin: "Entrar", mpCodePh: "CÓDIGO", mpLeave: "Salir de la sala",
    mpConnecting: "Conectando…", mpRoom: "Sala {code} · {n}/{max}", mpFail: "No se pudo conectar. Inténtalo de nuevo.",
    mpFull: "Sala llena (máx. {max}).", mpNotFound: "Sala no encontrada.", mpHostLeft: "El anfitrión salió.", mpLeft: "Saliste de la sala.",
    mpShare: "Envía este enlace a tus amigos:", copied: "¡Copiado!", copy: "Copiar", offline: "Solo", online: "En línea",
    chat: "Chat rápido",
    c0: "¡Hola! 👋", c1: "¡Vamos! 🚀", c2: "¡Espérame! ✋", c3: "¡Bien! 👍", c4: "Jajaja 😂", c5: "¡Socorro! 😱", c6: "GG 🏆", c7: "¡Gracias! 🙏", c8: "¡Ven! 👉", c9: "¡Chao! 👋",
  },
};

function detect() {
  const saved = shared.get("lang");
  if (LANGS.includes(saved)) return saved;
  const q = new URLSearchParams(location.search).get("lang");
  if (LANGS.includes(q)) return q;
  const n = (navigator.language || "pt").slice(0, 2).toLowerCase();
  return LANGS.includes(n) ? n : "pt";
}

let lang = detect();
const dicts = { pt: { ...BASE.pt }, en: { ...BASE.en }, es: { ...BASE.es } };
const listeners = new Set();

/** Merge a game's strings: addStrings({pt:{...},en:{...},es:{...}}) */
export function addStrings(d) { for (const l of LANGS) if (d && d[l]) Object.assign(dicts[l], d[l]); }
/** t("key", {var}) — falls back to PT, then the key itself. */
export function t(key, vars) {
  let s = dicts[lang][key] ?? dicts.pt[key] ?? key;
  if (vars && typeof s === "string") s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ""));
  return s;
}
export function getLang() { return lang; }
export function setLang(l) {
  if (!LANGS.includes(l) || l === lang) return;
  lang = l; shared.set("lang", l); track("lang_change", { lang: l });
  document.documentElement.lang = l === "pt" ? "pt-BR" : l;
  listeners.forEach((fn) => { try { fn(l); } catch (e) {} });
}
export function onLangChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
/** Fill every [data-t="key"] (textContent) and [data-tp="key"] (placeholder) under root. */
export function applyDom(root = document) {
  root.querySelectorAll("[data-t]").forEach((el) => (el.textContent = t(el.dataset.t)));
  root.querySelectorAll("[data-tp]").forEach((el) => (el.placeholder = t(el.dataset.tp)));
}
document.documentElement.lang = lang === "pt" ? "pt-BR" : lang;
