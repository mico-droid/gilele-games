// Safe localStorage wrapper with per-game namespace (works in private mode / iframes).
export function createStore(ns) {
  const p = ns ? ns + ":" : "";
  return {
    get(k, def = null) { try { const v = localStorage.getItem(p + k); return v === null ? def : v; } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem(p + k, String(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(p + k); } catch (e) {} },
    getJSON(k, def = null) { try { const v = localStorage.getItem(p + k); return v === null ? def : JSON.parse(v); } catch (e) { return def; } },
    setJSON(k, v) { try { localStorage.setItem(p + k, JSON.stringify(v)); } catch (e) {} },
  };
}
// Shared across all games (avatar, language, audio prefs) so the player sets them once.
export const shared = createStore("gilele");
