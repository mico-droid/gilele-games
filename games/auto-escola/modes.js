// Modos de jogo: Prova (MBEDV), Aprendizado (8 lições), Trânsito Difícil (7 cenários) e Passeio livre.
import { THREE, t, h, Audio, part, getMat, createVehicle, screen, toast } from "../../engine/ez.js";
import { RULES, PASS_MAX, ruleTitle } from "./rules.js";

const wrap = (a) => ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export const LESSONS = [{ key: "L1" }, { key: "L2" }, { key: "L3" }, { key: "L4" }, { key: "L5" }, { key: "L6" }, { key: "L7" }, { key: "L8" }];
export const SCENARIOS = [{ key: "S1", num: "1" }, { key: "S2", num: "2" }, { key: "S2b", num: "2b" }, { key: "S3", num: "3" }, { key: "S4", num: "4" }, { key: "S5", num: "5" }, { key: "S6", num: "6" }];

// ---------------------------------------------------------------- helpers
/** Pose on an edge: s along a→b, lane u, dir ±1. */
function poseOn(road, eid, s, dir = 1, u = null) {
  const e = road.E[eid];
  const uu = u ?? (e.nB > 0 ? dir * 1.65 : 0);
  const p = road.toWorld(e, s, uu);
  return { x: p[0], z: p[1], h: dir > 0 ? e.h : e.h + Math.PI };
}
function laneOf(road, eid, dir, i = 0) { return road.lanes.find((l) => l.edge.id === eid && l.dir === dir && l.i === i) || road.lanes.find((l) => l.edge.id === eid && l.dir === dir); }
/** Put the player's car already moving (engine on, gear engaged). */
function startMoving(ctx, kmh, gear = 2) {
  const car = ctx.car; car.speed = kmh / 3.6; car.engineOn = true; car.controls.handbrake = 0; car.data.belt = true;
  if (car.transmission === "auto") { car.autoMode = "D"; car.autoGear = Math.max(1, gear - 1); car.w = 2000 / 9.549; }
  else { car.gear = gear; car.locked = true; car.w = (car.speed / car.spec.wheelR) * car.ratio(); }
}
function clearNear(ctx, x, z, r = 30) { for (const a of [...ctx.traffic.agents]) if (!a.script && Math.hypot(a.veh.x - x, a.veh.z - z) < r) ctx.traffic.respawn(a); }
/** Parked cars in the slots of an edge (indices). Returns vehicles to dispose. */
function parkCars(ctx, eid, idx) {
  const e = ctx.road.E[eid], out = [];
  for (const i of idx) { const sl = e.slots[i]; if (!sl) continue; const p = ctx.road.toWorld(e, (sl.s0 + sl.s1) / 2, sl.u - 0.15); const v = createVehicle(ctx.world, { kind: "car", ai: true, ground: ctx.road.groundAt, color: ["#ef4444", "#3b82f6", "#111827", "#94a3b8", "#22c55e"][i % 5] }); v.setPose(p[0], p[1], e.h, 0); out.push(v); }
  return out;
}
function ghostBox(ctx, e, sl) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.05, 5.4), new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.45 }));
  const p = ctx.road.toWorld(e, (sl.s0 + sl.s1) / 2, sl.u); m.position.set(p[0], ctx.road.groundAt(p[0], p[1]).y + 0.06, p[1]); m.rotation.y = e.h; ctx.world.scene.add(m); return m;
}
/** Parking quality on an edge with a parking lane: { gap, ang, s, inSlot } */
function parkCheck(ctx, e) {
  const car = ctx.car, q = ctx.road.toEdge(e, car.x, car.z), side = e.parking.side;
  let edge = side > 0 ? -Infinity : Infinity;
  for (const c of car.corners()) { const u = ctx.road.toEdge(e, c[0], c[1]).u; edge = side > 0 ? Math.max(edge, u) : Math.min(edge, u); }
  const curb = side > 0 ? e.uMax : e.uMin, gap = Math.abs(curb - edge), ang = Math.abs(wrap(car.heading - e.h));
  const slot = e.slots.find((s) => q.s > s.s0 - 0.8 && q.s < s.s1 + 0.8);
  return { gap, ang: Math.min(ang, Math.PI - ang), s: q.s, u: q.u, slot, inLane: Math.abs(q.u - (side > 0 ? e.uMax - 1.2 : e.uMin + 1.2)) < 1.5 };
}
/** Evaluate parking with art. 181 (I, II, III, VIII). Returns list of rule keys. */
function judgePark(ctx, e) {
  const p = parkCheck(ctx, e), out = [];
  const nearCorner = p.s < e.tA + 5 + ctx.car.spec.halfL || p.s > e.len - e.tB - 5 - ctx.car.spec.halfL;
  const onCw = ctx.road.crosswalks.some((c) => c.edge === e && p.s + 2 > c.s0 && p.s - 2 < c.s1);
  if (onCw) out.push("r181_8"); else if (nearCorner) out.push("r181_1");
  if (p.gap > 1.0 || p.ang > 0.3) out.push("r181_3"); else if (p.gap > 0.5) out.push("r181_2");
  return { keys: out, p };
}
/** Tracks turns/exit at intersections: calls onTurn({node, side, edgeOut}) */
function turnTracker(ctx, onTurn) {
  let inN = null, prev = null;
  return (dt) => {
    const loc = ctx.judge && ctx.judge.loc;
    const dirH = (l) => (l.dir > 0 ? l.edge.h : l.edge.h + Math.PI);
    if (loc && loc.node && (!prev || !prev.node)) inN = { node: loc.node, h: prev && prev.edge ? dirH(prev) : ctx.car.heading, from: prev };
    if (loc && !loc.node && loc.edge && prev && prev.node && inN) { const dh = wrap(dirH(loc) - inN.h); onTurn({ node: inN.node, side: Math.abs(dh) < 0.6 ? 0 : dh > 0 ? -1 : 1, edge: loc.edge, from: inN.from }); inN = null; }
    prev = loc;
  };
}
function stars3(score) { return score >= 85 ? 3 : score >= 65 ? 2 : score >= 40 ? 1 : 0; }
function saveStars(ctx, key, n) { const s = ctx.store.getJSON("stars", {}); s[key] = Math.max(s[key] || 0, n); ctx.store.setJSON("stars", s); }

// ---------------------------------------------------------------- navigator (examiner / instructor directions)
function navigator(ctx, { waypoints, viaEdge, startNode, who = "examiner", finalEdge, onDone }) {
  const road = ctx.road;
  let remaining = waypoints.map((id) => road.nodes[id]), steps = [], k = 0, said = -1, done = false;
  function build(node, via) {
    steps = via ? [{ from: via.A === node ? via.B : via.A, to: node, e: via }] : [];
    let cur = node, v = via;
    for (const w of remaining) { if (w === cur) continue; const p = ctx.plan(cur, w, v); if (!p) break; steps.push(...p); if (p.length) { v = p[p.length - 1].e; cur = w; } }
    if (finalEdge) steps.push({ from: cur, to: finalEdge.A === cur ? finalEdge.B : finalEdge.A, e: finalEdge, final: true });
    k = 0; said = -1;
    const pts = [[ctx.car.x, ctx.car.z]]; steps.forEach((s) => pts.push([s.to.x, s.to.z]));
    ctx.setRoute({ pts, target: [steps[steps.length - 1].to.x, steps[steps.length - 1].to.z] });
  }
  build(startNode, viaEdge);
  function instruction(i) {
    const a = steps[i], b = steps[i + 1]; if (!b) return null;
    const n = a.to, hin = a.e.A === a.from ? a.e.h : a.e.h + Math.PI, hout = b.e.A === n ? b.e.h : b.e.h + Math.PI;
    if (n.roundabout) {
      const ang = (e) => { const o = e.A === n ? e.B : e.A; return Math.atan2(o.z - n.z, o.x - n.x); };
      const a0 = ang(a.e), exits = n.edges.filter((e) => e !== a.e).map((e) => ({ e, d: ((a0 - ang(e)) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) })).sort((x, y) => x.d - y.d);
      return { key: "ex_rb", vars: { n: exits.findIndex((x) => x.e === b.e) + 1 } };
    }
    const d = wrap(hout - hin);
    return { key: Math.abs(d) < 0.5 ? "ex_straight" : d > 0 ? "ex_left" : "ex_right" };
  }
  return {
    get steps() { return steps; }, get done() { return done; },
    update() {
      if (done || !steps.length) return;
      const loc = ctx.judge && ctx.judge.loc; if (!loc || loc.node) return;
      const cur = steps[k], nxt = steps[k + 1];
      if (nxt && loc.edge === nxt.e) { if (remaining[0] === cur.to) remaining.shift(); k++; }
      else if (loc.edge && loc.edge !== cur.e) {
        const ahead = loc.dir > 0 ? loc.edge.B : loc.edge.A;
        ctx.say(who, "ex_recalc", null, 3); build(ahead, loc.edge); return;
      }
      const s = steps[k], dist = Math.hypot(ctx.car.x - s.to.x, ctx.car.z - s.to.z);
      if (s.final || (!finalEdge && k === steps.length - 1 && dist < 25)) { done = true; onDone && onDone(); return; }
      if (said < k && dist < 75) { const ins = instruction(k); if (ins) ctx.say(who, ins.key, ins.vars, 7); said = k; }
    },
  };
}

// ================================================================ EXAM
export function createExam(ctx) {
  const road = ctx.road, e = road.E.h10;
  const routes = [["n21", "n22", "n12", "n02", "n01", "n00", "n10"], ["n30", "n31", "n32", "n33", "n23", "n13", "n12", "n11", "n10"], ["n21", "n11", "n01", "n02", "n12", "n11", "n10"]];
  const ri = Math.floor(Math.random() * routes.length);
  let alive = true, phase = "prep", T = 0, nav = null, parked = [], ghost = null, stopT = 0, parkResult = null, ended = false;
  const startSlot = e.slots[2], target = e.slots[7];
  const M = {
    id: "exam", label: "📋 " + t("m_exam"), showPoints: true, defaultCam: "in", factory: createExam, route: routes[ri],
    get nav() { return nav; }, get phase() { return phase; }, target,
    start() {
      const p = road.toWorld(e, (startSlot.s0 + startSlot.s1) / 2, startSlot.u - 0.15);
      ctx.resetCar({ x: p[0], z: p[1], h: e.h, hb: 1, engine: false, gear: 0 });
      parked = parkCars(ctx, "h10", [0, 1, 4, 6, 8, 9]);
      clearNear(ctx, p[0], p[1], 40);
      ctx.say("examiner", "ex_ready", null, 12);
    },
    update(dt) {
      T += dt;
      const car = ctx.car, J = ctx.judge;
      if (phase === "prep" && Math.abs(car.speed) > 0.5) {
        phase = "drive"; ctx.say("examiner", "ex_go", null, 5);
        nav = navigator(ctx, { waypoints: routes[ri], startNode: e.B, viaEdge: e, finalEdge: e, onDone: () => { phase = "toPark"; } });
      }
      if (nav && phase === "drive") nav.update();
      if (phase === "toPark") {
        const loc = J.loc;
        if (loc && loc.edge === e && loc.dir > 0 && road.toEdge(e, car.x, car.z).s < target.s0) { phase = "park"; ctx.say("examiner", "ex_park", null, 10); ghost = ghostBox(ctx, e, target); ctx.setRoute({ pts: [], target: road.toWorld(e, (target.s0 + target.s1) / 2, target.u) }); }
        else if (loc && loc.edge && loc.edge !== e) { phase = "drive"; nav = navigator(ctx, { waypoints: ["n10"], startNode: loc.dir > 0 ? loc.edge.B : loc.edge.A, viaEdge: loc.edge, finalEdge: e, onDone: () => { phase = "toPark"; } }); }
      }
      if (phase === "park") {
        const pc = parkCheck(ctx, e);
        if (Math.abs(car.speed) < 0.05 && pc.inLane && (car.controls.handbrake > 0.5 || !car.engineOn)) stopT += dt; else stopT = 0;
        if (stopT > 1.2) {
          const r = judgePark(ctx, e); r.keys.forEach((k) => J.add(k)); parkResult = r;
          phase = "off"; ctx.say("examiner", "ex_off", null, 8);
        }
      }
      if (phase === "off" && !car.engineOn && car.controls.handbrake > 0.5) finish();
      if (phase === "off" && !car.engineOn && car.controls.handbrake < 0.5) { J.add("r169", { why: "handbrake-off" }); finish(); }
      if (T > 20 * 60) finish();
    },
    onInterrupt() { ctx.say("examiner", "m_interrupt", null, 6); setTimeout(finish, 2500); },
    onEngineOff() {},
    dispose() { alive = false; parked.forEach((v) => v.dispose()); parked = []; if (ghost) ctx.world.scene.remove(ghost); ctx.setRoute(null); },
  };
  function finish() {
    if (ended || !alive) return; ended = true;
    const J = ctx.judge, pass = J.passed();
    ctx.end({
      title: J.interrupted ? "🛑 " + t("res_interrupted") : pass ? "✅ " + t("res_pass") : "❌ " + t("res_fail"),
      sub: t("res_points", { p: J.points }), ok: pass,
      lines: [t("res_dom", { d: Math.round(J.domain) }), "⏱ " + Math.floor(T / 60) + ":" + String(Math.floor(T % 60)).padStart(2, "0")],
    });
  }
  return M;
}

// ================================================================ FREE DRIVE
export function createFree(ctx) {
  return {
    id: "free", label: "🗺️ " + t("m_free"), showPoints: false, defaultCam: "out", factory: createFree,
    start() { const p = poseOn(ctx.road, "h22", 20, 1); ctx.resetCar({ ...p, hb: 1, engine: false }); ctx.say("instructor", "free_hint", null, 6); },
  };
}

// ================================================================ LESSONS
export function createLesson(ctx, idx = 0) {
  const road = ctx.road, car = ctx.car, auto = () => car.transmission === "auto";
  let alive = true, objs = [], T = 0, finished = false, pending = false, tick = null, extra = [], stalls = 0, ghost = null;
  const schedule = (ms = 900) => { if (pending) return; pending = true; setTimeout(finish, ms); };
  const set = () => ctx.setObjectives(objs.filter((o) => !o.hide || !o.hide()));
  const done = (k) => { const o = objs.find((x) => x.key === k); if (o && !o.done) { o.done = true; Audio.play("coin"); set(); } };
  const fail = (k) => { const o = objs.find((x) => x.key === k); if (o && !o.done) { o.failed = true; set(); } };
  const all = () => objs.filter((o) => !o.hide || !o.hide()).every((o) => o.done);
  function finish() {
    if (finished || !alive) return; finished = true;
    const J = ctx.judge, nInf = J.infractions.length, failed = objs.some((o) => o.failed);
    const score = failed ? 30 : Math.max(0, 100 - nInf * 15 - stalls * 8 - Math.max(0, 100 - J.domain) * 0.5);
    const st = failed ? 0 : Math.max(1, stars3(score));
    saveStars(ctx, "lessons" + idx, st);
    ctx.end({ title: failed ? "🔁 " + t("fail_try") : t("done"), sub: t("stars") + ": " + "⭐".repeat(st) + "☆".repeat(3 - st), ok: !failed, next: idx < 7 ? () => GAMEstart(ctx, createLesson, idx + 1) : null });
  }
  const L = {
    id: "lesson", label: "🎓 " + t(LESSONS[idx].key), showPoints: false, defaultCam: "in", factory: createLesson, arg: idx,
    judgeOpts: { domain: false },
    start() {
      ({ 0: L1, 1: L2, 2: L3, 3: L4, 4: L5, 5: L6, 6: L7, 7: L8 })[idx]();
      set();
    },
    update(dt, ev) {
      T += dt; if (ev.stalled) stalls++;
      if (pending) return;
      tick && tick(dt, ev);
      if (all()) schedule();
    },
    onInfraction(inf) { const o = objs.find((x) => x.key === "o_noinf"); if (o) { o.failed = true; set(); } },
    dispose() { alive = false; extra.forEach((v) => v.dispose ? v.dispose() : ctx.world.scene.remove(v)); extra = []; if (ghost) ctx.world.scene.remove(ghost); ctx.setRoute(null); },
  };
  // ---- 1: cockpit
  function L1() {
    const e = road.E.h10, sl = e.slots[2], p = road.toWorld(e, (sl.s0 + sl.s1) / 2, sl.u - 0.15);
    ctx.resetCar({ x: p[0], z: p[1], h: e.h, hb: 1, engine: false, gear: auto() ? 0 : 1 });
    extra = parkCars(ctx, "h10", [1, 4]);
    objs = [{ key: "o_belt" }, { key: "o_mirror" }, { key: "o_neutral" }, { key: "o_clutch", hide: auto }, { key: "o_engine" }, { key: "o_hb" }];
    ctx.say("instructor", "ex_ready", null, 8);
    tick = () => {
      if (car.data.belt) done("o_belt");
      if ((car.data.mirrors || 0) >= 1) done("o_mirror");
      if (auto() ? car.autoMode === "P" || car.autoMode === "N" : car.gear === 0) done("o_neutral");
      if (!auto() && car.controls.clutch > 0.8) done("o_clutch");
      if (car.engineOn) done("o_engine");
      if (car.engineOn && car.controls.handbrake < 0.5) done("o_hb");
    };
  }
  // ---- 2: pulling away
  function L2() {
    const p = poseOn(road, "h20", 20, 1); ctx.resetCar({ ...p, hb: 1, engine: true, gear: 0, belt: true }); clearNear(ctx, p.x, p.z, 60);
    objs = [{ key: "o_first" }, { key: "o_hb" }, { key: "o_move" }, { key: "o_stop" }];
    ctx.say("instructor", auto() ? "tip_auto" : "tip_clutch", null, 12);
    let x0 = null, st0 = 0;
    tick = (dt, ev) => {
      if (auto() ? car.autoMode === "D" : car.gear === 1) done("o_first");
      if (car.controls.handbrake < 0.5) done("o_hb");
      if (car.speed > 0.3 && !x0) { x0 = [car.x, car.z]; st0 = stalls; }
      if (x0 && Math.hypot(car.x - x0[0], car.z - x0[1]) > 15) { if (stalls === st0) done("o_move"); else { x0 = null; } }
      if (objs[2].done && Math.abs(car.speed) < 0.05 && car.engineOn) done("o_stop");
      if (ev.stalled) ctx.say("instructor", "tip_clutch", null, 8);
    };
  }
  // ---- 3: gears
  function L3() {
    const p = poseOn(road, "e1", 15, 1); ctx.resetCar({ ...p, hb: 0, engine: true, gear: 0, belt: true }); clearNear(ctx, p.x, p.z, 200);
    objs = auto() ? [{ key: "o_40" }, { key: "o_stop" }] : [{ key: "o_2nd" }, { key: "o_3rd" }, { key: "o_down" }, { key: "o_stop" }];
    let top = false;
    tick = () => {
      if (auto()) { if (car.kmh() >= 40) { done("o_40"); top = true; } if (top && Math.abs(car.speed) < 0.05) done("o_stop"); return; }
      if (car.gear === 2) done("o_2nd");
      if (car.gear === 3 && car.kmh() >= 35) { done("o_3rd"); top = true; }
      if (top && car.gear === 2) done("o_down");
      if (objs[2].done && Math.abs(car.speed) < 0.05) done("o_stop");
    };
  }
  // ---- 4: turns
  function L4() {
    const p = poseOn(road, "v20", 25, 1); ctx.resetCar({ ...p, hb: 1, engine: true, gear: 0, belt: true }); clearNear(ctx, p.x, p.z, 40);
    objs = [{ key: "o_turnL" }, { key: "o_turnR" }, { key: "o_noinf" }];
    const nav = navigator(ctx, { waypoints: ["n21", "n31", "n32"], startNode: road.nodes.n21, viaEdge: road.E.v20, who: "instructor" });
    const tt = turnTracker(ctx, (tr) => { if (tr.node.id === "n21" && tr.side === -1) done("o_turnL"); if (tr.node.id === "n31" && tr.side === 1) done("o_turnR"); if (objs[0].done && objs[1].done && !objs[2].failed) done("o_noinf"); });
    tick = (dt) => { nav.update(); tt(dt); };
  }
  // ---- 5: hill start
  function L5() {
    const p = poseOn(road, "h02", 60, -1); ctx.resetCar({ ...p, hb: 1, engine: true, gear: 0, belt: true }); clearNear(ctx, p.x, p.z, 60);
    objs = [{ key: "o_hillStop" }, { key: "o_hillGo" }];
    ctx.say("instructor", "tip_hill", null, 12);
    let stoppedAt = null, back = 0;
    tick = () => {
      const loc = ctx.judge.loc;
      if (loc && loc.edge && loc.edge.id === "h02" && loc.distToStop < 5 && loc.distToStop > -1 && Math.abs(car.speed) < 0.05 && !objs[0].done) { done("o_hillStop"); stoppedAt = [car.x, car.z]; }
      if (stoppedAt && !objs[1].done) {
        const f = car.forward(), d = (car.x - stoppedAt[0]) * f.x + (car.z - stoppedAt[1]) * f.z;
        back = Math.min(back, d);
        if (back < -0.5) { fail("o_hillGo"); }
        if (d > 6 && back >= -0.5) done("o_hillGo");
      }
      if (objs[1].failed) schedule(800);
    };
  }
  // ---- 6: junctions (red light + PARE)
  function L6() {
    const p = poseOn(road, "v10", 30, 1); ctx.resetCar({ ...p, hb: 1, engine: true, gear: 0, belt: true }); clearNear(ctx, p.x, p.z, 40);
    const n = road.nodes.n11, [G, Y, R] = n.cycle, gi = n.groups.findIndex((g) => g.edges.includes(road.E.v10));
    // make our approach turn red right now: the other group starts green
    const T2 = 2 * (G + Y + R); const want = gi === 0 ? G + Y + R : 0; n.offset = ((want - road.clock) % T2 + T2) % T2;
    objs = [{ key: "o_red" }, { key: "o_pare" }, { key: "o_noinf" }];
    let waited = false;
    tick = () => {
      const loc = ctx.judge.loc; if (!loc || !loc.edge) return;
      if (loc.edge.id === "v10" && loc.dir > 0 && loc.distToStop < 8 && Math.abs(car.speed) < 0.05 && road.signalState(n, road.E.v10) === "red") waited = true;
      if (loc.edge.id === "v11" && !objs[0].done && !objs[0].failed) { if (waited) done("o_red"); else fail("o_red"); }
      if (loc.edge.id === "v12" && objs[0].done) { done("o_pare"); if (!objs[2].failed) done("o_noinf"); }
      if (objs[0].failed) schedule(1200);
    };
    L.onInfraction = (inf) => { fail(inf.key === "r208_stop" ? "o_pare" : inf.key === "r208_red" ? "o_red" : "o_noinf"); schedule(1500); };
  }
  // ---- 7: roundabout
  function L7() {
    const p = poseOn(road, "h12", 40, 1); ctx.resetCar({ ...p, hb: 1, engine: true, gear: 0, belt: true });
    objs = [{ key: "o_rbEnter" }, { key: "o_rbExit" }];
    const nav = navigator(ctx, { waypoints: ["n22", "n32"], startNode: road.nodes.n22, viaEdge: road.E.h12, who: "instructor" });
    let entered = false;
    tick = () => {
      nav.update();
      const loc = ctx.judge.loc;
      if (loc && loc.roundabout && !entered) { entered = true; if (!ctx.judge.infractions.some((i) => i.key === "r215")) done("o_rbEnter"); }
      if (entered && loc && loc.edge && !loc.node) { if (loc.edge.id === "h22") { if (!ctx.judge.infractions.some((i) => i.key === "r196")) done("o_rbExit"); else fail("o_rbExit"); } else fail("o_rbExit"); }
      if (objs.some((o) => o.failed)) schedule(1200);
    };
  }
  // ---- 8: parking (parallel)
  function L8() {
    const e = road.E.h10, tg = e.slots[7], p = road.toWorld(e, tg.s1 + 7.5, e.uMax - 2.4 - 1.65);
    ctx.resetCar({ x: p[0], z: p[1], h: e.h, hb: 1, engine: true, gear: 0, belt: true }); clearNear(ctx, p[0], p[1], 50);
    extra = parkCars(ctx, "h10", [6, 8]); ghost = ghostBox(ctx, e, tg);
    L.judgeOpts.allowReverse = () => true; ctx.judge && (ctx.judge.enabled = true);
    objs = [{ key: "o_park" }, { key: "o_parkOff" }];
    ctx.say("instructor", "tip_park", null, 14);
    let still = 0;
    tick = (dt) => {
      const pc = parkCheck(ctx, e), ok = pc.slot === tg && pc.gap <= 0.5 && pc.ang < 0.15 && Math.abs(pc.s - (tg.s0 + tg.s1) / 2) < 1.3;
      if (Math.abs(car.speed) < 0.05) still += dt; else still = 0;
      if (ok && still > 0.8) done("o_park");
      if (objs[0].done && car.controls.handbrake > 0.5) done("o_parkOff");
    };
  }
  return L;
}
let GAMEstart = (ctx, f, a) => window.GAME.startMode(f, a);

// ================================================================ SCENARIOS (Trânsito Difícil)
export function createScenario(ctx, idx = 0) {
  const road = ctx.road, car = ctx.car, traffic = ctx.traffic;
  let alive = true, score = 100, T = 0, ended = false, tick = null, extra = [], scripted = [], notes = [], riskReplay = null;
  const badge = h("div.ez-pill.ae-score"); document.querySelector(".ez-top").insertBefore(badge, document.querySelector(".ez-top .ez-spacer"));
  const upd = () => (badge.textContent = "🛡️ " + Math.round(score));
  const lose = (n, note) => { score = Math.max(0, score - n); upd(); if (note) notes.push(note); };
  const gain = (n, note) => { score = Math.min(100, score + n); upd(); if (note) notes.push(note); };
  const risks = [];
  function risk(key) { risks.push({ title: t(key), frames: ctx.snapshot() }); lose(35, t(key)); ctx.freeze(2.2, key); }
  function finish() {
    if (ended || !alive) return; ended = true;
    const st = stars3(score); saveStars(ctx, "scenarios" + idx, st);
    ctx.end({ title: "🛡️ " + t("defensive") + ": " + Math.round(score), sub: t("stars") + ": " + "⭐".repeat(st) + "☆".repeat(3 - st), ok: st > 0, lines: notes.slice(0, 5), replays: risks, next: idx < SCENARIOS.length - 1 ? () => GAMEstart(ctx, createScenario, idx + 1) : null });
  }
  function scriptCar(o) { const a = traffic.addVehicle(Object.assign({ script: true }, o)); scripted.push(a); return a; }
  const S = {
    id: "hard", label: "⚠️ " + t(SCENARIOS[idx].key), showPoints: false, defaultCam: "in", factory: createScenario, arg: idx, judgeOpts: {},
    start() { upd(); [rush, blind, pillar, school, overtake, surprises, rainS][idx](); },
    update(dt, ev) {
      T += dt; tick && tick(dt, ev);
      if (ev.collided && ev.collided.impact > 2) lose(30, t("m_crash"));
      if (T > 240) finish();
    },
    onInfraction(inf) { lose(10, ruleTitle(inf.key)); },
    dispose() { alive = false; for (const a of scripted) traffic.remove(a); scripted = []; extra.forEach((x) => (x.dispose ? x.dispose() : x.parent && x.parent.remove(x))); extra = []; badge.remove(); ctx.rain.set(false); for (const n of Object.values(road.nodes)) if (n._signal !== undefined) { n.signal = n._signal; delete n._signal; } ctx.setRoute(null); },
  };
  const reachX = (x, fn) => { if (car.x > x) fn(); };
  // ---- 1: rush hour on the avenue
  function rush() {
    const p = poseOn(road, "h01", 15, 1, 4.95); ctx.resetCar({ ...p, hb: 0, engine: true, belt: true }); startMoving(ctx, 25, 2); clearNear(ctx, p.x, p.z, 60);
    ctx.say("instructor", "sc_rush", null, 8);
    const l0 = laneOf(road, "h01", 1, 0), l1 = laneOf(road, "h01", 1, 1);
    const cars = [];
    for (let i = 0; i < 4; i++) { cars.push(scriptCar({ lane: l1, d: 30 + i * 14, speedMul: 0.7 })); cars.push(scriptCar({ lane: l0, d: 24 + i * 15, speedMul: 0.75 })); }
    const moto = scriptCar({ kind: "moto", lane: l1, d: 2, speedMul: 1.0 }); moto.offset = -1.65; moto.override = { ignoreLeader: true, speed: 13 };
    const leader = cars[0]; let brakeT = 9, braking = 0;
    tick = (dt) => {
      brakeT -= dt;
      if (brakeT < 0 && !braking) { braking = 2.2; leader.override = { speed: 0 }; }
      if (braking) { braking -= dt; if (braking <= 0) { braking = 0; leader.override = null; brakeT = 12 + Math.random() * 6; } }
      reachX(140, finish);
    };
  }
  // ---- 2: mirror blind spot (moto behind-left while changing lanes)
  function blind() {
    const p = poseOn(road, "h11", 10, 1, 4.95); ctx.resetCar({ ...p, hb: 0, engine: true, belt: true }); startMoving(ctx, 40, 3); clearNear(ctx, p.x, p.z, 120);
    ctx.say("instructor", "sc_blind", null, 10);
    const l0 = laneOf(road, "h11", 1, 0);
    const moto = scriptCar({ kind: "moto", lane: l0, d: 6 }); moto.override = { speed: 11, ignoreLeader: true };
    let phase = 0, hold = 0;
    tick = (dt) => {
      // keep the moto in the left blind spot (≈2.5 m behind the driver) for a while
      if (phase === 0) {
        const pr = l0.path.project(car.x, car.z).d; const want = pr - 2.4; const nd = moto.d + clamp(want - moto.d, -dt * 6, dt * 6); moto.override = { pinD: nd, pinSpeed: car.speed }; hold += dt;
        if (hold > 14) { phase = 1; moto.override = { speed: car.speed + 5, ignoreLeader: true }; }
      }
      const loc = ctx.judge.loc;
      if (phase === 0 && loc && loc.edge && loc.edge.id === "h11" && loc.u < 3.0) {
        const looked = ctx.clock - ctx.lastShoulder["-1"] < 3;
        if (looked) { gain(5, t("sc_blindOk")); ctx.toast(t("sc_blindOk"), 2500); phase = 2; moto.override = { speed: car.speed + 4, ignoreLeader: true }; }
        else { risk("sc_blindWarn"); phase = 2; moto.override = { speed: car.speed + 6, ignoreLeader: true }; }
      }
      if (phase === 0 && ctx.clock - ctx.lastShoulder["-1"] < 0.3 && !S._sawBike) { S._sawBike = true; ctx.toast("🏍️ !", 1500); }
      if (phase >= 1 && loc && loc.edge && loc.edge.id === "h11" && loc.u < 3.3 && phase !== 3) { phase = 3; }
      reachX(45, finish);
    };
  }
  // ---- 2b: A-pillar blind spot (constant-bearing moto from the left)
  function pillar() {
    const p = poseOn(road, "h02", 55, 1); ctx.resetCar({ ...p, hb: 0, engine: true, belt: true }); startMoving(ctx, 22, 2); clearNear(ctx, -50, 50, 70);
    ctx.say("instructor", "sc_pillar", null, 9);
    const lane = laneOf(road, "v11", 1, 0);
    const moto = scriptCar({ kind: "moto", lane, d: 10 }); moto.override = { pinD: 10, pinSpeed: 0 };
    let locked = true, warned = false, cleared = false;
    const pillarW = new THREE.Vector3(0.76, 1.22, 0.5), eyeW = new THREE.Vector3();
    tick = (dt) => {
      const n = road.nodes.n12, lx = -51.65;
      if (locked) {
        car.mesh.body.updateWorldMatrix(true, false);
        const pw = pillarW.clone().applyMatrix4(car.mesh.body.matrixWorld); eyeW.copy(ctx.cockpit.eye).applyMatrix4(car.mesh.body.matrixWorld);
        const dx = pw.x - eyeW.x, dz = pw.z - eyeW.z; // ray toward the left pillar
        if (Math.abs(dx) > 1e-3) {
          const k = (lx - eyeW.x) / dx, zz = eyeW.z + dz * k;
          if (k > 0 && zz < 46) { const d = lane.path.project(lx, zz).d; moto.override = { pinD: Math.max(moto.d, d), pinSpeed: Math.max(0, (d - moto.d) / Math.max(dt, 1e-3)) }; }
        }
        if (ctx.clock - ctx.headMoved < 0.4 || car.kmh() < 8) { locked = false; moto.override = { speed: 9, ignoreRules: true, ignoreLeader: true }; if (ctx.clock - ctx.headMoved < 0.4) { gain(5, t("sc_pillarOk")); ctx.toast(t("sc_pillarOk"), 2500); } }
      }
      // conflict: car entering the junction while the moto is close
      const inJ = Math.abs(car.x - n.x) < 9 && Math.abs(car.z - n.z) < 9, md = Math.hypot(moto.veh.x - n.x, moto.veh.z - n.z);
      if (inJ && md < 14 && !warned && moto.veh.z < n.z + 2) { warned = true; risk("sc_pillarWarn"); locked = false; moto.override = { speed: 0, ignoreRules: true }; setTimeout(() => (moto.override = { speed: 9, ignoreRules: true, ignoreLeader: true }), 2500); }
      if (moto.veh.z > n.z + 20 && !cleared) cleared = true;
      if (cleared && car.x > n.x + 25) finish();
      if (car.x > n.x + 60) finish();
    };
  }
  // ---- 3: school exit (bus hiding a pedestrian, ball + child)
  function school() {
    const p = poseOn(road, "h13", 12, 1); ctx.resetCar({ ...p, hb: 0, engine: true, belt: true }); startMoving(ctx, 25, 2); clearNear(ctx, p.x, p.z, 120);
    ctx.say("instructor", "sc_school", null, 8);
    const e = road.E.h13, lane = laneOf(road, "h13", 1, 0);
    const bus = scriptCar({ kind: "bus", lane, d: lane.path.project(...road.toWorld(e, 80, 1.65)).d }); bus.override = { speed: 0 }; bus.veh.lights.hazard = true;
    const kid = traffic.addPed({ spot: traffic.spots[0] }); extra.push({ dispose: () => traffic.remove(kid) });
    const busFront = road.toWorld(e, 80 + 7.2, 4.4);
    kid.script = () => false; kid.x = busFront[0]; kid.z = busFront[1]; kid.rot = -Math.PI;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), getMat("#f8fafc")); ctx.world.scene.add(ball); extra.push(ball);
    const ballStart = road.toWorld(road.E.h23, 40, -6.5); ball.position.set(ballStart[0], 0.4, ballStart[1]);
    const child = traffic.addPed({ spot: traffic.spots[0] }); child.ch.root.scale.setScalar(0.38); extra.push({ dispose: () => traffic.remove(child) }); child.script = () => false; child.x = ballStart[0] - 4; child.z = ballStart[1] - 1;
    let kidGo = false, kidT = 0, passedBus = false, ballGo = false, ballT = 0, nearKid = false, nearChild = false;
    tick = (dt) => {
      const q = road.toEdge(e, car.x, car.z), onE = ctx.judge.loc && ctx.judge.loc.edge === e;
      // pedestrian steps out in front of the bus when the car comes alongside
      if (onE && !kidGo && q.s > 80 - 14) { kidGo = true; ctx.toast(t("sc_bus"), 2600); if (car.kmh() < 18) gain(5, t("sc_bus")); }
      if (kidGo && kidT < 6) {
        kidT += dt; kid.script = (p, d) => { if (kidT > 0.3 && kidT < 5.5) { const pt = road.toEdge(e, kid.x, kid.z), np = road.toWorld(e, pt.s, pt.u - 1.6 * d); kid.x = np[0]; kid.z = np[1]; kid.rot = e.h + Math.PI / 2; return true; } return false; };
        if (Math.hypot(kid.x - car.x, kid.z - car.z) < 3.2 && Math.abs(car.speed) > 1 && !nearKid) { nearKid = true; risk("sc_bus"); }
        if (kidT >= 6) { bus.override = null; bus.veh.lights.hazard = false; }
      }
      if (onE && q.s > 95) passedBus = true;
      // ball and child on Rua da Escola (next block)
      const e2 = road.E.h23, q2 = road.toEdge(e2, car.x, car.z), onE2 = ctx.judge.loc && ctx.judge.loc.edge === e2;
      if (onE2 && q2.s > 10 && !ballGo) { ballGo = true; ctx.toast(t("sc_ball"), 2500); }
      if (ballGo) {
        ballT += dt; const k = Math.min(1, ballT / 2.2), pa = road.toWorld(e2, 40, -6.5), pb = road.toWorld(e2, 40, 6.5); ball.position.set(pa[0] + (pb[0] - pa[0]) * k, road.groundAt(ball.position.x, ball.position.z).y + 0.22, pa[1] + (pb[1] - pa[1]) * k);
        child.script = (p, d) => { if (ballT > 1.2 && ballT < 6) { const c = road.toEdge(e2, child.x, child.z), np = road.toWorld(e2, 40, Math.min(6.5, c.u + 2.2 * d)); child.x = np[0]; child.z = np[1]; child.rot = e2.h - Math.PI / 2; return true; } return false; };
        if (Math.hypot(child.x - car.x, child.z - car.z) < 3 && Math.abs(car.speed) > 1 && !nearChild) { nearChild = true; risk("sc_ball"); }
      }
      if (onE2 && q2.s > 70) finish();
    };
  }
  // ---- 4: overtaking on a single carriageway
  function overtake() {
    const p = poseOn(road, "e1", 10, 1); ctx.resetCar({ ...p, hb: 0, engine: true, belt: true }); startMoving(ctx, 40, 3); clearNear(ctx, 300, -50, 260);
    ctx.say("instructor", "sc_over", null, 9);
    const lane = laneOf(road, "e1", 1, 0), back = laneOf(road, "e3", -1, 0);
    const truck = scriptCar({ kind: "truck", lane, d: 40 }); truck.override = { speed: 9 };
    const oncoming = []; [0, 70, 150].forEach((d) => { const a = scriptCar({ lane: back, d, speedMul: 1 }); a.override = { speed: 15 }; oncoming.push(a); });
    let passed = false, warned = false;
    tick = () => {
      const loc = ctx.judge.loc;
      if (loc && loc.edge && loc.u * loc.dir < -0.6) {
        for (const a of traffic.agents) { const v = a.veh; if (Math.cos(v.heading - car.heading) > -0.8) continue; const d = Math.hypot(v.x - car.x, v.z - car.z); if (d < (car.speed + Math.abs(v.speed)) * 2.2 && d < 70 && !warned) { warned = true; risk("sc_freeze"); setTimeout(() => (warned = false), 6000); } }
      }
      const fx = Math.sin(car.heading), dz = truck.veh.x - car.x;
      if (!passed && dz < -12 && loc && loc.edge && loc.u * loc.dir > 0) { passed = true; gain(5); }
      if (passed || car.x > 600) finish();
    };
  }
  // ---- 5: the unexpected (ambulance, dead traffic light, phone)
  function surprises() {
    const p = poseOn(road, "h01", 10, 1, 1.65); ctx.resetCar({ ...p, hb: 0, engine: true, belt: true }); startMoving(ctx, 30, 2); clearNear(ctx, p.x, p.z, 120);
    const n21 = road.nodes.n21; n21._signal = n21.signal; n21.signal = "off";
    const l1 = laneOf(road, "h01", 1, 1), l0 = laneOf(road, "h01", 1, 0);
    let amb = null, ambT = 0, blocked = 0, phoneShown = false, phoneEl = null, ambDone = false, offWarned = false;
    tick = (dt) => {
      T > 3 && !amb && (() => {
        amb = scriptCar({ lane: l0, d: Math.max(0, l0.path.project(car.x, car.z).d - 45), color: "#f8fafc" });
        const bar = part(1.2, 0.18, 0.3, "#ef4444", 0, 1.62, -0.2, amb.veh.mesh.body); amb.bar = bar; part(1.76, 0.12, 3.92, "#ef4444", 0, 0.75, 0, amb.veh.mesh.body);
        amb.override = { speed: 17, ignoreRules: true }; ctx.say("instructor", "sc_amb", null, 7);
        amb.siren = Audio.loop("square", 700, 0.05);
      })();
      if (amb && !ambDone) {
        ambT += dt; amb.bar.material = getMat((ambT * 4 | 0) % 2 ? "#ef4444" : "#3b82f6", 0.8);
        amb.siren && amb.siren.set((ambT * 1.6 | 0) % 2 ? 950 : 700, 0.05);
        // switch lane to pass the player if possible
        const dx = car.x - amb.veh.x;
        const sameLane = Math.abs(road.toEdge(road.E.h01, amb.veh.x, amb.veh.z).u - road.toEdge(road.E.h01, car.x, car.z).u) < 1.8;
        if (sameLane && dx > 0 && dx < 12) { blocked += dt; if (blocked > 5) { ctx.judge.add("r189"); blocked = -999; } }
        if (dx < -10) { ambDone = true; amb.siren && amb.siren.stop(); if (blocked >= 0) { gain(5, t("sc_ambOk")); ctx.toast(t("sc_ambOk"), 2200); } }
      }
      if (car.x > -10 && !phoneShown) {
        phoneShown = true; Audio.play("pop");
        phoneEl = h("div.ae-phone", h("b", t("sc_phone")), h("div.ez-row", h("button.ez-btn.small", { onclick: () => { phoneEl.remove(); gain(3); } }, t("sc_phoneIgnore")), h("button.ez-btn.warn.small", { onclick: () => { phoneEl.remove(); ctx.judge.add("r252"); } }, t("sc_phoneAnswer"))));
        document.body.appendChild(phoneEl); extra.push({ dispose: () => phoneEl.remove() });
        setTimeout(() => { if (phoneEl.isConnected) { phoneEl.remove(); gain(3); } }, 7000);
      }
      if (car.x > 10 && !offWarned) { offWarned = true; ctx.say("instructor", "sc_signalOff", null, 7); }
      // dead light: crossing fast with cross traffic close → risk
      const inJ = Math.abs(car.x - n21.x) < 8 && Math.abs(car.z - n21.z) < 8;
      if (inJ && car.kmh() > 25 && !S._jr) { for (const v of traffic.fleet) { if (v === car) continue; if (Math.abs(Math.cos(v.heading - car.heading)) < 0.4 && Math.hypot(v.x - n21.x, v.z - n21.z) < 22 && Math.abs(v.speed) > 2) { S._jr = true; risk("sc_signalOff"); break; } } }
      reachX(140, finish);
    };
    extra.push({ dispose: () => { if (amb && amb.siren) amb.siren.stop(); } });
  }
  // ---- 6: rain
  function rainS() {
    ctx.rain.set(true); S.judgeOpts.weather = "rain"; ctx.judge && (ctx.judge.enabled = true);
    const p = poseOn(road, "h01", 15, 1, 4.95); ctx.resetCar({ ...p, hb: 0, engine: true, belt: true }); startMoving(ctx, 25, 2); clearNear(ctx, p.x, p.z, 60);
    ctx.say("instructor", "sc_rain", null, 9);
    const l1 = laneOf(road, "h01", 1, 1);
    const lead = scriptCar({ lane: l1, d: l1.path.project(car.x, car.z).d + 30, speedMul: 0.8 });
    let brakeT = 14, braking = 0, slip = 0;
    tick = (dt) => {
      brakeT -= dt;
      if (brakeT < 0 && !braking) { braking = 2.5; lead.override = { speed: 0 }; }
      if (braking) { braking -= dt; if (braking <= 0) { braking = 0; lead.override = null; brakeT = 15; } }
      // puddle (aquaplaning) on the avenue near x = 0
      if (Math.abs(car.x) < 12 && car.kmh() > 45) { slip += dt; car.heading += Math.sin(T * 9) * dt * 0.25; if (slip > 0.3 && !S._aq) { S._aq = true; ctx.toast("💦 Aquaplanagem!", 2200); lose(10); } }
      reachX(140, finish);
    };
  }
  return S;
}
