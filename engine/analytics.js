// Analytics: pushes events to dataLayer (Google Tag Manager / GA4). No personal data is sent:
// never put player names, chat or room codes in params.
export function initGTM(id) {
  if (!id || window.__ezGtm) return; window.__ezGtm = 1;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const s = document.createElement("script"); s.async = true; s.src = "https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(id);
  document.head.appendChild(s);
}
export function track(event, params) {
  try { (window.dataLayer = window.dataLayer || []).push(Object.assign({ event }, params || {})); } catch (e) {}
}
