// Synthesized audio (no files to download): sound effects + a tiny step sequencer for music.
// Games can add their own: Audio.addSfx("horn", ({tone, noise, now, out}) => {...}); Audio.addSong("drive", {...}).
import { shared } from "./storage.js";

let ctx = null, master, musicG, sfxG, noiseBuf = null, nextT = 0, step = 0, fast = false;
let musicOn = shared.get("music", "1") === "1", sfxOn = shared.get("sfx", "1") === "1";
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

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
const kit = () => ({ tone, noise, now, mtof, ctx, out: sfxG, music: musicG });

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
};

// Music: each song = { bpm, len (16th steps), play(step, time, kit) }
// Tudo sintetizado (sem arquivos). Composições originais.
const SONGS = {
  // calminha (a antiga) — menus e cenários tranquilos
  chill: {
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
  adventure: {
    bpm: 126, len: 128,
    play(s, tm, k) {
      const bar = Math.floor(s / 16) % 8, st = s % 16;
      // I - vi - IV - V em Dó, repetido com variação na segunda metade
      const roots = [48, 45, 41, 43, 48, 45, 41, 43][bar];
      const third = [4, 3, 4, 4, 4, 3, 4, 4][bar];
      // bateria: bumbo seco, caixa no 5 e 13, chimbal em colcheia
      if (st === 0 || st === 6 || st === 10) { k.tone("sine", 120, tm, 0.2, 0.75, musicG, 38); k.tone("triangle", 62, tm, 0.26, 0.5, musicG, 34); }
      if (st === 4 || st === 12) { k.noise(tm, 0.1, 0.22, musicG, 1800); k.tone("triangle", 190, tm, 0.06, 0.2, musicG, 140); }
      if (st % 2 === 0) k.noise(tm, 0.03, 0.07, musicG, 9000);
      if (st === 14 && bar % 4 === 3) { k.noise(tm, 0.06, 0.16, musicG, 2600); k.noise(tm + 0.08, 0.06, 0.2, musicG, 2200); }
      // baixo: oitava grave pulsando em colcheias (o "peso" que o jogo pedia)
      if (st % 2 === 0) {
        const walk = [0, 0, 7, 0, 0, 0, 5, 7][st >> 1];
        k.tone("triangle", mtof(roots - 12 + walk), tm, 0.16, 0.55, musicG);
        k.tone("sine", mtof(roots - 24 + walk), tm, 0.22, 0.45, musicG);
      }
      // acordes curtos no contratempo
      if (st === 3 || st === 7 || st === 11 || st === 15) [0, third, 7].forEach((n) => k.tone("square", mtof(roots + 12 + n), tm, 0.08, 0.045, musicG));
      // melodia alegre e saltitante
      const mel = [[0, 7, 12, 7, 16, 12, 7, 12], [0, 7, 12, 14, 12, 7, 4, 7], [0, 4, 9, 12, 9, 7, 4, 0], [2, 7, 11, 14, 11, 7, 2, 7]][bar % 4];
      const nt = mel[st >> 1];
      if (st % 2 === 0 && !(bar === 3 && st > 11)) k.tone("square", mtof(roots + 12 + nt), tm, 0.13, 0.085, musicG);
      if (st === 8 && bar % 2 === 1) k.tone("triangle", mtof(roots + 24 + nt), tm, 0.2, 0.05, musicG);
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
      if (st % 4 === 0) k.tone("sine", mtof(root - 24), tm, 0.3, 0.7, musicG, mtof(root - 24) * 0.9);
      // tímpano / tambor pesado
      if (st === 0 || st === 10) k.tone("triangle", 96, tm, 0.34, 0.6, musicG, 48);
      if (st === 6 || st === 14) k.noise(tm, 0.14, 0.2, musicG, 900);
      // metais graves: acorde menor com trítono, em bloco
      if (st === 0 || st === 8) [0, 3, 6].forEach((n, i) => k.tone("sawtooth", mtof(root + n), tm, 0.28, 0.07, musicG));
      // tema sombrio, lento, cromático
      const theme = [[0, null, 3, null, 6, null, 5, null], [3, null, 2, null, 1, null, 0, null], [0, null, 1, null, 3, null, 1, null], [6, null, 5, null, 3, null, 0, null]][bar % 4];
      const nt = theme[st >> 1];
      if (st % 2 === 0 && nt !== null) { k.tone("square", mtof(root + 12 + nt), tm, 0.22, 0.055, musicG); k.tone("sawtooth", mtof(root + nt), tm, 0.22, 0.04, musicG); }
      // sinos de tensão no fim de cada 4 compassos
      if (bar % 4 === 3 && (st === 12 || st === 14)) k.tone("triangle", mtof(root + 24 + (st === 12 ? 6 : 7)), tm, 0.3, 0.05, musicG);
    },
  },
  // correria / contagem regressiva — rápido e nervoso, mesma pegada grave
  chase: {
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

function schedule() {
  if (!ctx || ctx.state !== "running") return;
  if (nextT < ctx.currentTime - 0.5) nextT = ctx.currentTime + 0.05;
  while (nextT < ctx.currentTime + 0.15) {
    if (pending && (fast || step % 16 === 0)) { song = pending; pending = null; fast = false; step = 0; }
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
    musicG = ctx.createGain(); musicG.gain.value = musicOn ? 0.13 : 0; musicG.connect(master);
    sfxG = ctx.createGain(); sfxG.gain.value = sfxOn ? 0.55 : 0; sfxG.connect(master);
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
  setMusic(v) { musicOn = !!v; shared.set("music", v ? "1" : "0"); if (musicG) musicG.gain.setTargetAtTime(v ? 0.13 : 0, ctx.currentTime, 0.05); },
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
