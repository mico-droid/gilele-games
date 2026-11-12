// Core: renderer, scene, lights, resize, game loop, pause and automatic quality for phones.
import * as THREE from "./three.js";
import { shared } from "./storage.js";

export const isTouch = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
export const isMobile = isTouch && Math.min(screen.width, screen.height) < 820;

const UNIT = new THREE.BoxGeometry(1, 1, 1);
const matCache = new Map();
/** Cached Lambert material by color (+ optional emissive intensity). */
export function getMat(color, emissive = 0) {
  const key = color + "|" + emissive;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color });
    if (emissive) { m.emissive = new THREE.Color(color); m.emissiveIntensity = emissive; }
    matCache.set(key, m);
  }
  return m;
}
export const GEO = {
  box: UNIT,
  cyl: new THREE.CylinderGeometry(1, 1, 1, 20),
  sphere: new THREE.SphereGeometry(1, 16, 12),
};
/** Add a scaled unit box to parent (used by avatars and props). */
export function part(w, h, d, color, x, y, z, parent, shadow = true) {
  const m = new THREE.Mesh(UNIT, getMat(color));
  m.scale.set(w, h, d); m.position.set(x, y, z);
  if (shadow) m.castShadow = true;
  parent.add(m);
  return m;
}

/**
 * createWorld({ canvas, sky, fog:[near,far], shadows, shadowSize })
 * Returns { THREE, renderer, scene, camera, sun, hemi, onUpdate(fn), start(), setPaused(b), paused, quality, setQuality(q), followSun(x,y,z) }
 */
export function createWorld(opt = {}) {
  const canvas = opt.canvas || document.querySelector("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, powerPreference: "high-performance" });
  renderer.shadowMap.enabled = opt.shadows !== false;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const sky = new THREE.Color(opt.sky ?? 0xaee6ff);
  scene.background = sky;
  if (opt.fog !== false) { const f = opt.fog || [40, 160]; scene.fog = new THREE.Fog(sky, f[0], f[1]); }

  const camera = new THREE.PerspectiveCamera(opt.fov || 65, 1, 0.1, opt.far || 400);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x5b6b80, 2.4);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.6);
  sun.position.set(18, 30, 12);
  sun.castShadow = true;
  const S = opt.shadowRange || 30, sc = sun.shadow.camera;
  sc.left = -S; sc.right = S; sc.top = S; sc.bottom = -S; sc.near = 1; sc.far = 120;
  sun.shadow.bias = -0.0008;
  scene.add(sun, sun.target);
  const sunOffset = sun.position.clone();

  // ---- quality: auto | low | high
  let quality = shared.get("quality", "auto");
  let level = isMobile ? 0 : 1; // effective: 0 low, 1 high
  function applyQuality() {
    const lv = quality === "low" ? 0 : quality === "high" ? 1 : level;
    const dpr = window.devicePixelRatio || 1;
    renderer.setPixelRatio(Math.min(dpr, lv ? 1.6 : 1));
    sun.shadow.mapSize.set(lv ? 2048 : 1024, lv ? 2048 : 1024);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    resize();
  }
  function setQuality(q) { quality = q; shared.set("quality", q); applyQuality(); }

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    resizeFns.forEach((f) => f(w, h));
  }
  const resizeFns = [];
  addEventListener("resize", resize);
  addEventListener("orientationchange", () => setTimeout(resize, 200));

  // ---- loop
  const updates = [];
  let paused = false, running = false, last = 0;
  let fpsAcc = 0, fpsN = 0, fpsT = 0;
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    if (!paused) for (const fn of updates) fn(dt, now / 1000);
    renderer.render(scene, camera);
    // auto quality: drop to low if the device can't keep ~40fps
    if (quality === "auto" && level === 1) {
      fpsAcc += dt; fpsN++; fpsT += dt;
      if (fpsT > 4) { if (fpsN / fpsAcc < 40) { level = 0; applyQuality(); } fpsAcc = fpsN = fpsT = 0; }
    }
  }
  document.addEventListener("visibilitychange", () => { last = performance.now(); });

  applyQuality();
  return {
    THREE, renderer, scene, camera, sun, hemi,
    get paused() { return paused; },
    get quality() { return quality; },
    setQuality,
    setPaused(b) { paused = !!b; },
    onUpdate(fn) { updates.push(fn); return () => updates.splice(updates.indexOf(fn), 1); },
    onResize(fn) { resizeFns.push(fn); },
    start() { if (running) return; running = true; last = performance.now(); requestAnimationFrame(frame); },
    /** Keep the shadow camera centered on the player. */
    followSun(x, y, z) { sun.position.set(x + sunOffset.x, y + sunOffset.y, z + sunOffset.z); sun.target.position.set(x, y, z); },
    resize,
  };
}
