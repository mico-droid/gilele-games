// Interior do carro: painel, volante que gira, quadro de instrumentos (canvas), colunas A sólidas,
// retrovisores renderizados de verdade (câmeras em baixa resolução) e alavanca de câmbio.
import { THREE, part, getMat } from "../../engine/ez.js";

const RT_LOW = { w: 192, h: 72 }, RT_SIDE = { w: 128, h: 96 };

export function createCockpit(world, car, { lowQuality = () => false, hideInMirrors = [], touch = false } = {}) {
  const g = new THREE.Group(); car.mesh.body.add(g); g.visible = false;
  const S = car.spec, ex = S.eye[0];
  const dark = "#1f2937", plastic = "#334155";
  // dashboard + cowl
  part(1.7, 0.2, 0.56, dark, 0, 0.92, 0.76, g, false);
  part(1.7, 0.04, 0.3, "#111827", 0, 1.03, 0.9, g, false);
  part(0.48, 0.07, 0.16, plastic, ex, 1.06, 0.53, g, false); // cluster brow
  // A-pillars (solid on purpose: real blind spot)
  [-1, 1].forEach((s) => { const p = part(0.075, 0.66, 0.1, plastic, s * 0.76, 1.2, 0.52, g, false); p.rotation.x = -0.8; });
  // roof, B pillars, door tops, rear seat and parcel shelf
  { const roof = new THREE.Mesh(new THREE.PlaneGeometry(1.56, 2.0), new THREE.MeshBasicMaterial({ color: 0x9ca3af, side: THREE.DoubleSide })); roof.rotation.x = Math.PI / 2; roof.position.set(0, 1.47, -0.35); g.add(roof); }
  [-1, 1].forEach((s) => { part(0.08, 0.5, 0.14, plastic, s * 0.78, 1.2, -0.5, g, false); part(0.06, 0.4, 2.3, "#475569", s * 0.82, 0.78, -0.3, g, false); part(0.08, 0.5, 0.24, plastic, s * 0.74, 1.18, -1.35, g, false); });
  part(1.4, 0.45, 0.45, "#64748b", 0, 0.7, -0.95, g, false); part(1.4, 0.06, 0.5, "#334155", 0, 1.0, -1.3, g, false);
  part(0.5, 0.5, 0.12, "#475569", -ex, 0.85, -0.25, g, false); // passenger seat back
  // floor / seats area (covers the body's top face seen from inside)
  part(1.6, 0.02, 1.95, "#1e293b", 0, 0.95, -0.5, g, false);
  part(0.5, 0.12, 0.5, "#334155", ex, 0.98, -0.2, g, false); part(0.5, 0.12, 0.5, "#334155", -ex, 0.98, -0.2, g, false);
  // central console + gear lever
  part(0.24, 0.16, 0.6, dark, 0, 1.0, 0.2, g, false);
  const lever = new THREE.Group(); lever.position.set(0.02, 1.07, 0.22); g.add(lever);
  part(0.03, 0.2, 0.03, "#111827", 0, 0.1, 0, lever, false); part(0.07, 0.07, 0.07, "#0f172a", 0, 0.22, 0, lever, false);
  // steering wheel
  const wheel = new THREE.Group(); wheel.position.set(ex, 0.9, 0.42); wheel.rotation.x = -1.2; g.add(wheel);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.02, 8, 28), getMat("#111827")); wheel.add(rim);
  const hub = new THREE.Group(); wheel.add(hub);
  part(0.07, 0.07, 0.04, "#334155", 0, 0, 0, hub, false);
  [0, 2.1, -2.1].forEach((a) => { const sp = part(0.17, 0.025, 0.02, "#1f2937", Math.cos(a - Math.PI / 2) * 0.09, Math.sin(a - Math.PI / 2) * 0.09, 0, hub, false); sp.rotation.z = a - Math.PI / 2; });
  part(0.05, 0.02, 0.025, "#facc15", 0, 0.18, 0.005, hub, false); // top marker
  // instrument cluster (canvas)
  const cv = document.createElement("canvas"); cv.width = 512; cv.height = 192; const cx = cv.getContext("2d");
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const cluster = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.158), new THREE.MeshBasicMaterial({ map: tex })); cluster.position.set(ex, 0.95, 0.47); cluster.rotation.set(-0.15, Math.PI, 0); g.add(cluster);
  // mirrors
  const mirrors = [];
  function mirror(name, w, h, pos, rt, camPos, yaw, fov) {
    const target = new THREE.WebGLRenderTarget(rt.w, rt.h); target.texture.colorSpace = THREE.SRGBColorSpace;
    target.texture.wrapS = THREE.RepeatWrapping; target.texture.repeat.x = -1; target.texture.offset.x = 1; // mirror flip
    const frame = part(w + 0.03, h + 0.03, 0.02, "#111827", pos[0], pos[1], pos[2] + 0.012, g, false);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: target.texture })); plane.position.set(...pos); plane.rotation.y = Math.PI; g.add(plane);
    const cam = new THREE.PerspectiveCamera(fov, rt.w / rt.h, 0.2, 220);
    const m = { name, plane, frame, target, cam, camPos: new THREE.Vector3(...camPos), yaw, pitch: -0.04, baseYaw: yaw, fov };
    mirrors.push(m); return m;
  }
  const inner = mirror("in", 0.27, 0.075, [0.02, 1.36, 0.48], RT_LOW, [0.02, 1.36, 0.42], 0, 24);
  const left = mirror("left", 0.17, 0.12, [0.95, 1.08, 0.495], RT_SIDE, [1.0, 1.08, 0.52], -0.2, 22);
  const right = mirror("right", 0.17, 0.12, [-0.95, 1.08, 0.495], RT_SIDE, [-1.0, 1.08, 0.52], 0.17, 22);
  // the exterior mirror housings are part of the car body; hide nothing.
  let frameN = 0, enabled = false, overlay = false;
  const q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, "YXZ"), wp = new THREE.Vector3();
  function placeCam(m) {
    car.mesh.body.updateWorldMatrix(true, false);
    wp.copy(m.camPos).applyMatrix4(car.mesh.body.matrixWorld); m.cam.position.copy(wp);
    car.mesh.body.getWorldQuaternion(q); e.set(m.pitch, m.yaw, 0); m.cam.quaternion.copy(q).multiply(new THREE.Quaternion().setFromEuler(e));
  }
  // exterior-camera mini mirrors (overlay scene)
  const oScene = new THREE.Scene(), oCam = new THREE.OrthographicCamera(0, 1, 1, 0, -1, 1);
  const mini = [left, right].map((m) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: m.target.texture, depthTest: false })); oScene.add(p); return p; });
  function layoutMini() {
    const W = innerWidth, H = innerHeight; oCam.right = W; oCam.top = H; oCam.updateProjectionMatrix();
    const w = Math.min(touch ? 130 : 170, W * 0.2), h = w * 0.72;
    // touch: top corners (the bottom has the pedals and the wheel); desktop: bottom corners
    const y = touch ? H - 60 - h / 2 : 70 + h / 2, xr = touch ? W - 140 - w / 2 : W - 12 - w / 2;
    mini[0].scale.set(w, h, 1); mini[0].position.set(12 + w / 2, y, 0); mini[1].scale.set(w, h, 1); mini[1].position.set(xr, y, 0);
    document.documentElement.style.setProperty("--ae-mirror-h", h + "px");
  }
  addEventListener("resize", layoutMini); layoutMini();

  function drawCluster() {
    const c = cx, W = 512, H = 192;
    c.fillStyle = "#020617"; c.fillRect(0, 0, W, H);
    const gauge = (x, val, max, label, fmt, red) => {
      c.strokeStyle = "#334155"; c.lineWidth = 10; c.beginPath(); c.arc(x, 110, 72, Math.PI * 0.8, Math.PI * 2.2); c.stroke();
      if (red) { c.strokeStyle = "#dc2626"; c.beginPath(); c.arc(x, 110, 72, Math.PI * (0.8 + 1.4 * red), Math.PI * 2.2); c.stroke(); }
      const a = Math.PI * 0.8 + Math.PI * 1.4 * Math.min(1, val / max);
      c.strokeStyle = "#f97316"; c.lineWidth = 5; c.beginPath(); c.moveTo(x, 110); c.lineTo(x + Math.cos(a) * 64, 110 + Math.sin(a) * 64); c.stroke();
      c.fillStyle = "#e2e8f0"; c.font = "700 30px Fredoka, system-ui"; c.textAlign = "center"; c.fillText(fmt, x, 150); c.font = "600 15px Fredoka, system-ui"; c.fillStyle = "#94a3b8"; c.fillText(label, x, 176);
    };
    gauge(110, car.rpm, 7000, "rpm ×1000", (car.rpm / 1000).toFixed(1), 6200 / 7000);
    gauge(402, car.kmh(), 160, "km/h", String(Math.round(car.kmh())));
    c.fillStyle = "#facc15"; c.font = "700 42px Fredoka, system-ui"; c.textAlign = "center"; c.fillText(car.gearLabel(), 256, 120);
    // warning lights
    const L = car.lights, blink = car.blinkOn;
    const icon = (x, y, txt, col, on) => { c.globalAlpha = on ? 1 : 0.12; c.fillStyle = col; c.font = "700 26px Fredoka, system-ui"; c.fillText(txt, x, y); c.globalAlpha = 1; };
    icon(200, 40, "◀", "#22c55e", (L.blinker < 0 || L.hazard) && blink);
    icon(312, 40, "▶", "#22c55e", (L.blinker > 0 || L.hazard) && blink);
    icon(256, 40, "(P)", "#ef4444", car.controls.handbrake > 0.5);
    icon(256, 74, "🪢", "#ef4444", !car.data.belt);
    icon(210, 170, "💡", "#3b82f6", L.head);
    icon(302, 170, "🔋", "#ef4444", !car.engineOn);
    tex.needsUpdate = true;
  }
  world.onBeforeRender(() => {
    if (!enabled && !overlay) return;
    frameN++;
    const low = lowQuality();
    if (enabled) {
      wheel.rotation.z = 0; hub.rotation.z = -car.steerAngle * 15 / 2.4;
      // lever position
      const gl = car.gearLabel(), map = { R: [-0.04, 0.05], N: [0, 0], "1": [-0.04, -0.05], "2": [-0.04, 0.05], "3": [0, -0.05], "4": [0, 0.05], "5": [0.04, -0.05], P: [0, -0.06], D: [0, 0.06] };
      const k = map[gl[0] === "D" ? "D" : gl] || [0, 0]; lever.rotation.z = k[0] * 4; lever.rotation.x = k[1] * 4;
      if (frameN % 4 === 0) drawCluster();
    }
    const every = low ? 3 : 2;
    if (frameN % every) return;
    const r = world.renderer, prevTarget = r.getRenderTarget(), wasShadow = r.shadowMap.autoUpdate;
    r.shadowMap.autoUpdate = false;
    const list = enabled ? (low ? [inner, left, right].filter((m, i) => i === frameN % 3 || i === 0) : [inner, left, right]) : [left, right];
    for (const p of mini) p.visible = overlay;
    g.visible = false; const hv = hideInMirrors.map((o) => o.visible); hideInMirrors.forEach((o) => (o.visible = false));
    for (const m of list) { placeCam(m); r.setRenderTarget(m.target); r.render(world.scene, m.cam); }
    g.visible = enabled; hideInMirrors.forEach((o, i) => (o.visible = hv[i]));
    r.setRenderTarget(prevTarget); r.shadowMap.autoUpdate = wasShadow;
  });
  world.onAfterRender(() => {
    if (!overlay) return;
    const r = world.renderer; const ac = r.autoClear; r.autoClear = false; r.clearDepth(); r.render(oScene, oCam); r.autoClear = ac;
  });
  return {
    group: g, mirrors, inner, left, right, wheel,
    setInterior(v) { enabled = v; g.visible = v; (car.mesh.glass || []).forEach((m) => (m.visible = !v)); },
    setOverlay(v) { overlay = v; },
    /** Adjust a mirror by drag (radians). */
    adjust(m, dyaw, dpitch) { m.yaw = Math.max(m.baseYaw - 0.35, Math.min(m.baseYaw + 0.35, m.yaw + dyaw)); m.pitch = Math.max(-0.3, Math.min(0.2, m.pitch + dpitch)); },
    eye: new THREE.Vector3(S.eye[0], S.eye[1], S.eye[2]),
  };
}
