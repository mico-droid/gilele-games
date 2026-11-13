// Tiny i18n: PT / EN / ES. Games pass their own dictionaries; engine strings are merged in.
import { shared } from "./storage.js";

export const LANGS = ["pt", "en", "es"];
export const LANG_NAMES = { pt: "Português", en: "English", es: "Español" };

const BASE = {
  pt: {
    play: "Jogar", back: "Voltar", save: "Salvar", cancel: "Cancelar", close: "Fechar", random: "Aleatório",
    paused: "Pausado", resume: "Continuar", menu: "Menu", settings: "Configurações", language: "Idioma",
    music: "Música", sfx: "Efeitos", quality: "Gráficos", q_auto: "Auto", q_low: "Leve", q_high: "Bonito",
    install: "Instalar app", installIos: "No iPhone: toque em Compartilhar e depois em \"Adicionar à Tela de Início\".",
    portal: "gi-lele games", share: "Compartilhar", shareText: "Vem jogar {g} comigo! 🎮", linkCopied: "Link copiado! Cole numa conversa para compartilhar.",
    howInstall: "Como instalar", installHow: "No Android (Chrome): toque no menu ⋮ e depois em \"Instalar app\" ou \"Adicionar à tela inicial\". No iPhone (Safari): toque em Compartilhar e depois em \"Adicionar à Tela de Início\". No computador (Chrome/Edge): clique no ícone de instalar na barra de endereço.",
    character: "Personagem", tab_kind: "Tipo", tab_hair: "Cabelo", tab_colors: "Cores 🎨", tab_acc: "Acessório", tab_face: "Rosto", name: "Nome", namePh: "Jogador", kind: "Tipo", hair: "Cabelo", hairColor: "Cor do cabelo",
    skin: "Pele", shirt: "Camisa", sleeves: "Mangas", pants: "Calça", acc: "Acessório", face: "Rosto",
    k_m: "Menino", k_f: "Menina", k_fox: "Raposa", k_et: "ET", k_horse: "Cavalo", k_smiley: "Smiley", k_zombie: "Zumbi",
    h_none: "Careca", h_short: "Curto", h_spiky: "Espetado", h_curly: "Cacheado", h_long: "Longo", h_ponytail: "Rabo", h_pigtails: "Marias", h_bob: "Chanel",
    a_none: "Nada", a_hat: "Cartola", a_cap: "Boné", a_glasses: "Óculos", a_crown: "Coroa", a_headphones: "Fone",
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
    music: "Music", sfx: "Sound FX", quality: "Graphics", q_auto: "Auto", q_low: "Fast", q_high: "Pretty",
    install: "Install app", installIos: "On iPhone: tap Share, then \"Add to Home Screen\".",
    portal: "gi-lele games", share: "Share", shareText: "Come play {g} with me! 🎮", linkCopied: "Link copied! Paste it in a chat to share.",
    howInstall: "How to install", installHow: "On Android (Chrome): tap the ⋮ menu, then \"Install app\" or \"Add to Home screen\". On iPhone (Safari): tap Share, then \"Add to Home Screen\". On a computer (Chrome/Edge): click the install icon in the address bar.",
    character: "Character", tab_kind: "Type", tab_hair: "Hair", tab_colors: "Colors 🎨", tab_acc: "Accessory", tab_face: "Face", name: "Name", namePh: "Player", kind: "Type", hair: "Hair", hairColor: "Hair color",
    skin: "Skin", shirt: "Shirt", sleeves: "Sleeves", pants: "Pants", acc: "Accessory", face: "Face",
    k_m: "Boy", k_f: "Girl", k_fox: "Fox", k_et: "Alien", k_horse: "Horse", k_smiley: "Smiley", k_zombie: "Zombie",
    h_none: "Bald", h_short: "Short", h_spiky: "Spiky", h_curly: "Curly", h_long: "Long", h_ponytail: "Ponytail", h_pigtails: "Pigtails", h_bob: "Bob",
    a_none: "None", a_hat: "Top hat", a_cap: "Cap", a_glasses: "Glasses", a_crown: "Crown", a_headphones: "Headphones",
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
    music: "Música", sfx: "Efectos", quality: "Gráficos", q_auto: "Auto", q_low: "Ligero", q_high: "Bonito",
    install: "Instalar app", installIos: "En iPhone: toca Compartir y luego \"Agregar a inicio\".",
    portal: "gi-lele games", share: "Compartir", shareText: "¡Ven a jugar {g} conmigo! 🎮", linkCopied: "¡Enlace copiado! Pégalo en un chat para compartir.",
    howInstall: "Cómo instalar", installHow: "En Android (Chrome): toca el menú ⋮ y luego \"Instalar app\" o \"Agregar a la pantalla principal\". En iPhone (Safari): toca Compartir y luego \"Agregar a inicio\". En la computadora (Chrome/Edge): haz clic en el icono de instalar en la barra de direcciones.",
    character: "Personaje", tab_kind: "Tipo", tab_hair: "Pelo", tab_colors: "Colores 🎨", tab_acc: "Accesorio", tab_face: "Cara", name: "Nombre", namePh: "Jugador", kind: "Tipo", hair: "Pelo", hairColor: "Color de pelo",
    skin: "Piel", shirt: "Camiseta", sleeves: "Mangas", pants: "Pantalón", acc: "Accesorio", face: "Cara",
    k_m: "Niño", k_f: "Niña", k_fox: "Zorro", k_et: "Alien", k_horse: "Caballo", k_smiley: "Smiley", k_zombie: "Zombi",
    h_none: "Calvo", h_short: "Corto", h_spiky: "Punta", h_curly: "Rizado", h_long: "Largo", h_ponytail: "Coleta", h_pigtails: "Coletas", h_bob: "Bob",
    a_none: "Nada", a_hat: "Chistera", a_cap: "Gorra", a_glasses: "Gafas", a_crown: "Corona", a_headphones: "Audífonos",
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
  lang = l; shared.set("lang", l);
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
