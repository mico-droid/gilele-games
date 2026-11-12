// Vehicles: arcade-calibrated car simulation (engine + clutch + gearbox manual/automatic, brakes, slopes,
// bicycle-model steering, OBB collisions) and blocky meshes for car / moto / bus / truck.
// Units are meters and seconds. heading h: forward = (sin h, cos h) on the XZ plane (same as avatars).
//
//   const car = createVehicle(world, { phys, ground: road.groundAt, transmission: "manual" });
//   car.controls.throttle = 0.4; car.step(dt) → events { stalled, started, jolt, grind, collided, curb }
//
// AI / remote vehicles: createVehicle(world, { kind: "moto", ai: true }) then car.setPose(x, z, h, speed) each frame.
import * as THREE from "./three.js";
import { getMat, part, GEO } from "./core.js";
import { Audio } from "./audio.js";

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const RPM = 60 / TAU; // rad/s → rpm

/** Physical specs. Gear index: -1 = R, 0 = N, 1..5. */
export const VEHICLE_SPECS = {
  car: {
    mass: 1050, wheelR: 0.29, wheelbase: 2.47, halfL: 1.95, halfW: 0.86, height: 1.5,
    ratios: { "-1": 3.55, 1: 3.73, 2: 2.05, 3: 1.32, 4: 0.97, 5: 0.76 }, final: 4.25,
    idle: 850, stall: 480, redline: 6200, maxTorque: 98, peakRpm: 3800, engineInertia: 0.17,
    clutchTorque: 190, brakeForce: 10500, handbrakeForce: 4200, drag: 0.38, rolling: 140, maxSteer: 0.58,
    eye: [0.36, 1.2, -0.08], // driver's eyes (x right of center = Brazil left-hand drive → driver on the left: x>0 is LEFT side)
  },
  bus: { mass: 11000, wheelR: 0.5, wheelbase: 6.2, halfL: 6, halfW: 1.25, height: 3.1, maxSteer: 0.6 },
  truck: { mass: 9000, wheelR: 0.5, wheelbase: 5, halfL: 4.6, halfW: 1.2, height: 3.2, maxSteer: 0.6 },
  moto: { mass: 180, wheelR: 0.3, wheelbase: 1.4, halfL: 1.0, halfW: 0.38, height: 1.5, maxSteer: 0.7 },
};

// ------------------------------------------------------------------ sounds (synthesized)
Audio.addSfx("starter", ({ tone, noise, now }) => { const n = now(); for (let i = 0; i < 5; i++) tone("sawtooth", 70 + (i % 2) * 15, n + i * 0.11, 0.1, 0.12); noise(n, 0.5, 0.05, undefined, 400); });
Audio.addSfx("stall", ({ tone, now }) => { const n = now(); tone("sawtooth", 60, n, 0.35, 0.2, undefined, 25); });
Audio.addSfx("grind", ({ noise, tone, now }) => { const n = now(); noise(n, 0.35, 0.35, undefined, 2500); tone("square", 180, n, 0.3, 0.08, undefined, 140); });
Audio.addSfx("crash", ({ noise, tone, now }) => { const n = now(); noise(n, 0.45, 0.6, undefined, 150); tone("square", 90, n, 0.3, 0.25, undefined, 40); });
Audio.addSfx("curb", ({ tone, noise, now }) => { const n = now(); tone("triangle", 110, n, 0.12, 0.35, undefined, 60); noise(n, 0.08, 0.2, undefined, 300); });
Audio.addSfx("tick", ({ tone, now }) => tone("square", 2400, now(), 0.015, 0.06));
Audio.addSfx("tock", ({ tone, now }) => tone("square", 1700, now(), 0.015, 0.05));

// ------------------------------------------------------------------ meshes
const glass = "#1e293b";
function wheel(parent, x, y, z, r, w) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  const t = new THREE.Mesh(GEO.cyl, getMat("#111827")); t.rotation.z = Math.PI / 2; t.scale.set(r, w, r); t.castShadow = true; g.add(t);
  const hub = new THREE.Mesh(GEO.cyl, getMat("#cbd5e1")); hub.rotation.z = Math.PI / 2; hub.scale.set(r * 0.55, w + 0.02, r * 0.55); g.add(hub);
  const spoke = part(0.06, r * 1.3, 0.06, "#64748b", 0, 0, 0, g, false); spoke.scale.x = w + 0.04;
  return g;
}
function lamp(parent, w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(GEO.box, new THREE.MeshLambertMaterial({ color, emissive: new THREE.Color(color), emissiveIntensity: 0 }));
  m.scale.set(w, h, d); m.position.set(x, y, z); parent.add(m); return m;
}

/** Build a blocky vehicle model facing +Z. Returns parts used for animation (wheels, lamps, steering). */
export function buildVehicleMesh(kind = "car", color = "#f8fafc", opt = {}) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const P = { root, body, wheels: [], front: [], lamps: {} };
  if (kind === "moto") {
    P.wheels.push(wheel(body, 0, 0.3, 0.62, 0.3, 0.12), wheel(body, 0, 0.3, -0.62, 0.3, 0.14)); P.front.push(P.wheels[0]);
    part(0.28, 0.3, 1.0, color, 0, 0.68, 0.05, body); part(0.3, 0.16, 0.6, "#111827", 0, 0.88, -0.25, body);
    part(0.7, 0.06, 0.06, "#111827", 0, 1.05, 0.5, body);
    P.lamps.head = lamp(body, 0.16, 0.12, 0.05, "#fef9c3", 0, 0.92, 0.6);
    P.lamps.brake = lamp(body, 0.14, 0.08, 0.04, "#ef4444", 0, 0.8, -0.58);
    P.lamps.bl = [lamp(body, 0.06, 0.06, 0.06, "#f59e0b", 0.16, 0.8, -0.56), lamp(body, 0.06, 0.06, 0.06, "#f59e0b", 0.32, 1.02, 0.5)];
    P.lamps.br = [lamp(body, 0.06, 0.06, 0.06, "#f59e0b", -0.16, 0.8, -0.56), lamp(body, 0.06, 0.06, 0.06, "#f59e0b", -0.32, 1.02, 0.5)];
    // rider (blocky) with helmet
    const rc = opt.rider || "#334155";
    part(0.42, 0.55, 0.3, rc, 0, 1.28, -0.12, body); part(0.36, 0.36, 0.38, opt.helmet || "#ef4444", 0, 1.72, -0.08, body);
    part(0.3, 0.12, 0.04, "#0f172a", 0, 1.72, 0.12, body, false);
    [-1, 1].forEach((s) => { part(0.12, 0.12, 0.55, rc, s * 0.22, 1.25, 0.2, body); part(0.14, 0.42, 0.14, "#1f2937", s * 0.2, 0.78, 0.05, body); });
    return P;
  }
  if (kind === "bus" || kind === "truck") {
    const L = kind === "bus" ? 12 : 9.2, W = 2.5, H = kind === "bus" ? 3.1 : 3.2;
    if (kind === "bus") {
      part(W, H - 0.5, L, color, 0, 0.45 + (H - 0.5) / 2, 0, body);
      part(W + 0.02, 0.9, L * 0.86, glass, 0, 2.2, -0.2, body, false);
      part(W - 0.2, 1.2, 0.05, glass, 0, 2.0, L / 2 + 0.01, body, false);
      part(W + 0.03, 0.25, L, "#facc15", 0, 1.25, 0, body, false);
    } else {
      part(W, 2.2, 2.2, color, 0, 1.6, L / 2 - 1.1, body); part(W - 0.2, 0.8, 0.05, glass, 0, 2.2, L / 2 + 0.01, body, false);
      part(W, 2.7, L - 2.6, "#e2e8f0", 0, 1.85, -1.2, body);
    }
    const zf = L / 2 - 1.4, zr = -L / 2 + 2.2;
    [[1, zf], [-1, zf], [1, zr], [-1, zr]].forEach(([s, z]) => P.wheels.push(wheel(body, s * (W / 2 - 0.15), 0.5, z, 0.5, 0.3)));
    P.front.push(P.wheels[0], P.wheels[1]);
    P.lamps.head = lamp(body, W - 0.4, 0.18, 0.05, "#fef9c3", 0, 0.8, L / 2 + 0.02);
    P.lamps.brake = lamp(body, W - 0.3, 0.16, 0.05, "#ef4444", 0, 0.9, -L / 2 - 0.02);
    P.lamps.bl = [lamp(body, 0.2, 0.18, 0.06, "#f59e0b", W / 2 - 0.15, 0.95, -L / 2 - 0.03), lamp(body, 0.2, 0.18, 0.06, "#f59e0b", W / 2 - 0.15, 0.95, L / 2 + 0.03)];
    P.lamps.br = [lamp(body, 0.2, 0.18, 0.06, "#f59e0b", -W / 2 + 0.15, 0.95, -L / 2 - 0.03), lamp(body, 0.2, 0.18, 0.06, "#f59e0b", -W / 2 + 0.15, 0.95, L / 2 + 0.03)];
    return P;
  }
  // car: compact hatch (3.9 × 1.72 m)
  part(1.72, 0.62, 3.9, color, 0, 0.62, 0, body);
  part(1.66, 0.12, 1.25, color, 0, 0.98, 1.3, body); // hood
  const cab = part(1.56, 0.56, 2.05, color, 0, 1.22, -0.35, body);
  part(1.58, 0.42, 1.7, glass, 0, 1.2, -0.38, body, false); // side windows band
  const ws = part(1.5, 0.5, 0.05, glass, 0, 1.2, 0.69, body, false); ws.rotation.x = -0.45; // windshield
  const rw = part(1.5, 0.42, 0.05, glass, 0, 1.2, -1.39, body, false);
  P.glass = [ws, rw]; // hidden from the driver's seat (see-through)
  part(1.76, 0.18, 0.12, "#334155", 0, 0.45, 1.96, body); part(1.76, 0.18, 0.12, "#334155", 0, 0.45, -1.96, body); // bumpers
  P.cabin = cab;
  [[1, 1.25], [-1, 1.25], [1, -1.22], [-1, -1.22]].forEach(([s, z]) => P.wheels.push(wheel(body, s * 0.78, 0.29, z, 0.29, 0.2)));
  P.front.push(P.wheels[0], P.wheels[1]);
  P.lamps.head = [lamp(body, 0.36, 0.14, 0.04, "#fef9c3", 0.6, 0.78, 1.96), lamp(body, 0.36, 0.14, 0.04, "#fef9c3", -0.6, 0.78, 1.96)];
  P.lamps.brake = [lamp(body, 0.3, 0.14, 0.04, "#ef4444", 0.66, 0.82, -1.96), lamp(body, 0.3, 0.14, 0.04, "#ef4444", -0.66, 0.82, -1.96)];
  P.lamps.rev = lamp(body, 0.14, 0.1, 0.04, "#f8fafc", 0.35, 0.82, -1.96);
  P.lamps.bl = [lamp(body, 0.12, 0.1, 0.05, "#f59e0b", 0.8, 0.78, 1.96), lamp(body, 0.12, 0.1, 0.05, "#f59e0b", 0.8, 0.98, -1.96), lamp(body, 0.05, 0.06, 0.16, "#f59e0b", 0.87, 0.78, 1.2)];
  P.lamps.br = [lamp(body, 0.12, 0.1, 0.05, "#f59e0b", -0.8, 0.78, 1.96), lamp(body, 0.12, 0.1, 0.05, "#f59e0b", -0.8, 0.98, -1.96), lamp(body, 0.05, 0.06, 0.16, "#f59e0b", -0.87, 0.78, 1.2)];
  // exterior mirrors
  [-1, 1].forEach((s) => part(0.2, 0.14, 0.08, color, s * 0.94, 1.08, 0.55, body));
  if (opt.roofSign) {
    const cv = document.createElement("canvas"); cv.width = 256; cv.height = 64; const c = cv.getContext("2d");
    c.fillStyle = "#facc15"; c.fillRect(0, 0, 256, 64); c.fillStyle = "#111827"; c.font = "700 34px Fredoka, system-ui"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(opt.roofSign, 128, 34);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.MeshLambertMaterial({ map: tex });
    const sign = new THREE.Mesh(GEO.box, [getMat("#facc15"), getMat("#facc15"), getMat("#facc15"), getMat("#facc15"), m, m]);
    sign.scale.set(0.9, 0.24, 0.3); sign.position.set(0, 1.62, -0.3); sign.rotation.y = Math.PI / 2; body.add(sign);
    P.sign = sign;
  }
  return P;
}

// ------------------------------------------------------------------ collision (2D oriented boxes)
function corners(x, z, h, hl, hw) {
  const fx = Math.sin(h), fz = Math.cos(h), rx = -fz, rz = fx;
  return [[x + fx * hl + rx * hw, z + fz * hl + rz * hw], [x + fx * hl - rx * hw, z + fz * hl - rz * hw], [x - fx * hl - rx * hw, z - fz * hl - rz * hw], [x - fx * hl + rx * hw, z - fz * hl + rz * hw]];
}
/** SAT between two convex quads (corner lists). Returns {nx, nz, depth} pushing A out of B, or null. */
export function satQuad(A, B) {
  let best = null;
  for (const P of [A, B]) for (let i = 0; i < 4; i++) {
    const p = P[i], q = P[(i + 1) % 4]; let nx = q[1] - p[1], nz = p[0] - q[0]; const l = Math.hypot(nx, nz); nx /= l; nz /= l;
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const c of A) { const d = c[0] * nx + c[1] * nz; a0 = Math.min(a0, d); a1 = Math.max(a1, d); }
    for (const c of B) { const d = c[0] * nx + c[1] * nz; b0 = Math.min(b0, d); b1 = Math.max(b1, d); }
    const o = Math.min(a1 - b0, b1 - a0); if (o <= 0) return null;
    if (!best || o < best.depth) { const s = a1 - b0 < b1 - a0 ? -1 : 1; best = { nx: nx * s, nz: nz * s, depth: o }; }
  }
  return best;
}

// ------------------------------------------------------------------ vehicle
/**
 * createVehicle(world, { phys, ground(x,z)→{y,type}, kind, color, transmission:"manual"|"auto", x, z, heading, ai, roofSign, fleet })
 * Returned object: state fields (x,y,z,heading,speed,rpm,gear,engineOn…), controls {throttle,brake,clutch,steer,handbrake},
 * lights {blinker:-1|0|1, hazard, head}, shift(g), startEngine(), stopEngine(), step(dt), setPose(), corners(), dispose().
 */
export function createVehicle(world, o = {}) {
  const kind = o.kind || "car";
  const S = Object.assign({}, VEHICLE_SPECS.car, VEHICLE_SPECS[kind] || {}, o.spec || {});
  const mesh = buildVehicleMesh(kind, o.color, o);
  world.scene.add(mesh.root);
  const ground = o.ground || (() => ({ y: 0, type: "road" }));
  const fleet = o.fleet || (world.vehicles ||= new Set());
  const v = {
    kind, spec: S, mesh, ai: !!o.ai, fleet,
    x: o.x || 0, y: 0, z: o.z || 0, heading: o.heading || 0, pitch: 0, speed: 0, yawRate: 0,
    rpm: 0, w: 0, gear: 0, autoMode: "P", autoGear: 1, transmission: o.transmission || "manual",
    engineOn: false, cranking: 0, steerAngle: 0, clutchEngage: 0, surface: "road", wheelRot: 0, odometer: 0,
    controls: { throttle: 0, brake: 0, clutch: 0, steer: 0, handbrake: 1 },
    lights: { blinker: 0, hazard: false, head: false },
    blinkPhase: 0, blinkOn: false, brakeLit: false, sound: null, assistClutch: false, data: o.data || {},
  };
  fleet.add(v);
  if (v.transmission === "auto") v.autoMode = "P";

  v.setTransmission = (t) => { v.transmission = t; v.gear = 0; v.autoMode = "P"; };
  v.ratio = () => {
    if (v.transmission === "auto") { if (v.autoMode === "R") return -S.ratios[-1] * S.final; if (v.autoMode === "D") return S.ratios[v.autoGear] * S.final; return 0; }
    if (v.gear === 0) return 0; return (v.gear < 0 ? -S.ratios[-1] : S.ratios[v.gear]) * S.final;
  };
  /** Manual: shift(-1..5) needs clutch pressed (except to neutral). Auto: shift("P"|"R"|"N"|"D") needs brake to leave P. */
  v.shift = (g) => {
    if (v.transmission === "auto") {
      if (!["P", "R", "N", "D"].includes(g) || g === v.autoMode) return true;
      if (v.autoMode === "P" && v.controls.brake < 0.2 && v.engineOn) { v._ev.needBrake = true; return false; }
      if ((g === "R" && v.speed > 1) || (g === "P" && Math.abs(v.speed) > 0.5)) { v._ev.grind = true; Audio.play("grind"); return false; }
      v.autoMode = g; v.locked = false; if (g === "D") v.autoGear = 1; Audio.play("click"); return true;
    }
    if (g === v.gear) return true;
    if (g !== 0 && v.clutchEngage > 0.35 && !v.assistClutch) { v._ev.grind = true; Audio.play("grind"); return false; }
    if (g === -1 && v.speed > 1.2) { v._ev.grind = true; Audio.play("grind"); return false; }
    v.gear = g; v.locked = false; Audio.play("click"); return true;
  };
  v.startEngine = () => {
    if (v.engineOn || v.cranking > 0) return;
    if (v.transmission === "manual" && v.gear !== 0 && v.clutchEngage > 0.3) { // started in gear without clutch → jolt
      v._ev.jolt = true; v.speed += Math.sign(v.ratio()) * 0.9; Audio.play("stall"); return;
    }
    if (v.transmission === "auto" && v.autoMode !== "P" && v.autoMode !== "N") { v._ev.needPN = true; return; }
    v.cranking = 0.55; Audio.play("starter");
  };
  v.stopEngine = () => { v.engineOn = false; v.cranking = 0; };
  v._ev = {};
  v.corners = (pad = 0) => corners(v.x, v.z, v.heading, S.halfL + pad, S.halfW + pad);
  v.forward = () => ({ x: Math.sin(v.heading), z: Math.cos(v.heading) });

  function engineTorque(rpm, thr) {
    if (rpm > S.redline) return 0;
    const k = clamp(1 - Math.pow((rpm - S.peakRpm) / 5200, 2), 0.45, 1);
    return S.maxTorque * k * thr;
  }

  function placeOnGround(dt) {
    const fx = Math.sin(v.heading), fz = Math.cos(v.heading), hb = S.wheelbase / 2;
    const gf = ground(v.x + fx * hb, v.z + fz * hb), gr = ground(v.x - fx * hb, v.z - fz * hb), gc = ground(v.x, v.z);
    const yT = (gf.y + gr.y) / 2;
    v.y = dt ? v.y + (yT - v.y) * Math.min(1, dt * 20) : yT;
    v.pitch = Math.atan2(gf.y - gr.y, S.wheelbase);
    return gc;
  }

  /** Kinematic pose (AI traffic / remote players). */
  v.setPose = (x, z, h, speed = 0, dt = 0.016) => {
    v.x = x; v.z = z; v.heading = h; v.speed = speed; placeOnGround(dt); v.updateMesh(dt);
  };

  v.step = (dt) => {
    const ev = v._ev; v._ev = {};
    const c = v.controls;
    // ---- pedals
    if (v.transmission === "manual") {
      let pedal = c.clutch;
      if (v.assistClutch) pedal = Math.abs(v.speed) < 2.5 && v.gear !== 0 && c.throttle < 0.05 && c.brake > 0.05 ? 1 : Math.max(pedal, clamp(1 - (v.rpm - 900) / 700, 0, 1) * (Math.abs(v.speed) < 4 ? 1 : 0));
      v.clutchEngage = smooth(0.85, 0.15, pedal); // pedal 0 = released (engaged), 1 = fully pressed
    } else v.clutchEngage = 1;
    // ---- starter
    if (v.cranking > 0) { v.cranking -= dt; if (v.cranking <= 0) { v.engineOn = true; v.w = (S.idle + 150) / RPM; ev.started = true; } }
    const sub = Math.max(6, Math.ceil(dt / 0.0025)), h = dt / sub, g = 9.81; // small steps keep the clutch model stable
    const G = v.ratio();
    for (let i = 0; i < sub; i++) {
      const wIn = (v.speed / S.wheelR) * G; // transmission input speed (rad/s)
      const rpm = v.w * RPM;
      let thr = c.throttle;
      if (v.engineOn) thr = Math.max(thr, clamp(0.16 + (S.idle - rpm) * 0.003, 0, 0.9)); // idle controller (anti-stall help)
      const Te = v.engineOn ? engineTorque(rpm, thr) : 0;
      const Tf = ((v.engineOn ? 8 : 14) + 0.012 * Math.abs(v.w)) * clamp(v.w, -1, 1);
      const Fg = -S.mass * g * Math.sin(v.pitch);
      const Fd = -S.drag * v.speed * Math.abs(v.speed) - (Math.abs(v.speed) > 0.05 ? Math.sign(v.speed) * S.rolling : 0);
      let Fb = c.brake * S.brakeForce + c.handbrake * S.handbrakeForce;
      if (v.transmission === "auto" && v.autoMode === "P") Fb += 30000;
      if (v.surface === "lot" || v.surface === "off") Fb += 600; // grass drag
      const cap = Math.pow(v.clutchEngage, 3) * S.clutchTorque; // progressive bite
      const k = (G * 0.9) / S.wheelR; // wheel force per unit clutch torque
      let vf;
      if (v.locked && G !== 0 && v.transmission === "manual") {
        // clutch fully engaged: engine and car move together (combined inertia)
        const mEff = S.mass + S.engineInertia * (G / S.wheelR) * (G / S.wheelR) / 0.9;
        vf = v.speed + (h * ((Te - Tf) * k + Fg + Fd)) / mEff;
        const aW = ((vf - v.speed) / h / S.wheelR) * G;
        const Treq = Te - Tf - S.engineInertia * aW;
        if (Math.abs(Treq) > cap) v.locked = false;
      } else {
        let Tc = 0;
        if (G !== 0) {
          if (v.transmission === "auto") Tc = clamp(0.0013 * Math.max(v.w, 0) * (v.w - wIn), -60, 140); // fluid coupling
          else Tc = clamp(30 * (v.w - wIn), -cap, cap);
        }
        v.w += (h * (Te - Tf - Tc)) / S.engineInertia;
        if (v.w < 0 && !(v.transmission === "manual" && G !== 0 && v.clutchEngage > 0.5)) v.w = 0;
        vf = v.speed + (h * (Tc * k + Fg + Fd)) / S.mass;
      }
      const dec = (h * Fb) / S.mass;
      if (Math.abs(vf) <= dec) vf = 0; else vf -= Math.sign(vf) * dec;
      v.speed = vf;
      const wIn2 = (v.speed / S.wheelR) * G;
      if (v.transmission === "manual" && G !== 0) {
        if (v.locked) v.w = wIn2;
        else if (v.clutchEngage > 0.97 && Math.abs(v.w - wIn2) < 4) { v.locked = true; v.w = wIn2; }
        if (v.clutchEngage < 0.97) v.locked = false;
      } else v.locked = false;
    }
    v.rpm = v.w * RPM;
    if (v.engineOn && v.rpm < S.stall && v.transmission === "manual") { v.engineOn = false; ev.stalled = true; Audio.play("stall"); }
    // ---- automatic gear selection
    if (v.transmission === "auto" && v.autoMode === "D" && v.engineOn) {
      const wheelRpm = (Math.abs(v.speed) / S.wheelR) * S.final * RPM;
      const up = 2200 + 2600 * c.throttle, down = 1250 + 900 * c.throttle;
      if (v.autoGear < 5 && wheelRpm * S.ratios[v.autoGear] > up) v.autoGear++;
      else if (v.autoGear > 1 && wheelRpm * S.ratios[v.autoGear] < down) v.autoGear--;
    }
    // ---- steering (bicycle model)
    const target = clamp(c.steer, -1, 1) * S.maxSteer;
    v.steerAngle += clamp(target - v.steerAngle, -2.6 * dt, 2.6 * dt);
    let yaw = (v.speed / S.wheelbase) * Math.tan(v.steerAngle);
    const maxYaw = 8.5 / Math.max(1, Math.abs(v.speed)); yaw = clamp(yaw, -maxYaw, maxYaw); // grip limit
    v.yawRate = yaw;
    const px = v.x, pz = v.z, ph = v.heading;
    v.heading += yaw * dt;
    v.x += Math.sin(v.heading) * v.speed * dt; v.z += Math.cos(v.heading) * v.speed * dt;
    v.odometer += Math.abs(v.speed) * dt;
    // ---- collisions
    collide(ev, px, pz, ph);
    // ---- ground / curb
    const prevSurf = v.surface;
    const gc = placeOnGround(dt);
    v.surface = gc.type;
    if (prevSurf === "road" && (gc.type === "sidewalk" || gc.type === "lot") && Math.abs(v.speed) > 0.3) { ev.curb = true; v.speed *= 0.82; Audio.play("curb"); }
    v.updateMesh(dt);
    if (v.sound) v.sound.set(Math.max(28, v.rpm / 30), v.engineOn ? 0.05 + c.throttle * 0.08 : 0);
    return ev;
  };

  function collide(ev, px, pz, ph) {
    const me = v.corners();
    let hit = null;
    // static boxes (buildings, poles, trees) from phys
    if (o.phys) for (const b of o.phys.query(v.x, v.z, S.halfL + 1)) {
      if (b.type !== "solid" || b.noCar) continue;
      if (b.max[1] < v.y + 0.35 || b.min[1] > v.y + S.height) continue;
      const B = [[b.min[0], b.min[2]], [b.max[0], b.min[2]], [b.max[0], b.max[2]], [b.min[0], b.max[2]]];
      const r = satQuad(me, B); if (r) { v.x += r.nx * r.depth; v.z += r.nz * r.depth; hit = { other: b, r }; }
    }
    for (const u of fleet) {
      if (u === v || Math.abs(u.x - v.x) > 14 || Math.abs(u.z - v.z) > 14) continue;
      const r = satQuad(v.corners(), u.corners()); if (!r) continue;
      v.x += r.nx * r.depth; v.z += r.nz * r.depth; hit = { other: u, r };
    }
    if (hit) {
      const f = v.forward(), dot = f.x * hit.r.nx + f.z * hit.r.nz; // <0: hit with the front
      const impact = Math.abs(v.speed * dot) + (hit.other.speed ? Math.abs(hit.other.speed) * 0.5 : 0);
      if ((v.speed > 0 && dot < -0.3) || (v.speed < 0 && dot > 0.3)) v.speed *= -0.15; else v.speed *= 0.8;
      if (impact > 0.6) { ev.collided = { other: hit.other, impact, vehicle: !!hit.other.corners }; if (!v.ai) Audio.play("crash"); }
    }
  }

  v.updateMesh = (dt = 0.016) => {
    const P = mesh;
    P.root.position.set(v.x, v.y, v.z); P.root.rotation.set(0, v.heading, 0);
    P.body.rotation.x = -v.pitch;
    v.wheelRot += (v.speed / S.wheelR) * dt;
    for (const w of P.wheels) w.rotation.x = v.wheelRot;
    for (const w of P.front) w.rotation.y = v.steerAngle;
    if (kind === "moto") P.body.rotation.z = clamp(-v.yawRate * Math.abs(v.speed) * 0.04, -0.4, 0.4);
    // lamps
    const L = v.lights;
    v.blinkPhase += dt; const on = (v.blinkPhase % 0.75) < 0.4;
    if (on !== v.blinkOn) { v.blinkOn = on; if (!v.ai && (L.blinker || L.hazard)) Audio.play(on ? "tick" : "tock"); }
    const setE = (m, e) => { if (!m) return; (Array.isArray(m) ? m : [m]).forEach((x) => (x.material.emissiveIntensity = e)); };
    setE(P.lamps.bl, (L.hazard || L.blinker < 0) && on ? 1.4 : 0);
    setE(P.lamps.br, (L.hazard || L.blinker > 0) && on ? 1.4 : 0);
    v.brakeLit = v.controls.brake > 0.05;
    setE(P.lamps.brake, v.brakeLit ? 1.3 : L.head ? 0.35 : 0);
    setE(P.lamps.head, L.head ? 1 : 0.05);
    setE(P.lamps.rev, (v.transmission === "auto" ? v.autoMode === "R" : v.gear === -1) ? 1 : 0);
  };
  v.enableSound = () => { if (!v.sound) v.sound = Audio.loop("sawtooth", 30, 0); };
  v.disableSound = () => { if (v.sound) { v.sound.stop(); v.sound = null; } };
  v.teleport = (x, z, h) => { v.x = x; v.z = z; v.heading = h; v.speed = 0; v.steerAngle = 0; v.w = v.engineOn ? S.idle / RPM : 0; placeOnGround(0); v.updateMesh(0); };
  v.dispose = () => { v.disableSound(); fleet.delete(v); world.scene.remove(mesh.root); };
  /** Speed in km/h (positive). */
  v.kmh = () => Math.abs(v.speed) * 3.6;
  v.gearLabel = () => (v.transmission === "auto" ? (v.autoMode === "D" ? "D" + v.autoGear : v.autoMode) : v.gear === -1 ? "R" : v.gear === 0 ? "N" : String(v.gear));
  v.teleport(v.x, v.z, v.heading);
  return v;
}
