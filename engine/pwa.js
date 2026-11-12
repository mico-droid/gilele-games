// PWA: service worker registration + "Install app" prompt (Android/desktop) and iOS hint.
let deferred = null;
const listeners = new Set();
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; listeners.forEach((f) => f(true)); });
addEventListener("appinstalled", () => { deferred = null; listeners.forEach((f) => f(false)); });

export const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
export const canInstall = () => !!deferred;
export function onInstallable(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export async function promptInstall() {
  if (!deferred) return false;
  deferred.prompt();
  const r = await deferred.userChoice.catch(() => null);
  deferred = null; listeners.forEach((f) => f(false));
  return !!r && r.outcome === "accepted";
}
/** Register the shared service worker (root sw.js). swUrl is relative to the page. */
export function registerPWA(swUrl = "../../sw.js") {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  addEventListener("load", () => navigator.serviceWorker.register(swUrl).catch(() => {}));
}
