// Piloto automático SÓ PARA TESTES (não é carregado pelo jogo).
// Uso no console do navegador, com o jogo aberto (games/auto-escola/):
//   1) cole este arquivo;  2) GAME.startMode(GAME.createExam); GAME.world.setPaused(true);
//   3) const ap = makeAutopilot(GAME, GAME.mode.nav.steps);  // depois que o carro sair da vaga
//   4) for (let i = 0; i < 3000 && !ap.step(1/30); i++) GAME.tick(1/30);
//   5) GAME.judge.infractions  → um motorista correto deve terminar com [] (opções: {noBlinker, speedMul, runStop}).
window.makeAutopilot = (G, steps, opt = {}) => {
  const road = G.road, car = G.car;
  const pts = [], stops = [], turns = [];
  let lane = null;
  for (let i = 0; i < steps.length; i++) {
    const st = steps[i], e = st.e, dir = e.A === st.from ? 1 : -1, nx = steps[i + 1];
    const cands = road.lanes.filter((l) => l.edge === e && l.dir === dir);
    if (!lane || lane.edge !== e) lane = cands[cands.length - 1];
    let conn = null;
    if (nx) { conn = lane.next.find((c) => c.lane.edge === nx.e); if (!conn) { for (const l of cands) { const c = l.next.find((c) => c.lane.edge === nx.e); if (c) { lane = l; conn = c; break; } } } }
    const base = pts.length;
    lane.path.pts.forEach((p) => pts.push(p));
    if (lane.ap) stops.push({ ap: lane.ap, idx: base, lane });
    if (conn) { turns.push({ idx: pts.length, turn: conn.turn, node: conn.node, conn }); conn.path.pts.slice(1, -1).forEach((p) => pts.push(p)); lane = conn.lane; }
  }
  // cumulative distances
  const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  stops.forEach((s) => (s.d = L[s.idx] + s.lane.stopD)); turns.forEach((t) => (t.d = L[t.idx]));
  const at = (d) => { let i = 1; while (i < L.length - 1 && L[i] < d) i++; const a = pts[i - 1], b = pts[i], k = (d - L[i - 1]) / (L[i] - L[i - 1] || 1); return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; };
  let prog = 0, stoppedT = 0, cleared = new Set();
  return {
    len: L[L.length - 1], get prog() { return prog; },
    step(dt) {
      // progress: closest point near current progress
      let best = Infinity, bd = prog;
      for (let d = Math.max(0, prog - 5); d < Math.min(L[L.length - 1], prog + 25); d += 0.5) { const p = at(d), dd = (p[0] - car.x) ** 2 + (p[1] - car.z) ** 2; if (dd < best) { best = dd; bd = d; } }
      prog = bd;
      const spd = car.speed, Ld = 4.5 + Math.abs(spd) * 0.5, tp = at(prog + Ld);
      const f = [Math.sin(car.heading), Math.cos(car.heading)], dx = tp[0] - car.x, dz = tp[1] - car.z;
      const xr = dx * -f[1] + dz * f[0], xf = dx * f[0] + dz * f[1];
      const alpha = Math.atan2(xr, xf); // >0 = target to the left
      const delta = Math.atan((2 * car.spec.wheelbase * Math.sin(alpha)) / Ld);
      // speed target
      let limit = 30 / 3.6;
      const loc = G.judge.loc; if (loc && loc.speed) limit = (loc.speed * (opt.speedMul || 0.85)) / 3.6;
      for (const t of turns) { const ahead = t.d - prog; if (ahead > -8 && ahead < 40 && t.turn !== "straight") limit = Math.min(limit, Math.max(4.2, 4.2 + Math.max(0, ahead - 6) * 0.35)); if (ahead > -8 && ahead < 40 && t.node.roundabout) limit = Math.min(limit, Math.max(5, 5 + Math.max(0, ahead - 8) * 0.3)); }
      let stopAt = Infinity;
      for (const s of stops) {
        const ahead = s.d - prog; if (ahead < -1 || ahead > 60 || cleared.has(s)) continue;
        const ap = s.ap;
        if (ap.control === "signal") { const st = road.signalState(ap.node, ap.edge); if (st === "red" || (st === "yellow" && ahead > spd * spd / 5 + 2)) stopAt = Math.min(stopAt, ahead - 2.9); else if (ahead < 1) cleared.add(s); }
        else if (ap.control === "stop") { if (opt.runStop || (stoppedT > 1.2 && ahead < 5)) cleared.add(s); else stopAt = Math.min(stopAt, ahead - 2.9); }
        else if (ap.control === "yield") { if (ahead < 2 && (stoppedT > 0.5 || spd > 2)) cleared.add(s); else if (ahead < 12) limit = Math.min(limit, 4); }
        if (ap.cw && G.traffic.pedOnCrosswalk(ap.cw) && ahead > 0) stopAt = Math.min(stopAt, ahead - 2.9);
      }
      // crosswalks we are about to drive over (any)
      for (const cw of road.crosswalks) { const ped = G.traffic.peds.find((p) => p.cw === cw && (p.state === "cross" || p.cwHint === cw)); if (!ped) continue; const ddx = cw.x - car.x, ddz = cw.z - car.z, a = ddx * f[0] + ddz * f[1], l = Math.abs(-ddx * f[1] + ddz * f[0]); if (a > 2 && a < 25 && l < 6) stopAt = Math.min(stopAt, a - 6); }
      // leader
      for (const v of G.traffic.fleet) { if (v === car) continue; const ddx = v.x - car.x, ddz = v.z - car.z, a = ddx * f[0] + ddz * f[1], l = -ddx * f[1] + ddz * f[0]; if (a > 0 && a < 40 && Math.abs(l) < 1.8) stopAt = Math.min(stopAt, a - 4.5 - Math.max(0, spd) * 1.2); }
      let want = limit; if (stopAt < Infinity) want = Math.min(want, Math.sqrt(2 * 2.5 * Math.max(0, stopAt)));
      if (stopAt < 0.3) want = 0;
      const err = want - spd;
      let thr = 0, brk = 0;
      if (err > 0.3) thr = Math.min(0.7, 0.25 + err * 0.15); else if (err < -0.3 || want === 0) brk = Math.min(1, 0.25 + -err * 0.3);
      if (want === 0 && spd < 0.3) brk = 0.6;
      stoppedT = spd < 0.1 ? stoppedT + dt : 0;
      // blinkers
      let side = 0;
      for (const t of turns) { const ahead = t.d - prog; if (t.turn !== "straight" && ahead > -6 && ahead < 45 && !t.node.roundabout) side = t.turn === "left" ? -1 : 1; if (t.node.roundabout && ahead < -3 && ahead > -(t.conn.path.len - 2)) { const rem = t.conn.path.len + ahead; if (rem < 18) side = 1; } }
      if (opt.noBlinker) side = 0;
      car.lights.blinker = side;
      const T = G.ctl.touch; T.thr = thr; T.brk = brk; T.cl = null;
      T.wheel = Math.max(-1, Math.min(1, delta / car.spec.maxSteer)); // alpha>0: target on the right; wheel + = right
      return prog >= L[L.length - 1] - 2;
    },
  };
};
