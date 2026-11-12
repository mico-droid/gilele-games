// Catálogo de infrações no formato das fichas do MBEDV (anexo "Fichas de Avaliação", Senatran, 01/02/2026)
// e o "juiz" que detecta cada uma durante a direção. Pesos: leve 1, média 2, grave 4, gravíssima 6. Aprovado até 10.
// O medidor de domínio (controle do veículo) é separado da pontuação: se zerar, a comissão interrompe o exame.
import { t, getLang } from "../../engine/ez.js";

export const PTS = { leve: 1, media: 2, grave: 4, gravissima: 6 };
export const PASS_MAX = 10;

// key: { art, nat, lesson, txt: { pt:[título, dica], en:[…], es:[…] } }
export const RULES = {
  r208_red: { art: "208", nat: "gravissima", lesson: 6, txt: {
    pt: ["Avançou o sinal vermelho", "No amarelo, pare se der para parar com segurança. No vermelho, pare antes da faixa de retenção."],
    en: ["Ran a red light", "On amber, stop if you can do it safely. On red, stop before the stop line."],
    es: ["Pasó el semáforo en rojo", "En ámbar, detente si puedes hacerlo con seguridad. En rojo, para antes de la línea de detención."] } },
  r208_stop: { art: "208", nat: "gravissima", lesson: 6, txt: {
    pt: ["Não parou totalmente no PARE", "Na placa PARE o carro precisa ficar imóvel antes da linha. Depois olhe para os dois lados."],
    en: ["Did not fully stop at a STOP sign", "At a STOP sign the car must come to a complete halt before the line. Then look both ways."],
    es: ["No se detuvo por completo en el PARE", "En la señal PARE el auto debe quedar inmóvil antes de la línea. Luego mira a ambos lados."] } },
  r214: { art: "214, I", nat: "gravissima", lesson: 6, txt: {
    pt: ["Não deu preferência ao pedestre na faixa", "Pedestre na faixa ou esperando para atravessar: reduza e pare antes da faixa até ele terminar."],
    en: ["Did not yield to a pedestrian on the crosswalk", "Pedestrian on or waiting at the crosswalk: slow down and stop before it until they finish crossing."],
    es: ["No cedió el paso al peatón en el cruce", "Peatón en el paso o esperando: reduce y detente antes de la franja hasta que termine de cruzar."] } },
  r218_1: { art: "218, I", nat: "media", lesson: 3, txt: {
    pt: ["Velocidade até 20% acima do limite", "Olhe o velocímetro e as placas de velocidade máxima."],
    en: ["Speed up to 20% over the limit", "Keep an eye on the speedometer and the speed limit signs."],
    es: ["Velocidad hasta 20% sobre el límite", "Mira el velocímetro y las señales de velocidad máxima."] } },
  r218_2: { art: "218, II", nat: "grave", lesson: 3, txt: {
    pt: ["Velocidade 20% a 50% acima do limite", "Tire o pé antes, use o freio-motor e respeite a placa."],
    en: ["Speed 20–50% over the limit", "Lift off early, use engine braking and respect the sign."],
    es: ["Velocidad 20–50% sobre el límite", "Levanta el pie antes, usa el freno motor y respeta la señal."] } },
  r218_3: { art: "218, III", nat: "gravissima", lesson: 3, txt: {
    pt: ["Velocidade mais de 50% acima do limite", "Muito acima do permitido. No exame real isso pesa muito."],
    en: ["Speed over 50% above the limit", "Far above the limit. In a real test this weighs a lot."],
    es: ["Velocidad más de 50% sobre el límite", "Muy por encima del límite. En el examen real pesa mucho."] } },
  r196: { art: "196", nat: "grave", lesson: 4, txt: {
    pt: ["Não sinalizou a manobra (seta)", "Ligue a seta ANTES de sair da vaga, mudar de faixa, converter ou sair da rotatória."],
    en: ["Did not signal the maneuver", "Turn the indicator on BEFORE pulling out, changing lanes, turning or leaving the roundabout."],
    es: ["No señalizó la maniobra (intermitente)", "Pon el intermitente ANTES de salir del lugar, cambiar de carril, girar o salir de la rotonda."] } },
  r197: { art: "197", nat: "media", lesson: 4, txt: {
    pt: ["Não foi para a faixa certa antes de converter", "Para virar à direita, use a faixa da direita; para a esquerda, a da esquerda — com antecedência."],
    en: ["Not in the proper lane before turning", "Turn right from the right lane and left from the left lane — in advance."],
    es: ["No se ubicó en el carril correcto antes de girar", "Para girar a la derecha usa el carril derecho; a la izquierda, el izquierdo — con anticipación."] } },
  r186_1: { art: "186, I", nat: "grave", lesson: 4, txt: {
    pt: ["Transitou na contramão", "Fique à direita da linha amarela. Ultrapassagem só onde a linha é tracejada e rápida."],
    en: ["Drove on the wrong side of the road", "Stay right of the yellow line. Overtake only where it is dashed, and quickly."],
    es: ["Circuló en contramano", "Mantente a la derecha de la línea amarilla. Adelanta solo donde es discontinua y rápido."] } },
  r186_2: { art: "186, II", nat: "gravissima", lesson: 4, txt: {
    pt: ["Contramão em rua de mão única", "Confira as setas e placas de sentido antes de entrar na rua."],
    en: ["Wrong way on a one-way street", "Check the direction arrows and signs before entering a street."],
    es: ["Contramano en calle de sentido único", "Revisa las flechas y señales de sentido antes de entrar."] } },
  r203: { art: "203, V", nat: "gravissima", lesson: 4, txt: {
    pt: ["Ultrapassou sobre linha amarela contínua", "Linha contínua = proibido ultrapassar. Espere o trecho tracejado."],
    en: ["Overtook across a solid yellow line", "Solid line = no overtaking. Wait for the dashed section."],
    es: ["Adelantó sobre línea amarilla continua", "Línea continua = prohibido adelantar. Espera el tramo discontinuo."] } },
  r193: { art: "193", nat: "gravissima", lesson: 8, txt: {
    pt: ["Subiu na calçada / ilha", "Controle a trajetória nas curvas e na baliza. A calçada é dos pedestres."],
    en: ["Drove onto the sidewalk / island", "Control your line in turns and when parking. The sidewalk is for pedestrians."],
    es: ["Subió a la vereda / isla", "Controla la trayectoria en curvas y al estacionar. La vereda es de los peatones."] } },
  r192: { art: "192", nat: "grave", lesson: 3, txt: {
    pt: ["Não guardou distância do veículo da frente", "Regra dos 2 segundos: conte \"mil e um, mil e dois\" depois que o carro da frente passar por um ponto."],
    en: ["Tailgating the vehicle in front", "Two-second rule: count \"one thousand one, one thousand two\" after the car ahead passes a mark."],
    es: ["No guardó distancia con el vehículo de adelante", "Regla de los 2 segundos: cuenta \"mil uno, mil dos\" cuando el auto de adelante pase una marca."] } },
  r169: { art: "169", nat: "leve", lesson: 1, txt: {
    pt: ["Dirigiu sem atenção / cuidados", "Freio de mão solto ao andar, marcha adequada à velocidade e olhar o painel."],
    en: ["Driving without due care", "Handbrake off when moving, the right gear for your speed, and check the dashboard."],
    es: ["Conducir sin atención / cuidados", "Freno de mano suelto al andar, marcha adecuada a la velocidad y mirar el tablero."] } },
  r183: { art: "183", nat: "media", lesson: 6, txt: {
    pt: ["Parou sobre a faixa de pedestres", "Pare antes da faixa de retenção, sem invadir a faixa de pedestres."],
    en: ["Stopped on the crosswalk", "Stop before the stop line, never on the crosswalk."],
    es: ["Se detuvo sobre el paso peatonal", "Para antes de la línea de detención, sin invadir el paso peatonal."] } },
  r231: { art: "231, IX", nat: "media", lesson: 5, txt: {
    pt: ["Desceu a ladeira em ponto morto", "Na descida, mantenha a marcha engatada e a embreagem solta (freio-motor)."],
    en: ["Coasted downhill in neutral", "Downhill, keep a gear engaged and the clutch released (engine braking)."],
    es: ["Bajó la cuesta en punto muerto", "En bajada, mantén una marcha puesta y el embrague suelto (freno motor)."] } },
  r251: { art: "251, I", nat: "media", lesson: 1, txt: {
    pt: ["Pisca-alerta ligado em movimento", "O pisca-alerta é para imobilização ou emergência."],
    en: ["Hazard lights on while moving", "Hazard lights are for when the vehicle is stopped or in an emergency."],
    es: ["Balizas encendidas en movimiento", "Las balizas son para inmovilización o emergencia."] } },
  r227: { art: "227", nat: "leve", lesson: 1, txt: {
    pt: ["Usou a buzina sem necessidade", "Buzina: só um toque breve para avisar de perigo."],
    en: ["Used the horn without need", "Horn: only a short tap to warn of danger."],
    es: ["Usó la bocina sin necesidad", "Bocina: solo un toque breve para avisar de peligro."] } },
  r194: { art: "194", nat: "grave", lesson: 8, txt: {
    pt: ["Marcha à ré sem necessidade", "Ré só em pequenas manobras, como estacionar."],
    en: ["Reversed without need", "Reverse only for short maneuvers, such as parking."],
    es: ["Marcha atrás sin necesidad", "Marcha atrás solo en maniobras cortas, como estacionar."] } },
  r215: { art: "215, I, a", nat: "grave", lesson: 7, txt: {
    pt: ["Não deu preferência a quem já estava na rotatória", "Na rotatória, quem já está circulando tem a preferência."],
    en: ["Did not yield to traffic already in the roundabout", "In a roundabout, vehicles already circulating have priority."],
    es: ["No cedió el paso a quien ya estaba en la rotonda", "En la rotonda tiene preferencia quien ya está circulando."] } },
  r189: { art: "189", nat: "gravissima", lesson: 0, txt: {
    pt: ["Não deu passagem à ambulância", "Sirene e luzes ligadas: vá para a direita com cuidado e deixe passar."],
    en: ["Did not give way to the ambulance", "Siren and lights on: move right carefully and let it pass."],
    es: ["No dio paso a la ambulancia", "Sirena y luces encendidas: ve a la derecha con cuidado y déjala pasar."] } },
  r252: { art: "252, VI", nat: "media", lesson: 0, txt: {
    pt: ["Usou o celular dirigindo", "Ignore o celular. Se for urgente, pare em local permitido."],
    en: ["Used the phone while driving", "Ignore the phone. If it is urgent, stop where it is allowed."],
    es: ["Usó el celular conduciendo", "Ignora el celular. Si es urgente, detente en un lugar permitido."] } },
  r250: { art: "250, I", nat: "media", lesson: 0, txt: {
    pt: ["Farol baixo apagado na chuva", "Com chuva, neblina, túnel ou à noite: farol baixo ligado."],
    en: ["Low beams off in the rain", "In rain, fog, tunnels or at night: low beams on."],
    es: ["Luz baja apagada con lluvia", "Con lluvia, niebla, túnel o de noche: luz baja encendida."] } },
  r230: { art: "230, XIX", nat: "grave", lesson: 0, txt: {
    pt: ["Limpador desligado na chuva", "Ligue o limpador 🌧 assim que a chuva começar."],
    en: ["Wipers off in the rain", "Turn the wipers on 🌧 as soon as it starts raining."],
    es: ["Limpiaparabrisas apagado con lluvia", "Enciende el limpiaparabrisas 🌧 apenas empiece a llover."] } },
  r181_1: { art: "181, I", nat: "media", lesson: 8, txt: {
    pt: ["Estacionou a menos de 5 m da esquina", "Deixe pelo menos 5 m do alinhamento da via transversal."],
    en: ["Parked less than 5 m from the corner", "Leave at least 5 m from the cross street."],
    es: ["Estacionó a menos de 5 m de la esquina", "Deja al menos 5 m de la calle transversal."] } },
  r181_2: { art: "181, II", nat: "leve", lesson: 8, txt: {
    pt: ["Estacionou afastado da guia (50 cm a 1 m)", "Encoste mais no meio-fio, sem subir."],
    en: ["Parked 50 cm–1 m from the curb", "Get closer to the curb without touching it."],
    es: ["Estacionó a 50 cm–1 m del cordón", "Acércate más al cordón, sin subirte."] } },
  r181_3: { art: "181, III", nat: "grave", lesson: 8, txt: {
    pt: ["Estacionou a mais de 1 m da guia", "Alinhe o carro paralelo e perto do meio-fio."],
    en: ["Parked more than 1 m from the curb", "Line the car up parallel and close to the curb."],
    es: ["Estacionó a más de 1 m del cordón", "Alinea el auto paralelo y cerca del cordón."] } },
  r181_8: { art: "181, VIII", nat: "grave", lesson: 8, txt: {
    pt: ["Estacionou sobre a faixa de pedestres", "Nunca pare ou estacione na faixa de pedestres."],
    en: ["Parked on the crosswalk", "Never stop or park on a crosswalk."],
    es: ["Estacionó sobre el paso peatonal", "Nunca te detengas ni estaciones en el paso peatonal."] } },
};
export const ruleTitle = (k) => (RULES[k].txt[getLang()] || RULES[k].txt.pt)[0];
export const ruleTip = (k) => (RULES[k].txt[getLang()] || RULES[k].txt.pt)[1];
export const rulePts = (k) => PTS[RULES[k].nat];

const wrap = (a) => ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;

/**
 * createJudge({ car, road, traffic, onInfraction(inf), onDomain(ev, value), opts })
 * opts: { weather:"rain"|null, allowReverse:()=>bool, disabled:Set, domain:boolean }
 */
export function createJudge(ctx) {
  const { car, road, traffic } = ctx;
  const opts = ctx.opts || {};
  const J = {
    infractions: [], points: 0, domain: 100, time: 0, interrupted: false, log: [],
    blinkHist: { "-1": -99, "1": -99 }, // last time each blinker was seen on
    cool: {}, enabled: true,
  };
  let prev = null, inNode = null, minSpeedBeforeStop = Infinity, speedEp = null, wrongT = 0, wrongOvertook = false,
    laneT = 0, laneCand = null, revDist = 0, hbT = 0, rpmHiT = 0, lugT = 0, coastT = 0, hazT = 0, hornT = 0, hornPresses = [],
    parkedT = 0, startedFromPark = false, followT = 0, sideT = 0, rainHeadT = 0, rainWipT = 0, lastLane = null, stallTimes = [], beltWarned = false, rollbackStart = null;
  const cool = (k, s) => { if ((J.cool[k] || -99) > J.time) return false; J.cool[k] = J.time + s; return true; };
  function add(key, extra = {}) {
    if (!J.enabled || (opts.disabled && opts.disabled.has(key))) return null;
    const inf = { key, pts: rulePts(key), t: J.time, x: car.x, z: car.z, ...extra };
    J.infractions.push(inf); J.points += inf.pts;
    ctx.onInfraction && ctx.onInfraction(inf);
    return inf;
  }
  function domain(ev, d) {
    if (opts.domain === false) return;
    J.domain = Math.max(0, Math.min(100, J.domain + d));
    ctx.onDomain && ctx.onDomain(ev, J.domain);
    if (J.domain <= 0 && !J.interrupted) { J.interrupted = true; ctx.onInterrupt && ctx.onInterrupt(ev); }
  }
  J.add = add; J.domainEvent = domain;

  /** Feed vehicle events (from car.step) to the judge. */
  J.vehicleEvents = (ev) => {
    if (ev.stalled) { stallTimes.push(J.time); stallTimes = stallTimes.filter((x) => J.time - x < 60); domain("stall", stallTimes.length >= 3 ? -18 : -8); }
    if (ev.jolt) domain("jolt", -8);
    if (ev.grind) domain("grind", -3);
    if (ev.curb) domain("curb", -5);
    if (ev.collided) {
      const imp = ev.collided.impact;
      domain("crash", imp > 5 ? -100 : imp > 2.5 ? -45 : -20);
    }
  };
  J.horn = (down) => {
    if (down) { hornPresses.push(J.time); hornPresses = hornPresses.filter((x) => J.time - x < 6); if (hornPresses.length >= 3 && cool("227", 20)) add("r227"); }
  };

  J.update = (dt) => {
    J.time += dt;
    const kmh = car.kmh(), sp = car.speed, L = car.lights;
    if (L.blinker) J.blinkHist[L.blinker] = J.time;
    if (L.hazard) { J.blinkHist["-1"] = J.time; J.blinkHist["1"] = J.time; }
    const blinked = (side, within = 3) => J.time - J.blinkHist[side] < within;
    if (J.domain < 100 && J.domain > 0) J.domain = Math.min(100, J.domain + dt * 0.05);
    const loc = road.locate(car.x, car.z, car.heading);
    // ---- belt (no MBEDV ficha for art. 167 → the examiner simply does not let you go on)
    if (!car.data.belt && Math.abs(sp) > 1.5 && !beltWarned) { beltWarned = true; ctx.onMessage && ctx.onMessage("belt"); domain("belt", -10); }
    if (car.data.belt) beltWarned = false;
    // ---- start from a parked position without signalling (art. 196: início de marcha)
    if (Math.abs(sp) < 0.1) parkedT += dt; else if (Math.abs(sp) > 1) { if (parkedT > 3 && prev && prev.edge && prev.parkSide && sp > 0 && !startedFromPark) { startedFromPark = true; if (!blinked(-1, 4) && cool("196p", 10)) add("r196", { why: "start" }); } parkedT = 0; }
    if (Math.abs(sp) > 3) startedFromPark = false;
    // ---- turns at intersections / roundabout exits / lane changes
    const dirH = (l) => (l.dir > 0 ? l.edge.h : l.edge.h + Math.PI);
    if (loc && loc.node && (!prev || !prev.node)) inNode = { node: loc.node, h: prev && prev.edge ? dirH(prev) : car.heading, from: prev, bl: { "-1": blinked(-1, 2.5), "1": blinked(1, 2.5) }, t: J.time, enterRing: !!loc.roundabout };
    if (loc && loc.node && inNode && loc.roundabout && !inNode.ringChecked) {
      inNode.ringChecked = true;
      // yielded to circulating traffic?
      const n = loc.node; const a0 = Math.atan2(car.z - n.z, car.x - n.x);
      for (const v of traffic.fleet) { if (v === car) continue; const r = Math.hypot(v.x - n.x, v.z - n.z); if (r > n.roundabout || r < n.islandR - 1 || Math.abs(v.speed) < 2) continue; let da = Math.atan2(v.z - n.z, v.x - n.x) - a0; da = ((da % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); if (da > 0.15 && da < 0.9 && cool("215", 10)) { add("r215"); break; } }
    }
    if (loc && loc.node && inNode) inNode.lastBl = { "-1": blinked(-1, 1.5), "1": blinked(1, 1.5) };
    if (loc && !loc.node && prev && prev.node && inNode && loc.edge) {
      const dh = wrap(dirH(loc) - inNode.h);
      if (inNode.node.roundabout) { if (Math.abs(sp) > 0.5 && !(inNode.lastBl && inNode.lastBl["1"]) && !blinked(1, 1.5) && cool("196r", 6)) add("r196", { why: "roundabout" }); }
      else if (Math.abs(dh) > 0.7 && sp > 0 && !loc.wrongWay) {
        const side = dh > 0 ? -1 : 1; // Δh>0 = left turn
        if (!inNode.bl[side] && !blinked(side, 1.2) && cool("196t", 6)) add("r196", { why: "turn" });
        const f = inNode.from; if (f && f.edge && f.lane >= 0) { const n = f.dir > 0 ? f.edge.nF : f.edge.nB; if (n > 1 && ((side > 0 && f.lane !== n - 1) || (side < 0 && f.lane !== 0)) && cool("197", 8)) add("r197"); }
      }
      inNode = null;
    }
    if (loc && loc.edge && !loc.node && prev && prev.edge === loc.edge && prev.dir === loc.dir && !loc.wrongWay && prev.lane >= 0 && loc.lane >= 0) {
      if (loc.lane !== (lastLane ?? loc.lane)) { laneCand = { from: lastLane, to: loc.lane, t: J.time }; }
      lastLane = loc.lane;
      if (laneCand && J.time - laneCand.t > 0.6) {
        const side = laneCand.to > laneCand.from ? 1 : -1;
        if (!blinked(side, 4) && Math.abs(sp) > 2 && cool("196l", 6)) add("r196", { why: "lane" });
        laneCand = null;
      }
    } else if (loc && loc.edge) lastLane = loc.lane >= 0 ? loc.lane : lastLane;
    // ---- stop lines (red light / PARE)
    if (loc && loc.edge && loc.ap && sp > 0) {
      if (loc.distToStop > 0 && loc.distToStop < 15) minSpeedBeforeStop = Math.min(minSpeedBeforeStop, kmh);
      if (prev && prev.edge === loc.edge && prev.ap === loc.ap && prev.distToStop > 0 && loc.distToStop <= 0 && !loc.wrongWay) {
        const ap = loc.ap;
        if (ap.control === "signal") { const st = road.signalState(ap.node, ap.edge); if (st === "red" && cool("208r" + ap.node.id, 8)) add("r208_red"); }
        if (ap.control === "stop" && minSpeedBeforeStop > 1.2 && cool("208s" + ap.node.id, 8)) add("r208_stop");
        minSpeedBeforeStop = Infinity;
      }
    }
    if (loc && loc.edge && loc.distToStop > 15) minSpeedBeforeStop = Infinity;
    // ---- crosswalks: pedestrians (214) and stopping on top (183)
    if (loc && loc.edge) {
      const q = road.toEdge(loc.edge, car.x, car.z), half = car.spec.halfL;
      for (const cw of road.crosswalks) {
        if (cw.edge !== loc.edge) continue;
        const over = q.s + half > cw.s0 - 0.2 && q.s - half < cw.s1 + 0.2 && q.u > loc.edge.uMin - 0.5 && q.u < loc.edge.uMax + 0.5;
        if (!over) continue;
        const ped = traffic.peds.find((p) => p.cw === cw && (p.state === "cross" || (p.cwHint === cw && p.state === "wait")) && Math.hypot(p.x - car.x, p.z - car.z) < 14);
        if (ped && Math.abs(sp) > 0.4 && cool("214" + cw.id, 15)) add("r214");
        if (Math.abs(sp) < 0.2 && cw.node && cw.node.signal && loc.ap && loc.ap.cw === cw && road.signalState(cw.node, cw.edge) === "red" && cool("183" + cw.id, 30)) add("r183");
      }
    }
    // ---- speed (218)
    let limit = loc && loc.speed ? loc.speed : prev && prev.speed ? prev.speed : 40;
    if (loc && loc.node && prev && prev.speed) limit = prev.speed;
    if (kmh > limit + 1.5) {
      const ex = (kmh - limit) / limit, band = ex > 0.5 ? 3 : ex > 0.2 ? 2 : 1;
      if (!speedEp) speedEp = { t: J.time, band: 0, inf: null };
      if (J.time - speedEp.t > 1.5 && band > speedEp.band) {
        if (speedEp.inf) { J.points -= speedEp.inf.pts; J.infractions.splice(J.infractions.indexOf(speedEp.inf), 1); }
        speedEp.band = band; speedEp.inf = add("r218_" + band, { kmh: Math.round(kmh), limit });
      }
      speedEp.under = 0;
    } else if (speedEp) { speedEp.under = (speedEp.under || 0) + dt; if (speedEp.under > 4) speedEp = null; }
    // ---- wrong way / overtaking (186, 203)
    if (loc && loc.edge && !loc.node && Math.abs(sp) > 1.5) {
      const e = loc.edge, wrongSide = e.nB > 0 && loc.u * loc.dir < -(0.4 + car.spec.halfW * 0.6);
      if (e.nB === 0 && loc.dir < 0 && sp > 0) { wrongT += dt; if (wrongT > 1.5 && cool("186b", 20)) add("r186_2"); }
      else if (wrongSide) {
        wrongT += dt;
        // overtaking a same-direction vehicle?
        for (const v of traffic.fleet) { if (v === car || Math.abs(v.speed) < 0.5) continue; const dx = v.x - car.x, dz = v.z - car.z; if (dx * dx + dz * dz > 64) continue; const c = Math.cos(v.heading - car.heading); if (c > 0.8) wrongOvertook = true; }
        const solidLine = e.center === "double" || (e.center === "mixed" && loc.dir < 0);
        if (solidLine && wrongOvertook && cool("203", 15)) add("r203");
        else if (wrongT > (solidLine ? 1.5 : 7) && cool("186a", 15)) add("r186_1");
      } else { wrongT = 0; wrongOvertook = false; }
    } else if (!loc || !loc.node) wrongT = 0;
    // ---- sidewalk (193)
    const g = road.groundAt(car.x, car.z);
    if ((g.type === "sidewalk" || g.type === "lot") && Math.abs(sp) > 0.3) { sideT += dt; if (sideT > 0.25 && cool("193", 10)) add("r193"); } else sideT = 0;
    // ---- following distance (192)
    if (sp > 6) {
      let gap = Infinity; const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
      for (const v of traffic.fleet) { if (v === car) continue; const dx = v.x - car.x, dz = v.z - car.z, a = dx * fx + dz * fz, l = -dx * fz + dz * fx; if (a > 0 && a < 50 && Math.abs(l) < 1.6) gap = Math.min(gap, a - car.spec.halfL - v.spec.halfL); }
      if (gap < sp * 0.7) { followT += dt; if (followT > 2.5 && cool("192", 25)) add("r192"); } else followT = Math.max(0, followT - dt);
    } else followT = 0;
    // ---- careless driving (169): handbrake on while moving, wrong gear
    if (car.controls.handbrake > 0.5 && kmh > 6) { hbT += dt; if (hbT > 3 && cool("169h", 60)) add("r169", { why: "handbrake" }); } else hbT = 0;
    if (car.engineOn && car.rpm > 5300) { rpmHiT += dt; if (rpmHiT > 3 && cool("169g", 45)) add("r169", { why: "gear" }); } else rpmHiT = 0;
    if (car.transmission === "manual" && car.gear >= 3 && car.rpm < 1050 && car.controls.throttle > 0.3 && car.clutchEngage > 0.9) { lugT += dt; if (lugT > 2 && cool("169g", 45)) add("r169", { why: "gear" }); } else lugT = 0;
    // ---- coasting downhill (231 IX)
    const coasting = car.transmission === "manual" ? car.gear === 0 || car.controls.clutch > 0.7 : car.autoMode === "N";
    if (car.pitch * Math.sign(sp || 1) < -0.035 && kmh > 15 && coasting) { coastT += dt; if (coastT > 3 && cool("231", 30)) add("r231"); } else coastT = 0;
    // ---- hazard lights moving (251 I)
    if (L.hazard && kmh > 12 && !opts.allowHazard) { hazT += dt; if (hazT > 4 && cool("251", 40)) add("r251"); } else hazT = 0;
    // ---- horn held (227)
    if (car.data.horn) { hornT += dt; if (hornT > 1.3 && cool("227", 20)) add("r227"); } else hornT = 0;
    // ---- reversing too far (194)
    if (sp < -0.3) { revDist += -sp * dt; if (revDist > 22 && !(opts.allowReverse && opts.allowReverse()) && cool("194", 30)) add("r194"); } else if (sp > 0.5) revDist = 0;
    // ---- rain (250, 230)
    if (opts.weather === "rain" && kmh > 5) {
      if (!L.head) { rainHeadT += dt; if (rainHeadT > 6 && cool("250", 60)) add("r250"); } else rainHeadT = 0;
      if (!car.data.wipers) { rainWipT += dt; if (rainWipT > 6 && cool("230", 60)) add("r230"); } else rainWipT = 0;
    }
    // ---- hill start: rolling back in gear (domain)
    if (car.controls.handbrake < 0.5 && sp < -0.25 && Math.abs(car.pitch) > 0.04) { if (!rollbackStart) rollbackStart = { x: car.x, z: car.z }; else if (Math.hypot(car.x - rollbackStart.x, car.z - rollbackStart.z) > 1 && cool("rb", 10)) domain("rollback", -8); } else if (sp >= 0) rollbackStart = null;
    // remember
    if (loc && loc.edge) { const e = loc.edge; loc.parkSide = e.parking && Math.abs(loc.u - (e.parking.side > 0 ? e.uMax - 1.2 : e.uMin + 1.2)) < 1.4; }
    prev = loc;
    J.loc = loc;
  };
  J.passed = () => !J.interrupted && J.points <= PASS_MAX;
  return J;
}
