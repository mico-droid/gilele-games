// Reusable scenery and gameplay props built from boxes (same blocky style as the avatars).
import * as THREE from "./three.js";
import { getMat, part, GEO } from "./core.js";
import { makeTextSprite } from "./avatar.js";

/** Big ground slab with collision (top at y=0 by default). */
export function addGround(world, phys, { size = 200, color = 0x6cc04a, y = 0 } = {}) {
  return phys.addBox({ x: 0, y: y - 0.5, z: 0, w: size, h: 1, d: size, color, scene: world.scene, castShadow: false });
}
export function addTree(world, phys, x, z, s = 1, y = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); world.scene.add(g);
  part(0.6, 2.4, 0.6, "#8b5a2b", 0, 1.2, 0, g);
  part(2.4, 1.6, 2.4, "#16a34a", 0, 3.0, 0, g); part(1.6, 1.0, 1.6, "#22c55e", 0, 4.1, 0, g);
  if (phys) phys.addBox({ x, y: y + 1.2 * s, z, w: 0.6 * s, h: 2.4 * s, d: 0.6 * s, mesh: false });
  return g;
}
export function addCloud(world, x, y, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); world.scene.add(g);
  [[0, 0, 0, 4, 1.4, 2.4], [1.6, 0.6, 0.2, 2.4, 1.2, 2], [-1.5, 0.4, -0.2, 2.2, 1, 1.8]].forEach(([a, b, c, w, h, d]) => {
    const m = new THREE.Mesh(GEO.box, getMat("#ffffff")); m.scale.set(w, h, d); m.position.set(a, b, c); g.add(m);
  });
  return g;
}
/** Trampoline: bounce box. power = jump velocity. */
export function addTrampoline(world, phys, x, z, { y = 0, power = 24, size = 3 } = {}) {
  part(size, 0.3, size, "#1f2937", x, y + 0.15, z, world.scene);
  return phys.addBox({ x, y: y + 0.4, z, w: size * 0.9, h: 0.2, d: size * 0.9, color: "#ef4444", type: "bounce", power, scene: world.scene });
}
/** Wooden sign with text facing +Z (rotate with ry). */
export function addSign(world, text, x, y, z, ry = 0, { width = 4 } = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; world.scene.add(g);
  part(0.2, 2, 0.2, "#8b5a2b", 0, 1, 0, g);
  part(width, 1.2, 0.15, "#d97706", 0, 2.4, 0, g);
  const cv = document.createElement("canvas"); cv.width = 512; cv.height = 154; const c = cv.getContext("2d");
  c.fillStyle = "#fef3c7"; c.fillRect(0, 0, 512, 154); c.fillStyle = "#78350f"; c.textAlign = "center"; c.textBaseline = "middle";
  let fs = 64; c.font = `700 ${fs}px Fredoka, system-ui`; while (c.measureText(text).width > 480 && fs > 24) { fs -= 4; c.font = `700 ${fs}px Fredoka, system-ui`; }
  c.fillText(text, 256, 80);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.94, 1.08), new THREE.MeshBasicMaterial({ map: tex }));
  face.position.set(0, 2.4, 0.08); g.add(face);
  const back = face.clone(); back.position.z = -0.08; back.rotation.y = Math.PI; g.add(back);
  return g;
}
/**
 * Collectible coins. Returns { list, update(dt, px, py, pz) → number collected this frame, reset() }.
 */
export function createCoins(world) {
  const geo = new THREE.CylinderGeometry(0.5, 0.5, 0.14, 20);
  const mat = new THREE.MeshLambertMaterial({ color: 0xfacc15, emissive: 0xb45309, emissiveIntensity: 0.35 });
  const list = [];
  return {
    list,
    add(x, y, z) { const m = new THREE.Mesh(geo, mat); m.rotation.x = Math.PI / 2; m.position.set(x, y, z); m.castShadow = true; world.scene.add(m); list.push({ x, y, z, m, got: false }); },
    update(dt, px, py, pz) {
      let n = 0;
      for (const c of list) {
        if (c.got) continue;
        c.m.rotation.z += dt * 3; c.m.position.y = c.y + Math.sin(performance.now() / 400 + c.x) * 0.15;
        if (Math.abs(px - c.x) < 0.9 && Math.abs(pz - c.z) < 0.9 && py < c.y + 0.6 && py + 2.7 > c.y - 0.4) { c.got = true; c.m.visible = false; n++; }
      }
      return n;
    },
    reset() { list.forEach((c) => { c.got = false; c.m.visible = true; }); },
    get left() { return list.filter((c) => !c.got).length; },
  };
}
/** Checkpoint flag: trigger box that calls onReach once (until reset). */
export function addCheckpoint(world, phys, x, top, z, onReach) {
  const g = new THREE.Group(); g.position.set(x, top, z); world.scene.add(g);
  part(0.15, 3, 0.15, "#e5e7eb", 0, 1.5, 0, g);
  const flagMat = new THREE.MeshLambertMaterial({ color: 0x9ca3af });
  const f = new THREE.Mesh(GEO.box, flagMat); f.scale.set(1.2, 0.8, 0.06); f.position.set(0.65, 2.55, 0); g.add(f);
  const cp = { x, y: top, z, reached: false, g, flagMat };
  phys.addBox({ x, y: top + 1.5, z, w: 3, h: 3, d: 3, type: "trigger", onEnter: () => { if (cp.reached) return; cp.reached = true; flagMat.color.set(0x22c55e); onReach && onReach(cp); } });
  cp.reset = () => { cp.reached = false; flagMat.color.set(0x9ca3af); };
  return cp;
}
/** Floating label in the world (always faces camera). */
export function addLabel(world, text, x, y, z, opt) { const s = makeTextSprite(text, opt); s.position.set(x, y, z); world.scene.add(s); return s; }
/** Platform that moves between two points. Call update(t) every frame BEFORE stepping bodies. */
export function addMover(phys, a, b, { w = 4, h = 1, d = 4, color = "#a855f7", period = 4, scene } = {}) {
  const box = phys.addBox({ x: a[0], y: a[1], z: a[2], w, h, d, color, scene });
  return {
    box,
    update(t) { const k = (1 - Math.cos((t / period) * Math.PI * 2)) / 2; phys.moveBox(box, a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k); },
  };
}
