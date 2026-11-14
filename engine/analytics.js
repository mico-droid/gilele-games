// Analytics (Google Tag Manager → GA4). Mesmo container em todos os jogos.
// Privacidade (público pode incluir crianças — LGPD art. 14 / ECA Digital / COPPA):
//  - nunca enviar nome, apelido, chat, código de sala ou qualquer dado pessoal nos params;
//  - Consent Mode v2: anúncios e personalização SEMPRE negados; só estatística de uso.
// Todo evento leva junto: game_id (pasta do jogo ou "portal"), app_mode (app instalado ou navegador).
const GTM_ID = "GTM-54JJ46D9";
let CTX = null;
const gtag = function () { (window.dataLayer = window.dataLayer || []).push(arguments); };

function context() {
  if (CTX) return CTX;
  const m = location.pathname.match(/\/games\/([^/]+)/);
  let standalone = false;
  try { standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true; } catch (e) {}
  CTX = { game_id: m ? m[1] : "portal", app_mode: standalone ? "app" : "browser" };
  return CTX;
}

/** Liga o GTM (uma vez por página). Sem id usa o container padrão do Jatobá Tec. */
export function initGTM(id = GTM_ID) {
  if (window.__ezGtm) return; window.__ezGtm = 1;
  window.dataLayer = window.dataLayer || [];
  gtag("consent", "default", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "granted" });
  gtag("set", "ads_data_redaction", true);
  window.dataLayer.push(Object.assign({ "gtm.start": Date.now(), event: "gtm.js" }, context()));
  const s = document.createElement("script"); s.async = true; s.src = "https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(id || GTM_ID);
  document.head.appendChild(s);
}

/**
 * Evento padrão. Nomes usados em todos os jogos:
 *  game_start {mode, multiplayer, difficulty, age_band} · level_complete {score} · game_end {mode, result, score}
 *  lesson_start / lesson_complete {lesson} · target_hit · select_game {target} (portal)
 *  install_click · app_installed · share · lang_change {lang}
 */
export function track(event, params) {
  try {
    const p = Object.assign({}, params || {});
    delete p.game; // o jogo vem de game_id
    (window.dataLayer = window.dataLayer || []).push(Object.assign({ event }, context(), p));
  } catch (e) {}
}
