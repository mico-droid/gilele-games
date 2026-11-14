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
    if (a === "up" || a === "down" || a === "left" || a === "right") drawJoy();
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
  addEventListener("blur", () => { for (const a in held) held[a] = false; joy.x = joy.y = 0; drawJoy(); });

  // ---- touch joystick + look
  // The joystick ring is ALWAYS visible while playing (rest spot: bottom-left). On touch it jumps to
  // the finger and goes back home on release; on PC it shows w/a/s/d and the knob follows the keys
  // (it can also be dragged with the mouse).
  const joyEl = document.createElement("div"); joyEl.className = "ez-joy ez-hidden" + (isTouch ? "" : " pc");
  joyEl.innerHTML = '<div class="ez-knob"></div>' + (isTouch ? "" : '<b class="k-w">w</b><b class="k-a">a</b><b class="k-s">s</b><b class="k-d">d</b>');
  document.body.appendChild(joyEl);
  const knob = joyEl.firstChild;
  const keyEl = { up: joyEl.querySelector(".k-w"), left: joyEl.querySelector(".k-a"), down: joyEl.querySelector(".k-s"), right: joyEl.querySelector(".k-d") };
  function drawJoy() {
    if (joyId !== null) return;
    let x = 0, y = 0;
    if (held.right) x += 1; if (held.left) x -= 1; if (held.down) y += 1; if (held.up) y -= 1;
    const l = Math.hypot(x, y) || 1;
    knob.style.transform = `translate(calc(-50% + ${(x / l) * R}px),calc(-50% + ${(y / l) * R}px))`;
    for (const a in keyEl) if (keyEl[a]) keyEl[a].classList.toggle("on", !!held[a]);
  }
  const joyHome = () => { joyEl.style.left = joyEl.style.top = ""; joyEl.classList.remove("live"); drawJoy(); };
  let joyId = null, joyBase = { x: 0, y: 0 }, lookId = null, lookLast = { x: 0, y: 0 };
  const joy = { x: 0, y: 0 };
  const R = 52;
  const joyStart = (e, float) => {
    joyId = e.pointerId; joyEl.classList.add("live");
    if (float) { joyEl.style.left = e.clientX + "px"; joyEl.style.top = e.clientY + "px"; joyBase = { x: e.clientX, y: e.clientY }; }
    else { const r = joyEl.getBoundingClientRect(); joyBase = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; joyMove(e); }
  };
  function joyMove(e) {
    let dx = e.clientX - joyBase.x, dy = e.clientY - joyBase.y; const l = Math.hypot(dx, dy);
    if (l > R) { dx *= R / l; dy *= R / l; }
    joy.x = dx / R; joy.y = dy / R;
    knob.style.transform = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
  }
  const joyEnd = () => { joyId = null; joy.x = joy.y = 0; joyHome(); };
  // Grab the ring itself (mouse on PC, or a finger right on it).
  joyEl.addEventListener("pointerdown", (e) => {
    if (!enabled() || joyId !== null) return;
    e.preventDefault(); e.stopPropagation(); joyStart(e, false);
    try { joyEl.setPointerCapture(e.pointerId); } catch (_) {}
  });
  joyEl.addEventListener("pointermove", (e) => { if (e.pointerId === joyId) joyMove(e); });
  ["pointerup", "pointercancel"].forEach((ev) => joyEl.addEventListener(ev, (e) => { if (e.pointerId === joyId) joyEnd(); }));
  if (canvas) {
    canvas.addEventListener("pointerdown", (e) => {
      if (!enabled()) return;
      if (e.pointerType === "touch" && e.clientX < innerWidth * 0.45 && joyId === null) {
        joyStart(e, true); knob.style.transform = "translate(-50%,-50%)";
      } else if (lookId === null) { lookId = e.pointerId; lookLast = { x: e.clientX, y: e.clientY }; }
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    });
    canvas.addEventListener("pointermove", (e) => {
      if (e.pointerId === joyId) joyMove(e);
      else if (e.pointerId === lookId) {
        if (opt.onLook) opt.onLook(e.clientX - lookLast.x, e.clientY - lookLast.y, e.pointerType === "touch");
        lookLast = { x: e.clientX, y: e.clientY };
      }
    });
    const up = (e) => {
      if (e.pointerId === joyId) joyEnd();
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
    setVisible(v) { pad.classList.toggle("ez-hidden", !v || !isTouch); joyEl.classList.toggle("ez-hidden", !v); if (!v && joyId !== null) joyEnd(); },
    joy: joyEl,
  };
}
