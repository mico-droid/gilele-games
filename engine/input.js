// Input: keyboard, touch (virtual joystick on the left + drag-to-look on the right),
// on-screen action buttons, mouse drag / wheel, and gamepad. Games read actions by name.
import { isTouch } from "./core.js";

const DEFAULT_KEYS = {
  up: ["KeyW", "ArrowUp"], down: ["KeyS", "ArrowDown"], left: ["KeyA", "ArrowLeft"], right: ["KeyD", "ArrowRight"],
  jump: ["Space"], act: ["KeyE", "KeyJ"], reset: ["KeyR"], chat: ["KeyT", "Enter"], pause: ["KeyP", "Escape"],
};
const PAD = { jump: 0, act: 2, reset: 3, pause: 9 }; // standard gamepad button indexes

/**
 * createInput({ canvas, keys, onLook(dx,dy,isTouch), onZoom(delta), enabled:()=>bool })
 * API: axis() → {x,y} in [-1,1] (y forward), down(action), pressed(action) (edge, consumed per frame),
 *      addButton({id,label,action,side,row}), onAction(action, fn), endFrame()
 */
export function createInput(opt = {}) {
  const canvas = opt.canvas;
  const map = Object.assign({}, DEFAULT_KEYS, opt.keys || {});
  const codeToAct = {};
  for (const a in map) for (const c of map[a]) (codeToAct[c] ||= []).push(a);
  const held = {}, edge = {}, handlers = {};
  const enabled = () => (opt.enabled ? opt.enabled() : true);

  function fire(a, isDown) {
    if (isDown) { if (!held[a]) { edge[a] = true; (handlers[a] || []).forEach((f) => f()); } held[a] = true; }
    else held[a] = false;
  }
  addEventListener("keydown", (e) => {
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    const acts = codeToAct[e.code]; if (!acts) return;
    if (!enabled() && !acts.includes("pause")) return;
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    acts.forEach((a) => fire(a, true));
  });
  addEventListener("keyup", (e) => { (codeToAct[e.code] || []).forEach((a) => fire(a, false)); });
  addEventListener("blur", () => { for (const a in held) held[a] = false; joy.x = joy.y = 0; });

  // ---- touch joystick + look
  const joyEl = document.createElement("div"); joyEl.className = "ez-joy"; joyEl.innerHTML = '<div class="ez-knob"></div>';
  document.body.appendChild(joyEl);
  const knob = joyEl.firstChild;
  let joyId = null, joyBase = { x: 0, y: 0 }, lookId = null, lookLast = { x: 0, y: 0 };
  const joy = { x: 0, y: 0 };
  const R = 52;
  if (canvas) {
    canvas.addEventListener("pointerdown", (e) => {
      if (!enabled()) return;
      if (e.pointerType === "touch" && e.clientX < innerWidth * 0.45 && joyId === null) {
        joyId = e.pointerId; joyBase = { x: e.clientX, y: e.clientY };
        joyEl.style.display = "block"; joyEl.style.left = e.clientX + "px"; joyEl.style.top = e.clientY + "px";
        knob.style.transform = "translate(-50%,-50%)";
      } else if (lookId === null) { lookId = e.pointerId; lookLast = { x: e.clientX, y: e.clientY }; }
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    });
    canvas.addEventListener("pointermove", (e) => {
      if (e.pointerId === joyId) {
        let dx = e.clientX - joyBase.x, dy = e.clientY - joyBase.y; const l = Math.hypot(dx, dy);
        if (l > R) { dx *= R / l; dy *= R / l; }
        joy.x = dx / R; joy.y = dy / R;
        knob.style.transform = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
      } else if (e.pointerId === lookId) {
        if (opt.onLook) opt.onLook(e.clientX - lookLast.x, e.clientY - lookLast.y, e.pointerType === "touch");
        lookLast = { x: e.clientX, y: e.clientY };
      }
    });
    const up = (e) => {
      if (e.pointerId === joyId) { joyId = null; joy.x = joy.y = 0; joyEl.style.display = "none"; }
      if (e.pointerId === lookId) lookId = null;
    };
    canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("wheel", (e) => { e.preventDefault(); if (opt.onZoom) opt.onZoom(e.deltaY * 0.01); }, { passive: false });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  // ---- on-screen buttons (shown on touch devices)
  const pad = document.createElement("div"); pad.className = "ez-pad" + (isTouch ? "" : " ez-hidden");
  document.body.appendChild(pad);
  function addButton({ id, label, action, big = false, hold = true }) {
    const b = document.createElement("button");
    b.className = "ez-tbtn" + (big ? " big" : ""); b.textContent = label; if (id) b.id = id;
    b.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); fire(action, true); if (!hold) fire(action, false); });
    ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => b.addEventListener(ev, () => hold && fire(action, false)));
    pad.appendChild(b);
    return b;
  }

  // ---- gamepad
  let padPrev = {};
  function pollPad() {
    const gp = navigator.getGamepads ? [...navigator.getGamepads()].find(Boolean) : null;
    if (!gp) return null;
    for (const a in PAD) { const v = !!(gp.buttons[PAD[a]] && gp.buttons[PAD[a]].pressed); if (v !== !!padPrev[a]) fire(a, v); padPrev[a] = v; }
    const dz = (v) => (Math.abs(v) < 0.15 ? 0 : v);
    if (opt.onLook && (Math.abs(gp.axes[2] || 0) > 0.15 || Math.abs(gp.axes[3] || 0) > 0.15)) opt.onLook(dz(gp.axes[2]) * 12, dz(gp.axes[3]) * 8, false);
    return { x: dz(gp.axes[0] || 0), y: -dz(gp.axes[1] || 0) };
  }

  return {
    /** Movement axis: x = right, y = forward. Length ≤ 1. */
    axis() {
      let x = 0, y = 0;
      if (held.up) y += 1; if (held.down) y -= 1; if (held.right) x += 1; if (held.left) x -= 1;
      if (joyId !== null) { x += joy.x; y -= joy.y; }
      const g = pollPad(); if (g) { x += g.x; y += g.y; }
      const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
      return { x, y };
    },
    down: (a) => !!held[a],
    pressed: (a) => !!edge[a],
    onAction(a, fn) { (handlers[a] ||= []).push(fn); },
    addButton,
    pad,
    /** Call at the end of each frame to clear edge-triggered presses. */
    endFrame() { for (const a in edge) edge[a] = false; },
    setVisible(v) { pad.classList.toggle("ez-hidden", !v || !isTouch); },
  };
}
