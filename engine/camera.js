// Cameras: third-person orbit follow (EZ Obby style) and first-person (cockpit / walking).
import * as THREE from "./three.js";

/**
 * createFollowCamera(camera, { dist, minDist, maxDist, pitch, height, smooth, phys })
 * Drive with look(dx,dy,isTouch) and zoom(d). update(dt, target{x,y,z}).
 * If phys is given, the camera pulls in when a wall is between it and the player.
 */
export function createFollowCamera(camera, o = {}) {
  const st = {
    yaw: o.yaw ?? Math.PI, pitch: o.pitch ?? 0.38, dist: o.dist ?? 10,
    minDist: o.minDist ?? 4, maxDist: o.maxDist ?? 18, height: o.height ?? 1.8,
    minPitch: o.minPitch ?? -0.15, maxPitch: o.maxPitch ?? 1.25, smooth: o.smooth ?? 12,
  };
  const target = new THREE.Vector3(), want = new THREE.Vector3();
  let first = true;
  function blocked(from, to) {
    if (!o.phys) return 1;
    const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
    const n = 12;
    for (let i = 2; i <= n; i++) {
      const k = i / n, x = from.x + dx * k, y = from.y + dy * k, z = from.z + dz * k;
      for (const b of o.phys.query(x, z, 0.5)) {
        if (b.type !== "solid" && b.type !== "ice" && b.type !== "bounce") continue;
        if (b.noCam) continue;
        if (x > b.min[0] && x < b.max[0] && y > b.min[1] && y < b.max[1] && z > b.min[2] && z < b.max[2]) return Math.max(0.25, (i - 1.5) / n);
      }
    }
    return 1;
  }
  return {
    state: st,
    look(dx, dy, touch) {
      const s = touch ? 0.0075 : 0.0055;
      st.yaw -= dx * s; st.pitch = Math.max(st.minPitch, Math.min(st.maxPitch, st.pitch + dy * s * 0.8));
    },
    zoom(d) { st.dist = Math.max(st.minDist, Math.min(st.maxDist, st.dist + d)); },
    /** Unit vectors on the ground plane for converting input axis into world movement. */
    basis() { return { fx: -Math.sin(st.yaw), fz: -Math.cos(st.yaw), rx: Math.cos(st.yaw), rz: -Math.sin(st.yaw) }; },
    toWorld(ax) { const b = this.basis(); return { x: b.fx * ax.y + b.rx * ax.x, z: b.fz * ax.y + b.rz * ax.x }; },
    update(dt, p) {
      want.set(p.x, p.y + st.height, p.z);
      if (first) { target.copy(want); first = false; } else target.lerp(want, 1 - Math.exp(-st.smooth * dt));
      const cp = Math.cos(st.pitch);
      const off = new THREE.Vector3(Math.sin(st.yaw) * cp, Math.sin(st.pitch), Math.cos(st.yaw) * cp).multiplyScalar(st.dist);
      const pos = target.clone().add(off);
      const k = blocked(target, pos);
      camera.position.copy(target).addScaledVector(off, k);
      camera.lookAt(target);
    },
    snap() { first = true; },
  };
}

/** First-person camera attached to a point (e.g. driver's eyes). look() rotates the head. */
export function createFirstPersonCamera(camera, o = {}) {
  const st = { yaw: 0, pitch: 0, maxYaw: o.maxYaw ?? Math.PI * 0.75, maxPitch: o.maxPitch ?? 1.2 };
  const e = new THREE.Euler(0, 0, 0, "YXZ");
  return {
    state: st,
    look(dx, dy, touch) {
      const s = touch ? 0.006 : 0.004;
      st.yaw = Math.max(-st.maxYaw, Math.min(st.maxYaw, st.yaw - dx * s));
      st.pitch = Math.max(-st.maxPitch, Math.min(st.maxPitch, st.pitch - dy * s));
    },
    zoom() {},
    /** obj: an Object3D (head/seat). eyeOffset: Vector3 in its local space. */
    update(dt, obj, eyeOffset) {
      obj.updateWorldMatrix(true, false);
      const p = (eyeOffset || new THREE.Vector3()).clone().applyMatrix4(obj.matrixWorld);
      camera.position.copy(p);
      const q = new THREE.Quaternion(); obj.getWorldQuaternion(q);
      e.set(st.pitch, st.yaw + (o.yawOffset || 0), 0); // yawOffset: Math.PI if the object faces +Z
      camera.quaternion.copy(q).multiply(new THREE.Quaternion().setFromEuler(e));
    },
    recenter() { st.yaw = 0; st.pitch = 0; },
  };
}
