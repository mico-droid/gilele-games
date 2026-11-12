// Synthesized audio (no files to download): sound effects + a tiny step sequencer for music.
// Games can add their own: Audio.addSfx("horn", ({tone, noise, now, out}) => {...}); Audio.addSong("drive", {...}).
import { shared } from "./storage.js";

let ctx = null, master, musicG, sfxG, noiseBuf = null, nextT = 0, step = 0;
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
const SONGS = {
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
};
let song = "chill", pending = null;

function schedule() {
  if (!ctx || ctx.state !== "running") return;
  if (nextT < ctx.currentTime - 0.5) nextT = ctx.currentTime + 0.05;
  while (nextT < ctx.currentTime + 0.15) {
    if (pending && step % 16 === 0) { song = pending; pending = null; step = 0; }
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
  setSong(name) { if (SONGS[name] && name !== song && name !== pending) pending = name; },
  setMusic(v) { musicOn = !!v; shared.set("music", v ? "1" : "0"); if (musicG) musicG.gain.setTargetAtTime(v ? 0.13 : 0, ctx.currentTime, 0.05); },
  setSfx(v) { sfxOn = !!v; shared.set("sfx", v ? "1" : "0"); if (sfxG) sfxG.gain.setTargetAtTime(v ? 0.55 : 0, ctx.currentTime, 0.05); },
  get musicOn() { return musicOn; },
  get sfxOn() { return sfxOn; },
  get ctx() { return ctx; },
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
