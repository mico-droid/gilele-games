// Synthesized audio (no files to download): sound effects + a tiny step sequencer for music.
// Games can add their own: Audio.addSfx("horn", ({tone, noise, now, out}) => {...}); Audio.addSong("drive", {...}).
import { shared } from "./storage.js";

let ctx = null, master, musicG, sfxG, gtrBus = null, noiseBuf = null, nextT = 0, step = 0, fast = false;
let musicOn = shared.get("music", "1") === "1", sfxOn = shared.get("sfx", "1") === "1";
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
// Volume da trilha. Subiu de 0,13 para 0,28 em 25/11/2026 (o dono achou a música baixa demais
// perto do som do pulo). Junto com isso as vozes de médio das trilhas ficaram mais fortes e o
// sub-grave mais fraco: alto-falante de celular não reproduz abaixo de ~200 Hz, então o grave
// só gastava volume sem ser ouvido.
const MUSIC_VOL = 0.28;

function tone(type, f, tm, dur, vol, dest = sfxG, slide) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, tm);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, tm + dur);
  g.gain.setValueAtTime(0.0001, tm); g.gain.exponentialRampToValueAtTime(vol, tm + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, tm + dur);
  o.connect(g); g.connect(dest); o.start(tm); o.stop(tm + dur + 0.03);
}
function noise(tm, dur, vol, dest = sfxG, hp = 1000) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp;
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, tm); g.gain.exponentialRampToValueAtTime(0.0001, tm + dur);
  s.connect(f); f.connect(g); g.connect(dest); s.start(tm); s.stop(tm + dur + 0.02);
}
const now = () => ctx.currentTime + 0.005;
const kit = () => ({ tone, noise, now, mtof, ctx, out: sfxG, music: musicG, gtr: gtrBus || musicG });

const SFX = {
  jump: ({ tone, now }) => tone("square", 320, now(), 0.14, 0.22, sfxG, 720),
  land: ({ tone, now }) => tone("triangle", 140, now(), 0.07, 0.3, sfxG, 90),
  coin: ({ tone, now }) => { const n = now(); tone("square", 988, n, 0.06, 0.18); tone("square", 1319, n + 0.06, 0.16, 0.18); },
  ok: ({ tone, now, mtof }) => { const n = now(); [79, 84, 88].forEach((m, i) => tone("square", mtof(m), n + i * 0.07, 0.16, 0.2)); tone("triangle", mtof(91), n + 0.21, 0.4, 0.2); },
  wrong: ({ tone, now }) => { const n = now(); tone("square", 190, n, 0.16, 0.25, sfxG, 170); tone("square", 150, n + 0.2, 0.3, 0.25, sfxG, 120); },
  cp: ({ tone, now, mtof }) => { const n = now(); [72, 76, 79, 84].forEach((m, i) => { tone("square", mtof(m), n + i * 0.08, 0.18, 0.2); tone("triangle", mtof(m + 12), n + i * 0.08, 0.25, 0.15); }); },
  win: ({ tone, now, mtof }) => { const n = now(); [[72, 0], [76, 0.12], [79, 0.24], [84, 0.36], [79, 0.6], [84, 0.72]].forEach(([m, d]) => { tone("square", mtof(m), n + d, d > 0.5 ? 0.5 : 0.16, 0.22); tone("triangle", mtof(m - 12), n + d, 0.3, 0.25); }); },
  die: ({ tone, noise, now }) => { const n = now(); tone("sine", 1100, n, 0.28, 0.3, sfxG, 200); noise(n + 0.26, 0.15, 0.4, sfxG, 200); },
  push: ({ tone, noise, now }) => { const n = now(); noise(n, 0.12, 0.35, sfxG, 600); tone("square", 220, n, 0.12, 0.2, sfxG, 90); },
  boing: ({ tone, now }) => { const n = now(); tone("sine", 700, n, 0.32, 0.4, sfxG, 140); tone("square", 350, n, 0.12, 0.1, sfxG, 120); },
  pop: ({ tone, now }) => { const n = now(); tone("sine", 880, n, 0.07, 0.25); tone("sine", 1320, n + 0.06, 0.08, 0.2); },
  click: ({ tone, now }) => tone("square", 620, now(), 0.04, 0.12),
  whee: ({ tone, now }) => tone("sine", 380, now(), 0.55, 0.3, sfxG, 1300),
  horn: ({ tone, now }) => { const n = now(); tone("sawtooth", 415, n, 0.35, 0.18); tone("sawtooth", 523, n, 0.35, 0.14); },
  blinker: ({ tone, now }) => tone("square", 1800, now(), 0.02, 0.08),
  // comemoração: fanfarra grande (vitória final) e "tchá" curto das vitórias parciais
  fanfare: ({ tone, noise, now, mtof }) => {
    const n = now();
    [[72, 0], [76, 0.1], [79, 0.2], [84, 0.3], [88, 0.45], [84, 0.62], [91, 0.74]].forEach(([m, d], i) => {
      tone("square", mtof(m), n + d, i >= 5 ? 0.6 : 0.16, 0.24); tone("triangle", mtof(m - 12), n + d, 0.3, 0.2); tone("sawtooth", mtof(m + 12), n + d, 0.14, 0.07);
    });
    [0, 0.25, 0.5, 0.78].forEach((d) => noise(n + d, 0.12, 0.2, undefined, 1500));
  },
  cheer: ({ noise, tone, now, mtof }) => {
    const n = now();
    noise(n, 0.5, 0.16, undefined, 1200); noise(n + 0.08, 0.45, 0.12, undefined, 2600);
    [84, 88, 91].forEach((m, i) => tone("triangle", mtof(m), n + i * 0.08, 0.2, 0.14));
  },
  firework: ({ noise, tone, now }) => {
    const n = now();
    tone("sine", 900, n, 0.22, 0.12, undefined, 2200);          // subida
    noise(n + 0.24, 0.5, 0.3, undefined, 900); noise(n + 0.26, 0.3, 0.2, undefined, 3000);
  },
};

// Music: each song = { bpm, len (16th steps), play(step, time, kit) }
// Tudo sintetizado (sem arquivos). Composições originais.
const SONGS = {
  // calminha (a antiga) — menus e cenários tranquilos
  chill: {
    gain: 2.3,
    bpm: 108, len: 64,
    play(s, tm, k) {
      const bar = Math.floor(s / 16), st = s % 16, roots = [60, 57, 53, 55];
      if (st % 4 === 0) k.tone("sine", 150, tm, 0.16, 0.5, musicG, 45);
      if (st === 4 || st === 12) k.noise(tm, 0.08, 0.18, musicG, 2500);
      if (st % 2 === 1) k.noise(tm, 0.025, 0.06, musicG, 8000);
      if (st === 0 || st === 10) k.tone("triangle", mtof(roots[bar] - 12), tm, 0.5, 0.35, musicG);
      const mel = [0, 4, 7, 12, 7, 4, 9, 7][(st >> 1)];
      if (st % 2 === 0 && (st + bar) % 3 !== 2) k.tone("square", mtof(roots[bar] + mel), tm, 0.12, 0.07, musicG);
    },
  },
  // ANIMADA e mais grave — trilha padrão dos jogos (baixo marcado + sub-grave)
  // AVENTURA — rock/metal animado (pedido do dono, 25/11/2026): guitarra "abafada" em semicolcheia,
  // bateria batendo forte e um riff pentatônico por cima. Não há distorção de verdade no Web Audio,
  // então a guitarra é feita de serra + quinta + oitava com notas curtas — de longe soa como palhetada.
  adventure: {
    bpm: 152, len: 128,
    play(s, tm, k) {
      const bar = Math.floor(s / 16) % 8, st = s % 16;
      // Lá menor: i - VI - III - VII (Am - Fá - Dó - Sol), a marcha clássica de aventura
      const root = [45, 41, 48, 43, 45, 41, 48, 43][bar];
      const f0 = mtof(root), f5 = mtof(root + 7), f8 = mtof(root + 12);
      // --- bateria
      const KICK = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0];                 // bumbo sincopado
      if (KICK[st]) { k.tone("sine", 125, tm, 0.14, 0.62, musicG, 40); k.tone("triangle", 70, tm, 0.1, 0.3, musicG, 36); }
      if (st === 4 || st === 12) { k.noise(tm, 0.13, 0.3, musicG, 1500); k.noise(tm, 0.06, 0.2, musicG, 400); k.tone("triangle", 200, tm, 0.07, 0.22, musicG, 150); }
      k.noise(tm, st % 2 ? 0.02 : 0.035, st % 4 === 0 ? 0.11 : 0.06, musicG, 8200);  // chimbal em semicolcheia
      if (st === 0 && bar % 4 === 0) k.noise(tm, 0.6, 0.2, musicG, 5200);            // prato no começo da frase
      if (bar === 7 && st >= 12) { k.noise(tm, 0.09, 0.26, musicG, 900 + (15 - st) * 300); k.tone("triangle", 150 - (st - 12) * 18, tm, 0.1, 0.26, musicG); }  // virada
      // --- guitarra abafada: serra curta em semicolcheia, acento nas batidas
      const open = st === 0 || st === 8;
      if (open) {                                                                     // acorde aberto, deixa soar
        [f0, f5, f8].forEach((f, n) => k.tone("sawtooth", f, tm, 0.34, n === 2 ? 0.3 : 0.42, k.gtr));
      } else if (st % 2 === 0 || st === 7 || st === 11 || st === 15) {                // palhetada abafada
        const v = KICK[st] ? 0.42 : 0.27;
        k.tone("sawtooth", f0, tm, 0.055, v, k.gtr);
        k.tone("sawtooth", f5, tm, 0.05, v * 0.8, k.gtr);
      }
      // --- baixo: oitava abaixo, seguindo o bumbo
      if (st % 2 === 0 || KICK[st]) { k.tone("triangle", mtof(root - 12), tm, 0.12, 0.42, musicG); k.tone("sine", mtof(root - 24), tm, 0.16, 0.26, musicG); }
      // --- riff pentatônico (Lá menor) por cima, com uma "puxada" de corda no fim da frase
      const RIFF = [
        [12, null, 15, null, 17, null, 15, null, 12, null, 10, null, 12, null, null, null],
        [12, null, 15, 17, 19, null, 17, null, 15, null, 12, null, 10, null, 12, null],
        [19, null, 17, null, 15, null, 17, null, 19, null, 22, null, 19, null, 17, null],
        [17, null, 15, null, 12, null, 15, null, 17, null, 19, null, 17, 15, 12, null],
      ][bar % 4];
      const nt = RIFF[st];
      if (nt !== null && nt !== undefined) {
        const f = mtof(45 + nt);
        const bend = (bar % 4 === 3 && st === 10) ? mtof(45 + nt + 2) : 0;            // puxada de corda
        k.tone("sawtooth", f, tm, bend ? 0.42 : 0.17, 0.5, k.gtr, bend || undefined);
        k.tone("square", f * 2, tm, 0.1, 0.1, musicG);                                // brilho da guitarra
      }
    },
  },
  // PERIGO / evento difícil — grave pulsante, menor com trítono (composição original)
  castle: {
    bpm: 132, len: 128,
    play(s, tm, k) {
      const bar = Math.floor(s / 16) % 8, st = s % 16;
      const root = [38, 38, 37, 37, 38, 38, 44, 43][bar]; // Ré menor descendo pro trítono (Láb)
      // baixo em semicolcheias: o coração pulsante
      const pat = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 3, 0, 1, 0];
      k.tone("sawtooth", mtof(root - 12 + pat[st]), tm, 0.085, 0.42, musicG);
      if (st % 4 === 0) k.tone("sine", mtof(root - 24), tm, 0.3, 0.42, musicG, mtof(root - 24) * 0.9);
      // tímpano / tambor pesado
      if (st === 0 || st === 10) k.tone("triangle", 96, tm, 0.34, 0.5, musicG, 48);
      if (st === 6 || st === 14) k.noise(tm, 0.14, 0.2, musicG, 900);
      // metais graves: acorde menor com trítono, em bloco
      if (st === 0 || st === 8) [0, 3, 6].forEach((n, i) => k.tone("sawtooth", mtof(root + n), tm, 0.28, 0.17, musicG));
      // tema sombrio, lento, cromático
      const theme = [[0, null, 3, null, 6, null, 5, null], [3, null, 2, null, 1, null, 0, null], [0, null, 1, null, 3, null, 1, null], [6, null, 5, null, 3, null, 0, null]][bar % 4];
      const nt = theme[st >> 1];
      if (st % 2 === 0 && nt !== null) { k.tone("square", mtof(root + 12 + nt), tm, 0.22, 0.17, musicG); k.tone("sawtooth", mtof(root + nt), tm, 0.22, 0.11, musicG); }
      // sinos de tensão no fim de cada 4 compassos
      if (bar % 4 === 3 && (st === 12 || st === 14)) k.tone("triangle", mtof(root + 24 + (st === 12 ? 6 : 7)), tm, 0.3, 0.14, musicG);
    },
  },
  // COMEMORAÇÃO — fanfarra alegre em Dó maior, para a vitória final (pedido do dono, 25/11/2026)
  victory: {
    bpm: 140, len: 128,
    play(s, tm, k) {
      const bar = Math.floor(s / 16) % 8, st = s % 16;
      const root = [48, 48, 53, 55, 48, 45, 50, 55][bar];
      const MEL = [
        [72, null, 76, null, 79, null, 84, null, 79, null, 76, null, 72, null, 76, null],
        [74, null, 77, null, 81, null, 86, null, 81, null, 77, null, 74, null, 79, null],
        [76, null, 79, null, 84, null, 88, null, 84, null, 79, null, 76, null, 72, null],
        [79, null, 83, null, 86, null, 91, null, 86, null, 83, null, 79, null, 84, null],
      ][bar % 4];
      // bateria de festa
      if (st === 0 || st === 4 || st === 8 || st === 12) k.tone("sine", 130, tm, 0.18, 0.6, musicG, 42);
      if (st === 2 || st === 6 || st === 10 || st === 14) { k.noise(tm, 0.1, 0.26, musicG, 1700); }
      if (st % 2 === 1) k.noise(tm, 0.03, 0.1, musicG, 9000);
      if (st === 15 && bar % 2 === 1) { k.noise(tm, 0.08, 0.22, musicG, 2400); k.noise(tm + 0.07, 0.1, 0.26, musicG, 1900); }
      // baixo saltitante
      if (st % 2 === 0) k.tone("triangle", mtof(root - 12 + (st % 4 === 2 ? 7 : 0)), tm, 0.14, 0.42, musicG);
      // acordes maiores em bloco
      if (st === 0 || st === 8) [0, 4, 7, 12].forEach((n) => k.tone("sawtooth", mtof(root + n), tm, 0.3, 0.1, musicG));
      // tema da fanfarra (bem no médio, para ouvir no celular)
      const nt = MEL[st];
      if (nt !== null && nt !== undefined) { k.tone("square", mtof(nt), tm, 0.2, 0.2, musicG); k.tone("triangle", mtof(nt + 12), tm, 0.16, 0.09, musicG); }
      // sininhos de festa
      if (st % 4 === 2) k.tone("triangle", mtof(84 + ((st + bar) % 3) * 4), tm, 0.12, 0.08, musicG);
    },
  },
  // correria / contagem regressiva — rápido e nervoso, mesma pegada grave
  chase: {
    gain: 1.9,
    bpm: 150, len: 64,
    play(s, tm, k) {
      const bar = Math.floor(s / 16) % 4, st = s % 16;
      const root = [45, 45, 43, 41][bar];
      if (st % 2 === 0) { k.tone("sawtooth", mtof(root - 12 + (st % 4 ? 7 : 0)), tm, 0.09, 0.45, musicG); k.tone("sine", mtof(root - 24), tm, 0.12, 0.4, musicG); }
      if (st === 0 || st === 4 || st === 8 || st === 12) k.tone("sine", 125, tm, 0.14, 0.6, musicG, 40);
      if (st === 4 || st === 12) k.noise(tm, 0.08, 0.24, musicG, 2000);
      if (st % 2 === 1) k.noise(tm, 0.02, 0.09, musicG, 9500);
      const mel = [0, 3, 7, 10, 7, 3, 5, 3];
      if (st % 2 === 0) k.tone("square", mtof(root + 12 + mel[st >> 1]), tm, 0.1, 0.07, musicG);
    },
  },
};
let song = "adventure", pending = null, prevSong = null, danger = false;

/**
 * Cada trilha tem seu próprio volume (`gain`): as mais antigas foram compostas com notas bem mais
 * baixas que as novas, e sem isto a música sumia dentro do jogo (o dono reclamou em 25/11/2026).
 */
function applyGain() {
  if (!musicG) return;
  const S = SONGS[song];
  musicG.gain.setTargetAtTime(musicOn ? MUSIC_VOL * ((S && S.gain) || 1) : 0, ctx.currentTime, 0.05);
}

function schedule() {
  if (!ctx || ctx.state !== "running") return;
  if (nextT < ctx.currentTime - 0.5) nextT = ctx.currentTime + 0.05;
  while (nextT < ctx.currentTime + 0.15) {
    if (pending && (fast || step % 16 === 0)) { song = pending; pending = null; fast = false; step = 0; applyGain(); }
    const S = SONGS[song];
    if (musicOn && S) { try { S.play(step, nextT, kit()); } catch (e) {} }
    nextT += 60 / (S ? S.bpm : 120) / 4; step = (step + 1) % (S ? S.len : 16);
  }
}

export const Audio = {
  /** Must be called from a user gesture (done automatically on first tap/key). */
  init() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { ctx = new AC(); } catch (e) { ctx = null; return; }
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    musicG = ctx.createGain(); musicG.gain.value = musicOn ? MUSIC_VOL : 0; musicG.connect(master);
    sfxG = ctx.createGain(); sfxG.gain.value = sfxOn ? 0.55 : 0; sfxG.connect(master);
    // Guitarra de verdade: distorção (tanh) + filtro, como numa caixa de som de guitarra.
    // É por aqui que passa o riff da trilha de rock — sem isto a "guitarra" é só uma serra limpa.
    const ws = ctx.createWaveShaper(); const cv = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; cv[i] = Math.tanh(x * 4); }
    ws.curve = cv;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2400;
    gtrBus = ctx.createGain(); gtrBus.gain.value = 0.5; gtrBus.connect(ws); ws.connect(lp); lp.connect(musicG);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    nextT = ctx.currentTime + 0.1; setInterval(schedule, 25);
  },
  play(name) { if (!ctx || !sfxOn || ctx.state !== "running" || !SFX[name]) return; try { SFX[name](kit()); } catch (e) {} },
  addSfx(name, fn) { SFX[name] = fn; },
  addSong(name, def) { SONGS[name] = def; },
  /** Troca a música. { now: true } troca na hora (eventos), senão espera o compasso virar. */
  setSong(name, o = {}) { if (SONGS[name] && name !== song && name !== pending) { pending = name; if (o.now) fast = true; } },
  get song() { return pending || song; },
  /**
   * Liga/desliga a trilha de perigo (estilo castelo: grave pulsante) e volta sozinho para a
   * música de antes. Audio.danger(true, "chase") usa outra trilha.
   */
  danger(on, name = "castle") {
    on = !!on;
    if (on === danger) return;
    danger = on;
    if (on) { prevSong = pending || song; Audio.setSong(name, { now: true }); }
    else if (prevSong) { Audio.setSong(prevSong, { now: true }); prevSong = null; }
  },
  get inDanger() { return danger; },
  setMusic(v) { musicOn = !!v; shared.set("music", v ? "1" : "0"); applyGain(); },
  setSfx(v) { sfxOn = !!v; shared.set("sfx", v ? "1" : "0"); if (sfxG) sfxG.gain.setTargetAtTime(v ? 0.55 : 0, ctx.currentTime, 0.05); },
  get musicOn() { return musicOn; },
  get sfxOn() { return sfxOn; },
  get ctx() { return ctx; },
  /** Cala tudo sem mexer na preferência do jogador (usado ao pausar / sair da tela). */
  suspend() { try { if (ctx && ctx.state === "running") ctx.suspend(); } catch (e) {} },
  resume() { try { if (ctx && ctx.state === "suspended") ctx.resume(); } catch (e) {} },
  /** Continuous sound (engine hum, wind…): returns {set(freq, vol), stop()} */
  loop(type = "sawtooth", freq = 80, vol = 0) {
    if (!ctx) return { set() {}, stop() {} };
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = type; o.frequency.value = freq; g.gain.value = vol; f.type = "lowpass"; f.frequency.value = 900;
    o.connect(f); f.connect(g); g.connect(sfxG); o.start();
    return {
      set(fr, v) { o.frequency.setTargetAtTime(fr, ctx.currentTime, 0.05); if (v != null) g.gain.setTargetAtTime(v, ctx.currentTime, 0.05); },
      stop() { g.gain.setTargetAtTime(0, ctx.currentTime, 0.05); setTimeout(() => { try { o.stop(); } catch (e) {} }, 300); },
    };
  },
};
["pointerdown", "keydown"].forEach((ev) => addEventListener(ev, () => Audio.init(), { capture: true }));
