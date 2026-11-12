// Ready-made local player: physics body + avatar + follow camera + input + sounds + network presence.
// Most walking games only need: const me = createPlayer({ world, phys, input, cam, look, spawn, room });
// then call me.update(dt) every frame.
import { createBody } from "./physics.js";
import { Character } from "./avatar.js";
import { Audio } from "./audio.js";

export function createPlayer({ world, phys, input, cam, look, spawn = { x: 0, y: 0.05, z: 0 }, room = null, body: bodyCfg, onDie, onEvents }) {
  const body = createBody(phys, spawn.x, spawn.y, spawn.z, bodyCfg);
  const ch = new Character(world.scene, look, { kind: "me" });
  let rot = 0, jumpBuf = 0, lastSafe = { ...spawn }, frozen = false, pose = "walk", netT = 0;
  const me = {
    body, ch, spawn: { ...spawn },
    get x() { return body.x; }, get y() { return body.y; }, get z() { return body.z; },
    get rot() { return rot; }, set rot(v) { rot = v; },
    set pose(p) { pose = p; }, get pose() { return pose; },
    freeze(v) { frozen = !!v; },
    setLook(lk) { ch.setLook(lk); if (room) room.presence({ look: ch.look }); },
    respawn(p = me.spawn) { body.teleport(p.x, p.y, p.z); rot = p.r || 0; cam && cam.snap && cam.snap(); },
    update(dt) {
      if (input.pressed("jump")) jumpBuf = 0.14;
      jumpBuf -= dt;
      const ax = frozen ? { x: 0, y: 0 } : input.axis();
      const w = cam ? cam.toWorld(ax) : { x: ax.x, z: -ax.y };
      const ev = body.step(dt, w.x, w.z, !frozen && jumpBuf > 0, input.down("jump"));
      if (ev.jumped) { jumpBuf = 0; Audio.play("jump"); }
      if (ev.bounced) Audio.play("boing");
      if (ev.landed && ev.impact < -14) Audio.play("land");
      if (body.grounded && body.ground && body.ground.type !== "bounce") lastSafe = { x: body.x, y: body.y, z: body.z };
      if (input.pressed("reset")) me.respawn();
      if (ev.died) { Audio.play("die"); if (onDie) onDie(ev, lastSafe); else me.respawn(); }
      const sp = Math.hypot(body.vx, body.vz);
      if (sp > 0.5) { const target = Math.atan2(body.vx, body.vz); let d = target - rot; d = ((d + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; rot += d * Math.min(1, dt * 14); }
      ch.root.position.set(body.x, body.y, body.z); ch.root.rotation.y = rot;
      ch.animate(dt, sp, body.grounded, pose);
      if (cam) cam.update(dt, body);
      world.followSun(body.x, body.y, body.z);
      if (room && room.connected) {
        netT -= dt;
        if (netT <= 0) { netT = 1 / 15; const r2 = (v) => Math.round(v * 100) / 100; room.presence({ x: r2(body.x), y: r2(body.y), z: r2(body.z), r: r2(rot), g: body.grounded ? 1 : 0, sp: r2(sp), po: pose === "walk" ? null : pose, look: ch.look }); }
      }
      if (onEvents) onEvents(ev);
      return ev;
    },
    get lastSafe() { return lastSafe; },
  };
  return me;
}

/**
 * Simple wandering NPC/bot: walks to random points inside area, hops when blocked.
 * createBot({ world, phys, look, area: { x0, z0, x1, z1 }, spawn })
 */
export function createBot({ world, phys, look, area, spawn, speed = 0.7 }) {
  const s = spawn || { x: (area.x0 + area.x1) / 2, y: 0.05, z: (area.z0 + area.z1) / 2 };
  const body = createBody(phys, s.x, s.y, s.z);
  const ch = new Character(world.scene, Object.assign({ bot: 1 }, look), { kind: "bot" });
  let tx = s.x, tz = s.z, wait = 0, rot = 0, stuck = 0, lastX = s.x, lastZ = s.z;
  const pickT = () => { tx = area.x0 + Math.random() * (area.x1 - area.x0); tz = area.z0 + Math.random() * (area.z1 - area.z0); };
  pickT();
  return {
    body, ch,
    update(dt) {
      let wx = 0, wz = 0, jump = false;
      const dx = tx - body.x, dz = tz - body.z, d = Math.hypot(dx, dz);
      if (wait > 0) wait -= dt;
      else if (d < 1) { wait = 1 + Math.random() * 3; pickT(); }
      else { wx = dx / d; wz = dz / d; }
      if (wx || wz) { stuck += dt; if (Math.hypot(body.x - lastX, body.z - lastZ) > 0.6) { stuck = 0; lastX = body.x; lastZ = body.z; } if (stuck > 0.5 && body.grounded) { jump = true; } if (stuck > 2.5) { pickT(); stuck = 0; } }
      const ev = body.step(dt, wx, wz, jump, jump, speed);
      if (ev.died || body.y < -20) body.teleport(s.x, s.y + 2, s.z);
      const sp = Math.hypot(body.vx, body.vz);
      if (sp > 0.5) { const tg = Math.atan2(body.vx, body.vz); let a = tg - rot; a = ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; rot += a * Math.min(1, dt * 10); }
      ch.root.position.set(body.x, body.y, body.z); ch.root.rotation.y = rot; ch.animate(dt, sp, body.grounded);
    },
    dispose() { ch.dispose(); },
  };
}
